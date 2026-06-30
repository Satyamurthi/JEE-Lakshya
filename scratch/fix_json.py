import json
import re

PUA_MAP = {
    '\uf02d': '-',
    '\uf02b': '+',
    '\uf03d': '=',
    '\uf03c': '<',
    '\uf03e': '>',
    '\uf0b3': '≥',
    '\uf0a3': '≤',
    '\uf0b9': '≠',
    '\uf0ce': '∈',
    '\uf0cd': '∉',
    '\uf0c8': '∪',
    '\uf0c7': '∩',
    '\uf0ae': '→',
    '\uf0be': '→',
    '\uf0de': '→',
    '\uf0b4': '×',
    '\uf0d7': '⋅',
    '\uf0b7': '⋅',
    '\uf0b0': '°',
    '\uf0b1': '±',
    '\uf020': ' ',
    '\uf028': '(',
    '\uf029': ')',
    '\uf05b': '[',
    '\uf05d': ']',
    '\uf07b': '{',
    '\uf07d': '}',
    '\uf0f2': '∫',
    '\uf0e5': '∑',
    '\uf061': 'α',
    '\uf062': 'β',
    '\uf067': 'γ',
    '\uf064': 'δ',
    '\uf065': 'ε',
    '\uf066': 'φ',
    '\uf068': 'η',
    '\uf06c': 'λ',
    '\uf06d': 'μ',
    '\uf06e': 'ν',
    '\uf070': 'π',
    '\uf071': 'θ',
    '\uf072': 'ρ',
    '\uf073': 'σ',
    '\uf077': 'ω',
    '\uf049': 'I',
    '\uf04c': 'Λ',
    '\uf0a5': '∞',
    '\uf0bc': '⋅',
    '\uf0ba': '≡',
}

def clean_text(text):
    if not isinstance(text, str):
        return text
    res = []
    for c in text:
        if c in PUA_MAP:
            res.append(PUA_MAP[c])
        elif '\uf000' <= c <= '\uf0ff':
            pass
        else:
            res.append(c)
    out = "".join(res)
    out = re.sub(r'\[\s*\]\s*≡', '[·]', out)
    out = re.sub(r'\[\s*\]\s*⋅', '[·]', out)
    return out

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for paper in data.values():
    for q in paper.get('questions', []):
        if 'statement' in q and q['statement']:
            q['statement'] = clean_text(q['statement'])
        if 'options' in q and q['options']:
            q['options'] = [clean_text(opt) if isinstance(opt, str) else opt for opt in q['options']]
        if 'solution' in q and q['solution']:
            q['solution'] = clean_text(q['solution'])

# Specifically fix pyq_jee_main_2026_28_jan_shift_2 Q1 to proper LaTeX
if 'pyq_jee_main_2026_28_jan_shift_2' in data:
    paper = data['pyq_jee_main_2026_28_jan_shift_2']
    if len(paper['questions']) > 0:
        q1 = paper['questions'][0]
        q1['statement'] = r"Let $[\cdot]$ denote the greatest integer function. Then $\int_{-\pi/2}^{\pi/2} \frac{12(x^3 + [x])}{\pi^3 + [\sin x] + [\cos x]} dx$ is equal to :"
        q1['options'] = [
            r"$11 - 2\pi$",
            r"$12 - 5\pi$",
            r"$13 - \pi$",
            r"$15 - 4\pi$"
        ]

with open('src/data/officialJeeExtractedPapers.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("JSON successfully updated and cleaned!")
