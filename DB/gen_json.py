import os
import re
import json

PYQ_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "JEE PYQ")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "src", "data")
OUTPUT_JSON = os.path.join(DATA_DIR, "officialJeeExtractedPapers.json")
OUTPUT_PYQ_LIST = os.path.join(DATA_DIR, "officialJeePyqList.ts")

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

def main():
    files = [f for f in os.listdir(PYQ_DIR) if f.endswith(".pdf")]
    print(f"Generating data for {len(files)} files...")
    extracted_papers = {}
    pyq_list_ts = []
    
    for filename in files:
        meta = parse_filename(filename)
        if not meta:
            continue
            
        questions_list = []
        for q_num in range(1, 91):
            sub_name = "Physics" if q_num <= 30 else "Chemistry" if q_num <= 60 else "Mathematics"
            sub_idx = q_num if q_num <= 30 else (q_num - 30) if q_num <= 60 else (q_num - 60)
            is_num = (meta["year"] >= 2020 and sub_idx > 20)
            q_type = "Numerical" if is_num else "MCQ"
            
            questions_list.append({
                "id": f"{meta['id']}-q-{q_num}",
                "questionNumber": q_num,
                "subject": sub_name,
                "chapter": f"Official {sub_name} PYQ",
                "type": q_type,
                "difficulty": "Medium",
                "statement": f"Question {q_num}: Refer to official PDF on the left.",
                "options": ["Option A", "Option B", "Option C", "Option D"] if q_type == "MCQ" else None,
                "correctAnswer": "10" if is_num else "A",
                "solution": "Refer to official answer key in PDF.",
                "explanation": "Refer to official answer key in PDF.",
                "concept": f"JEE Main {meta['year']} Official Question",
                "markingScheme": {"positive": 4, "negative": 0 if is_num else 1}
            })
            
        paper_obj = {
            "id": meta["id"],
            "year": meta["year"],
            "session": meta["session"],
            "shift": meta["shift"],
            "title": meta["title"],
            "totalQuestions": 90,
            "durationMinutes": 180,
            "priceRupees": 20,
            "pdfUrl": f"/JEE PYQ/{meta['filename']}",
            "questions": questions_list
        }
        extracted_papers[meta["id"]] = paper_obj
        pyq_list_ts.append({
            "id": meta["id"],
            "year": meta["year"],
            "session": meta["session"],
            "shift": meta["shift"],
            "title": meta["title"],
            "totalQuestions": 90,
            "durationMinutes": 180,
            "priceRupees": 20,
            "pdfUrl": f"/JEE PYQ/{meta['filename']}"
        })

    pyq_list_ts.sort(key=lambda x: x["title"], reverse=True)
    os.makedirs(DATA_DIR, exist_ok=True)
    
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

    print("DONE_GEN_JSON")

if __name__ == "__main__":
    main()
