import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total papers in officialJeeExtractedPapers.json: {len(data)}")
sample_keys = list(data.keys())[:10]
for k in sample_keys:
    paper = data[k]
    print(f"- {k} ({paper.get('year')}, {paper.get('shift')}): {len(paper.get('questions', []))} questions")
