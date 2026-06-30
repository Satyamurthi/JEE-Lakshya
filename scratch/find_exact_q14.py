import fitz

doc = fitz.open('JEE PYQ/JEE Main 2026 (28 Jan Shift 1) Previous Year Paper with Answer Keys - Competishun.pdf')

for page_num, page in enumerate(doc):
    text = page.get_text()
    if '14.' in text:
        print(f"--- PAGE {page_num+1} ---")
        blocks = page.get_text('blocks')
        for b in blocks:
            if '14.' in b[4]:
                print("FOUND Q14 BLOCK:")
                print(b[4])
                print("Bounds:", b[:4])
