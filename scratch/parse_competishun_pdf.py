import fitz
import re
import json

pdf_path = 'JEE PYQ/JEE Main 2026 (28 Jan Shift 1) Previous Year Paper with Answer Keys - Competishun.pdf'
doc = fitz.open(pdf_path)

questions = []
current_q = None

# We can iterate page by page and extract blocks
full_text = ""
for page_idx in range(len(doc)):
    full_text += f"\n--- Page {page_idx+1} ---\n" + doc[page_idx].get_text()

# Split by question markers like "1. ", "2. ", etc.
# Note that inCompetishun PDFs, questions are marked like "1.", "2." at start of lines.
lines = full_text.split('\n')
q_blocks = []
curr_block = []
curr_num = None

for l in lines:
    m = re.match(r'^\s*(\d{1,2})\.\s+(.*)', l)
    if m and 1 <= int(m.group(1)) <= 75:
        if curr_num is not None:
            q_blocks.append((curr_num, '\n'.join(curr_block)))
        curr_num = int(m.group(1))
        curr_block = [m.group(2)]
    else:
        if curr_num is not None:
            curr_block.append(l)

if curr_num is not None:
    q_blocks.append((curr_num, '\n'.join(curr_block)))

print(f"Extracted {len(q_blocks)} question blocks from 28 Jan Shift 1 PDF.")
for qnum, text in q_blocks[:5]:
    print(f"\n--- Q{qnum} ---")
    print(text[:150])

