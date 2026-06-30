import fitz
import re

pdf_path = 'JEE PYQ/JEE Main 2026 (28 Jan Shift 1) Previous Year Paper with Answer Keys - Competishun.pdf'
doc = fitz.open(pdf_path)

print(f"Total pages in 28 Jan Shift 1 PDF: {len(doc)}")

full_text = ""
for page_num in range(len(doc)):
    page = doc[page_num]
    full_text += f"\n--- Page {page_num+1} ---\n" + page.get_text()

# Find occurrences of question numbers like "1.", "2.", "3.", ... "90."
q_matches = re.findall(r'\b(\d{1,2})\.\s+', full_text)
print("Question numbers found:", sorted(list(set(int(x) for x in q_matches if 1 <= int(x) <= 90))))

with open('scratch/28jan1_full_text.txt', 'w', encoding='utf-8') as f:
    f.write(full_text)

print("Saved full text to scratch/28jan1_full_text.txt")
