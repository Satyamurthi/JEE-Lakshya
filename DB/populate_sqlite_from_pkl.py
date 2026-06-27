import sys
import os
import sqlite3
import re

# Add path to the unzipped package
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp_zip", "jee_mains_pyqs_data_base-main"))
from jee_data_base import DataBase

DB_PATH = os.path.join(os.path.dirname(__file__), "jee_questions.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")

def prettify_name(slug):
    if not slug:
        return "General"
    # Replace hyphens/underscores with spaces
    name = slug.replace("-", " ").replace("_", " ")
    # Capitalize words
    words = name.split()
    capitalized_words = []
    for w in words:
        # Prettify common short words
        if w.lower() in ["and", "or", "of", "in", "to", "with", "by", "for", "on", "at", "a", "an", "the"]:
            capitalized_words.append(w.lower())
        else:
            capitalized_words.append(w.capitalize())
    # Ensure first word is capitalized
    if capitalized_words:
        capitalized_words[0] = capitalized_words[0].capitalize()
    return " ".join(capitalized_words)

def clean_and_extract_ans(explanation):
    if not explanation:
        return None
    # Remove HTML tags
    text = re.sub(r'<[^<]+?>', ' ', explanation)
    # Remove final dollar signs and clean up whitespace
    text = text.replace('$', '').replace('\n', ' ').strip()
    
    # Try different regex patterns for the final answer
    match = re.search(r'(?:=\s*|is\s*|Total\s*=\s*|equal\s*to\s*|gives\s*|value\s*=\s*|ans\s*:\s*|answer\s*is\s*|value\s*is\s*)(-?\d+(?:\/\d+)?|-?\d+(?:\.\d+)?)[\s\.]*$', text, re.IGNORECASE)
    if match:
        val = match.group(1)
        # Avoid false matching for variable names with numbers like "a22"
        if not re.match(r'^[a-zA-Z]+\d+$', val):
            return val
        
    # Second pass: look for final equation block
    match_eq = re.search(r'=\s*(-?\d+(?:\/\d+)?|-?\d+(?:\.\d+)?)[\s]*$', text)
    if match_eq:
        return match_eq.group(1)
        
    # Third pass: look for any number near the end of the string (last 50 chars)
    last_part = text[-50:]
    numbers = re.findall(r'-?\d+(?:\.\d+)?', last_part)
    if numbers:
        return numbers[-1]
        
    return None

def build_database():
    print(f"Connecting to target SQLite database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    print("Reading and applying schema...")
    with open(SCHEMA_PATH, "r") as schema_file:
        schema_sql = schema_file.read()
    cursor.executescript(schema_sql)
    
    # 1. Insert standard Subjects
    print("Inserting subjects...")
    subjects_map = {
        "physics": 1,
        "chemistry": 2,
        "mathematics": 3
    }
    for sub_name, sub_id in subjects_map.items():
        cursor.execute("INSERT OR IGNORE INTO subjects (id, name) VALUES (?, ?);", (sub_id, sub_name.capitalize()))
    
    # Load original pickle database
    print("Loading pickle database (this might take a few seconds)...")
    db = DataBase()
    print("Pickle database loaded successfully!")
    
    # Store cache mappings to reduce DB queries
    exams_cache = {} # key: paperTitle, value: exam_id
    chapters_cache = {} # key: (subject_id, chapter_name_raw), value: chapter_id
    
    question_count = 0
    option_count = 0
    solution_count = 0
    
    print("Importing questions...")
    for chap_name_raw, chapter in db.chapters_dict.items():
        # Get subject ID
        sub_name_raw = chapter.parent_subject.lower().strip()
        subject_id = subjects_map.get(sub_name_raw)
        if not subject_id:
            # Fallback if subject not matched
            print(f"Warning: Subject {chapter.parent_subject} not recognized, skipping chapter.")
            continue
            
        # Get/Create Chapter ID
        chapter_name = prettify_name(chapter.name)
        chap_key = (subject_id, chapter_name)
        if chap_key not in chapters_cache:
            cursor.execute("SELECT id FROM chapters WHERE name = ? AND subject_id = ?;", (chapter_name, subject_id))
            row = cursor.fetchone()
            if row:
                chapter_id = row[0]
            else:
                cursor.execute("INSERT INTO chapters (subject_id, name) VALUES (?, ?);", (subject_id, chapter_name))
                chapter_id = cursor.lastrowid
            chapters_cache[chap_key] = chapter_id
        else:
            chapter_id = chapters_cache[chap_key]
            
        for q_id, q in chapter.question_dict.items():
            # Get/Create Exam ID
            exam_name = q.paperTitle.strip() if q.paperTitle else f"{q.exam.replace('-', ' ').title()} {q.year}"
            # Clean up double spaces or trailing periods
            exam_name = re.sub(r'\s+', ' ', exam_name).strip()
            
            if exam_name not in exams_cache:
                cursor.execute("SELECT id FROM exams WHERE name = ?;", (exam_name,))
                row = cursor.fetchone()
                if row:
                    exam_id = row[0]
                else:
                    exam_type = "Advanced" if "advanced" in q.exam.lower() else "Main"
                    duration = 180
                    # Standard JEE Advanced paper has ~54 questions, Main has 75 or 90
                    total_q = 54 if exam_type == "Advanced" else (75 if q.year >= 2021 else 90)
                    cursor.execute("""
                        INSERT INTO exams (name, year, type, duration_minutes, total_questions)
                        VALUES (?, ?, ?, ?, ?);
                    """, (exam_name, q.year, exam_type, duration, total_q))
                    exam_id = cursor.lastrowid
                exams_cache[exam_name] = exam_id
            else:
                exam_id = exams_cache[exam_name]
            
            # Map question type
            q_type = q.type.lower()
            if "single" in q_type or "mcq" in q_type:
                mapped_type = "single_choice"
            elif "multiple" in q_type or "msq" in q_type:
                mapped_type = "multiple_choice"
            else:
                mapped_type = "numerical"
                
            # Set marks
            marks_correct = 4
            marks_incorrect = -1 if mapped_type == "single_choice" else 0
            
            # Prettify difficulty
            difficulty = q.difficulty.strip().capitalize() if q.difficulty else "Medium"
            if difficulty not in ["Easy", "Medium", "Hard"]:
                difficulty = "Medium"
                
            # Insert Question
            cursor.execute("""
                INSERT INTO questions (exam_id, subject_id, chapter_id, question_text, type, difficulty, marks_correct, marks_incorrect)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                exam_id,
                subject_id,
                chapter_id,
                q.question,
                mapped_type,
                difficulty,
                marks_correct,
                marks_incorrect
            ))
            db_question_id = cursor.lastrowid
            question_count += 1
            
            # Insert Options
            if mapped_type in ["single_choice", "multiple_choice"] and q.options:
                for opt in q.options:
                    opt_content = opt.get("content", "").strip()
                    opt_identifier = opt.get("identifier", "")
                    is_correct = 1 if opt_identifier in q.correct_options else 0
                    
                    cursor.execute("""
                        INSERT INTO options (question_id, option_text, is_correct)
                        VALUES (?, ?, ?);
                    """, (db_question_id, opt_content, is_correct))
                    option_count += 1
            elif mapped_type == "numerical":
                # For numerical questions, extract answer from explanation and insert as a single correct option
                extracted_ans = clean_and_extract_ans(q.explanation)
                if extracted_ans:
                    cursor.execute("""
                        INSERT INTO options (question_id, option_text, is_correct)
                        VALUES (?, ?, ?);
                    """, (db_question_id, str(extracted_ans), 1))
                    option_count += 1
            
            # Insert Solution
            if q.explanation:
                cursor.execute("""
                    INSERT INTO solutions (question_id, explanation_text)
                    VALUES (?, ?);
                """, (db_question_id, q.explanation))
                solution_count += 1

            if question_count % 1000 == 0:
                print(f"  Processed {question_count} questions...")
                
    # Update total questions counts in exams table to match actual processed counts
    print("Updating exam question counts...")
    cursor.execute("SELECT id FROM exams;")
    exam_ids = [r[0] for r in cursor.fetchall()]
    for e_id in exam_ids:
        cursor.execute("SELECT COUNT(*) FROM questions WHERE exam_id = ?;", (e_id,))
        actual_q_count = cursor.fetchone()[0]
        cursor.execute("UPDATE exams SET total_questions = ? WHERE id = ?;", (actual_q_count, e_id))
        
    conn.commit()
    conn.close()
    
    print("\nDatabase conversion complete!")
    print(f"Total exams imported: {len(exams_cache)}")
    print(f"Total chapters configured: {len(chapters_cache)}")
    print(f"Total questions loaded: {question_count}")
    print(f"Total options created: {option_count}")
    print(f"Total solutions attached: {solution_count}")

if __name__ == "__main__":
    build_database()
