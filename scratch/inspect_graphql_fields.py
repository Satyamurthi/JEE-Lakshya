import urllib.request
import json

url = 'https://www.neetprep.com/graphql'

query = """
query {
  __type(name: "Question") {
    name
    fields {
      name
      type {
        name
        kind
      }
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
        fields = data.get('data', {}).get('__type', {}).get('fields', [])
        print("QUESTION FIELDS:")
        for f in fields:
            print(f"  - {f['name']} ({f['type']['name'] or f['type']['kind']})")
except Exception as e:
    print("Error:", e)
