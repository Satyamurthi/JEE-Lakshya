import urllib.request
import re

url = "https://www.mathongo.com/jee-main-2026-april-question-paper-with-solutions/"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
    print(f"Fetched page successfully, length: {len(html)}")
    
    # Save a local copy for examination
    with open("scratch/mathongo_main.html", "w", encoding="utf-8") as f:
        f.write(html)
        
    # Extract links
    links = re.findall(r'href=["\'](https?://[^"\']+)["\']', html)
    print(f"Total links: {len(links)}")
    
    # Filter links that might be interesting (e.g. drive, mathongo, sheets, download)
    interesting_links = [l for l in set(links) if 'drive.google.com' in l or 'mathongo.com' in l or 'docs.google.com' in l]
    print(f"Interesting links ({len(interesting_links)}):")
    for l in sorted(interesting_links):
        print(f"  {l}")

except Exception as e:
    print(f"Error fetching page: {e}")
