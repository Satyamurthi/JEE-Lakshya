import urllib.request
import json
import ssl

SUPABASE_URL = "https://daitgcrjlimjajmqoemm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaXRnY3JqbGltamFqbXFvZW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1Nzc0MjIsImV4cCI6MjA5ODE1MzQyMn0.gGGHEQaVL0aXPkI-u5CMSPod5BazzBEAKr2ZfxnBh6Y"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "count=exact"
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def check_supabase_count():
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/questions?select=id,subject,chapter,statement,type,correctAnswer&limit=50", headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            cr = response.headers.get("Content-Range")
            print("Content-Range Header:", cr)
            data = json.loads(response.read().decode())
            print(f"Sample fetched count: {len(data)}")
            if len(data) > 0:
                print("First item sample:", data[0])
    except Exception as e:
        print("Error fetching count:", e)

check_supabase_count()
