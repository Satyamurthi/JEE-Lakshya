import os
import re
import urllib.request

pyq_dir = r"d:\JEE\JEE PYQ"
os.makedirs(pyq_dir, exist_ok=True)

main_url = "https://www.mathongo.com/iit-jee/jee-main-previous-year-question-paper"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

req = urllib.request.Request(main_url, headers=headers)
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    print(f"Fetched main page successfully ({len(html)} bytes)")
    
    # Extract all links on the page
    links = re.findall(r'href=["\'](https?://[^"\']+)["\']', html)
    unique_links = list(set(links))
    print(f"Found {len(unique_links)} unique links on main page.")
    
    pdf_count = 0
    skipped_count = 0
    
    # Check for direct PDFs or year subpages
    for l in unique_links:
        if l.endswith('.pdf') or 'download' in l:
            filename = os.path.basename(l.split('?')[0])
            if not filename.endswith('.pdf'):
                filename += '.pdf'
            filepath = os.path.join(pyq_dir, filename)
            if os.path.exists(filepath):
                skipped_count += 1
            else:
                print(f"Downloading PDF: {filename} from {l}...")
                try:
                    r_dl = urllib.request.Request(l, headers=headers)
                    with urllib.request.urlopen(r_dl) as resp, open(filepath, 'wb') as f:
                        f.write(resp.read())
                    pdf_count += 1
                except Exception as dl_e:
                    print(f"Failed {l}: {dl_e}")

    print(f"Finished crawling main page. Downloaded: {pdf_count}, Skipped: {skipped_count}.")
except Exception as e:
    print("Error fetching main page:", e)
