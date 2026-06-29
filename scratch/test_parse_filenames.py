import os
import re

pyq_dir = r"d:\JEE\JEE PYQ"
files = sorted(os.listdir(pyq_dir))

pattern = r'JEE Main (\d{4}) \(([^)]+)\) Previous Year Paper with Answer Keys - ([^.]+)\.pdf'
unmatched = []

for f in files:
    m = re.match(pattern, f)
    if m:
        year, info, source = m.groups()
        print(f"Matched: Year={year}, Info='{info}', Source={source}")
    else:
        unmatched.append(f)

print(f"\nTotal matched: {len(files) - len(unmatched)}")
print(f"Total unmatched: {len(unmatched)}")
if unmatched:
    print("Unmatched files:")
    for f in unmatched:
        print(f"  {f}")
