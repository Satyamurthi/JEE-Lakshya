import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

paper = data['pyq_jee_main_2026_28_jan_shift_1']
qs = paper.get('questions', [])
print(f"Total questions in 28 Jan Shift 1: {len(qs)}")

sub_counts = {}
for q in qs:
    sub = q.get('subject', 'Unknown')
    sub_counts[sub] = sub_counts.get(sub, 0) + 1

print("Subject breakdown:", sub_counts)
