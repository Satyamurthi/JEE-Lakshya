import re

with open('scratch/pdf_blocks.txt', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'(14\.\s*The value of.*?(?=15\.|\Z))', text, re.DOTALL)
if m:
    with open('scratch/q14_found.txt', 'w', encoding='utf-8') as out:
        out.write(m.group(1))
    print("Found Q14! Saved to scratch/q14_found.txt")
else:
    print("Q14 not matched by regex, searching lines...")
    lines = text.split('\n')
    for idx, l in enumerate(lines):
        if '14.' in l:
            print('\n'.join(lines[idx:idx+20]))
