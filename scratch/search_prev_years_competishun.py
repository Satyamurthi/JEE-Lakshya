from bs4 import BeautifulSoup
import re

with open("scratch/competishun_main.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

print("All links containing years (2013-2025) or previous papers on Competishun page:")
count = 0
for a in soup.find_all('a', href=True):
    href = a['href']
    text = a.get_text(strip=True)
    
    # Check if text or href contains previous years (2013-2025)
    years = re.findall(r'\b(201\d|202[0-5])\b', text + " " + href)
    if years:
        count += 1
        print(f"#{count}: Text: '{text}' -> Link: {href}")
