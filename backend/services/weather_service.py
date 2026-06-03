import requests
import logging

logger = logging.getLogger(__name__)

def fetch_open_meteo_raw(lat, lon):
    """Fetches raw data from Open-Meteo API."""
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto"
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception as e:
        logger.error(f"OpenMeteo Fetch Error: {e}")
        return None
