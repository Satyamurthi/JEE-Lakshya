import sqlite3
import json

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables:", tables)

for t in tables:
    t_name = t[0]
    cursor.execute(f"PRAGMA table_info({t_name});")
    cols = cursor.fetchall()
    print(f"\nTable {t_name} columns:", [c[1] for c in cols])
    cursor.execute(f"SELECT * FROM {t_name} LIMIT 2;")
    print(f"Sample data from {t_name}:", cursor.fetchall())
