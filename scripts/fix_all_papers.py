"""
fix_all_papers.py
=================
Comprehensive post-processing fixer for all 177 JEE Main PYQ paper databases.
"""

import os
import re
import json
import copy

BASE_DIR = r"d:\JEE V2\DB\JEE\PYQ's"

# ─────────────────────────── Core fix functions ──────────────────────────────

def fix_unicode_dashes_in_math(text):
    return text.replace('\u2013', '-').replace('\u2014', '-').replace('\u2212', '-')

def fix_escaped_quotes(text):
    return re.sub(r'\\"(.*?)\\"', r"'\1'", text)

def fix_stereo_descriptor_dash(text):
    return re.sub(r'(\$\([+-]\)\$)([a-zA-Z0-9])', r'\1-\2', text)

def fix_odd_dollar_count(text):
    dollars = [i for i, c in enumerate(text) if c == '$' and (i == 0 or text[i-1] != '\\')]
    if len(dollars) % 2 == 0:
        return text
    t = re.sub(r'(?<!\\)\$\s*$', '', text, flags=re.MULTILINE)
    t = re.sub(r'^\s*\$\s*$', '', t, flags=re.MULTILINE)
    dollars2 = [i for i, c in enumerate(t) if c == '$' and (i == 0 or t[i-1] != '\\')]
    if len(dollars2) % 2 != 0:
        t = t.replace('$', '', 1)
    return t

def fix_nested_dollars(text):
    def denest(m):
        inner = m.group(1).replace('$', '')
        return f'${inner}$'
    t = text
    for _ in range(5):
        new_t = re.sub(r'\$([^\$\n]*?\$[^\$\n]*?)\$', denest, t)
        if new_t == t:
            break
        t = new_t
    return t

def fix_double_braces(text):
    t = text
    for _ in range(5):
        new_t = re.sub(r'\{\{([^{}]*)\}\}', r'{\1}', t)
        if new_t == t:
            break
        t = new_t
    return t

def fix_ocr_tex_concatenation(text):
    t = text
    t = re.sub(r'\\rightarrow([a-zA-Z])', r'\\rightarrow \1', t)
    t = re.sub(r'\\leftarrow([a-zA-Z])', r'\\leftarrow \1', t)
    t = re.sub(r'\\Rightarrow([a-zA-Z])', r'\\Rightarrow \1', t)
    t = re.sub(r'\\epsilon0', r'\\epsilon_0', t)
    t = re.sub(r'\\varepsilon0', r'\\varepsilon_0', t)
    t = re.sub(r'\\mu0', r'\\mu_0', t)
    for cmd in ['alpha','beta','gamma','delta','theta','lambda','sigma','omega','phi']:
        t = re.sub(rf'\\{cmd}(\d)(?!\d)', rf'\\{cmd}_\1', t)
    t = re.sub(r'\\sqrt([a-zA-Z])', r'\\sqrt{\1}', t)
    return t

def fix_unicode_in_math(text):
    unicode_latex_map = {
        'α': r'\alpha', 'β': r'\beta', 'γ': r'\gamma', 'δ': r'\delta', 'ε': r'\epsilon',
        'θ': r'\theta', 'λ': r'\lambda', 'μ': r'\mu', 'π': r'\pi', 'σ': r'\sigma',
        'ω': r'\omega', 'Ω': r'\Omega', 'Δ': r'\Delta', 'Φ': r'\Phi', 'Ψ': r'\Psi',
        '∞': r'\infty', '∫': r'\int', '∑': r'\sum', '√': r'\sqrt', '±': r'\pm',
        '≤': r'\le', '≥': r'\ge', '≠': r'\neq', '≈': r'\approx', '∝': r'\propto',
        '→': r'\rightarrow', '⇒': r'\Rightarrow', '⇔': r'\Leftrightarrow',
        '∈': r'\in', '∉': r'\notin', '⊂': r'\subset', '∩': r'\cap', '∪': r'\cup',
        '°': r'^{\circ}', '×': r'\times',
    }
    t = text
    for uni, ltx in unicode_latex_map.items():
        t = t.replace(uni, ltx)
    return t

def fix_pua_characters(text):
    PUA_MAP = {
        '\uf02d': '-', '\uf02b': '+', '\uf03d': '=', '\uf03c': '<', '\uf03e': '>',
        '\uf0b3': '>=', '\uf0a3': '<=', '\uf0b9': '!=', '\uf0ce': r'\in ',
        '\uf0cd': r'\notin ', '\uf0c8': r'\cup ', '\uf0c7': r'\cap ',
        '\uf0ae': r'\rightarrow ', '\uf0be': r'\rightarrow ', '\uf0de': r'\rightarrow ',
        '\uf0b4': r'\times ', '\uf0d7': r'\cdot ', '\uf0b7': r'\cdot ',
        '\uf0b0': r'^{\circ}', '\uf0b1': r'\pm ', '\uf020': ' ',
        '\uf028': '(', '\uf029': ')', '\uf05b': '[', '\uf05d': ']',
        '\uf07b': '{', '\uf07d': '}', '\uf0f2': r'\int ', '\uf0e5': r'\sum ',
        '\uf061': r'\alpha ', '\uf062': r'\beta ', '\uf067': r'\gamma ',
        '\uf064': r'\delta ', '\uf065': r'\varepsilon ', '\uf066': r'\phi ',
        '\uf068': r'\eta ', '\uf06c': r'\lambda ', '\uf06d': r'\mu ',
        '\uf06e': r'\nu ', '\uf070': r'\pi ', '\uf071': r'\theta ',
        '\uf072': r'\rho ', '\uf073': r'\sigma ', '\uf077': r'\omega ',
        '\uf0a5': r'\infty ', '\uf0bc': r'\cdot ', '\uf0ba': r'\equiv ', '\uf0b5': r'\mu ',
    }
    for pua, val in PUA_MAP.items():
        text = text.replace(pua, val)
    return text

def fix_nbsp(text):
    return text.replace('\xa0', ' ').replace('\u00a0', ' ').replace('\r', '')

def fix_left_right_mismatches(text):
    t = text
    # Only fix clearly broken: \left( ... \right. (dot at end, not a valid closer)
    t = re.sub(r'\\left\(\s*([a-zA-Z0-9_,\s\.\-]+?)\s*\\right\.', r'(\1)', t)
    t = re.sub(r'\\left\.\s*([a-zA-Z0-9_,\s\.\-]+?)\s*\\right\)', r'(\1)', t)
    return t

def fix_combination_notation(text):
    """21C1 → $^{21}C_{1}$ (combination notation)."""
    return re.sub(r'(\d+)[C\U0001D436](\d+)', r'$^{\1}C_{\2}$', text)

def apply_all_fixes(text):
    if not text:
        return text
    t = text
    t = fix_nbsp(t)
    t = fix_pua_characters(t)
    t = fix_unicode_in_math(t)
    t = fix_ocr_tex_concatenation(t)
    t = fix_unicode_dashes_in_math(t)
    t = fix_escaped_quotes(t)
    t = fix_stereo_descriptor_dash(t)
    t = fix_double_braces(t)
    t = fix_left_right_mismatches(t)
    t = fix_combination_notation(t)
    t = fix_nested_dollars(t)
    t = fix_odd_dollar_count(t)
    return t

# ─────────────────────────── Per-file processing ─────────────────────────────

def fix_question(q):
    fixed = copy.deepcopy(q)
    changes = []

    if fixed.get('statement'):
        orig = fixed['statement']
        fixed['statement'] = apply_all_fixes(orig)
        if fixed['statement'] != orig:
            changes.append('statement')

    if fixed.get('options'):
        opts = fixed['options']
        if isinstance(opts, list):
            new_opts = []
            for i, opt in enumerate(opts):
                fo = apply_all_fixes(opt) if isinstance(opt, str) else opt
                if fo != opt:
                    changes.append(f'option[{i}]')
                new_opts.append(fo)
            fixed['options'] = new_opts
        elif isinstance(opts, dict):
            new_opts = {}
            for k, v in opts.items():
                fv = apply_all_fixes(v) if isinstance(v, str) else v
                if fv != v:
                    changes.append(f'option[{k}]')
                new_opts[k] = fv
            fixed['options'] = new_opts

    for field in ['solution', 'explanation']:
        if fixed.get(field):
            orig = fixed[field]
            fixed[field] = apply_all_fixes(orig)
            if fixed[field] != orig:
                changes.append(field)

    return fixed, changes


def process_questions_json(filepath):
    try:
        with open(filepath, encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        return False, 0, f"parse error: {e}"

    if not isinstance(data, list):
        return False, 0, "not a list"

    total_fixes = 0
    new_data = []
    for q in data:
        fixed_q, changes = fix_question(q)
        total_fixes += len(changes)
        new_data.append(fixed_q)

    if total_fixes == 0:
        return False, 0, "no changes"

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, indent=2, ensure_ascii=False)

    return True, total_fixes, "ok"


def process_all_papers():
    if not os.path.isdir(BASE_DIR):
        print(f"ERROR: Base dir not found: {BASE_DIR}")
        return

    paper_dirs = sorted([
        d for d in os.listdir(BASE_DIR)
        if os.path.isdir(os.path.join(BASE_DIR, d))
    ])

    total_papers = len(paper_dirs)
    fixed_papers = 0
    total_fixes = 0
    fix_log = []
    errors = []

    print(f"=== Comprehensive LaTeX Fix Pass ===")
    print(f"Scanning {total_papers} paper directories...\n")

    for i, paper_dir in enumerate(paper_dirs):
        qjson = os.path.join(BASE_DIR, paper_dir, 'questions.json')
        if not os.path.exists(qjson):
            continue

        changed, n_fixes, msg = process_questions_json(qjson)
        if changed:
            fixed_papers += 1
            total_fixes += n_fixes
            fix_log.append(f"  [{i+1:3d}] {paper_dir[:65]}: {n_fixes} fixes")
        elif msg not in ("no changes", "not a list"):
            errors.append(f"  ERROR [{paper_dir[:50]}]: {msg}")

        if (i + 1) % 20 == 0 or (i + 1) == total_papers:
            print(f"Progress: {i+1}/{total_papers} papers scanned, {fixed_papers} fixed so far...")

    print(f"\n=== Fix Pass Complete ===")
    print(f"Papers modified : {fixed_papers}/{total_papers}")
    print(f"Total field fixes: {total_fixes}")

    if fix_log:
        print("\nFixed papers:")
        for line in fix_log:
            print(line)

    if errors:
        print(f"\nErrors ({len(errors)}):")
        for e in errors:
            print(e)


if __name__ == "__main__":
    process_all_papers()
