"""
Real Weather Data Fetcher
=========================
Unified module for fetching live weather data from OpenWeatherMap API
with graceful fallback to simulated / seasonal data.

Uses the existing api/weather_api.py and api/forecast_api.py when API key
is configured, otherwise falls back to season-based simulated weather
matching the same response format.
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def get_weather_for_location(city_name, lat=None, lon=None):
    """
    Fetch real weather data for a given city or coordinates.

    Priority:
      1. OpenWeatherMap API (real) if API key is available
      2. Simulated seasonal weather (fallback)

    Returns dict with keys:
      temperature  : float (°C)
      humidity     : float (%)
      rainfall     : float (mm)
      source       : str
    """
    # Try real API first
    try:
        from api.weather_api import get_weather as _real_weather
        from api.geocode_api import get_coordinates

        if lat is None or lon is None:
            coords = get_coordinates(city_name)
            if isinstance(coords, (list, tuple)) and len(coords) == 2:
                lat, lon = coords
            else:
                logger.warning(f"Geocode failed for {city_name}, falling back to simulated")
                return _simulated_weather()

        if lat is not None and lon is not None:
            weather = _real_weather(lat, lon)
            if weather and weather.get("temperature") is not None:
                logger.info(f"Real weather fetched for {city_name} ({lat},{lon})")
                return {
                    "temperature": weather["temperature"],
                    "humidity": weather["humidity"],
                    "rainfall": weather.get("rainfall", 0),
                    "source": "OpenWeatherMap (Real)"
                }
    except Exception as e:
        logger.warning(f"Real weather fetch failed: {e}")

    logger.info(f"Using simulated weather fallback")
    return _simulated_weather()


def get_forecast_for_location(city_name, lat=None, lon=None):
    """
    Fetch 5-day weather forecast for a location.

    Returns dict with keys:
      avg_temp       : float
      total_rainfall : float
      source         : str
    """
    try:
        from api.forecast_api import get_forecast as _real_forecast
        from api.geocode_api import get_coordinates

        if lat is None or lon is None:
            coords = get_coordinates(city_name)
            if isinstance(coords, (list, tuple)) and len(coords) == 2:
                lat, lon = coords
            else:
                return _simulated_forecast()

        if lat is not None and lon is not None:
            forecast = _real_forecast(lat, lon)
            if forecast and forecast.get("avg_temp") is not None:
                logger.info(f"Real forecast fetched for {city_name}")
                return {
                    "avg_temp": forecast["avg_temp"],
                    "total_rainfall": forecast["total_rainfall"],
                    "source": "OpenWeatherMap Forecast (Real)"
                }
    except Exception as e:
        logger.warning(f"Real forecast fetch failed: {e}")

    return _simulated_forecast()


def _simulated_weather():
    """Fallback: generate season-appropriate simulated weather."""
    month = datetime.now().month
    day = datetime.now().day

    if month in [6, 7, 8, 9]:      # Monsoon
        return {
            "temperature": round(26 + (day % 10 - 5), 1),
            "humidity": round(85 + (day % 10 - 5), 1),
            "rainfall": round(10 + (day % 30 // 3), 2),
            "source": "Simulated (Monsoon Profile)"
        }
    elif month in [3, 4, 5]:        # Summer
        return {
            "temperature": round(32 + (day % 10 - 5), 1),
            "humidity": round(45 + (day % 10 - 5), 1),
            "rainfall": round(0.5 + (day % 10 / 20), 2),
            "source": "Simulated (Summer Profile)"
        }
    else:                            # Winter
        return {
            "temperature": round(20 + (day % 10 - 5), 1),
            "humidity": round(50 + (day % 10 - 5), 1),
            "rainfall": round(0.2 + (day % 10 / 50), 2),
            "source": "Simulated (Winter Profile)"
        }


def _simulated_forecast():
    """Fallback: generate simulated 5-day forecast."""
    month = datetime.now().month
    day = datetime.now().day

    if month in [6, 7, 8, 9]:
        return {"avg_temp": 27.5, "total_rainfall": 45.0, "source": "Simulated (Monsoon Forecast)"}
    elif month in [3, 4, 5]:
        return {"avg_temp": 34.0, "total_rainfall": 5.0, "source": "Simulated (Summer Forecast)"}
    else:
        return {"avg_temp": 22.0, "total_rainfall": 2.0, "source": "Simulated (Winter Forecast)"}
