import urllib.request
import json
import sqlite3
import os
import re
import html

url = 'https://www.neetprep.com/graphql'

def clean_html(text):
    if not text:
        return ""
    # Unescape HTML entities like &nbsp;, &#39;, etc.
    text = html.unescape(text)
    # Replace <br>, <br/>, <p> with newline or space
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</p>', '\n', text, flags=re.IGNORECASE)
    # Strip remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

print("Testing NEETprep question scraping and cleaning...")

query = """
query GetQuestions($offset: Int) {
  questions(limit: 50, offset: $offset) {
    id
    question
    options
    correctOptionIndex
    explanation
    topicId
  }
}
"""

req = urllib.request.Request(
    url, 
    data=json.dumps({"query": query, "variables": {"offset": 0}}).encode('utf-8'),
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Content-Type': 'application/json'
    }
)

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
        qs = data.get('data', {}).get('questions', [])
        print(f"Sample fetched {len(qs)} questions:")
        for q in qs[:5]:
            stmt = clean_html(q.get('question'))
            print("--- QUESTION ---")
            print("Statement:", stmt[:150])
            print("Options:", q.get('options'))
            print("Correct Index:", q.get('correctOptionIndex'))
except Exception as e:
    print("Error:", e)
