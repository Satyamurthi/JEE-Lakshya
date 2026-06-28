import fitz
import re
import json

doc = fitz.open('d:/JEE/scratch/pkt_pdfs/2024.pdf')
full_text = ""
for page in doc:
    full_text += page.get_text() + "\n"

# Let's clean headers/footers
full_text = re.sub(r'Test Booklet Code.*?\n', '', full_text)
full_text = re.sub(r'Space for Rough Work.*?\n', '', full_text, flags=re.IGNORECASE)

print(f"Total characters in 2024.pdf: {len(full_text)}")
print("Sample snippet:")
print(full_text[500:2000])
