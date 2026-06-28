import urllib.request
import json

url = 'https://api.github.com/search/code?q=class+Document+repo:azeezv/Neet-PYQ-App'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(data)
except Exception as e:
    print("Error code search:", e)
