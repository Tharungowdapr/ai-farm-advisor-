"""
Deprecated — all prediction routes consolidated in app.py.
- /api/predict  → app.py:1118  (Groq + RAG)
- /geocode     → app.py:1126

This blueprint is retained only for future migration.
"""
from flask import Blueprint, jsonify

prediction_bp = Blueprint("prediction", __name__)


@prediction_bp.route("/predict", methods=["POST"])
def predict():
    return jsonify({
        "error": "Prediction endpoint migrated to /api/predict in app.py"
    }), 410


@prediction_bp.route("/geocode", methods=["POST"])
def geocode():
    return jsonify({
        "error": "Geocode endpoint migrated to /geocode in app.py"
    }), 410
