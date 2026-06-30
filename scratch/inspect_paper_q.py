import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

paper = data.get('pyq_jee_main_2026_28_jan_shift_1', {})
for q in paper.get('questions', [])[:5]:
    print(f"Q{q['questionNumber']} [{q['subject']}]: {q['statement']}")
    print(f"   Options: {q['options']}\n")
