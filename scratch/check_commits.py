import urllib.request
import json

url = 'https://api.github.com/repos/azeezv/Neet-PYQ-App/commits'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        commits = json.loads(response.read().decode())
        print("COMMITS COUNT:", len(commits))
        for c in commits[:10]:
            print(c['sha'][:8], c['commit']['message'])
except Exception as e:
    print("Error commits:", e)
