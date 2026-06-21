import subprocess
import time
import urllib.request
import json

url = 'http://localhost:5001/api/diagnostics/location'
print(f'Testing {url}...')

try:
    with urllib.request.urlopen(url, timeout=5) as response:
        data = response.read().decode('utf-8')
        print(f'  Status: {response.status}')
        print(f'  Response: {data[:200]}')
except Exception as e:
    print(f'  Error: {e}')