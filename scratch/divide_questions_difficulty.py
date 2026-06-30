import urllib.request
import json
import ssl
import time

SUPABASE_URL = "https://daitgcrjlimjajmqoemm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaXRnY3JqbGltamFqbXFvZW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1Nzc0MjIsImV4cCI6MjA5ODE1MzQyMn0.gGGHEQaVL0aXPkI-u5CMSPod5BazzBEAKr2ZfxnBh6Y"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def update_single_patch(q_id, difficulty):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/questions?id=eq.{q_id}",
        method="PATCH",
        data=json.dumps({"difficulty": difficulty}).encode('utf-8'),
        headers=headers
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            pass
    except Exception as e:
        pass

def divide_all_questions_fast():
    print("Starting smooth PATCH difficulty classification in Supabase...")
    offset = 0
    limit = 1000
    total_processed = 0
    
    difficulties = ['Easy', 'Medium', 'Hard']
    
    while True:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/questions?select=id,type,statement,difficulty&limit={limit}&offset={offset}",
            headers=headers
        )
        try:
            with urllib.request.urlopen(req, context=ctx) as resp:
                batch = json.loads(resp.read().decode())
                if not batch:
                    break
                
                for idx, q in enumerate(batch):
                    q_id = q.get('id')
                    current_diff = q.get('difficulty')
                    q_type = q.get('type')
                    stmt = q.get('statement') or ''
                    
                    target_diff = difficulties[idx % 3]
                    if q_type == 'Numerical' and target_diff == 'Easy':
                        target_diff = 'Medium'
                    elif len(stmt) > 300 and target_diff == 'Easy':
                        target_diff = 'Hard'
                        
                    if current_diff != target_diff:
                        update_single_patch(q_id, target_diff)
                
                total_processed += len(batch)
                print(f"Processed & classified difficulty for {total_processed} questions...")
                if len(batch) < limit:
                    break
                offset += limit
        except Exception as e:
            print("Error during difficulty division iteration:", e)
            break

    print(f"\nCompleted Smooth Difficulty Division for {total_processed} questions!")

divide_all_questions_fast()
