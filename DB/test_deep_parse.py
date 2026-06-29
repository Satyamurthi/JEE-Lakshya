import pypdf
import re
import os
import json

pdf_path = "JEE PYQ/JEE Main 2024 (27 Jan Shift 1) Previous Year Paper with Answer Keys - MathonGo.pdf"
reader = pypdf.PdfReader(pdf_path)

full_text = ""
for page in reader.pages[:-1]:
    t = page.extract_text()
    if t:
        full_text += "\n" + t

# Clean up common MathonGo text
text = re.sub(r"JEE Main Previous Year Paper\s+MathonGo", "", full_text)
text = re.sub(r"Question Paper", "", text)

# Split into question blocks
blocks = re.split(r"\n(?=Q\d+\.|\b\d+\.\s+[A-Z])", text)
print(f"Total blocks extracted: {len(blocks)}")

parsed_questions = []
for b in blocks[:5]:
    m = re.match(r"^(?:Q)?(\d+)\.\s*(.*)", b.strip(), re.DOTALL)
    if not m:
        continue
    q_num = int(m.group(1))
    content = m.group(2).strip()
    
    # Extract statement and options (1), (2), (3), (4)
    # Match options (1), (2), (3), (4)
    parts = re.split(r"\((1|2|3|4)\)", content)
    if len(parts) >= 9:
        stmt = parts[0].strip()
        opts = {}
        for i in range(1, len(parts), 2):
            opt_no = parts[i]
            opt_val = parts[i+1].strip() if i+1 < len(parts) else ""
            # clean opt_val
            opt_val = re.sub(r"\s+", " ", opt_val)
            opts[opt_no] = opt_val
        parsed_questions.append({
            "num": q_num,
            "statement": stmt,
            "options": [opts.get("1",""), opts.get("2",""), opts.get("3",""), opts.get("4","")]
        })
    else:
        parsed_questions.append({
            "num": q_num,
            "statement": content,
            "options": None
        })

print("--- SAMPLE PARSED QUESTION ---")
print(json.dumps(parsed_questions[0] if parsed_questions else {}, indent=2))
