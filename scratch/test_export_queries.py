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

def test_export_queries():
    print("Testing subject & difficulty breakdown in Supabase...")
    for sub in ["Physics", "Chemistry", "Mathematics"]:
        req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/questions?select=id,subject,difficulty&subject=ilike.*{sub}*&limit=10", headers=headers)
        try:
            with urllib.request.urlopen(req, context=ctx) as resp:
                data = json.loads(resp.read().decode())
                print(f"Subject '{sub}' sample count: {len(data)}")
                if data:
                    print("  Sample item:", data[0])
        except Exception as e:
            print(f"Error for '{sub}':", e)

test_export_queries()
