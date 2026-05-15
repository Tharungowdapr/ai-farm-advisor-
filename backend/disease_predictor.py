"""
ICAR Disease Prediction Engine
===============================
Combines real weather data, soil data, and ICAR knowledge base to predict
crop disease risk for a given location.

Pipeline:
  1. Resolve city → coordinates (geocode)
  2. Fetch real weather & forecast (OpenWeatherMap / simulated fallback)
  3. Look up soil data by city (ICAR NBSS&LUP)
  4. Score each disease using ICAR thresholds + weather + soil
  5. Return ranked disease risks with ICAR-sourced advisory
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def predict_disease_risk(city_name, crop_name=None, soil_npk=None):
    """
    Full disease risk prediction pipeline for a location.

    Parameters
    ----------
    city_name : str — Indian city or town
    crop_name : str or None — specific crop (returns all if None)
    soil_npk  : dict or None — optional {N, P, K, ph} from soil test

    Returns
    -------
    dict with keys:
      city, soil, weather, disease_risks, forecast, timestamp
    """
    from real_weather import get_weather_for_location, get_forecast_for_location
    from soil_lookup import get_soil_for_city
    from icar_integration import calculate_disease_risk_icar

    # 1. Weather
    weather = get_weather_for_location(city_name)
    forecast = get_forecast_for_location(city_name)

    # Use forecast-enhanced values when available
    temp = forecast.get("avg_temp", weather["temperature"])
    rainfall = forecast.get("total_rainfall", weather["rainfall"])
    humidity = weather.get("humidity", 50)

    combined_weather = {
        "temperature": temp,
        "humidity": humidity,
        "rainfall": rainfall,
        "source_weather": weather.get("source", "Unknown"),
        "source_forecast": forecast.get("source", "Unknown"),
    }

    # 2. Soil
    soil = get_soil_for_city(city_name)

    # Use provided soil test pH if available, otherwise use soil map default
    soil_ph = soil_npk.get("ph") if soil_npk and "ph" in soil_npk else soil.get("ph")
    soil_data = {
        "ph": soil_ph,
        "type": soil["type"],
        "texture": soil.get("texture"),
        "drainage": soil.get("drainage"),
    }

    # 3. Determine which crops to check
    crops_to_check = []
    if crop_name:
        crops_to_check = [crop_name]
    else:
        from icar_integration import CROP_DISEASE_MAP
        crops_to_check = list(CROP_DISEASE_MAP.keys())

    # 4. Disease risk for each crop
    all_disease_risks = []
    for crop in crops_to_check:
        risks = calculate_disease_risk_icar(crop, combined_weather, soil_data)
        if risks:
            all_disease_risks.append({
                "crop": crop,
                "diseases": risks,
                "top_risk": risks[0]["risk_level"] if risks else "None",
                "top_score": risks[0]["risk_score"] if risks else 0,
            })

    # Sort crops by highest disease risk
    all_disease_risks.sort(key=lambda x: x["top_score"], reverse=True)

    return {
        "city": city_name,
        "soil": soil_data,
        "weather": combined_weather,
        "disease_risks_by_crop": all_disease_risks,
        "forecast": forecast,
        "timestamp": datetime.now().isoformat(),
        "note": "Based on ICAR-published disease thresholds and NBSS&LUP soil data"
    }


def estimate_soil_ph_from_npk(N, P, K):
    """
    Roughly estimate soil pH from NPK values.
    High N + low K → acidic tendency.
    Low N + high K → alkaline tendency.
    Returns a default of 6.5 if inconclusive.
    """
    if N > 80 and K < 30:
        return 6.0
    elif N < 40 and K > 60:
        return 7.5
    elif P > 60:
        return 6.8
    return 6.5
