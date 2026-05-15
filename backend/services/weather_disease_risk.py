"""
Weather-based Crop Disease Risk Calculator
==========================================
Per-disease risk scoring based on temperature, humidity, rainfall, and season.
Data sourced from ICAR/IARI crop protection guidelines and agricultural
extension literature.
"""
from datetime import datetime

# ── Disease profiles ──────────────────────────────────────────────
# Format: (temp_min, temp_max, humidity_thresh, rain_factor, peak_months, advisory)
# rain_factor: "high" = risk increases with heavy rain
#              "low"  = risk increases with drought/dry spell
_P = {
    # ── Rice diseases (ICAR-CRRI guidelines) ──
    "Rice Blast":
        (20, 30, 85, "high", [6,7,8,9],
         "Apply Tricyclazole 75WP @ 0.6g/L. Avoid excess nitrogen fertilisation."),
    "Bacterial Leaf Blight":
        (25, 35, 80, "high", [7,8,9,10],
         "Use copper-based bactericides. Plant resistant varieties (Improved Samba Mahsuri)."),
    "Rice Sheath Blight":
        (28, 34, 90, "high", [7,8,9],
         "Apply Validamycin or Hexaconazole. Reduce plant density."),
    "Brown Spot":
        (25, 35, 80, "high", [8,9,10],
         "Ensure adequate potassium nutrition. Spray Mancozeb 75WP @ 2.5g/L."),

    # ── Wheat diseases (ICAR-IIWBR guidelines) ──
    "Wheat Rust":
        (15, 25, 70, "high", [12,1,2,3],
         "Spray Propiconazole 25EC @ 1mL/L. Use rust-resistant varieties (HD-3086, DBW-187)."),
    "Karnal Bunt":
        (18, 24, 80, "high", [2,3],
         "Avoid late sowing. Treat seeds with Carboxin + Thiram @ 2g/kg seed."),
    "Loose Smut":
        (20, 28, 75, "high", [1,2,3],
         "Treat seeds with Carbendazim @ 2g/kg. Use certified disease-free seed."),
    "Powdery Mildew Wheat":
        (15, 22, 70, "low", [12,1,2],
         "Spray wettable Sulfur 80WP @ 3g/L or Karathane 40EC."),

    # ── Maize diseases (ICAR-IIMR guidelines) ──
    "Maydis Leaf Blight":
        (20, 32, 80, "high", [7,8,9],
         "Apply Mancozeb 75WP @ 2.5g/L. Use resistant hybrids."),
    "Turcicum Leaf Blight":
        (18, 27, 85, "high", [7,8,9,10],
         "Spray Zineb or Mancozeb at 15-day intervals."),
    "Downy Mildew Maize":
        (20, 28, 90, "high", [6,7,8],
         "Treat seeds with Metalaxyl 35SD @ 4g/kg. Remove infected plants."),

    # ── Banana diseases (ICAR-NRCB guidelines) ──
    "Panama Wilt":
        (25, 35, 80, "high", [6,7,8,9,10],
         "Use Cavendish-resistant TC plants. Apply Trichoderma viride to soil @ 50g/plant."),
    "Sigatoka Leaf Spot":
        (25, 32, 85, "high", [7,8,9,10],
         "Spray Carbendazim 50WP or Propiconazole 25EC. Remove infected leaves."),
    "Bunchy Top Virus":
        (20, 30, 70, "high", [3,4,5,6],
         "Control aphid vectors with Imidacloprid. Remove and destroy infected plants."),

    # ── Coconut diseases (ICAR-CPCRI guidelines) ──
    "Bud Rot":
        (25, 35, 90, "high", [6,7,8,9],
         "Apply Bordeaux paste (10%) to crown. Improve drainage around palms."),
    "Leaf Blight Coconut":
        (28, 35, 85, "high", [7,8,9,10],
         "Remove and burn infected leaves. Spray Mancozeb 75WP."),

    # ── Jute diseases (ICAR-CRIJAF guidelines) ──
    "Stem Rot Jute":
        (28, 35, 85, "high", [7,8,9],
         "Treat seeds with Carbendazim @ 2g/kg. Practice crop rotation."),
    "Anthracnose Jute":
        (25, 32, 80, "high", [6,7,8],
         "Spray Copper Oxychloride 50WP @ 3g/L. Avoid waterlogging."),

    # ── Cotton diseases (ICAR-CICR guidelines) ──
    "Cotton Boll Rot":
        (25, 35, 85, "high", [8,9,10],
         "Spray Copper Hydroxide. Ensure proper spacing for air circulation."),
    "Bacterial Blight Cotton":
        (25, 35, 80, "high", [7,8,9,10],
         "Use resistant varieties. Spray Streptocycline 100ppm + COC."),
    "Grey Mildew Cotton":
        (20, 28, 90, "high", [9,10,11],
         "Spray wettable Sulfur 80WP or Dinocap 48EC."),

    # ── Sugarcane diseases (ICAR-SBI guidelines) ──
    "Red Rot Sugarcane":
        (25, 32, 85, "high", [7,8,9,10],
         "Use resistant varieties (Co 238, Co 0238). Treat setts with Carbendazim."),
    "Smut Sugarcane":
        (28, 35, 80, "high", [3,4,5,6],
         "Remove smutted whips before spore dispersal. Use disease-free setts."),
    "Wilt Sugarcane":
        (30, 38, 70, "low", [4,5,6],
         "Practice crop rotation. Avoid water stress during grand growth phase."),

    # ── Potato diseases (ICAR-CPRI guidelines) ──
    "Late Blight Potato":
        (12, 22, 85, "high", [12,1,2],
         "Spray Mancozeb 75WP @ 2g/L preventively. Use resistant varieties (Kufri Jyoti)."),
    "Early Blight Potato":
        (24, 32, 70, "low", [10,11,12],
         "Spray Chlorothalonil or Mancozeb. Remove infected plant debris."),
    "Black Scurf Potato":
        (15, 22, 80, "high", [11,12,1],
         "Treat tubers with Boric acid 3% or Pencycuron before planting."),

    # ── Groundnut diseases (ICAR-DGR guidelines) ──
    "Tikka Disease":
        (25, 30, 80, "high", [7,8,9,10],
         "Spray Chlorothalonil 75WP or Carbendazim 50WP at 30-day intervals."),
    "Collar Rot Groundnut":
        (28, 35, 85, "high", [7,8],
         "Treat seeds with Trichoderma viride @ 4g/kg. Avoid waterlogging."),
    "Rust Groundnut":
        (20, 28, 85, "high", [8,9,10],
         "Spray Mancozeb 75WP @ 2.5g/L. Use resistant varieties (GPBD-4)."),

    # ── Soybean diseases (ICAR-IISR guidelines) ──
    "Rust Soybean":
        (18, 28, 80, "high", [8,9,10],
         "Spray Hexaconazole 5EC @ 2mL/L. Use tolerant varieties (JS 335)."),
    "Yellow Mosaic Soybean":
        (25, 35, 70, "high", [7,8,9],
         "Control whitefly vector with Imidacloprid. Use resistant varieties."),
    "Charcoal Rot Soybean":
        (30, 40, 60, "low", [9,10],
         "Practice crop rotation. Maintain adequate soil moisture."),

    # ── Mustard/Rapeseed diseases (ICAR-DRMR guidelines) ──
    "Alternaria Blight Mustard":
        (15, 25, 80, "high", [12,1,2],
         "Spray Mancozeb 75WP @ 2g/L. Use IPM-resistant varieties (NRCHB-101)."),
    "White Rust Mustard":
        (12, 20, 85, "high", [11,12,1,2],
         "Spray Metalaxyl + Mancozeb. Avoid dense planting."),
    "Sclerotinia Rot Mustard":
        (15, 22, 90, "high", [1,2,3],
         "Spray Carbendazim 50WP @ 1g/L at flowering. Practice crop rotation."),

    # ── Chickpea/Gram diseases (ICAR-IIPR guidelines) ──
    "Wilt Chickpea":
        (20, 30, 70, "low", [11,12,1],
         "Use resistant varieties (JG-16, Vijay). Treat seeds with Trichoderma + Carbendazim."),
    "Ascochyta Blight Chickpea":
        (10, 20, 85, "high", [12,1,2],
         "Spray Mancozeb + Carbendazim. Avoid overhead irrigation."),
    "Botrytis Grey Mold":
        (15, 25, 90, "high", [1,2,3],
         "Spray Carbendazim 50WP. Ensure proper spacing and drainage."),

    # ── Mango diseases (ICAR-CISH guidelines) ──
    "Anthracnose Mango":
        (24, 32, 85, "high", [6,7,8,9],
         "Spray Carbendazim 50WP @ 1g/L before and after flowering."),
    "Powdery Mildew Mango":
        (20, 28, 60, "low", [2,3,4],
         "Spray wettable Sulfur 80WP @ 2g/L or Hexaconazole at panicle emergence."),
    "Mango Malformation":
        (10, 20, 75, "high", [12,1,2],
         "Prune and burn malformed panicles. Spray NAA 200ppm in October."),

    # ── Tomato diseases ──
    "Late Blight Tomato":
        (15, 22, 85, "high", [11,12,1,2],
         "Spray Mancozeb 75WP or Cymoxanil + Mancozeb. Stake plants for airflow."),
    "Early Blight Tomato":
        (25, 32, 75, "high", [3,4,5,10,11],
         "Spray Chlorothalonil or Mancozeb. Remove lower infected leaves."),
    "Leaf Curl Virus Tomato":
        (25, 35, 60, "low", [3,4,5,6],
         "Control whitefly with yellow sticky traps + Imidacloprid. Use tolerant varieties."),
}

# ── Crop → Disease mapping ────────────────────────────────────────
CROP_DISEASES = {
    "rice":       ["Rice Blast", "Bacterial Leaf Blight", "Rice Sheath Blight", "Brown Spot"],
    "wheat":      ["Wheat Rust", "Karnal Bunt", "Loose Smut", "Powdery Mildew Wheat"],
    "maize":      ["Maydis Leaf Blight", "Turcicum Leaf Blight", "Downy Mildew Maize"],
    "banana":     ["Panama Wilt", "Sigatoka Leaf Spot", "Bunchy Top Virus"],
    "coconut":    ["Bud Rot", "Leaf Blight Coconut"],
    "jute":       ["Stem Rot Jute", "Anthracnose Jute"],
    "cotton":     ["Cotton Boll Rot", "Bacterial Blight Cotton", "Grey Mildew Cotton"],
    "sugarcane":  ["Red Rot Sugarcane", "Smut Sugarcane", "Wilt Sugarcane"],
    "potato":     ["Late Blight Potato", "Early Blight Potato", "Black Scurf Potato"],
    "groundnut":  ["Tikka Disease", "Collar Rot Groundnut", "Rust Groundnut"],
    "soybean":    ["Rust Soybean", "Yellow Mosaic Soybean", "Charcoal Rot Soybean"],
    "soyabean":   ["Rust Soybean", "Yellow Mosaic Soybean", "Charcoal Rot Soybean"],
    "mustard":    ["Alternaria Blight Mustard", "White Rust Mustard", "Sclerotinia Rot Mustard"],
    "chickpea":   ["Wilt Chickpea", "Ascochyta Blight Chickpea", "Botrytis Grey Mold"],
    "gram":       ["Wilt Chickpea", "Ascochyta Blight Chickpea", "Botrytis Grey Mold"],
    "mango":      ["Anthracnose Mango", "Powdery Mildew Mango", "Mango Malformation"],
    "tomato":     ["Late Blight Tomato", "Early Blight Tomato", "Leaf Curl Virus Tomato"],
}


def _score_disease(profile, temp, humidity, rainfall, month):
    """Score a single disease from 0-100 and return contributing factors."""
    t_min, t_max, hum_thresh, rain_fac, peak_months, _ = profile
    score = 0
    factors = []

    # Temperature factor (0-35 pts)
    if t_min <= temp <= t_max:
        # Closer to mid-range → higher risk
        mid = (t_min + t_max) / 2
        closeness = 1 - abs(temp - mid) / ((t_max - t_min) / 2)
        pts = int(closeness * 35)
        score += pts
        factors.append(f"Temperature {temp:.1f}°C is in optimal disease range ({t_min}-{t_max}°C)")
    elif abs(temp - t_min) <= 5 or abs(temp - t_max) <= 5:
        score += 10
        factors.append(f"Temperature {temp:.1f}°C is near disease-favourable range ({t_min}-{t_max}°C)")

    # Humidity factor (0-30 pts)
    if humidity >= hum_thresh:
        excess = min((humidity - hum_thresh) / 15, 1.0)
        pts = 15 + int(excess * 15)
        score += pts
        factors.append(f"Humidity {humidity:.0f}% exceeds threshold ({hum_thresh}%)")
    elif humidity >= hum_thresh - 10:
        score += 8
        factors.append(f"Humidity {humidity:.0f}% is approaching threshold ({hum_thresh}%)")

    # Rainfall factor (0-20 pts)
    if rain_fac == "high":
        if rainfall > 50:
            pts = min(int(rainfall / 15), 20)
            score += pts
            factors.append(f"Heavy rainfall ({rainfall:.0f}mm) favours this disease")
        elif rainfall > 20:
            score += 5
    else:  # "low" — disease favoured by dry conditions
        if rainfall < 10:
            score += 20
            factors.append(f"Dry conditions ({rainfall:.0f}mm) favour this disease")
        elif rainfall < 30:
            score += 10
            factors.append(f"Low rainfall ({rainfall:.0f}mm) may favour this disease")

    # Season factor (0-15 pts)
    if month in peak_months:
        score += 15
        month_names = {1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",
                       7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec"}
        peak_str = ", ".join(month_names.get(m, str(m)) for m in peak_months)
        factors.append(f"Current month is within peak season ({peak_str})")

    return min(score, 100), factors


def _level_from_score(score):
    """Convert numeric score to risk level."""
    if score >= 60:
        return "High"
    elif score >= 35:
        return "Moderate"
    elif score >= 15:
        return "Low"
    else:
        return "Minimal"


def calculate_disease_risk(crop_name, weather_data):
    """
    Calculate per-disease risk for a given crop based on current weather.

    Parameters
    ----------
    crop_name    : str  — crop name (e.g. "rice", "wheat")
    weather_data : dict — {"temperature", "humidity", "rainfall"}

    Returns
    -------
    list[dict] — sorted by risk_score descending, each dict has:
        name, risk_level, risk_score, contributing_factors, advisory
    """
    crop_key = crop_name.strip().lower()

    # Handle APY-style names like "cotton(lint)", "moong(green gram)"
    if "(" in crop_key:
        crop_key = crop_key.split("(")[0].strip()
    if "/" in crop_key:
        for part in crop_key.split("/"):
            if part.strip() in CROP_DISEASES:
                crop_key = part.strip()
                break

    diseases = CROP_DISEASES.get(crop_key, [])
    if not diseases:
        return []

    temp = weather_data.get("temperature", 25)
    humidity = weather_data.get("humidity", 50)
    rainfall = weather_data.get("rainfall", 0)
    month = datetime.now().month

    results = []
    for disease_name in diseases:
        profile = _P.get(disease_name)
        if not profile:
            continue

        score, factors = _score_disease(profile, temp, humidity, rainfall, month)
        level = _level_from_score(score)

        results.append({
            "name": disease_name,
            "risk_level": level,
            "risk_score": score,
            "contributing_factors": factors,
            "advisory": profile[5],  # advisory text
        })

    # Sort by risk score, highest first
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results
