import urllib.request

urls = [
    'https://raw.githubusercontent.com/azeezv/Neet-PYQ-App/main/lib/main.dart',
    'https://raw.githubusercontent.com/azeezv/Neet-PYQ-App/main/lib/components/home_screen_btn.dart',
    'https://raw.githubusercontent.com/azeezv/Neet-PYQ-App/main/lib/utils/bookmark_manager.dart'
]

for url in urls:
    print("=== URL:", url)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as res:
            content = res.read().decode('utf-8', errors='ignore')
            print(content)
    except Exception as e:
        print("Error:", e)
