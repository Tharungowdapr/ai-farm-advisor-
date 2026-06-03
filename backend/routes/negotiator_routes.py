from flask import Blueprint, request, jsonify
from datetime import datetime
import json
import re
import logging
import urllib.parse

logger = logging.getLogger(__name__)
negotiator_bp = Blueprint('negotiator_bp', __name__)

def get_crop_image(query):
    # Proxy for crop images
    search_query = urllib.parse.quote(query + " farm crop fresh")
    return f"https://tse1.mm.bing.net/th?q={search_query}&w=400&h=300&c=7"

@negotiator_bp.route("/analyze", methods=["POST"])
def analyze_crop():
    from app import call_llm
    data = request.json or {}
    crop_query = data.get("query", "Potato")
    
    prompt = f"""
    You are an expert Indian Agricultural AI Negotiator. The farmer is searching for: {crop_query}.
    Provide realistic market data estimates in JSON format for the Indian market.
    
    CRITICAL: All prices MUST be PER KG in INR (₹).
    Example: Paddy is ~₹22/kg, Tomatoes ₹15-40/kg.
    
    Return a JSON object exactly like this:
    {{
        "crop_name": "{crop_query}",
        "minimum_price": <number per kg>,
        "ideal_price": <number per kg>,
        "high_target_price": <number per kg>,
        "wholesale_price": <number per kg>,
        "retail_price": <number per kg>,
        "vendor_price": <number per kg>,
        "market_condition": "<e.g., Bullish, Stable>",
        "demand_index": <1-10>,
        "quality_score": <1-10>,
        "supply_saturation": <1-10>,
        "negotiation_points": ["point 1", "point 2", "point 3"]
    }}
    """
    
    try:
        api_key = request.headers.get('X-Api-Key')
        response = call_llm(prompt, system_prompt="Output ONLY valid JSON.", json_mode=True)
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            response = json_match.group(0)
            
        parsed = json.loads(response)
        
        # Calculate Score
        demand = parsed.get("demand_index", 7)
        quality = parsed.get("quality_score", 8)
        supply = parsed.get("supply_saturation", 5)
        score = demand + quality - supply
        parsed["negotiation_score"] = round(score, 1)
        parsed["image_url"] = get_crop_image(crop_query)
        
        return jsonify(parsed)
    except Exception as e:
        logger.error(f"Negotiator analysis failed: {e}")
        return jsonify({"error": str(e)}), 500

@negotiator_bp.route("/chat", methods=["POST"])
def negotiate_chat():
    from app import call_llm
    data = request.json or {}
    buyer_offer = data.get("offer", "")
    crop_info = data.get("crop_info", {})
    history = data.get("history", [])
    
    system_prompt = "You are an intelligent Agricultural AI Negotiator. Help the farmer get the best price for their crops based on market data."
    
    history_text = "\n".join([f"{msg['role'].capitalize()}: {msg['content']}" for msg in history[-5:]])
    
    prompt = f"""
    Context: {json.dumps(crop_info)}
    Recent History: {history_text}
    Farmer Message: {buyer_offer}
    
    Advise the farmer on counter-offers or answer their questions about the market.
    Return response as JSON: {{"response": "..."}}
    """
    
    try:
        api_key = request.headers.get('X-Api-Key')
        response = call_llm(prompt, system_prompt=system_prompt, json_mode=True)
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            response = json_match.group(0)
            
        parsed = json.loads(response)
        return jsonify(parsed)
    except Exception as e:
        logger.error(f"Negotiator chat failed: {e}")
        return jsonify({"error": "Negotiation engine unavailable"}), 500
