"""
Crop Recommendation Engine
==========================
Recommends the best crops to grow at a given location using:
  - Real-time weather (OpenWeatherMap or simulated)
  - ICAR soil maps by location (no soil test needed)
  - Current season / cultivation calendar
  - ICAR disease risk profiles
  - Crop-soil-weather compatibility scoring

No NPK/pH inputs required from the farmer — everything is looked up
automatically from the location.
"""

import logging
from datetime import datetime
from math import exp

logger = logging.getLogger(__name__)

# ── Crop suitability profiles ──────────────────
# Each crop has: ideal temp range, ideal pH range, preferred soil types,
# water need, season, and growth duration
CROP_PROFILES = {
    "Paddy": {
        "temp_min": 25, "temp_max": 35,
        "ph_min": 5.5, "ph_max": 6.5,
        "soil_types": ["clay_loam", "clay", "silty_clay", "alluvial"],
        "water_need": "high",
        "rainfall_min": 1000, "rainfall_max": 1500,
        "seasons": ["Kharif", "Rabi"],
        "duration_days": 120,
        "icon": "🌾",
        "description": "Staple grain, ideal for wet/low-lying areas"
    },
    "Ragi": {
        "temp_min": 20, "temp_max": 30,
        "ph_min": 4.5, "ph_max": 8.0,
        "soil_types": ["red", "sandy_loam", "loam", "gravelly_clay"],
        "water_need": "low",
        "rainfall_min": 500, "rainfall_max": 1000,
        "seasons": ["Kharif"],
        "duration_days": 110,
        "icon": "🌾",
        "description": "Drought-tolerant millet, excellent for dry zones"
    },
    "Coffee": {
        "temp_min": 15, "temp_max": 24,
        "ph_min": 6.0, "ph_max": 6.5,
        "soil_types": ["laterite", "red", "loam"],
        "water_need": "moderate",
        "rainfall_min": 1500, "rainfall_max": 2500,
        "seasons": ["Perennial"],
        "duration_days": 365,
        "icon": "☕",
        "description": "High-value plantation crop for Malnad region"
    },
    "Sugarcane": {
        "temp_min": 20, "temp_max": 35,
        "ph_min": 6.5, "ph_max": 7.5,
        "soil_types": ["clay_loam", "loam", "alluvial", "black_cotton"],
        "water_need": "very_high",
        "rainfall_min": 1500, "rainfall_max": 2500,
        "seasons": ["Annual"],
        "duration_days": 365,
        "icon": "🎋",
        "description": "High-return cash crop, needs good irrigation"
    },
    "Tomato": {
        "temp_min": 20, "temp_max": 25,
        "ph_min": 6.0, "ph_max": 7.0,
        "soil_types": ["loam", "sandy_loam", "red"],
        "water_need": "moderate",
        "rainfall_min": 600, "rainfall_max": 1500,
        "seasons": ["Kharif"],
        "duration_days": 135,
        "icon": "🍅",
        "description": "Short-duration vegetable with good market demand"
    },
    "Potato": {
        "temp_min": 15, "temp_max": 25,
        "ph_min": 5.0, "ph_max": 6.5,
        "soil_types": ["sandy_loam", "loam", "red"],
        "water_need": "moderate",
        "rainfall_min": 400, "rainfall_max": 800,
        "seasons": ["Rabi"],
        "duration_days": 90,
        "icon": "🥔",
        "description": "High-yield tuber crop for cooler seasons"
    },
    "Maize": {
        "temp_min": 21, "temp_max": 30,
        "ph_min": 5.5, "ph_max": 7.0,
        "soil_types": ["loam", "sandy_loam", "alluvial", "red"],
        "water_need": "moderate",
        "rainfall_min": 500, "rainfall_max": 750,
        "seasons": ["Kharif"],
        "duration_days": 110,
        "icon": "🌽",
        "description": "Multi-purpose grain for food and fodder"
    },
    "Capsicum": {
        "temp_min": 18, "temp_max": 25,
        "ph_min": 6.0, "ph_max": 6.5,
        "soil_types": ["loam", "sandy_loam", "red"],
        "water_need": "high",
        "rainfall_min": 600, "rainfall_max": 1200,
        "seasons": ["Kharif"],
        "duration_days": 150,
        "icon": "🫑",
        "description": "High-value vegetable for peri-urban markets"
    },
    "Soybean": {
        "temp_min": 25, "temp_max": 30,
        "ph_min": 6.0, "ph_max": 7.0,
        "soil_types": ["loam", "clay_loam", "black_cotton"],
        "water_need": "moderate",
        "rainfall_min": 600, "rainfall_max": 800,
        "seasons": ["Kharif"],
        "duration_days": 100,
        "icon": "🫘",
        "description": "Oilseed with growing market demand"
    },
    "Grape": {
        "temp_min": 15, "temp_max": 40,
        "ph_min": 6.5, "ph_max": 8.0,
        "soil_types": ["red", "loam", "black_cotton"],
        "water_need": "moderate",
        "rainfall_min": 500, "rainfall_max": 900,
        "seasons": ["Perennial"],
        "duration_days": 365,
        "icon": "🍇",
        "description": "High-value fruit crop for semi-arid regions"
    },
    "Orange": {
        "temp_min": 10, "temp_max": 35,
        "ph_min": 5.5, "ph_max": 6.5,
        "soil_types": ["laterite", "red", "loam"],
        "water_need": "moderate",
        "rainfall_min": 1200, "rainfall_max": 2500,
        "seasons": ["Perennial"],
        "duration_days": 365,
        "icon": "🍊",
        "description": "Citrus fruit suited to hilly regions"
    },
    "Cotton": {
        "temp_min": 25, "temp_max": 35,
        "ph_min": 6.0, "ph_max": 8.0,
        "soil_types": ["black_cotton", "clay", "alluvial"],
        "water_need": "moderate",
        "rainfall_min": 600, "rainfall_max": 1200,
        "seasons": ["Kharif"],
        "duration_days": 180,
        "icon": "🌿",
        "description": "Important cash crop for black soil regions"
    },
    "Groundnut": {
        "temp_min": 25, "temp_max": 30,
        "ph_min": 5.5, "ph_max": 7.0,
        "soil_types": ["sandy_loam", "loamy_sand", "red"],
        "water_need": "moderate",
        "rainfall_min": 500, "rainfall_max": 900,
        "seasons": ["Kharif"],
        "duration_days": 120,
        "icon": "🥜",
        "description": "Oilseed crop good for light-textured soils"
    },
    "Wheat": {
        "temp_min": 15, "temp_max": 25,
        "ph_min": 6.0, "ph_max": 8.0,
        "soil_types": ["loam", "clay_loam", "alluvial"],
        "water_need": "moderate",
        "rainfall_min": 400, "rainfall_max": 800,
        "seasons": ["Rabi"],
        "duration_days": 120,
        "icon": "🌾",
        "description": "Staple grain for rabi season in north India"
    },
    "Banana": {
        "temp_min": 25, "temp_max": 35,
        "ph_min": 5.5, "ph_max": 7.0,
        "soil_types": ["loam", "sandy_loam", "alluvial"],
        "water_need": "high",
        "rainfall_min": 1000, "rainfall_max": 2000,
        "seasons": ["Perennial"],
        "duration_days": 365,
        "icon": "🍌",
        "description": "Year-round fruit with consistent market demand"
    },
    "Mango": {
        "temp_min": 24, "temp_max": 32,
        "ph_min": 5.5, "ph_max": 7.5,
        "soil_types": ["loam", "sandy_loam", "red", "laterite"],
        "water_need": "low",
        "rainfall_min": 750, "rainfall_max": 2500,
        "seasons": ["Perennial"],
        "duration_days": 365,
        "icon": "🥭",
        "description": "King of fruits, suitable for dryland horticulture"
    },
}


def _season_score(crop_profile, month=None):
    """How well does the current season match the crop's growing season? (0-1)"""
    if month is None:
        month = datetime.now().month

    seasons = crop_profile.get("seasons", [])

    # Perennial / annual crops score high always
    if "Perennial" in seasons or "Annual" in seasons:
        return 1.0

    for season_name in seasons:
        if season_name == "Kharif" and month in [6, 7, 8, 9, 10]:
            return 1.0
        if season_name == "Rabi" and month in [10, 11, 12, 1, 2, 3]:
            return 1.0
        if season_name == "Summer" and month in [2, 3, 4, 5]:
            return 1.0

    return 0.2  # Off-season, still possible with irrigation


def _temperature_score(crop_profile, temp):
    """Score temperature suitability (0-1)"""
    tmin = crop_profile["temp_min"]
    tmax = crop_profile["temp_max"]
    mid = (tmin + tmax) / 2
    half_range = (tmax - tmin) / 2

    if half_range == 0:
        return 1.0 if tmin <= temp <= tmax else 0.0

    # Gaussian-like scoring centered on mid
    z = (temp - mid) / half_range
    score = exp(-z * z)
    return max(0.0, min(1.0, score))


def _rainfall_score(crop_profile, rainfall):
    """Score rainfall suitability (0-1)"""
    rmin = crop_profile.get("rainfall_min", 500)
    rmax = crop_profile.get("rainfall_max", 1500)

    if rmin <= rainfall <= rmax:
        return 1.0
    elif rainfall < rmin:
        return max(0.2, rainfall / rmin)
    else:
        return max(0.2, rmax / rainfall)


def _soil_score(crop_profile, soil_data):
    """Score soil suitability (0-1) based on type and pH"""
    score = 0.0
    factors = []

    # Soil type match
    preferred = crop_profile.get("soil_types", [])
    soil_type = (soil_data.get("type") or "").lower()
    if soil_type in preferred:
        score += 0.5
    else:
        score += 0.15
        factors.append(f"Soil type '{soil_type}' is not ideal for this crop")

    # Soil pH match
    ph = soil_data.get("ph")
    ph_min = crop_profile.get("ph_min", 5.0)
    ph_max = crop_profile.get("ph_max", 8.0)
    if ph is not None:
        if ph_min <= ph <= ph_max:
            score += 0.5
        elif abs(ph - ph_min) <= 0.5 or abs(ph - ph_max) <= 0.5:
            score += 0.3
            factors.append(f"Soil pH {ph} is near the boundary ({ph_min}-{ph_max})")
        else:
            score += 0.1
            factors.append(f"Soil pH {ph} is outside optimal range ({ph_min}-{ph_max})")

    return min(score, 1.0), factors


def _disease_penalty(crop_name, weather_data, soil_data):
    """
    Calculate a penalty multiplier based on disease risk.
    Higher disease risk = lower score multiplier.
    """
    try:
        from icar_integration import calculate_disease_risk_icar
        risks = calculate_disease_risk_icar(crop_name, weather_data, soil_data)
        if not risks:
            return 1.0
        avg_score = sum(r["risk_score"] for r in risks) / len(risks)
        penalty = max(0.5, 1.0 - (avg_score / 100) * 0.5)
        return penalty
    except Exception:
        return 1.0


def _water_score(crop_profile, rainfall):
    """Score water availability (0-1)"""
    water_need = crop_profile.get("water_need", "moderate")

    need_map = {
        "very_high": 1200,
        "high": 900,
        "moderate": 600,
        "low": 400,
    }
    ideal = need_map.get(water_need, 600)

    if rainfall >= ideal:
        return 1.0
    else:
        return max(0.2, rainfall / ideal)


def recommend_crops(location_data, top_k=5):
    """
    Main recommendation function.

    Parameters
    ----------
    location_data : dict with keys:
        - city (str) OR lat/lon (float)
        - weather (dict): temperature, humidity, rainfall
        - soil (dict): type, ph, texture, drainage
        - forecast (dict, optional): avg_temp, total_rainfall

    top_k : int — number of crops to return

    Returns
    -------
    dict with:
        location, season, weather_source, soil, recommendations[]
    """
    weather = location_data.get("weather", {})
    soil = location_data.get("soil", {})
    forecast = location_data.get("forecast", {})

    temp = forecast.get("avg_temp", weather.get("temperature", 25))
    rainfall = forecast.get("total_rainfall", weather.get("rainfall", 500))
    humidity = weather.get("humidity", 50)
    month = datetime.now().month

    current_season = _get_season_name(month)

    scored = []
    for crop_name, profile in CROP_PROFILES.items():
        # Season
        s_season = _season_score(profile, month)

        # Temperature
        s_temp = _temperature_score(profile, temp)

        # Rainfall
        s_rain = _rainfall_score(profile, rainfall)

        # Soil
        s_soil, soil_factors = _soil_score(profile, soil)

        # Water availability
        s_water = _water_score(profile, rainfall)

        # Disease penalty
        combined_weather = {"temperature": temp, "humidity": humidity, "rainfall": rainfall}
        penalty = _disease_penalty(crop_name, combined_weather, soil)

        # Weighted score
        weights = {"season": 0.25, "temp": 0.20, "soil": 0.20, "rainfall": 0.15, "water": 0.10, "disease": 0.10}
        raw_score = (
            weights["season"] * s_season +
            weights["temp"] * s_temp +
            weights["soil"] * s_soil +
            weights["rainfall"] * s_rain +
            weights["water"] * s_water
        ) * penalty

        confidence = round(raw_score * 100, 1)
        confidence = max(0, min(100, confidence))

        # Build reasons
        reasons = []
        if s_season < 0.3:
            reasons.append(f"Not the ideal season ({current_season}) for this crop")
        else:
            reasons.append(f"Season ({current_season}) is suitable")

        if s_temp >= 0.7:
            reasons.append(f"Temperature {temp:.0f}°C suits this crop")
        elif s_temp < 0.4:
            reasons.append(f"Temperature {temp:.0f}°C is suboptimal")

        if s_soil >= 0.7:
            reasons.append(f"Soil ({soil.get('type', 'unknown')}, pH {soil.get('ph', 'N/A')}) is suitable")
        elif s_soil < 0.4:
            reasons.append(f"Soil is not ideal")

        if s_rain >= 0.7:
            reasons.append(f"Rainfall {rainfall:.0f}mm matches crop needs")
        elif s_rain < 0.4:
            reasons.append(f"Rainfall {rainfall:.0f}mm is suboptimal")

        if penalty < 0.8:
            reasons.append("Disease risk is elevated — need precautions")

        disease_risks = []
        try:
            from icar_integration import calculate_disease_risk_icar
            disease_risks = calculate_disease_risk_icar(crop_name, combined_weather, soil)
        except Exception:
            pass

        scored.append({
            "crop": crop_name,
            "icon": profile.get("icon", "🌱"),
            "confidence": confidence,
            "description": profile.get("description", ""),
            "duration_days": profile.get("duration_days", 120),
            "water_need": profile.get("water_need", "moderate"),
            "reasons": reasons[:3],
            "season_score": round(s_season * 100, 1),
            "temp_score": round(s_temp * 100, 1),
            "soil_score": round(s_soil * 100, 1),
            "rainfall_score": round(s_rain * 100, 1),
            "disease_penalty": round((1 - penalty) * 100, 1),
            "top_disease_risks": [
                {"name": d["name"], "level": d["risk_level"], "score": d["risk_score"]}
                for d in disease_risks[:2]
            ],
        })

    # Sort by confidence descending
    scored.sort(key=lambda x: x["confidence"], reverse=True)

    return {
        "location": location_data.get("city", "Detected location"),
        "season": current_season,
        "temperature": round(temp, 1),
        "rainfall": round(rainfall, 1),
        "humidity": round(humidity, 1),
        "soil": {
            "type": soil.get("type", "unknown"),
            "ph": soil.get("ph", "N/A"),
            "texture": soil.get("texture", "N/A"),
            "drainage": soil.get("drainage", "N/A"),
        },
        "weather_source": weather.get("source", "Simulated"),
        "recommendations": scored[:top_k],
        "timestamp": datetime.now().isoformat(),
    }


def _get_season_name(month):
    if month in [6, 7, 8, 9]:
        return "Kharif (Monsoon)"
    elif month in [10, 11, 12, 1]:
        return "Rabi (Winter)"
    elif month in [2, 3]:
        return "Summer"
    else:
        return "Pre-Monsoon"
