"""
Soil Data Lookup for Indian Regions
====================================
Maps Indian cities/regions to soil types using ICAR NBSS&LUP (National Bureau
of Soil Survey & Land Use Planning) classification.

Provides:
  - City → soil type lookup
  - Coordinates → soil type lookup
  - Soil profile data (texture, drainage, pH range, organic carbon)
  - Default soil data for common Karnataka regions (project focus)
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Karnataka District-wise Soil Types (ICAR NBSS&LUP) ──────────
# Primary soil types for major Karnataka districts
KARNATAKA_SOIL_MAP = {
    # North Karnataka — Black cotton / deep black
    "belagavi":       {"type": "black_cotton", "ph_range": (7.0, 8.5), "texture": "clay", "drainage": "poor", "organic_carbon": "low"},
    "belgaum":        {"type": "black_cotton", "ph_range": (7.0, 8.5), "texture": "clay", "drainage": "poor", "organic_carbon": "low"},
    "bagalkot":       {"type": "black_cotton", "ph_range": (7.2, 8.5), "texture": "clay", "drainage": "poor", "organic_carbon": "low"},
    "bijapur":        {"type": "black_cotton", "ph_range": (7.5, 8.5), "texture": "clay", "drainage": "poor", "organic_carbon": "very_low"},
    "vijayapura":     {"type": "black_cotton", "ph_range": (7.5, 8.5), "texture": "clay", "drainage": "poor", "organic_carbon": "very_low"},
    "gadag":          {"type": "black_cotton", "ph_range": (7.0, 8.5), "texture": "clay", "drainage": "moderate", "organic_carbon": "low"},
    "dharwad":        {"type": "red", "ph_range": (5.5, 7.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "medium"},
    "hubli":          {"type": "red", "ph_range": (5.5, 7.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "medium"},
    "haveri":         {"type": "red", "ph_range": (5.5, 7.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "medium"},
    "uttara kannada": {"type": "laterite", "ph_range": (4.5, 6.5), "texture": "gravelly_clay", "drainage": "moderate", "organic_carbon": "high"},
    "karwar":         {"type": "laterite", "ph_range": (4.5, 6.5), "texture": "gravelly_clay", "drainage": "moderate", "organic_carbon": "high"},

    # South Karnataka — Red loamy / laterite
    "bangalore":      {"type": "red", "ph_range": (5.5, 7.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "low"},
    "bengaluru":      {"type": "red", "ph_range": (5.5, 7.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "low"},
    "mysore":         {"type": "red", "ph_range": (5.5, 7.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "medium"},
    "mysuru":         {"type": "red", "ph_range": (5.5, 7.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "medium"},
    "mandya":         {"type": "red", "ph_range": (5.5, 7.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "medium"},
    "hassan":         {"type": "red", "ph_range": (5.5, 6.5), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "medium"},
    "tumkur":         {"type": "red", "ph_range": (5.5, 7.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "low"},
    "kolar":          {"type": "red", "ph_range": (5.5, 7.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "low"},
    "chikmagalur":    {"type": "laterite", "ph_range": (4.5, 6.5), "texture": "loam", "drainage": "good", "organic_carbon": "high"},
    "chikkamagaluru": {"type": "laterite", "ph_range": (4.5, 6.5), "texture": "loam", "drainage": "good", "organic_carbon": "high"},
    "shivamogga":     {"type": "laterite", "ph_range": (5.0, 6.5), "texture": "loam", "drainage": "moderate", "organic_carbon": "high"},
    "shimoga":        {"type": "laterite", "ph_range": (5.0, 6.5), "texture": "loam", "drainage": "moderate", "organic_carbon": "high"},
    "davanagere":     {"type": "red", "ph_range": (5.5, 7.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "medium"},
    "chitradurga":    {"type": "red", "ph_range": (5.5, 7.5), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "low"},
    "ramanagara":     {"type": "red", "ph_range": (5.5, 7.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "low"},

    # Coastal Karnataka
    "dakshina kannada":{"type": "laterite", "ph_range": (4.5, 6.0), "texture": "gravelly_clay", "drainage": "moderate", "organic_carbon": "high"},
    "mangalore":      {"type": "laterite", "ph_range": (4.5, 6.0), "texture": "gravelly_clay", "drainage": "moderate", "organic_carbon": "high"},
    "mangaluru":      {"type": "laterite", "ph_range": (4.5, 6.0), "texture": "gravelly_clay", "drainage": "moderate", "organic_carbon": "high"},
    "udupi":          {"type": "laterite", "ph_range": (4.5, 6.0), "texture": "gravelly_clay", "drainage": "moderate", "organic_carbon": "high"},

    # Major non-Karnataka cities (common queries)
    "delhi":          {"type": "alluvial", "ph_range": (7.0, 8.0), "texture": "loam", "drainage": "moderate", "organic_carbon": "low"},
    "mumbai":         {"type": "black_cotton", "ph_range": (7.0, 8.5), "texture": "clay", "drainage": "poor", "organic_carbon": "low"},
    "pune":           {"type": "black_cotton", "ph_range": (7.0, 8.5), "texture": "clay", "drainage": "poor", "organic_carbon": "medium"},
    "chennai":        {"type": "red", "ph_range": (6.0, 8.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "low"},
    "kolkata":        {"type": "alluvial", "ph_range": (7.0, 8.0), "texture": "silty_clay", "drainage": "moderate", "organic_carbon": "medium"},
    "hyderabad":      {"type": "red", "ph_range": (6.0, 8.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "low"},
    "ahmedabad":      {"type": "alluvial", "ph_range": (7.0, 8.5), "texture": "sandy_loam", "drainage": "moderate", "organic_carbon": "low"},
    "lucknow":        {"type": "alluvial", "ph_range": (7.0, 8.0), "texture": "loam", "drainage": "moderate", "organic_carbon": "medium"},
    "patna":          {"type": "alluvial", "ph_range": (7.0, 8.0), "texture": "silty_loam", "drainage": "moderate", "organic_carbon": "medium"},
    "bhopal":         {"type": "black_cotton", "ph_range": (7.0, 8.5), "texture": "clay", "drainage": "poor", "organic_carbon": "medium"},
    "indore":         {"type": "black_cotton", "ph_range": (7.0, 8.0), "texture": "clay", "drainage": "poor", "organic_carbon": "medium"},
    "jaipur":         {"type": "desert", "ph_range": (7.5, 9.0), "texture": "sand", "drainage": "excessive", "organic_carbon": "very_low"},
    "chandigarh":     {"type": "alluvial", "ph_range": (7.0, 8.0), "texture": "loam", "drainage": "moderate", "organic_carbon": "medium"},
    "guwahati":       {"type": "alluvial", "ph_range": (5.5, 7.0), "texture": "silty_loam", "drainage": "moderate", "organic_carbon": "high"},
    "trivandrum":     {"type": "laterite", "ph_range": (4.5, 6.5), "texture": "gravelly_clay", "drainage": "moderate", "organic_carbon": "high"},
    "thiruvananthapuram": {"type": "laterite", "ph_range": (4.5, 6.5), "texture": "gravelly_clay", "drainage": "moderate", "organic_carbon": "high"},
    "kochi":          {"type": "alluvial", "ph_range": (5.5, 7.5), "texture": "sandy_loam", "drainage": "moderate", "organic_carbon": "high"},
    "coimbatore":     {"type": "red", "ph_range": (6.0, 8.0), "texture": "sandy_loam", "drainage": "good", "organic_carbon": "medium"},
}

# ── Zone → default soil (when city not found) ──
ZONE_DEFAULT = {
    "North Karnataka":       {"type": "black_cotton", "ph": 7.8},
    "South Karnataka":       {"type": "red", "ph": 6.2},
    "Coastal Karnataka":     {"type": "laterite", "ph": 5.5},
    "Malnad":                {"type": "laterite", "ph": 5.5},
    "All Karnataka":         {"type": "red", "ph": 6.5},
}

# ── Indian region → broad zone map ──
REGION_MAP = {
    "north": "alluvial", "punjab": "alluvial", "haryana": "alluvial",
    "west": "black_cotton", "gujarat": "alluvial", "rajasthan": "desert",
    "south": "red", "tamil nadu": "red", "kerala": "laterite",
    "east": "alluvial", "west bengal": "alluvial", "bihar": "alluvial",
    "central": "black_cotton", "madhya pradesh": "black_cotton",
    "north east": "alluvial", "assam": "alluvial",
}


def lookup_soil(city_name):
    """
    Look up soil data for a city name.

    Parameters
    ----------
    city_name : str — Indian city or town name

    Returns
    -------
    dict with keys: type, ph_range, texture, drainage, organic_carbon
    or None if not found
    """
    if not city_name:
        return None

    key = city_name.strip().lower().split(",")[0].split("(")[0].strip()
    return KARNATAKA_SOIL_MAP.get(key)


def get_soil_for_city(city_name):
    """
    Get complete soil data for a city with default fallback.

    Returns dict with:
      type         : str — soil type key
      ph           : float — default pH (midpoint of range)
      ph_range     : tuple
      texture      : str
      drainage     : str
      organic_carbon : str
      source       : str
    """
    soil = lookup_soil(city_name)

    if soil:
        ph_min, ph_max = soil["ph_range"]
        return {
            "type": soil["type"],
            "ph": round((ph_min + ph_max) / 2, 1),
            "ph_range": soil["ph_range"],
            "texture": soil["texture"],
            "drainage": soil["drainage"],
            "organic_carbon": soil["organic_carbon"],
            "source": f"ICAR NBSS&LUP soil map for {city_name.title()}"
        }

    # Try matching to broader region
    if city_name:
        cl = city_name.lower()
        for region, soil_type in REGION_MAP.items():
            if region in cl:
                soil_info = get_soil_type_info(soil_type)
                return {
                    "type": soil_type,
                    "ph": soil_info["default_ph"],
                    "ph_range": soil_info["ph_range"],
                    "texture": soil_info["texture"],
                    "drainage": soil_info["drainage"],
                    "organic_carbon": "medium",
                    "source": f"Estimated from regional soil map ({soil_type})"
                }

    return {
        "type": "red",
        "ph": 6.5,
        "ph_range": (5.5, 7.5),
        "texture": "loam",
        "drainage": "moderate",
        "organic_carbon": "medium",
        "source": "Default — red loamy soil (common in Peninsular India)"
    }


def get_soil_type_info(soil_type_key):
    """Get descriptive info for a soil type."""
    info = {
        "alluvial":     {"texture": "loam to clay", "drainage": "moderate", "ph_range": (6.5, 8.0), "default_ph": 7.2},
        "black_cotton": {"texture": "clay", "drainage": "poor", "ph_range": (7.0, 8.5), "default_ph": 7.8},
        "red":          {"texture": "sandy_loam to clay", "drainage": "good", "ph_range": (5.5, 7.5), "default_ph": 6.5},
        "laterite":     {"texture": "gravelly_clay", "drainage": "moderate", "ph_range": (4.5, 6.5), "default_ph": 5.5},
        "desert":       {"texture": "sand", "drainage": "excessive", "ph_range": (7.5, 9.0), "default_ph": 8.2},
        "saline":       {"texture": "sandy to clay", "drainage": "poor", "ph_range": (8.0, 9.5), "default_ph": 8.5},
        "peaty":        {"texture": "organic", "drainage": "poor", "ph_range": (4.0, 5.5), "default_ph": 4.8},
        "forest":       {"texture": "loam", "drainage": "good", "ph_range": (5.0, 6.5), "default_ph": 5.8},
    }
    return info.get(soil_type_key, info["red"])


def get_soil_for_zone(zone_name):
    """Get default soil data for a Karnataka zone."""
    zone = ZONE_DEFAULT.get(zone_name, ZONE_DEFAULT["All Karnataka"])
    return {
        "type": zone["type"],
        "ph": zone["ph"],
        "source": f"ICAR zone default for {zone_name}"
    }
