import pypdf
import re
import os

pdf_path = "JEE PYQ/JEE Main 2024 (27 Jan Shift 1) Previous Year Paper with Answer Keys - MathonGo.pdf"
reader = pypdf.PdfReader(pdf_path)

text = ""
for page in reader.pages[:-1]: # exclude answer key page
    t = page.extract_text()
    if t:
        text += "\n" + t

# Try finding questions Q1., Q2., etc.
q_blocks = re.split(r"\n(?=Q\d+\.|\b\d+\.\s+[A-Z])", text)
print(f"Total blocks split: {len(q_blocks)}")
for b in q_blocks[1:4]:
    print("--- BLOCK ---")
    print(b[:400])
