import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.weather_disease_risk import calculate_disease_risk, _level_from_score


def test_calculate_disease_risk_rice():
    weather = {"temperature": 28, "humidity": 85, "rainfall": 40}
    risks = calculate_disease_risk("rice", weather)
    assert isinstance(risks, list)
    if risks:
        assert "name" in risks[0]
        assert "risk_level" in risks[0]
        assert "risk_score" in risks[0]


def test_calculate_disease_risk_unknown_crop():
    weather = {"temperature": 25, "humidity": 50, "rainfall": 10}
    risks = calculate_disease_risk("unknown_crop_xyz", weather)
    assert risks == []


def test_level_from_score():
    assert _level_from_score(80) == "High"
    assert _level_from_score(50) == "Moderate"
    assert _level_from_score(25) == "Low"
    assert _level_from_score(5) == "Minimal"
