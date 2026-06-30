import fitz

doc = fitz.open('JEE PYQ/JEE Main 2026 (28 Jan Shift 1) Previous Year Paper with Answer Keys - Competishun.pdf')

print(f"Total pages: {len(doc)}")

for page_num in range(min(5, len(doc))):
    page = doc[page_num]
    print(f"\n--- PAGE {page_num+1} ---")
    blocks = page.get_text('blocks')
    for b in blocks:
        text = b[4].strip().replace('\n', ' ')
        if text:
            print(f"[{b[0]:.1f}, {b[1]:.1f}] {text[:120]}")
