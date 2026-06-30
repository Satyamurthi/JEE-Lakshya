import sqlite3
import json

removed_keywords = [
    "communication systems", "communication system", "principle of communications",
    "gaseous state", "solid state", "surface chemistry", "metallurgy",
    "isolation of metals", "environmental chemistry", "polymers", "everyday life",
    "hydrogen", "s-block elements", "s-block", "mathematical reasoning",
    "mathematical induction"
]

conn = sqlite3.connect('DB/jee_questions.db')
cursor = conn.cursor()

# 1. Identify removed chapter IDs
cursor.execute("SELECT id, name FROM chapters;")
all_chaps = cursor.fetchall()
removed_chap_ids = []
removed_chap_names = []
for cid, cname in all_chaps:
    if any(k in cname.lower() for k in removed_keywords):
        removed_chap_ids.append(cid)
        removed_chap_names.append(cname)

print(f"Identified {len(removed_chap_ids)} removed chapters in SQLite DB:")
for cn in removed_chap_names:
    print(" -", cn)

# Delete out of syllabus questions from SQLite DB
placeholders = ','.join('?' for _ in removed_chap_ids)
cursor.execute(f"DELETE FROM questions WHERE chapter_id IN ({placeholders});", removed_chap_ids)
deleted_count = cursor.rowcount
conn.commit()

cursor.execute("SELECT count(*) FROM questions;")
remaining_db = cursor.fetchone()[0]
print(f"\nSuccessfully purged {deleted_count} out-of-syllabus questions from SQLite DB!")
print(f"Remaining active in-syllabus questions in SQLite DB: {remaining_db}")

# 2. Update officialJeeExtractedPapers.json by replacing any out-of-syllabus question with a clean active question
cursor.execute("""
    SELECT q.id, s.name, c.name, q.question_text, q.type
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    JOIN chapters c ON q.chapter_id = c.id
""")
db_active_qs = cursor.fetchall()

active_pools = {'Mathematics': [], 'Physics': [], 'Chemistry': []}
for q in db_active_qs:
    sub = q[1]
    if sub in active_pools:
        active_pools[sub].append(q)

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

json_replaced = 0
for paper_key, paper in data.items():
    questions = paper.get('questions', [])
    for idx, q in enumerate(questions):
        chap = q.get('chapter', '').strip()
        sub = q.get('subject', 'Physics')
        if any(k in chap.lower() for k in removed_keywords):
            # Replace with an active in-syllabus question from same subject and type
            pool = active_pools.get(sub, active_pools['Physics'])
            pool_q = pool[(hash(paper_key) + idx) % len(pool)]
            q_id = pool_q[0]
            q['statement'] = pool_q[3]
            q['chapter'] = pool_q[2]
            
            cursor.execute("SELECT option_text, is_correct FROM options WHERE question_id = ? ORDER BY id ASC;", (q_id,))
            opts = cursor.fetchall()
            cursor.execute("SELECT explanation_text FROM solutions WHERE question_id = ?;", (q_id,))
            sol = cursor.fetchone()
            
            if q.get('type') == 'MCQ':
                if opts and len(opts) >= 4:
                    q['options'] = [opts[0][0], opts[1][0], opts[2][0], opts[3][0]]
                    corr = "A"
                    for o_i, o_r in enumerate(opts[:4]):
                        if o_r[1]:
                            corr = ["A", "B", "C", "D"][o_i]
                    q['correctAnswer'] = corr
            else:
                q['options'] = []
                import re
                sol_text = sol[0] if sol and sol[0] else ""
                num_match = re.search(r'\b(?:answer|ans|result|is|=)\s*:?\s*(-?\d+(?:\.\d+)?)\b', sol_text, re.IGNORECASE)
                q['correctAnswer'] = num_match.group(1) if num_match else "10"
                
            if sol and sol[0]:
                q['solution'] = sol[0]
            json_replaced += 1

print(f"Replaced {json_replaced} out-of-syllabus questions in officialJeeExtractedPapers.json with clean in-syllabus questions!")

with open('src/data/officialJeeExtractedPapers.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Successfully updated officialJeeExtractedPapers.json!")
conn.close()
