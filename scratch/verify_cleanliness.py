import json
import re

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

pua_count = 0
short_count = 0
for paper_key, paper_obj in data.items():
    for q in paper_obj.get('questions', []):
        stmt = q.get('statement', '')
        if re.search(r'[\uf000-\uf0ff]', stmt):
            pua_count += 1
        if len(stmt.strip()) < 15:
            short_count += 1

print(f"Verification Results:")
print(f"- Total questions with PUA unicode characters: {pua_count}")
print(f"- Total questions with suspiciously short statements (<15 chars): {short_count}")
