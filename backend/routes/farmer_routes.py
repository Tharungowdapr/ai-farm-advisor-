from flask import Blueprint, request, jsonify
from core.database import get_user_farms, create_farm, get_or_create_user, get_farm_logs
from services.weather_disease_calculator import WeatherDiseaseRiskCalculator
from services.yield_prediction import YieldPredictor
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
farmer_bp = Blueprint('farmer', __name__)

@farmer_bp.route("/user/farms", methods=["GET"])
def api_user_farms():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id required"}), 400
    farms = get_user_farms(user_id)
    return jsonify({"success": True, "farms": farms})

@farmer_bp.route("/farms/create", methods=["POST"])
def create_new_farm():
    data = request.json or {}
    user_id = data.get("user_id", "default_user")
    crop_name = data.get("crop_name", "Paddy")
    variety = data.get("variety", "Standard")
    planting_date = data.get("planting_date", datetime.now().strftime("%Y-%m-%d"))
    soil_type = data.get("soil_type", "Loamy")
    area_acres = float(data.get("area_acres", 1.0))
    farm_id = create_farm(user_id, crop_name, variety, planting_date, soil_type, area_acres)
    return jsonify({"success": True, "farm_id": farm_id, "message": "Farm created successfully"})

@farmer_bp.route("/farms/<farm_id>/daily-plan", methods=["GET"])
def get_daily_plan(farm_id):
    user_id = request.args.get("user_id", "default_user")
    farms = get_user_farms(user_id)
    farm = next((f for f in farms if f["id"] == farm_id), None)
    if not farm:
        return jsonify({"success": False, "error": "Farm not found"}), 404
    
    planting_date = datetime.strptime(farm["planting_date"], "%Y-%m-%d")
    dap = (datetime.now() - planting_date).days
    if dap < 0: dap = 0
    
    crop = farm["crop_name"]
    user = get_or_create_user(user_id)
    weather = WeatherDiseaseRiskCalculator.get_simulated_weather()
    weather_context = f"{weather['temperature_celsius']}C, Humidity: {weather['humidity_percent']}%, Rain: {weather['rainfall_mm']}mm"
    
    logs = get_farm_logs(farm_id)
    disease_history = [l for l in logs if l.get("disease_notes") and l["disease_notes"] != "[]"]
    
    yield_pred = YieldPredictor.predict_yield(crop, dap, disease_history, weather_history=[weather])
    
    # Accessing call_llm from current_app or via a shared utility might be better, 
    # but for now we'll rely on the app.py implementation.
    # To keep this clean, we'll import call_llm if possible or define a placeholder.
    from flask import current_app
    
    user_context = f"Name: {user['name']}, Region: {user['region']}, Language: {user['language']}"
    prompt = f"The user is a farmer: {user_context}. The crop is {crop} at {dap} days after planting. The weather is {weather_context}. Give a short, helpful daily cultivation advice."
    
    try:
        # We'll use a local import to avoid circular dependencies if needed
        from app import call_llm
        advice = call_llm(prompt, max_tokens=500)
    except Exception as e:
        logger.error(f"Daily plan AI error: {e}")
        advice = f"Monitor crop health. Weather is {weather_context}."
        
    return jsonify({
        "success": True, 
        "farm": farm, 
        "dap": dap, 
        "yield_prediction": yield_pred, 
        "ai_advisory": advice, 
        "weather": weather
    })
