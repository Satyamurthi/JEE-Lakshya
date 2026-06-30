import fitz

doc = fitz.open('JEE PYQ/JEE Main 2026 (28 Jan Shift 1) Previous Year Paper with Answer Keys - Competishun.pdf')
page = doc[0]
for idx, b in enumerate(page.get_text('blocks')):
    print(f"Block {idx}: {repr(b[4])}")
