import fitz

doc = fitz.open('JEE PYQ/JEE Main 2026 (28 Jan Shift 1) Previous Year Paper with Answer Keys - Competishun.pdf')
page = doc[2] # Page 3

with open('scratch/q16_q20_words.txt', 'w', encoding='utf-8') as out:
    words = page.get_text('words')
    # Filter for words on page 3
    words.sort(key=lambda w: (round(w[1]/4)*4, w[0]))
    current_y = None
    line = []
    for w in words:
        y = round(w[1]/4)*4
        if current_y is None or abs(y - current_y) > 2:
            if line:
                out.write(f"y={current_y:.0f}: {' '.join(line)}\n")
            current_y = y
            line = [f"{w[4]}"]
        else:
            line.append(f"{w[4]}")
    if line:
        out.write(f"y={current_y:.0f}: {' '.join(line)}\n")

print("Saved Page 3 words to scratch/q16_q20_words.txt")
