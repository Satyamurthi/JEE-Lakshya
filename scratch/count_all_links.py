from bs4 import BeautifulSoup

with open("scratch/mathongo_pyq_main.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
all_links = soup.find_all('a', href=True)
print(f"Total anchor tags with href: {len(all_links)}")

pdf_links = []
other_links = []

for a in all_links:
    href = a['href']
    text = a.get_text(strip=True)
    if 'pdf' in href.lower() or 'links.mathongo.com' in href or 'cutt.ly' in href:
        pdf_links.append((href, text))
    else:
        other_links.append((href, text))

print(f"Total PDF/short links: {len(pdf_links)}")
print(f"Total other links: {len(other_links)}")

# Let's count links by domain
domains = {}
for a in all_links:
    href = a['href']
    if href.startswith('http'):
        domain = href.split('/')[2]
        domains[domain] = domains.get(domain, 0) + 1
    else:
        domains['relative/anchor'] = domains.get('relative/anchor', 0) + 1

print("\nLink count by domain:")
for d, count in sorted(domains.items(), key=lambda x: x[1], reverse=True):
    print(f"  {d}: {count}")
