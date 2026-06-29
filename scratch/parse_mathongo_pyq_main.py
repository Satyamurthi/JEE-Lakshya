from bs4 import BeautifulSoup

with open("scratch/mathongo_pyq_main.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

# Find all links that go to links.mathongo.com
short_links = []
for a in soup.find_all('a', href=True):
    href = a['href']
    if 'links.mathongo.com' in href or 'cutt.ly' in href:
        # Find some text from parent/sibling elements to know what paper this is
        parent = a.find_parent()
        parent_text = parent.get_text(separator=' | ', strip=True) if parent else ""
        
        # Let's also traverse up to see if it's in a table row
        tr = a.find_parent('tr')
        tr_text = tr.get_text(separator=' | ', strip=True) if tr else ""
        
        # Or a list item
        li = a.find_parent('li')
        li_text = li.get_text(separator=' | ', strip=True) if li else ""
        
        text = a.get_text(strip=True)
        short_links.append({
            'href': href,
            'text': text,
            'parent_text': parent_text[:120],
            'tr_text': tr_text[:200],
            'li_text': li_text[:200]
        })

print(f"Found {len(short_links)} short links.")
print("\nFirst 40 short links info:")
for idx, sl in enumerate(short_links[:40]):
    print(f"#{idx+1}: Link: {sl['href']}")
    print(f"  Text: {sl['text']}")
    print(f"  Parent text: {sl['parent_text']}")
    if sl['tr_text']:
        print(f"  TR text: {sl['tr_text']}")
    if sl['li_text']:
        print(f"  LI text: {sl['li_text']}")
