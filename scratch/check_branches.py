import urllib.request
import json

url = 'https://api.github.com/repos/azeezv/Neet-PYQ-App/branches'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for b in data:
            print("BRANCH:", b['name'])
except Exception as e:
    print("Error fetching branches:", e)
