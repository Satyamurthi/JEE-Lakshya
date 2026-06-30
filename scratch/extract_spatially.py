import fitz
import json

doc = fitz.open('JEE PYQ/JEE Main 2026 (28 Jan Shift 1) Previous Year Paper with Answer Keys - Competishun.pdf')

with open('scratch/pdf_blocks.txt', 'w', encoding='utf-8') as out:
    for page_num, page in enumerate(doc):
        out.write(f"\n--- PAGE {page_num+1} ---\n")
        # get text with words or line details
        blocks = page.get_text('blocks')
        # sort blocks by y0, then x0
        blocks.sort(key=lambda b: (b[1], b[0]))
        for b in blocks:
            text = b[4].strip().replace('\n', ' ')
            if text:
                out.write(f"[{b[0]:.1f}, {b[1]:.1f}] {text}\n")

print("Saved spatial blocks to scratch/pdf_blocks.txt")
