import fitz

doc = fitz.open('JEE PYQ/JEE Main 2026 (28 Jan Shift 1) Previous Year Paper with Answer Keys - Competishun.pdf')

with open('scratch/parsed_math.txt', 'w', encoding='utf-8') as out:
    def print_page_words(page_num, start_y, end_y, title):
        out.write(f"\n--- {title} (Page {page_num+1}) ---\n")
        page = doc[page_num]
        words = page.get_text('words')
        words_in_range = [w for w in words if start_y <= w[1] <= end_y]
        words_in_range.sort(key=lambda w: (round(w[1]/4)*4, w[0]))
        current_line_y = None
        line_words = []
        for w in words_in_range:
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

    print_page_words(0, 230, 300, "Q2")
    print_page_words(0, 400, 490, "Q4")
    print_page_words(0, 495, 560, "Q5")
    print_page_words(1, 40, 110, "Q8")
    print_page_words(1, 115, 200, "Q9")
    print_page_words(1, 205, 280, "Q10")
    print_page_words(1, 280, 370, "Q11")
    print_page_words(1, 375, 460, "Q12")

print("Saved to scratch/parsed_math.txt")
