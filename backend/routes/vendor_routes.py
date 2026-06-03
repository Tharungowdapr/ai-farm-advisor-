from services.msp_fetcher import MSPFetcher
from services.llm_service import LLMService
from flask import Blueprint, request, jsonify
import math
import random
import urllib.parse
import requests
import re
import logging

logger = logging.getLogger(__name__)
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
    match = re.search(r"Lat:\s*([\d\.\-]+).*?Lon:\s*([\d\.\-]+)", loc_str, re.IGNORECASE)
    if match:
        return float(match.group(1)), float(match.group(2))
    try:
        headers = {"User-Agent": "KrishiSync/1.0"}
        url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(loc_str)}&format=json&limit=1"
        res = requests.get(url, headers=headers).json()
        if res:
            return float(res[0]['lat']), float(res[0]['lon'])
    except:
        pass
    return 12.9716, 77.5946 

@vendor_bp.route("/find", methods=["POST"])
def find_vendors():
    from app import call_llm
    data = request.json or {}
    crop = data.get("crop", "Paddy")
    location = data.get("location", "Karnataka")
    qty_kg = float(data.get("quantity", 100))
    
    try:
        user_lat, user_lon = geocode_location(location)
        
        # 1. Accurate Pricing from MSPFetcher
        msp_info = MSPFetcher.fetch_live_msp(crop)
        # Convert string like "₹2,350" to float per kg
        price_str = msp_info["msp"].replace("₹", "").replace(",", "")
        base_price_quintal = float(price_str)
        base_price_kg = base_price_quintal / 100.0 if "Quintal" in msp_info.get("unit", "Quintal") else base_price_quintal
        
        # 2. Regional Analysis (Most grown crops) using LLM
        regional_prompt = f"Identify the top 3 most commonly grown crops in the region of {location}, Karnataka. Return ONLY a comma-separated list."
        most_grown = call_llm(regional_prompt, max_tokens=50).strip().split(",")
        
        # 3. Mandi Logic
        scored_mandis = []
        for m in MANDIS:
            dist = haversine(user_lat, user_lon, m["lat"], m["lon"])
            scored_mandis.append({**m, "distance_km": dist})
        scored_mandis.sort(key=lambda x: x["distance_km"])
        
        vendors = []
        for idx, m in enumerate(scored_mandis[:4]):
            price_var = random.uniform(0.95, 1.15)
            buying_price = round(base_price_kg * price_var, 2)
            
            # Transport Cost Calculation
            if qty_kg <= 100:
                transport = m["distance_km"] * 3.5 
            else:
                num_trucks = math.ceil(qty_kg / 800)
                transport = (250 + (m["distance_km"] * 12)) * num_trucks
            
            gross = round(buying_price * qty_kg)
            net = round(gross - transport)
            
            vendors.append({
                "vendor_name": m["name"],
                "distance_km": round(m["distance_km"], 1),
                "buying_price_per_kg": buying_price,
                "rating": m["rating"],
                "transport_cost": round(transport),
                "gross_revenue": gross,
                "net_profit": net,
                "is_msp_linked": msp_info["live_updated"]
            })
            
        vendors.sort(key=lambda x: x["net_profit"], reverse=True)
        
        return jsonify({
            "success": True, 
            "vendors": vendors, 
            "most_grown": [c.strip() for c in most_grown],
            "market_context": {
                "base_price": base_price_kg,
                "price_source": msp_info["source"],
                "location_detected": location
            }
        })
    except Exception as e:
        logger.error(f"Find vendors failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
