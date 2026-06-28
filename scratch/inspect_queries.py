import urllib.request
import json

url = 'https://www.neetprep.com/graphql'

query = """
query {
  __schema {
    queryType {
      name
      fields {
        name
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
        qtype = data.get('data', {}).get('__schema', {}).get('queryType', {})
        print("QUERY TYPE NAME:", qtype.get('name'))
        fields = [f['name'] for f in qtype.get('fields', [])]
        print("TOTAL FIELDS:", len(fields))
        print("SAMPLE FIELDS:", [f for f in fields if any(k in f.lower() for k in ['question', 'topic', 'chapter', 'subject'])][:30])
except Exception as e:
    print("Error:", e)
