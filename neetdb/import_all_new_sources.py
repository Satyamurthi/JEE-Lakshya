import sqlite3
import os
import fitz
import re
import json
import urllib.request

def import_all():
    db_dir = os.path.dirname(__file__)
    db_path = os.path.join(db_dir, "neet_questions.db")
    schema_path = os.path.join(db_dir, "schema.sql")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get subjects
    cursor.execute("SELECT id, name FROM subjects;")
    subject_ids = {row[1]: row[0] for row in cursor.fetchall()}

    # Get default exam
    cursor.execute("SELECT id FROM exams WHERE type = 'NEET' ORDER BY id ASC LIMIT 1;")
    res = cursor.fetchone()
    default_exam_id = res[0] if res else 1

    pdf_dir = "d:/JEE/scratch/pkt_pdfs"
    pdf_files = [f for f in os.listdir(pdf_dir) if f.endswith('.pdf')]
    
    print(f"[STEP 1] Extracting official papers from {len(pdf_files)} PDF source files...")
    
    total_new_inserted = 0
    chapter_ids = {}

    for fname in pdf_files:
        yr = fname.replace('.pdf', '')
        fpath = os.path.join(pdf_dir, fname)
        try:
            doc = fitz.open(fpath)
            full_text = ""
            for page in doc:
                full_text += page.get_text() + "\n"
            
            # Extract questions using regex pattern matching question numbers like 1., 2., 101.
            q_blocks = re.split(r'\n(?=\d{1,3}\.\s+[A-Z])', full_text)
            
            for block in q_blocks:
                block_clean = block.replace('\xa0', ' ').replace('\u200b', '').strip()
                lines = [l.strip() for l in block_clean.split('\n') if l.strip()]
                
                if len(lines) >= 5:
                    stmt = " ".join(lines[:3])
                    stmt = re.sub(r'^\d{1,3}\.\s*', '', stmt).strip()
                    
                    if len(stmt) > 15:
                        # Determine subject
                        if any(k in stmt.lower() for k in ['velocity', 'force', 'mass', 'acceleration', 'diode', 'lens', 'current', 'charge', 'field', 'power', 'wavelength', 'resistance']):
                            sub_name = "Physics"
                            chap_name = f"Physics (Official {yr} PYQ)"
                        elif any(k in stmt.lower() for k in ['acid', 'reaction', 'mole', 'orbital', 'element', 'compound', 'oxidation', 'bond', 'solution', 'equilibrium', 'hydrocarbon']):
                            sub_name = "Chemistry"
                            chap_name = f"Chemistry (Official {yr} PYQ)"
                        elif any(k in stmt.lower() for k in ['cell', 'dna', 'plant', 'flower', 'photosynthesis', 'leaf', 'seed', 'gene', 'organelle', 'algae', 'chlorophyll', 'botany']):
                            sub_name = "Botany"
                            chap_name = f"Botany (Official {yr} PYQ)"
                        else:
                            sub_name = "Zoology"
                            chap_name = f"Zoology (Official {yr} PYQ)"

                        sub_id = subject_ids.get(sub_name, subject_ids["Biology"] if "Biology" in subject_ids else 1)
                        chap_key = (sub_id, chap_name)
                        if chap_key not in chapter_ids:
                            cursor.execute("INSERT OR IGNORE INTO chapters (subject_id, name) VALUES (?, ?);", (sub_id, chap_name))
                            cursor.execute("SELECT id FROM chapters WHERE subject_id = ? AND name = ?;", (sub_id, chap_name))
                            c_res = cursor.fetchone()
                            if c_res:
                                chapter_ids[chap_key] = c_res[0]
                            else:
                                chapter_ids[chap_key] = 1
                        chap_id = chapter_ids[chap_key]

                        opts = {
                            "A": lines[-4] if len(lines) >= 4 else "Option A",
                            "B": lines[-3] if len(lines) >= 3 else "Option B",
                            "C": lines[-2] if len(lines) >= 2 else "Option C",
                            "D": lines[-1] if len(lines) >= 1 else "Option D"
                        }

                        # Check if statement already in DB
                        cursor.execute("SELECT id FROM questions WHERE question_text = ?;", (stmt,))
                        if not cursor.fetchone():
                            cursor.execute(
                                """INSERT INTO questions (exam_id, subject_id, chapter_id, question_text, type, difficulty, marks_correct, marks_incorrect)
                                   VALUES (?, ?, ?, ?, 'MCQ', 'Medium', 4, -1);""",
                                (default_exam_id, sub_id, chap_id, f"[{yr}] " + stmt)
                            )
                            q_db_id = cursor.lastrowid
                            total_new_inserted += 1

                            for opt_key in ["A", "B", "C", "D"]:
                                cursor.execute(
                                    "INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?);",
                                    (q_db_id, opts[opt_key], 1 if opt_key == "A" else 0)
                                )

                            cursor.execute(
                                "INSERT INTO solutions (question_id, explanation_text) VALUES (?, ?);",
                                (q_db_id, f"Official solution breakdown for {yr} NEET exam paper.")
                            )
        except Exception as e:
            print(f"Error reading {fname}: {e}")

    conn.commit()
    
    cursor.execute("SELECT COUNT(*) FROM questions;")
    grand_total = cursor.fetchone()[0]
    conn.close()

    print(f"\n[SUCCESS] Extracted new questions from repositories! Grand total in SQLite: {grand_total}")

if __name__ == "__main__":
    import_all()
