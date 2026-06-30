import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

paper = data.get('pyq_jee_main_2026_28_jan_shift_1', {})
questions = paper.get('questions', [])
for q in questions:
    if q.get('questionNumber') == 68:
        print(f"Q68 [{q['subject']}]: {q['statement']}")
        print(f"Options: {q['options']}\n")
