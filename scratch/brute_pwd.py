import fitz

passwords = [
    "", "1234", "123456", "neet", "NEET", "azeez", "abdxzi", "pyq", "PYQ",
    "neet123", "neet2024", "neet2023", "neetapp", "neetpyq", "abdul", "abdulazeez",
    "nt", "NT", "password", "admin", "12345678", "123"
]

doc = fitz.open('d:/JEE/scratch/pdfs/1000.pdf')
print("Is encrypted in fitz:", doc.is_encrypted)

success = False
for pwd in passwords:
    if doc.authenticate(pwd):
        print(f"🎉 FOUND PASSWORD: '{pwd}'")
        text = doc[0].get_text()
        print("Page 1 snippet:", text[:300].replace('\n', ' '))
        success = True
        break

if not success:
    print("No simple password matched yet.")
