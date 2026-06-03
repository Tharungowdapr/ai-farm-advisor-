import os
import sys
import io
import json
import logging
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Force UTF-8 for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)

# Initialize Core Services
from services.llm_service import LLMService
from services.rag_service import RAGService
from core.monitoring import setup_monitoring, track_llm_call
from agents.supervisor_agent import run_agent_pipeline

app = Flask(__name__)
CORS(app)
setup_monitoring(app)

llm = LLMService()
rag = RAGService()

# Pre-index RAG data on startup to avoid delays
with app.app_context():
    try:
        logger.info("Initializing RAG vector database...")
        rag.index_all()
        logger.info("RAG indexing complete.")
    except Exception as e:
        logger.warning(f"Initial RAG indexing failed: {e}")


# Global LLM Call Helper
def call_llm(prompt, system_prompt=None, json_mode=False, max_tokens=1500, use_rag=False):
    if use_rag:
        prompt = rag.augment_prompt(prompt)
    api_key = request.headers.get('X-Api-Key') if request else None
    return llm.call(prompt=prompt, system_prompt=system_prompt, json_mode=json_mode, max_tokens=max_tokens, api_key=api_key)

# App Configuration
UPLOAD_FOLDER = Path(os.getcwd()) / 'uploads'
UPLOAD_FOLDER.mkdir(exist_ok=True)
app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)

# Register Blueprints
from routes.auth_routes import auth_bp
from routes.farmer_routes import farmer_bp
from routes.intelligence_routes import intel_bp
from routes.env_routes import env_bp

from routes.admin_routes import admin_bp
from routes.vendor_routes import vendor_bp
from routes.main_routes import main_bp
from routes.prediction_routes import prediction_bp
from routes.settings_routes import settings_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(farmer_bp, url_prefix="/api")
app.register_blueprint(intel_bp, url_prefix="/api")
app.register_blueprint(env_bp, url_prefix="/api/env")

app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(vendor_bp, url_prefix="/api/vendors")
app.register_blueprint(settings_bp, url_prefix="/api/settings")
app.register_blueprint(main_bp, url_prefix="/legacy")
app.register_blueprint(prediction_bp, url_prefix="/legacy")

# Helper used by routes
def _fetch_open_meteo_raw(lat, lon):
    from services.weather_service import fetch_open_meteo_raw
    return fetch_open_meteo_raw(lat, lon)

# Serve crop images directly at /api/image/<filename>
from flask import send_from_directory
IMAGES_DIR = Path(os.getcwd()) / 'images'
@app.route("/api/image/<filename>", methods=["GET"])
def serve_crop_image(filename):
    return send_from_directory(IMAGES_DIR, filename)

@app.route("/api/chat", methods=["POST"])
@track_llm_call("chat")
def chat():
    data = request.json or {}
    user_message = data.get("message", "")
    user_id = data.get("user_id", "anonymous")
    language = data.get("language", "EN")
    
    lang_map = {"KN": "Kannada", "HI": "Hindi", "TE": "Telugu", "TA": "Tamil", "EN": "English"}
    lang_instruction = f"Respond in {lang_map.get(language, 'English')}."
    
    # Context gathering
    ctx = data.get("context", {})
    agent_context = {
        "lat": ctx.get("lat"), "lon": ctx.get("lon"),
        "crop": ctx.get("crop"),
        "ph": ctx.get("ph"),
        "temperature": ctx.get("temperature"),
        "humidity": ctx.get("humidity"),
        "language": language,
        "lang_instruction": lang_instruction,
    }

    profile = None
    if user_id != "anonymous":
        try:
            from core.database import get_user
            profile = get_user(user_id)
        except Exception as e:
            logger.warning(f"Failed to fetch profile: {e}")

    if profile:
        agent_context.update({
            "state": profile.get("state", ""),
            "district": profile.get("district", ""),
            "land_size_acres": profile.get("land_size_acres"),
            "soil_type": profile.get("soil_type")
        })

    try:
        api_key = request.headers.get('X-Api-Key')
        response_text = run_agent_pipeline(user_message, agent_context, api_key=api_key)
    except Exception as agent_err:
        logger.warning(f"Agent pipeline failed, falling back to direct LLM: {agent_err}")
        augmented_query = rag.augment_prompt(user_message)
        system_prompt = f"You are Vani AI, an expert agricultural advisor for Karnataka farmers. Answer concisely. {lang_instruction}"
        response_text = call_llm(prompt=augmented_query, system_prompt=system_prompt, max_tokens=1000)

    return jsonify({"response": response_text, "timestamp": datetime.now().isoformat()})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("FLASK_DEBUG", "true").lower() == "true"
    logger.info(f"Starting KrishiVigyan backend on port {port} (debug={debug})")
    app.run(debug=debug, port=port)
