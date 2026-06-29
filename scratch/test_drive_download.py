import urllib.request
import os

file_id = "1SCuqThv9OrJsM-uz-vir5HOxkjlBCITi"
dl_url = f"https://drive.google.com/uc?export=download&id={file_id}"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

dest_path = "scratch/test_download.pdf"
req = urllib.request.Request(dl_url, headers=headers)

try:
    with urllib.request.urlopen(req) as resp, open(dest_path, "wb") as f:
        f.write(resp.read())
    print(f"Downloaded successfully. Size: {os.path.getsize(dest_path)} bytes")
    # Read the first few bytes to check if it's a valid PDF (should start with %PDF)
    with open(dest_path, "rb") as f:
        head = f.read(4)
        print(f"File signature: {head}")
        if head == b"%PDF":
            print("Valid PDF signature!")
        else:
            print("Invalid PDF signature.")
            f.seek(0)
            print(f"First 100 bytes: {f.read(100)}")
except Exception as e:
    print(f"Error downloading: {e}")
