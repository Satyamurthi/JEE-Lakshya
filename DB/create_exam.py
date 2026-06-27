import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "jee_questions.db")

def create_exam(name, year, exam_type="Main", duration=180, total_questions=75):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT id FROM exams WHERE name = ? COLLATE NOCASE;", (name,))
    row = cursor.fetchone()
    if row:
        print(f"Exam '{name}' already exists with ID: {row[0]}")
        conn.close()
        return row[0]
        
    try:
        cursor.execute("""
            INSERT INTO exams (name, year, type, duration_minutes, total_questions)
            VALUES (?, ?, ?, ?, ?);
        """, (name, year, exam_type, duration, total_questions))
        exam_id = cursor.lastrowid
        conn.commit()
        print(f"Successfully created exam '{name}' (ID: {exam_id}) in the database.")
        conn.close()
        return exam_id
    except Exception as e:
        print(f"Error: {e}")
        conn.close()
        return None

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_exam.py <exam_name> <year> [type: Main/Advanced] [duration_mins] [total_questions]")
        print("Example: python create_exam.py \"JEE Main 2026 Session-1 Shift-1\" 2026 Main 180 75")
    else:
        name = sys.argv[1]
        year = int(sys.argv[2])
        exam_type = sys.argv[3] if len(sys.argv) > 3 else "Main"
        duration = int(sys.argv[4]) if len(sys.argv) > 4 else 180
        total_questions = int(sys.argv[5]) if len(sys.argv) > 5 else 75
        create_exam(name, year, exam_type, duration, total_questions)
