from bs4 import BeautifulSoup

with open("scratch/mathongo_pyq_main.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
all_links = soup.find_all('a', href=True)

print("www.mathongo.com links in main page:")
mathongo_links = []
for a in all_links:
    href = a['href']
    text = a.get_text(strip=True)
    if 'www.mathongo.com' in href and 'links.mathongo.com' not in href:
        mathongo_links.append((href, text))

for href, text in sorted(list(set(mathongo_links))):
    print(f"  {href} -> '{text}'")
