import json
import collections

with open('src/data/officialJeeExtractedPapers.json', encoding='utf-8') as f:
    data = json.load(f)

chars = collections.Counter()
examples = collections.defaultdict(list)

for paper_id, paper in data.items():
    for q in paper.get('questions', []):
        stmt = q.get('statement', '')
        opts = q.get('options') or []
        for text in [stmt] + opts:
            if isinstance(text, str):
                for c in text:
                    if '\uf000' <= c <= '\uf0ff' or c == '≡' or c == '':
                        chars[c] += 1
                        if len(examples[c]) < 2:
                            examples[c].append(text[:80].replace('\n', ' '))

with open('scratch/full_char_map.txt', 'w', encoding='utf-8') as rf:
    for k, v in chars.most_common():
        rf.write(f"Hex: 0x{ord(k):04X} | Count: {v} | Ex: {examples[k]}\n")

print("Full char map written to scratch/full_char_map.txt")
