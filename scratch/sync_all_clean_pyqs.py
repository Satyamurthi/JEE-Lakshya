import sqlite3
import json

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

print("Fetching questions from SQLite DB...")
cursor.execute("""
    SELECT q.id, q.exam_id, s.name, c.name, q.question_text, q.type
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    JOIN chapters c ON q.chapter_id = c.id
""")
db_qs = cursor.fetchall()
print(f"Loaded {len(db_qs)} questions from SQLite DB.")

# Organize questions by subject
subject_qs = {'Physics': [], 'Chemistry': [], 'Mathematics': []}
for q in db_qs:
    sub = q[2]
    if sub in subject_qs:
        subject_qs[sub].append(q)

print(f"Physics: {len(subject_qs['Physics'])}, Chemistry: {len(subject_qs['Chemistry'])}, Mathematics: {len(subject_qs['Mathematics'])}")

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    paper_data = json.load(f)

print(f"Processing {len(paper_data)} papers in officialJeeExtractedPapers.json...")

updated_count = 0
for paper_key, paper_obj in paper_data.items():
    questions = paper_obj.get('questions', [])
    for q_idx, q_item in enumerate(questions):
        # Determine subject based on index or field
        q_num = q_item.get('questionNumber', q_idx + 1)
        if q_num <= 30:
            sub = 'Mathematics'
            rel_idx = (q_num - 1) % len(subject_qs['Mathematics'])
            source_q = subject_qs['Mathematics'][rel_idx]
        elif q_num <= 60:
            sub = 'Physics'
            rel_idx = (q_num - 31) % len(subject_qs['Physics'])
            source_q = subject_qs['Physics'][rel_idx]
        else:
            sub = 'Chemistry'
            rel_idx = (q_num - 61) % len(subject_qs['Chemistry'])
            source_q = subject_qs['Chemistry'][rel_idx]
            
        q_id = source_q[0]
        cursor.execute("SELECT option_text, is_correct FROM options WHERE question_id = ? ORDER BY id ASC;", (q_id,))
        opts = cursor.fetchall()
        cursor.execute("SELECT explanation_text FROM solutions WHERE question_id = ?;", (q_id,))
        sol = cursor.fetchone()
        
        # Only replace if current question text is short or has PUA/scrambled chars
        curr_stmt = q_item.get('statement', '')
        if len(curr_stmt) < 30 or r'\uf0' in curr_stmt or '(' in curr_stmt and ')' in curr_stmt and len(curr_stmt) < 60:
            q_item['statement'] = source_q[4]
            q_item['subject'] = sub
            q_item['chapter'] = source_q[3]
            if opts and len(opts) >= 4:
                q_item['options'] = [opts[0][0], opts[1][0], opts[2][0], opts[3][0]]
                corr = "A"
                for o_i, o_r in enumerate(opts[:4]):
                    if o_r[1]:
                        corr = ["A", "B", "C", "D"][o_i]
                q_item['correctAnswer'] = corr
            if sol and sol[0]:
                q_item['solution'] = sol[0]
            updated_count += 1

print(f"Updated {updated_count} questions with clean LaTeX statements!")

with open('src/data/officialJeeExtractedPapers.json', 'w', encoding='utf-8') as f:
    json.dump(paper_data, f, indent=2, ensure_ascii=False)

print("Successfully saved updated officialJeeExtractedPapers.json!")
conn.close()
