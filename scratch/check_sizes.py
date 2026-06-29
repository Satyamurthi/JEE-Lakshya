import os

pyq_dir = r"d:\JEE\JEE PYQ"
files = sorted(os.listdir(pyq_dir))
for f in files:
    path = os.path.join(pyq_dir, f)
    size = os.path.getsize(path)
    print(f"{f}: {size} bytes")
