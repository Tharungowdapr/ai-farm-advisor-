"""
yield_service.py
================
Predicts crop yield using the APY-dataset trained model
(best model saved by yield_prediction.py).

Features: State_encoded, District_encoded, Crop_encoded,
          Crop_Year, Season_encoded, Area, Production
"""

import os
import json
import numpy as np
import joblib
from datetime import datetime

# ── Path helpers ──────────────────────────────────────────────
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_MODELS_DIR = os.path.join(_BASE_DIR, "models")

# ── Load APY model artefacts ──────────────────────────────────
_APY_MODEL_PATH    = os.path.join(_MODELS_DIR, "apy_yield_model.pkl")
_APY_ENCODERS_PATH = os.path.join(_MODELS_DIR, "apy_label_encoders.pkl")
_APY_INFO_PATH     = os.path.join(_MODELS_DIR, "apy_model_info.json")

_apy_model    = None
_label_encoders = None
_model_info     = None


def _load_apy_model():
    """Lazy-load the APY model on first call."""
    global _apy_model, _label_encoders, _model_info

    if _apy_model is not None:
        return True

    if not os.path.exists(_APY_MODEL_PATH):
        print(f"[yield_service] APY model not found at {_APY_MODEL_PATH}")
        print("[yield_service] Run yield_prediction.py first to train and save the model.")
        return False

    try:
        _apy_model      = joblib.load(_APY_MODEL_PATH)
        _label_encoders = joblib.load(_APY_ENCODERS_PATH)
        with open(_APY_INFO_PATH, "r") as f:
            _model_info = json.load(f)
        print(f"[yield_service] APY model loaded: {_model_info.get('best_model', 'unknown')}")
        return True
    except Exception as e:
        print(f"[yield_service] Failed to load APY model: {e}")
        return False


# ── Season helper ─────────────────────────────────────────────
def _get_current_season():
    month = datetime.now().month
    if month in [6, 7, 8, 9]:
        return "Kharif"
    elif month in [10, 11, 12, 1]:
        return "Rabi"
    elif month in [2, 3]:
        return "Summer"
    else:
        return "Whole Year"


def _safe_encode(encoder, value, default_value):
    """Encode a label; fall back to default if unseen."""
    try:
        classes = list(encoder.classes_)
        if value in classes:
            return encoder.transform([value])[0]
        # Try case-insensitive match
        lower_map = {c.lower(): c for c in classes}
        if value.lower() in lower_map:
            return encoder.transform([lower_map[value.lower()]])[0]
        # Fall back to default
        if default_value in classes:
            return encoder.transform([default_value])[0]
        return encoder.transform([classes[0]])[0]
    except Exception:
        return 0


def get_valid_crops():
    """Return the list of valid crops the APY model supports."""
    if not _load_apy_model():
        return []
    stats = _model_info.get("dataset_stats", {})
    return stats.get("valid_crops", [])


# ── Main prediction function ──────────────────────────────────
def predict_yield(crop_name, weather_data, state=None, district=None):
    """
    Predict crop yield using the APY-dataset trained model.

    Parameters
    ----------
    crop_name    : str  — crop as predicted by crop_service
    weather_data : dict — contains at minimum {"rainfall", "humidity"}
    state        : str  — optional Indian state name (e.g. "Kerala")
    district     : str  — optional district name (e.g. "Thrissur")

    Returns
    -------
    float | None
    """
    if not _load_apy_model():
        return _fallback_yield(crop_name, weather_data)

    try:
        stats = _model_info.get("dataset_stats", {})

        # ── Defaults from dataset medians ──────────────────────
        default_state    = stats.get("default_state", "Kerala")
        default_district = stats.get("default_district", "Thrissur")
        median_area      = stats.get("median_area", 1.0)
        median_production = stats.get("median_production", 1.0)
        median_year      = stats.get("median_crop_year", 2010)

        use_state    = state.strip().title()    if state    else default_state
        use_district = district.strip().title() if district else default_district

        # ── Encode categorical features ────────────────────────
        crop_encoded     = _safe_encode(_label_encoders["Crop"],     crop_name.strip().title(), crop_name)
        state_encoded    = _safe_encode(_label_encoders["State"],    use_state,    default_state)
        district_encoded = _safe_encode(_label_encoders["District"], use_district, default_district)

        season_str   = _get_current_season()
        season_encoded = _safe_encode(_label_encoders["Season"], season_str, "Whole Year")

        crop_year = datetime.now().year

        # ── Derive area/production from rainfall as proxy ──────
        # (rainfall in mm → scale to realistic hectares/tonnes)
        raw_rainfall = weather_data.get("rainfall", 0)
        # Use median values; slight scaling by rainfall for realism
        rainfall_factor = max(0.5, min(raw_rainfall / 1000, 2.0))
        area       = median_area * rainfall_factor
        production = median_production * rainfall_factor

        # ── Build feature vector ───────────────────────────────
        # Order must match: State_encoded, District_encoded, Crop_encoded,
        #                   Crop_Year, Season_encoded, Area, Production
        features = np.array([[
            state_encoded,
            district_encoded,
            crop_encoded,
            crop_year,
            season_encoded,
            area,
            production,
        ]])

        prediction = _apy_model.predict(features)
        yield_value = float(prediction[0])

        # Guard against extreme/negative predictions
        if yield_value < 0:
            yield_value = abs(yield_value)
        if yield_value > 100000:
            yield_value = yield_value / 1000  # convert kg/ha if unusually large

        print(f"[yield_service] APY prediction — crop={crop_name}, "
              f"state={use_state}, district={use_district}, "
              f"season={season_str}, yield={yield_value:.4f}")

        return yield_value

    except Exception as e:
        print(f"[yield_service] APY prediction error: {e}")
        return _fallback_yield(crop_name, weather_data)


# ── Simple rule-based fallback (original logic) ───────────────
def _fallback_yield(crop_name, weather_data):
    """Used when the APY model is unavailable."""
    try:
        base_yields = {
            "rice": 2.5, "maize": 2.0, "banana": 15.0, "coconut": 8.0,
            "jute": 2.3, "wheat": 2.8, "sugarcane": 65.0,
        }
        base = base_yields.get(crop_name.lower(), 2.0)
        rainfall = weather_data.get("rainfall", 500)
        rf_factor = min(max(rainfall / 1000, 0.5), 1.5)
        return round(base * rf_factor, 4)
    except Exception:
        return None

def get_yield_benchmark(crop_name):
    """Returns typical regional average yield for benchmarking."""
    medians = {
        "paddy": 2.8, "rice": 2.8, "maize": 3.2, "wheat": 3.0, 
        "sugarcane": 72.0, "cotton": 1.2, "ragi": 1.8, "groundnut": 1.6,
        "tomato": 26.5, "banana": 35.0, "coconut": 10.5, "coffee": 0.8,
        "arecanut": 1.4
    }
    return medians.get(crop_name.lower(), 2.0)