import os
import re
import json
import pypdf

pyq_dir = r"d:\JEE\JEE PYQ"
files = sorted(os.listdir(pyq_dir))

pattern = r'JEE Main (\d{4}) \(([^)]+)\) Previous Year Paper with Answer Keys - ([^.]+)\.pdf'

results = {}
total_parsed = 0
total_failed = 0

option_map = {
    '1': 'A', '2': 'B', '3': 'C', '4': 'D',
    'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D',
    'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D'
}

for f in files:
    m = re.match(pattern, f)
    if not m:
        continue
    
    pdf_path = os.path.join(pyq_dir, f)
    try:
        reader = pypdf.PdfReader(pdf_path)
        num_pages = len(reader.pages)
        
        # Search the last 4 pages for answer keys
        found_keys = {}
        for p_idx in range(max(0, num_pages - 4), num_pages):
            text = reader.pages[p_idx].extract_text()
            if not text:
                continue
                
            # Regex to find: 1. (1) or 1. (A) or 1. 1
            # We want to match: "QNo. (Ans)" or "QNo. Ans"
            # e.g., 1. (1) or 2. (2)
            # Or table format: 1 1 2 2 3 4
            # Let's find matches for: \b(\d+)\.\s*\(([1-4A-D])\)\b or \b(\d+)\.\s*([1-4A-D])\b
            matches_bracket = re.findall(r'\b(\d+)\.\s*\(([1-4A-D])\)', text)
            matches_no_bracket = re.findall(r'\b(\d+)\.\s*([1-4A-D])\b', text)
            
            # Combine
            for q_num_str, ans_str in matches_bracket + matches_no_bracket:
                q_num = int(q_num_str)
                # Keep only valid question numbers (1 to 90 or 1 to 180 for NEET, but this is JEE, so 1 to 90)
                if 1 <= q_num <= 90:
                    found_keys[q_num] = option_map.get(ans_str, ans_str)
        
        # If we found at least 45 answers (half of the paper)
        if len(found_keys) >= 45:
            # Fill in missing questions with empty string or default 'A'
            ans_list = []
            for q in range(1, 91):
                ans_list.append(found_keys.get(q, "A"))
            results[f] = ans_list
            total_parsed += 1
            print(f"Parsed {len(found_keys)} keys for: {f}")
        else:
            total_failed += 1
            print(f"FAILED to find enough keys ({len(found_keys)}) for: {f}")
            
    except Exception as e:
        total_failed += 1
        print(f"ERROR reading {f}: {e}")

print(f"\nSummary: Parsed: {total_parsed}, Failed: {total_failed}")

# Save results to a json file in src/data
out_path = r"d:\JEE\src\data\officialJeeAnswers.json"
with open(out_path, "w", encoding="utf-8") as f_out:
    json.dump(results, f_out, indent=2)
print(f"Saved database to {out_path}")
