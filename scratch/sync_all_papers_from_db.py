import sqlite3
import json
import re

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

cursor.execute("SELECT id, title, exam_code, year, shift FROM exams;")
db_exams = cursor.fetchall()
print(f"Loaded {len(db_exams)} exams from SQLite DB.")

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    json_data = json.load(f)

print(f"Loaded {len(json_data)} papers from officialJeeExtractedPapers.json.")

matched = 0
for paper_key, paper_obj in json_data.items():
    p_year = str(paper_obj.get('year', ''))
    p_shift = paper_obj.get('shift', '').lower()
    
    # Try matching with SQLite exams
    best_exam_id = None
    for e_id, e_title, e_code, e_year, e_shift in db_exams:
        if str(e_year) == p_year:
            # Check date or shift matching
            e_str = f"{e_title} {e_shift}".lower()
            # extract day e.g. 28, 29, 27, 07, etc.
            day_match = re.search(r'\b(\d{1,2})\b', p_shift)
            if day_match:
                day = day_match.group(1).zfill(2)
                if day in e_str or day_match.group(1) in e_str:
                    best_exam_id = e_id
                    break
    
    if best_exam_id:
        matched += 1

print(f"Matched {matched}/{len(json_data)} JSON papers directly with SQLite DB exams.")
conn.close()
