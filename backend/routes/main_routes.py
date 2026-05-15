"""
Deprecated — all API routes consolidated in app.py.
This file exists only for legacy blueprint registration.
Routes defined here are fallbacks for when the blueprint
is eventually registered.

All functional endpoints (chat, economics, calendar,
diagnose-image) have been migrated to app.py with Groq LLM,
RAG augmentation, and settings-based API key support.
"""
from flask import Blueprint, jsonify

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def home():
    return jsonify({
        "status": "API only",
        "message": "Frontend is served by Vite dev server (port 5173). "
                   "See README.md for setup instructions."
    })


@main_bp.route("/dashboard")
def dashboard():
    return jsonify({"error": "Dashboard template not available. Use Vite frontend."}), 404


@main_bp.route("/explore")
def explore():
    return jsonify({"error": "Explore template not available. Use Vite frontend."}), 404


@main_bp.route("/result")
def result():
    return jsonify({"error": "Result template not available. Use Vite frontend."}), 404


@main_bp.route("/features")
def features():
    return jsonify({"error": "Features template not available. Use Vite frontend."}), 404


@main_bp.route("/about")
def about():
    return jsonify({"error": "About template not available. Use Vite frontend."}), 404


@main_bp.route("/contact")
def contact():
    return jsonify({"error": "Contact template not available. Use Vite frontend."}), 404


@main_bp.route("/calendar")
def calendar():
    return jsonify({"error": "Calendar template not available. Use /api/calendar or Vite frontend."}), 404
