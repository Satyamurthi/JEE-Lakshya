import json
import sqlite3

removed_chapters = [
    # Physics
    "Communication Systems", "Communication System", "Principle of Communications", "Semiconductor & Communication Systems",
    "Earth's Magnetism", "Potentiometer", "Davisson-Germer Experiment",
    # Chemistry
    "States of Matter", "Solid State", "Surface Chemistry", "Metallurgy", "General Principles and Processes of Isolation of Metals",
    "Environmental Chemistry", "Polymers", "Chemistry in Everyday Life", "Hydrogen", "s-Block Elements", "s-Block",
    # Mathematics
    "Mathematical Reasoning", "Principle of Mathematical Induction", "Mathematical Induction"
]

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

removed_in_json = 0
total_in_json = 0
chapter_counts = {}

for paper_key, paper in data.items():
    for q in paper.get('questions', []):
        total_in_json += 1
        chap = q.get('chapter', '').strip()
        chapter_counts[chap] = chapter_counts.get(chap, 0) + 1
        for rm in removed_chapters:
            if rm.lower() in chap.lower():
                removed_in_json += 1
                break

print(f"Total questions in JSON: {total_in_json}")
print(f"Out of syllabus questions found in JSON: {removed_in_json} ({removed_in_json*100/total_in_json:.2f}%)")

print("\nTop 20 Chapter names in JSON:")
sorted_chaps = sorted(chapter_counts.items(), key=lambda x: x[1], reverse=True)
for ch, count in sorted_chaps[:20]:
    print(f"  {ch} -> {count} questions")
