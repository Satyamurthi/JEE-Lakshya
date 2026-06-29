import urllib.request

urls = [
    "https://links.mathongo.com/hFUS",
    "https://cutt.ly/dtFwtEZ9"
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

for u in urls:
    print(f"Testing {u}...")
    req = urllib.request.Request(u, headers=headers)
    try:
        # We use a custom HTTPRedirectHandler or just urlopen which follows redirects automatically.
        # Let's inspect the final URL.
        with urllib.request.urlopen(req) as resp:
            final_url = resp.geturl()
            print(f"  Final URL: {final_url}")
            print(f"  Status code: {resp.status}")
    except Exception as e:
        print(f"  Error: {e}")
