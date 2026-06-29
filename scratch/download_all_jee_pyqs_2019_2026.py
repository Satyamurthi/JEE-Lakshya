import os
import urllib.request
import re

pyq_dir = r"d:\JEE\JEE PYQ"
os.makedirs(pyq_dir, exist_ok=True)

existing_files = os.listdir(pyq_dir)
print(f"Currently {len(existing_files)} files in JEE PYQ folder.")

# Let's list all session pages from MathonGo to crawl
session_slugs = [
    "jan-2019", "april-2019",
    "jan-2020", "sep-2020",
    "feb-2021", "mar-2021", "july-2021", "aug-2021",
    "june-2022", "july-2022",
    "january-2023", "april-2023",
    "january-2024", "april-2024",
    "january-2025", "april-2025",
    "january-2026"
]

downloaded_count = 0
skipped_count = 0

for slug in session_slugs:
    for subj in ['physics', 'chemistry', 'maths']:
        url = f"https://www.mathongo.com/iit-jee/jee-main-{subj}-chapter-wise-questions-with-solutions-{slug}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            html = urllib.request.urlopen(req).read().decode('utf-8')
            
            # Look for downloadable PDF links or monitor links
            pdf_urls = re.findall(r'href=["\']([^"\']+\.pdf[^"\']*)["\']', html, re.IGNORECASE)
            dl_urls = re.findall(r'href=["\']([^"\']+/download/[^"\']*)["\']', html, re.IGNORECASE)
            
            all_target_urls = list(set(pdf_urls + dl_urls))
            for t_url in all_target_urls:
                filename = f"JEE_Main_{slug}_{subj}_{os.path.basename(t_url).split('?')[0]}"
                if not filename.endswith('.pdf'):
                    filename += '.pdf'
                filepath = os.path.join(pyq_dir, filename)
                
                if filename in existing_files or os.path.exists(filepath):
                    skipped_count += 1
                    continue
                
                print(f"Downloading: {filename} from {t_url}...")
                try:
                    dl_req = urllib.request.Request(t_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(dl_req) as resp, open(filepath, 'wb') as out_file:
                        out_file.write(resp.read())
                    downloaded_count += 1
                except Exception as dl_err:
                    print(f"Failed download for {t_url}: {dl_err}")
        except Exception as e:
            pass

print(f"Finished check. Downloaded: {downloaded_count}, Skipped: {skipped_count}.")
