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

def delete_batch(ids):
    if not ids:
        return
    # Delete using in.() filter
    ids_str = ",".join([f'"{i}"' for i in ids])
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/questions?id=in.({ids_str})",
        method="DELETE",
        headers=headers
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            pass
    except Exception as e:
        print("Error deleting batch:", e)

def full_clean():
    print("Starting full Supabase database audit & cleanup...")
    offset = 0
    limit = 1000
    total_scanned = 0
    total_deleted_oos = 0
    total_deleted_dup = 0
    
    seen_statements = set()
    
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
                
                total_scanned += len(batch)
                ids_to_delete = []
                
                for q in batch:
                    q_id = q.get('id')
                    ch = (q.get('chapter') or '').lower().strip()
                    stmt = (q.get('statement') or '').strip().lower()
                    
                    # Out of syllabus check
                    if any(oos in ch for oos in OUT_OF_SYLLABUS_CHAPTERS):
                        ids_to_delete.append(q_id)
                        total_deleted_oos += 1
                        continue
                        
                    # Duplicate check
                    if stmt and stmt in seen_statements:
                        ids_to_delete.append(q_id)
                        total_deleted_dup += 1
                    else:
                        if stmt:
                            seen_statements.add(stmt)
                
                if ids_to_delete:
                    # Delete in chunks of 50
                    for i in range(0, len(ids_to_delete), 50):
                        delete_batch(ids_to_delete[i:i+50])
                        
                if len(batch) < limit:
                    break
                # Only increment offset by valid non-deleted items to stay aligned
                offset += (len(batch) - len(ids_to_delete))
                if total_scanned % 5000 == 0:
                    print(f"Scanned {total_scanned} questions... (OOS deleted: {total_deleted_oos}, Duplicates deleted: {total_deleted_dup})")
        except Exception as e:
            print("Error during scan iteration:", e)
            break

    print(f"\nFinal Clean Summary:")
    print(f"Total Scanned: {total_scanned}")
    print(f"Out of Syllabus Deleted: {total_deleted_oos}")
    print(f"Duplicates Deleted: {total_deleted_dup}")

full_clean()
