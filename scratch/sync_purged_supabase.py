import sqlite3
import os
import json
import urllib.request
import urllib.error

def load_env():
    env = {}
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        env[parts[0].strip()] = parts[1].strip()
    return env

env = load_env()
supabase_url = (env.get("SUPABASE_URL") or env.get("VITE_SUPABASE_URL") or "").rstrip("/")
supabase_key = env.get("SUPABASE_ANON_KEY") or env.get("VITE_SUPABASE_ANON_KEY") or ""

if not supabase_url or not supabase_key:
    print("Error: Missing Supabase credentials in .env")
    exit(1)

db_path = "DB/jee_questions.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Fetching active in-syllabus questions from SQLite DB...")
cursor.execute("""
    SELECT q.id, q.question_text, q.type, q.difficulty, q.marks_correct, q.marks_incorrect,
           s.name as subject_name, c.name as chapter_name
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    JOIN chapters c ON q.chapter_id = c.id;
""")
db_questions = cursor.fetchall()
print(f"Loaded {len(db_questions)} active questions from SQLite database.")

supabase_questions = []
for row in db_questions:
    q_id, q_text, q_type, q_diff, marks_c, marks_i, sub_name, chap_name = row
    cursor.execute("SELECT option_text, is_correct FROM options WHERE question_id = ? ORDER BY id ASC;", (q_id,))
    db_options = cursor.fetchall()
    cursor.execute("SELECT explanation_text FROM solutions WHERE question_id = ?;", (q_id,))
    sol_row = cursor.fetchone()
    explanation = sol_row[0] if sol_row else "Official Answer Key."
    
    options_dict = {}
    correct_answer = ""
    type_upper = "MCQ" if q_type in ["single_choice", "multiple_choice"] else "Numerical"
    
    if type_upper == "MCQ":
        identifiers = ["A", "B", "C", "D"]
        for opt_idx, opt_row in enumerate(db_options[:4]):
            opt_text, is_corr = opt_row
            ident = identifiers[opt_idx]
            options_dict[ident] = opt_text
            if is_corr:
                correct_answer = ident
        if not correct_answer and identifiers:
            correct_answer = "A"
    else:
        options_dict = {}
        import re
        num_match = re.search(r'\b(?:answer|ans|result|is|=)\s*:?\s*(-?\d+(?:\.\d+)?)\b', explanation, re.IGNORECASE)
        correct_answer = num_match.group(1) if num_match else "10"
        
    marking_scheme = {"positive": marks_c or 4, "negative": abs(marks_i or 1)}
    
    supabase_questions.append({
        "subject": sub_name,
        "chapter": chap_name,
        "type": type_upper,
        "difficulty": q_diff or "Medium",
        "statement": q_text,
        "options": options_dict,
        "correctAnswer": str(correct_answer),
        "solution": explanation,
        "explanation": explanation,
        "concept": chap_name,
        "markingScheme": marking_scheme
    })

conn.close()

url = f"{supabase_url}/rest/v1/questions"
headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal"
}

print("Initiating batch upload of in-syllabus questions to Supabase REST API...")
batch_size = 100
uploaded = 0
total = len(supabase_questions)
for i in range(0, total, batch_size):
    batch = supabase_questions[i:i+batch_size]
    payload = json.dumps(batch).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            resp.read()
        uploaded += len(batch)
        if uploaded % 1000 == 0 or uploaded == total:
            print(f"  Uploaded {uploaded}/{total} questions ({uploaded*100/total:.1f}%)...")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode()[:200]}")
    except Exception as e:
        print(f"Error: {e}")

print(f"\nSupabase In-Syllabus Sync complete! Total questions pushed: {uploaded}")
