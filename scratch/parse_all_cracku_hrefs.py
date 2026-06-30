from bs4 import BeautifulSoup

with open('C:/Users/satyu/.gemini/antigravity-ide/brain/64421579-f483-4f8b-a88f-b83946a1b64c/.system_generated/steps/402/content.md', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
links = soup.find_all('a', href=True)

print(f"Total hrefs: {len(links)}")
for a in links:
    href = a['href']
    text = a.get_text(strip=True)
    if href.startswith('/'):
        print(f"{text[:40]} -> {href}")
