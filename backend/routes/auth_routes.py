from flask import Blueprint, request, jsonify
from core.database import create_user, login_user, get_user, update_user, generate_token, get_user_farms
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)

# Token storage (can be moved to a more robust store if needed)
TOKENS = {}

@auth_bp.route("/signup", methods=["POST"])
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
        logger.error(f"Signup error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@auth_bp.route("/login", methods=["POST"])
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
        logger.error(f"Login error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@auth_bp.route("/profile", methods=["GET", "PUT"])
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
