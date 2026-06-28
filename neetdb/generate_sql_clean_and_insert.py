import sqlite3
import os
import json

def generate_sql():
    db_path = os.path.join(os.path.dirname(__file__), "neet_questions.db")
    sql_out = os.path.join(os.path.dirname(__file__), "clean_and_insert_neet_questions.sql")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT q.id, q.question_text, q.type, q.difficulty, q.marks_correct, q.marks_incorrect,
               s.name as subject_name, c.name as chapter_name
        FROM questions q
        JOIN subjects s ON q.subject_id = s.id
        JOIN chapters c ON q.chapter_id = c.id;
    """)
    rows = cursor.fetchall()

    with open(sql_out, "w", encoding="utf-8") as f:
        f.write("-- ========================================================\n")
        f.write("-- 🧹 1. CLEAR OLD QUESTIONS FROM NEET SUPABASE DATABASE\n")
        f.write("-- ========================================================\n")
        f.write("DELETE FROM public.questions;\n\n")

        f.write("-- ========================================================\n")
        f.write("-- 🚀 2. UPLOAD FRESH NEET 8-YEAR PYQS & SUBJECT QUESTIONS\n")
        f.write("-- ========================================================\n")
        f.write("INSERT INTO public.questions (subject, chapter, type, difficulty, statement, options, \"correctAnswer\", solution, explanation, concept, \"markingScheme\") VALUES\n")

        insert_values = []
        for row in rows:
            q_id, q_text, q_type, q_diff, marks_c, marks_i, sub_name, chap_name = row
            
            cursor.execute("SELECT option_text, is_correct FROM options WHERE question_id = ? ORDER BY id ASC;", (q_id,))
            db_options = cursor.fetchall()
            
            cursor.execute("SELECT explanation_text FROM solutions WHERE question_id = ?;", (q_id,))
            sol_row = cursor.fetchone()
            explanation = sol_row[0] if sol_row else "Detailed NCERT explanation."
            
            options_dict = {}
            correct_answer = "A"
            identifiers = ["A", "B", "C", "D"]
            
            for opt_idx, opt_row in enumerate(db_options[:4]):
                opt_text, is_corr = opt_row
                ident = identifiers[opt_idx]
                options_dict[ident] = opt_text
                if is_corr:
                    correct_answer = ident
            
            # Escape single quotes for SQL
            def esc(text):
                return str(text).replace("'", "''")

            opts_json = esc(json.dumps(options_dict))
            stmt_esc = esc(q_text)
            sol_esc = esc(explanation)
            sub_esc = esc(sub_name)
            chap_esc = esc(chap_name)
            diff_esc = esc(q_diff)
            corr_esc = esc(correct_answer)

            val_str = f"('{sub_esc}', '{chap_esc}', 'MCQ', '{diff_esc}', '{stmt_esc}', '{opts_json}'::jsonb, '{corr_esc}', '{sol_esc}', '{sol_esc}', '{chap_esc}', '{{\"positive\": {marks_c}, \"negative\": {abs(marks_i)}}}'::jsonb)"
            insert_values.append(val_str)

        f.write(",\n".join(insert_values) + ";\n")

    conn.close()
    print(f"[SUCCESS] Generated SQL file at {sql_out}")

if __name__ == "__main__":
    generate_sql()
