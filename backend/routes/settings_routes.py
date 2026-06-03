from flask import Blueprint, request, jsonify
from pathlib import Path
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
settings_bp = Blueprint('settings', __name__)

SETTINGS_DIR = Path(__file__).parent.parent / "settings"
SETTINGS_FILE = SETTINGS_DIR / "user_settings.json"

DEFAULT_SETTINGS = {
    "language": "EN",
    "crop_cluster": "All Karnataka",
    "notifications": True,
    "price_alerts": True,
    "theme": "light",
    "region": "Karnataka",
    "unit_preference": "metric",
    "crop_favorites": []
}

def load_settings():
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                return {**DEFAULT_SETTINGS, **json.load(f)}
    except Exception as e:
        logger.error(f"Error loading settings: {e}")
    return DEFAULT_SETTINGS.copy()

def save_settings(settings):
    try:
        SETTINGS_DIR.mkdir(exist_ok=True)
        # Never save API keys in the backend settings file
        if 'api_key' in settings:
            del settings['api_key']
            
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving settings: {e}")
        return False

@settings_bp.route("", methods=["GET"])
def get_settings():
    settings = load_settings()
    # Ensure no API key info is leaked or expected from here
    settings["has_api_key"] = False 
    return jsonify({"success": True, "settings": settings})

@settings_bp.route("", methods=["POST"])
def update_settings():
    try:
        current = load_settings()
        new_data = request.json or {}
        # Merge, but ignore any api_key sent from frontend (though we updated frontend not to send it)
        updated = {**current, **new_data}
        updated.pop('api_key', None)
        
        if save_settings(updated):
            return jsonify({"success": True, "settings": updated})
        return jsonify({"success": False, "error": "Failed to save settings"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@settings_bp.route("/test-key", methods=["POST"])
def test_api_key():
    """Test if the provided Groq API key works by making a minimal LLM call."""
    try:
        api_key = request.headers.get('X-Api-Key')
        if not api_key:
            return jsonify({"success": False, "error": "No API key provided. Enter your key above first."}), 400
        
        from services.llm_service import LLMService
        test_llm = LLMService()
        response = test_llm.call(
            prompt="Reply with exactly: OK",
            system_prompt="You are a test bot. Reply with exactly one word: OK",
            max_tokens=10,
            api_key=api_key
        )
        
        if response and len(response.strip()) > 0:
            return jsonify({
                "success": True, 
                "message": "API key is valid! Groq connection successful.",
                "model": "llama-3.3-70b-versatile"
            })
        else:
            return jsonify({"success": False, "error": "API key accepted but no response received."}), 500
            
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "invalid_api_key" in error_msg:
            return jsonify({"success": False, "error": "Invalid API key. Please check and try again."}), 401
        elif "429" in error_msg:
            return jsonify({"success": False, "error": "Rate limit exceeded. Key is valid but try again in a moment."}), 429
        else:
            return jsonify({"success": False, "error": f"Connection failed: {error_msg[:150]}"}), 500

@settings_bp.route("/language", methods=["POST"])
def update_language():
    data = request.json or {}
    lang = data.get("language", "EN")
    settings = load_settings()
    settings["language"] = lang
    save_settings(settings)
    return jsonify({"success": True, "language": lang})
