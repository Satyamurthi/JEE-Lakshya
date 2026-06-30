import re
from bs4 import BeautifulSoup

with open('C:/Users/satyu/.gemini/antigravity-ide/brain/64421579-f483-4f8b-a88f-b83946a1b64c/.system_generated/steps/402/content.md', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
links = soup.find_all('a', href=True)

paper_links = []
for a in links:
    href = a['href']
    text = a.get_text(strip=True)
    if 'jee' in href.lower() or 'shift' in text.lower() or 'paper' in text.lower():
        paper_links.append((text, href))

print(f"Total relevant links found on Cracku page: {len(paper_links)}")
for t, h in paper_links[:25]:
    print(f"{t[:50]} -> {h}")
