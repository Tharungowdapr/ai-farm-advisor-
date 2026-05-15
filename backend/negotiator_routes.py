import os
import json
import re
from flask import Blueprint, request, jsonify
from datetime import datetime
from services.llm_service import LLMService

import requests

import urllib.parse

# OpenRouter API Key for market analysis and negotiator
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

negotiator_bp = Blueprint('negotiator_bp', __name__)

def get_crop_image(query):
    # This is a bulletproof proxy that fetches high-quality thumbnails based on text search
    search_query = urllib.parse.quote(query + " farm crop fresh")
    return f"https://tse1.mm.bing.net/th?q={search_query}&w=400&h=300&c=7"

def call_openrouter(prompt, system_prompt=None):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "KrishiSync AI"
    }
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    payload = {
        "model": "openai/gpt-4o-mini",
        "messages": messages
    }
    
    resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
    if not resp.ok:
        raise Exception(f"OpenRouter API Error: {resp.text}")
    return resp.json()["choices"][0]["message"]["content"]

# In-memory storage for 12hr dump
SEARCH_CACHE = {}

@negotiator_bp.route("/analyze", methods=["POST"])
def analyze_crop():
    data = request.json or {}
    crop_query = data.get("query", "Potato")
    
    # Check cache (simple 12 hr mock)
    # We will just generate fresh if not in cache
    
    # Prompt LLM for prices and negotiation points
    prompt = f"""
    You are an expert Indian Agricultural AI Negotiator. The farmer is searching for: {crop_query}.
    Provide realistic, UP-TO-DATE market data estimates in JSON format for the Indian market.
    
    CRITICAL INSTRUCTION FOR PRICING:
    All prices MUST be strictly "PER KG" in INR (₹). 
    *Example:* Paddy/Rice MSP is typically ~₹2200 per quintal (100kg), which means it is ~₹22 PER KG. Do NOT return ₹2200 for a per kg price!
    Vegetables like Tomatoes might be ₹15-40 per kg depending on the market.
    
    DO NOT use the placeholder values below. YOU MUST CALCULATE REALISTIC 'PER KG' NUMBERS based on the crop type.
    Format your response EXACTLY like this but with REALISTIC data:
    {{
        "crop_name": "{crop_query}",
        "minimum_price": <number strictly per kg>,
        "ideal_price": <number strictly per kg>,
        "high_target_price": <number strictly per kg>,
        "wholesale_price": <number strictly per kg>,
        "retail_price": <number strictly per kg>,
        "vendor_price": <number strictly per kg>,
        "market_condition": "<e.g., Highly Bullish, Bearish, Stable>",
        "demand_index": <number between 1-10>,
        "quality_score": <number between 1-10>,
        "supply_saturation": <number between 1-10>,
        "negotiation_points": [
            "<Specific negotiation advice 1 for this crop>",
            "<Specific negotiation advice 2 for this crop>",
            "<Specific negotiation advice 3 for this crop>"
        ]
    }}
    Ensure valid JSON without markdown formatting.
    """
    
    try:
        response = call_openrouter(prompt)
        # Bulletproof JSON extraction
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
        
        # Fetch a real image from Wikipedia dynamically
        parsed["image_url"] = get_crop_image(crop_query)
        
        # Store in temp cache
        SEARCH_CACHE[crop_query] = {
            "timestamp": datetime.now().isoformat(),
            "data": parsed
        }
        
        return jsonify(parsed)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@negotiator_bp.route("/chat", methods=["POST"])
def negotiate_chat():
    data = request.json or {}
    buyer_offer = data.get("offer", "18")
    crop_info = data.get("crop_info", {})
    history = data.get("history", [])
    
    system_prompt = "You are an intelligent, conversational Agricultural AI Negotiator. Your job is to help the farmer get the best price for their crops and answer any questions they have about the market, transport, or bargaining tactics."
    
    # We pass the conversation history to give the AI memory
    history_text = "\n".join([f"{msg['role'].capitalize()}: {msg['content']}" for msg in history[-5:]])
    
    prompt = f"""
    Crop Market Context: {json.dumps(crop_info)}
    
    Recent Conversation:
    {history_text}
    
    Farmer's Message: {buyer_offer}
    
    Analyze the farmer's message. If they are stating a buyer's offer, advise them on whether to accept, reject, or counter, citing the 'ideal_price' and 'minimum_price'.
    If they are asking a general question (e.g. about travel costs, alternate buyers, or market conditions), answer it thoughtfully and conversationally as an expert advisor.
    Keep your response concise, human-like, and highly actionable.
    
    Return your response exactly as a JSON object with a single "response" key:
    {{
        "response": "Your full conversational response here..."
    }}
    """
    
    try:
        response = call_openrouter(prompt, system_prompt=system_prompt)
        # Bulletproof JSON extraction
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            response = json_match.group(0)
            
        parsed = json.loads(response)
        return jsonify(parsed)
    except Exception as e:
        logger.error(f"Negotiator chat failed: {str(e).encode('ascii', 'ignore').decode()}")
        return jsonify({"error": str(e)}), 500
