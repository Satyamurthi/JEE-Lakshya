import sqlite3
import random

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

cursor.execute("""
SELECT q.id, e.name, e.year, s.name, c.name, q.question_text, q.type
FROM questions q
JOIN exams e ON q.exam_id = e.id
JOIN subjects s ON q.subject_id = s.id
JOIN chapters c ON q.chapter_id = c.id
ORDER BY RANDOM() LIMIT 10;
""")

questions = cursor.fetchall()
for q in questions:
    print(f"\n[ID {q[0]}] {q[1]} ({q[2]}) | {q[3]} - {q[4]}")
    print(f"Statement: {q[5][:200]}")
    cursor.execute("SELECT option_text, is_correct FROM options WHERE question_id = ?", (q[0],))
    opts = cursor.fetchall()
    print("Options:", [(o[0][:50], o[1]) for o in opts])
