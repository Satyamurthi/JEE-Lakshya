import sqlite3

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

cursor.execute("SELECT id, name, year, type, total_questions FROM exams ORDER BY year DESC, name ASC;")
exams = cursor.fetchall()
print(f"Total exams in SQLite DB: {len(exams)}")
for e in exams[:30]:
    cursor.execute("SELECT count(*) FROM questions WHERE exam_id = ?", (e[0],))
    q_cnt = cursor.fetchone()[0]
    print(f"ID {e[0]}: {e[1]} ({e[2]}) - {q_cnt} questions")
