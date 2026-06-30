import urllib.request
import re
from bs4 import BeautifulSoup

url = "https://questions.examside.com/past-years/jee/question/pa-new-unit--alpha--of-length-is-chosen-such-that-it-jee-main-physics-units-and-measurements-bmoapcrwhuqsejpo"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    soup = BeautifulSoup(html, 'html.parser')
    
    with open('scratch/q_page.html', 'w', encoding='utf-8') as f:
        f.write(soup.prettify())
        
    print("Prettified HTML saved to scratch/q_page.html")
    
    # Let's find main blocks
    paragraphs = soup.find_all('p')
    print(f"Found {len(paragraphs)} paragraphs.")
    for p in paragraphs[:10]:
        print("P:", p.get_text(strip=True)[:100])
        
except Exception as e:
    print("Error:", e)
