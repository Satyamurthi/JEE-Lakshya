import os
import re
import time
import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

# Target directory
pyq_dir = r"d:\JEE\JEE PYQ"
os.makedirs(pyq_dir, exist_ok=True)

# Headers for HTTP requests
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def clean_filename(name):
    # Replace characters that are invalid in Windows filenames
    return re.sub(r'[\\/*?:"<>|]', "", name)

def get_confirm_token(html):
    # Search for confirm query param in HTML
    match = re.search(r'confirm=([a-zA-Z0-9_]+)', html)
    if match:
        return match.group(1)
    # Also check for other patterns Google Drive uses
    match = re.search(r'id="confirm_text".*?href=".*?confirm=([a-zA-Z0-9_]+)', html, re.DOTALL)
    if match:
        return match.group(1)
    return None

def download_file_from_google_drive(file_id, destination):
    URL = "https://drive.google.com/uc?export=download"
    req = urllib.request.Request(f"{URL}&id={file_id}", headers=headers)
    
    with urllib.request.urlopen(req) as response:
        content_type = response.headers.get('Content-Type', '')
        if 'text/html' in content_type:
            # It's an HTML page, possibly virus scan warning or login
            html = response.read().decode('utf-8', errors='ignore')
            token = get_confirm_token(html)
            if token:
                confirm_url = f"{URL}&id={file_id}&confirm={token}"
                req_confirm = urllib.request.Request(confirm_url, headers=headers)
                with urllib.request.urlopen(req_confirm) as resp_conf, open(destination, 'wb') as f:
                    f.write(resp_conf.read())
            else:
                # Drive might have returned an error or generic page
                raise Exception("Google Drive returned HTML but no confirmation token found.")
        else:
            with open(destination, 'wb') as f:
                f.write(response.read())

def resolve_and_download(paper_name, short_url):
    filename = clean_filename(paper_name)
    filepath = os.path.join(pyq_dir, filename)
    
    # Check if already exists and is valid
    if os.path.exists(filepath) and os.path.getsize(filepath) > 1024 * 1024:
        return f"Skipped: {filename} (Already exists)"
        
    retries = 3
    for attempt in range(retries):
        try:
            # 1. Resolve short link
            req = urllib.request.Request(short_url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                final_url = resp.geturl()
            
            # 2. Extract Google Drive ID
            drive_id_match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', final_url)
            if not drive_id_match:
                drive_id_match = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', final_url)
                
            if not drive_id_match:
                return f"Failed: {paper_name} - Could not find Google Drive ID in final URL: {final_url}"
                
            file_id = drive_id_match.group(1)
            
            # 3. Download file
            download_file_from_google_drive(file_id, filepath)
            
            # Verify file signature
            if os.path.exists(filepath):
                with open(filepath, 'rb') as f:
                    sig = f.read(4)
                if sig != b'%PDF':
                    os.remove(filepath)
                    raise Exception("Downloaded file is not a valid PDF")
                    
            return f"Downloaded: {filename}"
            
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # Backoff
                continue
            else:
                return f"Failed: {paper_name} - Error: {e}"

def parse_main_pyq_page():
    # Parse 2013-2025 papers from saved mathongo_pyq_main.html
    html_path = r"d:\JEE\scratch\mathongo_pyq_main.html"
    if not os.path.exists(html_path):
        raise FileNotFoundError("mathongo_pyq_main.html not found.")
        
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
        
    soup = BeautifulSoup(html, 'html.parser')
    papers = []
    
    # We find all links that go to links.mathongo.com or cutt.ly
    for a in soup.find_all('a', href=True):
        href = a['href']
        if 'links.mathongo.com' in href or 'cutt.ly' in href:
            tr = a.find_parent('tr')
            name = ""
            if tr:
                cells = [c.get_text(strip=True) for c in tr.find_all(['td', 'th'])]
                if len(cells) > 1:
                    name = cells[1]
            if not name:
                li = a.find_parent('li')
                if li:
                    name = li.get_text(separator=' ', strip=True)
            if not name:
                parent = a.find_parent()
                name = parent.get_text(separator=' ', strip=True) if parent else a.get_text(strip=True)
                
            # Filter name
            name = name.replace("Download PDF", "").strip()
            # Construct standard filename X with Answer Keys - MathonGo.pdf
            if name.endswith("Previous Year Paper"):
                filename = name + " with Answer Keys - MathonGo.pdf"
            else:
                filename = name + " with Answer Keys - MathonGo.pdf"
                
            papers.append({
                'name': filename,
                'url': href
            })
            
    return papers

def parse_2026_page():
    # Parse 2026 papers from saved mathongo_main.html
    html_path = r"d:\JEE\scratch\mathongo_main.html"
    if not os.path.exists(html_path):
        raise FileNotFoundError("mathongo_main.html not found.")
        
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
        
    # We extract papers from script
    # e.g., { name: "2 April Shift 1 - with Answer Keys", url: "https://cutt.ly/dtFwtEZ9" }
    pattern = r'\{\s*name:\s*["\']([^"\']+)["\'],\s*url:\s*["\']([^"\']+)["\']\s*\}'
    matches = re.findall(pattern, html)
    
    papers = []
    month_map = {"April": "Apr", "January": "Jan"}
    
    for name, url in matches:
        # Normalize the name: e.g. "2 April Shift 1 - with Answer Keys" -> "JEE Main 2026 (02 Apr Shift 1) Previous Year Paper with Answer Keys - MathonGo.pdf"
        # Match "day Month Shift X"
        m = re.match(r'(\d+)\s+([a-zA-Z]+)\s+(Shift\s+\d+)', name, re.IGNORECASE)
        if m:
            day_str, month_str, shift_str = m.groups()
            day = int(day_str)
            month = month_map.get(month_str.capitalize(), month_str[:3].capitalize())
            normalized_name = f"JEE Main 2026 ({day:02d} {month} {shift_str}) Previous Year Paper with Answer Keys - MathonGo.pdf"
        else:
            normalized_name = f"JEE Main 2026 ({name}) Previous Year Paper with Answer Keys - MathonGo.pdf"
            
        papers.append({
            'name': normalized_name,
            'url': url
        })
        
    return papers

def main():
    print("Parsing papers list...")
    papers = []
    
    try:
        main_papers = parse_main_pyq_page()
        print(f"Found {len(main_papers)} papers from 2013-2025.")
        papers.extend(main_papers)
    except Exception as e:
        print(f"Error parsing 2013-2025 main page: {e}")
        
    try:
        p2026 = parse_2026_page()
        print(f"Found {len(p2026)} papers from 2026.")
        papers.extend(p2026)
    except Exception as e:
        print(f"Error parsing 2026 page: {e}")
        
    # Filter only papers from years 2013 to 2026
    filtered_papers = []
    for p in papers:
        m = re.search(r'\b(20\d{2})\b', p['name'])
        if m:
            year = int(m.group(1))
            if 2013 <= year <= 2026:
                filtered_papers.append(p)
                
    # Deduplicate by destination name
    unique_papers = {}
    for p in filtered_papers:
        unique_papers[p['name']] = p['url']
        
    print(f"Total target papers to download/check from 2013 to 2026: {len(unique_papers)}")
    
    # We download in parallel
    results = []
    print("Starting downloads (this may take several minutes)...")
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(resolve_and_download, name, url): name for name, url in unique_papers.items()}
        for i, future in enumerate(as_completed(futures), 1):
            res = future.result()
            results.append(res)
            print(f"[{i}/{len(unique_papers)}] {res}")
            
    # Print summary report
    downloaded = [r for r in results if r.startswith("Downloaded:")]
    skipped = [r for r in results if r.startswith("Skipped:")]
    failed = [r for r in results if r.startswith("Failed:")]
    
    print("\n" + "="*50)
    print("DOWNLOAD SUMMARY")
    print("="*50)
    print(f"Total papers checked: {len(results)}")
    print(f"Successfully downloaded: {len(downloaded)}")
    print(f"Skipped (already exists): {len(skipped)}")
    print(f"Failed: {len(failed)}")
    if failed:
        print("\nFailed downloads detail:")
        for f in failed:
            print(f"  {f}")
    print("="*50)

if __name__ == "__main__":
    main()
