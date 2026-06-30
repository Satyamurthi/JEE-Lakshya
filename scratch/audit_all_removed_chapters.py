import sqlite3
import json

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM chapters ORDER BY name ASC;")
db_chapters = [r[0] for r in cursor.fetchall()]

print(f"Total distinct chapters in SQLite DB: {len(db_chapters)}")

removed_keywords = [
    "communication", "gaseous", "solid state", "surface chemistry", "metallurgy",
    "isolation of metals", "environmental chemistry", "polymers", "everyday life",
    "hydrogen", "s-block", "mathematical reasoning", "induction"
]

db_removed = []
for ch in db_chapters:
    if any(k in ch.lower() for k in removed_keywords):
        db_removed.append(ch)

print(f"\nRemoved chapters found in SQLite DB ({len(db_removed)}):")
for ch in db_removed:
    cursor.execute("SELECT count(*) FROM questions q JOIN chapters c ON q.chapter_id=c.id WHERE c.name=?;", (ch,))
    count = cursor.fetchone()[0]
    print(f" - {ch} ({count} questions)")

conn.close()
