from flask import Blueprint, jsonify, request
from database import get_db
from functools import wraps

admin_bp = Blueprint('admin_bp', __name__)


def _get_tokens():
    from app import TOKENS
    return TOKENS


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
        TOKENS = _get_tokens()
        if not token or token not in TOKENS:
            return jsonify({"success": False, "error": "Authentication required"}), 401
        user_id = TOKENS[token]
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT is_admin FROM users WHERE id=?", (user_id,))
        row = c.fetchone()
        conn.close()
        if not row or not row["is_admin"]:
            return jsonify({"success": False, "error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated


@admin_bp.route("/users", methods=["GET"])
@admin_required
def get_users():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, name, email, phone, is_admin, created_at, state FROM users ORDER BY created_at DESC")
    users = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify({"success": True, "users": users})


@admin_bp.route("/users/<user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM daily_logs WHERE farm_id IN (SELECT id FROM farms WHERE user_id=?)", (user_id,))
        c.execute("DELETE FROM farms WHERE user_id=?", (user_id,))
        c.execute("DELETE FROM users WHERE id=?", (user_id,))
        conn.commit()
        success = c.rowcount > 0
    except Exception:
        success = False
    finally:
        conn.close()
    return jsonify({"success": success})


@admin_bp.route("/users/<user_id>/role", methods=["PUT"])
@admin_required
def update_user_role(user_id):
    data = request.json or {}
    is_admin = bool(data.get("is_admin"))
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE users SET is_admin=? WHERE id=?", (is_admin, user_id))
    conn.commit()
    success = c.rowcount > 0
    conn.close()
    return jsonify({"success": success})
