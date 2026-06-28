import sqlite3
import os

def export_mysql_dump():
    db_dir = os.path.dirname(__file__)
    db_path = os.path.join(db_dir, "neet_questions.db")
    dump_path = os.path.join(db_dir, "neet_nexus_mysql.sql")

    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    with open(dump_path, "w", encoding="utf-8") as f:
        f.write("-- NEET Nexus MySQL Database Dump\n")
        f.write("SET FOREIGN_KEY_CHECKS = 0;\n\n")

        # Dump Subjects
        cursor.execute("SELECT id, name FROM subjects;")
        f.write("-- Subjects\n")
        for row in cursor.fetchall():
            f.write(f"INSERT INTO subjects (id, name) VALUES ({row[0]}, '{row[1]}');\n")
        
        # Dump Exams
        cursor.execute("SELECT id, name, year, type, duration_minutes, total_questions FROM exams;")
        f.write("\n-- Exams\n")
        for row in cursor.fetchall():
            f.write(f"INSERT INTO exams (id, name, year, type, duration_minutes, total_questions) VALUES ({row[0]}, '{row[1]}', {row[2]}, '{row[3]}', {row[4]}, {row[5]});\n")

        f.write("\nSET FOREIGN_KEY_CHECKS = 1;\n")

    conn.close()
    print(f"[SUCCESS] Exported MySQL dump to {dump_path}")

if __name__ == "__main__":
    export_mysql_dump()
