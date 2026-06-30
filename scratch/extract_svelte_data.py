from bs4 import BeautifulSoup
import json
import re

with open('scratch/q_page.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

scripts = soup.find_all('script')
print(f"Found {len(scripts)} script tags.")

for idx, s in enumerate(scripts):
    content = s.string or s.text
    if content and ('options' in content or 'answer' in content or 'solution' in content or 'sveltekit' in content.lower()):
        print(f"\n--- Script {idx} ({len(content)} chars) ---")
        print(content[:300])
        with open(f'scratch/script_{idx}.txt', 'w', encoding='utf-8') as sf:
            sf.write(content)

