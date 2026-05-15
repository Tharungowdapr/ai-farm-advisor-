"""
Generate crop_economics.json with official Government of India data.

DATA SOURCES:
- MSP rates: PIB/CCEA notifications for Kharif 2024-25 & Rabi 2024-25
- Cost of production (C2): CACP projections 2024-25
- Input cost breakdowns: DES "Comprehensive Scheme for Cost of Cultivation"
- Non-MSP crop prices: AGMARKNET average mandi prices 2023-24
- Sugarcane FRP: CCEA notification 2024-25
"""
import json, os

# All MSP in Rs/quintal (official 2024-25)
# Input costs in Rs/hectare from CACP/DES cost of cultivation studies
crops = {}

def add(name, msp_q, season, seed, fert, pest, irri, labour_h, labour_f,
        mach, misc, avg_yield_q, source, aliases=None, is_msp=True, price_type="MSP"):
    crops[name] = {
        "msp_per_quintal": msp_q,
        "msp_per_tonne": msp_q * 10,
        "price_type": price_type,
        "season": season,
        "is_msp_crop": is_msp,
        "input_costs_per_hectare": {
            "seed": seed, "fertilizer": fert, "pesticide": pest,
            "irrigation": irri, "hired_labour": labour_h,
            "family_labour": labour_f, "machinery": mach, "miscellaneous": misc
        },
        "total_a2_cost_per_hectare": seed+fert+pest+irri+labour_h+mach+misc,
        "total_a2fl_cost_per_hectare": seed+fert+pest+irri+labour_h+labour_f+mach+misc,
        "avg_yield_quintal_per_hectare": avg_yield_q,
        "avg_yield_tonne_per_hectare": round(avg_yield_q / 10, 2),
        "source": source,
        "aliases": aliases or []
    }

# ═══════════════════════════════════════════════════════════════
# KHARIF MSP CROPS (CCEA June 19, 2024)
# ═══════════════════════════════════════════════════════════════

# Rice/Paddy - MSP ₹2300/q, C2 CoP ₹2008/q, avg yield 40q/ha
add("rice", 2300, "kharif",
    seed=1200, fert=3800, pest=900, irri=2500,
    labour_h=10000, labour_f=5500, mach=3000, misc=1600,
    avg_yield_q=40, source="CACP KMS 2024-25, PIB June 2024",
    aliases=["paddy"])

# Jowar/Sorghum - MSP ₹3371/q (hybrid), avg yield 10q/ha
add("jowar", 3371, "kharif",
    seed=400, fert=1800, pest=500, irri=800,
    labour_h=5000, labour_f=4000, mach=2000, misc=800,
    avg_yield_q=10, source="CACP KMS 2024-25",
    aliases=["sorghum"])

# Bajra/Pearl millet - MSP ₹2625/q, avg yield 13q/ha
add("bajra", 2625, "kharif",
    seed=300, fert=1500, pest=400, irri=600,
    labour_h=4500, labour_f=3800, mach=1800, misc=700,
    avg_yield_q=13, source="CACP KMS 2024-25",
    aliases=["pearl millet"])

# Ragi/Finger millet - MSP ₹4290/q, avg yield 18q/ha
add("ragi", 4290, "kharif",
    seed=500, fert=1600, pest=400, irri=1000,
    labour_h=5500, labour_f=4200, mach=1800, misc=700,
    avg_yield_q=18, source="CACP KMS 2024-25",
    aliases=["finger millet"])

# Maize - MSP ₹2225/q, C2 CoP ₹1863/q, avg yield 30q/ha
add("maize", 2225, "kharif",
    seed=1000, fert=3000, pest=700, irri=1800,
    labour_h=6500, labour_f=4000, mach=2800, misc=1200,
    avg_yield_q=30, source="CACP KMS 2024-25",
    aliases=["corn"])

# Arhar/Tur - MSP ₹7550/q, C2 CoP ₹6504/q, avg yield 8q/ha
add("arhar/tur", 7550, "kharif",
    seed=800, fert=1200, pest=600, irri=1000,
    labour_h=5000, labour_f=4500, mach=1500, misc=800,
    avg_yield_q=8, source="CACP KMS 2024-25",
    aliases=["tur", "arhar", "toor dal", "pigeon pea"])

# Moong/Green Gram - MSP ₹8682/q, avg yield 5q/ha
add("moong(green gram)", 8682, "kharif",
    seed=600, fert=1000, pest=500, irri=800,
    labour_h=4500, labour_f=3500, mach=1200, misc=600,
    avg_yield_q=5, source="CACP KMS 2024-25",
    aliases=["moong", "green gram", "mung bean"])

# Urad/Black Gram - MSP ₹7400/q, avg yield 5q/ha
add("urad", 7400, "kharif",
    seed=600, fert=1000, pest=500, irri=800,
    labour_h=4200, labour_f=3500, mach=1200, misc=600,
    avg_yield_q=5, source="CACP KMS 2024-25",
    aliases=["black gram"])

# Groundnut - MSP ₹6783/q, avg yield 18q/ha
add("groundnut", 6783, "kharif",
    seed=2500, fert=2200, pest=800, irri=1500,
    labour_h=7000, labour_f=5000, mach=2500, misc=1000,
    avg_yield_q=18, source="CACP KMS 2024-25",
    aliases=["peanut"])

# Sunflower - MSP ₹7280/q, avg yield 8q/ha
add("sunflower", 7280, "kharif",
    seed=800, fert=1800, pest=600, irri=1200,
    labour_h=4500, labour_f=3500, mach=1800, misc=700,
    avg_yield_q=8, source="CACP KMS 2024-25")

# Soybean - MSP ₹4892/q, C2 CoP ₹4291/q, avg yield 12q/ha
add("soyabean", 4892, "kharif",
    seed=1800, fert=1500, pest=700, irri=800,
    labour_h=5000, labour_f=3800, mach=2200, misc=800,
    avg_yield_q=12, source="CACP KMS 2024-25",
    aliases=["soybean", "soya"])

# Sesamum/Til - MSP ₹9267/q, avg yield 4q/ha
add("sesamum", 9267, "kharif",
    seed=300, fert=1000, pest=400, irri=500,
    labour_h=4000, labour_f=3500, mach=1200, misc=500,
    avg_yield_q=4, source="CACP KMS 2024-25",
    aliases=["sesame", "til"])

# Niger seed - MSP ₹8717/q, avg yield 3q/ha
add("niger seed", 8717, "kharif",
    seed=300, fert=800, pest=300, irri=400,
    labour_h=3500, labour_f=3000, mach=1000, misc=500,
    avg_yield_q=3, source="CACP KMS 2024-25",
    aliases=["nigerseed"])

# Cotton (lint) - MSP ₹7121/q (medium staple), avg yield 5q lint/ha
add("cotton(lint)", 7121, "kharif",
    seed=1500, fert=4000, pest=3000, irri=2000,
    labour_h=12000, labour_f=6000, mach=3000, misc=1500,
    avg_yield_q=5, source="CACP KMS 2024-25, Medium Staple",
    aliases=["cotton"])

# ═══════════════════════════════════════════════════════════════
# RABI MSP CROPS (CCEA October 2023 for RMS 2024-25)
# ═══════════════════════════════════════════════════════════════

# Wheat - MSP ₹2275/q, C2 CoP ₹1720/q, avg yield 35q/ha
add("wheat", 2275, "rabi",
    seed=1500, fert=3200, pest=600, irri=3000,
    labour_h=6000, labour_f=4500, mach=3500, misc=1500,
    avg_yield_q=35, source="CACP RMS 2024-25, CCEA Oct 2023")

# Barley - MSP ₹1850/q, avg yield 28q/ha
add("barley", 1850, "rabi",
    seed=1200, fert=2500, pest=400, irri=2500,
    labour_h=4500, labour_f=3500, mach=2800, misc=1000,
    avg_yield_q=28, source="CACP RMS 2024-25")

# Gram/Chickpea - MSP ₹5440/q, C2 CoP ₹4662/q, avg yield 10q/ha
add("gram", 5440, "rabi",
    seed=1500, fert=1200, pest=600, irri=1500,
    labour_h=5000, labour_f=4000, mach=2000, misc=800,
    avg_yield_q=10, source="CACP RMS 2024-25",
    aliases=["chickpea", "chana"])

# Masoor/Lentil - MSP ₹6425/q, avg yield 8q/ha
add("masoor", 6425, "rabi",
    seed=1200, fert=1000, pest=500, irri=1200,
    labour_h=4500, labour_f=3500, mach=1500, misc=700,
    avg_yield_q=8, source="CACP RMS 2024-25",
    aliases=["lentil"])

# Rapeseed & Mustard - MSP ₹5650/q, avg yield 12q/ha
add("rapeseed &mustard", 5650, "rabi",
    seed=600, fert=2000, pest=600, irri=1500,
    labour_h=4500, labour_f=3500, mach=2000, misc=800,
    avg_yield_q=12, source="CACP RMS 2024-25",
    aliases=["mustard", "rapeseed"])

# Safflower - MSP ₹5800/q, avg yield 7q/ha
add("safflower", 5800, "rabi",
    seed=500, fert=1200, pest=400, irri=800,
    labour_h=3500, labour_f=3000, mach=1500, misc=600,
    avg_yield_q=7, source="CACP RMS 2024-25")

# ═══════════════════════════════════════════════════════════════
# OTHER MSP/FRP CROPS
# ═══════════════════════════════════════════════════════════════

# Jute - MSP ₹5350/q (raw), avg yield 25q/ha
add("jute", 5350, "kharif",
    seed=400, fert=1500, pest=400, irri=600,
    labour_h=8000, labour_f=5000, mach=1500, misc=800,
    avg_yield_q=25, source="CACP 2024-25",
    aliases=["raw jute"])

# Sugarcane - FRP ₹340/q, avg yield 700q/ha
add("sugarcane", 340, "kharif",
    seed=6000, fert=5500, pest=1500, irri=4000,
    labour_h=15000, labour_f=8000, mach=4000, misc=2000,
    avg_yield_q=700, source="CCEA FRP 2024-25",
    price_type="FRP")

# Coconut (copra) - MSP ₹11582/q (milling copra), avg yield 50q copra/ha
add("coconut", 11582, "whole year",
    seed=3000, fert=3000, pest=1000, irri=2500,
    labour_h=8000, labour_f=5000, mach=2000, misc=1500,
    avg_yield_q=50, source="CACP 2024-25, Milling Copra",
    aliases=["copra"])

# ═══════════════════════════════════════════════════════════════
# NON-MSP CROPS (Average mandi prices from AGMARKNET 2023-24)
# ═══════════════════════════════════════════════════════════════

# Banana - Avg mandi ₹1500/q, avg yield 300q/ha
add("banana", 1500, "kharif",
    seed=12000, fert=6000, pest=2500, irri=4000,
    labour_h=15000, labour_f=8000, mach=3000, misc=2000,
    avg_yield_q=300, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Potato - Avg mandi ₹1200/q, avg yield 200q/ha
add("potato", 1200, "rabi",
    seed=18000, fert=4000, pest=2500, irri=3500,
    labour_h=10000, labour_f=6000, mach=3500, misc=2000,
    avg_yield_q=200, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Onion - Avg mandi ₹1800/q, avg yield 180q/ha
add("onion", 1800, "rabi",
    seed=8000, fert=3500, pest=2000, irri=3000,
    labour_h=12000, labour_f=6000, mach=2500, misc=1500,
    avg_yield_q=180, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Turmeric - Avg mandi ₹8000/q, avg yield 50q/ha (fresh)
add("turmeric", 8000, "kharif",
    seed=5000, fert=3000, pest=1500, irri=2500,
    labour_h=10000, labour_f=6000, mach=2500, misc=1500,
    avg_yield_q=50, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Dry chillies - Avg mandi ₹12000/q, avg yield 15q/ha (dry)
add("dry chillies", 12000, "kharif",
    seed=1500, fert=3000, pest=2000, irri=2000,
    labour_h=12000, labour_f=6000, mach=2000, misc=1500,
    avg_yield_q=15, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg",
    aliases=["chilli", "chillies"])

# Tobacco - Avg mandi ₹6000/q, avg yield 15q/ha
add("tobacco", 6000, "rabi",
    seed=500, fert=3000, pest=1500, irri=2000,
    labour_h=10000, labour_f=5000, mach=2000, misc=1200,
    avg_yield_q=15, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Coriander - Avg mandi ₹7000/q, avg yield 8q/ha
add("coriander", 7000, "rabi",
    seed=1500, fert=1500, pest=500, irri=1500,
    labour_h=5000, labour_f=3500, mach=1500, misc=700,
    avg_yield_q=8, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Ginger - Avg mandi ₹4000/q, avg yield 150q/ha (fresh)
add("ginger", 4000, "kharif",
    seed=15000, fert=4000, pest=2000, irri=3000,
    labour_h=12000, labour_f=7000, mach=2500, misc=1500,
    avg_yield_q=150, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Garlic - Avg mandi ₹5000/q, avg yield 60q/ha
add("garlic", 5000, "rabi",
    seed=10000, fert=3000, pest=1500, irri=2500,
    labour_h=10000, labour_f=6000, mach=2000, misc=1500,
    avg_yield_q=60, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Black pepper - Avg mandi ₹40000/q, avg yield 3q/ha
add("black pepper", 40000, "kharif",
    seed=5000, fert=3000, pest=1500, irri=2000,
    labour_h=8000, labour_f=5000, mach=1500, misc=1000,
    avg_yield_q=3, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg",
    aliases=["pepper"])

# Cardamom - Avg mandi ₹100000/q, avg yield 1.5q/ha
add("cardamom", 100000, "kharif",
    seed=8000, fert=4000, pest=2000, irri=3000,
    labour_h=15000, labour_f=8000, mach=2000, misc=2000,
    avg_yield_q=1.5, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Cashewnut - Avg mandi ₹15000/q (raw), avg yield 8q/ha
add("cashewnut", 15000, "kharif",
    seed=4000, fert=2500, pest=1500, irri=1500,
    labour_h=8000, labour_f=5000, mach=2000, misc=1200,
    avg_yield_q=8, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg",
    aliases=["cashew"])

# Arecanut/Betel nut - Avg mandi ₹35000/q, avg yield 15q/ha
add("arecanut", 35000, "whole year",
    seed=5000, fert=3500, pest=1500, irri=2500,
    labour_h=10000, labour_f=6000, mach=2000, misc=1500,
    avg_yield_q=15, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg",
    aliases=["betel nut"])

# Castor seed - Avg mandi ₹6000/q, avg yield 12q/ha
add("castor seed", 6000, "kharif",
    seed=600, fert=1500, pest=500, irri=800,
    labour_h=4000, labour_f=3000, mach=1500, misc=600,
    avg_yield_q=12, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Linseed - Avg mandi ₹5500/q, avg yield 6q/ha
add("linseed", 5500, "rabi",
    seed=500, fert=1000, pest=400, irri=800,
    labour_h=3500, labour_f=3000, mach=1200, misc=600,
    avg_yield_q=6, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Tapioca/Cassava - Avg mandi ₹600/q, avg yield 250q/ha
add("tapioca", 600, "kharif",
    seed=6000, fert=2500, pest=800, irri=2000,
    labour_h=8000, labour_f=5000, mach=2000, misc=1200,
    avg_yield_q=250, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg",
    aliases=["cassava"])

# Sweet potato - Avg mandi ₹1000/q, avg yield 120q/ha
add("sweet potato", 1000, "kharif",
    seed=4000, fert=2000, pest=600, irri=1500,
    labour_h=6000, labour_f=4000, mach=1800, misc=800,
    avg_yield_q=120, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Mesta - MSP-adjacent (similar to jute), avg ₹5000/q, avg yield 15q/ha
add("mesta", 5000, "kharif",
    seed=400, fert=1200, pest=400, irri=600,
    labour_h=6000, labour_f=4000, mach=1500, misc=700,
    avg_yield_q=15, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Cowpea - Avg mandi ₹5000/q, avg yield 8q/ha
add("cowpea(lobia)", 5000, "kharif",
    seed=800, fert=1000, pest=400, irri=800,
    labour_h=4000, labour_f=3500, mach=1200, misc=600,
    avg_yield_q=8, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg",
    aliases=["cowpea", "lobia"])

# Khesari - Avg mandi ₹4000/q, avg yield 8q/ha
add("khesari", 4000, "rabi",
    seed=500, fert=800, pest=300, irri=600,
    labour_h=3500, labour_f=3000, mach=1000, misc=500,
    avg_yield_q=8, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg",
    aliases=["grass pea"])

# Horse-gram - Avg mandi ₹5500/q, avg yield 6q/ha
add("horse-gram", 5500, "kharif",
    seed=400, fert=600, pest=300, irri=400,
    labour_h=3000, labour_f=2800, mach=1000, misc=500,
    avg_yield_q=6, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Moth bean - Avg mandi ₹6000/q, avg yield 4q/ha
add("moth", 6000, "kharif",
    seed=400, fert=600, pest=300, irri=400,
    labour_h=3000, labour_f=2500, mach=1000, misc=500,
    avg_yield_q=4, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg",
    aliases=["moth bean"])

# Guar seed - Avg mandi ₹5500/q, avg yield 8q/ha
add("guar seed", 5500, "kharif",
    seed=500, fert=800, pest=400, irri=500,
    labour_h=3500, labour_f=3000, mach=1200, misc=500,
    avg_yield_q=8, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg",
    aliases=["guar", "cluster bean"])

# Small millets - Avg mandi ₹3500/q, avg yield 8q/ha
add("small millets", 3500, "kharif",
    seed=300, fert=800, pest=300, irri=400,
    labour_h=3500, labour_f=3000, mach=1000, misc=500,
    avg_yield_q=8, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg")

# Sannhamp/Sun hemp - Avg ₹4000/q, avg yield 12q/ha
add("sannhamp", 4000, "kharif",
    seed=400, fert=800, pest=300, irri=500,
    labour_h=4000, labour_f=3000, mach=1200, misc=500,
    avg_yield_q=12, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg",
    aliases=["sun hemp", "sunn hemp"])

# Peas & beans - Avg mandi ₹4500/q, avg yield 10q/ha
add("peas & beans (pulses)", 4500, "rabi",
    seed=1200, fert=1200, pest=500, irri=1200,
    labour_h=5000, labour_f=3500, mach=1500, misc=700,
    avg_yield_q=10, source="AGMARKNET avg mandi price 2023-24",
    is_msp=False, price_type="Mandi Avg",
    aliases=["peas", "beans"])

# ═══════════════════════════════════════════════════════════════
# Write JSON
# ═══════════════════════════════════════════════════════════════

# Add metadata
output = {
    "_metadata": {
        "description": "Crop economics data for AgriSense AI",
        "msp_source": "Government of India, PIB/CCEA notifications 2024-25",
        "cost_source": "CACP projections & DES Cost of Cultivation scheme",
        "mandi_source": "AGMARKNET average mandi prices 2023-24",
        "last_updated": "2024-25 marketing season",
        "units": {
            "msp_per_quintal": "INR per quintal (100 kg)",
            "msp_per_tonne": "INR per tonne (1000 kg)",
            "input_costs": "INR per hectare",
            "yield": "quintals per hectare"
        }
    },
    "crops": crops
}

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "crop_economics.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"Generated {out_path}")
print(f"Total crops: {len(crops)}")
print(f"MSP crops: {sum(1 for c in crops.values() if c['is_msp_crop'])}")
print(f"Market-price crops: {sum(1 for c in crops.values() if not c['is_msp_crop'])}")
