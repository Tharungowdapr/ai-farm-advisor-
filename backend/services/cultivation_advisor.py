"""
Real-Time Cultivation Timing Advisor
Provides weather-based and season-based cultivation recommendations
"""

import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class CultivationAdvisor:
    """Provides real-time cultivation recommendations based on seasonal and weather conditions"""
    
    # Crop-specific cultivation calendars for Karnataka
    CULTIVATION_CALENDAR = {
        "Paddy": {
            "seasons": {
                "Kharif": {
                    "months": [6, 7, 8, 9, 10],
                    "nursery": "June-July",
                    "transplanting": "July-August",
                    "flowering": "September-October",
                    "maturity": "October-November",
                    "water_requirement": "120-150 cm",
                    "optimal_temp": "25-30°C"
                },
                "Rabi": {
                    "months": [11, 12, 1, 2, 3],
                    "nursery": "November",
                    "transplanting": "December",
                    "flowering": "January-February",
                    "maturity": "February-March",
                    "water_requirement": "80-100 cm",
                    "optimal_temp": "20-25°C"
                }
            }
        },
        "Ragi": {
            "seasons": {
                "Kharif": {
                    "months": [6, 7, 8, 9],
                    "sowing": "June-July",
                    "germination": "July",
                    "tillering": "July-August",
                    "flowering": "September",
                    "maturity": "September-October",
                    "water_requirement": "50-60 cm",
                    "optimal_temp": "20-30°C"
                }
            }
        },
        "Coffee": {
            "seasons": {
                "Perennial": {
                    "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                    "flowering": "March-April",
                    "fruit_development": "April-August",
                    "harvest": "December-February",
                    "water_requirement": "150-250 cm",
                    "optimal_temp": "15-24°C",
                    "shade_requirement": "High (40-50%)"
                }
            }
        },
        "Sugarcane": {
            "seasons": {
                "Annual": {
                    "months": [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                    "planting": "October-November",
                    "germination": "November-December",
                    "growth": "December-August",
                    "maturity": "August-September",
                    "harvest": "September-March",
                    "water_requirement": "180-250 cm",
                    "optimal_temp": "20-35°C"
                }
            }
        },
        "Tomato": { "seasons": { "Kharif": { "months": [6, 7, 8, 9, 10], "nursery": "June" } } },
        "Potato": { "seasons": { "Rabi": { "months": [10, 11, 12, 1, 2], "planting": "October" } } },
        "Maize": { "seasons": { "Kharif": { "months": [6, 7, 8, 9, 10], "sowing": "June" } } },
        "Capsicum": { "seasons": { "Kharif": { "months": [6, 7, 8, 9, 10], "seedling": "June" } } },
        "Soybean": { "seasons": { "Kharif": { "months": [6, 7, 8, 9], "sowing": "June" } } },
        "Grape": { "seasons": { "Perennial": { "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "pruning": "April/Oct" } } },
        "Orange": { "seasons": { "Perennial": { "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "flowering": "Feb" } } },
        "Apple": { "seasons": { "Perennial": { "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "dormancy": "Dec-Jan" } } }
    }
    
    # Stage-specific operations and recommendations
    STAGE_OPERATIONS = {
        "nursery": {
            "operations": ["Seed selection", "Bed preparation", "Sowing", "Irrigation"],
            "frequency": "Daily monitoring",
            "concerns": ["Seed viability", "Damping off disease", "Bird predation"]
        },
        "sowing": {
            "operations": ["Land preparation", "Sowing in lines", "Initial irrigation"],
            "frequency": "Weekly monitoring",
            "concerns": ["Soil moisture", "Pest attacks", "Germination failure"]
        },
        "germination": {
            "operations": ["Irrigation", "Weed management", "Pest monitoring"],
            "frequency": "3-4 times per week",
            "concerns": ["Soil crust formation", "Cutworms", "Seedling mortality"]
        },
        "tillering": {
            "operations": ["Irrigation", "Fertilizer application", "Weed removal"],
            "frequency": "Weekly",
            "concerns": ["Nutrient deficiency", "Weed competition", "Disease initiation"]
        },
        "flowering": {
            "operations": ["Irrigation at panicle initiation", "Disease spray", "Nutrient spray"],
            "frequency": "Twice weekly",
            "concerns": ["Stem rot", "Blast disease", "Flower abortion"]
        },
        "maturity": {
            "operations": ["Final irrigation", "Monitoring for readiness", "Harvesting preparation"],
            "frequency": "Weekly",
            "concerns": ["Grain quality", "Weather damage", "Pest late infestation"]
        }
    }
    
    @staticmethod
    def get_current_cultivation_stage(crop_name):
        """Determine current crop stage based on season and date"""
        current_month = datetime.now().month
        current_day = datetime.now().day
        
        calendar = CultivationAdvisor.CULTIVATION_CALENDAR.get(crop_name)
        if not calendar:
            return None
        
        # Determine active season
        active_season = None
        for season, details in calendar.get("seasons", {}).items():
            if current_month in details.get("months", []):
                active_season = season
                season_details = details
                break
        
        if not active_season:
            return {
                "crop": crop_name,
                "status": "Off-season",
                "advisory": "Not the ideal planting season for this region"
            }
        
        # Determine growth stage within season
        stage = CultivationAdvisor._determine_growth_stage(crop_name, active_season, current_month, current_day)
        
        return {
            "crop": crop_name,
            "season": active_season,
            "current_month": datetime.now().strftime("%B"),
            "current_stage": stage["name"],
            "days_in_stage": stage["days_elapsed"],
            "days_remaining": stage["days_remaining"],
            "operations": CultivationAdvisor.STAGE_OPERATIONS.get(stage["name"], {}).get("operations", []),
            "monitoring_frequency": CultivationAdvisor.STAGE_OPERATIONS.get(stage["name"], {}).get("frequency", ""),
            "key_concerns": CultivationAdvisor.STAGE_OPERATIONS.get(stage["name"], {}).get("concerns", [])
        }
    
    @staticmethod
    def _determine_growth_stage(crop_name, season, current_month, current_day):
        """Determine the specific growth stage within a season"""
        # Simplified stage determination based on month
        # In production, this would track actual planting date
        
        stage_timeline = {
            "Paddy": {
                "Kharif": [
                    ("nursery", 45),
                    ("transplanting", 30),
                    ("tillering", 30),
                    ("flowering", 30),
                    ("maturity", 30)
                ],
                "Rabi": [
                    ("nursery", 40),
                    ("transplanting", 30),
                    ("tillering", 40),
                    ("flowering", 20),
                    ("maturity", 30)
                ]
            },
            "Ragi": {
                "Kharif": [
                    ("sowing", 15),
                    ("germination", 15),
                    ("tillering", 45),
                    ("flowering", 20),
                    ("maturity", 25)
                ]
            },
            "Coffee": {
                "Perennial": [
                    ("flowering", 30),
                    ("fruit_development", 120),
                    ("harvest", 60)
                ]
            },
            "Sugarcane": {
                "Annual": [
                    ("planting", 30),
                    ("germination", 60),
                    ("growth", 180),
                    ("maturity", 30)
                ]
            },
            "Tomato": { "Kharif": [("nursery", 25), ("vegetative", 45), ("flowering", 35), ("harvest", 30)] },
            "Potato": { "Rabi": [("planting", 20), ("vegetative", 30), ("tuberization", 25), ("maturation", 15)] },
            "Maize": { "Kharif": [("seedling", 15), ("vegetative", 35), ("reproductive", 25), ("maturity", 35)] },
            "Capsicum": { "Kharif": [("seedling", 35), ("vegetative", 40), ("fruiting", 75)] },
            "Soybean": { "Kharif": [("vegetative", 35), ("reproductive", 40), ("maturity", 25)] },
            "Grape": { "Perennial": [("pruning", 20), ("flowering", 30), ("development", 60), ("harvest", 30)] },
            "Orange": { "Perennial": [("flushing", 45), ("fruit_set", 60), ("development", 120), ("harvest", 45)] },
            "Apple": { "Perennial": [("dormancy", 30), ("bloom", 30), ("fruit_dev", 90), ("harvest", 30)] }
        }
        
        timeline = stage_timeline.get(crop_name, {}).get(season, [])
        
        if not timeline:
            return {"name": "Unknown", "days_elapsed": 0, "days_remaining": 0}
        
        # Simulate stage progression
        total_days = sum([days for _, days in timeline])
        day_of_season = current_day
        
        days_counted = 0
        for stage_name, stage_duration in timeline:
            days_counted += stage_duration
            if current_day <= days_counted:
                days_in_stage = current_day - (days_counted - stage_duration)
                days_remaining = total_days - days_counted + stage_duration
                return {
                    "name": stage_name,
                    "days_elapsed": days_in_stage,
                    "days_remaining": max(0, days_remaining)
                }
        
        return {"name": "Maturity", "days_elapsed": total_days, "days_remaining": 0}
    
    @staticmethod
    def get_weather_based_recommendations(crop_name, weather_data):
        """
        Generate cultivation recommendations based on current weather conditions
        """
        stage_info = CultivationAdvisor.get_current_cultivation_stage(crop_name)
        
        # Check if it's off-season
        if stage_info.get("status") == "Off-season":
            return {
                "crop": crop_name,
                "status": "Off-season",
                "recommendation": "This is not the ideal season for cultivation. Plan for the next season."
            }
        
        # Check if we have a current stage key
        if "current_stage" not in stage_info:
            return {
                "crop": crop_name,
                "status": "Unable to determine cultivation stage",
                "recommendation": "Check crop calendar for your region."
            }
        
        temp = weather_data.get("temperature_celsius", 25)
        humidity = weather_data.get("humidity_percent", 70)
        rainfall = weather_data.get("rainfall_mm", 0)
        
        recommendations = {
            "crop": crop_name,
            "season": stage_info.get("season", "Unknown"),
            "current_stage": stage_info["current_stage"],
            "weather_assessment": CultivationAdvisor._assess_weather_suitability(crop_name, temp, humidity, rainfall),
            "immediate_actions": CultivationAdvisor._get_immediate_actions(
                crop_name,
                stage_info["current_stage"],
                temp,
                humidity,
                rainfall
            ),
            "water_management": CultivationAdvisor._get_water_management_advice(
                crop_name,
                stage_info["current_stage"],
                humidity,
                rainfall
            ),
            "nutrition_timing": CultivationAdvisor._get_nutrition_timing(
                crop_name,
                stage_info["current_stage"],
                temp
            ),
            "disease_prevention": CultivationAdvisor._get_disease_prevention_measures(
                crop_name,
                stage_info["current_stage"],
                humidity,
                rainfall
            )
        }
        
        return recommendations
    
    @staticmethod
    def _assess_weather_suitability(crop_name, temp, humidity, rainfall):
        """Assess if current weather is suitable for the crop"""
        crop_requirements = {
            "Paddy": {"temp": (25, 35), "humidity_min": 70},
            "Ragi": {"temp": (20, 30), "humidity_min": 60},
            "Coffee": {"temp": (15, 24), "humidity_min": 70},
            "Sugarcane": {"temp": (20, 35), "humidity_min": 60}
        }
        
        requirements = crop_requirements.get(crop_name)
        if not requirements:
            return "Unknown requirements"
        
        temp_min, temp_max = requirements["temp"]
        humidity_min = requirements["humidity_min"]
        
        assessment = []
        
        if temp_min <= temp <= temp_max:
            assessment.append(f"Temperature ({temp}°C) is OPTIMAL")
        elif temp < temp_min:
            assessment.append(f"Temperature ({temp}°C) is below optimal ({temp_min}°C)")
        else:
            assessment.append(f"Temperature ({temp}°C) is above optimal ({temp_max}°C)")
        
        if humidity >= humidity_min:
            assessment.append(f"Humidity ({humidity}%) is suitable")
        else:
            assessment.append(f"Humidity ({humidity}%) is low - may need supplementary irrigation")
        
        return " | ".join(assessment)
    
    @staticmethod
    def _get_immediate_actions(crop_name, stage, temp, humidity, rainfall):
        """Get immediate actions based on current conditions"""
        actions = []
        
        if stage == "nursery":
            if humidity < 60:
                actions.append("Increase irrigation frequency to maintain seedbed moisture")
            actions.append("Check for damping off disease - ensure good drainage")
            
        elif stage == "transplanting":
            if temp < 20:
                actions.append("Delay transplanting until temperature improves")
            else:
                actions.append("Ideal conditions for transplanting - proceed")
                
        elif stage in ["tillering", "flowering"]:
            if humidity > 85:
                actions.append("Ensure adequate drainage - monitor for fungal diseases")
            if rainfall > 10:
                actions.append("Post-rain: Inspect for storm damage and lodging risk")
                
        elif stage == "maturity":
            if rainfall > 5:
                actions.append("Avoid harvesting in wet conditions - wait for field to dry")
            actions.append("Begin monitoring for grain ripeness - harvest when ready")
        
        return actions if actions else ["Continue routine field management"]
    
    @staticmethod
    def _get_water_management_advice(crop_name, stage, humidity, rainfall):
        """Get water management recommendations"""
        advice = []
        
        water_needs = {
            "nursery": "High (70-80% soil moisture)",
            "sowing": "High (field saturated)",
            "germination": "Moderate-High (keep moist)",
            "tillering": "Moderate (standing water 5-10cm)",
            "flowering": "High (critical stage - maintain water)",
            "maturity": "Low (allow drying)"
        }
        
        base_need = water_needs.get(stage, "Moderate")
        advice.append(f"Stage requirement: {base_need}")
        
        if humidity < 50:
            advice.append("Low humidity - increase irrigation frequency")
        elif humidity > 85:
            advice.append("High humidity - reduce irrigation to prevent disease")
        
        if rainfall > 10:
            advice.append("Recent heavy rainfall - assess drainage and avoid waterlogging")
        elif rainfall < 2:
            advice.append("No recent rain - monitor soil moisture closely")
        
        return advice
    
    @staticmethod
    def _get_nutrition_timing(crop_name, stage, temp):
        """Get fertilizer application timing"""
        advice = []
        
        nutrition_schedule = {
            "nursery": "Base fertilizer before sowing - avoid excess nitrogen",
            "germination": "Begin light nitrogen if growth is slow",
            "tillering": "Main nitrogen application (40-50% of dose)",
            "flowering": "Stop nitrogen - use potassium if needed",
            "maturity": "No fertilizer application"
        }
        
        advice.append(nutrition_schedule.get(stage, "Standard application"))
        
        if temp > 35:
            advice.append("High temperature - avoid foliar spray, apply in early morning/evening")
        elif temp < 15:
            advice.append("Low temperature - nutrient uptake reduced, increase concentration slightly")
        
        return advice
    
    @staticmethod
    def _get_disease_prevention_measures(crop_name, stage, humidity, rainfall):
        """Get disease prevention recommendations"""
        measures = []
        
        if humidity > 85:
            measures.append("High humidity - increase air circulation, reduce canopy density")
        
        if rainfall > 5:
            measures.append("After rain: Scout for fungal diseases within 2-3 days")
        
        stage_risks = {
            "nursery": "Watch for damping off - ensure drainage",
            "germination": "Monitor for leaf spots and seedling disease",
            "tillering": "Disease pressure increasing - scout regularly",
            "flowering": "Peak disease risk - maintain protective cover crops/sprays",
            "maturity": "Grain quality at risk - prevent late blight/rot"
        }
        
        measures.append(stage_risks.get(stage, "Regular disease monitoring"))
        
        return measures


def get_cultivation_advisory(crop_name, weather_data):
    """Convenience function to get complete cultivation advisory"""
    return CultivationAdvisor.get_weather_based_recommendations(crop_name, weather_data)
