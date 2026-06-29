import os

pyq_dir = r"d:\JEE\JEE PYQ"
if not os.path.exists(pyq_dir):
    print("JEE PYQ folder does not exist")
else:
    files = os.listdir(pyq_dir)
    print(f"Total files in folder: {len(files)}")
    
    invalid_files = []
    pdf_count = 0
    
    for f in files:
        path = os.path.join(pyq_dir, f)
        if os.path.isfile(path):
            with open(path, "rb") as fh:
                sig = fh.read(4)
            if sig == b"%PDF":
                pdf_count += 1
            else:
                invalid_files.append((f, os.path.getsize(path), sig))
                
    print(f"Valid PDFs: {pdf_count}")
    print(f"Invalid files count: {len(invalid_files)}")
    if invalid_files:
        print("Invalid files:")
        for name, size, sig in invalid_files:
            print(f"  {name} ({size} bytes) - Signature: {sig}")
