import os
import cv2
cv2.setNumThreads(0)
cv2.ocl.setUseOpenCL(False)
import json
import random
import pickle
import numpy as np
import matplotlib.pyplot as plt
from tqdm import tqdm
from glob import glob
from collections import defaultdict

import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torch.amp import autocast, GradScaler

import timm
import albumentations as A
from albumentations.pytorch import ToTensorV2
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image

# =========================================================
# 1. CONFIGURATION & PATHS
# =========================================================
CONFIG = {
    "seed": 42,
    "batch_size": 8, # Lower this to 8 or 4 if you run out of GPU memory (VRAM)
    "accum_steps": 2,
    "epochs": 10,
    "lr": 3e-5,
    "img_size": 224,
    # UPDATE THESE PATHS to where your folders are located on your PC
    "pv_path": r"C:\\Users\\Yashas H D\\Desktop\\PYTHON\\5\\plan-disease\\PlantVillage", 
    "vip_path": r"C:\\Users\\Yashas H D\\Desktop\\PYTHON\\5\\new-plant\\New Plant Diseases Dataset(Augmented)",
    "save_path": "C:\\Users\\Yashas H D\\Desktop\\PYTHON\\5\\models",
    "device": "cuda" if torch.cuda.is_available() else "cpu"
}

os.makedirs(CONFIG["save_path"], exist_ok=True)

def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

set_seed(CONFIG["seed"])
print(f"Using device: {CONFIG['device']}")

# =========================================================
# 2. DATASET PARSING
# =========================================================
CROP_NAME_MAP = {
    "Tomato": "tomato", "Potato": "potato", "Corn_(maize)": "maize",
    "Pepper,_bell": "capsicum", "Soybean": "soybean", "Grape": "grape",
    "Orange": "orange", "Apple": "apple", "Peach": "peach",
    "Strawberry": "strawberry", "Cherry": "cherry", "Blueberry": "blueberry"
}

INDIAN_CROPS = {"tomato", "potato", "maize", "capsicum", "soybean", "grape", "orange", "apple"}

def parse_class_name(folder_name):
    if "___" not in folder_name: return None, None
    crop_raw, disease = folder_name.split("___", 1)
    crop = CROP_NAME_MAP.get(crop_raw.strip())
    return crop, disease.strip()

all_samples = []
def collect_samples(root):
    if not root or not os.path.exists(root):
        print(f"Warning: Path not found: {root}")
        return
    for dirpath, dirnames, filenames in os.walk(root):
        images = [f for f in filenames if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        if not images: continue
        crop, disease = parse_class_name(os.path.basename(dirpath))
        if crop in INDIAN_CROPS:
            for img in images:
                all_samples.append((os.path.join(dirpath, img), crop, disease))

# Collect data
collect_samples(CONFIG["pv_path"])
collect_samples(CONFIG["vip_path"])

if len(all_samples) == 0:
    print("❌ No images found! Please check your file paths in the CONFIG section.")
    exit()

image_paths = [x[0] for x in all_samples]
crop_encoder = LabelEncoder()
disease_encoder = LabelEncoder()
crop_ids = crop_encoder.fit_transform([x[1] for x in all_samples])
disease_ids = disease_encoder.fit_transform([x[2] for x in all_samples])

NUM_CROPS = len(crop_encoder.classes_)
NUM_DISEASES = len(disease_encoder.classes_)

train_idx, val_idx = train_test_split(
    list(range(len(image_paths))), test_size=0.2, random_state=CONFIG["seed"], stratify=disease_ids
)

# =========================================================
# 3. PYTORCH DATASET & TRANSFORM
# =========================================================
train_transform = A.Compose([
    A.Resize(CONFIG["img_size"], CONFIG["img_size"]),
    A.HorizontalFlip(p=0.5),
    A.RandomBrightnessContrast(p=0.2),
    A.Normalize(),
    ToTensorV2()
])

val_transform = A.Compose([
    A.Resize(CONFIG["img_size"], CONFIG["img_size"]),
    A.Normalize(),
    ToTensorV2()
])

class PlantDataset(Dataset):
    def __init__(self, indices, transform=None):
        self.indices = indices
        self.transform = transform
    def __len__(self): return len(self.indices)
    def __getitem__(self, idx):
        i = self.indices[idx]
        path = image_paths[i]

        img = cv2.imread(path, cv2.IMREAD_COLOR)

        # Skip corrupted images safely
        if img is None:
            return self.__getitem__(random.randint(0, len(self.indices) - 1))

        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        if self.transform:
            img = self.transform(image=img)["image"]

        return {
            "image": img,
            "crop": torch.tensor(crop_ids[i], dtype=torch.long),
            "disease": torch.tensor(disease_ids[i], dtype=torch.long)
        }


# DataLoaders (On Windows, num_workers > 0 can sometimes cause errors, start with 0)
train_loader = DataLoader(
    PlantDataset(train_idx, train_transform),
    batch_size=CONFIG["batch_size"],
    shuffle=True,
    num_workers=4,
    pin_memory=True,
    persistent_workers=True,
    prefetch_factor=2
)

val_loader = DataLoader(
    PlantDataset(val_idx, val_transform),
    batch_size=CONFIG["batch_size"],
    num_workers=4,
    pin_memory=True,
    persistent_workers=True,
    prefetch_factor=2
)


# =========================================================
# 4. MODEL ARCHITECTURE
# =========================================================
class ViTMultiTaskModel(nn.Module):
    def __init__(self, num_crops, num_diseases):
        super().__init__()
        self.encoder = timm.create_model("vit_small_patch16_224",pretrained=True,num_classes=0)
        hidden_dim = self.encoder.embed_dim
        self.crop_head = nn.Sequential(nn.LayerNorm(hidden_dim), nn.Linear(hidden_dim, num_crops))
        self.disease_head = nn.Sequential(nn.LayerNorm(hidden_dim), nn.Linear(hidden_dim, num_diseases))
        self.seg_decoder = nn.Sequential(
            nn.Conv2d(hidden_dim, 256, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv2d(256, 1, kernel_size=1)
        )

    def forward(self, x):
        B = x.size(0)
        features = self.encoder.forward_features(x)
        cls_token = features[:, 0]
        crop_logits = self.crop_head(cls_token)
        disease_logits = self.disease_head(cls_token)
        
        patch_tokens = features[:, 1:]
        n = int(patch_tokens.size(1)**0.5)
        seg_map = patch_tokens.transpose(1, 2).reshape(B, -1, n, n)
        seg_map = F.interpolate(seg_map, size=(224, 224), mode='bilinear', align_corners=False)
        seg_map = self.seg_decoder(seg_map)
        return crop_logits, disease_logits, seg_map

model = ViTMultiTaskModel(NUM_CROPS, NUM_DISEASES).to(CONFIG["device"])
optimizer = optim.AdamW(model.parameters(), lr=CONFIG["lr"])
scaler = GradScaler()
criterion = nn.CrossEntropyLoss()
criterion_seg = nn.BCEWithLogitsLoss()

# =========================================================
# 5. TRAINING LOOP
# =========================================================
if __name__ == "__main__":
    for epoch in range(CONFIG["epochs"]):
        model.train()
        train_loss = 0.0

        optimizer.zero_grad()

        for step, batch in enumerate(tqdm(train_loader, desc=f"Epoch {epoch+1}")):
            imgs = batch["image"].to(CONFIG["device"], non_blocking=True)
            crops = batch["crop"].to(CONFIG["device"], non_blocking=True)
            diseases = batch["disease"].to(CONFIG["device"], non_blocking=True)

            with autocast(device_type="cuda"):
                c_logits, d_logits, s_map = model(imgs)
                loss = (
                    criterion(c_logits, crops)
                    + criterion(d_logits, diseases)
                    + 0.5 * criterion_seg(s_map, torch.zeros_like(s_map))
                )
                loss = loss / CONFIG["accum_steps"]

            scaler.scale(loss).backward()

            if (step + 1) % CONFIG["accum_steps"] == 0:
                scaler.step(optimizer)
                scaler.update()
                optimizer.zero_grad()

            train_loss += loss.item()

        # ================= VALIDATION =================
        model.eval()
        correct_d = 0

        with torch.no_grad():
            for batch in val_loader:
                imgs = batch["image"].to(CONFIG["device"])
                diseases = batch["disease"].to(CONFIG["device"])
                _, d_logits, _ = model(imgs)
                correct_d += (d_logits.argmax(1) == diseases).sum().item()

        print(
            f"Epoch {epoch+1} | "
            f"Loss: {train_loss/len(train_loader):.4f} | "
            f"Disease Acc: {correct_d/len(val_idx):.4f}"
        )

    # Save outputs
    torch.save(model.state_dict(), os.path.join(CONFIG["save_path"], "vit_model.pt"))
    with open(os.path.join(CONFIG["save_path"], "encoders.pkl"), "wb") as f:
        pickle.dump({'crop': crop_encoder, 'disease': disease_encoder}, f)
    print("Training Complete. Model Saved.")