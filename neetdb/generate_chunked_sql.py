import sqlite3
import os
import json

def export_chunked_sql():
    db_path = os.path.join(os.path.dirname(__file__), "neet_questions.db")
    output_dir = os.path.join(os.path.dirname(__file__), "sql_chunks")
    os.makedirs(output_dir, exist_ok=True)

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
    total = len(rows)
    chunk_size = 5000

    print(f"[STEP 1] Exporting {total} questions into {chunk_size}-row SQL chunks...")

    for i in range(0, total, chunk_size):
        chunk_rows = rows[i:i+chunk_size]
        chunk_idx = (i // chunk_size) + 1
        chunk_file = os.path.join(output_dir, f"neet_questions_part_{chunk_idx}.sql")

        with open(chunk_file, "w", encoding="utf-8") as f:
            f.write(f"-- NEET Questions Chunk Part {chunk_idx} ({i+1} to {min(i+chunk_size, total)})\n")
            f.write("INSERT INTO public.questions (subject, chapter, type, difficulty, statement, options, \"correctAnswer\", solution, explanation, concept, \"markingScheme\") VALUES\n")

            insert_values = []
            for row in chunk_rows:
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

        print(f"  Exported Part {chunk_idx} ({len(chunk_rows)} rows) -> {chunk_file}")

    conn.close()
    print(f"\n[SUCCESS] Successfully generated chunked SQL files in {output_dir}")

if __name__ == "__main__":
    export_chunked_sql()
