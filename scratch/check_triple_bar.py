import json

with open('src/data/officialJeeExtractedPapers.json', encoding='utf-8') as f:
    data = json.load(f)

with open('scratch/triple_bar.txt', 'w', encoding='utf-8') as rf:
    for p in data.values():
        for q in p.get('questions', []):
            stmt = q.get('statement', '')
            opts = q.get('options') or []
            if '≡' in stmt or any('≡' in str(opt) for opt in opts):
                rf.write(f"ID: {q['id']}\nStatement: {stmt}\nOptions: {opts}\n\n")
