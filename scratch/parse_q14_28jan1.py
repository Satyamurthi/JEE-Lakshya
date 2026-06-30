import fitz

doc = fitz.open('JEE PYQ/JEE Main 2026 (28 Jan Shift 1) Previous Year Paper with Answer Keys - Competishun.pdf')

with open('scratch/q14_blocks.txt', 'w', encoding='utf-8') as out:
    for page_num in range(2, 4):
        out.write(f"\n--- PAGE {page_num+1} ---\n")
        page = doc[page_num]
        words = page.get_text('words')
        words.sort(key=lambda w: (round(w[1]/4)*4, w[0]))
        current_line_y = None
        line_words = []
        for w in words:
            line_y = round(w[1]/4)*4
            if current_line_y is None or abs(line_y - current_line_y) > 2:
                if line_words:
                    out.write(f"[{current_line_y:.0f}] {' '.join(line_words)}\n")
                current_line_y = line_y
                line_words = [w[4]]
            else:
                line_words.append(w[4])
        if line_words:
            out.write(f"[{current_line_y:.0f}] {' '.join(line_words)}\n")

print("Saved Q14 blocks to scratch/q14_blocks.txt")
