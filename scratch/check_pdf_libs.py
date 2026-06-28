import sys

for pkg in ['pypdf', 'PyPDF2', 'pdfplumber', 'fitz', 'pdfminer']:
    try:
        __import__(pkg)
        print(f"AVAILABLE: {pkg}")
    except ImportError:
        print(f"NOT available: {pkg}")
