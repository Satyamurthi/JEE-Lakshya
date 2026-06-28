import urllib.request
import json

url = 'https://www.neetprep.com/graphql'

# Let's test a simple introspection query or chapter query
query = """
query {
  __schema {
    types {
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
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
)

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
        types = [t['name'] for t in data.get('data', {}).get('__schema', {}).get('types', []) if not t['name'].startswith('__')]
        print("FOUND TYPES IN GRAPHQL:", len(types))
        print("TYPES:", [t for t in types if 'question' in t.lower() or 'chapter' in t.lower() or 'topic' in t.lower() or 'subject' in t.lower()][:30])
except Exception as e:
    print("Error querying GraphQL:", e)
