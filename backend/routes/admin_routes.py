from flask import Blueprint, jsonify, request
from core.database import get_db

admin_bp = Blueprint('admin_bp', __name__)

@admin_bp.route("/users", methods=["GET"])
def get_users():
    # In a real app we'd verify admin token here
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, name, email, phone, is_admin, created_at, state FROM users ORDER BY created_at DESC")
    users = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify({"success": True, "users": users})

@admin_bp.route("/users/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM daily_logs WHERE farm_id IN (SELECT id FROM farms WHERE user_id=?)", (user_id,))
        c.execute("DELETE FROM farms WHERE user_id=?", (user_id,))
        c.execute("DELETE FROM users WHERE id=?", (user_id,))
        conn.commit()
        success = c.rowcount > 0
    except Exception as e:
        success = False
    finally:
        conn.close()
    return jsonify({"success": success})

@admin_bp.route("/users/<user_id>/role", methods=["PUT"])
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
