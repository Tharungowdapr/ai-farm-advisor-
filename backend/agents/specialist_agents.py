"""
Specialist Agents for KrishiVigyan multi-agent system.
Each agent handles a specific agricultural domain.
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Base class ────────────────────────────────────────────────────
class BaseAgent:
    name = "base"
    description = ""

    def run(self, state):
        raise NotImplementedError


# ── Soil Agent ────────────────────────────────────────────────────
class SoilAgent(BaseAgent):
    name = "soil"
    description = "Analyzes soil health, NPK levels, pH, deficiencies, and soil type"

    def run(self, state):
        ctx = state.get("context", {})
        N = ctx.get("N")
        P = ctx.get("P")
        K = ctx.get("K")
        ph = ctx.get("ph")

        result = {"agent": self.name, "status": "no_data"}
        if N and P and K and ph:
            try:
                N, P, K, ph = float(N), float(P), float(K), float(ph)
                issues = []
                if N < 50: issues.append("Low nitrogen — apply urea or DAP")
                if P < 20: issues.append("Low phosphorus — apply SSP or DAP")
                if K < 30: issues.append("Low potassium — apply MOP")
                if ph < 5.5: issues.append("Acidic soil — apply lime")
                elif ph > 8.0: issues.append("Alkaline soil — apply sulfur")
                soil_type = "Acidic" if ph < 5.5 else "Neutral" if ph < 7.5 else "Alkaline"
                result = {
                    "agent": self.name,
                    "status": "analyzed",
                    "soil_type": soil_type,
                    "npk": {"N": N, "P": P, "K": K, "pH": ph},
                    "deficiencies": issues,
                    "summary": f"Soil is {soil_type}. " + ("Issues: " + "; ".join(issues) if issues else "No major deficiencies.")
                }
            except:
                result = {"agent": self.name, "status": "error", "summary": "Invalid soil parameter values"}
        return result


# ── Weather Agent ─────────────────────────────────────────────────
class WeatherAgent(BaseAgent):
    name = "weather"
    description = "Fetches real-time weather and 7-day forecast"

    def run(self, state):
        ctx = state.get("context", {})
        lat, lon = ctx.get("lat"), ctx.get("lon")
        result = {"agent": self.name, "status": "simulated"}

        if lat and lon:
            try:
                import requests
                url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7"
                resp = requests.get(url, timeout=10)
                if resp.status_code == 200:
                    d = resp.json()
                    cur = d.get("current", {})
                    daily = d.get("daily", {})
                    result = {
                        "agent": self.name,
                        "status": "live",
                        "temperature": cur.get("temperature_2m"),
                        "humidity": cur.get("relative_humidity_2m"),
                        "rainfall": cur.get("precipitation", 0),
                        "wind": cur.get("wind_speed_10m"),
                        "forecast": {
                            "max": daily.get("temperature_2m_max", []),
                            "min": daily.get("temperature_2m_min", []),
                            "rain": daily.get("precipitation_sum", []),
                        },
                        "summary": f"{cur.get('temperature_2m','?')}°C, {cur.get('relative_humidity_2m','?')}% humidity",
                    }
            except Exception as e:
                logger.warning(f"WeatherAgent: {e}")

        if result["status"] == "simulated":
            month = datetime.now().month
            if month in [6,7,8,9]:
                result["summary"] = "Monsoon season — warm and humid"
            elif month in [3,4,5]:
                result["summary"] = "Summer — hot and dry"
            else:
                result["summary"] = "Winter — cool and mild"
        return result


# ── Price Agent ───────────────────────────────────────────────────
class PriceAgent(BaseAgent):
    name = "price"
    description = "Fetches MSP, market prices, and price trends for crops"

    def run(self, state):
        ctx = state.get("context", {})
        crop = ctx.get("crop") or "Paddy"
        result = {"agent": self.name, "status": "no_data"}

        try:
            from msp_fetcher import MSPFetcher, get_msp_for_crop
            msp = get_msp_for_crop(crop)
            if msp:
                result = {
                    "agent": self.name,
                    "status": "fetched",
                    "crop": crop,
                    "msp": msp.get("msp"),
                    "unit": msp.get("unit"),
                    "source": msp.get("source"),
                    "summary": f"MSP for {crop}: {msp.get('msp', 'N/A')} per {msp.get('unit', 'quintal')}"
                }
        except Exception as e:
            logger.warning(f"PriceAgent: {e}")
        return result


# ── Pest Agent ────────────────────────────────────────────────────
class PestAgent(BaseAgent):
    name = "pest"
    description = "Identifies disease/pest risks based on crop, season, and weather"

    def run(self, state):
        ctx = state.get("context", {})
        crop = ctx.get("crop") or "Paddy"
        temp = ctx.get("temperature") or 25
        humidity = ctx.get("humidity") or 70
        result = {"agent": self.name, "status": "no_data"}

        try:
            from services.weather_disease_risk import calculate_disease_risk
            risks = calculate_disease_risk(crop, {"temperature": float(temp), "humidity": float(humidity), "rainfall": 0})
            if risks:
                high = [r for r in risks if r["risk_level"] in ("High", "Moderate")]
                result = {
                    "agent": self.name,
                    "status": "analyzed",
                    "crop": crop,
                    "risks": risks[:5],
                    "high_risk_count": len(high),
                    "summary": f"{len(high)} disease risks for {crop}" + (f". Top: {risks[0]['name']} ({risks[0]['risk_level']})" if risks else "")
                }
        except Exception as e:
            logger.warning(f"PestAgent: {e}")
        return result


# ── Scheme Agent ──────────────────────────────────────────────────
class SchemeAgent(BaseAgent):
    name = "scheme"
    description = "Matches government schemes to farmer profile"

    def run(self, state):
        ctx = state.get("context", {})
        crop = ctx.get("crop") or ""
        state_name = ctx.get("state") or "Karnataka"
        result = {"agent": self.name, "status": "no_data"}

        schemes = [
            {"name": "PM-KISAN", "benefit": "₹6,000/year direct income support", "eligibility": "All small & marginal farmers"},
            {"name": "PMFBY", "benefit": "Crop insurance at low premium (≤2%)", "eligibility": "All farmers growing notified crops"},
            {"name": "KCC", "benefit": "Short-term crop loans up to ₹3 lakh at 4% interest", "eligibility": "All farmers"},
            {"name": "SOIL HEALTH CARD", "benefit": "Free soil testing & recommendations", "eligibility": "All farmers"},
            {"name": "PMKSY", "benefit": "Subsidy on micro-irrigation (drip/sprinkler)", "eligibility": "Small & marginal farmers"},
        ]

        if crop:
            crop_schemes = {
                "paddy": [schemes[0], schemes[1], schemes[2], schemes[3]],
                "ragi": [schemes[0], schemes[3], schemes[4]],
                "sugarcane": [schemes[0], schemes[1], schemes[2], schemes[4]],
                "coffee": [schemes[0], schemes[2], schemes[4]],
                "tomato": [schemes[0], schemes[1], schemes[2], schemes[4]],
                "potato": [schemes[0], schemes[1], schemes[2], schemes[4]],
            }
            matched = crop_schemes.get(crop.lower(), schemes[:3])
        else:
            matched = schemes[:3]

        result = {
            "agent": self.name,
            "status": "matched",
            "schemes": matched,
            "summary": f"{len(matched)} schemes available" + (f" for {crop}" if crop else "")
        }
        return result


# ── Market Agent ──────────────────────────────────────────────────
class MarketAgent(BaseAgent):
    name = "market"
    description = "Analyzes market conditions, supply glut risk, mandi prices"

    def run(self, state):
        ctx = state.get("context", {})
        crop = ctx.get("crop") or "Paddy"
        lat, lon = ctx.get("lat"), ctx.get("lon")
        result = {"agent": self.name, "status": "no_data"}

        try:
            from msp_fetcher import MSPFetcher
            history = MSPFetcher.get_price_history(crop, days=180)
            msp_data = MSPFetcher.fetch_live_msp(crop)
            trend = "Stable"
            if len(history) >= 2:
                change = ((history[-1]["price"] - history[-5]["price"]) / history[-5]["price"]) * 100
                trend = "Bullish" if change > 2 else "Bearish" if change < -2 else "Stable"

            result = {
                "agent": self.name,
                "status": "analyzed",
                "crop": crop,
                "trend": trend,
                "current_msp": msp_data.get("msp") if msp_data else "N/A",
                "price_points": len(history),
                "summary": f"{crop} market is {trend}. Current MSP: {msp_data.get('msp', 'N/A') if msp_data else 'N/A'}"
            }
        except Exception as e:
            logger.warning(f"MarketAgent: {e}")
        return result


# ── Agent registry ────────────────────────────────────────────────
ALL_AGENTS = {
    "soil": SoilAgent(),
    "weather": WeatherAgent(),
    "price": PriceAgent(),
    "pest": PestAgent(),
    "scheme": SchemeAgent(),
    "market": MarketAgent(),
}

AGENT_DESCRIPTIONS = "\n".join(f"- {k}: {v.description}" for k, v in ALL_AGENTS.items())
