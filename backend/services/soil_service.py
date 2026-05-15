"""
Soil data service using ISRIC SoilGrids API (rest.isric.org).
Fetches real soil properties from coordinates.
Falls back to simulated data if API is unavailable.
"""
import json
import logging
import os
import urllib.request
from pathlib import Path
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).parent.parent / "data" / "soil_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
CACHE_TTL_HOURS = 24

PROPERTIES = ["phh2o", "soc", "nitrogen", "cec", "sand", "clay", "silt", "bdod"]


def _cache_path(lat, lon):
    key = f"{lat:.2f}_{lon:.2f}"
    return CACHE_DIR / f"{key}.json"


def _load_cache(lat, lon):
    path = _cache_path(lat, lon)
    if path.exists():
        try:
            with open(path) as f:
                data = json.load(f)
            cached_time = datetime.fromisoformat(data.get("cached_at", "2000-01-01"))
            if datetime.now() - cached_time < timedelta(hours=CACHE_TTL_HOURS):
                return data.get("soil")
        except:
            pass
    return None


def _save_cache(lat, lon, soil_data):
    path = _cache_path(lat, lon)
    try:
        with open(path, "w") as f:
            json.dump({"cached_at": datetime.now().isoformat(), "soil": soil_data}, f)
    except:
        pass


def _fetch_from_isric(lat, lon):
    props = ",".join(PROPERTIES)
    url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?lon={lon}&lat={lat}&property={props}"
    try:
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "KrishiVigyan/1.0")
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        logger.warning(f"SoilGrids API error for ({lat},{lon}): {e}")
        return None

    properties = data.get("properties", {})
    if not properties:
        return None

    result = {}
    for prop_name in PROPERTIES:
        prop_data = properties.get(prop_name)
        if not prop_data:
            continue
        layers = prop_data.get("layers", [])
        if not layers:
            continue
        depths = layers[0].get("depths", [])
        if not depths:
            continue
        values = depths[0].get("values", {})
        mean = values.get("mean")
        if mean is not None:
            result[prop_name] = round(mean, 2)

    return result if result else None


def _estimated_soil(lat, lon):
    """Fallback estimated soil data based on location heuristics."""
    lat_abs = abs(lat)
    if 12 <= lat_abs <= 16:
        return {
            "phh2o": 6.5, "soc": 8.5, "nitrogen": 2.1, "cec": 18.5,
            "sand": 45, "clay": 22, "silt": 33, "bdod": 1.35,
            "source": "Estimated (Deccan Plateau average)"
        }
    elif 16 < lat_abs <= 22:
        return {
            "phh2o": 7.2, "soc": 6.2, "nitrogen": 1.5, "cec": 22.0,
            "sand": 35, "clay": 30, "silt": 35, "bdod": 1.40,
            "source": "Estimated (Central India average)"
        }
    elif lat_abs > 22:
        return {
            "phh2o": 7.8, "soc": 4.5, "nitrogen": 1.0, "cec": 15.0,
            "sand": 55, "clay": 18, "silt": 27, "bdod": 1.50,
            "source": "Estimated (North India average)"
        }
    else:
        return {
            "phh2o": 6.0, "soc": 10.0, "nitrogen": 2.5, "cec": 12.0,
            "sand": 50, "clay": 20, "silt": 30, "bdod": 1.30,
            "source": "Estimated (Tropical default)"
        }


def get_soil_data(lat, lon):
    """
    Get soil data for GPS coordinates.
    Returns dict with keys: phh2o, soc, nitrogen, cec, sand, clay, silt, bdod, source.
    """
    cached = _load_cache(lat, lon)
    if cached:
        cached["source"] = "Cached (ISRIC SoilGrids)"
        return cached

    isric = _fetch_from_isric(lat, lon)
    if isric:
        isric["source"] = "ISRIC SoilGrids"
        _save_cache(lat, lon, isric)
        return isric

    estimated = _estimated_soil(lat, lon)
    return estimated


def get_soil_summary(lat, lon):
    """Get a human-readable soil summary from GPS coordinates."""
    soil = get_soil_data(lat, lon)
    ph = soil.get("phh2o", 6.5)
    soc = soil.get("soc", 5.0)
    nitrogen = soil.get("nitrogen", 1.0)
    cec = soil.get("cec", 15.0)
    sand = soil.get("sand", 40)
    clay = soil.get("clay", 25)
    silt = soil.get("silt", 35)

    if ph < 5.5: ph_class = "Acidic"
    elif ph < 6.5: ph_class = "Slightly Acidic"
    elif ph < 7.5: ph_class = "Neutral"
    else: ph_class = "Alkaline"

    if sand > 60: texture = "Sandy"
    elif clay > 35: texture = "Clay"
    elif silt > 40: texture = "Silty"
    else: texture = "Loamy"

    n_status = "Low" if nitrogen < 1.0 else "Moderate" if nitrogen < 2.5 else "Sufficient"
    oc_status = "Low" if soc < 5 else "Moderate" if soc < 10 else "Sufficient"

    return {
        "source": soil.get("source", "ISRIC SoilGrids"),
        "ph": ph,
        "ph_class": ph_class,
        "texture": texture,
        "organic_carbon_pct": round(soc * 0.1, 2),
        "organic_carbon_status": oc_status,
        "nitrogen": nitrogen,
        "nitrogen_status": n_status,
        "cec_meq_100g": cec,
        "sand_pct": sand,
        "clay_pct": clay,
        "silt_pct": silt,
        "n": round(nitrogen * 25),
        "p": 35,
        "k": 45,
        "ec_ms_per_cm": round(max(0.2, min(2.0, 0.3 + clay * 0.02 + (7.0 - ph) * 0.1)), 2),
        "moisture_pct": round(max(5, min(40, 20 + clay * 0.3 - sand * 0.1)), 1),
        "groundwater_depth_m": round(max(3, min(50, 25 - (sand - 40) * 0.2)), 1),
        "water_retention": "High" if clay > 30 else "Moderate" if clay > 15 else "Low",
        "drainage": "Poor" if clay > 35 else "Moderate" if silt > 35 else "Good",
    }

