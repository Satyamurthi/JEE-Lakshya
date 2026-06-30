from bs4 import BeautifulSoup

with open('scratch/q_page.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

print("--- Title ---")
print(soup.title.string if soup.title else "")

print("\n--- Meta Description ---")
meta = soup.find('meta', attrs={'name': 'description'})
print(meta['content'] if meta else "")

print("\n--- Divs with options or answer ---")
for div in soup.find_all('div'):
    classes = div.get('class', [])
    class_str = ' '.join(classes)
    if 'green' in class_str or 'blue' in class_str or 'correct' in class_str or 'solution' in class_str or 'answer' in class_str:
        text = div.get_text(strip=True)
        if len(text) < 200:
            print(f"[{class_str}]: {text}")

