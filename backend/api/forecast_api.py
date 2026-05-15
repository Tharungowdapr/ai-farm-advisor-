import requests
from config.settings import OPENWEATHER_API_KEY

def get_forecast(lat, lon):
    try:
        url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return None
        res = response.json()
        if "list" not in res:
            return None
        temps = []
        rainfall = []
        for item in res["list"][:10]:
            temps.append(item["main"]["temp"])
            rain = item.get("rain", {}).get("3h", 0)
            rainfall.append(rain)
        if not temps:
            return None
        return {
            "avg_temp": sum(temps) / len(temps),
            "total_rainfall": sum(rainfall)
        }
    except Exception as e:
        print("Forecast API error:", e)
        return None
