from bs4 import BeautifulSoup
from urllib.parse import urlparse

with open("scratch/competishun_main.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
links = list(set([a['href'] for a in soup.find_all('a', href=True)]))

print(f"Unique links on Competishun page: {len(links)}")
hosts = {}
for l in links:
    parsed = urlparse(l)
    host = parsed.netloc if parsed.netloc else "relative"
    hosts[host] = hosts.get(host, 0) + 1

for host, count in sorted(hosts.items(), key=lambda x: x[1], reverse=True):
    print(f"  {host}: {count}")

print("\nCompetishun site links (first 50):")
competishun_links = [l for l in links if 'competishun.com' in l]
for l in sorted(competishun_links)[:50]:
    print(f"  {l}")
