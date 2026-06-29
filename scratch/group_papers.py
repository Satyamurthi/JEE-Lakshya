from bs4 import BeautifulSoup
import re

with open("scratch/mathongo_pyq_main.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

papers = []
for a in soup.find_all('a', href=True):
    href = a['href']
    if 'links.mathongo.com' in href or 'cutt.ly' in href:
        tr = a.find_parent('tr')
        if tr:
            cells = [c.get_text(strip=True) for c in tr.find_all(['td', 'th'])]
            # Format typically: ['1', 'JEE Main 2025 (22 Jan Shift 1) Previous Year Paper', 'Download PDF']
            papers.append({
                'name': cells[1] if len(cells) > 1 else tr.get_text(separator=' ', strip=True),
                'url': href
            })
        else:
            li = a.find_parent('li')
            if li:
                papers.append({
                    'name': li.get_text(separator=' ', strip=True),
                    'url': href
                })
            else:
                parent = a.find_parent()
                papers.append({
                    'name': parent.get_text(separator=' ', strip=True) if parent else a.get_text(strip=True),
                    'url': href
                })

print(f"Total papers parsed from main page: {len(papers)}")
# Group by year
by_year = {}
for p in papers:
    # find 4 digit year
    m = re.search(r'\b(20\d{2})\b', p['name'])
    year = m.group(1) if m else "Unknown"
    by_year.setdefault(year, []).append(p)

for year in sorted(by_year.keys()):
    print(f"Year {year}: {len(by_year[year])} papers")
    # Print first 2 papers
    for p in by_year[year][:2]:
        print(f"  - '{p['name']}' -> {p['url']}")
    if len(by_year[year]) > 2:
        print("  ...")
