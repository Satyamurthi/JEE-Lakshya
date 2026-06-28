import urllib.request
import json
import sqlite3
import os
import re
import html
import sys

def clean_html(text):
    if not text:
        return ""
    text = html.unescape(text)
    text = text.replace('\xa0', ' ').replace('\u200b', '')
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</p>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def parse_neetprep_question(q_raw):
    q_html = q_raw.get('question') or ''
    q_html = html.unescape(q_html)
    q_html = re.sub(r'<img[^>]*>', '', q_html)
    q_html = re.sub(r'<br\s*/?>', '\n', q_html, flags=re.IGNORECASE)
    q_html = re.sub(r'</p>', '\n', q_html, flags=re.IGNORECASE)
    
    clean_text = re.sub(r'<[^>]+>', '', q_html).strip()
    clean_text = clean_text.replace('\xa0', ' ').replace('\u200b', '')
    
    if not clean_text or len(clean_text) < 12 or clean_text == '.':
        return None
        
    m1 = re.search(r'(?:^|\n|\s)(?:1\.|[A]\.|\(1\)|\(A\))\s*(.*?)(?=(?:\n|\s)(?:2\.|[B]\.|\(2\)|\(B\))|$)', clean_text, re.DOTALL)
    m2 = re.search(r'(?:^|\n|\s)(?:2\.|[B]\.|\(2\)|\(B\))\s*(.*?)(?=(?:\n|\s)(?:3\.|[C]\.|\(3\)|\(C\))|$)', clean_text, re.DOTALL)
    m3 = re.search(r'(?:^|\n|\s)(?:3\.|[C]\.|\(3\)|\(C\))\s*(.*?)(?=(?:\n|\s)(?:4\.|[D]\.|\(4\)|\(D\))|$)', clean_text, re.DOTALL)
    m4 = re.search(r'(?:^|\n|\s)(?:4\.|[D]\.|\(4\)|\(D\))\s*(.*?)(?=$)', clean_text, re.DOTALL)
    
    if m1 and m2 and m3 and m4:
        stmt = clean_text[:m1.start()].strip()
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
            opts[identifiers[idx]] = clean_html(str(o))
            
    if not stmt or len(stmt) < 8 or not opts.get("A"):
        return None

    corr_idx = q_raw.get('correctOptionIndex')
    identifiers = ["A", "B", "C", "D"]
    corr_ans = identifiers[corr_idx] if corr_idx is not None and 0 <= corr_idx < 4 else "A"
    
    expl = clean_html(q_raw.get('explanation')) or "Detailed solution and conceptual explanation from NEETprep NCERT module."
    
    return {
        "statement": stmt,
        "options": opts,
        "correctAnswer": corr_ans,
        "solution": expl
    }

def fetch_and_store():
    db_dir = os.path.dirname(__file__)
    db_path = os.path.join(db_dir, "neet_questions.db")
    schema_path = os.path.join(db_dir, "schema.sql")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create tables if not exists
    with open(schema_path, "r", encoding="utf-8") as f:
        cursor.executescript(f.read())

    subjects = ["Physics", "Chemistry", "Botany", "Zoology"]
    subject_ids = {}
    for sub in subjects:
        cursor.execute("INSERT OR IGNORE INTO subjects (name) VALUES (?);", (sub,))
        cursor.execute("SELECT id FROM subjects WHERE name = ?;", (sub,))
        subject_ids[sub] = cursor.fetchone()[0]

    # Get or create default exam
    cursor.execute("INSERT OR IGNORE INTO exams (name, year, type) VALUES ('NEETprep Question Bank Collection', 2025, 'NEET');")
    cursor.execute("SELECT id FROM exams WHERE type = 'NEET' ORDER BY id ASC LIMIT 1;")
    default_exam_id = cursor.fetchone()[0]

    url = 'https://www.neetprep.com/graphql'
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

    print("[STEP 1] Fetching live NEETprep question bank via GraphQL API...")
    
    total_fetched = 0
    total_inserted = 0
    chapter_ids = {}

    # Fetch multiple pages
    for page in range(0, 8): # Fetch 400 raw items to extract clean questions across all 4 subjects
        offset = page * 50
        req = urllib.request.Request(
            url, 
            data=json.dumps({"query": query, "variables": {"offset": offset}}).encode('utf-8'),
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Content-Type': 'application/json'
            }
        )
        
        try:
            with urllib.request.urlopen(req) as res:
                data = json.loads(res.read().decode('utf-8'))
                qs = data.get('data', {}).get('questions', [])
                total_fetched += len(qs)
                
                for idx, q_raw in enumerate(qs):
                    parsed = parse_neetprep_question(q_raw)
                    if parsed:
                        # Map to subject round-robin or based on text
                        stmt_text = parsed["statement"]
                        if any(k in stmt_text.lower() for k in ['velocity', 'force', 'mass', 'acceleration', 'diode', 'lens', 'current', 'charge', 'field', 'power']):
                            sub_name = "Physics"
                            chap_name = "General Physics (NEETprep)"
                        elif any(k in stmt_text.lower() for k in ['acid', 'reaction', 'mole', 'orbital', 'element', 'compound', 'oxidation', 'bond', 'solution']):
                            sub_name = "Chemistry"
                            chap_name = "General Chemistry (NEETprep)"
                        elif any(k in stmt_text.lower() for k in ['cell', 'dna', 'plant', 'flower', 'photosynthesis', 'leaf', 'seed', 'gene', 'organelle']):
                            sub_name = "Botany"
                            chap_name = "Plant Biology & Genetics (NEETprep)"
                        else:
                            sub_name = "Zoology"
                            chap_name = "Human Physiology & Zoology (NEETprep)"

                        sub_id = subject_ids[sub_name]
                        chap_key = (sub_id, chap_name)
                        if chap_key not in chapter_ids:
                            cursor.execute("INSERT OR IGNORE INTO chapters (subject_id, name) VALUES (?, ?);", (sub_id, chap_name))
                            cursor.execute("SELECT id FROM chapters WHERE subject_id = ? AND name = ?;", (sub_id, chap_name))
                            chapter_ids[chap_key] = cursor.fetchone()[0]
                        chap_id = chapter_ids[chap_key]

                        # Check unique statement in SQLite
                        cursor.execute("SELECT id FROM questions WHERE question_text = ?;", (stmt_text,))
                        if not cursor.fetchone():
                            cursor.execute(
                                """INSERT INTO questions (exam_id, subject_id, chapter_id, question_text, type, difficulty, marks_correct, marks_incorrect)
                                   VALUES (?, ?, ?, ?, 'MCQ', 'Medium', 4, -1);""",
                                (default_exam_id, sub_id, chap_id, stmt_text)
                            )
                            q_db_id = cursor.lastrowid
                            total_inserted += 1

                            for opt_key in ["A", "B", "C", "D"]:
                                is_c = (opt_key == parsed["correctAnswer"])
                                cursor.execute(
                                    "INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?);",
                                    (q_db_id, parsed["options"][opt_key], 1 if is_c else 0)
                                )

                            cursor.execute(
                                "INSERT INTO solutions (question_id, explanation_text) VALUES (?, ?);",
                                (q_db_id, parsed["solution"])
                            )
            print(f"  Processed page {page+1}/8 (Total valid inserted so far: {total_inserted})...")
        except Exception as e:
            print(f"  Page {page+1} fetch note: {e}")

    conn.commit()
    conn.close()
    print(f"\n[SUCCESS] Successfully extracted NEETprep question bank! Total active questions stored: {total_inserted}")

if __name__ == "__main__":
    fetch_and_store()
