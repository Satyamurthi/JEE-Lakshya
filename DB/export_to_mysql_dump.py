import sqlite3
import os
import re

DB_PATH = os.path.join(os.path.dirname(__file__), "jee_questions.db")
SQL_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "jee_nexus_mysql.sql")

def escape_sql_string(val):
    if val is None:
        return "NULL"
    # Replace backslashes with double backslashes for MySQL, and escape single quotes
    val_str = str(val)
    val_str = val_str.replace("\\", "\\\\")
    val_str = val_str.replace("'", "\\'")
    return f"'{val_str}'"

def generate_dump():
    print(f"Reading SQLite database: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print(f"Writing MySQL dump to: {SQL_OUTPUT_PATH}")
    with open(SQL_OUTPUT_PATH, "w", encoding="utf-8") as f:
        # 1. Database Creation Header
        f.write("""-- ====================================================
-- JEE NEXUS - MYSQL DATABASE DUMP (XAMPP COMPATIBLE)
-- ====================================================\n
CREATE DATABASE IF NOT EXISTS jee_nexus;
USE jee_nexus;

-- Enable foreign keys & set UTF-8
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ----------------------------------------------------
-- Table structure for subjects
-- ----------------------------------------------------
DROP TABLE IF EXISTS options;
DROP TABLE IF EXISTS solutions;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS chapters;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS profiles;

CREATE TABLE profiles (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  password VARCHAR(255),
  role VARCHAR(50) DEFAULT 'student',
  status VARCHAR(50) DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  year INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  duration_minutes INT DEFAULT 180,
  total_questions INT DEFAULT 75
);

CREATE TABLE subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE chapters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT NOT NULL,
  subject_id INT NOT NULL,
  chapter_id INT NOT NULL,
  question_text TEXT NOT NULL,
  type VARCHAR(100) NOT NULL,
  difficulty VARCHAR(50) NOT NULL,
  marks_correct INT DEFAULT 4,
  marks_incorrect INT DEFAULT -1,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE TABLE options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct TINYINT(1) NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE solutions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  explanation_text TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Insert Default Admin Profile
INSERT INTO profiles (id, email, full_name, password, role, status)
VALUES ('admin-sys-id', 'satyu000@gmail.com', 'System Admin', 'admin123', 'admin', 'approved');

-- ----------------------------------------------------
-- Data Dump
-- ----------------------------------------------------
""")

        # 2. Dump Subjects
        print("Dumping subjects...")
        cursor.execute("SELECT id, name FROM subjects;")
        for row in cursor.fetchall():
            f.write(f"INSERT INTO subjects (id, name) VALUES ({row[0]}, '{row[1]}');\n")

        # 3. Dump Chapters
        print("Dumping chapters...")
        cursor.execute("SELECT id, subject_id, name FROM chapters;")
        for row in cursor.fetchall():
            f.write(f"INSERT INTO chapters (id, subject_id, name) VALUES ({row[0]}, {row[1]}, {escape_sql_string(row[2])});\n")

        # 4. Dump Exams
        print("Dumping exams...")
        cursor.execute("SELECT id, name, year, type, duration_minutes, total_questions FROM exams;")
        for row in cursor.fetchall():
            f.write(f"INSERT INTO exams (id, name, year, type, duration_minutes, total_questions) VALUES ({row[0]}, {escape_sql_string(row[1])}, {row[2]}, '{row[3]}', {row[4]}, {row[5]});\n")

        # 5. Dump Questions
        print("Dumping questions (this might take a moment)...")
        cursor.execute("SELECT id, exam_id, subject_id, chapter_id, question_text, type, difficulty, marks_correct, marks_incorrect FROM questions;")
        questions = cursor.fetchall()
        for idx, row in enumerate(questions):
            f.write(f"INSERT INTO questions (id, exam_id, subject_id, chapter_id, question_text, type, difficulty, marks_correct, marks_incorrect) VALUES ({row[0]}, {row[1]}, {row[2]}, {row[3]}, {escape_sql_string(row[4])}, '{row[5]}', '{row[6]}', {row[7]}, {row[8]});\n")
            if idx % 2000 == 0 and idx > 0:
                print(f"  Dumped {idx} questions...")

        # 6. Dump Options
        print("Dumping options...")
        cursor.execute("SELECT id, question_id, option_text, is_correct FROM options;")
        options = cursor.fetchall()
        for idx, row in enumerate(options):
            f.write(f"INSERT INTO options (id, question_id, option_text, is_correct) VALUES ({row[0]}, {row[1]}, {escape_sql_string(row[2])}, {row[3]});\n")
            if idx % 10000 == 0 and idx > 0:
                print(f"  Dumped {idx} options...")

        # 7. Dump Solutions
        print("Dumping solutions...")
        cursor.execute("SELECT id, question_id, explanation_text FROM solutions;")
        solutions = cursor.fetchall()
        for idx, row in enumerate(solutions):
            f.write(f"INSERT INTO solutions (id, question_id, explanation_text) VALUES ({row[0]}, {row[1]}, {escape_sql_string(row[2])});\n")
            if idx % 2000 == 0 and idx > 0:
                print(f"  Dumped {idx} solutions...")

        # Enable foreign key checks back
        f.write("\nSET FOREIGN_KEY_CHECKS = 1;\n")

    conn.close()
    print("MySQL dump generation complete!")

if __name__ == "__main__":
    generate_dump()
