import sqlite3
import json
import os

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    extracted_papers = json.load(f)

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

cursor.execute("SELECT id, name, year, type, total_questions FROM exams;")
db_exams = cursor.fetchall()

print(f"JSON paper count: {len(extracted_papers)}")
print(f"SQLite exam count: {len(db_exams)}")

# Check matching names / years
matched = 0
for paper_id, paper in extracted_papers.items():
    p_title = paper.get('title', '').lower()
    p_year = paper.get('year')
    # try finding in sqlite
    found = False
    for e in db_exams:
        e_id, e_name, e_year, e_type, e_tq = e
        if str(e_year) == str(p_year):
            # check similarity
            e_clean = e_name.lower().replace('online', '').replace('st', '').replace('nd', '').replace('rd', '').replace('th', '').strip()
            if ('shift 1' in p_title and ('morning' in e_clean or 'shift 1' in e_clean or '27th january morning' in e_clean)) or \
               ('shift 2' in p_title and ('evening' in e_clean or 'shift 2' in e_clean)):
                found = True
                matched += 1
                break

print(f"Matched papers between JSON and SQLite DB: {matched}")
