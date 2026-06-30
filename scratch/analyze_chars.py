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
                    if '\uf000' <= c <= '\uf0ff' or c == '≡':
                        chars[c] += 1
                        if len(examples[c]) < 3:
                            examples[c].append((q['id'], text[:100].replace('\n', ' ')))

print(f"Total distinct corrupt characters: {len(chars)}")
with open('scratch/char_report.txt', 'w', encoding='utf-8') as rf:
    for k, v in chars.most_common():
        rf.write(f"U+{ord(k):04X} ({repr(k)}): {v} occurrences\n")
        for qid, ex in examples[k]:
            rf.write(f"   [Sample {qid}]: {ex}\n")
print("Report written to scratch/char_report.txt")
