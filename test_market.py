import requests
import json

url = "http://localhost:5001/api/market-data"
headers = {"Content-Type": "application/json", "X-Api-Key": "dummy"}
data = {"crop": "Tomato", "region": "Karnataka"}

response = requests.post(url, headers=headers, json=data)
print("Status Code:", response.status_code)
print("Response:", response.text)
