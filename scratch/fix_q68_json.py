import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

if 'pyq_jee_main_2026_28_jan_shift_1' in data:
    paper = data['pyq_jee_main_2026_28_jan_shift_1']
    for q in paper.get('questions', []):
        if q.get('questionNumber') == 68:
            q['statement'] = (
                r"Given below are two statements:<br/>"
                r"<b>Statement I</b>: The number of pairs, from the following, in which both the ions are coloured in aqueous solution is 3:<br/>"
                r"$[\text{Sc}^{3+}, \text{Ti}^{3+}], [\text{Mn}^{2+}, \text{Cr}^{2+}], [\text{Cu}^{2+}, \text{Zn}^{2+}]$ and $[\text{Ni}^{2+}, \text{Ti}^{4+}]$.<br/>"
                r"<b>Statement II</b>: $\text{Eu}^{2+}$ is the strongest reducing agent among $\text{Th}^{4+}, \text{Ce}^{4+}, \text{Gd}^{3+}$ and $\text{Eu}^{2+}$.<br/>"
                r"In the light of the above statements, choose the correct answer from the options given below:"
            )
            q['options'] = [
                "Statement I is true but Statement II is false",
                "Statement I is false but Statement II is true",
                "Both Statement I and Statement II are false",
                "Both Statement I and Statement II are true"
            ]
            q['correctAnswer'] = "A"

with open('src/data/officialJeeExtractedPapers.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Successfully updated Q68 in officialJeeExtractedPapers.json!")
