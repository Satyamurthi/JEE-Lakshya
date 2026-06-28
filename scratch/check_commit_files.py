import urllib.request
import json

shas = ['9e50eef2', '5b949e11', '233b7f85', '69b5856b']

for sha in shas:
    url = f'https://api.github.com/repos/azeezv/Neet-PYQ-App/commits/{sha}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            print(f"=== COMMIT {sha} ({data['commit']['message']}) ===")
            for f in data.get('files', []):
                print("   ", f['filename'])
    except Exception as e:
        print(f"Error {sha}:", e)
