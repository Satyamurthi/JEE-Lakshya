import sqlite3
import os
import json
import urllib.request
import urllib.error
import sys

def load_env():
    env = {}
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        env[parts[0].strip()] = parts[1].strip()
    return env

def migrate():
    env = load_env()
    
    supabase_url = env.get("VITE_NEET_SUPABASE_URL") or os.environ.get("VITE_NEET_SUPABASE_URL")
    supabase_key = env.get("VITE_NEET_SUPABASE_ANON_KEY") or os.environ.get("VITE_NEET_SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("\n=== NEET SUPABASE CREDENTIALS REQUIRED ===")
        if not supabase_url:
            supabase_url = input("NEET Supabase URL: ").strip()
        if not supabase_key:
            supabase_key = input("NEET Supabase Anon Key: ").strip()
            
    if not supabase_url or not supabase_key:
        print("Error: Supabase credentials required. Exiting.")
        sys.exit(1)
        
    supabase_url = supabase_url.rstrip("/")
    
    db_path = os.path.join(os.path.dirname(__file__), "neet_questions.db")
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}. Please run seed_db.py first.")
        sys.exit(1)
        
    print(f"\n[TARGET DB] Strictly connected to NEET Supabase Endpoint: {supabase_url}")
    print(f"Connecting to NEET SQLite database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT q.id, q.question_text, q.type, q.difficulty, q.marks_correct, q.marks_incorrect,
               s.name as subject_name, c.name as chapter_name
        FROM questions q
        JOIN subjects s ON q.subject_id = s.id
        JOIN chapters c ON q.chapter_id = c.id;
    """)
    db_questions = cursor.fetchall()
    print(f"Found {len(db_questions)} NEET questions in SQLite database.")
    
    supabase_questions = []
    
    for row in db_questions:
        q_id, q_text, q_type, q_diff, marks_c, marks_i, sub_name, chap_name = row
        
        cursor.execute("SELECT option_text, is_correct FROM options WHERE question_id = ? ORDER BY id ASC;", (q_id,))
        db_options = cursor.fetchall()
        
        cursor.execute("SELECT explanation_text FROM solutions WHERE question_id = ?;", (q_id,))
        sol_row = cursor.fetchone()
        explanation = sol_row[0] if sol_row else "Detailed NCERT explanation."
        
        options_dict = {}
        correct_answer = "A"
        identifiers = ["A", "B", "C", "D"]
        
        for opt_idx, opt_row in enumerate(db_options[:4]):
            opt_text, is_corr = opt_row
            ident = identifiers[opt_idx]
            options_dict[ident] = opt_text
            if is_corr:
                correct_answer = ident
                
        marking_scheme = {"positive": marks_c, "negative": abs(marks_i)}
        
        supabase_q = {
            "subject": sub_name,
            "chapter": chap_name,
            "type": "MCQ",
            "difficulty": q_diff,
            "statement": q_text,
            "options": options_dict,
            "correctAnswer": str(correct_answer),
            "solution": explanation,
            "explanation": explanation,
            "concept": chap_name,
            "markingScheme": marking_scheme
        }
        supabase_questions.append(supabase_q)
        
    conn.close()
    
    url = f"{supabase_url}/rest/v1/questions?on_conflict=statement"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
    }
    
    print("\n[STEP 1] Clearing old questions from Supabase table...")
    delete_url = f"{supabase_url}/rest/v1/questions?statement=neq.NULL"
    delete_req = urllib.request.Request(delete_url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(delete_req) as del_res:
            del_res.read()
        print("  [SUCCESS] Delete request sent to Supabase.")
    except Exception as e:
        print(f"  Clear note: {e}")
        
    batch_size = 50
    total_questions = len(supabase_questions)
    uploaded_count = 0
    
    for i in range(0, total_questions, batch_size):
        batch = supabase_questions[i:i+batch_size]
        payload = json.dumps(batch).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as response:
                response.read()
            uploaded_count += len(batch)
            print(f"  Uploaded {uploaded_count}/{total_questions} NEET questions...")
        except urllib.error.HTTPError as err_http:
            err_body = err_http.read().decode('utf-8', errors='ignore')
            print(f"  Batch upload note ({err_http.code}): {err_body}")
        except Exception as e:
            print(f"  Batch upload note: {e}")
            
    print(f"\nMigration complete! Synced {uploaded_count} NEET questions to Supabase.")

if __name__ == "__main__":
    migrate()
