import fitz

doc = fitz.open('JEE PYQ/JEE Main 2026 (28 Jan Shift 1) Previous Year Paper with Answer Keys - Competishun.pdf')
page = doc[2] # page 3

with open('scratch/q14_exact_words.txt', 'w', encoding='utf-8') as out:
    words = page.get_text('words')
    q14_words = [w for w in words if 560 <= w[1] <= 660]
    q14_words.sort(key=lambda w: (round(w[1]/3)*3, w[0]))
    current_y = None
    line = []
    for w in q14_words:
        y = round(w[1]/3)*3
        if current_y is None or abs(y - current_y) > 2:
            if line:
                out.write(f"y={current_y:.0f}: {' '.join(line)}\n")
            current_y = y
            line = [f"{w[4]}({w[0]:.0f})"]
        else:
            line.append(f"{w[4]}({w[0]:.0f})")
    if line:
        out.write(f"y={current_y:.0f}: {' '.join(line)}\n")

print("Saved exact Q14 words to scratch/q14_exact_words.txt")
