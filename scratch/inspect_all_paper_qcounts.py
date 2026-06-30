import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total papers: {len(data)}")
under_60 = []
for k, v in data.items():
    qs = v.get('questions', [])
    if len(qs) < 60:
        under_60.append((k, len(qs)))

print(f"Papers with < 60 questions: {len(under_60)}")
for k, count in under_60:
    print(f"  {k} -> {count} questions")
