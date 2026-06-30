import re

with open('scratch/chem_blocks.txt', encoding='utf-8') as f:
    text = f.read()

# find blocks around 68. or Question 68
m = re.search(r'(68\.\s*Given below.*?(?=69\.|\Z))', text, re.DOTALL)
if m:
    with open('scratch/q68_result.txt', 'w', encoding='utf-8') as out:
        out.write(m.group(1))
    print("Found Q68! Saved to scratch/q68_result.txt")
else:
    print("Q68 not matched by regex, searching lines...")
    lines = text.split('\n')
    for idx, l in enumerate(lines):
        if '68.' in l or '68 ' in l:
            print('\n'.join(lines[idx:idx+25]))
            break
