import os
import re
import urllib.request
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

# Target directory
pyq_dir = r"d:\JEE\JEE PYQ"
os.makedirs(pyq_dir, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def clean_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "", name)

def get_confirm_token(html):
    match = re.search(r'confirm=([a-zA-Z0-9_]+)', html)
    if match:
        return match.group(1)
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
            html = response.read().decode('utf-8', errors='ignore')
            token = get_confirm_token(html)
            if token:
                confirm_url = f"{URL}&id={file_id}&confirm={token}"
                req_confirm = urllib.request.Request(confirm_url, headers=headers)
                with urllib.request.urlopen(req_confirm) as resp_conf, open(destination, 'wb') as f:
                    f.write(resp_conf.read())
            else:
                raise Exception("Google Drive returned HTML but no confirmation token found.")
        else:
            with open(destination, 'wb') as f:
                f.write(response.read())

def download_paper(paper_name, drive_url):
    # Extract Google Drive ID
    drive_id_match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', drive_url)
    if not drive_id_match:
        drive_id_match = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', drive_url)
        
    if not drive_id_match:
        return f"Failed: {paper_name} - Could not find Google Drive ID in URL: {drive_url}"
        
    file_id = drive_id_match.group(1)
    
    # Target file paths (check both Competishun and MathonGo names to prevent double download)
    filename_competishun = clean_filename(paper_name)
    filepath_competishun = os.path.join(pyq_dir, filename_competishun)
    
    filename_mathongo = filename_competishun.replace("- Competishun.pdf", "- MathonGo.pdf")
    filepath_mathongo = os.path.join(pyq_dir, filename_mathongo)
    
    # Check if either version exists and is valid
    if os.path.exists(filepath_competishun) and os.path.getsize(filepath_competishun) > 1024 * 1024:
        return f"Skipped: {filename_competishun} (Competishun version exists)"
    if os.path.exists(filepath_mathongo) and os.path.getsize(filepath_mathongo) > 1024 * 1024:
        return f"Skipped: {filename_competishun} (MathonGo version exists)"
        
    try:
        download_file_from_google_drive(file_id, filepath_competishun)
        
        # Verify file signature
        if os.path.exists(filepath_competishun):
            with open(filepath_competishun, 'rb') as f:
                sig = f.read(4)
            if sig != b'%PDF':
                os.remove(filepath_competishun)
                raise Exception("Downloaded file is not a valid PDF")
                
        return f"Downloaded: {filename_competishun}"
    except Exception as e:
        return f"Failed: {paper_name} - Error: {e}"

def parse_competishun_page():
    html_path = r"d:\JEE\scratch\competishun_main.html"
    if not os.path.exists(html_path):
        raise FileNotFoundError("competishun_main.html not found.")
        
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
        
    soup = BeautifulSoup(html, 'html.parser')
    papers = []
    
    month_map = {"January": "Jan", "April": "Apr"}
    
    for a in soup.find_all('a', href=True):
        href = a['href']
        if 'drive.google.com' in href or 'docs.google.com' in href:
            tr = a.find_parent('tr')
            if tr:
                text = tr.get_text(separator=' | ', strip=True)
                # Parse: e.g. "21 January 2026 | Shift 1 Morning | Download PDF"
                m = re.match(r'(\d+)\s+([a-zA-Z]+)\s+(\d{4})\s*\|\s*(Shift\s+\d+)', text, re.IGNORECASE)
                if m:
                    day_str, month_str, year_str, shift_str = m.groups()
                    day = int(day_str)
                    month = month_map.get(month_str.capitalize(), month_str[:3].capitalize())
                    year = int(year_str)
                    
                    paper_name = f"JEE Main {year} ({day:02d} {month} {shift_str}) Previous Year Paper with Answer Keys - Competishun.pdf"
                    papers.append({
                        'name': paper_name,
                        'url': href
                    })
                else:
                    # Generic parser fallback
                    papers.append({
                        'name': f"JEE Main 2026 ({text[:50]}) Previous Year Paper with Answer Keys - Competishun.pdf",
                        'url': href
                    })
            else:
                papers.append({
                    'name': f"JEE Main 2026 (Drive Link {href[-10:]}) Previous Year Paper with Answer Keys - Competishun.pdf",
                    'url': href
                })
                
    # Deduplicate by name
    unique_papers = {}
    for p in papers:
        unique_papers[p['name']] = p['url']
        
    return unique_papers

def main():
    print("Parsing Competishun papers...")
    try:
        papers = parse_competishun_page()
        print(f"Found {len(papers)} unique target papers on Competishun page.")
    except Exception as e:
        print(f"Error parsing page: {e}")
        return
        
    results = []
    print("Starting downloads...")
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(download_paper, name, url): name for name, url in papers.items()}
        for i, future in enumerate(as_completed(futures), 1):
            res = future.result()
            results.append(res)
            print(f"[{i}/{len(papers)}] {res}")
            
    downloaded = [r for r in results if r.startswith("Downloaded:")]
    skipped = [r for r in results if r.startswith("Skipped:")]
    failed = [r for r in results if r.startswith("Failed:")]
    
    print("\n" + "="*50)
    print("COMPETISHUN DOWNLOAD SUMMARY")
    print("="*50)
    print(f"Total papers checked: {len(results)}")
    print(f"Successfully downloaded: {len(downloaded)}")
    print(f"Skipped (already exists): {len(skipped)}")
    print(f"Failed: {len(failed)}")
    if failed:
        print("\nFailed downloads:")
        for f in failed:
            print(f"  {f}")
    print("="*50)

if __name__ == "__main__":
    main()
