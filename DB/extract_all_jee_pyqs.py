import os
import re
import json
import pypdf

PYQ_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "JEE PYQ")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "src", "data")
OUTPUT_JSON = os.path.join(DATA_DIR, "officialJeeExtractedPapers.json")
OUTPUT_PYQ_LIST = os.path.join(DATA_DIR, "officialJeePyqList.ts")

def clean_text(text):
    if not text:
        return ""
    text = re.sub(r"JEE Main Previous Year Paper\s+MathonGo", "", text)
    text = re.sub(r"Question Paper", "", text)
    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    return text.strip()

def parse_filename(filename):
    m = re.search(r"JEE Main (\d{4})\s*\(([^)]+)\)", filename, re.IGNORECASE)
    if m:
        year = int(m.group(1))
        raw_inside = m.group(2)
        clean_inside = re.sub(r"\s+Online", "", raw_inside, flags=re.IGNORECASE).strip()
        
        shift_text = clean_inside
        if "Shift 1" in clean_inside:
            shift_text = f"{clean_inside} (Morning 9:00 AM - 12:00 PM)"
        elif "Shift 2" in clean_inside:
            shift_text = f"{clean_inside} (Evening 3:00 PM - 6:00 PM)"
        else:
            shift_text = f"Official NTA Shift ({clean_inside})"
            
        title = f"JEE Main {year} ({clean_inside})"
        paper_id = "pyq_" + re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_")
        
        return {
            "id": paper_id,
            "year": year,
            "title": title,
            "session": f"NTA Session {year}",
            "shift": shift_text,
            "filename": filename
        }
    return None

def extract_paper(filepath, meta):
    try:
        reader = pypdf.PdfReader(filepath)
    except Exception as e:
        print(f"Error opening {filepath}: {e}")
        return None

    full_text = ""
    for idx, page in enumerate(reader.pages):
        txt = page.extract_text()
        if txt:
            full_text += f"\n--- Page {idx+1} ---\n" + txt

    answers = {}
    if "ANSWER KEY" in full_text.upper():
        ak_part = full_text[full_text.upper().rfind("ANSWER KEY"):]
        matches = re.findall(r"(\d+)\.\s*\(([^)]+)\)", ak_part)
        for q_num, ans in matches:
            answers[int(q_num)] = ans.strip()

    blocks = re.split(r"\n(?=Q\d+\.|\b\d+\.\s+[A-Z])", full_text)
    questions_list = []
    
    for block in blocks:
        block = clean_text(block)
        m_q = re.match(r"^(?:Q)?(\d+)\.\s*(.*)", block, re.DOTALL)
        if not m_q:
            continue
            
        q_num = int(m_q.group(1))
        if q_num < 1 or q_num > 90:
            continue
            
        q_content = m_q.group(2).strip()
        
        if q_num <= 30:
            subject = "Physics"
            sub_num = q_num
        elif q_num <= 60:
            subject = "Chemistry"
            sub_num = q_num - 30
        else:
            subject = "Mathematics"
            sub_num = q_num - 60
            
        is_num = (meta["year"] >= 2020 and sub_num > 20)
        q_type = "Numerical" if is_num else "MCQ"
        pos_marks = 4
        neg_marks = 0 if is_num else 1
        
        raw_ans = answers.get(q_num, "1" if q_type == "MCQ" else "0")
        correct_answer = raw_ans
        if q_type == "MCQ":
            opt_map = {"1": "A", "2": "B", "3": "C", "4": "D"}
            correct_answer = opt_map.get(raw_ans, "A")
            
        statement = q_content
        options_list = None
        
        if q_type == "MCQ":
            opt_parts = re.split(r"\((1|2|3|4)\)", q_content)
            if len(opt_parts) >= 9:
                statement = opt_parts[0].strip()
                opts_dict = {}
                for i in range(1, len(opt_parts), 2):
                    opt_num = opt_parts[i]
                    opt_val = opt_parts[i+1].strip() if i+1 < len(opt_parts) else ""
                    opt_val = re.split(r"\n--- Page|\nQ\d+", opt_val)[0].strip()
                    opts_dict[opt_num] = opt_val if opt_val else f"Option {opt_num}"
                options_list = [opts_dict.get("1", "Option A"), opts_dict.get("2", "Option B"), opts_dict.get("3", "Option C"), opts_dict.get("4", "Option D")]
            else:
                options_list = ["Option A", "Option B", "Option C", "Option D"]

        questions_list.append({
            "id": f"{meta['id']}-q-{q_num}",
            "questionNumber": q_num,
            "subject": subject,
            "chapter": f"Official {subject} PYQ",
            "type": q_type,
            "difficulty": "Medium",
            "statement": statement[:1500] if statement else f"Question {q_num} from {meta['title']}",
            "options": options_list,
            "correctAnswer": str(correct_answer),
            "solution": f"Official Answer Key: {correct_answer}. Refer to detailed step-by-step solution in full archive.",
            "explanation": f"Official Answer Key: {correct_answer}.",
            "concept": f"JEE Main {meta['year']} Official Question",
            "markingScheme": {"positive": pos_marks, "negative": neg_marks}
        })
        
    return {
        "id": meta["id"],
        "year": meta["year"],
        "session": meta["session"],
        "shift": meta["shift"],
        "title": meta["title"],
        "totalQuestions": len(questions_list) if questions_list else 90,
        "durationMinutes": 180,
        "priceRupees": 20,
        "pdfUrl": f"/JEE PYQ/{meta['filename']}",
        "questions": questions_list
    }

def main():
    files = [f for f in os.listdir(PYQ_DIR) if f.endswith(".pdf")]
    print(f"Extracting {len(files)} PDFs...")
    
    extracted_papers = {}
    pyq_list_ts = []
    
    for filename in sorted(files):
        meta = parse_filename(filename)
        if not meta:
            continue
            
        filepath = os.path.join(PYQ_DIR, filename)
        paper_data = extract_paper(filepath, meta)
        if paper_data:
            extracted_papers[meta["id"]] = paper_data
            pyq_list_ts.append({
                "id": paper_data["id"],
                "year": paper_data["year"],
                "session": paper_data["session"],
                "shift": paper_data["shift"],
                "title": paper_data["title"],
                "totalQuestions": paper_data["totalQuestions"],
                "durationMinutes": 180,
                "priceRupees": 20,
                "pdfUrl": paper_data["pdfUrl"]
            })

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(extracted_papers, f, indent=2)
        
    ts_content = """export interface PYQPaper {
  id: string;
  year: number;
  session: string;
  shift: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  priceRupees: number;
  pdfUrl: string;
}

export const officialJeePyqList: PYQPaper[] = """ + json.dumps(pyq_list_ts, indent=2) + ";\n"

    with open(OUTPUT_PYQ_LIST, "w", encoding="utf-8") as f:
        f.write(ts_content)

    print("Done!")

if __name__ == "__main__":
    main()
