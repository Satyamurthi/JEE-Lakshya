import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total papers in JSON: {len(data)}")

# Fix 2026 Competishun papers subject mapping
# For 2026 papers, Q1-30 is Mathematics, Q31-60 is Physics, Q61-90 is Chemistry
updated_count = 0
for paper_id, paper in data.items():
    if paper.get('year') == 2026 or 'competishun' in paper.get('pdfUrl', '').lower():
        updated_count += 1
        for q in paper.get('questions', []):
            q_num = q.get('questionNumber', 1)
            if q_num <= 30:
                q['subject'] = 'Mathematics'
                q['chapter'] = 'Official Mathematics PYQ'
            elif q_num <= 60:
                q['subject'] = 'Physics'
                q['chapter'] = 'Official Physics PYQ'
            else:
                q['subject'] = 'Chemistry'
                q['chapter'] = 'Official Chemistry PYQ'

# Specifically fix 2026 28 Jan Shift 1 Q1 statement & options into clean math
if 'pyq_jee_main_2026_28_jan_shift_1' in data:
    p = data['pyq_jee_main_2026_28_jan_shift_1']
    if len(p['questions']) > 0:
        q1 = p['questions'][0]
        q1['statement'] = r"If $g'(x) = 2f(x) + 3x^2$, $f(0) = -3$ and $g'(f(x)) = 24x^4 - 36x^2 + 72$, then $f(g(2))$ is equal to:"
        q1['options'] = [
            r"$\frac{25}{6}$",
            r"$-\frac{25}{6}$",
            r"$\frac{7}{2}$",
            r"$-\frac{7}{2}$"
        ]
        q1['correctAnswer'] = "C"

with open('src/data/officialJeeExtractedPapers.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Updated subject mappings for {updated_count} papers and cleaned 28 Jan Shift 1 Q1!")
