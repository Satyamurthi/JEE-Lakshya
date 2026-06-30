import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

type_counts = {}
numerical_with_options = 0
mcq_counts = 0
numerical_counts = 0

for paper_key, paper in data.items():
    for q in paper.get('questions', []):
        q_type = q.get('type', 'MCQ')
        type_counts[q_type] = type_counts.get(q_type, 0) + 1
        if q_type == 'Numerical':
            numerical_counts += 1
        else:
            mcq_counts += 1
        # Check if question statement contains numerical keywords or integer response patterns
        stmt = q.get('statement', '')
        if 'is equal to ____' in stmt or 'is ____' in stmt or 'integer' in stmt.lower() or 'numerical' in stmt.lower():
            if q_type != 'Numerical':
                numerical_with_options += 1

print(f"Total questions in JSON: {mcq_counts + numerical_counts}")
print("Question Type breakdown in JSON:", type_counts)
print(f"Questions identified as numerical by text but marked as MCQ: {numerical_with_options}")

# Check sample paper e.g. 2026 or 2024
print("\nSample question types for 2026 paper:")
sample_p = data.get('pyq_jee_main_2026_28_jan_shift_1', {})
for q in sample_p.get('questions', [])[:10]:
    print(f"Q{q.get('questionNumber')}: type={q.get('type')}, statement={q.get('statement')[:60]}")

