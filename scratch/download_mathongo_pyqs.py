import urllib.request
import re

url = "https://www.mathongo.com/iit-jee/jee-main-previous-year-question-paper"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
html = urllib.request.urlopen(req).read().decode('utf-8')

print("All links on main page:")
links = re.findall(r'href=["\']([^"\']+)["\']', html)
for l in sorted(list(set(links))):
    if 'jee-main' in l or 'question' in l or 'paper' in l:
        print(" - ", l)
