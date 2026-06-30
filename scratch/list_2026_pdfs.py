import os

files = os.listdir('JEE PYQ')
pdfs_2026 = [f for f in files if '2026' in f and f.endswith('.pdf')]
print(f"Found {len(pdfs_2026)} 2026 PDF files in JEE PYQ/:")
for f in pdfs_2026:
    print(" -", f)
