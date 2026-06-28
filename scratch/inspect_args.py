import urllib.request
import json

url = 'https://www.neetprep.com/graphql'

query = """
query {
  __type(name: "Root") {
    fields {
      name
      args {
        name
        type {
          name
          kind
        }
      }
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
        for f in fields:
            if 'question' in f['name'].lower() and 'connection' not in f['name'].lower():
                args_str = ", ".join([f"{a['name']}: {a['type']['name'] or a['type']['kind']}" for a in f['args']])
                print(f"{f['name']}({args_str}) -> {f['type']['name'] or f['type']['kind']}")
except Exception as e:
    print("Error:", e)
