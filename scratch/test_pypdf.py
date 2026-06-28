import pypdf
import os
import glob

files = glob.glob('d:/JEE/scratch/pdfs/*.pdf')
for fpath in sorted(files)[:10]:
    fid = os.path.basename(fpath).replace('.pdf', '')
    try:
        reader = pypdf.PdfReader(fpath)
        print(f"ID {fid} | Pages: {len(reader.pages)} | Encrypted: {reader.is_encrypted}")
        if reader.is_encrypted:
            try:
                reader.decrypt('')
            except:
                pass
        text = ""
        for page in reader.pages[:2]:
            text += (page.extract_text() or "") + " "
        clean = " ".join(text.split())
        print(f"   Snippet: {clean[:150]}")
    except Exception as e:
        print(f"ID {fid} | Error: {e}")
