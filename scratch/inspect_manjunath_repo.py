import urllib.request
import json

url = 'https://api.github.com/repos/manjunath5496/30-Years-NEET-AIPMT-Chapterwise-Paper-and-Solution-Biology/git/trees/main?recursive=1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print("TOTAL ITEMS IN MANJUNATH REPO:", len(data.get('tree', [])))
        for item in data.get('tree', []):
            print(item['path'])
except Exception as e:
    # If main doesn't work, try master branch
    url_master = 'https://api.github.com/repos/manjunath5496/30-Years-NEET-AIPMT-Chapterwise-Paper-and-Solution-Biology/git/trees/master?recursive=1'
    try:
        with urllib.request.urlopen(urllib.request.Request(url_master, headers={'User-Agent': 'Mozilla/5.0'})) as res:
            data = json.loads(res.read().decode())
            print("TOTAL ITEMS IN MANJUNATH REPO (master):", len(data.get('tree', [])))
            for item in data.get('tree', []):
                print(item['path'])
    except Exception as e2:
        print("Error fetching manjunath repo:", e2)
