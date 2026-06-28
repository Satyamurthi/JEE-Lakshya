import urllib.request
import json

url = 'https://www.neetprep.com/graphql'

# Let's test topicQuestions or questionDetails or allQuestions
query = """
query {
  topicQuestions(first: 5) {
    edges {
      node {
        id
        question
        questionWithMathjax
        options
        correctOptionIndex
        explanation
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
        print(json.dumps(data, indent=2)[:1500])
except Exception as e:
    print("Error:", e)
