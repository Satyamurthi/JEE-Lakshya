import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

counts = {}
for paper_key, paper in data.items():
    q_len = len(paper.get('questions', []))
    counts[paper_key] = q_len

print(f"Total papers in JSON: {len(data)}")
short_papers = {k: v for k, v in counts.items() if v < 75}
full_papers = {k: v for k, v in counts.items() if v >= 75}

print(f"Full papers (>=75 questions): {len(full_papers)}")
print(f"Short papers (<75 questions): {len(short_papers)}")

print("\nSample short papers:")
for k in list(short_papers.keys())[:15]:
    print(f"  {k} -> {short_papers[k]} questions")

