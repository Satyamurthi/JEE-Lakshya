import urllib.request
import os
import fitz # PyMuPDF
import json

os.makedirs('d:/JEE/scratch/pdfs', exist_ok=True)

pdf_info = []

# Let's check IDs from 1000 to 1035 first to find yearwise papers
for file_id in range(1000, 1030):
    url = f'https://raw.githubusercontent.com/azeezv/abdxzi.github.io/main/nt/{file_id}'
    pdf_path = f'd:/JEE/scratch/pdfs/{file_id}.pdf'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as res, open(pdf_path, 'wb') as f:
            f.write(res.read())
        
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc[:2]:
            text += page.get_text()
        
        first_line = text.split('\n')[0] if text else ""
        summary = text[:300].replace('\n', ' ')
        print(f"[{file_id}] Pages: {len(doc)} | Text snippet: {summary[:150]}")
        pdf_info.append({"id": file_id, "pages": len(doc), "snippet": summary})
    except Exception as e:
        print(f"[{file_id}] Error: {e}")

with open('d:/JEE/scratch/pdf_info.json', 'w') as f:
    json.dump(pdf_info, f, indent=2)
