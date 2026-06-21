import os
import sys
import io

# Force UTF-8 encoding for Windows terminals to prevent emoji crashes
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import json
import logging
import base64
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime

try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

from msp_fetcher import MSPFetcher, get_msp_for_crop
from weather_disease_risk import WeatherDiseaseRiskCalculator, get_crop_disease_risks
from cultivation_advisor import CultivationAdvisor, get_cultivation_advisory

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from controllers.prediction_controller import handle_prediction
from api.geocode_api import get_coordinates
from services.calendar_service import generate_calendar
from services.economics_service import estimate_economics
from services.rag_service import RAGService
from services.llm_service import LLMService
from routes.main_routes import main_bp
from routes.prediction_routes import prediction_bp
from agents.supervisor_agent import run_agent_pipeline
from services.land_analysis_service import analyze_land
from services.market_forecast import forecast_price, forecast_all
from services.soil_service import get_soil_summary

from admin_routes import admin_bp
from vendor_routes import vendor_bp
from yield_prediction import YieldPredictor

SETTINGS_DIR = Path(os.getenv("SETTINGS_DIR", Path(__file__).parent / "settings"))
SETTINGS_DIR.mkdir(exist_ok=True)
SETTINGS_FILE = SETTINGS_DIR / "user_settings.json"

def _get_cipher():
    secret = os.getenv("SECRET_KEY") or os.urandom(32).hex()
    key_bytes = secret.encode() if len(secret.encode()) >= 32 else secret.encode().ljust(32, b'x')[:32]
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=b'kv_salt_2024', iterations=100000)
    fernet_key = base64.urlsafe_b64encode(kdf.derive(key_bytes))
    return Fernet(fernet_key)

def encrypt_value(plaintext):
    if not CRYPTO_AVAILABLE or not plaintext:
        return plaintext
    try:
        return _get_cipher().encrypt(plaintext.encode()).decode()
    except Exception:
        return plaintext

def decrypt_value(ciphertext):
    if not CRYPTO_AVAILABLE or not ciphertext:
        return ciphertext
    try:
        return _get_cipher().decrypt(ciphertext.encode()).decode()
    except Exception:
        return ciphertext

DEFAULT_SETTINGS = {
    "language": "EN",
    "crop_cluster": "All Karnataka",
    "notifications": True,
    "price_alerts": True,
    "theme": "light",
    "region": "Karnataka",
    "unit_preference": "metric",
    "crop_favorites": [],
    "api_key": "",
    "provider": "openrouter",
    "llm_model": "openai/gpt-4o-mini",
    "last_updated": None
}

from database import (
    get_or_create_user, create_farm, get_user_farms, log_daily_activity, get_farm_logs,
    create_user, login_user, get_user, update_user, generate_token,
    create_chat_session, get_chat_sessions, get_chat_session, update_chat_session_title,
    touch_chat_session, delete_chat_session,
    add_chat_message, get_chat_messages,
    save_land_analysis, get_land_analyses, get_land_analysis, delete_land_analysis
)

TOKENS = {}

app = Flask(__name__)
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# ── MLOps Monitoring ─────────────────────────────────────────
from monitoring import setup_monitoring, metrics, track_llm_call
setup_monitoring(app)
logger.info("MLOps monitoring initialized")

UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", os.path.join(os.getcwd(), 'uploads'))
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

llm = LLMService()
rag = RAGService()

logger.info("RAG service initialized (will index on first query)")

def call_llm(prompt, system_prompt=None, json_mode=False, max_tokens=1500, use_rag=False):
    if use_rag:
        prompt = rag.augment_prompt(prompt)
    return llm.call(prompt=prompt, system_prompt=system_prompt, json_mode=json_mode, max_tokens=max_tokens)

def load_settings():
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                return {**DEFAULT_SETTINGS, **json.load(f)}
    except Exception as e:
        logger.error(f"Error loading settings: {str(e)}")
    return DEFAULT_SETTINGS.copy()

def save_settings(settings):
    try:
        settings_to_save = {k: v for k, v in settings.items() if k != 'last_updated'}
        if settings_to_save.get("api_key"):
            settings_to_save["api_key"] = encrypt_value(settings_to_save["api_key"])
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings_to_save, f, indent=2)
        logger.info("Settings saved successfully")
        return True
    except Exception as e:
        logger.error(f"Error saving settings: {str(e)}")
        return False

VANI_SYSTEM_PROMPT = """
You are Vani AI, a wise, patient, and scientifically accurate agricultural advisor from 
the University of Agricultural Sciences, Dharwad. 
Linguistic Style: Professional yet warm. Able to switch seamlessly between technical 
botanical terms and simple farmer-friendly metaphors.
Context: Provide situated advice based on Karnataka's agricultural landscape.
Always respond as Vani AI.
"""

IMAGES_DIR = Path(__file__).parent / "images"

@app.route("/api/image/<filename>", methods=["GET"])
def serve_image(filename):
    try:
        return send_from_directory(IMAGES_DIR, filename)
    except Exception as e:
        return jsonify({"error": f"Image not found: {str(e)}"}), 404

from local_inference_service import LocalInferenceService

@app.route("/api/analyze-image", methods=["POST"])
def analyze_image():
    if "image" not in request.files:
        return jsonify({"error": "Visual Uplink Failed: No Image"}), 400
    file = request.files["image"]
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    temp_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    try:
        file.save(temp_path)
        detection_result = LocalInferenceService.predict(temp_path)
        detected_disease = detection_result["disease"]
        detected_crop = detection_result["crop"]
        confidence = detection_result["confidence"]
        logger.info(f"Local ViT Detected: {detected_disease} on {detected_crop} ({confidence:.2f}%)")
        prompt = f"""
        You are an expert plant pathologist. 
        A local AI model has detected "{detected_disease}" on "{detected_crop}" with {confidence:.1f}% confidence.
        Task: Provide a detailed treatment and impact report for this specific disease.
        Return a STRICT JSON object using exactly these keys:
        {{
            "disease_name": "{detected_disease}",
            "scientific_name": "Latin Name of {detected_disease}",
            "confidence_score": {confidence},
            "symptoms": ["Common symptom 1", "Common symptom 2", "Distinctive sign"],
            "biological_triggers": "What causes this disease (fungus/bacteria/virus details)?",
            "remedial_chemical": ["Effective chemical fungicide/brand names"],
            "remedial_organic": ["Organic home remedy 1", "Bio-control agent"],
            "economic_impact_inr": "Estimated yield loss description and approx INR value per acre"
        }}
        """
        response_text = call_llm(prompt, json_mode=True, use_rag=True)
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if response_text.startswith("```json"):
            response_text = response_text[7:-3].strip()
        elif response_text.startswith("```"):
            response_text = response_text[3:-3].strip()
        return jsonify(json.loads(response_text))
    except Exception as e:
        logger.error(f"HYBRID SCAN FAILED: {str(e)}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": str(e)}), 500

@app.route("/api/market-data", methods=["POST"])
def market_data():
    data = request.json or {}
    crop = data.get("crop", "Paddy")
    region = data.get("region", "Karnataka")
    msp_data = get_msp_for_crop(crop)
    if not msp_data:
        return jsonify({"error": f"MSP data not available for {crop}"}), 400
    price_history = MSPFetcher.get_price_history(crop, days=180)
    current_month = datetime.now().month
    supply_index = MSPFetcher._get_seasonal_multiplier(crop, current_month) * 100
    if len(price_history) >= 2:
        latest_price = price_history[-1]["price"]
        previous_price = price_history[-5]["price"] if len(price_history) > 5 else price_history[0]["price"]
        trend_change = ((latest_price - previous_price) / previous_price) * 100
        if trend_change > 2:
            trend = "Bullish"
        elif trend_change < -2:
            trend = "Bearish"
        else:
            trend = "Stable"
    else:
        trend = "Stable"
        trend_change = 0
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
    Be specific and actionable. Reference the live data provided.
    """
    try:
        result_text = call_llm(prompt)
        return jsonify({
            "analysis": result_text, "sources": [], "crop": crop, "region": region,
            "msp_data": msp_data,
            "kpis": {
                "msp": msp_data["msp"], "supply_index": round(min(100, supply_index), 1),
                "trend": trend, "trend_percent": f"{trend_change:+.1f}%",
                "forecast_percent": f"{forecast_percent:+.1f}%"
            },
            "price_history": price_history, "timestamp": datetime.now().isoformat(), "live_updated": True
        })
    except Exception as e:
        logger.error(f"Error in market_data: {str(e)}", exc_info=True)
        return jsonify({
            "analysis": f"Market analysis for {crop}: Current MSP is {msp_data['msp']}.",
            "sources": [], "crop": crop, "region": region, "msp_data": msp_data,
            "kpis": { "msp": msp_data["msp"], "supply_index": 85, "trend": "Stable", "trend_percent": "0%", "forecast_percent": "0%" },
            "price_history": price_history if price_history else [], "timestamp": datetime.now().isoformat(), "note": "Using cached MSP data due to API error"
        }), 200



@app.route("/api/text-to-speech", methods=["POST"])
def text_to_speech():
    data = request.json or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    return jsonify({"success": True, "text": text, "message": "Ready to play audio"})

@app.route("/api/crops", methods=["GET"])
def get_crops():
    weather = WeatherDiseaseRiskCalculator.get_simulated_weather()
    current_month = datetime.now().month
    is_monsoon = current_month in [6, 7, 8, 9]
    is_summer = current_month in [3, 4, 5]
    crops = _get_static_crop_data()
    return jsonify({
        "crops": crops,
        "season": "Monsoon" if is_monsoon else "Summer" if is_summer else "Winter",
        "weather": weather, "timestamp": datetime.now().isoformat(), "data_integration": "Lite - Detail on Demand"
    })

@app.route("/api/crops/<int:crop_id>", methods=["GET"])
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
    else:
        crop["cultivation_status"] = "Off-season"
        crop["next_season_advisory"] = "Plan for next suitable season"
    crop["detailed_advisory"] = CultivationAdvisor.get_weather_based_recommendations(crop["name"], weather)
    crop["weather"] = weather
    crop["timestamp"] = datetime.now().isoformat()
    return jsonify(crop)

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

@app.route("/api/settings", methods=["GET"])
def get_settings():
    try:
        settings = load_settings()
        has_api_key = bool(settings.get("api_key", ""))
        settings.pop("api_key", None)
        settings["has_api_key"] = has_api_key

        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user_id = TOKENS.get(token)
        if user_id:
            user = get_user(user_id)
            if user:
                settings["language"] = user.get("language", settings.get("language"))
                settings["crop_cluster"] = user.get("state", settings.get("crop_cluster"))
                try:
                    prefs = json.loads(user.get("preferences") or "{}")
                    settings["notifications"] = prefs.get("notifications", settings.get("notifications"))
                    settings["price_alerts"] = prefs.get("price_alerts", settings.get("price_alerts"))
                except Exception:
                    pass

        settings["last_updated"] = datetime.now().isoformat()
        return jsonify({"success": True, "settings": settings, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/settings", methods=["POST"])
def update_settings():
    try:
        current_settings = load_settings()
        new_settings = request.json or {}
        validated_settings = {**current_settings, **new_settings}
        if "api_key" not in new_settings:
            validated_settings["api_key"] = current_settings.get("api_key", "")
        provider = validated_settings.get("provider", current_settings.get("provider", "openrouter"))
        if provider not in ("openrouter", "groq"):
            provider = "openrouter"

        validated_settings = {
            "language": validated_settings.get("language", "EN"),
            "crop_cluster": validated_settings.get("crop_cluster", "All Karnataka"),
            "notifications": validated_settings.get("notifications", True),
            "price_alerts": validated_settings.get("price_alerts", True),
            "theme": validated_settings.get("theme", "light"),
            "region": validated_settings.get("region", "Karnataka"),
            "unit_preference": validated_settings.get("unit_preference", "metric"),
            "crop_favorites": validated_settings.get("crop_favorites", []),
            "api_key": validated_settings.get("api_key", ""),
            "provider": provider,
            "llm_model": validated_settings.get("llm_model", current_settings.get("llm_model", "openai/gpt-4o-mini"))
        }
        if not isinstance(validated_settings.get("notifications"), bool):
            validated_settings["notifications"] = True
        if not isinstance(validated_settings.get("price_alerts"), bool):
            validated_settings["price_alerts"] = True
        valid_languages = ["EN", "KN", "TE", "TA", "HI"]
        if validated_settings["language"] not in valid_languages:
            validated_settings["language"] = "EN"
        valid_clusters = ["All Karnataka", "North Karnataka", "South Karnataka", "Coastal Karnataka", "Malnad"]
        if validated_settings["crop_cluster"] not in valid_clusters:
            validated_settings["crop_cluster"] = "All Karnataka"

        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user_id = TOKENS.get(token)
        if user_id:
            user = get_user(user_id)
            if user:
                try:
                    prefs = json.loads(user.get("preferences") or "{}")
                except Exception:
                    prefs = {}
                prefs["notifications"] = validated_settings["notifications"]
                prefs["price_alerts"] = validated_settings["price_alerts"]
                
                update_user(user_id, 
                    language=validated_settings["language"], 
                    state=validated_settings["crop_cluster"],
                    preferences=json.dumps(prefs)
                )

        success = save_settings(validated_settings)
        if success:
            llm.refresh_key()
            resp_settings = {k: v for k, v in validated_settings.items() if k != "api_key"}
            resp_settings["last_updated"] = datetime.now().isoformat()
            return jsonify({"success": True, "message": "Settings updated successfully", "settings": resp_settings, "timestamp": datetime.now().isoformat()})
        else:
            return jsonify({"success": False, "error": "Failed to save settings"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/settings/api-key", methods=["POST"])
def update_api_key():
    try:
        data = request.json or {}
        api_key = data.get("api_key", "").strip()
        if not api_key:
            return jsonify({"success": False, "error": "API key is required"}), 400
        settings = load_settings()
        settings["api_key"] = api_key
        if save_settings(settings):
            llm.refresh_key()
            return jsonify({"success": True, "message": "API key saved successfully", "timestamp": datetime.now().isoformat()})
        return jsonify({"success": False, "error": "Failed to save API key"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/settings/language", methods=["POST"])
def update_language():
    try:
        data = request.json or {}
        language = data.get("language", "EN")
        valid_languages = ["EN", "KN", "TE", "TA", "HI"]
        if language not in valid_languages:
            return jsonify({"success": False, "error": f"Invalid language. Must be one of: {valid_languages}"}), 400
        settings = load_settings()
        settings["language"] = language
        if save_settings(settings):
            return jsonify({"success": True, "message": f"Language updated to {language}", "language": language, "timestamp": datetime.now().isoformat()})
        return jsonify({"success": False, "error": "Failed to update language"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/settings/region", methods=["POST"])
def update_region():
    try:
        data = request.json or {}
        crop_cluster = data.get("crop_cluster", "All Karnataka")
        valid_clusters = ["All Karnataka", "North Karnataka", "South Karnataka", "Coastal Karnataka", "Malnad"]
        if crop_cluster not in valid_clusters:
            return jsonify({"success": False, "error": f"Invalid region. Must be one of: {valid_clusters}"}), 400
        settings = load_settings()
        settings["crop_cluster"] = crop_cluster
        if save_settings(settings):
            return jsonify({"success": True, "message": f"Region updated to {crop_cluster}", "crop_cluster": crop_cluster, "timestamp": datetime.now().isoformat()})
        return jsonify({"success": False, "error": "Failed to update region"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/settings/notifications", methods=["POST"])
def update_notifications():
    try:
        data = request.json or {}
        notifications = data.get("notifications", True)
        price_alerts = data.get("price_alerts", True)
        settings = load_settings()
        settings["notifications"] = bool(notifications)
        settings["price_alerts"] = bool(price_alerts)
        if save_settings(settings):
            return jsonify({"success": True, "message": "Notification settings updated", "notifications": settings["notifications"], "price_alerts": settings["price_alerts"], "timestamp": datetime.now().isoformat()})
        return jsonify({"success": False, "error": "Failed to update notifications"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/settings/favorites", methods=["POST"])
def update_favorites():
    try:
        data = request.json or {}
        crop_id = data.get("crop_id")
        action = data.get("action", "add")
        if crop_id is None:
            return jsonify({"success": False, "error": "crop_id is required"}), 400
        settings = load_settings()
        favorites = settings.get("crop_favorites", [])
        if action == "add":
            if crop_id not in favorites:
                favorites.append(crop_id)
        elif action == "remove":
            if crop_id in favorites:
                favorites.remove(crop_id)
        else:
            return jsonify({"success": False, "error": "action must be 'add' or 'remove'"}), 400
        settings["crop_favorites"] = favorites
        if save_settings(settings):
            return jsonify({"success": True, "message": f"Favorite {action}ed successfully", "crop_id": crop_id, "crop_favorites": favorites, "timestamp": datetime.now().isoformat()})
        return jsonify({"success": False, "error": "Failed to update favorites"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/settings/reset", methods=["POST"])
def reset_settings():
    try:
        api_key = load_settings().get("api_key", "")
        default_settings = DEFAULT_SETTINGS.copy()
        default_settings["api_key"] = api_key
        if save_settings(default_settings):
            default_settings_resp = {k: v for k, v in default_settings.items() if k != "api_key"}
            default_settings_resp["last_updated"] = datetime.now().isoformat()
            return jsonify({"success": True, "message": "Settings reset to defaults", "settings": default_settings_resp, "timestamp": datetime.now().isoformat()})
        return jsonify({"success": False, "error": "Failed to reset settings"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/settings/test-llm", methods=["POST"])
def test_llm():
    data = request.json or {}
    provider = data.get("provider", llm.provider)
    api_key = data.get("api_key", "").strip()
    model = data.get("model", "openai/gpt-4o-mini" if provider == "openrouter" else "llama-3.1-8b-instant")

    if not api_key:
        return jsonify({"success": False, "error": "API key is required"}), 400

    try:
        test_llm = LLMService()
        old_key = test_llm.api_key
        old_provider = test_llm.provider
        test_llm.api_key = api_key
        test_llm.provider = provider
        test_llm.model = model

        resp = test_llm.call(
            "Reply with exactly and only: OK. Do not add anything else.",
            max_tokens=10
        )

        test_llm.api_key = old_key
        test_llm.provider = old_provider
        test_llm.model = model

        if resp and "OK" in resp.strip().upper():
            return jsonify({"success": True, "message": "LLM connection successful!", "response": resp.strip()})
        else:
            return jsonify({"success": True, "message": "LLM responded (unexpected format)", "response": resp.strip()})
    except Exception as e:
        return jsonify({"success": False, "error": f"LLM test failed: {str(e)}"}), 400


@app.route("/api/settings/llm-status", methods=["GET"])
def llm_status():
    try:
        settings = load_settings()
        provider = settings.get("provider", "openrouter")
        model = settings.get("llm_model", "openai/gpt-4o-mini")
        has_key = bool(settings.get("api_key", "")) or bool(os.getenv("OPENROUTER_API_KEY", "")) or bool(os.getenv("GROQ_API_KEY", ""))
        configured = bool(llm.api_key)
        working = False
        error_msg = None
        if configured:
            try:
                test_resp = llm.call("Reply with just OK", system_prompt="Say OK", max_tokens=5)
                working = bool(test_resp and "OK" in test_resp.strip().upper())
                if not working:
                    error_msg = "LLM responded with unexpected format"
            except Exception as e:
                error_msg = str(e)
        elif has_key and not configured:
            error_msg = "API key stored but could not be loaded (decryption may have failed)"
        else:
            error_msg = "No API key configured"
        return jsonify({
            "success": True,
            "provider": provider,
            "model": model,
            "has_api_key": has_key,
            "configured": configured,
            "working": working,
            "error": error_msg
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/cultivation/start", methods=["POST"])
def start_cultivation():
    data = request.json or {}
    start_date = data.get("start_date")
    crop_name = data.get("crop_name", "Paddy")
    result = CultivationManager.start_cultivation(crop_name=crop_name, start_date_str=start_date)
    if result["success"]:
        return jsonify(result)
    return jsonify(result), 500

@app.route("/api/cultivation/update", methods=["POST"])
def update_cultivation_phase():
    data = request.json or {}
    action = data.get("action", "next")
    result = CultivationManager.update_phase(action)
    if result["success"]:
        return jsonify(result)
    return jsonify(result), 400

@app.route("/api/cultivation/dashboard", methods=["GET"])
def get_cultivation_dashboard():
    try:
        data = CultivationManager.get_dashboard_data()
        return jsonify(data)
    except Exception as e:
        logger.error(f"Dashboard Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/knowledge/<crop_name>/lifecycle", methods=["GET"])
def get_crop_lifecycle(crop_name):
    data = CultivationManager.get_static_knowledge(crop_name)
    if data:
        return jsonify(data)
    return jsonify({"error": f"Knowledge base for {crop_name} not found"}), 404

@app.route("/api/cultivation/detect", methods=["POST"])
def detect_and_log_disease():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    try:
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(temp_path)
        detection_result = LocalInferenceService.predict(temp_path)
        os.remove(temp_path)
        detected_crop = detection_result.get("crop", "Paddy")
        detected_disease = detection_result.get("disease", "Unknown")
        confidence = detection_result.get("confidence", 0)
        analysis_result = {
            "disease_name": detected_disease,
            "confidence_score": confidence,
        }
        CultivationManager.log_disease_detection(
            disease_name=detected_disease,
            confidence=confidence,
            image_url=None
        )
        knowledge = CultivationManager.get_static_knowledge(detected_crop)
        protocols = knowledge.get("disease_protocols", {}) if knowledge else {}
        matched_protocol = None
        detected_name = analysis_result.get("disease_name", "Unknown").lower()
        for pid, pdata in protocols.items():
            if pdata["name"].lower() in detected_name or detected_name in pdata["name"].lower():
                matched_protocol = pdata
                break
        is_newly_learned = False
        if not matched_protocol and detected_name != "unknown":
            logger.info(f"Disease '{detected_name}' not in DB. Initiating learning sequence...")
            matched_protocol = CultivationManager.generate_and_learn_new_disease(analysis_result.get("disease_name"))
            is_newly_learned = True
        response = {
            "analysis": analysis_result,
            "protocol_match": matched_protocol,
            "newly_learned": is_newly_learned,
            "message": "Disease logged" + (" and added to knowledge base." if is_newly_learned else ".")
        }
        return jsonify(response)
    except Exception as e:
        logger.error(f"Detection error: {e}")
        return jsonify({"error": str(e)}), 500



@app.route("/api/auth/signup", methods=["POST"])
def signup():
    try:
        data = request.json or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password", "")
        name = (data.get("name") or "").strip()
        if not email or not password or not name:
            return jsonify({"success": False, "error": "Email, password, and name required"}), 400
        if len(password) < 6:
            return jsonify({"success": False, "error": "Password must be at least 6 characters"}), 400
        user = create_user(
            email=email, password=password, name=name,
            phone=data.get("phone", ""),
            state=data.get("state", ""), district=data.get("district", ""),
            village=data.get("village", ""),
            lat=data.get("lat"), lon=data.get("lon"),
            land_size=data.get("land_size_acres"),
            soil_type=data.get("soil_type", ""),
            farm_type=data.get("farm_type", "rainfed"),
            language=data.get("language", "EN"),
        )
        if not user:
            return jsonify({"success": False, "error": "Email already registered"}), 409
        token = generate_token()
        TOKENS[token] = user["id"]
        return jsonify({"success": True, "token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"]}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        data = request.json or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password", "")
        user = login_user(email, password)
        if not user:
            return jsonify({"success": False, "error": "Invalid email or password"}), 401
        token = generate_token()
        TOKENS[token] = user["id"]
        return jsonify({
            "success": True, "token": token,
            "user": {"id": user["id"], "email": user["email"], "name": user["name"],
                     "state": user["state"], "district": user["district"], "land_size_acres": user["land_size_acres"],
                     "is_admin": bool(user.get("is_admin", False))}
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/auth/profile", methods=["GET", "PUT"])
def auth_profile():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = TOKENS.get(token)
    if not user_id:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    if request.method == "GET":
        user = get_user(user_id)
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        user.pop("password_hash", None)
        farms = get_user_farms(user_id)
        return jsonify({"success": True, "user": user, "farms": farms})
    else:
        data = request.json or {}
        ok = update_user(user_id, **data)
        user = get_user(user_id)
        user.pop("password_hash", None)
        return jsonify({"success": ok, "user": user})

# ── Chat Sessions (persistent) ─────────────────────────────────

def _get_user_id():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    return TOKENS.get(token)

@app.route("/api/chat/sessions", methods=["GET", "POST"])
def chat_sessions_api():
    user_id = _get_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    if request.method == "GET":
        sessions = get_chat_sessions(user_id)
        return jsonify({"success": True, "sessions": sessions})
    data = request.json or {}
    title = (data.get("title") or "New Chat").strip()
    sid = create_chat_session(user_id, title)
    return jsonify({"success": True, "session_id": sid, "title": title})

@app.route("/api/chat/sessions/<session_id>", methods=["GET", "DELETE"])
def chat_session_detail(session_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    session = get_chat_session(session_id)
    if not session or session["user_id"] != user_id:
        return jsonify({"success": False, "error": "Not found"}), 404
    if request.method == "GET":
        messages = get_chat_messages(session_id)
        return jsonify({"success": True, "session": session, "messages": messages})
    delete_chat_session(session_id)
    return jsonify({"success": True})

@app.route("/api/chat/sessions/<session_id>/messages", methods=["POST"])
def chat_session_add_message(session_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    session = get_chat_session(session_id)
    if not session or session["user_id"] != user_id:
        return jsonify({"success": False, "error": "Not found"}), 404
    data = request.json or {}
    role = data.get("role", "user")
    content = data.get("content", "")
    if not content:
        return jsonify({"success": False, "error": "Content required"}), 400
    mid = add_chat_message(session_id, role, content)
    touch_chat_session(session_id)
    return jsonify({"success": True, "message_id": mid})

@app.route("/api/chat/sessions/<session_id>/title", methods=["PUT"])
def chat_session_rename(session_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    session = get_chat_session(session_id)
    if not session or session["user_id"] != user_id:
        return jsonify({"success": False, "error": "Not found"}), 404
    title = (request.json or {}).get("title", "").strip()
    if not title:
        return jsonify({"success": False, "error": "Title required"}), 400
    update_chat_session_title(session_id, title)
    return jsonify({"success": True})

# ── Land Analyses (persistent) ──────────────────────────────────

@app.route("/api/land-analyses", methods=["GET"])
def list_land_analyses():
    user_id = _get_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    analyses = get_land_analyses(user_id)
    return jsonify({"success": True, "analyses": analyses})

@app.route("/api/land-analyses", methods=["POST"])
def create_land_analysis():
    user_id = _get_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    data = request.json or {}
    result = data.get("result")
    if not result:
        return jsonify({"success": False, "error": "result required"}), 400
    aid = save_land_analysis(
        user_id=user_id,
        city=data.get("city", ""),
        lat=data.get("lat"),
        lon=data.get("lon"),
        result_json=result
    )
    return jsonify({"success": True, "analysis_id": aid})

@app.route("/api/land-analyses/<analysis_id>", methods=["GET", "DELETE"])
def land_analysis_detail(analysis_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    analysis = get_land_analysis(analysis_id)
    if not analysis or analysis["user_id"] != user_id:
        return jsonify({"success": False, "error": "Not found"}), 404
    if request.method == "GET":
        analysis["result_json"] = json.loads(analysis["result_json"]) if isinstance(analysis["result_json"], str) else analysis["result_json"]
        return jsonify({"success": True, "analysis": analysis})
    delete_land_analysis(analysis_id)
    return jsonify({"success": True})

@app.route("/api/user/farms", methods=["GET"])
def api_user_farms():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id required"}), 400
    farms = get_user_farms(user_id)
    return jsonify({"success": True, "farms": farms})

@app.route("/api/users/profile", methods=["GET", "POST"])
def user_profile():
    if request.method == "POST":
        data = request.json or {}
        user_id = data.get("user_id", "default_user")

        name = data.get("name", "Farmer")
        language = data.get("language", "EN")
        region = data.get("region", "Karnataka")
        user = get_or_create_user(user_id, name, language, region)
        return jsonify({"success": True, "user": user})
    else:
        user_id = request.args.get("user_id", "default_user")
        user = get_or_create_user(user_id)
        farms = get_user_farms(user_id)
        return jsonify({"success": True, "user": user, "farms": farms})

@app.route("/api/farms/create", methods=["POST"])
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

@app.route("/api/farms/<farm_id>/daily-plan", methods=["GET"])
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
    user_context = f"Name: {user['name']}, Region: {user['region']}, Language: {user['language']}"
    prompt = f"The user is a farmer: {user_context}. The crop is {crop} at {dap} days after planting. The weather is {weather_context}. Give a short, helpful daily cultivation advice."
    try:
        advice = call_llm(prompt, max_tokens=500)
    except Exception as e:
        advice = f"Monitor crop health. Weather is {weather_context}."
    return jsonify({"success": True, "farm": farm, "dap": dap, "yield_prediction": yield_pred, "ai_advisory": advice, "weather": weather})

@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if data is None:
        return jsonify({"error": "Invalid JSON payload"}), 400
    result = handle_prediction(data)
    return jsonify(result)

@app.route("/geocode", methods=["POST"])
def geocode():
    data = request.get_json()
    if data is None:
        return jsonify({"error": "Invalid JSON payload"}), 400
    city = data.get("city")
    coords = get_coordinates(city)
    if isinstance(coords, dict) and "error" in coords:
        return jsonify(coords), 404
    if not coords or coords == (None, None):
        return jsonify({"error": "City not found"}), 404
    lat, lon = coords
    return jsonify({"lat": lat, "lon": lon})

@app.route("/api/calendar", methods=["GET"])
def api_calendar():
    crop = request.args.get("crop", "rice")
    city = request.args.get("city", "")
    milestones = generate_calendar(crop, city)
    return jsonify(milestones)

@app.route("/api/economics", methods=["POST"])
def api_economics():
    try:
        data = request.get_json()
        if data is None:
            return jsonify({"error": "Invalid JSON payload"}), 400
        crop = data.get("crop", "rice")
        yield_val = float(data.get("yield", 1.0))
        area = float(data.get("area", 1.0))
        result = estimate_economics(crop, yield_val, area)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/crop-analyzer", methods=["POST"])
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

        if N and P and ph:
            try:
                pred_data = {"city": city, "N": float(N), "P": float(P), "K": float(K or 0), "ph": float(ph)}
                pred = handle_prediction(pred_data)
            except: pred = {}
        else: pred = {}

        weather = WeatherDiseaseRiskCalculator.get_simulated_weather()
        coords = get_coordinates(city)
        if isinstance(coords, (list, tuple)) and len(coords) == 2:
            lat, lon = coords
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
            "weather": {"temperature": weather["temperature_celsius"], "humidity": weather["humidity_percent"],
                       "rainfall": weather["rainfall_mm"],
                       "season": "Monsoon" if datetime.now().month in [6,7,8,9] else "Rabi" if datetime.now().month in [10,11,12,1] else "Summer"},
            "prediction": {"yield_t_ha": pred.get("yield") if pred else None, "risk": pred.get("risk") if pred else None,
                          "top_crops": pred.get("top_crops", []) if pred else []},
            "diseases": diseases[:8],
            "economics": eco,
            "calendar": cal[:8],
            "sources": {"weather": "Open-Meteo (real)", "economics": "GOI CACP 2024-25", "diseases": "ICAR guidelines"}
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

_KARNATAKA_CITIES = None

def _load_cities():
    global _KARNATAKA_CITIES
    if _KARNATAKA_CITIES is None:
        try:
            path = Path(__file__).parent / "data" / "karnataka_cities.json"
            if path.exists():
                with open(path) as f:
                    _KARNATAKA_CITIES = json.load(f)
            else:
                _KARNATAKA_CITIES = []
        except Exception as e:
            logger.warning(f"Failed to load cities: {e}")
            _KARNATAKA_CITIES = []
    return _KARNATAKA_CITIES

CITY_ALIASES = {
    "bangalore": "bengaluru", "mysore": "mysuru", "mangalore": "mangaluru",
    "hubli": "hubballi", "belgaum": "belagavi", "gulbarga": "kalaburagi",
    "bellary": "ballari", "shimoga": "shivamogga", "tumkur": "tumakuru",
    "chikmagalur": "chikkamagaluru", "hospet": "hosapete",
    "chikkaballapura": "chikkaballapura", "chikballapur": "chikkaballapura",
    "davanagere": "davangere", "koppal": "koppal",
}

@app.route("/api/cities", methods=["GET"])
def api_cities():
    q = request.args.get("q", "").strip().lower()
    q_normalized = CITY_ALIASES.get(q, q)
    cities = _load_cities()
    if q:
        results = [c for c in cities if q in c["city"].lower() or q_normalized in c["city"].lower() or q in c.get("district","").lower()]
    else:
        results = cities
    return jsonify({"cities": results[:30], "total": len(results)})

@app.route("/api/soil", methods=["GET"])
def api_soil():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    if lat is None or lon is None:
        return jsonify({"error": "lat and lon required"}), 400
    try:
        summary = get_soil_summary(lat, lon)
        return jsonify(summary)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/market/forecast", methods=["GET"])
def market_forecast():
    crop = request.args.get("crop", "Paddy")
    days = int(request.args.get("days", 90))
    try:
        result = forecast_price(crop, days)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/market/forecast-all", methods=["GET"])
def market_forecast_all():
    try:
        result = forecast_all()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        if data is None:
            return jsonify({"reply": "Invalid JSON payload", "response": "Invalid JSON payload"}), 400
        user_message = data.get("message", "")
        ctx = data.get("context", {})
        session_id = data.get("session_id", "")
        if not user_message:
            return jsonify({"reply": "Please enter a message.", "response": "Please enter a message."}), 400

        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user_id = TOKENS.get(token, "anonymous")

        # Create or reuse chat session
        if not session_id and user_id != "anonymous":
            title = user_message[:60]
            session_id = create_chat_session(user_id, title)
        elif session_id:
            session = get_chat_session(session_id)
            if session and session["user_id"] == user_id:
                msg_count = len(get_chat_messages(session_id))
                if msg_count <= 2:
                    update_chat_session_title(session_id, user_message[:60])
            elif user_id != "anonymous":
                session_id = create_chat_session(user_id, user_message[:60])

        language = ctx.get("language", "EN")
        lang_instruction = ""
        if language == "KN":
            lang_instruction = "Respond in Kannada (ಕನ್ನಡ)."
        elif language == "HI":
            lang_instruction = "Respond in Hindi (हिंदी)."
        elif language == "TE":
            lang_instruction = "Respond in Telugu (తెలుగు)."
        elif language == "TA":
            lang_instruction = "Respond in Tamil (தமிழ்)."

        # Build history from DB if session exists
        hist_str = ""
        if session_id and user_id != "anonymous":
            db_messages = get_chat_messages(session_id)
            recent = db_messages[-12:]
            lines = [f"{m['role']}: {m['content']}" for m in recent]
            hist_str = "\n".join(lines)

        agent_context = {
            "crop": ctx.get("selected_crop") or ctx.get("crop", ""),
            "city": ctx.get("city", ""),
            "lat": ctx.get("lat"),
            "lon": ctx.get("lon"),
            "N": ctx.get("N"),
            "P": ctx.get("P"),
            "K": ctx.get("K"),
            "ph": ctx.get("ph"),
            "temperature": ctx.get("temperature"),
            "humidity": ctx.get("humidity"),
            "language": language,
            "lang_instruction": lang_instruction,
            "history": hist_str,
        }

        profile = None
        if user_id != "anonymous":
            try:
                profile = get_user(user_id)
            except:
                pass

        if profile:
            agent_context["state"] = profile.get("state", "")
            agent_context["district"] = profile.get("district", "")
            agent_context["land_size_acres"] = profile.get("land_size_acres")
            agent_context["soil_type"] = profile.get("soil_type")

        try:
            response_text = run_agent_pipeline(user_message, agent_context)
        except Exception as agent_err:
            logger.warning(f"Agent pipeline failed, falling back to direct LLM: {agent_err}")
            augmented_query = rag.augment_prompt(user_message)
            system_prompt = f"You are Vani AI, an expert agricultural advisor for Karnataka farmers. Answer concisely. {lang_instruction}"
            response_text = call_llm(prompt=augmented_query, system_prompt=system_prompt, max_tokens=1000)

        # Persist to DB
        if session_id and user_id != "anonymous":
            add_chat_message(session_id, "user", user_message)
            add_chat_message(session_id, "assistant", response_text)
            touch_chat_session(session_id)

        return jsonify({"reply": response_text, "response": response_text, "session_id": session_id})
    except Exception as e:
        return jsonify({"reply": f"Something went wrong: {str(e)}", "response": f"Something went wrong: {str(e)}"}), 500

@app.route("/api/voice/transcribe", methods=["POST"])
def voice_transcribe():
    try:
        data = request.json or {}
        text = data.get("text", "")
        language = data.get("language", "EN")
        if not text:
            return jsonify({"error": "No text provided"}), 400
        return jsonify({"success": True, "text": text, "transcribed": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/diagnostics/location", methods=["POST"])
def location_diagnostics():
    try:
        data = request.get_json()
        city = (data.get("city") or "").strip()
        lat = data.get("lat")
        lon = data.get("lon")
        N = data.get("N")
        P = data.get("P")
        K = data.get("K")
        ph = data.get("ph")

        if not city and (lat is None or lon is None):
            return jsonify({"error": "City name or coordinates required"}), 400

        if lat is None or lon is None:
            coords = get_coordinates(city)
            if isinstance(coords, dict) and "error" in coords:
                return jsonify({"error": f"Could not find coordinates for {city}"}), 404
            lat, lon = coords

        if not city:
            city = _reverse_geocode(lat, lon)

        soil_source = None
        if N is None and lat is not None and lon is not None:
            try:
                soil_summary = get_soil_summary(lat, lon)
                if soil_summary.get("source") != "Estimated":
                    N = soil_summary.get("n", 60)
                    P = soil_summary.get("p", 35)
                    K = soil_summary.get("k", 45)
                    ph = soil_summary.get("ph", 6.5)
                    soil_source = soil_summary.get("source", "ISRIC SoilGrids")
            except Exception as e:
                logger.warning(f"Soil fetch for diagnostics failed: {e}")

        weather_data = WeatherDiseaseRiskCalculator.get_simulated_weather()
        open_meteo_raw = _fetch_open_meteo_raw(lat, lon)
        if open_meteo_raw:
            current = open_meteo_raw.get("current", {})
            weather_data.update({
                "temperature_celsius": current.get("temperature_2m", weather_data.get("temperature_celsius")),
                "humidity_percent": current.get("relative_humidity_2m", weather_data.get("humidity_percent")),
                "rainfall_mm": current.get("precipitation", weather_data.get("rainfall_mm", 0)),
                "wind_speed_kmh": current.get("wind_speed_10m", weather_data.get("wind_speed_kmh", 0)),
                "wind_direction": current.get("wind_direction_10m"),
                "pressure_msl": current.get("pressure_msl"),
                "cloud_cover_pct": current.get("cloud_cover"),
                "dew_point_c": current.get("dew_point_2m"),
                "uv_index": current.get("uv_index"),
                "source": "Open-Meteo (real)",
                "forecast": open_meteo_raw.get("daily", {}),
            })

        result = analyze_land(lat, lon, city, N, P, K, ph, weather_data, open_meteo_raw)
        if soil_source:
            result["soil"]["data_source"] = soil_source
        return jsonify(result)
    except Exception as e:
        logger.error(f"Location diagnostics error: {e}")
        return jsonify({"error": str(e)}), 500

def _fetch_open_meteo_raw(lat, lon):
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover,dew_point_2m,uv_index&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&timezone=auto&forecast_days=7"
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        logger.warning(f"Open-Meteo fetch failed: {e}")
    return None

def _reverse_geocode(lat, lon):
    try:
        url = f"https://geocoding-api.open-meteo.com/v1/reverse?latitude={lat}&longitude={lon}&language=en&format=json"
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if not data.get("error") and data.get("results"):
                r = data["results"][0]
                name = r.get("name", "")
                admin = r.get("admin1", "")
                if name:
                    return f"{name}, {admin}" if admin else name
    except Exception as e:
        logger.warning(f"Reverse geocode failed: {e}")
    return f"GPS: {lat:.4f}°N, {lon:.4f}°E"
    
@app.route("/api/env/geocode", methods=["GET"])
def api_env_geocode():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    if lat is None or lon is None:
        return jsonify({"error": "lat and lon required"}), 400
    display = _reverse_geocode(lat, lon)
    city = display.split(",")[0] if "," in display else display
    return jsonify({"display": display, "city": city})

@app.route("/api/env/weather", methods=["GET"])
def api_env_weather():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    if lat is None or lon is None:
        return jsonify({"error": "lat and lon required"}), 400
    
    weather_data = WeatherDiseaseRiskCalculator.get_simulated_weather()
    raw = _fetch_open_meteo_raw(lat, lon)
    if raw:
        c = raw.get("current", {})
        weather_data.update({
            "temperature": c.get("temperature_2m"),
            "humidity": c.get("relative_humidity_2m"),
            "rainfall": c.get("precipitation", 0),
            "wind_speed": c.get("wind_speed_10m"),
            "condition": "Clear" if c.get("cloud_cover", 0) < 30 else "Cloudy" if c.get("cloud_cover", 0) < 70 else "Overcast"
        })
    return jsonify(weather_data)

@app.route("/api/env/soilgrids", methods=["GET"])
def api_env_soilgrids():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    if lat is None or lon is None:
        return jsonify({"error": "lat and lon required"}), 400
    try:
        summary = get_soil_summary(lat, lon)
        return jsonify({
            "ph": summary.get("ph"),
            "nitrogen": summary.get("n"),
            "phosphorus": summary.get("p"),
            "potassium": summary.get("k"),
            "source": summary.get("source")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/env/forecast", methods=["GET"])
def api_env_forecast():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    if lat is None or lon is None:
        return jsonify({"error": "lat and lon required"}), 400
    
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


app.register_blueprint(main_bp, url_prefix="/legacy")
app.register_blueprint(prediction_bp, url_prefix="/legacy")

app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(vendor_bp, url_prefix="/api/vendors")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    logger.info(f"Starting KrishiVigyan backend on port {port} (debug={debug})")
    app.run(debug=debug, port=port)
