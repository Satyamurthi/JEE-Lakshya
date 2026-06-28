import urllib.request
import json

url = 'https://api.github.com/users/azeezv/repos'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for repo in data:
            print("REPO:", repo['name'], repo['html_url'])
except Exception as e:
    print("Error fetching user repos:", e)
