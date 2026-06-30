import sqlite3
import json
import re

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

# Map sqlite subject_id to string
cursor.execute("SELECT id, name FROM subjects;")
sub_map = {row[0]: row[1] for row in cursor.fetchall()}

# Map sqlite chapter_id to string
cursor.execute("SELECT id, name FROM chapters;")
chap_map = {row[0]: row[1] for row in cursor.fetchall()}

# Fetch all exams
cursor.execute("SELECT id, name, year, type, duration_minutes, total_questions FROM exams;")
exams = cursor.fetchall()

def clean_html(text):
    if not text:
        return ""
    # clean up basic html wrappers if present like <p> ... </p>
    t = re.sub(r'^<p>(.*?)</p>$', r'\1', text.strip(), flags=re.DOTALL)
    t = t.replace('<br/>', ' ').replace('<br>', ' ').replace('&nbsp;', ' ')
    return t.strip()

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    extracted_papers = json.load(f)

print(f"Starting synchronization of {len(extracted_papers)} JSON papers with SQLite database...")

updated_papers_count = 0
updated_questions_count = 0

for paper_id, paper in extracted_papers.items():
    p_title = paper.get('title', '')
    p_year = paper.get('year')
    p_shift = paper.get('shift', '')
    
    # Try finding best matching exam in SQLite DB
    best_exam_id = None
    
    # Matching rules
    for e in exams:
        e_id, e_name, e_year, e_type, e_dur, e_tq = e
        if e_year == p_year:
            # check shift match
            e_lower = e_name.lower()
            p_lower = (p_title + " " + p_shift).lower()
            
            # Extract day/date if possible (e.g. 27th january, 22nd january, 1st february)
            m_date = re.search(r'(\d+)\s*(jan|feb|mar|apr)', p_lower)
            if m_date:
                day, month = m_date.group(1), m_date.group(2)
                if not (day in e_lower and month in e_lower):
                    continue
            
            if ('shift 1' in p_lower or 'morning' in p_lower) and ('morning' in e_lower or 'shift 1' in e_lower or '1st shift' in e_lower):
                best_exam_id = e_id
                break
            elif ('shift 2' in p_lower or 'evening' in p_lower) and ('evening' in e_lower or 'shift 2' in e_lower or '2nd shift' in e_lower):
                best_exam_id = e_id
                break
            elif 'online' in e_lower and not ('shift' in e_lower or 'morning' in e_lower or 'evening' in e_lower):
                best_exam_id = e_id
                
    if not best_exam_id:
        # Fallback to year match if only one exam for that year
        year_exams = [e for e in exams if e[2] == p_year]
        if len(year_exams) == 1:
            best_exam_id = year_exams[0][0]
            
    if best_exam_id:
        # Fetch questions from sqlite for this exam
        cursor.execute("""
            SELECT q.id, q.question_text, q.type, q.difficulty, q.subject_id, q.chapter_id
            FROM questions q
            WHERE q.exam_id = ?
            ORDER BY q.id ASC;
        """, (best_exam_id,))
        db_questions = cursor.fetchall()
        
        if db_questions:
            updated_papers_count += 1
            new_q_list = []
            for idx, q_row in enumerate(db_questions):
                q_id, q_text, q_type, q_diff, sub_id, chap_id = q_row
                q_num = idx + 1
                
                # Fetch options
                cursor.execute("SELECT option_text, is_correct FROM options WHERE question_id = ? ORDER BY id ASC;", (q_id,))
                opts_rows = cursor.fetchall()
                
                options_list = [clean_html(o[0]) for o in opts_rows] if opts_rows else None
                correct_ans = "A"
                for o_idx, o in enumerate(opts_rows):
                    if o[1] == 1:
                        correct_ans = chr(65 + o_idx)
                        break
                        
                # Fetch solution
                cursor.execute("SELECT explanation_text FROM solutions WHERE question_id = ?;", (q_id,))
                sol_row = cursor.fetchone()
                solution_text = clean_html(sol_row[0]) if sol_row else f"Official Answer Key: {correct_ans}."
                
                sub_name = sub_map.get(sub_id, "Physics" if q_num <= 30 else "Chemistry" if q_num <= 60 else "Mathematics")
                chap_name = chap_map.get(chap_id, f"Official {sub_name} PYQ")
                
                formatted_type = "Numerical" if q_type in ['numerical', 'integer'] or not options_list else "MCQ"
                
                new_q_list.append({
                    "id": f"{paper_id}-q-{q_num}",
                    "questionNumber": q_num,
                    "subject": sub_name,
                    "chapter": chap_name,
                    "type": formatted_type,
                    "difficulty": q_diff or "Medium",
                    "statement": clean_html(q_text),
                    "options": options_list if formatted_type == "MCQ" else None,
                    "correctAnswer": correct_ans if formatted_type == "MCQ" else "10",
                    "solution": solution_text,
                    "explanation": f"Official Answer Key: {correct_ans}.",
                    "concept": f"JEE Main {p_year} Official Question",
                    "markingScheme": {"positive": 4, "negative": 0 if formatted_type == "Numerical" else 1}
                })
                updated_questions_count += 1
                
            paper['questions'] = new_q_list

with open('src/data/officialJeeExtractedPapers.json', 'w', encoding='utf-8') as f:
    json.dump(extracted_papers, f, indent=2, ensure_ascii=False)

print(f"SUCCESSFULLY synchronized {updated_papers_count} papers and {updated_questions_count} clean LaTeX questions into officialJeeExtractedPapers.json!")
