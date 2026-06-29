import os
import re

pyq_dir = r"d:\JEE\JEE PYQ"
files = sorted(os.listdir(pyq_dir))

pattern = r'JEE Main (\d{4}) \(([^)]+)\) Previous Year Paper with Answer Keys - ([^.]+)\.pdf'
papers = []

month_names = {
    "Jan": "January",
    "Feb": "February",
    "Mar": "March",
    "Apr": "April",
    "Jun": "June",
    "Jul": "July",
    "Aug": "August",
    "Sep": "September",
    "Oct": "October",
    "Nov": "November",
    "Dec": "December"
}

for f in files:
    m = re.match(pattern, f)
    if not m:
        continue
    
    year_str, info, source = m.groups()
    year = int(year_str)
    
    # Generate id from filename
    slug = f.lower().replace(".pdf", "").replace(" ", "_").replace("(", "").replace(")", "").replace("-", "_")
    paper_id = f"pyq_{slug}"
    
    # Parse month to get session
    month_match = re.search(r'\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep)\b', info, re.IGNORECASE)
    month = month_match.group(1) if month_match else "April"
    full_month = month_names.get(month.capitalize(), month.capitalize())
    
    if year <= 2018:
        if "online" in info.lower():
            session = f"Online CBT Test {year}"
        else:
            session = f"Offline Pen-Paper Test {year}"
    else:
        session = f"{full_month} Session {year}"
        
    # Parse Shift
    shift_match = re.search(r'\b(Shift\s+\d+)\b', info, re.IGNORECASE)
    if shift_match:
        shift_num = shift_match.group(1)
        # Add morning/evening descriptive info for standard shifts
        if "shift 1" in shift_num.lower():
            shift = f"{shift_num} (Morning 9:00 AM - 12:00 PM)"
        else:
            shift = f"{shift_num} (Evening 3:00 PM - 6:00 PM)"
    else:
        if year <= 2018 and "online" not in info.lower():
            shift = "Offline Pen-Paper Shift"
        else:
            shift = f"{info} Shift"
            
    # Title
    title = f"JEE Main {year} ({info}) Official Paper (with Solutions)"
    
    papers.append({
        'id': paper_id,
        'year': year,
        'session': session,
        'shift': shift,
        'title': title,
        'totalQuestions': 90,
        'durationMinutes': 180,
        'priceRupees': 20,
        'pdfUrl': f"/JEE PYQ/{f}"
    })

# Write to typescript file
ts_path = r"d:\JEE\src\data\officialJeePyqList.ts"

# Sort papers: 2026 first down to 2013, then by name
papers.sort(key=lambda x: (-x['year'], x['title']))

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

export const officialJeePyqList: PYQPaper[] = [
"""

for p in papers:
    ts_content += "  {\n"
    ts_content += f'    id: "{p["id"]}",\n'
    ts_content += f'    year: {p["year"]},\n'
    ts_content += f'    session: "{p["session"]}",\n'
    ts_content += f'    shift: "{p["shift"]}",\n'
    ts_content += f'    title: "{p["title"]}",\n'
    ts_content += f'    totalQuestions: {p["totalQuestions"]},\n'
    ts_content += f'    durationMinutes: {p["durationMinutes"]},\n'
    ts_content += f'    priceRupees: {p["priceRupees"]},\n'
    ts_content += f'    pdfUrl: "{p["pdfUrl"]}"\n'
    ts_content += "  },\n"

ts_content += "];\n"

with open(ts_path, "w", encoding="utf-8") as f_out:
    f_out.write(ts_content)

print(f"Generated {len(papers)} papers metadata in {ts_path}")
