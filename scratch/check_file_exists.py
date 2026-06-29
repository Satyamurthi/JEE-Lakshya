import os
print("File exists:", os.path.exists("d:\\JEE\\src\\data\\officialJeeAnswers.json"))
if os.path.exists("d:\\JEE\\src\\data\\officialJeeAnswers.json"):
    print("Size:", os.path.getsize("d:\\JEE\\src\\data\\officialJeeAnswers.json"))
