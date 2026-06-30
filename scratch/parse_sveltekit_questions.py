import re
import json

with open('scratch/script_2.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's find "questions" or question items in text
# Let's look for "question" objects or JSON arrays
matches = re.finditer(r'\{[^{}]*?"statement"[^{}]*?\}', text)
found = list(matches)
print(f"Found {len(found)} simple statement objects.")

# Let's search for "options" or "answers" or "solution"
# In SvelteKit 2 hydration, strings are indexed or stored in a JS object array.
# Let's print snippets containing "200" or "400" or "Venus"
pos = text.find('Venus')
if pos != -1:
    print("\n--- Snippet around 'Venus' ---")
    print(text[max(0, pos-200):min(len(text), pos+400)])

pos_ans = text.find('correctAnswer')
if pos_ans != -1:
    print("\n--- Snippet around 'correctAnswer' ---")
    print(text[max(0, pos_ans-100):min(len(text), pos_ans+300)])
else:
    print("\n'correctAnswer' string not found directly, checking 'answer'")
    pos_a = text.find('answer')
    if pos_a != -1:
        print(text[max(0, pos_a-100):min(len(text), pos_a+300)])
