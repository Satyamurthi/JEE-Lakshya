import os
path = r"d:\JEE\src\data\test.txt"
with open(path, "w") as f:
    f.write("Hello")
print("Exists:", os.path.exists(path))
