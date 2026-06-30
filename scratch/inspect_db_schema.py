import sqlite3

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(exams);")
print("Exams table columns:", [r[1] for r in cursor.fetchall()])

cursor.execute("SELECT * FROM exams LIMIT 5;")
print("Sample exams:", cursor.fetchall())

conn.close()
