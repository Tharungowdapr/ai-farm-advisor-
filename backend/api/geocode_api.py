import requests
from config.settings import OPENWEATHER_API_KEY

def get_coordinates(city):
    result = _try_openweather(city)
    if result and not (isinstance(result, dict) and "error" in result):
        return result
    result = _try_openmeteo(city)
    if result and not (isinstance(result, dict) and "error" in result):
        return result
    return {"error": "Could not find coordinates. Try a major Indian city."}

def _try_openweather(city):
    if not OPENWEATHER_API_KEY:
        return None
    try:
        url = f"http://api.openweathermap.org/geo/1.0/direct?q={city},IN&limit=5&appid={OPENWEATHER_API_KEY}"
        res = requests.get(url, timeout=10).json()
        if not res:
            return None
        for place in res:
            if place["country"] == "IN" and city.lower() in place["name"].lower():
                return place["lat"], place["lon"]
        for place in res:
            if place["country"] == "IN":
                return place["lat"], place["lon"]
    except:
        pass
    return None

def _try_openmeteo(city):
    try:
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=5&language=en&format=json"
        res = requests.get(url, timeout=10).json()
        for r in res.get("results", []):
            country = r.get("country_code", "")
            if country == "IN":
                return r["latitude"], r["longitude"]
        if res.get("results"):
            r = res["results"][0]
            return r["latitude"], r["longitude"]
    except:
        pass
    return None

def search_cities(query):
    """Search for Indian cities matching the query"""
    try:
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={query}&count=10&language=en&format=json"
        res = requests.get(url, timeout=10).json()
        cities = []
        for r in res.get("results", []):
            if r.get("country_code") == "IN":
                name = r["name"]
                admin1 = r.get("admin1", "")
                display = f"{name}, {admin1}" if admin1 else name
                cities.append({
                    "name": name,
                    "display": display,
                    "lat": r["latitude"],
                    "lon": r["longitude"],
                    "state": admin1
                })
        return cities
    except:
        return []
