import requests

endpoints = [
    ("GET", "http://localhost:5001/api/crops"),
    ("GET", "http://localhost:5001/api/cities?q=Mysore"),
    ("GET", "http://localhost:5001/api/market/forecast?crop=Paddy"),
    ("POST", "http://localhost:5001/api/diagnostics/location", {"city": "Bangalore"}),
    ("POST", "http://localhost:5001/api/crop-analyzer", {"crop": "Paddy", "city": "Bangalore"})
]

for method, url, *body in endpoints:
    print(f"Testing {method} {url}...")
    try:
        if method == "GET":
            r = requests.get(url)
        else:
            r = requests.post(url, json=body[0] if body else {})
        print(f"  Status: {r.status_code}")
        if r.status_code != 200:
            print(f"  Error: {r.text[:200]}")
    except Exception as e:
        print(f"  Request failed: {e}")
