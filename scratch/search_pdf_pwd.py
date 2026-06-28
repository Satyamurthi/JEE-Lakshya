import urllib.request
import json

url = 'https://api.github.com/repos/azeezv/Neet-PYQ-App/git/trees/main?recursive=1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    for item in data.get('tree', []):
        if item['type'] == 'blob':
            furl = f"https://raw.githubusercontent.com/azeezv/Neet-PYQ-App/main/{item['path']}"
            try:
                with urllib.request.urlopen(furl) as f:
                    txt = f.read().decode('utf-8', errors='ignore')
                    for kw in ['password', 'decrypt', 'key', 'pdf', 'secret', 'pass']:
                        if kw in txt.lower():
                            print(f"[{item['path']}] matches kw '{kw}'")
                            for line in txt.split('\n'):
                                if kw in line.lower():
                                    print("   ", line.strip()[:100])
            except Exception as e:
                pass
