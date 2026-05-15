def calculate_risk(data):
    score = 0

    # Use .get() with sensible defaults to prevent KeyError
    temp = data.get("temperature", 25)
    rainfall = data.get("rainfall", 100)
    humidity = data.get("humidity", 50)

    # 🌵 drought
    if rainfall < 50:
        score += 2
    if temp > 32:
        score += 2

    # 🌧 flood
    if rainfall > 300:
        score += 3

    # 🌫 humidity
    if humidity > 85:
        score += 1

    # 🎯 decision
    if score >= 4:
        return "High Risk"
    elif score >= 2:
        return "Moderate Risk"
    else:
        return "Low Risk"