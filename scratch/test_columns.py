import urllib.request
import json
import ssl

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

def test_columns():
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/questions?select=*&limit=1", headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            data = json.loads(resp.read().decode())
            if data:
                print("Questions table keys:", list(data[0].keys()))
    except Exception as e:
        print("Error fetching item:", e)

    req_order = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/questions?select=id&order=created_at.desc&limit=1", headers=headers)
    try:
        with urllib.request.urlopen(req_order, context=ctx) as resp:
            data = json.loads(resp.read().decode())
            print("Order by created_at succeeded!")
    except Exception as e:
        print("Order by created_at FAILED:", e)

test_columns()
