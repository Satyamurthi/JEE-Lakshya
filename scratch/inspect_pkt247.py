import urllib.request
import json

urls = [
    'https://api.github.com/repos/pkt247/neet/git/trees/main?recursive=1',
    'https://api.github.com/repos/pkt247/neet/git/trees/master?recursive=1',
    'https://api.github.com/repos/pkt247/pkt247.github.io/git/trees/main?recursive=1',
    'https://api.github.com/repos/pkt247/pkt247.github.io/git/trees/master?recursive=1'
]

for url in urls:
    print("=== TESTING URL:", url)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            print(f"FOUND {len(data.get('tree', []))} ITEMS")
            for item in data.get('tree', []):
                path = item['path']
                if any(k in path.lower() for k in ['neet', 'pyq', 'pdf', 'json', 'js', 'html', 'csv']):
                    print("  ", path)
    except Exception as e:
        print("  Error:", e)
