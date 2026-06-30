import fitz

doc = fitz.open('JEE PYQ/JEE Main 2026 (28 Jan Shift 1) Previous Year Paper with Answer Keys - Competishun.pdf')
page = doc[1] # Page 2

with open('scratch/q14_clean_text.txt', 'w', encoding='utf-8') as out:
    words = page.get_text('words')
    q14_words = [w for w in words if 550 <= w[1] <= 670]
    q14_words.sort(key=lambda w: (round(w[1]/3)*3, w[0]))
    current_y = None
    line = []
    for w in q14_words:
        y = round(w[1]/3)*3
        if current_y is None or abs(y - current_y) > 2:
            if line:
                out.write(f"y={current_y:.0f}: {' '.join(line)}\n")
            current_y = y
            line = [f"{w[4]}"]
        else:
            line.append(f"{w[4]}")
    if line:
        out.write(f"y={current_y:.0f}: {' '.join(line)}\n")

print("Saved clean Q14 text to scratch/q14_clean_text.txt")
