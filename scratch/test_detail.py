import pypdf

reader = pypdf.PdfReader('d:/JEE/scratch/pdfs/1000.pdf')
print("Is encrypted:", reader.is_encrypted)
if reader.is_encrypted:
    print("Trying decrypt...")
    res = reader.decrypt('')
    print("Decrypt result:", res)

for i, page in enumerate(reader.pages[:3]):
    print(f"--- PAGE {i} ---")
    print(page.extract_text()[:300])
