import os
import json
import sqlite3
import sys

# Try to import pdf libraries, print error if not available but don't crash immediately
try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

DB_PATH = os.path.join(os.path.dirname(__file__), "jee_questions.db")

SYSTEM_PROMPT = """
You are an expert AI parser specialized in Indian competitive exams like JEE Main and JEE Advanced.
Your task is to take raw text extracted from a JEE Question Paper PDF and convert it into a structured JSON database format.

You must follow these strict rules:
1. Extract ALL questions from the text.
2. For each question, identify:
   - "subject": Must be one of "Physics", "Chemistry", or "Mathematics".
   - "chapter": The relevant chapter name (e.g., "Electrostatics", "Integral Calculus", "Chemical Bonding", "Modern Physics", "Kinematics", etc.).
   - "question_text": The full question text. You MUST format all mathematical and chemical equations in valid LaTeX notation enclosed in $ (inline) or $$ (block). Example: $\\int_0^{\\pi} \\sin(x) dx$, $\\vec{F} = q(\\vec{E} + \\vec{v} \\times \\vec{B})$, $\\text{H}_2\\text{SO}_4$.
   - "type": Choose from "single_choice" (MCQ), "multiple_choice" (MSQ), or "numerical" (NAT).
   - "difficulty": Estimate as "Easy", "Medium", or "Hard".
   - "marks_correct": Default to 4.
   - "marks_incorrect": Default to -1 (for single_choice) or 0 (for numerical).
   - "options": An array of objects for choice questions. Each object has "text" (in LaTeX if needed) and "is_correct" (boolean: true/false). For numerical questions, this array should be empty.
   - "explanation": A detailed, step-by-step solution to the question, also formatting formulas in LaTeX.
3. Return ONLY a valid JSON array of questions. Do not include markdown wraps like ```json ... ```.

Example JSON output structure:
[
  {
    "subject": "Mathematics",
    "chapter": "Integral Calculus",
    "question_text": "The value of the integral $\\\\int_{0}^{1} x(1-x)^n dx$ is:",
    "type": "single_choice",
    "difficulty": "Easy",
    "marks_correct": 4,
    "marks_incorrect": -1,
    "options": [
      {"text": "$\\\\frac{1}{(n+1)(n+2)}$", "is_correct": true},
      {"text": "$\\\\frac{1}{n+1}$", "is_correct": false},
      {"text": "$\\\\frac{1}{n+2}$", "is_correct": false},
      {"text": "$\\\\frac{1}{(n+1)^2}$", "is_correct": false}
    ],
    "explanation": "Using beta function or substitution $u = 1-x$..."
  }
]
"""

def extract_text_from_pdf(pdf_path):
    if not pypdf:
        print("Error: 'pypdf' package is not installed. Run 'pip install pypdf' to enable PDF reading.")
        return None
    
    if not os.path.exists(pdf_path):
        print(f"Error: File not found at {pdf_path}")
        return None

    print(f"Reading PDF from {pdf_path}...")
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    for idx, page in enumerate(reader.pages):
        page_text = page.extract_text()
        if page_text:
            text += f"\n--- Page {idx+1} ---\n" + page_text
            
    print(f"Extracted {len(text)} characters of text from PDF.")
    return text

def parse_with_gemini(text, api_key):
    if not genai:
        print("Error: 'google-generativeai' package is not installed. Run 'pip install google-generativeai' to enable AI parsing.")
        return None

    print("Configuring Gemini API...")
    genai.configure(api_key=api_key)
    
    # We will use gemini-1.5-flash or gemini-2.5-flash as it is efficient and handles large texts
    # In mid-2026, gemini-1.5-flash is standard and widely available. Let's use gemini-1.5-flash.
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=SYSTEM_PROMPT
    )
    
    print("Sending text to Gemini for parsing (this might take a minute)...")
    try:
        response = model.generate_content(
            f"Here is the raw text of the question paper:\n\n{text}",
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return None

def insert_parsed_questions(questions, exam_id):
    if not questions:
        print("No questions to insert.")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")

    # Check if exam exists
    cursor.execute("SELECT id FROM exams WHERE id = ?;", (exam_id,))
    exam = cursor.fetchone()
    if not exam:
        print(f"Error: Exam with ID {exam_id} does not exist in the database.")
        conn.close()
        return False

    success_count = 0
    
    for q in questions:
        try:
            # 1. Subject ID
            subject_name = q.get("subject", "Physics")
            cursor.execute("SELECT id FROM subjects WHERE name = ? COLLATE NOCASE;", (subject_name,))
            sub_row = cursor.fetchone()
            if not sub_row:
                # Insert subject if missing
                cursor.execute("INSERT INTO subjects (name) VALUES (?);", (subject_name,))
                subject_id = cursor.lastrowid
            else:
                subject_id = sub_row[0]

            # 2. Chapter ID
            chapter_name = q.get("chapter", "General")
            cursor.execute("SELECT id FROM chapters WHERE name = ? COLLATE NOCASE AND subject_id = ?;", (chapter_name, subject_id))
            chap_row = cursor.fetchone()
            if not chap_row:
                # Insert chapter if missing
                cursor.execute("INSERT INTO chapters (subject_id, name) VALUES (?, ?);", (subject_id, chapter_name))
                chapter_id = cursor.lastrowid
            else:
                chapter_id = chap_row[0]

            # 3. Insert Question
            cursor.execute("""
                INSERT INTO questions (exam_id, subject_id, chapter_id, question_text, type, difficulty, marks_correct, marks_incorrect)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                exam_id,
                subject_id,
                chapter_id,
                q.get("question_text"),
                q.get("type", "single_choice"),
                q.get("difficulty", "Medium"),
                q.get("marks_correct", 4),
                q.get("marks_incorrect", -1)
            ))
            question_id = cursor.lastrowid

            # 4. Insert Options if MCQ
            options = q.get("options", [])
            if options and q.get("type") in ["single_choice", "multiple_choice"]:
                for opt in options:
                    cursor.execute("""
                        INSERT INTO options (question_id, option_text, is_correct)
                        VALUES (?, ?, ?);
                    """, (question_id, opt.get("text"), 1 if opt.get("is_correct") else 0))

            # 5. Insert Solution/Explanation
            explanation = q.get("explanation")
            if explanation:
                cursor.execute("""
                    INSERT INTO solutions (question_id, explanation_text)
                    VALUES (?, ?);
                """, (question_id, explanation))

            success_count += 1
        except Exception as ex:
            print(f"Skipping question due to error: {ex}")
            continue

    conn.commit()
    conn.close()
    print(f"Successfully imported {success_count} questions into the database under Exam ID {exam_id}.")
    return True

def run_pipeline(pdf_path, exam_id, api_key=None):
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        print("\n=== WARNING: GEMINI_API_KEY NOT SET ===")
        print("The script is running in SIMULATION/DEMO mode.")
        print("To run actual parsing, set the environment variable:")
        print("  Windows (PowerShell): $env:GEMINI_API_KEY=\"your_key_here\"")
        print("  Windows (CMD): set GEMINI_API_KEY=your_key_here")
        print("=======================================\n")
        
        # Simulate parsing with some high quality math questions
        print("Simulating parsing with high quality demo questions...")
        demo_questions = [
            {
                "subject": "Physics",
                "chapter": "Electrostatics & Gauss Law",
                "question_text": "A charge $q$ is placed at the center of the open cylindrical vessel of radius $R$ and height $H$. The flux of the electric field through the surface of the vessel is:",
                "type": "single_choice",
                "difficulty": "Hard",
                "marks_correct": 4,
                "marks_incorrect": -1,
                "options": [
                    {"text": "$\\frac{q}{2\\varepsilon_0}$", "is_correct": True},
                    {"text": "$\\frac{q}{\\varepsilon_0}$", "is_correct": False},
                    {"text": "Zero", "is_correct": False},
                    {"text": "$\\frac{q}{4\\varepsilon_0}$", "is_correct": False}
                ],
                "explanation": "Consider a closed cylinder of length $2H$ formed by placing an identical cylinder on top. The charge is now at the center of this closed cylinder. By Gauss Law, total flux is $q/\\varepsilon_0$. By symmetry, the flux through the bottom open cylinder is half of the total flux: $\\Phi = \\frac{q}{2\\varepsilon_0}$."
            },
            {
                "subject": "Mathematics",
                "chapter": "Matrices & Determinants",
                "question_text": "If $A = \\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}$, then the value of $A^2 - 5A - 2I$ is equal to:",
                "type": "single_choice",
                "difficulty": "Easy",
                "marks_correct": 4,
                "marks_incorrect": -1,
                "options": [
                    {"text": "$\\mathbf{0}$ (Zero Matrix)", "is_correct": True},
                    {"text": "$I$", "is_correct": False},
                    {"text": "$2I$", "is_correct": False},
                    {"text": "$A$", "is_correct": False}
                ],
                "explanation": "By Cayley-Hamilton Theorem, every square matrix satisfies its characteristic equation. \nFor $A$, $\\det(A - \\lambda I) = 0 \\implies (1-\\lambda)(4-\\lambda) - 6 = 0 \\implies \\lambda^2 - 5\\lambda - 2 = 0$. \nReplacing $\\lambda$ by $A$, we get $A^2 - 5A - 2I = \\mathbf{0}$."
            }
        ]
        insert_parsed_questions(demo_questions, exam_id)
        return True

    raw_text = extract_text_from_pdf(pdf_path)
    if not raw_text:
        return False

    parsed_questions = parse_with_gemini(raw_text, api_key)
    if not parsed_questions:
        print("Failed to parse questions using Gemini.")
        return False

    return insert_parsed_questions(parsed_questions, exam_id)

if __name__ == "__main__":
    # Example usage: python pdf_parser.py exam_paper.pdf 1
    if len(sys.argv) < 3:
        print("Usage: python pdf_parser.py <path_to_pdf> <exam_id>")
        print("Running demo simulation...")
        run_pipeline(None, 1)
    else:
        pdf_path = sys.argv[1]
        exam_id = int(sys.argv[2])
        run_pipeline(pdf_path, exam_id)
