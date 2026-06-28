import sqlite3
import os
import sys

db_dir = os.path.dirname(__file__)
db_path = os.path.join(db_dir, "neet_questions.db")
schema_path = os.path.join(db_dir, "schema.sql")

print("[STEP 1] Re-initializing SQLite database schema...")
if os.path.exists(db_path):
    os.remove(db_path)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
with open(schema_path, "r", encoding="utf-8") as f:
    cursor.executescript(f.read())
conn.close()

print("[STEP 2] Generating 60,000 NEET Questions (15,000 per subject)...")
from generate_60k_neet_bank import generate_60k
generate_60k()

print("[STEP 3] Exporting chunked SQL files...")
from generate_chunked_sql import export_chunked_sql
export_chunked_sql()

print("[STEP 4] Migrating all 60,000 questions to Supabase...")
from migrate_to_supabase import migrate
migrate()
