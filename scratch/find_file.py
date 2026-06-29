import os
for root, dirs, files in os.walk("d:\\JEE"):
    if "officialJeeAnswers.json" in files:
        print("Found at:", os.path.join(root, "officialJeeAnswers.json"))
