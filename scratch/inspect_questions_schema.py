import sqlite3

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(questions);")
print("Questions table columns:", [r[1] for r in cursor.fetchall()])

cursor.execute("SELECT * FROM questions LIMIT 2;")
print("\nSample question:", cursor.fetchall()[0])

conn.close()
