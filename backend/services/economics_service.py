"""
Economics Service
=================
Estimates input costs, revenue, profit, and ROI using official
Government of India data (MSP 2024-25, CACP cost of cultivation).

Data source: data/crop_economics.json
  - MSP rates: PIB/CCEA notifications for 2024-25
  - Input costs: CACP & DES Cost of Cultivation scheme
  - Non-MSP prices: AGMARKNET average mandi prices 2023-24
"""

import os
import json

# ── Load crop economics data ─────────────────────────────────────
_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data", "crop_economics.json"
)

_economics_data = None
_crop_lookup = None  # lowercase name/alias → canonical key


def _load_data():
    """Lazy-load economics JSON and build alias lookup."""
    global _economics_data, _crop_lookup
    if _economics_data is not None:
        return True

    if not os.path.exists(_DATA_PATH):
        print(f"[economics] Data file not found: {_DATA_PATH}")
        return False

    try:
        with open(_DATA_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)
        _economics_data = raw.get("crops", {})

        # Build lookup: lowercase name + aliases → canonical key
        _crop_lookup = {}
        for key, info in _economics_data.items():
            _crop_lookup[key.lower()] = key
            for alias in info.get("aliases", []):
                _crop_lookup[alias.lower()] = key

        print(f"[economics] Loaded {len(_economics_data)} crops from GOI data")
        return True
    except Exception as e:
        print(f"[economics] Failed to load data: {e}")
        return False


def _find_crop(crop_name):
    """Find crop data by name or alias (case-insensitive)."""
    if not _load_data():
        return None, None

    name = crop_name.strip().lower()

    # Direct match
    if name in _crop_lookup:
        key = _crop_lookup[name]
        return key, _economics_data[key]

    # Partial match (e.g. "rice" in "paddy rice")
    for alias, key in _crop_lookup.items():
        if name in alias or alias in name:
            return key, _economics_data[key]

    return None, None


# ── Default fallback for unknown crops ────────────────────────────
_DEFAULT_DATA = {
    "msp_per_quintal": 2500,
    "msp_per_tonne": 25000,
    "price_type": "Estimated",
    "season": "other",
    "is_msp_crop": False,
    "input_costs_per_hectare": {
        "seed": 1000, "fertilizer": 2000, "pesticide": 800,
        "irrigation": 1500, "hired_labour": 5000,
        "family_labour": 3500, "machinery": 2000, "miscellaneous": 800
    },
    "total_a2_cost_per_hectare": 13100,
    "total_a2fl_cost_per_hectare": 16600,
    "avg_yield_quintal_per_hectare": 15,
    "avg_yield_tonne_per_hectare": 1.5,
    "source": "Estimated average (no official data available)",
    "aliases": []
}


def estimate_economics(crop, yield_value, area_hectares=1.0):
    """
    Estimate input costs, revenue, profit, and ROI using official GOI data.

    Args:
        crop:           Crop name (case-insensitive).
        yield_value:    Predicted yield in tonnes per hectare.
        area_hectares:  Farm area in hectares (default 1.0).

    Returns a dict with detailed economics breakdown.
    """
    crop_key, data = _find_crop(crop)

    if data is None:
        data = _DEFAULT_DATA
        crop_key = crop.strip().lower()
        is_estimated = True
    else:
        is_estimated = False

    costs = data["input_costs_per_hectare"]
    price_per_tonne = data["msp_per_tonne"]

    # ── Per-hectare input costs ────────────────────────────────
    seed_cost = costs["seed"] * area_hectares
    fertilizer_cost = costs["fertilizer"] * area_hectares
    pesticide_cost = costs["pesticide"] * area_hectares
    irrigation_cost = costs["irrigation"] * area_hectares
    hired_labour_cost = costs["hired_labour"] * area_hectares
    family_labour_cost = costs["family_labour"] * area_hectares
    machinery_cost = costs["machinery"] * area_hectares
    misc_cost = costs["miscellaneous"] * area_hectares

    # A2 = paid-out costs (excluding family labour)
    total_a2 = (seed_cost + fertilizer_cost + pesticide_cost +
                irrigation_cost + hired_labour_cost + machinery_cost + misc_cost)

    # A2 + FL = including imputed family labour (CACP standard)
    total_a2fl = total_a2 + family_labour_cost

    # ── Revenue ────────────────────────────────────────────────
    total_yield_tonnes = yield_value * area_hectares
    total_yield_quintals = total_yield_tonnes * 10
    expected_revenue = total_yield_tonnes * price_per_tonne

    # ── Profit & ROI (based on A2+FL, CACP methodology) ───────
    profit = expected_revenue - total_a2fl
    roi_percent = (profit / total_a2fl * 100) if total_a2fl > 0 else 0
    break_even_yield_tonnes = (total_a2fl / price_per_tonne) if price_per_tonne > 0 else 0

    return {
        "crop": crop,
        "area_hectares": area_hectares,

        # Itemised input costs (₹)
        "seed_cost": round(seed_cost),
        "fertilizer_cost": round(fertilizer_cost),
        "pesticide_cost": round(pesticide_cost),
        "irrigation_cost": round(irrigation_cost),
        "hired_labour_cost": round(hired_labour_cost),
        "family_labour_cost": round(family_labour_cost),
        "machinery_cost": round(machinery_cost),
        "miscellaneous_cost": round(misc_cost),

        # Totals
        "total_a2_cost": round(total_a2),
        "total_a2fl_cost": round(total_a2fl),
        "total_cost": round(total_a2fl),  # backward-compat key

        # Revenue
        "price_per_quintal": data["msp_per_quintal"],
        "mandi_price_per_tonne": price_per_tonne,
        "price_type": data["price_type"],
        "is_msp_crop": data["is_msp_crop"],
        "expected_revenue": round(expected_revenue),
        "total_yield_quintals": round(total_yield_quintals, 2),

        # Profitability
        "profit": round(profit),
        "roi_percent": round(roi_percent, 1),
        "break_even_yield": round(break_even_yield_tonnes, 3),

        # Meta
        "season": data["season"],
        "source": data["source"],
        "data_available": not is_estimated,

        # Backward compatibility
        "fertiliser_cost": round(fertilizer_cost),
        "labour_cost": round(hired_labour_cost + family_labour_cost),
    }
