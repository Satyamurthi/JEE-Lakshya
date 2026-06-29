import os

pyq_dir = r"d:\JEE\JEE PYQ"
if not os.path.exists(pyq_dir):
    print("Folder does not exist")
else:
    files = os.listdir(pyq_dir)
    print(f"Total files: {len(files)}")
    # Print the first 20 and last 20 files
    if len(files) <= 40:
        for f in files:
            print(f)
    else:
        print("First 20 files:")
        for f in files[:20]:
            print(f"  {f}")
        print("...")
        print("Last 20 files:")
        for f in files[-20:]:
            print(f"  {f}")
