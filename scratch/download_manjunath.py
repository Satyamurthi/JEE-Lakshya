import urllib.request
import fitz

url = "https://raw.githubusercontent.com/manjunath5496/30-Years-NEET-AIPMT-Chapterwise-Paper-and-Solution-Biology/master/451_m72.pdf"
fpath = "d:/JEE/scratch/manjunath_451.pdf"

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as res, open(fpath, 'wb') as f:
        f.write(res.read())
    
    doc = fitz.open(fpath)
    text = ""
    for p in doc[:3]:
        text += p.get_text() + "\n"
    clean = " ".join(text.split())
    print(f"[Manjunath PDF] Pages: {len(doc)} | Snippet: {clean[:300]}")
except Exception as e:
    print("Error downloading Manjunath PDF:", e)
