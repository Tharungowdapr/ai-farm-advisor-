import requests
from config.settings import OPENWEATHER_API_KEY

def get_weather(lat, lon):
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return None
        res = response.json()
        if "main" not in res:
            return None
        return {
            "temperature": res["main"]["temp"],
            "humidity": res["main"]["humidity"],
            "rainfall": res.get("rain", {}).get("1h", 0)
        }
    except Exception as e:
        print("Weather API exception:", e)
        return None
