import urllib.request
import json

url = 'https://api.github.com/repos/azeezv/abdxzi.github.io/git/trees/main?recursive=1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print("TOTAL ITEMS IN abdxzi.github.io REPO:", len(data.get('tree', [])))
        for item in data.get('tree', []):
            print(item['path'])
except Exception as e:
    print("Error fetching tree from abdxzi.github.io:", e)
