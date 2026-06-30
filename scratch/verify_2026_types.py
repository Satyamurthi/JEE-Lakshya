import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

paper = data['pyq_jee_main_2026_28_jan_shift_1']
qs = paper.get('questions', [])

print(f"Paper 28 Jan Shift 1 has {len(qs)} questions.")

num_qs = [q for q in qs if q.get('type') == 'Numerical']
mcq_qs = [q for q in qs if q.get('type') == 'MCQ']

print(f"MCQs: {len(mcq_qs)}, Numericals: {len(num_qs)}")

print("\nSample Numerical Questions:")
for q in num_qs[:5]:
    print(f"Q{q.get('questionNumber')} [{q.get('subject')}]: {q.get('statement')[:70]}... (Answer: {q.get('correctAnswer')})")
