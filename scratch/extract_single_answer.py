import os
import json
import pypdf

pyq_dir = r"d:\JEE\JEE PYQ"
f = "JEE Main 2013 (09 Apr Online) Previous Year Paper with Answer Keys - MathonGo.pdf"
pdf_path = os.path.join(pyq_dir, f)

reader = pypdf.PdfReader(pdf_path)
num_pages = len(reader.pages)
print("Total pages:", num_pages)

found_keys = {}
option_map = {'1': 'A', '2': 'B', '3': 'C', '4': 'D'}

for p_idx in range(max(0, num_pages - 4), num_pages):
    text = reader.pages[p_idx].extract_text()
    if not text:
        continue
    matches_bracket = re_find = []
    # Let's find matches for: \b(\d+)\.\s*\(([1-4A-D])\)\b
    import re
    matches_bracket = re.findall(r'\b(\d+)\.\s*\(([1-4A-D])\)', text)
    matches_no_bracket = re.findall(r'\b(\d+)\.\s*([1-4A-D])\b', text)
    
    for q_num_str, ans_str in matches_bracket + matches_no_bracket:
        q_num = int(q_num_str)
        if 1 <= q_num <= 90:
            found_keys[q_num] = option_map.get(ans_str, ans_str)

print("Found keys count:", len(found_keys))
ans_list = [found_keys.get(q, "A") for q in range(1, 91)]

out_path = r"d:\JEE\src\data\officialJeeAnswers.json"
results = {f: ans_list}
with open(out_path, "w", encoding="utf-8") as f_out:
    json.dump(results, f_out, indent=2)

print("File exists now:", os.path.exists(out_path))
