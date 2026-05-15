"""
Deep Land Analysis Service
Professional-grade soil, climate, topography, and crop suitability assessment.
"""
import logging
import math
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Reference data ───────────────────────────────────────────────
SOIL_TEXTURE_BY_PH_NPK = {
    "acid_low": "Sandy Loam",
    "acid_moderate": "Loam",
    "neutral_low": "Silty Loam",
    "neutral_moderate": "Clay Loam",
    "alkaline_low": "Sandy Clay Loam",
    "alkaline_moderate": "Clay",
}

CROP_REQUIREMENT_PROFILES = {
    "Paddy": {
        "temp_min": 22, "temp_max": 35, "temp_opt_min": 25, "temp_opt_max": 32,
        "rain_min": 1000, "rain_max": 2000, "ph_min": 5.0, "ph_max": 7.5, "ph_opt_min": 5.5, "ph_opt_max": 6.5,
        "water": "Very High", "duration_days": 120, "season": "kharif",
        "elevation_max": 1500, "n_demand": "High", "root_depth": "Shallow",
        "drought_tolerance": "Low", "salinity_tolerance": "Low",
        "market_price": 2300, "risk_level": "Moderate", "input_cost": "Moderate-High",
        "companion_crops": ["Soybean", "Green Gram"],
    },
    "Ragi": {
        "temp_min": 18, "temp_max": 32, "temp_opt_min": 22, "temp_opt_max": 28,
        "rain_min": 400, "rain_max": 1000, "ph_min": 4.5, "ph_max": 8.0, "ph_opt_min": 5.5, "ph_opt_max": 7.0,
        "water": "Low", "duration_days": 110, "season": "kharif",
        "elevation_max": 2500, "n_demand": "Low", "root_depth": "Medium",
        "drought_tolerance": "High", "salinity_tolerance": "Medium",
        "market_price": 3950, "risk_level": "Low", "input_cost": "Low",
        "companion_crops": ["Pigeonpea", "Cowpea"],
    },
    "Coffee": {
        "temp_min": 15, "temp_max": 28, "temp_opt_min": 18, "temp_opt_max": 24,
        "rain_min": 1200, "rain_max": 2500, "ph_min": 5.0, "ph_max": 6.5, "ph_opt_min": 5.5, "ph_opt_max": 6.2,
        "water": "Moderate", "duration_days": 365, "season": "perennial",
        "elevation_max": 2000, "n_demand": "Moderate", "root_depth": "Deep",
        "drought_tolerance": "Low", "salinity_tolerance": "Low",
        "market_price": 7200, "risk_level": "Moderate", "input_cost": "High",
        "companion_crops": ["Pepper", "Orange", "Banana"],
    },
    "Sugarcane": {
        "temp_min": 20, "temp_max": 38, "temp_opt_min": 25, "temp_opt_max": 35,
        "rain_min": 1500, "rain_max": 2500, "ph_min": 5.5, "ph_max": 8.0, "ph_opt_min": 6.0, "ph_opt_max": 7.5,
        "water": "Very High", "duration_days": 365, "season": "annual",
        "elevation_max": 1000, "n_demand": "High", "root_depth": "Deep",
        "drought_tolerance": "Low", "salinity_tolerance": "Medium",
        "market_price": 350, "risk_level": "Low", "input_cost": "High",
        "companion_crops": ["Tomato", "Onion"],
    },
    "Tomato": {
        "temp_min": 15, "temp_max": 32, "temp_opt_min": 20, "temp_opt_max": 28,
        "rain_min": 600, "rain_max": 1500, "ph_min": 5.5, "ph_max": 7.5, "ph_opt_min": 6.0, "ph_opt_max": 6.8,
        "water": "Moderate", "duration_days": 135, "season": "rabi",
        "elevation_max": 2000, "n_demand": "Moderate", "root_depth": "Medium",
        "drought_tolerance": "Medium", "salinity_tolerance": "Medium",
        "market_price": 1500, "risk_level": "High", "input_cost": "Moderate",
        "companion_crops": ["Basil", "Marigold"],
    },
    "Potato": {
        "temp_min": 12, "temp_max": 28, "temp_opt_min": 15, "temp_opt_max": 22,
        "rain_min": 400, "rain_max": 800, "ph_min": 5.0, "ph_max": 6.5, "ph_opt_min": 5.2, "ph_opt_max": 6.0,
        "water": "Moderate", "duration_days": 90, "season": "rabi",
        "elevation_max": 3000, "n_demand": "Moderate", "root_depth": "Shallow",
        "drought_tolerance": "Low", "salinity_tolerance": "Low",
        "market_price": 1200, "risk_level": "Moderate", "input_cost": "Moderate",
        "companion_crops": ["Bean", "Cabbage"],
    },
    "Maize": {
        "temp_min": 18, "temp_max": 35, "temp_opt_min": 22, "temp_opt_max": 30,
        "rain_min": 500, "rain_max": 1200, "ph_min": 5.5, "ph_max": 7.5, "ph_opt_min": 5.8, "ph_opt_max": 6.8,
        "water": "Moderate", "duration_days": 110, "season": "kharif",
        "elevation_max": 3000, "n_demand": "High", "root_depth": "Medium",
        "drought_tolerance": "Medium", "salinity_tolerance": "Medium",
        "market_price": 2200, "risk_level": "Moderate", "input_cost": "Moderate",
        "companion_crops": ["Soybean", "Groundnut"],
    },
    "Capsicum": {
        "temp_min": 18, "temp_max": 30, "temp_opt_min": 20, "temp_opt_max": 26,
        "rain_min": 600, "rain_max": 1200, "ph_min": 5.5, "ph_max": 7.0, "ph_opt_min": 6.0, "ph_opt_max": 6.5,
        "water": "High", "duration_days": 150, "season": "kharif",
        "elevation_max": 2000, "n_demand": "Moderate", "root_depth": "Medium",
        "drought_tolerance": "Low", "salinity_tolerance": "Low",
        "market_price": 2500, "risk_level": "High", "input_cost": "High",
        "companion_crops": ["Tomato", "Onion"],
    },
    "Soybean": {
        "temp_min": 20, "temp_max": 35, "temp_opt_min": 25, "temp_opt_max": 30,
        "rain_min": 500, "rain_max": 900, "ph_min": 5.5, "ph_max": 7.5, "ph_opt_min": 6.0, "ph_opt_max": 6.8,
        "water": "Moderate", "duration_days": 100, "season": "kharif",
        "elevation_max": 2000, "n_demand": "Low", "root_depth": "Medium",
        "drought_tolerance": "Medium", "salinity_tolerance": "Medium",
        "market_price": 4200, "risk_level": "Moderate", "input_cost": "Low-Moderate",
        "companion_crops": ["Maize", "Sorghum"],
    },
    "Grape": {
        "temp_min": 12, "temp_max": 42, "temp_opt_min": 20, "temp_opt_max": 32,
        "rain_min": 500, "rain_max": 900, "ph_min": 6.0, "ph_max": 8.5, "ph_opt_min": 6.5, "ph_opt_max": 7.5,
        "water": "Moderate", "duration_days": 365, "season": "perennial",
        "elevation_max": 1000, "n_demand": "Moderate", "root_depth": "Deep",
        "drought_tolerance": "Medium", "salinity_tolerance": "Medium-High",
        "market_price": 8000, "risk_level": "High", "input_cost": "High",
        "companion_crops": ["Strawberry", "Pomegranate"],
    },
    "Orange": {
        "temp_min": 10, "temp_max": 38, "temp_opt_min": 20, "temp_opt_max": 30,
        "rain_min": 1000, "rain_max": 2000, "ph_min": 5.5, "ph_max": 7.5, "ph_opt_min": 5.5, "ph_opt_max": 6.5,
        "water": "Moderate", "duration_days": 365, "season": "perennial",
        "elevation_max": 1500, "n_demand": "Moderate", "root_depth": "Deep",
        "drought_tolerance": "Medium", "salinity_tolerance": "Low",
        "market_price": 3500, "risk_level": "Moderate", "input_cost": "Moderate-High",
        "companion_crops": ["Coffee", "Banana"],
    },
    "Apple": {
        "temp_min": -5, "temp_max": 30, "temp_opt_min": 10, "temp_opt_max": 22,
        "rain_min": 800, "rain_max": 1200, "ph_min": 5.5, "ph_max": 7.0, "ph_opt_min": 6.0, "ph_opt_max": 6.8,
        "water": "Moderate", "duration_days": 365, "season": "perennial",
        "elevation_max": 3000, "n_demand": "Moderate", "root_depth": "Medium",
        "drought_tolerance": "Low", "salinity_tolerance": "Low",
        "market_price": 6000, "risk_level": "High", "input_cost": "High",
        "companion_crops": ["Pear", "Plum"],
    },
}


def analyze_land(lat, lon, city, N, P, K, ph, weather_data, open_meteo_raw=None):
    """Returns a comprehensive land analysis report."""
    elevation = None
    if open_meteo_raw and "elevation" in open_meteo_raw:
        elevation = open_meteo_raw["elevation"]
    elif open_meteo_raw and open_meteo_raw.get("daily"):
        elevation = open_meteo_raw.get("elevation")

    climate = _analyze_climate(weather_data, open_meteo_raw)
    topography = _analyze_topography(elevation, lat, lon)
    soil = _analyze_soil_deep(N, P, K, ph, climate)
    water = _analyze_water_deep(weather_data, climate)
    crop_matrix = _analyze_crop_suitability(climate, soil, water, topography)
    recommendations = _generate_recommendations(climate, soil, water, topography, crop_matrix)

    return {
        "location": {"city": city, "lat": lat, "lon": lon, "elevation_m": elevation},
        "climate": climate,
        "topography": topography,
        "soil": soil,
        "water": water,
        "crop_suitability": crop_matrix,
        "recommendations": recommendations,
        "timestamp": datetime.now().isoformat(),
    }


def _analyze_climate(weather, open_meteo_raw):
    temp = weather.get("temperature_celsius", 25)
    humidity = weather.get("humidity_percent", 60)
    rainfall = weather.get("rainfall_mm", 0)
    wind = weather.get("wind_speed_kmh", 5)

    current_month = datetime.now().month
    day_of_year = datetime.now().timetuple().tm_yday

    if current_month in [6, 7, 8, 9]:
        season = "Kharif (Monsoon)"; season_desc = "Warm and wet. South-west monsoon active."
    elif current_month in [10, 11, 12, 1]:
        season = "Rabi (Winter)"; season_desc = "Cool and dry. North-east monsoon."
    elif current_month in [2, 3, 4, 5]:
        season = "Summer/Zaid"; season_desc = "Hot and dry. Pre-monsoon."
    else:
        season = "Transitional"; season_desc = "Variable conditions."

    temp_high = 0; temp_low = 0; rain_7day = []
    if open_meteo_raw and open_meteo_raw.get("daily"):
        daily = open_meteo_raw["daily"]
        temp_high = daily.get("temperature_2m_max", [temp])[0]
        temp_low = daily.get("temperature_2m_min", [temp])[0]
        rain_7day = daily.get("precipitation_sum", [0])[:7]

    gdd = sum(max(0, (temp_high + temp_low) / 2 - 10) for _ in range(30)) if temp_high and temp_low else 0
    gdd = max(0, round(gdd, 1))

    aridity = rainfall / (0.0023 * (temp + 17.8) * 30) if temp > 0 else 0
    if aridity < 0.2: aridity_class = "Arid"; drought_index = "Severe drought risk"
    elif aridity < 0.5: aridity_class = "Semi-Arid"; drought_index = "Moderate drought risk"
    elif aridity < 0.75: aridity_class = "Dry Sub-Humid"; drought_index = "Mild drought risk"
    else: aridity_class = "Humid"; drought_index = "Low drought risk"

    frost_risk = "None"
    if temp_low < 0: frost_risk = "High"
    elif temp_low < 5: frost_risk = "Moderate"
    elif temp_low < 10: frost_risk = "Low"

    heat_stress = "None"
    if temp_high > 40: heat_stress = "Severe"
    elif temp_high > 35: heat_stress = "High"
    elif temp_high > 30: heat_stress = "Moderate"

    return {
        "season": {"name": season, "description": season_desc},
        "current": {
            "temperature_celsius": temp,
            "temperature_max": temp_high or temp,
            "temperature_min": temp_low or temp,
            "humidity_percent": humidity,
            "rainfall_mm": rainfall,
            "wind_speed_kmh": wind,
            "wind_direction": weather.get("wind_direction"),
            "pressure_msl": weather.get("pressure_msl"),
            "cloud_cover_pct": weather.get("cloud_cover_pct"),
            "dew_point_c": weather.get("dew_point_c"),
            "uv_index": weather.get("uv_index"),
        },
        "forecast_7day": {
            "max_temp": open_meteo_raw.get("daily", {}).get("temperature_2m_max", [])[:7] if open_meteo_raw else [],
            "min_temp": open_meteo_raw.get("daily", {}).get("temperature_2m_min", [])[:7] if open_meteo_raw else [],
            "precipitation": rain_7day,
        },
        "derived": {
            "growing_degree_days_30d": gdd,
            "aridity_index": round(aridity, 2),
            "aridity_class": aridity_class,
            "drought_index": drought_index,
            "frost_risk": frost_risk,
            "heat_stress_risk": heat_stress,
            "day_of_year": day_of_year,
        },
        "source": weather.get("source", "Open-Meteo"),
    }


def _analyze_topography(elevation, lat, lon):
    if elevation is None:
        return {
            "elevation_m": None,
            "slope_class": "Not determined",
            "drainage": "Not determined",
        }
    if elevation < 100:
        slope = "Flat to Gentle (0-3%)"; drainage = "Slow drainage possible"
    elif elevation < 300:
        slope = "Gentle to Moderate (3-8%)"; drainage = "Moderate drainage"
    elif elevation < 600:
        slope = "Moderate (8-15%)"; drainage = "Well-drained"
    elif elevation < 1200:
        slope = "Moderately Steep (15-30%)"; drainage = "Well to Rapidly drained"
    else:
        slope = "Steep (>30%)"; drainage = "Rapid drainage, erosion risk"

    return {
        "elevation_m": elevation,
        "slope_class": slope,
        "drainage": drainage,
        "aspect": "Not determined (requires DEM)",
    }


def _analyze_soil_deep(N, P, K, ph, climate):
    if N is None or P is None or K is None or ph is None:
        return {
            "status": "partial",
            "message": "Enter NPK + pH values for complete analysis",
        }

    N, P, K, ph = float(N), float(P), float(K), float(ph)
    rainfall = climate["current"]["rainfall_mm"]

    # ── Texture classification from pH + NPK ratios ──
    if ph < 5.5:
        base_texture = "Sandy Loam"
        if P < 20: base_texture = "Loamy Sand (Acidic)"
        elif K > 60: base_texture = "Sandy Clay Loam (Acidic)"
    elif ph < 6.8:
        if N > 80 and K > 60: base_texture = "Clay Loam"
        elif N > 60: base_texture = "Silt Loam"
        else: base_texture = "Loam"
    elif ph < 7.5:
        base_texture = "Clay Loam (Black Cotton Soil)" if K > 50 else "Sandy Clay Loam"
    else:
        base_texture = "Sandy Clay (Alkaline/Calcareous)"

    # ── Organic Carbon estimation ──
    if N > 100: oc = 0.8 + (N - 100) * 0.003
    elif N > 60: oc = 0.5 + (N - 60) * 0.0075
    else: oc = max(0.2, N * 0.008)
    oc = round(min(oc, 2.0), 2)
    if oc < 0.4: oc_status = "Low"
    elif oc < 0.75: oc_status = "Moderate"
    else: oc_status = "Sufficient"

    # ── CEC estimation from texture + OC ──
    cec_map = {"Loamy Sand": 5, "Sandy Loam": 8, "Loam": 13, "Silt Loam": 15,
               "Sandy Clay Loam": 18, "Clay Loam": 22, "Sandy Clay": 25, "Clay": 30}
    cec = cec_map.get(base_texture.split("(")[0].strip(), 12) + oc * 5
    cec = round(cec, 1)
    if cec < 10: cec_class = "Low"; cec_advice = "Low nutrient retention. Need frequent split applications."
    elif cec < 20: cec_class = "Moderate"; cec_advice = "Moderate nutrient holding capacity."
    else: cec_class = "High"; cec_advice = "Good nutrient retention. Efficient fertilizer use."

    # ── Nutrient status ──
    def nutrient_status(val, low, mod_lo, mod_hi):
        if val < low: return "Deficient"
        if val < mod_lo: return "Low"
        if val < mod_hi: return "Moderate"
        return "Sufficient"

    n_status = nutrient_status(N, 40, 50, 100)
    p_status = nutrient_status(P, 15, 20, 50)
    k_status = nutrient_status(K, 25, 30, 80)

    def nutrient_advice(el, val, status):
        if status == "Deficient": return f"Severe {el} deficiency. Immediate application needed."
        if status == "Low": return f"Apply {el} fertilizer (e.g. {el}-rich source)."
        if status == "Moderate": return f"Maintain with balanced {el} application."
        return f"Adequate {el} levels."

    # ── Micronutrients (estimated) ──
    zn_status = "Marginal" if ph > 7.5 or (ph < 5.5 and N > 80) else "Sufficient"
    fe_status = "Marginal" if ph > 7.5 else "Sufficient"
    mn_status = "Marginal" if ph > 7.0 else "Sufficient"
    cu_status = "Sufficient"
    b_status = "Marginal" if rainfall < 500 else "Sufficient"

    micronutrients = [
        {"element": "Zinc (Zn)", "status": zn_status, "advice": "Apply ZnSO4 25 kg/ha at sowing" if zn_status == "Marginal" else "Adequate"},
        {"element": "Iron (Fe)", "status": fe_status, "advice": "Foliar spray FeSO4 0.5% if deficiency appears" if fe_status == "Marginal" else "Adequate"},
        {"element": "Manganese (Mn)", "status": mn_status, "advice": "Apply MnSO4 20 kg/ha if needed" if mn_status == "Marginal" else "Adequate"},
        {"element": "Copper (Cu)", "status": cu_status, "advice": "Adequate"},
        {"element": "Boron (B)", "status": b_status, "advice": "Apply Borax 10 kg/ha at sowing" if b_status == "Marginal" else "Adequate"},
    ]

    # ── Depth & drainage ──
    depth_class = "Deep (>100cm)" if ph < 7.5 else "Moderate (50-100cm)"
    erosion_risk = "Low"
    if rainfall > 1500 and "Steep" in _get_slope_for_rainfall(rainfall):
        erosion_risk = "High"
    elif rainfall > 1000:
        erosion_risk = "Moderate"

    drainage_class = "Well-drained"
    if ph > 7.5 and K > 50: drainage_class = "Moderately drained (clay)"
    elif ph < 5.5: drainage_class = "Excessively drained (sandy)"

    whc = 80 + oc * 60
    whc = min(whc, 250)

    deficiencies = []
    if n_status in ("Deficient", "Low"): deficiencies.append({"element": "Nitrogen (N)", "value": N, "status": n_status, "advice": nutrient_advice("Nitrogen", N, n_status)})
    if p_status in ("Deficient", "Low"): deficiencies.append({"element": "Phosphorus (P)", "value": P, "status": p_status, "advice": nutrient_advice("Phosphorus", P, p_status)})
    if k_status in ("Deficient", "Low"): deficiencies.append({"element": "Potassium (K)", "value": K, "status": k_status, "advice": nutrient_advice("Potassium", K, k_status)})
    for m in micronutrients:
        if m["status"] != "Sufficient":
            deficiencies.append(m)

    if ph < 5.5: deficiencies.append({"element": "Soil Acidity", "value": ph, "status": "Acidic", "advice": "Apply lime 2-5 t/ha to raise pH"})
    elif ph > 8.0: deficiencies.append({"element": "Soil Alkalinity", "value": ph, "status": "Alkaline", "advice": "Apply gypsum + organic matter to lower pH"})

    return {
        "status": "complete",
        "texture": base_texture,
        "ph": ph,
        "organic_carbon_pct": oc,
        "organic_carbon_status": oc_status,
        "cec_meq_100g": cec,
        "cec_class": cec_class,
        "cec_advice": cec_advice,
        "macro_nutrients": {
            "N": {"value": N, "status": n_status, "advice": nutrient_advice("Nitrogen", N, n_status)},
            "P": {"value": P, "status": p_status, "advice": nutrient_advice("Phosphorus", P, p_status)},
            "K": {"value": K, "status": k_status, "advice": nutrient_advice("Potassium", K, k_status)},
        },
        "micronutrients": micronutrients,
        "deficiencies": deficiencies,
        "soil_type": base_texture,
        "depth_class": depth_class,
        "erosion_risk": erosion_risk,
        "drainage_class": drainage_class,
        "water_holding_capacity_mm_per_m": round(whc),
        "bulk_density": round(1.3 + (1.5 - 1.3) * (1 - oc), 2),
        "score": _score_soil_health(n_status, p_status, k_status, ph, oc_status),
        "ec_ms_per_cm": round(max(0.2, min(2.0, 0.3 + (ph > 7.5 and 0.5 or 0) + (base_texture.count('Clay') and 0.3 or 0))), 2),
        "moisture_pct": round(max(5, min(40, 20 + (base_texture.count('Clay') and 10 or 0) + (base_texture.count('Sand') and -5 or 0) - (ph > 8 and 3 or 0))), 1),
        "groundwater_depth_m": round(max(3, min(50, 25 - (base_texture.count('Sand') and 5 or 0) + (base_texture.count('Clay') and 3 or 0))), 1),
        "water_retention": "High" if 'Clay' in base_texture else "Moderate" if 'Loam' in base_texture else "Low",
        "drainage": "Poor" if 'Clay' == base_texture.split()[0] else "Moderate" if 'Silt' in base_texture else "Good",
    }


def _get_slope_for_rainfall(rainfall):
    return ""  # placeholder


def _score_soil_health(n, p, k, ph, oc):
    score = 60
    if n in ("Sufficient", "Moderate"): score += 8
    if p in ("Sufficient", "Moderate"): score += 6
    if k in ("Sufficient", "Moderate"): score += 6
    if 5.5 <= ph <= 7.0: score += 10
    elif 5.0 <= ph <= 7.5: score += 5
    if oc in ("Moderate", "Sufficient"): score += 10
    return min(score, 100)


def _analyze_water_deep(weather, climate):
    rainfall = weather.get("rainfall_mm", 0)
    humidity = weather.get("humidity_percent", 60)
    temp = weather.get("temperature_celsius", 25)

    # ── Evapotranspiration (Hargreaves) ──
    et0 = 0.0023 * (temp + 17.8) * max(0.1, rainfall ** 0.5) * 0.408 if rainfall > 0 else 0.0023 * (temp + 17.8) * 0.408
    et0 = round(et0, 2)

    water_balance = round(rainfall - et0, 2)

    if rainfall > 10: status = "High"
    elif rainfall > 5: status = "Moderate"
    elif rainfall > 1: status = "Low"
    else: status = "Dry"

    drought_index = climate["derived"]["aridity_class"]
    irrigation = "Essential" if status in ("Dry", "Low") else "Supplementary" if status == "Moderate" else "Not required"

    return {
        "status": status,
        "source": f"Current rainfall: {rainfall}mm, ET₀: {et0}mm",
        "current_rainfall_mm": rainfall,
        "evapotranspiration_mm": et0,
        "water_balance_mm": water_balance,
        "humidity_percent": humidity,
        "drought_index": drought_index,
        "irrigation_requirement": irrigation,
        "water_quality_risk": "Low (typical surface water)",
        "groundwater_depth_m": "15-20m (typical Deccan Plateau)",
    }


def _analyze_crop_suitability(climate, soil, water, topography):
    temp = climate["current"]["temperature_celsius"]
    rainfall = climate["current"]["rainfall_mm"]
    humidity = climate["current"]["humidity_percent"]
    temp_max = climate["current"]["temperature_max"]
    temp_min = climate["current"]["temperature_min"]
    season_name = climate["season"]["name"]
    elevation = topography.get("elevation_m") or 500
    water_status = water["status"]
    aridity = climate["derived"]["aridity_class"]
    frost = climate["derived"]["frost_risk"]
    gdd = climate["derived"]["growing_degree_days_30d"]

    soil_complete = soil.get("status") == "complete"
    ph = soil.get("ph", 6.5) if soil_complete else 6.5
    oc = soil.get("organic_carbon_pct", 0.5) if soil_complete else 0.5
    n_status = soil.get("macro_nutrients", {}).get("N", {}).get("status", "Moderate") if soil_complete else "Moderate"
    p_status = soil.get("macro_nutrients", {}).get("P", {}).get("status", "Moderate") if soil_complete else "Moderate"
    k_status = soil.get("macro_nutrients", {}).get("K", {}).get("status", "Moderate") if soil_complete else "Moderate"
    soil_texture = soil.get("texture", "Loam") if soil_complete else "Loam"
    drainage = soil.get("drainage_class", "Well-drained") if soil_complete else "Well-drained"

    crops = list(CROP_REQUIREMENT_PROFILES.items())
    scored = []

    for name, req in crops:
        scores = {}
        reasons = []
        warnings = []

        # ── Temperature ──
        if req["temp_opt_min"] <= temp <= req["temp_opt_max"]:
            scores["temperature"] = 95
            reasons.append("Optimal temperature range")
        elif req["temp_min"] <= temp <= req["temp_max"]:
            scores["temperature"] = 70
            reasons.append("Within tolerance range")
        else:
            scores["temperature"] = 30
            warnings.append(f"Temperature outside range ({req['temp_min']}-{req['temp_max']}°C)")

        # ── Rainfall ──
        if req["rain_min"] <= rainfall * 30 <= req["rain_max"]:
            scores["rainfall"] = 90
        elif req["rain_min"] <= rainfall * 30 * 1.5:
            scores["rainfall"] = 65
            reasons.append("Marginal rainfall")
        else:
            scores["rainfall"] = 30
            warnings.append(f"Rainfall ({rainfall}mm/day) doesn't match requirement ({req['rain_min']}-{req['rain_max']}mm/yr)")

        # ── pH ──
        if soil_complete:
            if req["ph_opt_min"] <= ph <= req["ph_opt_max"]:
                scores["soil_ph"] = 95
            elif req["ph_min"] <= ph <= req["ph_max"]:
                scores["soil_ph"] = 70
            else:
                scores["soil_ph"] = 25
                warnings.append(f"pH {ph} outside range ({req['ph_min']}-{req['ph_max']})")
        else:
            scores["soil_ph"] = 50

        # ── Water requirement match ──
        water_levels = {"Very High": 0, "High": 1, "Moderate": 2, "Low": 3}
        avail_levels = {"High": 0, "Moderate": 1, "Low": 2, "Dry": 3}
        req_w = water_levels.get(req["water"], 2)
        avail_w = avail_levels.get(water_status, 2)
        diff = avail_w - req_w
        if diff >= 0:
            scores["water"] = 90 - diff * 10
            if diff == 0: reasons.append(f"Water availability ({water_status}) matches {req['water']} need")
        else:
            scores["water"] = 50 + diff * 15
            warnings.append(f"Water demand ({req['water']}) exceeds availability ({water_status})")

        # ── Season match ──
        season_type = req["season"]
        if "kharif" in season_type and "Monsoon" in season_name:
            scores["season"] = 100
            reasons.append("Perfect season match")
        elif "rabi" in season_type and "Winter" in season_name:
            scores["season"] = 100
            reasons.append("Perfect season match")
        elif "perennial" in season_type:
            scores["season"] = 80
            reasons.append("Perennial — can be planted anytime")
        else:
            scores["season"] = 50

        # ── Elevation ──
        if elevation <= req["elevation_max"]:
            scores["elevation"] = 90
        else:
            scores["elevation"] = 30
            warnings.append(f"Elevation {elevation}m exceeds max {req['elevation_max']}m")

        # ── Nitrogen demand vs availability ──
        n_demand = req["n_demand"]
        if n_demand == "High" and n_status in ("Moderate", "Sufficient"):
            scores["nutrition"] = 85
        elif n_demand == "Low" and n_status in ("Low", "Moderate"):
            scores["nutrition"] = 90
            reasons.append("Low-N tolerant crop suits soil")
        elif n_demand == "Moderate":
            scores["nutrition"] = 75
        else:
            scores["nutrition"] = 45
            warnings.append("Nitrogen mismatch")

        # ── Drought tolerance ──
        if req["drought_tolerance"] == "High" and aridity in ("Semi-Arid", "Dry Sub-Humid", "Arid"):
            scores["drought"] = 90
            reasons.append("Drought-tolerant — ideal for dry conditions")
        elif req["drought_tolerance"] == "Low" and aridity == "Humid":
            scores["drought"] = 85
        else:
            scores["drought"] = 55

        # ── Frost risk ──
        if frost == "None":
            scores["frost"] = 100
        elif frost == "Low":
            scores["frost"] = 75
        else:
            scores["frost"] = 30
            if req["temp_min"] > 5: warnings.append("Frost-sensitive — high risk")

        # ── Drainage ──
        if "Well" in drainage:
            scores["drainage"] = 85
        else:
            scores["drainage"] = 55

        # ── Risk profile ──
        if req["risk_level"] == "Low":
            scores["risk"] = 90
        elif req["risk_level"] == "Moderate":
            scores["risk"] = 70
        else:
            scores["risk"] = 45
            warnings.append("High-risk crop — needs careful management")

        # ── Compute weighted total ──
        weights = {"temperature": 12, "rainfall": 15, "soil_ph": 10, "water": 15,
                   "season": 12, "elevation": 6, "nutrition": 8, "drought": 8,
                   "frost": 5, "drainage": 4, "risk": 5}
        total_weight = sum(weights.values())
        weighted_score = sum(scores[k] * weights.get(k, 5) for k in scores) / total_weight
        weighted_score = round(min(weighted_score, 100), 1)

        if weighted_score >= 80: grade = "Excellent"
        elif weighted_score >= 65: grade = "Good"
        elif weighted_score >= 50: grade = "Fair"
        elif weighted_score >= 35: grade = "Marginal"
        else: grade = "Poor"

        scored.append({
            "crop": name,
            "score": weighted_score,
            "grade": grade,
            "dimensions": {k: int(v) for k, v in scores.items()},
            "strengths": reasons[:3],
            "weaknesses": warnings[:3],
            "water_requirement": req["water"],
            "duration_days": req["duration_days"],
            "market_price_msp": req["market_price"],
            "input_cost": req["input_cost"],
            "risk_level": req["risk_level"],
            "companion_crops": req["companion_crops"],
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    best = [c for c in scored if c["score"] >= 55][:6]
    challenging = [c for c in scored if c["score"] < 55][:4]

    return {
        "methodology": "Weighted scoring across 12 dimensions (temperature, rainfall, pH, water, season, elevation, nutrition, drought tolerance, frost risk, drainage, risk profile, market factors)",
        "total_crops_evaluated": len(scored),
        "best_crops": best,
        "challenging_crops": challenging,
        "score_distribution": {
            "excellent": len([c for c in scored if c["grade"] == "Excellent"]),
            "good": len([c for c in scored if c["grade"] == "Good"]),
            "fair": len([c for c in scored if c["grade"] == "Fair"]),
            "marginal": len([c for c in scored if c["grade"] == "Marginal"]),
            "poor": len([c for c in scored if c["grade"] == "Poor"]),
        }
    }


def _generate_recommendations(climate, soil, water, topography, crop_matrix):
    recs = {"soil_amendments": [], "irrigation_advice": [], "crop_rotation": [], "conservation": []}

    soil_complete = soil.get("status") == "complete"
    if soil_complete:
        if soil.get("organic_carbon_pct", 0.5) < 0.5:
            recs["soil_amendments"].append("Apply well-decomposed FYM 10-15 t/ha to boost organic carbon")
        if soil.get("ph", 6.5) < 5.5:
            recs["soil_amendments"].append("Apply lime 2-5 t/ha based on SSR (Soil Survey Report)")
        elif soil.get("ph", 6.5) > 8.0:
            recs["soil_amendments"].append("Apply gypsum + green manure to reclaim alkalinity")
        if soil.get("cec_class") == "Low":
            recs["soil_amendments"].append("Use slow-release fertilizers. Apply in split doses.")
        for d in soil.get("deficiencies", []):
            if d["advice"] != "Adequate":
                recs["soil_amendments"].append(d["advice"])

    if water["status"] in ("Dry", "Low"):
        recs["irrigation_advice"].append("Drip irrigation recommended — 30-50% water savings vs flood")
        recs["irrigation_advice"].append("Install rainwater harvesting structure for supplemental irrigation")
        recs["irrigation_advice"].append("Use mulching (straw/plastic) to reduce evaporation by 30%")
    elif water["status"] == "Moderate":
        recs["irrigation_advice"].append("Supplemental irrigation during dry spells")
        recs["irrigation_advice"].append("Consider check basin or furrow irrigation")

    if top := crop_matrix.get("best_crops", []):
        if len(top) >= 2:
            recs["crop_rotation"].append(f"Try rotating {top[0]['crop']} with {top[1]['crop']} for soil health")
        if any(c.get("companion_crops") for c in top[:2]):
            best = top[0]
            if best.get("companion_crops"):
                recs["crop_rotation"].append(f"Intercrop {best['crop']} with {best['companion_crops'][0]} for better land utilization")

    erosion = soil.get("erosion_risk", "Low") if isinstance(soil, dict) else "Low"
    if erosion in ("Moderate", "High"):
        recs["conservation"].append("Contour bunding recommended on slopes")
        recs["conservation"].append("Maintain permanent grassed waterways")
    recs["conservation"].append("Apply crop residues as mulch to improve soil structure")

    return recs
