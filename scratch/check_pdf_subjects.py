import fitz
import glob
import os

pdf_files = glob.glob('JEE PYQ/*.pdf')
print(f"Total PDFs found: {len(pdf_files)}")

for f in pdf_files[:15]:
    if '2026' in f or '2025' in f:
        doc = fitz.open(f)
        subjects_found = []
        for idx, page in enumerate(doc):
            text = page.get_text()
            for sub in ['PHYSICS', 'CHEMISTRY', 'MATHEMATICS']:
                if sub in text and sub not in [s[0] for s in subjects_found]:
                    subjects_found.append((sub, idx+1))
        print(f"{os.path.basename(f)[:55]}: {subjects_found}")
