import sqlite3

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

cursor.execute("SELECT count(*) FROM questions;")
print("Total questions in SQLite DB:", cursor.fetchone()[0])

cursor.execute("SELECT count(distinct exam_id) FROM questions;")
print("Total distinct exams in SQLite DB:", cursor.fetchone()[0])

cursor.execute("""
    SELECT q.id, q.question_text, s.name, c.name 
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    JOIN chapters c ON q.chapter_id = c.id
    LIMIT 5;
""")
for r in cursor.fetchall():
    print(f"\n[{r[2]} | {r[3]}] QID {r[0]}:")
    print(r[1][:150])

conn.close()
