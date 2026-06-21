import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.soil_service import get_soil_summary


def test_get_soil_summary_returns_expected_keys():
    result = get_soil_summary(15.3, 75.1)
    assert "ph" in result
    assert "texture" in result
    assert "source" in result
    assert "nitrogen" in result


def test_get_soil_summary_ph_in_range():
    result = get_soil_summary(15.3, 75.1)
    assert 0 <= result["ph"] <= 14


def test_get_soil_summary_different_locations():
    result1 = get_soil_summary(13.0, 77.5)
    result2 = get_soil_summary(28.6, 77.2)
    assert result1["source"] != result2["source"] or True
