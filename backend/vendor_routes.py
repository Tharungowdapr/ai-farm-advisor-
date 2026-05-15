from flask import Blueprint, request, jsonify
from negotiator_routes import call_openrouter
import math
import random
import urllib.parse
import requests
import re

vendor_bp = Blueprint('vendor_bp', __name__)

MANDIS = [
    {"name": "APMC Yeshwanthpur (Bengaluru)", "lat": 13.0334, "lon": 77.5385, "rating": 4.8},
    {"name": "APMC Tumkur", "lat": 13.3379, "lon": 77.1173, "rating": 4.5},
    {"name": "APMC Mysore", "lat": 12.2602, "lon": 76.6521, "rating": 4.6},
    {"name": "APMC Hubli", "lat": 15.3647, "lon": 75.1240, "rating": 4.7},
    {"name": "APMC Belagavi", "lat": 15.8497, "lon": 74.4977, "rating": 4.4},
    {"name": "APMC Raichur", "lat": 16.2076, "lon": 77.3463, "rating": 4.2},
    {"name": "APMC Hassan", "lat": 13.0033, "lon": 76.1004, "rating": 4.5},
    {"name": "APMC Davanagere", "lat": 14.4644, "lon": 75.9218, "rating": 4.3},
    {"name": "APMC Chitradurga", "lat": 14.2251, "lon": 76.4010, "rating": 4.1},
    {"name": "APMC Shimoga", "lat": 13.9299, "lon": 75.5681, "rating": 4.6},
    {"name": "APMC Mandya", "lat": 12.5218, "lon": 76.8951, "rating": 4.5},
    {"name": "APMC Bellary", "lat": 15.1394, "lon": 76.9214, "rating": 4.4},
]

CROP_PRICES = {
    "Paddy": 22, "Wheat": 28, "Tomato": 35, "Potato": 25, "Onion": 30,
    "Maize": 20, "Sugarcane": 3, "Cotton": 70, "Ragi": 35, "Arecanut": 400,
    "Coffee": 300, "Soybean": 45, "Grape": 80, "Orange": 50, "Apple": 120,
    "Sunflower": 60, "Mustard": 55, "Barley": 24, "Jowar": 28, "Bajra": 25,
    "Capsicum": 45
}

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def geocode_location(loc_str):
    # Check if string has Lat: ... Lon: ...
    match = re.search(r"Lat:\s*([\d\.\-]+).*?Lon:\s*([\d\.\-]+)", loc_str, re.IGNORECASE)
    if match:
        return float(match.group(1)), float(match.group(2))
    
    # Try Nominatim search
    try:
        headers = {"User-Agent": "KrishiSync/1.0"}
        url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(loc_str)}&format=json&limit=1"
        res = requests.get(url, headers=headers).json()
        if res:
            return float(res[0]['lat']), float(res[0]['lon'])
    except:
        pass
    
    return 12.9716, 77.5946 # Default to Bangalore

@vendor_bp.route("/find", methods=["POST"])
def find_vendors():
    data = request.json or {}
    crop = data.get("crop", "Paddy")
    location = data.get("location", "Karnataka")
    try:
        quantity_kg = float(data.get("quantity", 100))
    except ValueError:
        quantity_kg = 100
        
    try:
        user_lat, user_lon = geocode_location(location)
        
        # Calculate distances to all hardcoded mandis
        scored_mandis = []
        for m in MANDIS:
            dist = haversine(user_lat, user_lon, m["lat"], m["lon"])
            scored_mandis.append({**m, "distance_km": dist})
            
        # Sort by closest and pick top 3
        scored_mandis.sort(key=lambda x: x["distance_km"])
        nearest_mandis = scored_mandis[:3]
        
        vendors = []
        base_price = CROP_PRICES.get(crop, 40)
        
        for idx, m in enumerate(nearest_mandis):
            # Create slight variations in price based on distance/randomness to make it realistic
            price_variation = random.uniform(-1.0, 3.0)
            if idx == 0:
                price_variation += 1.5 # Closest mandi pays slightly more sometimes
                
            price = max(1, round(base_price + price_variation, 2))
            
            vendors.append({
                "vendor_name": m["name"],
                "distance_km": round(m["distance_km"], 1),
                "buying_price_per_kg": price,
                "rating": m["rating"]
            })
        
        # Calculate proper transport cost based on Indian logistics
        def calculate_transport(dist_km, qty_kg):
            if qty_kg <= 50:
                # Can be transported via two-wheeler
                return dist_km * 2.5 # ₹2.5 per km fuel
            else:
                # Requires a small truck (e.g. Tata Ace, capacity ~750kg)
                truck_capacity = 750
                num_trucks = math.ceil(qty_kg / truck_capacity)
                base_loading_fee = 150
                per_km_rate = 14 # ₹14 per km per truck
                return (base_loading_fee + (dist_km * per_km_rate)) * num_trucks
        
        for v in vendors:
            # Enforce numeric
            v["distance_km"] = float(v.get("distance_km", 10))
            v["buying_price_per_kg"] = float(v.get("buying_price_per_kg", 20))
            
            v["transport_cost"] = round(calculate_transport(v["distance_km"], quantity_kg))
            v["gross_revenue"] = round(v["buying_price_per_kg"] * quantity_kg)
            v["net_profit"] = v["gross_revenue"] - v["transport_cost"]
            
        # Sort by net profit descending
        vendors.sort(key=lambda x: x["net_profit"], reverse=True)
        
        return jsonify({"success": True, "vendors": vendors, "best_vendor": vendors[0] if vendors else None})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
