import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.weather_api import get_weather
from api.geocode_api import get_coordinates
from api.forecast_api import get_forecast

from services.crop_service import predict_crop
from services.yield_service import predict_yield, get_valid_crops, get_yield_benchmark
from services.risk_service import calculate_risk
from services.weather_disease_risk import calculate_disease_risk
from services.decision_engine import make_decision


def handle_prediction(data):
    if not isinstance(data, dict):
        return {"error": "Invalid request payload"}
    try:
        city = str(data.get("city", "")).strip().title()
        if not city:
            return {"error": "City is required"}

        n_val = max(0, min(int(float(data.get("N", 0))), 140))
        p_val = max(0, min(int(float(data.get("P", 0))), 140))
        k_val = max(0, min(int(float(data.get("K", 0))), 140))
        ph_val = float(data.get("ph", 0))
        if ph_val <= 0 or ph_val > 14:
            return {"error": "Soil pH must be between 0 and 14"}
    except (TypeError, ValueError):
        return {"error": "Invalid numeric inputs for N, P, K, or pH"}

    coords = get_coordinates(city)

    # FIX 5 — Handle error dict from geocode
    if isinstance(coords, dict) and "error" in coords:
        return coords
    if not isinstance(coords, (list, tuple)) or len(coords) != 2:
        return {"error": "Invalid city"}

    lat, lon = coords
    if lat is None or lon is None:
        return {"error": "Invalid city"}

    weather = get_weather(lat, lon)
    if weather is None:
        return {"error": "Weather unavailable"}

    forecast = get_forecast(lat, lon)
    if forecast is None:
        return {"error": "Forecast unavailable"}

    # 🔥 Use forecast-enhanced values
    weather["temperature"] = forecast["avg_temp"]
    # FIX 3 — Pass raw rainfall through; normalise_rainfall is called only in yield_service
    weather["rainfall"] = forecast["total_rainfall"]

    # 🔥 Clean + normalized input
    input_data = {
        "N": n_val,
        "P": p_val,
        "K": k_val,
        "temperature": weather["temperature"],
        "humidity": weather["humidity"],
        "ph": ph_val,
        "rainfall": weather["rainfall"],
    }

    print("Final crop prediction input:", input_data)

    top_crops = predict_crop(input_data)

    # 🔥 Use APY model's valid crop list (55+ crops) instead of old crop_encoder
    VALID_CROPS = set(get_valid_crops())

    # Case-insensitive matching for crop filtering
    valid_crops_lower = {c.lower(): c for c in VALID_CROPS}

    # 🔥 FILTER CROPS FOR YIELD MODEL
    selected_crop = None
    for c in top_crops:
        crop_lower = c["crop"].lower()
        if crop_lower in valid_crops_lower or c["crop"] in VALID_CROPS:
            selected_crop = c["crop"]
            break

    if selected_crop is None:
        selected_crop = top_crops[0]["crop"]
    
    print("Selected crop for yield prediction:", selected_crop)

    yield_value = predict_yield(selected_crop, weather)
    
    # FIX 7 — Compute predicted yield for ALL top crops
    top_yields = []
    for c in top_crops:
        crop_name = c["crop"]
        crop_lower = crop_name.lower()
        if crop_lower in valid_crops_lower or crop_name in VALID_CROPS:
            y = predict_yield(crop_name, weather)
            top_yields.append({"crop": crop_name, "yield": round(y, 2) if y is not None else 0})
        else:
            top_yields.append({"crop": crop_name, "yield": 0})

    # 🔥 RISK CALCULATION USING FORECAST-ENHANCED DATA
    risk = calculate_risk({
        "temperature": forecast["avg_temp"],
        "rainfall": forecast["total_rainfall"],
        "humidity": weather["humidity"]
    })

    result = make_decision(selected_crop, yield_value, risk)

    # 🌿 Per-disease risk assessment
    disease_risks = calculate_disease_risk(selected_crop, {
        "temperature": forecast["avg_temp"],
        "rainfall": forecast["total_rainfall"],
        "humidity": weather["humidity"]
    })

    # 🔥 FIXED keys
    result["top_crops"] = top_crops
    result["selected_crop"] = selected_crop
    result["city"] = city
    result["lat"] = lat
    result["lon"] = lon
    result["top_yields"] = top_yields  # FIX 7
    result["disease_risks"] = disease_risks
    result["state_avg_yield"] = get_yield_benchmark(selected_crop)
    
    # 🧪 RAG-Powered Expert Scientific Advisory
    try:
        from services.rag_service import RAGService
        rag_svc = RAGService()
        advice_query = f"Provide expert cultivation and scientific guidance for {selected_crop} in {city}. "
        advice_query += f"Context: Soil pH {ph_val}, Temperature {forecast['avg_temp']}C, Rainfall {forecast['total_rainfall']}mm."
        result["expert_advisory"] = rag_svc.augment_prompt(advice_query, top_k=3)
    except Exception as e:
        print(f"RAG Advisory failed: {e}")
        result["expert_advisory"] = ""

    print("Final decision result:", result)

    return result