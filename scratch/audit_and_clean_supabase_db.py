import urllib.request
import json
import ssl
import time

SUPABASE_URL = "https://daitgcrjlimjajmqoemm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaXRnY3JqbGltamFqbXFvZW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1Nzc0MjIsImV4cCI6MjA5ODE1MzQyMn0.gGGHEQaVL0aXPkI-u5CMSPod5BazzBEAKr2ZfxnBh6Y"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

OUT_OF_SYLLABUS_CHAPTERS = [
    "gaseous state", "solid state", "surface chemistry", "environmental chemistry", 
    "polymers", "chemistry in everyday life", "hydrogen", "s-block elements", 
    "metallurgy", "communication systems", "mathematical reasoning", "forced and damped oscillations",
    "transistor", "klystron"
]

def audit_supabase():
    print("Fetching question metadata from Supabase...")
    limit = 5000
    offset = 0
    total_records = 0
    
    deleted_oos_count = 0
    deleted_dup_count = 0
    
    seen_statements = set()
    ids_to_delete_oos = []
    ids_to_delete_dup = []
    
    while True:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/questions?select=id,chapter,statement&limit={limit}&offset={offset}", 
            headers=headers
        )
        try:
            with urllib.request.urlopen(req, context=ctx) as resp:
                batch = json.loads(resp.read().decode())
                if not batch:
                    break
                
                total_records += len(batch)
                print(f"Loaded batch {offset} to {offset+len(batch)} (Total so far: {total_records})...")
                
                for q in batch:
                    q_id = q.get('id')
                    ch = (q.get('chapter') or '').lower().strip()
                    stmt = (q.get('statement') or '').strip().lower()
                    
                    # Check out of syllabus
                    if any(oos in ch for oos in OUT_OF_SYLLABUS_CHAPTERS):
                        ids_to_delete_oos.append(q_id)
                        continue
                    
                    # Check duplicate
                    if stmt and stmt in seen_statements:
                        ids_to_delete_dup.append(q_id)
                    else:
                        if stmt:
                            seen_statements.add(stmt)
                            
                if len(batch) < limit:
                    break
                offset += limit
        except Exception as e:
            print("Error fetching batch:", e)
            break
            
    print(f"\nAudit Summary:")
    print(f"Total processed: {total_records}")
    print(f"Out of syllabus to delete: {len(ids_to_delete_oos)}")
    print(f"Duplicates to delete: {len(ids_to_delete_dup)}")

audit_supabase()
