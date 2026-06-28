import urllib.request
import json

url = 'https://www.neetprep.com/graphql'

query = """
query {
  topics(limit: 100) {
    id
    name
    subject {
      id
      name
    }
  }
}
"""

req = urllib.request.Request(
    url, 
    data=json.dumps({"query": query}).encode('utf-8'),
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Content-Type': 'application/json'
    }
)

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
        topics = data.get('data', {}).get('topics', [])
        print(f"FETCHED {len(topics)} TOPICS/CHAPTERS:")
        for t in topics[:20]:
            sub_name = t.get('subject', {}).get('name') if t.get('subject') else 'Unknown'
            print(f"  [{t['id']}] {t['name']} (Subject: {sub_name})")
except Exception as e:
    print("Error:", e)
