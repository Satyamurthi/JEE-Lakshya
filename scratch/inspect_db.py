import sqlite3

db_path = r"d:\JEE\DB\jee_questions.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Search for any exam containing '2013' or '2014' or '2015'
cursor.execute("SELECT * FROM exams WHERE name LIKE '%2013%';")
exams = cursor.fetchall()
print(f"2013 exams in db:")
for e in exams:
    # Count questions
    cursor.execute("SELECT COUNT(*) FROM questions WHERE exam_id = ?;", (e[0],))
    q_count = cursor.fetchone()[0]
    print(f"  ID: {e[0]}, Name: '{e[1]}', Year: {e[2]}, Type: {e[3]}, Question Count: {q_count}")

# Check questions table structure
cursor.execute("PRAGMA table_info(questions);")
print("\nQuestions columns:")
for col in cursor.fetchall():
    print(f"  {col[1]} ({col[2]})")

# Check options table structure
cursor.execute("PRAGMA table_info(options);")
print("\nOptions columns:")
for col in cursor.fetchall():
    print(f"  {col[1]} ({col[2]})")

conn.close()
