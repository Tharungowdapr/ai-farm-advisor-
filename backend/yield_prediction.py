import logging
import random
from datetime import datetime

logger = logging.getLogger(__name__)

class YieldPredictor:
    BASE_YIELDS = {
        "Paddy": {"base": 25.0, "unit": "q/acre"},
        "Ragi": {"base": 15.0, "unit": "q/acre"},
        "Coffee": {"base": 800.0, "unit": "kg/acre"},
        "Sugarcane": {"base": 40.0, "unit": "t/acre"},
        "Wheat": {"base": 20.0, "unit": "q/acre"},
        "Maize": {"base": 30.0, "unit": "q/acre"},
        "Tomato": {"base": 25.0, "unit": "t/acre"},
        "Potato": {"base": 20.0, "unit": "t/acre"},
        "Soybean": {"base": 12.0, "unit": "q/acre"},
        "Cotton": {"base": 8.0, "unit": "q/acre"},
        "Groundnut": {"base": 15.0, "unit": "q/acre"},
        "Coconut": {"base": 80.0, "unit": "nuts/tree"},
        "Banana": {"base": 30.0, "unit": "t/acre"},
        "Orange": {"base": 500.0, "unit": "fruits/tree"},
        "Grape": {"base": 15.0, "unit": "t/acre"},
        "Capsicum": {"base": 40.0, "unit": "t/acre"},
        "Apple": {"base": 12.0, "unit": "t/acre"},
    }

    @staticmethod
    def predict_yield(crop_name, dap, disease_history=None, weather_history=None):
        crop_data = YieldPredictor.BASE_YIELDS.get(crop_name, {"base": 20.0, "unit": "units/acre"})
        base_yield = crop_data["base"]

        disease_penalty = 0.0
        if disease_history:
            disease_penalty = min(0.3, len(disease_history) * 0.03)

        weather_penalty = 0.0
        if weather_history:
            bad_weather_events = len([w for w in weather_history if w.get("extreme", False)])
            weather_penalty = min(0.2, bad_weather_events * 0.05)

        variance = max(0.05, 0.3 - (dap * 0.002))
        random_factor = random.uniform(-variance, variance)

        final_yield = base_yield * (1.0 - disease_penalty - weather_penalty + random_factor)
        confidence_score = min(0.95, 0.4 + (dap * 0.005))

        return {
            "predicted_yield": round(max(0, final_yield), 2),
            "unit": crop_data["unit"],
            "confidence_score": round(confidence_score * 100, 1),
            "factors": {
                "base_potential": base_yield,
                "disease_impact": f"-{round(disease_penalty * 100)}%",
                "weather_impact": f"-{round(weather_penalty * 100)}%"
            }
        }
