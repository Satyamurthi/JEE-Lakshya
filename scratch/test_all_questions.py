import urllib.request
import json

url = 'https://www.neetprep.com/graphql'

query = """
query {
  questions(limit: 5) {
    id
    question
    options
    correctOptionIndex
    explanation
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
        print("SUCCESS! FETCHED QUESTIONS:")
        print(json.dumps(data, indent=2)[:2000])
except Exception as e:
    print("Error:", e)
