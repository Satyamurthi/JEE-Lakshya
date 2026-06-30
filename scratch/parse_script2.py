import re
import json

with open('scratch/script_2.txt', 'r', encoding='utf-8') as f:
    text = f.read()

print("Script length:", len(text))

# Let's find strings related to answer or solution or options
matches = re.findall(r'"(solution|correctAnswer|option|question|statement|answer)[^"]*"', text, re.IGNORECASE)
print("Some keys found:", set(matches[:20]))

# Let's search for JSON-like structures or array data in sveltekit hydration
# SvelteKit data is stored inside nodes array or data array
pos = text.find('data:')
if pos != -1:
    print("\nSnippet around 'data:':")
    print(text[pos:pos+500])

# Let's search for "solution" in text
sol_positions = [m.start() for m in re.finditer(r'solution', text, re.IGNORECASE)]
print(f"\nFound {len(sol_positions)} occurrences of 'solution'")
for p in sol_positions[:5]:
    print("--- Context around 'solution' ---")
    print(text[max(0, p-100):min(len(text), p+200)])
