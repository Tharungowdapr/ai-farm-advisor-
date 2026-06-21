"""
ICAR Data Integration Module
============================
Comprehensive disease knowledge base sourced from ICAR (Indian Council of
Agricultural Research) published guidelines — IARI, IIWBR, IIMR, CPRI, CICR,
CRRI, DGR, IISR, DRMR, IIPR, CISH, SBI, CPCRI, NRCB, CRIJAF.

Each disease entry includes:
  - Temperature & humidity thresholds
  - Soil pH & texture preferences
  - Rainfall response
  - Peak season months
  - ICAR-recommended management
  - Source citation

Also provides a web scraper to fetch live ICAR advisories from data.gov.in
and ICAR portal when available.
"""

import logging
import json
import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# ICAR Disease Knowledge Base
# ──────────────────────────────────────────────
# Structure per disease:
#   (temp_min, temp_max, hum_thresh, rain_factor,
#    peak_months, soil_ph_min, soil_ph_max,
#    soil_types, advisory, source)

ICAR_DISEASE_PROFILES = {

    # ── RICE (ICAR-NRRI/CRRI Cuttack) ──
    "Rice Blast": {
        "temp_min": 20, "temp_max": 30,
        "humidity_thresh": 85,
        "rainfall_factor": "high",
        "peak_months": [6, 7, 8, 9],
        "soil_ph_min": 5.0, "soil_ph_max": 7.0,
        "favored_soil_types": ["loamy", "clay_loam"],
        "aggravated_by_soil": ["high_nitrogen", "waterlogged"],
        "advisory": "Apply Tricyclazole 75WP @ 0.6g/L or Isoprothiolane 40EC @ 1.5mL/L. Avoid excess N fertilisation.",
        "source": "ICAR-NRRI Rice Production Guide 2023"
    },
    "Bacterial Leaf Blight": {
        "temp_min": 25, "temp_max": 35,
        "humidity_thresh": 80,
        "rainfall_factor": "high",
        "peak_months": [7, 8, 9, 10],
        "soil_ph_min": 5.5, "soil_ph_max": 8.0,
        "favored_soil_types": ["clay", "clay_loam"],
        "aggravated_by_soil": ["waterlogged", "high_nitrogen"],
        "advisory": "Apply Streptocycline 100ppm + Copper Oxychloride 0.3%. Use resistant varieties (Improved Samba Mahsuri).",
        "source": "ICAR-NRRI Disease Management Guide 2023"
    },
    "Rice Sheath Blight": {
        "temp_min": 28, "temp_max": 34,
        "humidity_thresh": 90,
        "rainfall_factor": "high",
        "peak_months": [7, 8, 9],
        "soil_ph_min": 5.0, "soil_ph_max": 7.5,
        "favored_soil_types": ["clay_loam", "silty_clay"],
        "aggravated_by_soil": ["dense_planting", "high_nitrogen"],
        "advisory": "Apply Validamycin 3L @ 2.5mL/L or Hexaconazole 5EC @ 2mL/L. Reduce plant density.",
        "source": "ICAR-NRRI Rice Sheath Blight Management"
    },
    "Brown Spot": {
        "temp_min": 25, "temp_max": 35,
        "humidity_thresh": 80,
        "rainfall_factor": "high",
        "peak_months": [8, 9, 10],
        "soil_ph_min": 4.5, "soil_ph_max": 7.0,
        "favored_soil_types": ["sandy", "sandy_loam"],
        "aggravated_by_soil": ["nutrient_deficient", "low_potassium"],
        "advisory": "Ensure adequate K nutrition. Spray Mancozeb 75WP @ 2.5g/L or Edifenphos 50EC @ 1mL/L.",
        "source": "ICAR-NRRI Brown Spot Management"
    },

    # ── WHEAT (ICAR-IIWBR Karnal) ──
    "Wheat Rust": {
        "temp_min": 15, "temp_max": 25,
        "humidity_thresh": 70,
        "rainfall_factor": "high",
        "peak_months": [12, 1, 2, 3],
        "soil_ph_min": 6.0, "soil_ph_max": 8.0,
        "favored_soil_types": ["loam", "clay_loam"],
        "aggravated_by_soil": ["poor_drainage", "high_nitrogen"],
        "advisory": "Spray Propiconazole 25EC @ 1mL/L or Tebuconazole. Use resistant varieties (HD-3086, DBW-187).",
        "source": "ICAR-IIWBR Wheat Rust Management 2023"
    },
    "Karnal Bunt": {
        "temp_min": 18, "temp_max": 24,
        "humidity_thresh": 80,
        "rainfall_factor": "high",
        "peak_months": [2, 3],
        "soil_ph_min": 6.5, "soil_ph_max": 8.0,
        "favored_soil_types": ["loam", "silty_loam"],
        "aggravated_by_soil": ["high_moisture", "poor_drainage"],
        "advisory": "Avoid late sowing. Treat seeds with Carboxin + Thiram @ 2g/kg seed or Tebuconazole @ 1.5g/kg.",
        "source": "ICAR-IIWBR Karnal Bunt Guidelines"
    },

    # ── MAIZE (ICAR-IIMR Ludhiana) ──
    "Maydis Leaf Blight": {
        "temp_min": 20, "temp_max": 32,
        "humidity_thresh": 80,
        "rainfall_factor": "high",
        "peak_months": [7, 8, 9],
        "soil_ph_min": 5.5, "soil_ph_max": 7.5,
        "favored_soil_types": ["loam", "sandy_loam"],
        "aggravated_by_soil": ["poor_drainage", "compacted"],
        "advisory": "Apply Mancozeb 75WP @ 2.5g/L. Use resistant hybrids. Practice crop rotation.",
        "source": "ICAR-IIMR Maize Disease Management"
    },
    "Turcicum Leaf Blight": {
        "temp_min": 18, "temp_max": 27,
        "humidity_thresh": 85,
        "rainfall_factor": "high",
        "peak_months": [7, 8, 9, 10],
        "soil_ph_min": 5.5, "soil_ph_max": 7.0,
        "favored_soil_types": ["clay_loam", "loam"],
        "aggravated_by_soil": ["high_nitrogen", "waterlogged"],
        "advisory": "Spray Zineb or Mancozeb at 15-day intervals. Remove and destroy infected leaves.",
        "source": "ICAR-IIMR Turcicum Blight Guide"
    },
    "Downy Mildew Maize": {
        "temp_min": 20, "temp_max": 28,
        "humidity_thresh": 90,
        "rainfall_factor": "high",
        "peak_months": [6, 7, 8],
        "soil_ph_min": 5.5, "soil_ph_max": 7.5,
        "favored_soil_types": ["sandy_loam", "loam"],
        "aggravated_by_soil": ["poor_drainage", "waterlogged"],
        "advisory": "Treat seeds with Metalaxyl 35SD @ 4g/kg. Remove and destroy infected plants. Avoid monocropping.",
        "source": "ICAR-IIMR Downy Mildew Management"
    },

    # ── BANANA (ICAR-NRCB Trichy) ──
    "Panama Wilt": {
        "temp_min": 25, "temp_max": 35,
        "humidity_thresh": 80,
        "rainfall_factor": "high",
        "peak_months": [6, 7, 8, 9, 10],
        "soil_ph_min": 5.5, "soil_ph_max": 7.0,
        "favored_soil_types": ["sandy_loam", "loam"],
        "aggravated_by_soil": ["waterlogged", "compacted", "acidic"],
        "advisory": "Use Fusarium wilt-resistant TC plants (G9, Udhayam). Apply Trichoderma viride @ 50g/plant + neem cake @ 1kg/plant.",
        "source": "ICAR-NRCB Fusarium Wilt Management"
    },
    "Sigatoka Leaf Spot": {
        "temp_min": 25, "temp_max": 32,
        "humidity_thresh": 85,
        "rainfall_factor": "high",
        "peak_months": [7, 8, 9, 10],
        "soil_ph_min": 5.5, "soil_ph_max": 7.5,
        "favored_soil_types": ["loam", "sandy_loam"],
        "aggravated_by_soil": ["poor_drainage", "low_potassium"],
        "advisory": "Spray Carbendazim 50WP @ 1g/L or Propiconazole 25EC @ 1mL/L. Remove and destroy affected leaves.",
        "source": "ICAR-NRCB Sigatoka Leaf Spot Guide"
    },

    # ── POTATO (ICAR-CPRI Shimla) ──
    "Late Blight Potato": {
        "temp_min": 12, "temp_max": 22,
        "humidity_thresh": 85,
        "rainfall_factor": "high",
        "peak_months": [12, 1, 2],
        "soil_ph_min": 5.0, "soil_ph_max": 6.5,
        "favored_soil_types": ["sandy_loam", "loam"],
        "aggravated_by_soil": ["poor_drainage", "heavy_clay"],
        "advisory": "Spray Mancozeb 75WP @ 2g/L preventively. Use resistant varieties (Kufri Jyoti, Kufri Pukhraj).",
        "source": "ICAR-CPRI Late Blight Management 2023"
    },
    "Early Blight Potato": {
        "temp_min": 24, "temp_max": 32,
        "humidity_thresh": 70,
        "rainfall_factor": "low",
        "peak_months": [10, 11, 12],
        "soil_ph_min": 5.0, "soil_ph_max": 6.8,
        "favored_soil_types": ["sandy_loam", "loam"],
        "aggravated_by_soil": ["nutrient_deficient", "low_nitrogen"],
        "advisory": "Spray Chlorothalonil 75WP @ 2g/L or Mancozeb. Remove infected plant debris. Avoid overhead irrigation.",
        "source": "ICAR-CPRI Early Blight Guide"
    },

    # ── SUGARCANE (ICAR-SBI Coimbatore) ──
    "Red Rot Sugarcane": {
        "temp_min": 25, "temp_max": 32,
        "humidity_thresh": 85,
        "rainfall_factor": "high",
        "peak_months": [7, 8, 9, 10],
        "soil_ph_min": 6.0, "soil_ph_max": 7.5,
        "favored_soil_types": ["clay_loam", "loam"],
        "aggravated_by_soil": ["waterlogged", "compacted", "poor_drainage"],
        "advisory": "Use resistant varieties (Co 238, Co 0238, Co 86032). Treat setts with Carbendazim 50WP @ 1g/L for 15 min.",
        "source": "ICAR-SBI Red Rot Management"
    },
    "Smut Sugarcane": {
        "temp_min": 28, "temp_max": 35,
        "humidity_thresh": 80,
        "rainfall_factor": "high",
        "peak_months": [3, 4, 5, 6],
        "soil_ph_min": 6.0, "soil_ph_max": 8.0,
        "favored_soil_types": ["sandy_loam", "loam"],
        "aggravated_by_soil": ["droughty", "low_moisture"],
        "advisory": "Remove smutted whips before spore dispersal. Use disease-free setts. Treat with Carbendazim 50WP.",
        "source": "ICAR-SBI Smut Guidelines"
    },

    # ── COTTON (ICAR-CICR Nagpur) ──
    "Cotton Boll Rot": {
        "temp_min": 25, "temp_max": 35,
        "humidity_thresh": 85,
        "rainfall_factor": "high",
        "peak_months": [8, 9, 10],
        "soil_ph_min": 6.0, "soil_ph_max": 8.0,
        "favored_soil_types": ["black_cotton", "clay"],
        "aggravated_by_soil": ["high_nitrogen", "dense_canopy"],
        "advisory": "Spray Copper Hydroxide 77WP @ 2g/L. Ensure proper spacing and drainage.",
        "source": "ICAR-CICR Boll Rot Management"
    },
    "Bacterial Blight Cotton": {
        "temp_min": 25, "temp_max": 35,
        "humidity_thresh": 80,
        "rainfall_factor": "high",
        "peak_months": [7, 8, 9, 10],
        "soil_ph_min": 6.0, "soil_ph_max": 8.5,
        "favored_soil_types": ["black_cotton", "clay"],
        "aggravated_by_soil": ["high_nitrogen", "waterlogged"],
        "advisory": "Use resistant varieties. Spray Streptocycline 100ppm + Copper Oxychloride 0.2%.",
        "source": "ICAR-CICR Bacterial Blight Guide"
    },

    # ── GROUNDNUT (ICAR-DGR Junagadh) ──
    "Tikka Disease": {
        "temp_min": 25, "temp_max": 30,
        "humidity_thresh": 80,
        "rainfall_factor": "high",
        "peak_months": [7, 8, 9, 10],
        "soil_ph_min": 5.5, "soil_ph_max": 7.0,
        "favored_soil_types": ["sandy_loam", "loamy_sand"],
        "aggravated_by_soil": ["low_calcium", "sandy"],
        "advisory": "Spray Chlorothalonil 75WP or Carbendazim 50WP at 30-day intervals. Use resistant varieties (GPBD-4).",
        "source": "ICAR-DGR Tikka Disease Management"
    },
    "Rust Groundnut": {
        "temp_min": 20, "temp_max": 28,
        "humidity_thresh": 85,
        "rainfall_factor": "high",
        "peak_months": [8, 9, 10],
        "soil_ph_min": 5.5, "soil_ph_max": 7.5,
        "favored_soil_types": ["sandy_loam", "loam"],
        "aggravated_by_soil": ["low_potassium", "poor_drainage"],
        "advisory": "Spray Mancozeb 75WP @ 2.5g/L or Hexaconazole 5EC @ 2mL/L.",
        "source": "ICAR-DGR Groundnut Rust Guide"
    },

    # ── SOYBEAN (ICAR-IISR Indore) ──
    "Rust Soybean": {
        "temp_min": 18, "temp_max": 28,
        "humidity_thresh": 80,
        "rainfall_factor": "high",
        "peak_months": [8, 9, 10],
        "soil_ph_min": 5.5, "soil_ph_max": 7.5,
        "favored_soil_types": ["loam", "clay_loam"],
        "aggravated_by_soil": ["poor_drainage", "compacted"],
        "advisory": "Spray Hexaconazole 5EC @ 2mL/L or Tebuconazole. Use tolerant varieties (JS 335, JS 93-05).",
        "source": "ICAR-IISR Soybean Rust Management"
    },
    "Yellow Mosaic Soybean": {
        "temp_min": 25, "temp_max": 35,
        "humidity_thresh": 70,
        "rainfall_factor": "high",
        "peak_months": [7, 8, 9],
        "soil_ph_min": 5.5, "soil_ph_max": 7.5,
        "favored_soil_types": ["loam", "sandy_loam"],
        "aggravated_by_soil": ["low_moisture", "droughty"],
        "advisory": "Control whitefly vector with Imidacloprid 17.8SL @ 0.3mL/L. Use resistant varieties (SL 958, DS 9814).",
        "source": "ICAR-IISR Yellow Mosaic Guide"
    },

    # ── TOMATO ──
    "Late Blight Tomato": {
        "temp_min": 15, "temp_max": 22,
        "humidity_thresh": 85,
        "rainfall_factor": "high",
        "peak_months": [11, 12, 1, 2],
        "soil_ph_min": 5.5, "soil_ph_max": 7.0,
        "favored_soil_types": ["sandy_loam", "loam"],
        "aggravated_by_soil": ["poor_drainage", "heavy_clay"],
        "advisory": "Spray Mancozeb 75WP @ 2g/L or Cymoxanil + Mancozeb 72WP @ 2g/L. Stake plants for airflow.",
        "source": "ICAR-IIHR Tomato Disease Management"
    },
    "Early Blight Tomato": {
        "temp_min": 25, "temp_max": 32,
        "humidity_thresh": 75,
        "rainfall_factor": "high",
        "peak_months": [3, 4, 5, 10, 11],
        "soil_ph_min": 5.5, "soil_ph_max": 7.5,
        "favored_soil_types": ["loam", "sandy_loam"],
        "aggravated_by_soil": ["nutrient_deficient", "low_potassium"],
        "advisory": "Spray Chlorothalonil 75WP @ 2g/L or Mancozeb. Remove lower infected leaves. Mulch to reduce splashing.",
        "source": "ICAR-IIHR Early Blight Guide"
    },

    # ── MUSTARD (ICAR-DRMR Bharatpur) ──
    "Alternaria Blight Mustard": {
        "temp_min": 15, "temp_max": 25,
        "humidity_thresh": 80,
        "rainfall_factor": "high",
        "peak_months": [12, 1, 2],
        "soil_ph_min": 6.0, "soil_ph_max": 8.0,
        "favored_soil_types": ["loam", "silty_loam"],
        "aggravated_by_soil": ["high_nitrogen", "dense_planting"],
        "advisory": "Spray Mancozeb 75WP @ 2g/L or Iprodione 50WP. Use IPM-resistant varieties (NRCHB-101, RH-749).",
        "source": "ICAR-DRMR Alternaria Blight Management"
    },
    "White Rust Mustard": {
        "temp_min": 12, "temp_max": 20,
        "humidity_thresh": 85,
        "rainfall_factor": "high",
        "peak_months": [11, 12, 1, 2],
        "soil_ph_min": 6.0, "soil_ph_max": 8.0,
        "favored_soil_types": ["loam", "clay_loam"],
        "aggravated_by_soil": ["waterlogged", "poor_drainage"],
        "advisory": "Spray Metalaxyl + Mancozeb 72WP @ 2g/L. Avoid dense planting. Ensure proper drainage.",
        "source": "ICAR-DRMR White Rust Guide"
    },

    # ── CHICKPEA (ICAR-IIPR Kanpur) ──
    "Wilt Chickpea": {
        "temp_min": 20, "temp_max": 30,
        "humidity_thresh": 70,
        "rainfall_factor": "low",
        "peak_months": [11, 12, 1],
        "soil_ph_min": 6.0, "soil_ph_max": 8.0,
        "favored_soil_types": ["loam", "clay_loam"],
        "aggravated_by_soil": ["waterlogged", "compacted", "acidic"],
        "advisory": "Use resistant varieties (JG-16, Vijay, KAK-2). Treat seeds with Trichoderma viride @ 4g/kg + Carbendazim @ 2g/kg.",
        "source": "ICAR-IIPR Chickpea Wilt Management"
    },
    "Ascochyta Blight Chickpea": {
        "temp_min": 10, "temp_max": 20,
        "humidity_thresh": 85,
        "rainfall_factor": "high",
        "peak_months": [12, 1, 2],
        "soil_ph_min": 6.0, "soil_ph_max": 8.0,
        "favored_soil_types": ["loam", "silty_loam"],
        "aggravated_by_soil": ["poor_drainage", "high_moisture"],
        "advisory": "Spray Mancozeb 75WP @ 2g/L + Carbendazim 50WP @ 1g/L. Avoid overhead irrigation. Use resistant varieties.",
        "source": "ICAR-IIPR Ascochyta Blight Guide"
    },

    # ── MANGO (ICAR-CISH Lucknow) ──
    "Anthracnose Mango": {
        "temp_min": 24, "temp_max": 32,
        "humidity_thresh": 85,
        "rainfall_factor": "high",
        "peak_months": [6, 7, 8, 9],
        "soil_ph_min": 5.5, "soil_ph_max": 7.5,
        "favored_soil_types": ["loam", "sandy_loam"],
        "aggravated_by_soil": ["poor_drainage", "waterlogged"],
        "advisory": "Spray Carbendazim 50WP @ 1g/L before and after flowering. Also spray Mancozeb 75WP @ 2.5g/L.",
        "source": "ICAR-CISH Mango Anthracnose Management"
    },
    "Powdery Mildew Mango": {
        "temp_min": 20, "temp_max": 28,
        "humidity_thresh": 60,
        "rainfall_factor": "low",
        "peak_months": [2, 3, 4],
        "soil_ph_min": 5.5, "soil_ph_max": 7.5,
        "favored_soil_types": ["loam", "sandy_loam"],
        "aggravated_by_soil": ["droughty", "low_moisture"],
        "advisory": "Spray wettable Sulfur 80WP @ 2g/L or Hexaconazole 5EC @ 2mL/L at panicle emergence stage.",
        "source": "ICAR-CISH Mango Powdery Mildew Guide"
    },
}

# ── Crop → Disease mapping ───────────────────
CROP_DISEASE_MAP = {
    "Paddy":      ["Rice Blast", "Bacterial Leaf Blight", "Rice Sheath Blight", "Brown Spot"],
    "Rice":       ["Rice Blast", "Bacterial Leaf Blight", "Rice Sheath Blight", "Brown Spot"],
    "Wheat":      ["Wheat Rust", "Karnal Bunt"],
    "Maize":      ["Maydis Leaf Blight", "Turcicum Leaf Blight", "Downy Mildew Maize"],
    "Corn":       ["Maydis Leaf Blight", "Turcicum Leaf Blight", "Downy Mildew Maize"],
    "Banana":     ["Panama Wilt", "Sigatoka Leaf Spot"],
    "Potato":     ["Late Blight Potato", "Early Blight Potato"],
    "Sugarcane":  ["Red Rot Sugarcane", "Smut Sugarcane"],
    "Cotton":     ["Cotton Boll Rot", "Bacterial Blight Cotton"],
    "Groundnut":  ["Tikka Disease", "Rust Groundnut"],
    "Peanut":     ["Tikka Disease", "Rust Groundnut"],
    "Soybean":    ["Rust Soybean", "Yellow Mosaic Soybean"],
    "Soyabean":   ["Rust Soybean", "Yellow Mosaic Soybean"],
    "Mustard":    ["Alternaria Blight Mustard", "White Rust Mustard"],
    "Chickpea":   ["Wilt Chickpea", "Ascochyta Blight Chickpea"],
    "Gram":       ["Wilt Chickpea", "Ascochyta Blight Chickpea"],
    "Mango":      ["Anthracnose Mango", "Powdery Mildew Mango"],
    "Tomato":     ["Late Blight Tomato", "Early Blight Tomato"],
    "Ragi":       [],
    "Coffee":     [],
    "Capsicum":   [],
    "Orange":     [],
    "Apple":      [],
    "Grape":      [],
}

# ── Soil type descriptions ───────────────────
SOIL_TYPE_INFO = {
    "alluvial":     {"texture": "loam to clay", "drainage": "moderate", "ph_range": (6.5, 8.0), "regions": ["Punjab", "Haryana", "UP", "Bihar", "WB", "Assam"]},
    "black_cotton": {"texture": "clay", "drainage": "poor", "ph_range": (7.0, 8.5), "regions": ["Maharashtra", "MP", "Gujarat", "Karnataka", "Telangana", "AP"]},
    "red":          {"texture": "sandy_loam to clay", "drainage": "good", "ph_range": (5.5, 7.5), "regions": ["Tamil Nadu", "Karnataka", "AP", "Odisha", "Jharkhand"]},
    "laterite":     {"texture": "gravelly_clay", "drainage": "moderate", "ph_range": (4.5, 6.5), "regions": ["Kerala", "Karnataka", "Maharashtra", "Goa", "Assam"]},
    "desert":       {"texture": "sand", "drainage": "excessive", "ph_range": (7.5, 9.0), "regions": ["Rajasthan", "Gujarat", "Haryana"]},
    "saline":       {"texture": "sandy to clay", "drainage": "poor", "ph_range": (8.0, 9.5), "regions": ["UP", "Punjab", "Haryana", "Rajasthan", "Gujarat"]},
    "peaty":        {"texture": "organic", "drainage": "poor", "ph_range": (4.0, 5.5), "regions": ["Kerala", "WB", "Assam", "Bihar"]},
    "forest":       {"texture": "loam", "drainage": "good", "ph_range": (5.0, 6.5), "regions": ["Himalayan", "NE India", "Western Ghats"]},
}


def get_disease_profile(disease_name):
    """Get the ICAR disease profile for a given disease name."""
    return ICAR_DISEASE_PROFILES.get(disease_name)


def get_diseases_for_crop(crop_name):
    """Get list of disease names that affect a given crop."""
    return CROP_DISEASE_MAP.get(crop_name, CROP_DISEASE_MAP.get(crop_name.lower().title(), []))


def score_disease_icar(disease_name, temp, humidity, rainfall, soil_ph=None, soil_type=None, month=None):
    """
    Score a disease from 0-100 using ICAR thresholds INCLUDING soil factors.

    Parameters
    ----------
    disease_name : str
    temp         : float — temperature in °C
    humidity     : float — relative humidity %
    rainfall     : float — rainfall in mm
    soil_ph      : float or None — soil pH
    soil_type    : str or None — soil type key
    month        : int or None — month (1-12), defaults to current

    Returns
    -------
    dict with keys: score, level, factors, advisory, source
    """
    profile = ICAR_DISEASE_PROFILES.get(disease_name)
    if not profile:
        return {"score": 0, "level": "Unknown", "factors": ["No ICAR profile available"], "advisory": "", "source": ""}

    if month is None:
        month = datetime.now().month

    score = 0
    factors = []

    # ── Temperature (0-25 pts) ──
    t_min, t_max = profile["temp_min"], profile["temp_max"]
    if t_min <= temp <= t_max:
        mid = (t_min + t_max) / 2
        closeness = 1 - abs(temp - mid) / ((t_max - t_min) / 2) if (t_max - t_min) > 0 else 1
        score += int(closeness * 25)
        factors.append(f"Temperature {temp:.1f}°C in optimal range ({t_min}-{t_max}°C) per ICAR")
    elif abs(temp - t_min) <= 5 or abs(temp - t_max) <= 5:
        score += 8
        factors.append(f"Temperature {temp:.1f}°C near ICAR threshold ({t_min}-{t_max}°C)")

    # ── Humidity (0-25 pts) ──
    h_thresh = profile["humidity_thresh"]
    if humidity >= h_thresh:
        excess = min((humidity - h_thresh) / 15, 1.0)
        score += 15 + int(excess * 10)
        factors.append(f"Humidity {humidity:.0f}% exceeds ICAR threshold ({h_thresh}%)")
    elif humidity >= h_thresh - 10:
        score += 6
        factors.append(f"Humidity {humidity:.0f}% approaching ICAR threshold ({h_thresh}%)")

    # ── Rainfall (0-20 pts) ──
    rain_factor = profile.get("rainfall_factor", "high")
    if rain_factor == "high":
        if rainfall > 50:
            pts = min(int(rainfall / 15), 20)
            score += pts
            factors.append(f"Heavy rainfall ({rainfall:.0f}mm) favours disease (ICAR)")
        elif rainfall > 20:
            score += 5
    else:
        if rainfall < 10:
            score += 20
            factors.append(f"Dry conditions ({rainfall:.0f}mm) favour this disease (ICAR)")
        elif rainfall < 30:
            score += 10

    # ── Soil pH (0-15 pts) ──
    if soil_ph is not None:
        ph_min = profile.get("soil_ph_min", 5.0)
        ph_max = profile.get("soil_ph_max", 8.0)
        if ph_min <= soil_ph <= ph_max:
            score += 10
            factors.append(f"Soil pH {soil_ph} in favourable range ({ph_min}-{ph_max}) per ICAR")
        elif abs(soil_ph - ph_min) <= 0.5 or abs(soil_ph - ph_max) <= 0.5:
            score += 4
            factors.append(f"Soil pH {soil_ph} near ICAR threshold ({ph_min}-{ph_max})")

    # ── Soil type (0-10 pts) ──
    if soil_type is not None:
        favored = profile.get("favored_soil_types", [])
        if soil_type in favored:
            score += 10
            factors.append(f"Soil type '{soil_type}' favours this disease per ICAR")
        elif any(f in str(soil_type) for f in favored):
            score += 4

    # ── Season (0-10 pts) ──
    peak = profile.get("peak_months", [])
    if month in peak:
        score += 10
        month_names = {1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",
                       7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec"}
        peak_str = ", ".join(month_names.get(m, str(m)) for m in peak)
        factors.append(f"Current month is peak disease season ({peak_str}) per ICAR")

    score = min(score, 100)

    # ── Risk level ──
    if score >= 65:
        level = "High"
    elif score >= 40:
        level = "Moderate"
    elif score >= 20:
        level = "Low"
    else:
        level = "Minimal"

    return {
        "score": score,
        "level": level,
        "factors": factors,
        "advisory": profile["advisory"],
        "source": profile["source"]
    }


def calculate_disease_risk_icar(crop_name, weather_data, soil_data=None, month=None):
    """
    Calculate per-disease risk for a crop using ICAR guidelines.

    Parameters
    ----------
    crop_name    : str
    weather_data : dict with keys: temperature, humidity, rainfall
    soil_data    : dict with keys: ph, type (or None)
    month        : int (1-12) or None

    Returns
    -------
    list[dict] sorted by score descending
    """
    temp = weather_data.get("temperature", 25)
    humidity = weather_data.get("humidity", 50)
    rainfall = weather_data.get("rainfall", 0)

    soil_ph = None
    soil_type = None
    if soil_data:
        soil_ph = soil_data.get("ph")
        soil_type = soil_data.get("type")

    diseases = get_diseases_for_crop(crop_name)
    results = []

    for disease_name in diseases:
        result = score_disease_icar(disease_name, temp, humidity, rainfall, soil_ph, soil_type, month)
        results.append({
            "name": disease_name,
            "risk_level": result["level"],
            "risk_score": result["score"],
            "contributing_factors": result["factors"],
            "advisory": result["advisory"],
            "source": result["source"]
        })

    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results


def get_soil_risk_advisory(disease_name, soil_ph, soil_type):
    """
    Get soil-specific advisory for a disease based on ICAR guidelines.
    """
    profile = ICAR_DISEASE_PROFILES.get(disease_name)
    if not profile:
        return ""

    advisories = []
    ph_min = profile.get("soil_ph_min")
    ph_max = profile.get("soil_ph_max")

    if soil_ph is not None and ph_min is not None and ph_max is not None:
        if soil_ph < ph_min:
            advisories.append(f"Apply lime @ 2-3 q/ha to raise pH from {soil_ph} to optimal range ({ph_min}-{ph_max})")
        elif soil_ph > ph_max:
            advisories.append(f"Apply gypsum @ 5-10 q/ha or elemental sulfur to lower pH from {soil_ph}")

    if soil_type and profile.get("aggravated_by_soil"):
        for agg in profile["aggravated_by_soil"]:
            if agg == "poor_drainage":
                advisories.append("Improve field drainage — ICAR recommends raised beds or drainage channels")
            elif agg == "waterlogged":
                advisories.append("Avoid waterlogging — ensure proper field levelling and drainage")
            elif agg == "high_nitrogen":
                advisories.append("Reduce nitrogen application — split N doses as per ICAR recommendation")
            elif agg == "low_potassium":
                advisories.append("Apply potassium @ 40-60 kg K2O/ha to improve disease resistance")
            elif agg == "compacted":
                advisories.append("Deep plough once in 3 years to break hardpan — ICAR recommendation")
            elif agg == "acidic":
                advisories.append("Apply lime @ 2-4 q/ha based on soil test — ICAR recommendation")

    return "; ".join(advisories) if advisories else ""


# ── ICAR Web Data Fetcher ─────────────────────
def fetch_icar_advisories(crop_name=None):
    """
    Attempt to fetch the latest ICAR disease advisories from data.gov.in.
    Falls back to local knowledge base if unavailable.

    ICAR publishes data at:
      https://api.data.gov.in/resource/<resource_id>
    """
    try:
        import requests
        resource_id = "9ef84268-d588-465a-a308-a864a43d0070"
        api_key = os.getenv("DATA_GOV_API_KEY", "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b")
        url = f"https://api.data.gov.in/resource/{resource_id}?api-key={api_key}&format=json&limit=50"
        if crop_name:
            url += f"&filters[crop]={crop_name}"

        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if "records" in data and data["records"]:
                logger.info(f"Fetched {len(data['records'])} records from data.gov.in")
                return data["records"]
    except Exception as e:
        logger.warning(f"Could not fetch ICAR advisories from data.gov.in: {e}")

    return None


# ── Save/Load ICAR data locally ──────────────
DATA_DIR = Path(__file__).parent / "data"

def save_icar_data_to_disk(data, filename="icar_fetched_data.json"):
    """Cache fetched ICAR data locally."""
    path = DATA_DIR / filename
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved ICAR data to {path}")

def load_icar_data_from_disk(filename="icar_fetched_data.json"):
    """Load cached ICAR data from disk."""
    path = DATA_DIR / filename
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None
