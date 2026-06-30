import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

if 'pyq_jee_main_2026_28_jan_shift_1' in data:
    paper = data['pyq_jee_main_2026_28_jan_shift_1']
    for q in paper.get('questions', []):
        if q.get('questionNumber') == 14:
            q['statement'] = r"The value of $\lim_{x \to 0} \frac{\log \left( \sec(e^x) \cdot \sec(e^{2x}) \dots \sec(e^{10x}) \right)}{e^2 - e^{2\cos x}}$ is equal to:"
            q['options'] = [
                r"$\frac{e^{10} - 1}{2e^2(e^2 - 1)}$",
                r"$\frac{e^{20} - 1}{2e^2(e^2 - 1)}$",
                r"$\frac{e^{20} - 1}{2(e^2 - 1)}$",
                r"$\frac{e^{10} - 1}{2(e^2 - 1)}$"
            ]
            q['correctAnswer'] = "A"

with open('src/data/officialJeeExtractedPapers.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Successfully updated Q14 in officialJeeExtractedPapers.json!")
