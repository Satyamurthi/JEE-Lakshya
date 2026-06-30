import urllib.request
import re
from bs4 import BeautifulSoup

url = "https://questions.examside.com/past-years/jee/jee-main/physics/units-and-measurements/mcq"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    soup = BeautifulSoup(html, 'html.parser')
    
    print("Page Title:", soup.title.string if soup.title else "No title")
    
    # Find all question links
    q_links = soup.find_all('a', href=re.compile(r'/past-years/jee/question/'))
    print(f"Found {len(q_links)} question links on page.")
    
    for idx, a in enumerate(q_links[:5]):
        print(f"\n--- Question {idx+1} ---")
        print("URL:", a.get('href'))
        text_div = a.find('div', class_=re.compile(r'opacity-80'))
        if text_div:
            print("Snippet:", text_div.get_text(strip=True)[:150])
        shift_div = a.find('div', class_=re.compile(r'bg-green-500'))
        if shift_div:
            print("Shift:", shift_div.get_text(strip=True))

except Exception as e:
    print("Error:", e)
