import sqlite3
import os
import json
import urllib.request
import urllib.error
import sys

# Load environment variables from .env
def load_env():
    env = {}
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        env[parts[0].strip()] = parts[1].strip()
    return env

def migrate():
    env = load_env()
    
    supabase_url = env.get("SUPABASE_URL") or env.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    supabase_key = env.get("SUPABASE_ANON_KEY") or env.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    
    # Prompt user if missing
    if not supabase_url or not supabase_key:
        print("\n=== SUPABASE CREDENTIALS NEEDED ===")
        print("Please configure your Supabase URL and Anon Key in the .env file, or enter them below:")
        if not supabase_url:
            supabase_url = input("Supabase Project URL (e.g., https://xyz.supabase.co): ").strip()
        if not supabase_key:
            supabase_key = input("Supabase Anon Key: ").strip()
            
    if not supabase_url or not supabase_key:
        print("Error: Supabase credentials are required for migration. Exiting.")
        sys.exit(1)
        
    # Clean Supabase URL trailing slash
    supabase_url = supabase_url.rstrip("/")
    
    db_path = os.path.join(os.path.dirname(__file__), "jee_questions.db")
    if not os.path.exists(db_path):
        print(f"Error: SQLite database not found at {db_path}. Please run populate_sqlite_from_pkl.py first.")
        sys.exit(1)
        
    print(f"\nConnecting to local SQLite database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Fetch questions and related data
    print("Fetching questions from SQLite...")
    cursor.execute("""
        SELECT q.id, q.question_text, q.type, q.difficulty, q.marks_correct, q.marks_incorrect,
               s.name as subject_name, c.name as chapter_name
        FROM questions q
        JOIN subjects s ON q.subject_id = s.id
        JOIN chapters c ON q.chapter_id = c.id;
    """)
    db_questions = cursor.fetchall()
    print(f"Found {len(db_questions)} questions in SQLite database.")
    
    # Batch variables
    batch_size = 100
    supabase_questions = []
    
    print("\nPreparing questions for Supabase schema...")
    for idx, row in enumerate(db_questions):
        q_id, q_text, q_type, q_diff, marks_c, marks_i, sub_name, chap_name = row
        
        # 1. Fetch options
        cursor.execute("SELECT option_text, is_correct FROM options WHERE question_id = ? ORDER BY id ASC;", (q_id,))
        db_options = cursor.fetchall()
        
        # 2. Fetch explanation
        cursor.execute("SELECT explanation_text FROM solutions WHERE question_id = ?;", (q_id,))
        sol_row = cursor.fetchone()
        explanation = sol_row[0] if sol_row else "No explanation available."
        
        # 3. Format options and answer
        options_dict = {}
        correct_answer = ""
        
        type_upper = "MCQ" if q_type in ["single_choice", "multiple_choice"] else "Numerical"
        
        if type_upper == "MCQ":
            identifiers = ["A", "B", "C", "D"]
            for opt_idx, opt_row in enumerate(db_options[:4]): # limit to 4
                opt_text, is_corr = opt_row
                ident = identifiers[opt_idx]
                options_dict[ident] = opt_text
                if is_corr:
                    correct_answer = ident
            # Fallback if no correct option marked
            if not correct_answer and identifiers:
                correct_answer = "A"
        else:
            # Numerical question
            options_dict = {}
            if db_options:
                correct_answer = db_options[0][0] # The extracted numerical value stored in option_text
            else:
                correct_answer = "0" # Default fallback
                
        # 4. Format marking scheme
        neg_val = abs(marks_i)
        marking_scheme = {
            "positive": marks_c,
            "negative": neg_val
        }
        
        supabase_q = {
            "subject": sub_name,
            "chapter": chap_name,
            "type": type_upper,
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
    
    print("Formatting complete! Initiating Supabase upload in batches...")
    
    total_questions = len(supabase_questions)
    uploaded_count = 0
    
    url = f"{supabase_url}/rest/v1/questions"
    
    # Supabase HTTP Headers
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    for i in range(0, total_questions, batch_size):
        batch = supabase_questions[i:i+batch_size]
        payload = json.dumps(batch).encode("utf-8")
        
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        
        try:
            with urllib.request.urlopen(req) as response:
                response.read()
            uploaded_count += len(batch)
            progress = (uploaded_count / total_questions) * 100
            print(f"  Uploaded {uploaded_count}/{total_questions} questions ({progress:.1f}%)...")
        except urllib.error.HTTPError as e:
            print(f"\nHTTP Error during batch upload: {e.code} - {e.reason}")
            print(e.read().decode("utf-8"))
            print("Migration aborted.")
            sys.exit(1)
        except Exception as e:
            print(f"\nConnection error: {e}")
            print("Migration aborted.")
            sys.exit(1)
            
    print(f"\nMigration completed successfully! Imported {uploaded_count} questions into your Supabase database.")

if __name__ == "__main__":
    migrate()
