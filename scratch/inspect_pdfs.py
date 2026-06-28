import fitz
import os
import glob

files = glob.glob('d:/JEE/scratch/pdfs/*.pdf')
for fpath in sorted(files):
    fid = os.path.basename(fpath).replace('.pdf', '')
    try:
        doc = fitz.open(fpath)
        text = ""
        for p in doc[:3]:
            text += p.get_text() + " "
        clean = " ".join(text.split())
        print(f"ID {fid} | Pages: {len(doc)} | Content: {clean[:200]}")
    except Exception as e:
        print(f"ID {fid} | Error: {e}")
