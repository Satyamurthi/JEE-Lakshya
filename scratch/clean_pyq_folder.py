import os

pyq_dir = r"d:\JEE\JEE PYQ"
if os.path.exists(pyq_dir):
    files = os.listdir(pyq_dir)
    deleted_count = 0
    for f in files:
        path = os.path.join(pyq_dir, f)
        if os.path.isfile(path):
            size = os.path.getsize(path)
            # Delete files smaller than 1MB (which are corrupted HTML files)
            if size < 1024 * 1024:
                print(f"Deleting corrupted file: {f} ({size} bytes)")
                os.remove(path)
                deleted_count += 1
    print(f"Cleaned up {deleted_count} files.")
else:
    print("JEE PYQ directory does not exist.")
