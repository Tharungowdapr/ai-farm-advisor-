from flask import Blueprint, request, jsonify
from datetime import datetime
import logging
import json
from pathlib import Path
from services.msp_fetcher import MSPFetcher, get_msp_for_crop
from services.weather_disease_calculator import WeatherDiseaseRiskCalculator, get_crop_disease_risks
from services.cultivation_advisor import CultivationAdvisor
from services.calendar_service import generate_calendar
from services.economics_service import estimate_economics
from controllers.prediction_controller import handle_prediction
from api.geocode_api import get_coordinates
from core.monitoring import track_llm_call

logger = logging.getLogger(__name__)
intel_bp = Blueprint('intelligence', __name__)

# Static crop database helper
def _get_static_crop_data():
    return [
        {"id": 1, "name": "Paddy", "scientific": "Oryza sativa", "variety": "Hybrid-4", "region": "Cauvery Basin", "cycle": "120 Days", "water": "High", "yield": "25q/acre", "image": "/api/image/paddy.png", "suitability": {"temperature": "25-35°C", "pH": "5.5-6.5", "elevation": "<1000m", "rainfall": "1000-1500mm"}},
        {"id": 2, "name": "Ragi", "scientific": "Eleusine coracana", "variety": "GPU-28", "region": "Dry Zone", "cycle": "110 Days", "water": "Low", "yield": "15q/acre", "image": "/api/image/ragi.png", "suitability": {"temperature": "20-30°C", "pH": "4.5-8.0", "elevation": "500-2000m", "rainfall": "500-1000mm"}},
        {"id": 3, "name": "Coffee", "scientific": "Coffea arabica", "variety": "Sln.795", "region": "Malnad Highlands", "cycle": "Perennial", "water": "Moderate", "yield": "800kg/acre", "image": "/api/image/coffee.png", "suitability": {"temperature": "15-24°C", "pH": "6.0-6.5", "elevation": "1000-1500m", "rainfall": "1500-2500mm"}},
        {"id": 4, "name": "Sugarcane", "scientific": "Saccharum officinarum", "variety": "Co-86032", "region": "Mandya Belt", "cycle": "12 Months", "water": "Very High", "yield": "40t/acre", "image": "/api/image/sugarcane.png", "suitability": {"temperature": "20-35°C", "pH": "6.5-7.5", "elevation": "<1000m", "rainfall": "1500-2500mm"}},
        {"id": 5, "name": "Tomato", "scientific": "Solanum lycopersicum", "variety": "Arka Rakshak", "region": "Kolar", "cycle": "135 Days", "water": "Moderate", "yield": "25-30t/acre", "image": "/api/image/tomato.png", "suitability": {"temperature": "20-25°C", "pH": "6.0-7.0", "elevation": "500-1500m", "rainfall": "600-1500mm"}},
        {"id": 6, "name": "Potato", "scientific": "Solanum tuberosum", "variety": "Kufri Jyoti", "region": "Hassan", "cycle": "90 Days", "water": "Moderate", "yield": "20t/acre", "image": "/api/image/potato.png", "suitability": {"temperature": "15-25°C", "pH": "5.0-6.5", "elevation": "800-2500m", "rainfall": "Low during maturity"}},
        {"id": 7, "name": "Maize", "scientific": "Zea mays", "variety": "Ganga Kaveri", "region": "Davangere", "cycle": "110 Days", "water": "Moderate", "yield": "30q/acre", "image": "/api/image/maize.png", "suitability": {"temperature": "21-30°C", "pH": "5.5-7.0", "elevation": "Up to 3000m", "rainfall": "500-750mm"}},
        {"id": 8, "name": "Capsicum", "scientific": "Capsicum annuum", "variety": "Indra", "region": "Chikballapur", "cycle": "150 Days", "water": "High", "yield": "40t/acre", "image": "/api/image/capsicum.png", "suitability": {"temperature": "18-25°C", "pH": "6.0-6.5", "elevation": "800-1500m", "rainfall": "Moderate"}},
        {"id": 9, "name": "Soybean", "scientific": "Glycine max", "variety": "JS 335", "region": "Bidar", "cycle": "100 Days", "water": "Moderate", "yield": "12q/acre", "image": "/api/image/soyabean.png", "suitability": {"temperature": "25-30°C", "pH": "6.0-7.0", "elevation": "Up to 2000m", "rainfall": "600-800mm"}},
        {"id": 10, "name": "Grape", "scientific": "Vitis vinifera", "variety": "Thompson Seedless", "region": "Vijayapura", "cycle": "Perennial", "water": "Moderate", "yield": "15t/acre", "image": "/api/image/grape.png", "suitability": {"temperature": "15-40°C", "pH": "6.5-8.0", "elevation": "300-900m", "rainfall": "Low humidity preferred"}},
        {"id": 11, "name": "Orange", "scientific": "Citrus reticulata", "variety": "Coorg Mandarin", "region": "Kodagu", "cycle": "Perennial", "water": "Moderate", "yield": "500 fruits/tree", "image": "/api/image/orange.png", "suitability": {"temperature": "10-35°C", "pH": "5.5-6.5", "elevation": "600-1200m", "rainfall": "1200-2500mm"}},
        {"id": 12, "name": "Apple", "scientific": "Malus domestica", "variety": "Royal Delicious", "region": "Himalayan Region", "cycle": "Perennial", "water": "Moderate", "yield": "10-15t/acre", "image": "/api/image/apple.png", "suitability": {"temperature": "Chilling requirement", "pH": "6.0-6.8", "elevation": "1500-2700m", "rainfall": "1000-1200mm"}}
    ]

@intel_bp.route("/crops", methods=["GET"])
def get_crops():
    weather = WeatherDiseaseRiskCalculator.get_simulated_weather()
    current_month = datetime.now().month
    is_monsoon = current_month in [6, 7, 8, 9]
    is_summer = current_month in [3, 4, 5]
    crops = _get_static_crop_data()
    return jsonify({
        "crops": crops,
        "season": "Monsoon" if is_monsoon else "Summer" if is_summer else "Winter",
        "weather": weather, "timestamp": datetime.now().isoformat()
    })

@intel_bp.route("/crops/<int:crop_id>", methods=["GET"])
def get_crop_detail(crop_id):
    crops_data = _get_static_crop_data()
    crop = next((c for c in crops_data if c["id"] == crop_id), None)
    if not crop:
        return jsonify({"error": "Crop not found"}), 404
    
    crop_name = crop["name"]
    msp_data = get_msp_for_crop(crop_name)
    if msp_data:
        crop["msp"] = msp_data["msp"]
        crop["msp_source"] = msp_data.get("source", "Live Government API")
        crop["msp_updated"] = msp_data.get("date")
    
    weather = WeatherDiseaseRiskCalculator.get_simulated_weather()
    disease_risk_data = get_crop_disease_risks(crop_name)
    crop["diseases"] = disease_risk_data["diseases"]
    crop["weather_context"] = weather
    
    cultivation = CultivationAdvisor.get_current_cultivation_stage(crop_name)
    if cultivation.get("status") != "Off-season":
        crop["cultivation_stage"] = cultivation["current_stage"]
        crop["cultivation_season"] = cultivation["season"]
        crop["stage_days_remaining"] = cultivation["days_remaining"]
        crop["immediate_operations"] = cultivation["operations"]
    
    crop["detailed_advisory"] = CultivationAdvisor.get_weather_based_recommendations(crop_name, weather)
    crop["weather"] = weather
    return jsonify(crop)

@intel_bp.route("/market-data", methods=["POST"])
def market_data():
    from app import call_llm
    data = request.json or {}
    crop = data.get("crop", "Paddy")
    region = data.get("region", "Karnataka")
    msp_data = get_msp_for_crop(crop)
    if not msp_data:
        return jsonify({"error": f"MSP data not available for {crop}"}), 400
        
    price_history = MSPFetcher.get_price_history(crop, days=180)
    current_month = datetime.now().month
    supply_index = MSPFetcher._get_seasonal_multiplier(crop, current_month) * 100
    
    trend = "Stable"
    trend_change = 0
    if price_history and len(price_history) >= 2:
        latest_price = price_history[-1]["price"]
        previous_price = price_history[-5] if len(price_history) > 5 else price_history[0]
        trend_change = ((latest_price - previous_price["price"]) / previous_price["price"]) * 100
        trend = "Bullish" if trend_change > 2 else "Bearish" if trend_change < -2 else "Stable"
    
    forecast_percent = trend_change * 2.5
    prompt = f"""
    You are an agricultural market analyst. Provide a brief market analysis for {crop} in {region}.
    Focus on Karnataka APMC mandis (Hubli, Davanagere, Belagavi, Bangalore).
    Current MSP: {msp_data['msp']}
    Current trend: {trend} ({trend_change:+.1f}% change)
    Provide a concise 3-4 sentence analysis covering:
    1. Current market sentiment
    2. Key factors affecting prices
    3. Short-term outlook based on current data
    """
    try:
        api_key = request.headers.get('X-Api-Key')
        result_text = call_llm(prompt)
        return jsonify({
            "analysis": result_text, "crop": crop, "region": region,
            "msp_data": msp_data,
            "kpis": {
                "msp": msp_data["msp"], "supply_index": round(min(100, supply_index), 1),
                "trend": trend, "trend_percent": f"{trend_change:+.1f}%",
                "forecast_percent": f"{forecast_percent:+.1f}%"
            },
            "price_history": price_history
        })
    except Exception as e:
        logger.error(f"Market analysis error: {e}")
        return jsonify({"error": "Failed to fetch AI analysis"}), 500

@intel_bp.route("/crop-analyzer", methods=["POST"])
def crop_analyzer():
    try:
        data = request.get_json() or {}
        crop = data.get("crop", "").strip()
        city = data.get("city", "").strip()
        N = data.get("N"); P = data.get("P"); K = data.get("K"); ph = data.get("ph")
        if not crop or not city:
            return jsonify({"error": "Crop name and city required"}), 400

        crop_db = {"Paddy":"rice","Ragi":"ragi","Coffee":"coffee","Sugarcane":"sugarcane",
                   "Tomato":"tomato","Potato":"potato","Maize":"maize","Capsicum":"capsicum",
                   "Soybean":"soybean","Grape":"grape","Orange":"orange","Apple":"apple"}

        pred = {}
        if N and P and ph:
            try:
                pred_data = {"city": city, "N": float(N), "P": float(P), "K": float(K or 0), "ph": float(ph)}
                pred = handle_prediction(pred_data)
            except Exception as e:
                logger.error(f"Prediction error in analyzer: {e}")

        weather = WeatherDiseaseRiskCalculator.get_simulated_weather()
        coords = get_coordinates(city)
        if isinstance(coords, (list, tuple)) and len(coords) == 2:
            lat, lon = coords
            from app import _fetch_open_meteo_raw
            open_meteo = _fetch_open_meteo_raw(lat, lon)
            if open_meteo:
                c = open_meteo.get("current", {})
                weather.update({"temperature_celsius": c.get("temperature_2m"),
                              "humidity_percent": c.get("relative_humidity_2m"),
                              "rainfall_mm": c.get("precipitation", 0)})

        crop_lower = crop_db.get(crop, crop.lower())
        from services.weather_disease_risk import calculate_disease_risk
        diseases = calculate_disease_risk(crop_lower, {
            "temperature": weather["temperature_celsius"],
            "humidity": weather["humidity_percent"],
            "rainfall": weather["rainfall_mm"]
        })
        eco = estimate_economics(crop_lower, pred.get("yield", 2.0), 1.0) if pred else estimate_economics(crop_lower, 2.0, 1.0)
        cal = generate_calendar(crop_lower, city)
        return jsonify({
            "crop": crop, "city": city,
            "weather": weather,
            "prediction": pred,
            "diseases": diseases[:8],
            "economics": eco,
            "calendar": cal[:8]
        })
    except Exception as e:
        logger.error(f"Crop analyzer error: {e}")
        return jsonify({"error": str(e)}), 500

@intel_bp.route("/location-suggestions", methods=["POST"])
@track_llm_call("crop_suggestions")
def get_crop_location_suggestions():
    from app import call_llm
    data = request.json or {}
    location = data.get("location", "Unknown Location")
    weather = data.get("weather", {})
    soil = data.get("soil", {})
    
    prompt = f"""
    You are an expert agronomist. Given the following location and environmental data:
    Location: {location}
    Weather: {weather}
    Soil: {soil}
    
    Provide dynamic crop suggestions:
    1. Identify the top 3 MOST PLANTED (commonly grown) crops in this exact region/district, including their typical cycle (in days) and a brief reason.
    2. Suggest the top 3 BEST alternative/high-value crops that would thrive here right now based on the weather and soil data, including their typical cycle (in days) and a brief reason.
    
    Return ONLY a valid JSON object matching this exact schema:
    {{
      "most_planted_crops": [
        {{ "name": "Crop Name", "scientific": "Scientific Name", "duration_days": 120, "reason": "Reason for common cultivation in this district" }}
      ],
      "alternative_crops": [
        {{ "name": "Crop Name", "scientific": "Scientific Name", "duration_days": 90, "reason": "Reason alternative crop is high value and fits current weather/soil" }}
      ]
    }}
    """
    try:
        response = call_llm(prompt=prompt, system_prompt="Output ONLY valid JSON.", json_mode=True)
        return jsonify(json.loads(response))
    except Exception as e:
        logger.error(f"Crop suggestions error: {e}")
        return jsonify({"error": "Failed to fetch AI suggestions"}), 500

@intel_bp.route("/market/forecast", methods=["GET"])
def market_forecast():
    from services.market_forecast import forecast_price
    crop = request.args.get("crop", "Paddy")
    days = int(request.args.get("days", 90))
    try:
        result = forecast_price(crop, days)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Market forecast error: {e}")
        return jsonify({"error": "Forecast unavailable"}), 500

@intel_bp.route("/market/ai-insights", methods=["POST"])
@track_llm_call("market_insights")
def market_ai_insights():
    from app import call_llm
    data = request.json or {}
    crop = data.get("crop", "Paddy")
    location = data.get("location", "Karnataka")
    lat = data.get("lat")
    lon = data.get("lon")
    
    prompt = f"""
    You are an expert Agricultural Market Analyst. 
    Analyze the market for {crop} in {location}.
    
    Consider nearby mandis, current season, and potential transport costs.
    Provide actionable advice for the farmer.
    
    Return ONLY valid JSON with:
    {{
      "msp": "₹...",
      "best_market": "Name of APMC Mandi",
      "nearby_markets": [
        {{"name": "...", "distance_km": 15, "current_price_per_quintal": 2300, "transportation_cost_per_quintal": 50, "commission_percent": 2, "commission_amount": 46, "net_price_after_costs": 2204, "transportation_mode": "Mini Truck", "district": "...", "market_type": "APMC"}}
      ],
      "ai_analysis": {{
        "market_recommendation": "...",
        "timing_advice": "...",
        "storage_recommendation": "...",
        "price_factors": ["factor 1", "factor 2"]
      }},
      "data_sources": "Real-time MSP + Regional Market Analysis"
    }}
    """
    try:
        api_key = request.headers.get('X-Api-Key')
        response = call_llm(prompt, system_prompt="Output ONLY valid JSON.", json_mode=True)
        return jsonify(json.loads(response))
    except Exception as e:
        logger.error(f"Market insights error: {e}")
        return jsonify({"error": "AI insights unavailable"}), 500

@intel_bp.route("/diagnostics/location", methods=["POST"])
def diagnostics_location():
    from services.land_analysis_service import analyze_land
    from app import _fetch_open_meteo_raw
    from services.weather_disease_calculator import WeatherDiseaseRiskCalculator
    
    data = request.json or {}
    city = data.get("city")
    lat = data.get("lat")
    lon = data.get("lon")
    
    if city and not lat:
        coords = get_coordinates(city)
        if isinstance(coords, dict) and "error" in coords:
            return jsonify(coords), 404
        lat, lon = coords
    
    if not lat or not lon:
        return jsonify({"error": "City or coordinates required"}), 400
        
    try:
        raw_weather = _fetch_open_meteo_raw(lat, lon)
        weather_sim = WeatherDiseaseRiskCalculator.get_simulated_weather() # Fallback info
        
        # We'll use dummy NPK/pH if not provided by user yet
        report = analyze_land(lat, lon, city or f"({lat}, {lon})", 
                              data.get("N", 60), data.get("P", 30), data.get("K", 30), data.get("ph", 6.5),
                              weather_sim, raw_weather)
        return jsonify(report)
    except Exception as e:
        logger.error(f"Diagnostics location error: {e}")
        return jsonify({"error": str(e)}), 500

@intel_bp.route("/cities", methods=["GET"])
def search_cities_route():
    from api.geocode_api import search_cities, get_coordinates
    from app import call_llm
    q = request.args.get("q", "")
    if len(q) < 2:
        return jsonify({"cities": []})
    
    results = search_cities(q)
    
    # AI Correction Fallback: If no results, ask LLM "Did you mean?"
    if not results and len(q) > 3:
        try:
            prompt = f"The user searched for the Indian city/place: '{q}'. It might be misspelled or a local name. What is the most likely official city name in India? Return ONLY the name."
            corrected_name = call_llm(prompt, max_tokens=20).strip().replace(".", "")
            if corrected_name and corrected_name.lower() != q.lower():
                results = search_cities(corrected_name)
                # Mark as corrected
                for r in results:
                    r["is_corrected"] = True
                    r["original_query"] = q
        except Exception:
            pass
            
    return jsonify({"cities": results})


@intel_bp.route("/land/ai-insights", methods=["POST"])
@track_llm_call("land_insights")
def land_ai_insights():
    from app import call_llm
    from services.rag_service import RAGService
    rag = RAGService()
    
    data = request.json or {}
    location = data.get('location', {})
    # Handle case where location is passed as a string instead of object
    if isinstance(location, str):
        location = {'city': location}
    city = location.get('city', 'Unknown')
    soil = data.get('soil', {})
    weather = data.get('weather', {})
    crops = data.get('crops', [])
    
    # Use RAG to get specialized knowledge for the suggested crops and location
    rag_query = f"Agronomic advice for {', '.join(crops)} in {city}. Soil: {soil.get('soil_type')}, pH: {soil.get('ph')}. Weather: {weather.get('status')}."
    try:
        rag_context = rag.augment_prompt(rag_query)
    except:
        rag_context = "No specific ICAR data found."
        
    prompt = f"""
    You are an expert Agronomist and Land Strategist for KrishiSync.
    Analyze the following land data and provide strategic advice based on scientific research.
    
    ENVIRONMENTAL DATA:
    - Location: {city} (Lat: {location.get('lat')}, Lon: {location.get('lon')})
    - Soil Profile: {soil}
    - Weather Summary: {weather}
    - Topography: {data.get('topography')}
    - Pre-Scored Crops: {crops}
    
    SCIENTIFIC RESEARCH (RAG):
    {rag_context[:3000]}
    
    Provide a professional analysis in JSON format with the following fields:
    1. 'summary': A technical assessment of why this land is suitable/unsuitable for the suggested crops.
    2. 'risks': Specific climatic or soil risks (e.g. salinity, drainage, impending rain).
    3. 'advice': Scientific steps to improve yield (fertilizer timing, soil amendments).
    4. 'market_strategy': Strategic advice on which crop will yield the best financial return.
    5. 'expert_summary': Brief 2-sentence expert overview of this location's agricultural potential.
    6. 'soil_health_assessment': Scientific assessment of soil health and organic matter.
    7. 'improvement_actions': List of 3-5 objects with {{"action": "...", "benefit": "...", "priority": "High/Medium/Low"}}
    8. 'seasonal_advice': {{"current_season": "advice for now", "next_season": "advice for next season"}}
    9. 'risk_warnings': List of 2-4 specific risk strings for this location.
    10. 'profit_tip': A single actionable profit-maximizing tip.
    11. 'additional_crops': List of 3-5 crops NOT in the pre-scored list but suitable for this land, each with {{"name": "...", "scientific": "...", "reason": "...", "estimated_profit": "High/Medium/Low"}}
    
    Return ONLY valid JSON.
    """
    try:
        api_key = request.headers.get('X-Api-Key')
        response = call_llm(prompt, system_prompt="Output ONLY valid JSON.", json_mode=True)
        return jsonify(json.loads(response))
    except Exception as e:
        logger.error(f"Land AI insights error: {e}")
        return jsonify({"error": "AI insights unavailable"}), 500


@intel_bp.route("/crops/add-custom", methods=["POST"])
@track_llm_call("add_custom_crop")
def add_custom_crop():
    from app import call_llm
    from core.database import save_custom_crop
    import json
    data = request.json or {}
    crop_name = data.get("name")
    
    if not crop_name:
        return jsonify({"error": "Crop name required"}), 400
        
    prompt = f"""
    You are a Senior Agronomist and Data Scientist.
    Generate a comprehensive JSON profile for the crop: '{crop_name}'.
    The profile must exactly match the scientific schema used by KrishiSync.
    
    REQUIRED FIELDS:
    - name, scientific, variety, msp (current in INR), avgYield (per acre), duration (days)
    - waterReq (High/Low/Mod), irrigationType, idealSoil, idealPh, tempRange, humiditySuit, rainfallReq
    - regions (in India), multipleCropping (Possible/Not), season, sowMonths, harvestMonths
    - classification (Kharif/Rabi/etc), multiCycle (true/false), image (set to default placeholder)
    - suitability: {{ temperature, pH, elevation, rainfall }}
    - lifecycle: A list of 5-8 stages (Nursery, Sowing, Vegetative, Flowering, Harvesting etc) 
      Each stage needs: {{ stage, duration, nutrient, irrigation, disease, actions }}
    - diseaseRules: A list of 3-5 major diseases.
      Each rule needs: {{ disease, humidity, tempMin, tempMax, rainfallMin, stageRisk, severity, prevention, action }}
    
    Ensure all values are scientific, research-backed (e.g. from ICAR), and culturally relevant to India.
    Output ONLY valid JSON.
    """
    
    try:
        api_key = request.headers.get('X-Api-Key')
        response = call_llm(prompt, system_prompt="Output ONLY valid JSON.", json_mode=True, use_rag=True)
        crop_data = json.loads(response)
        crop_data["name"] = crop_name
        cid = save_custom_crop(crop_name, crop_data)
        return jsonify({"success": True, "crop_id": cid, "crop": crop_data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@intel_bp.route("/crops/custom", methods=["GET"])
def get_custom_crops_route():
    from core.database import get_custom_crops
    crops = get_custom_crops()
    return jsonify({"crops": crops})
