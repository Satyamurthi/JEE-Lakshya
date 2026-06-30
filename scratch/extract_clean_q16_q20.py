import re

with open('scratch/q16_q20_words.txt', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')
with open('scratch/q16_q20_clean.txt', 'w', encoding='utf-8') as out:
    for idx, l in enumerate(lines):
        if any(f"{q}." in l for q in range(16, 21)):
            out.write('\n'.join(lines[max(0, idx-1):min(len(lines), idx+20)]) + '\n\n')

print("Saved Q16-Q20 clean text to scratch/q16_q20_clean.txt")
