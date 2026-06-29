import sys
import pypdf

# Set standard output encoding to utf-8
sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"d:\JEE\JEE PYQ\JEE Main 2013 (09 Apr Online) Previous Year Paper with Answer Keys - MathonGo.pdf"
reader = pypdf.PdfReader(pdf_path)
num_pages = len(reader.pages)
print(f"Total pages: {num_pages}")

# Let's read the last 5 pages
for i in range(max(0, num_pages - 5), num_pages):
    print(f"\n--- Page {i+1} ---")
    text = reader.pages[i].extract_text()
    # Print the clean utf-8 encoded text
    print(text[:2000])
