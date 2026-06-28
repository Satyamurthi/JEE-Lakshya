import urllib.request
import os

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

env = load_env()
supabase_url = env.get("VITE_NEET_SUPABASE_URL")
supabase_key = env.get("VITE_NEET_SUPABASE_ANON_KEY")

url = f"{supabase_url}/rest/v1/questions?select=id"
headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Range-Unit": "items",
    "Prefer": "count=exact"
}

req = urllib.request.Request(url, headers=headers, method="HEAD")
try:
    with urllib.request.urlopen(req) as res:
        content_range = res.headers.get("Content-Range")
        print(f"EXACT COUNT IN SUPABASE: {content_range}")
except Exception as e:
    print("Error checking count:", e)
