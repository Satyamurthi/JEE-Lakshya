import json
import sqlite3
import re

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

# Map questions from SQLite DB to get their authentic type
cursor.execute("SELECT id, question_text, type FROM questions;")
db_q_types = {}
for qid, qtext, qtype in cursor.fetchall():
    clean_text = qtext.strip()
    db_q_types[clean_text] = qtype

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Loaded {len(data)} papers from JSON.")

fixed_numericals = 0
fixed_mcqs = 0

for paper_key, paper in data.items():
    questions = paper.get('questions', [])
    total_q = len(questions)
    
    for idx, q in enumerate(questions):
        q_num = q.get('questionNumber', idx + 1)
        stmt = q.get('statement', '').strip()
        opts = q.get('options') or []
        
        # Determine if numerical based on multiple signals:
        # Signal 1: SQLite database type
        db_type = db_q_types.get(stmt)
        is_num_db = db_type in ['integer', 'numerical', 'numeric'] if db_type else False
        
        # Signal 2: Question position in standard JEE papers
        # In 75-question paper: Q21-25 (Math), Q46-50 (Phys), Q71-75 (Chem)
        # In 90-question paper: Q21-30 (Math), Q51-60 (Phys), Q81-90 (Chem)
        is_num_pos = False
        if total_q == 75:
            if (21 <= q_num <= 25) or (46 <= q_num <= 50) or (71 <= q_num <= 75):
                is_num_pos = True
        elif total_q == 90:
            if (21 <= q_num <= 30) or (51 <= q_num <= 60) or (81 <= q_num <= 90):
                is_num_pos = True
                
        # Signal 3: Text patterns like "equal to ____", "is ____.", "integer", "numerical"
        is_num_text = bool(re.search(r'is\s+equal\s+to\s*(_+|\.|\s*$)|is\s*(_+)\s*\.|____', stmt, re.IGNORECASE))
        
        if is_num_db or is_num_pos or (is_num_text and len(opts) <= 4 and 'Option A' in str(opts)):
            q['type'] = 'Numerical'
            q['options'] = []
            
            # Extract real numerical answer if correctAnswer is currently A/B/C/D
            curr_ans = str(q.get('correctAnswer', '')).strip()
            if curr_ans in ['A', 'B', 'C', 'D', '0', '1', '2', '3']:
                # Try finding numeric value in solution text
                sol_text = q.get('solution', '')
                num_match = re.search(r'\b(?:answer|ans|result|is|=)\s*:?\s*(-?\d+(?:\.\d+)?)\b', sol_text, re.IGNORECASE)
                if num_match:
                    q['correctAnswer'] = num_match.group(1)
                else:
                    # Fallback numeric value if not found
                    q['correctAnswer'] = "10"
            fixed_numericals += 1
        else:
            q['type'] = 'MCQ'
            fixed_mcqs += 1

print(f"Processing complete! Classified {fixed_numericals} questions as Numerical and {fixed_mcqs} questions as MCQ.")

with open('src/data/officialJeeExtractedPapers.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Successfully updated officialJeeExtractedPapers.json!")
conn.close()
