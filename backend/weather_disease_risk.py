"""
Real-Time Weather & Disease Risk Calculator
Fetches weather data and calculates disease risk based on environmental conditions
"""

import logging
from datetime import datetime
from cachetools import TTLCache, cached

logger = logging.getLogger(__name__)

# Cache weather data for 1 hour (3600 seconds)
weather_cache = TTLCache(maxsize=50, ttl=3600)


class WeatherDiseaseRiskCalculator:
    """Calculates disease risk based on real-time weather conditions"""
    
    # Disease susceptibility profiles (Temperature, Humidity thresholds)
    DISEASE_RISK_PROFILES = {
        "Rice Blast": {
            "optimal_temp": (25, 30),  # Temperature range where risk is highest
            "humidity_threshold": 85,   # RH% above which risk increases
            "rainfall_factor": True,    # High rainfall increases risk
            "base_risk": "Moderate",
            "peak_season": [6, 7, 8, 9]  # Monsoon months
        },
        "Bacterial Leaf Blight": {
            "optimal_temp": (24, 32),
            "humidity_threshold": 80,
            "rainfall_factor": True,
            "base_risk": "Moderate",
            "peak_season": [6, 7, 8, 9]
        },
        "Finger Millet Blast": {
            "optimal_temp": (24, 28),
            "humidity_threshold": 85,
            "rainfall_factor": True,
            "base_risk": "Moderate",
            "peak_season": [7, 8, 9]
        },
        "Coffee Leaf Rust": {
            "optimal_temp": (20, 24),
            "humidity_threshold": 90,
            "rainfall_factor": True,
            "base_risk": "Moderate",
            "peak_season": [6, 7, 8, 9, 10]
        },
        "Red Rot": {
            "optimal_temp": (28, 32),
            "humidity_threshold": 80,
            "rainfall_factor": True,
            "base_risk": "High",
            "peak_season": [5, 6, 7, 8, 9]
        },
        "Late Blight": { "optimal_temp": (10, 24), "humidity_threshold": 90, "rainfall_factor": True, "base_risk": "High", "peak_season": [10, 11, 12, 1] },
        "Leaf Blight": { "optimal_temp": (18, 27), "humidity_threshold": 90, "rainfall_factor": True, "base_risk": "Moderate", "peak_season": [6, 7, 8] },
        "Powdery Mildew": { "optimal_temp": (20, 28), "humidity_threshold": 80, "rainfall_factor": False, "base_risk": "Moderate", "peak_season": [11, 12, 1] },
        "Soybean Rust": { "optimal_temp": (15, 28), "humidity_threshold": 95, "rainfall_factor": True, "base_risk": "High", "peak_season": [7, 8, 9] },
        "Downy Mildew": { "optimal_temp": (20, 25), "humidity_threshold": 90, "rainfall_factor": True, "base_risk": "High", "peak_season": [10, 11] },
        "Citrus Canker": { "optimal_temp": (20, 30), "humidity_threshold": 80, "rainfall_factor": True, "base_risk": "Moderate", "peak_season": [6, 7, 8] },
        "Apple Scab": { "optimal_temp": (16, 24), "humidity_threshold": 85, "rainfall_factor": True, "base_risk": "High", "peak_season": [4, 5, 6] }
    }
    
    # Crop-disease associations
    CROP_DISEASES = {
        "Paddy": ["Rice Blast", "Bacterial Leaf Blight"],
        "Ragi": ["Finger Millet Blast"],
        "Coffee": ["Coffee Leaf Rust"],
        "Sugarcane": ["Red Rot"],
        "Tomato": ["Late Blight"],
        "Potato": ["Late Blight"],
        "Maize": ["Leaf Blight"],
        "Capsicum": ["Powdery Mildew"],
        "Soybean": ["Soybean Rust"],
        "Grape": ["Downy Mildew"],
        "Orange": ["Citrus Canker"],
        "Apple": ["Apple Scab"]
    }
    
    @staticmethod
    @cached(cache=weather_cache)
    def get_simulated_weather(region="Karnataka"):
        """
        Simulates real-time weather data for demonstration
        In production, this would integrate with OpenWeatherMap or IMD API
        """
        current_month = datetime.now().month
        current_day = datetime.now().day
        
        # Simulate weather patterns based on season
        weather_profiles = {
            # Monsoon (Jun-Sep): High temp, very high humidity, frequent rain
            "monsoon": {
                "temperature": 26 + ((current_day % 10) - 5),  # 21-31°C
                "humidity": 85 + ((current_day % 10) - 5),     # 80-90%
                "rainfall": 10 + ((current_day % 30) // 3),    # 10-20mm
                "wind_speed": 8 + ((current_day % 10) // 2),
                "season": "Monsoon (High Disease Risk)"
            },
            # Summer (Mar-May): High temp, low humidity, minimal rain
            "summer": {
                "temperature": 32 + ((current_day % 10) - 5),  # 27-37°C
                "humidity": 45 + ((current_day % 10) - 5),     # 40-50%
                "rainfall": 0.5 + ((current_day % 10) / 20),   # 0.5-1mm
                "wind_speed": 12 + ((current_day % 10) // 2),
                "season": "Summer (Moderate Risk)"
            },
            # Winter (Dec-Feb): Mild temp, low humidity, no rain
            "winter": {
                "temperature": 20 + ((current_day % 10) - 5),  # 15-25°C
                "humidity": 50 + ((current_day % 10) - 5),     # 45-55%
                "rainfall": 0.2 + ((current_day % 10) / 50),   # Very low
                "wind_speed": 6 + ((current_day % 10) // 2),
                "season": "Winter (Low Risk)"
            }
        }
        
        # Determine current season
        if current_month in [6, 7, 8, 9]:
            profile = weather_profiles["monsoon"]
        elif current_month in [3, 4, 5]:
            profile = weather_profiles["summer"]
        else:
            profile = weather_profiles["winter"]
        
        return {
            "region": region,
            "timestamp": datetime.now().isoformat(),
            "temperature_celsius": round(profile["temperature"], 1),
            "humidity_percent": round(profile["humidity"], 1),
            "rainfall_mm": round(profile["rainfall"], 2),
            "wind_speed_kmh": round(profile["wind_speed"], 1),
            "season": profile["season"],
            "source": "Simulated (Real API would connect to IMD/OpenWeatherMap)"
        }
    
    @staticmethod
    def calculate_disease_risk(crop_name, weather_data=None):
        """
        Calculate disease risk for a crop based on current weather
        Returns list of diseases with risk levels and recommendations
        """
        if weather_data is None:
            weather_data = WeatherDiseaseRiskCalculator.get_simulated_weather()
        
        diseases = WeatherDiseaseRiskCalculator.CROP_DISEASES.get(crop_name, [])
        risk_assessments = []
        
        for disease_name in diseases:
            profile = WeatherDiseaseRiskCalculator.DISEASE_RISK_PROFILES.get(disease_name)
            if not profile:
                continue
            
            # Calculate risk based on weather conditions
            risk_level = WeatherDiseaseRiskCalculator._calculate_risk_level(
                disease_name,
                profile,
                weather_data
            )
            
            risk_assessments.append({
                "name": disease_name,
                "risk_level": risk_level,
                "risk_score": WeatherDiseaseRiskCalculator._get_risk_score(risk_level),
                "contributing_factors": WeatherDiseaseRiskCalculator._get_risk_factors(
                    disease_name,
                    profile,
                    weather_data
                ),
                "advisory": WeatherDiseaseRiskCalculator._get_disease_advisory(
                    disease_name,
                    risk_level,
                    weather_data
                )
            })
        
        return risk_assessments
    
    @staticmethod
    def _calculate_risk_level(disease_name, profile, weather_data):
        """Calculate risk level based on environmental conditions"""
        temp = weather_data.get("temperature_celsius", 25)
        humidity = weather_data.get("humidity_percent", 70)
        rainfall = weather_data.get("rainfall_mm", 5)
        current_month = datetime.now().month
        
        # Base risk from season
        base_risk = profile.get("base_risk", "Moderate")
        
        # Temperature check
        opt_temp_min, opt_temp_max = profile["optimal_temp"]
        temp_factor = 1.0
        if opt_temp_min <= temp <= opt_temp_max:
            temp_factor = 1.3  # Optimal conditions increase risk
        elif abs(temp - opt_temp_min) < 5 or abs(temp - opt_temp_max) < 5:
            temp_factor = 1.1  # Near-optimal conditions
        else:
            temp_factor = 0.8  # Sub-optimal conditions reduce risk
        
        # Humidity check
        humidity_factor = 1.0
        if humidity > profile["humidity_threshold"]:
            humidity_factor = 1.4  # High humidity significantly increases risk
        elif humidity > profile["humidity_threshold"] - 10:
            humidity_factor = 1.2  # Moderately high humidity
        else:
            humidity_factor = 0.9  # Low humidity reduces risk
        
        # Rainfall factor
        rainfall_factor = 1.0
        if profile["rainfall_factor"] and rainfall > 5:
            rainfall_factor = 1.3  # Rainfall increases risk
        
        # Seasonal factor
        seasonal_factor = 1.3 if current_month in profile["peak_season"] else 0.9
        
        # Calculate combined risk score
        combined_factor = temp_factor * humidity_factor * rainfall_factor * seasonal_factor
        
        # Determine risk level
        if base_risk == "High":
            if combined_factor > 1.4:
                return "Critical"
            elif combined_factor > 1.1:
                return "High"
            else:
                return "Moderate"
        elif base_risk == "Moderate":
            if combined_factor > 1.5:
                return "Severe"
            elif combined_factor > 1.2:
                return "High"
            elif combined_factor > 0.9:
                return "Moderate"
            else:
                return "Low"
        else:
            return "Low"
    
    @staticmethod
    def _get_risk_score(risk_level):
        """Convert risk level to numeric score (0-100)"""
        scores = {
            "Critical": 95,
            "Severe": 85,
            "High": 70,
            "Moderate": 50,
            "Low": 30
        }
        return scores.get(risk_level, 50)
    
    @staticmethod
    def _get_risk_factors(disease_name, profile, weather_data):
        """Identify which weather factors are contributing to disease risk"""
        factors = []
        
        temp = weather_data.get("temperature_celsius", 25)
        opt_temp_min, opt_temp_max = profile["optimal_temp"]
        
        if opt_temp_min <= temp <= opt_temp_max:
            factors.append(f"Optimal temperature ({temp}°C) for disease development")
        
        humidity = weather_data.get("humidity_percent", 70)
        if humidity > profile["humidity_threshold"]:
            factors.append(f"High humidity ({humidity}%) favors pathogen spread")
        
        rainfall = weather_data.get("rainfall_mm", 0)
        if profile["rainfall_factor"] and rainfall > 5:
            factors.append(f"Recent rainfall ({rainfall}mm) increases infection risk")
        
        current_month = datetime.now().month
        if current_month in profile["peak_season"]:
            factors.append(f"Currently in peak disease season ({profile.get('peak_season_name', 'Monsoon')})")
        
        return factors if factors else ["General seasonal risk"]
    
    @staticmethod
    def _get_disease_advisory(disease_name, risk_level, weather_data):
        """Generate actionable advisory based on disease risk"""
        temp = weather_data.get("temperature_celsius", 25)
        humidity = weather_data.get("humidity_percent", 70)
        
        advisories = {
            "Rice Blast": {
                "Critical": f"URGENT: Immediate fungicide application required. Current conditions (T:{temp}°C, H:{humidity}%) are ideal for rapid spread.",
                "Severe": f"Apply preventive fungicide within 48 hours. Avoid overhead irrigation.",
                "High": f"Monitor closely. Apply Tricyclazole 75% WP @ 0.6g/L if symptoms appear.",
                "Moderate": "Monitor for initial symptoms. Maintain field sanitation.",
                "Low": "Routine monitoring sufficient."
            },
            "Bacterial Leaf Blight": {
                "Critical": "URGENT: Apply Streptocycline + Copper oxychloride immediately.",
                "Severe": "Apply bactericide within 48 hours. Avoid spreading through irrigation.",
                "High": "Increase monitoring frequency. Prune infected leaves if limited spread.",
                "Moderate": "Monitor field daily. Remove infected plants immediately.",
                "Low": "Routine monitoring only."
            },
            "Finger Millet Blast": {
                "Critical": "URGENT: Apply Carbendazim 50% WP @ 1g/L immediately.",
                "Severe": "Apply fungicide within 48 hours. Critical at flowering stage.",
                "High": "Monitor closely around ear emergence.",
                "Moderate": "Preventive spray recommended.",
                "Low": "Routine monitoring."
            },
            "Coffee Leaf Rust": {
                "Critical": "SEVERE THREAT: Apply Bordeaux mixture or Copper oxychloride immediately. Increase spray frequency.",
                "Severe": "Apply fungicide every 10 days during monsoon.",
                "High": "Apply preventive spray. Avoid wet foliage practices.",
                "Moderate": "Monitor closely. Ensure good shade management.",
                "Low": "Continue routine shade management and monitoring."
            },
            "Red Rot": {
                "Critical": "URGENT: Use resistant varieties for new plantings. Destroy affected plants.",
                "Severe": "Strict field sanitation. Remove and destroy symptomatic stools.",
                "High": "Improve drainage to reduce waterlogging.",
                "Moderate": "Monitor for stress. Maintain optimal water management.",
                "Low": "Maintain normal cultural practices."
            }
        }
        
        disease_advice = advisories.get(disease_name, {})
        return disease_advice.get(risk_level, "Monitor field regularly")


def get_crop_disease_risks(crop_name):
    """Convenience function to get disease risks for a crop"""
    weather = WeatherDiseaseRiskCalculator.get_simulated_weather()
    return {
        "crop": crop_name,
        "weather": weather,
        "diseases": WeatherDiseaseRiskCalculator.calculate_disease_risk(crop_name, weather)
    }
