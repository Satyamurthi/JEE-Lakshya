import os
import re
import json
import pypdf

PYQ_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "JEE PYQ")
OUTPUT_JSON = os.path.join(os.path.dirname(os.path.dirname(__file__)), "src", "data", "officialJeeExtractedPapers.json")

def parse_filename(filename):
    # Match pattern: JEE Main 2024 (27 Jan Shift 1) Previous Year Paper...
    m = re.search(r"JEE Main (\d{4})\s*\(([^)]+)\)", filename, re.IGNORECASE)
    if m:
        year = int(m.group(1))
        raw_inside = m.group(2)
        # Clean up inside brackets
        clean_inside = re.sub(r"\s+Online", "", raw_inside, flags=re.IGNORECASE).strip()
        title = f"JEE Main {year} ({clean_inside})"
        return {
            "year": year,
            "title": title,
            "date_shift": clean_inside
        }
    return None

def extract_answers(reader):
    answers = {}
    full_text = ""
    # Look at last 2 pages for answer key
    for page in reader.pages[-2:]:
        txt = page.extract_text()
        if txt:
            full_text += "\n" + txt
            
    if "ANSWER KEY" in full_text.upper():
        ak_part = full_text[full_text.upper().find("ANSWER KEY"):]
        # Find all patterns like 1. (1) or 21. (673)
        matches = re.findall(r"(\d+)\.\s*\(([^)]+)\)", ak_part)
        for q_num, ans in matches:
            answers[int(q_num)] = ans.strip()
            
    return answers

def test():
    files = [f for f in os.listdir(PYQ_DIR) if f.endswith(".pdf")]
    print(f"Found {len(files)} total PDF files in {PYQ_DIR}")
    
    parsed_count = 0
    for f in files[:5]:
        meta = parse_filename(f)
        if meta:
            filepath = os.path.join(PYQ_DIR, f)
            try:
                reader = pypdf.PdfReader(filepath)
                answers = extract_answers(reader)
                print(f"File: {f}")
                print(f"  -> Parsed Title: '{meta['title']}' | Year: {meta['year']}")
                print(f"  -> Total Pages: {len(reader.pages)} | Answer Keys Found: {len(answers)}")
                if len(answers) > 0:
                    print(f"  -> Sample Answers Q1..Q5: {[answers.get(i) for i in range(1, 6)]}")
                parsed_count += 1
            except Exception as e:
                print(f"  -> Error reading PDF: {e}")
                
if __name__ == "__main__":
    test()
