from bs4 import BeautifulSoup

with open("scratch/competishun_main.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

print("All Google Drive links and their surrounding context in Competishun HTML:")
count = 0
for a in soup.find_all('a', href=True):
    href = a['href']
    if 'drive.google.com' in href or 'docs.google.com' in href:
        count += 1
        text = a.get_text(strip=True)
        
        # Sibling text or parent text
        parent = a.find_parent()
        parent_text = parent.get_text(separator=' | ', strip=True) if parent else ""
        
        tr = a.find_parent('tr')
        tr_text = tr.get_text(separator=' | ', strip=True) if tr else ""
        
        print(f"\nLink #{count}: {href}")
        print(f"  Text: '{text}'")
        print(f"  Parent context: {parent_text[:150]}")
        if tr_text:
            print(f"  TR context: {tr_text[:150]}")
