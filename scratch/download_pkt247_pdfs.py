import urllib.request
import os
import fitz

os.makedirs('d:/JEE/scratch/pkt_pdfs', exist_ok=True)

files = ['2024.pdf', '2023.pdf', '2022.pdf', '2021.pdf', '2020.pdf']

for fname in files:
    url = f"https://raw.githubusercontent.com/pkt247/neet/main/neet-pyqs/pdf/{fname}"
    fpath = f"d:/JEE/scratch/pkt_pdfs/{fname}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as res, open(fpath, 'wb') as f:
            f.write(res.read())
        
        doc = fitz.open(fpath)
        text = ""
        for p in doc[:3]:
            text += p.get_text() + "\n"
        clean = " ".join(text.split())
        print(f"[{fname}] Pages: {len(doc)} | Content: {clean[:250]}")
    except Exception as e:
        print(f"[{fname}] Error: {e}")
