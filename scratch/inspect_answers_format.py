import json

path = r"d:\JEE\src\data\officialJeeAnswers.json"
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Find a 2024 file
file_2024 = None
for k in data.keys():
    if "2024" in k:
        file_2024 = k
        break

if file_2024:
    print(f"File: {file_2024}")
    answers = data[file_2024]
    print(f"Total answers: {len(answers)}")
    print(f"Answers: {answers}")
else:
    print("No 2024 files found.")
