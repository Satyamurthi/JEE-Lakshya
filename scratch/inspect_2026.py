import fitz
import glob
import os

files = glob.glob('JEE PYQ/*2026*.pdf')
for f in files:
    doc = fitz.open(f)
    print(f"\n=== {os.path.basename(f)} ===")
    subjects = []
    for idx, page in enumerate(doc):
        text = page.get_text()
        for sub in ['PHYSICS', 'CHEMISTRY', 'MATHEMATICS']:
            if sub in text and sub not in [s[0] for s in subjects]:
                subjects.append((sub, idx+1))
    print("Found subjects on pages:", subjects)
