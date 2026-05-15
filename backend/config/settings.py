"""
Environment variable loader.
API keys are now managed through the Settings page (saved to settings/user_settings.json).

The Groq API key can be:
1. Set in Settings page UI (recommended)
2. Set via GROQ_API_KEY env var (fallback)

Weather API keys are still loaded from .env:
- OPENWEATHER_API_KEY — for current weather + forecast + geocoding
- WEATHERBIT_API_KEY — for historical weather data
"""
import os
from dotenv import load_dotenv

load_dotenv()

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
WEATHERBIT_API_KEY = os.getenv("WEATHERBIT_API_KEY", "")

BASE_URL_OPENWEATHER = "https://api.openweathermap.org/data/2.5/weather"
BASE_URL_WEATHERBIT = "https://api.weatherbit.io/v2.0/history/daily"
