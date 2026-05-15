import requests
from config.settings import WEATHERBIT_API_KEY

def get_historical_weather(lat, lon, start_date, end_date):
    try:
        url = f"https://api.weatherbit.io/v2.0/history/daily?lat={lat}&lon={lon}&start_date={start_date}&end_date={end_date}&key={WEATHERBIT_API_KEY}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        res = response.json()
        data = res.get("data")
        if not data or not isinstance(data, list) or len(data) == 0:
            return None
        avg_temp = sum(d.get("temp", 0) for d in data) / len(data)
        total_rain = sum(d.get("precip", 0) for d in data)
        avg_humidity = sum(d.get("rh", 50) for d in data) / len(data)
        return {"temperature": avg_temp, "rainfall": total_rain, "humidity": avg_humidity}
    except Exception as e:
        print(f"[history_api] Error: {e}")
        return None
