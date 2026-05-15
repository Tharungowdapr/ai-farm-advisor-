"""
Sowing Calendar Service
Generates a 12-week milestone calendar for a given crop.
"""

# ── Crop calendar definitions ───────────────────────────────────────
# Each value maps milestone names to their week offset (1-indexed).
CROP_CALENDARS = {
    "rice": {
        "land_prep": 1,
        "sowing": 2,
        "first_fertiliser": 3,
        "irrigation_check": 4,
        "pest_monitoring": 5,
        "second_fertiliser": 7,
        "pre_harvest": 10,
        "harvest": 12,
    },
    "wheat": {
        "land_prep": 1,
        "sowing": 2,
        "first_fertiliser": 3,
        "irrigation_check": 5,
        "pest_monitoring": 6,
        "second_fertiliser": 8,
        "pre_harvest": 11,
        "harvest": 12,
    },
    "maize": {
        "land_prep": 1,
        "sowing": 2,
        "first_fertiliser": 3,
        "irrigation_check": 4,
        "pest_monitoring": 6,
        "second_fertiliser": 7,
        "pre_harvest": 10,
        "harvest": 12,
    },
    "banana": {
        "land_prep": 1,
        "sowing": 2,
        "first_fertiliser": 3,
        "irrigation_check": 4,
        "pest_monitoring": 5,
        "second_fertiliser": 7,
        "pre_harvest": 10,
        "harvest": 12,
    },
    "coconut": {
        "land_prep": 1,
        "sowing": 2,
        "first_fertiliser": 4,
        "irrigation_check": 5,
        "pest_monitoring": 6,
        "second_fertiliser": 8,
        "pre_harvest": 10,
        "harvest": 12,
    },
    "jute": {
        "land_prep": 1,
        "sowing": 2,
        "first_fertiliser": 3,
        "irrigation_check": 4,
        "pest_monitoring": 6,
        "second_fertiliser": 7,
        "pre_harvest": 10,
        "harvest": 12,
    },
    "cotton": {
        "land_prep": 1,
        "sowing": 2,
        "first_fertiliser": 3,
        "irrigation_check": 5,
        "pest_monitoring": 6,
        "second_fertiliser": 8,
        "pre_harvest": 11,
        "harvest": 12,
    },
    "sugarcane": {
        "land_prep": 1,
        "sowing": 2,
        "first_fertiliser": 3,
        "irrigation_check": 4,
        "pest_monitoring": 6,
        "second_fertiliser": 8,
        "pre_harvest": 10,
        "harvest": 12,
    },
    "tomato": {
        "land_prep": 1,
        "sowing": 2,
        "first_fertiliser": 3,
        "irrigation_check": 4,
        "pest_monitoring": 5,
        "second_fertiliser": 6,
        "pre_harvest": 9,
        "harvest": 10,
    },
    "potato": {
        "land_prep": 1,
        "sowing": 2,
        "first_fertiliser": 3,
        "irrigation_check": 4,
        "pest_monitoring": 5,
        "second_fertiliser": 7,
        "pre_harvest": 9,
        "harvest": 10,
    },
}

# Sensible default for any unknown crop
_DEFAULT_CALENDAR = {
    "land_prep": 1,
    "sowing": 2,
    "first_fertiliser": 3,
    "irrigation_check": 4,
    "pest_monitoring": 6,
    "second_fertiliser": 7,
    "pre_harvest": 10,
    "harvest": 12,
}

# ── Milestone metadata ──────────────────────────────────────────────
_MILESTONE_META = {
    "land_prep": {
        "task": "Land Preparation",
        "description": "Plough, level the field, and incorporate organic matter to improve soil structure.",
        "type": "prep",
    },
    "sowing": {
        "task": "Sowing / Transplanting",
        "description": "Sow seeds or transplant seedlings at recommended spacing and depth.",
        "type": "sow",
    },
    "first_fertiliser": {
        "task": "First Fertiliser Application",
        "description": "Apply basal dose of NPK fertiliser based on soil-test recommendations.",
        "type": "fertilise",
    },
    "irrigation_check": {
        "task": "Irrigation Check",
        "description": "Verify soil moisture levels and schedule irrigation to maintain optimal water supply.",
        "type": "water",
    },
    "pest_monitoring": {
        "task": "Pest & Disease Monitoring",
        "description": "Scout the field for pest infestations or disease symptoms; apply IPM measures if needed.",
        "type": "monitor",
    },
    "second_fertiliser": {
        "task": "Second Fertiliser (Top Dressing)",
        "description": "Apply top-dressing of nitrogen fertiliser to support vegetative and reproductive growth.",
        "type": "fertilise",
    },
    "pre_harvest": {
        "task": "Pre-Harvest Assessment",
        "description": "Check crop maturity indicators, plan harvest logistics, and arrange storage.",
        "type": "monitor",
    },
    "harvest": {
        "task": "Harvest",
        "description": "Harvest the crop at optimal maturity to maximise yield and quality.",
        "type": "harvest",
    },
}


def generate_calendar(crop: str, city: str = "") -> list[dict]:
    """
    Generate a 12-week sowing calendar for the given crop.

    Returns a list of 12 dicts, one per week:
        {"week": int, "task": str, "description": str, "type": str}

    Weeks without a specific milestone get a general maintenance entry.
    """
    crop_lower = crop.strip().lower()
    schedule = CROP_CALENDARS.get(crop_lower, _DEFAULT_CALENDAR)

    # Build a week → milestone-key lookup
    week_to_milestone: dict[int, str] = {}
    for milestone_key, week_num in schedule.items():
        week_to_milestone[week_num] = milestone_key

    calendar: list[dict] = []
    for week in range(1, 13):
        if week in week_to_milestone:
            meta = _MILESTONE_META[week_to_milestone[week]]
            calendar.append({
                "week": week,
                "task": meta["task"],
                "description": meta["description"],
                "type": meta["type"],
            })
        else:
            calendar.append({
                "week": week,
                "task": "Routine Maintenance",
                "description": "Continue regular weeding, irrigation, and field monitoring.",
                "type": "monitor",
            })

    return calendar
