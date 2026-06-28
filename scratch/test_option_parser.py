import urllib.request
import json
import re
import html

url = 'https://www.neetprep.com/graphql'

def clean_html(text):
    if not text:
        return ""
    text = html.unescape(text)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</p>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def parse_neetprep_question(q_raw):
    q_html = q_raw.get('question') or ''
    q_html = html.unescape(q_html)
    
    # Remove images or handle text
    q_html = re.sub(r'<img[^>]*>', '', q_html)
    
    # Replace breaks and paragraphs
    q_html = re.sub(r'<br\s*/?>', '\n', q_html, flags=re.IGNORECASE)
    q_html = re.sub(r'</p>', '\n', q_html, flags=re.IGNORECASE)
    
    clean_text = re.sub(r'<[^>]+>', '', q_html).strip()
    if not clean_text or clean_text == '.':
        return None
        
    # Check if options 1., 2., 3., 4. are embedded in clean_text
    # Try splitting by option patterns
    opt_pattern = re.compile(r'(?:^|\n|\s)(?:1\.|[A]\.|\(1\)|\(A\))\s*|\n?(?:2\.|[B]\.|\(2\)|\(B\))\s*|\n?(?:3\.|[C]\.|\(3\)|\(C\))\s*|\n?(?:4\.|[D]\.|\(4\)|\(D\))\s*')
    
    # Let's find matches for options 1, 2, 3, 4
    m1 = re.search(r'(?:^|\n|\s)(?:1\.|[A]\.|\(1\)|\(A\))\s*(.*?)(?=(?:\n|\s)(?:2\.|[B]\.|\(2\)|\(B\))|$)', clean_text, re.DOTALL)
    m2 = re.search(r'(?:^|\n|\s)(?:2\.|[B]\.|\(2\)|\(B\))\s*(.*?)(?=(?:\n|\s)(?:3\.|[C]\.|\(3\)|\(C\))|$)', clean_text, re.DOTALL)
    m3 = re.search(r'(?:^|\n|\s)(?:3\.|[C]\.|\(3\)|\(C\))\s*(.*?)(?=(?:\n|\s)(?:4\.|[D]\.|\(4\)|\(D\))|$)', clean_text, re.DOTALL)
    m4 = re.search(r'(?:^|\n|\s)(?:4\.|[D]\.|\(4\)|\(D\))\s*(.*?)(?=$)', clean_text, re.DOTALL)
    
    if m1 and m2 and m3 and m4:
        # Extract statement before option 1
        stmt_end = m1.start()
        stmt = clean_text[:stmt_end].strip()
        opts = {
            "A": m1.group(1).strip(),
            "B": m2.group(1).strip(),
            "C": m3.group(1).strip(),
            "D": m4.group(1).strip()
        }
    else:
        stmt = clean_text
        raw_opts = q_raw.get('options') or []
        opts = {}
        identifiers = ["A", "B", "C", "D"]
        for idx, o in enumerate(raw_opts[:4]):
            opts[identifiers[idx]] = str(o).strip()
            
    corr_idx = q_raw.get('correctOptionIndex')
    identifiers = ["A", "B", "C", "D"]
    corr_ans = identifiers[corr_idx] if corr_idx is not None and 0 <= corr_idx < 4 else "A"
    
    expl = clean_html(q_raw.get('explanation')) or "Detailed solution and conceptual explanation."
    
    return {
        "statement": stmt,
        "options": opts,
        "correctAnswer": corr_ans,
        "solution": expl
    }

query = """
query GetQuestions($offset: Int) {
  questions(limit: 50, offset: $offset) {
    id
    question
    options
    correctOptionIndex
    explanation
  }
}
"""

req = urllib.request.Request(
    url, 
    data=json.dumps({"query": query, "variables": {"offset": 0}}).encode('utf-8'),
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Content-Type': 'application/json'
    }
)

with urllib.request.urlopen(req) as res:
    data = json.loads(res.read().decode('utf-8'))
    qs = data.get('data', {}).get('questions', [])
    parsed_count = 0
    for q in qs:
        res_q = parse_neetprep_question(q)
        if res_q and len(res_q['statement']) > 10:
            parsed_count += 1
            if parsed_count <= 3:
                print(f"=== PARSED QUESTION {parsed_count} ===")
                print("STATEMENT:", res_q['statement'])
                print("OPTIONS:", res_q['options'])
                print("CORRECT:", res_q['correctAnswer'])
    print(f"\nTotal valid parsed questions out of 50: {parsed_count}")
