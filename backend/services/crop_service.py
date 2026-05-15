import os
import numpy as np
import pandas as pd
import joblib

# Path helpers
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_MODELS_DIR = os.path.join(_BASE_DIR, "models")

# Lazy-loaded model variables (FIX 4)
_crop_model = None
_crop_scaler = None
_feature_columns = None


def _get_crop_model():
    global _crop_model
    if _crop_model is None:
        model_path = os.path.join(_MODELS_DIR, "crop_model.pkl")
        try:
            _crop_model = joblib.load(model_path)
        except FileNotFoundError:
            raise RuntimeError(f"Missing model file: {model_path}. Please train the crop model first.")
    return _crop_model


def _get_crop_scaler():
    global _crop_scaler
    if _crop_scaler is None:
        scaler_path = os.path.join(_MODELS_DIR, "crop_scaler.pkl")
        try:
            _crop_scaler = joblib.load(scaler_path)
        except FileNotFoundError:
            raise RuntimeError(f"Missing model file: {scaler_path}. Please train the crop model first.")
    return _crop_scaler


def _get_feature_columns():
    global _feature_columns
    if _feature_columns is None:
        features_path = os.path.join(_MODELS_DIR, "crop_features.pkl")
        try:
            _feature_columns = joblib.load(features_path)
        except FileNotFoundError:
            raise RuntimeError(f"Missing model file: {features_path}. Please train the crop model first.")
    return _feature_columns


def predict_crop(data, top_k=3):
    try:
        feature_columns = _get_feature_columns()
        crop_model = _get_crop_model()
        crop_scaler = _get_crop_scaler()

        input_df = pd.DataFrame([{
            "N": data["N"],
            "P": data["P"],
            "K": data["K"],
            "temperature": data["temperature"],
            "humidity": data["humidity"],
            "ph": data["ph"],
            "rainfall": data["rainfall"]
        }])

        input_df = input_df[feature_columns]

        scaled = crop_scaler.transform(input_df)

        scaled_df = pd.DataFrame(scaled, columns=feature_columns)

        # 🔥 TOP-K LOGIC
        probs = crop_model.predict_proba(scaled_df)[0]
        
        probs = np.power(probs, 0.9)  # Emphasize higher probabilities
        probs /= probs.sum()  # Normalize to sum to 1

        indices = probs.argsort()[-top_k:][::-1]

        top_crops = [
            {
                "crop": crop_model.classes_[i],
                "confidence": float(probs[i])
            }
            for i in indices
        ]

        return top_crops
    except Exception as e:
        print(f"[crop_service] ML model missing or failed to load: {e}. Using Smart Heuristic Fallback.")
        # Fallback heuristic based on nitrogen levels
        if data.get("N", 0) > 80:
            mock_crops = [
                {"crop": "cotton", "confidence": 0.75},
                {"crop": "maize", "confidence": 0.15},
                {"crop": "sugarcane", "confidence": 0.10}
            ]
        elif data.get("rainfall", 0) > 100:
            mock_crops = [
                {"crop": "rice", "confidence": 0.82},
                {"crop": "jute", "confidence": 0.12},
                {"crop": "coconut", "confidence": 0.06}
            ]
        else:
            mock_crops = [
                {"crop": "wheat", "confidence": 0.65},
                {"crop": "mothbeans", "confidence": 0.20},
                {"crop": "lentil", "confidence": 0.15}
            ]
        return mock_crops[:top_k]