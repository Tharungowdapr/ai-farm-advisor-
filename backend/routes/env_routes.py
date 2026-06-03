from flask import Blueprint, request, jsonify, send_from_directory, current_app
from pathlib import Path
import os
import logging
import json
from api.geocode_api import get_coordinates
from services.soil_service import get_soil_summary
from services.local_inference_service import LocalInferenceService

logger = logging.getLogger(__name__)
env_bp = Blueprint('environment', __name__)

IMAGES_DIR = Path(__file__).parent.parent / "images"

@env_bp.route("/geocode", methods=["POST", "GET"])
def geocode():
    if request.method == "POST":
        data = request.get_json() or {}
        city = data.get("city")
    else:
        city = request.args.get("city")
        lat = request.args.get("lat", type=float)
        lon = request.args.get("lon", type=float)
        if lat and lon:
            # Simple reverse geocode placeholder or use a service
            return jsonify({"display": f"Location ({lat}, {lon})", "city": "Detected City"})

    coords = get_coordinates(city)
    if not coords or coords == (None, None):
        return jsonify({"error": "City not found"}), 404
    lat, lon = coords
    return jsonify({"lat": lat, "lon": lon, "display": city, "city": city})

@env_bp.route("/weather", methods=["GET"])
def api_env_weather():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    from app import _fetch_open_meteo_raw
    raw = _fetch_open_meteo_raw(lat, lon)
    if raw and "current" in raw:
        c = raw["current"]
        return jsonify({
            "temperature": c.get("temperature_2m"),
            "humidity": c.get("relative_humidity_2m"),
            "rainfall": c.get("precipitation", 0),
            "wind_speed": c.get("wind_speed_10m")
        })
    return jsonify({"error": "Weather data unavailable"}), 500

@env_bp.route("/soilgrids", methods=["GET"])
def api_env_soilgrids():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    try:
        summary = get_soil_summary(lat, lon)
        return jsonify(summary)
    except Exception as e:
        logger.error(f"SoilGrids error: {e}")
        return jsonify({"error": str(e)}), 500

@env_bp.route("/forecast", methods=["GET"])
def api_env_forecast():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    from app import _fetch_open_meteo_raw
    raw = _fetch_open_meteo_raw(lat, lon)
    forecast = []
    if raw and "daily" in raw:
        d = raw["daily"]
        for i in range(len(d.get("time", []))):
            forecast.append({
                "date": d["time"][i],
                "temp": d["temperature_2m_max"][i],
                "temp_min": d["temperature_2m_min"][i],
                "rainfall_total": d["precipitation_sum"][i],
                "condition": "Rain" if d["precipitation_sum"][i] > 0 else "Clear"
            })
    return jsonify({"forecast": forecast})

@env_bp.route("/image/<filename>", methods=["GET"])
def serve_image(filename):
    return send_from_directory(IMAGES_DIR, filename)

@env_bp.route("/analyze-image", methods=["POST"])
def analyze_image():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400
    file = request.files["image"]
    temp_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file.filename)
    try:
        file.save(temp_path)
        detection = LocalInferenceService.predict(temp_path)
        os.remove(temp_path)
        
        from app import call_llm
        prompt = f"Analyze disease: {detection['disease']} on {detection['crop']}. Confidence: {detection['confidence']}%. Provide JSON treatment report."
        response = call_llm(prompt, json_mode=True)
        return jsonify(json.loads(response))
    except Exception as e:
        logger.error(f"Image analysis error: {e}")
        return jsonify({"error": str(e)}), 500
