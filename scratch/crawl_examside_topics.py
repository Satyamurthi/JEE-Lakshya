import urllib.request
import re
from bs4 import BeautifulSoup

base_url = "https://questions.examside.com"
subjects = ["physics", "chemistry", "mathematics"]

all_chapters = []

for sub in subjects:
    url = f"{base_url}/past-years/jee/jee-main/{sub}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        soup = BeautifulSoup(html, 'html.parser')
        links = soup.find_all('a', href=re.compile(rf'/past-years/jee/jee-main/{sub}/[^/]+$'))
        for a in links:
            href = a.get('href')
            title = a.get_text(strip=True)
            if href and title and href not in [c['href'] for c in all_chapters]:
                all_chapters.append({'subject': sub, 'title': title, 'href': href})
    except Exception as e:
        print(f"Error fetching {sub}: {e}")

print(f"Total chapter links discovered across Physics, Chemistry, Math: {len(all_chapters)}")
for c in all_chapters[:15]:
    print(f"[{c['subject'].upper()}] {c['title']} -> {c['href']}")

with open('scratch/examside_chapters.json', 'w', encoding='utf-8') as f:
    import json
    json.dump(all_chapters, f, indent=2)
