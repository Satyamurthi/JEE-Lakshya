import urllib.request
import json
import ssl

SUPABASE_URL = "https://daitgcrjlimjajmqoemm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaXRnY3JqbGltamFqbXFvZW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1Nzc0MjIsImV4cCI6MjA5ODE1MzQyMn0.gGGHEQaVL0aXPkI-u5CMSPod5BazzBEAKr2ZfxnBh6Y"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_insert_profile():
    test_id = "11111111-2222-3333-4444-555555555555"
    test_user = {
        "id": test_id,
        "email": "test_student_ind@example.com",
        "full_name": "Test Student",
        "mobile_number": "9999999999",
        "college_name": "Test College",
        "college_address": "Test Address",
        "stream": "JEE Main & Advanced",
        "password": "testpassword",
        "role": "student",
        "status": "approved",
        "admin_id": None,
        "has_used_free_test": False,
        "created_at": "2026-06-29T18:15:00.000Z"
    }
    
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/profiles",
        method="POST",
        data=json.dumps(test_user).encode('utf-8'),
        headers=headers
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            data = json.loads(resp.read().decode())
            print("Direct insert test SUCCEEDED:", data)
            # Cleanup test profile
            del_req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{test_id}", method="DELETE", headers=headers)
            with urllib.request.urlopen(del_req, context=ctx) as dresp:
                pass
    except Exception as e:
        print("Direct insert test FAILED:", e)
        if hasattr(e, 'read'):
            print("Error response body:", e.read().decode())

test_insert_profile()
