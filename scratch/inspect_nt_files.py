import urllib.request

urls = [
    'https://raw.githubusercontent.com/azeezv/abdxzi.github.io/main/nt/neet.html',
    'https://raw.githubusercontent.com/azeezv/abdxzi.github.io/main/nt/1000',
    'https://raw.githubusercontent.com/azeezv/abdxzi.github.io/main/nt/1001'
]

for url in urls:
    print("=== URL:", url)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as res:
            content = res.read(500)
            print("HEADER/BYTES:", content[:100])
            try:
                print("TEXT:", content.decode('utf-8'))
            except:
                print("BINARY DATA")
    except Exception as e:
        print("Error:", e)
