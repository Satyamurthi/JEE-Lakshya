import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

paper = data['pyq_jee_main_2026_28_jan_shift_1']
qs = paper.get('questions', [])

print(f"Paper 28 Jan Shift 1 has {len(qs)} questions.")

for qnum in [20, 21, 45, 46, 70, 71]:
    q = qs[qnum - 1]
    print(f"\n--- Q{q.get('questionNumber')} [{q.get('subject')}] ---")
    print(f"Type: {q.get('type')}")
    print(f"Options count: {len(q.get('options') or [])}")
    print(f"Correct Answer: {q.get('correctAnswer')}")
    print(f"Statement snippet: {q.get('statement')[:80]}")

