import fitz
import os
import glob

files = glob.glob('d:/JEE/scratch/pdfs/*.pdf')
print(f"FOUND {len(files)} PDFs")
for fpath in sorted(files)[:15]:
    fid = os.path.basename(fpath).replace('.pdf', '')
    try:
        doc = fitz.open(fpath)
        text = ""
        for p in doc[:2]:
            text += p.get_text() + "\n"
        clean = " ".join(text.split())
        print(f"ID {fid} | Pages: {len(doc)} | Content: {clean[:200]}")
    except Exception as e:
        print(f"ID {fid} | Error: {e}")
