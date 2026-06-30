import re

def render_math_in_text(raw_text):
    if not raw_text:
        return ""
    
    text = raw_text.strip()
    
    # Standardize delimiters
    text = re.sub(r'\\\[([\s\S]*?)\\\]', r'$$\1$$', text)
    text = re.sub(r'\\\(([\s\S]*?)\\\)', r'$\1$', text)
    
    # Detect bare LaTeX commands that are NOT inside $ ... $ or $$ ... $$
    # Bare commands like \frac{a}{b}, \sqrt{x}, \alpha, \beta, \theta, \Delta, \mu, \pi, \vec{a}
    # Pattern to find segments outside dollars
    parts = re.split(r'(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)', text)
    processed_parts = []
    for part in parts:
        if part.startswith('$'):
            processed_parts.append(part)
        else:
            # Look for bare commands like \frac{...}{...} or \sqrt{...} or \vec{...}
            # and wrap them in inline math $...$
            p = re.sub(r'(\\frac\{[^}]+\}\{[^}]+\}|\\sqrt\{[^}]+\}|\\vec\{[^}]+\}|\\hat\{[^}]+\})', r'$\1$', part)
            processed_parts.append(p)
            
    return "".join(processed_parts)

print("Test 1:", render_math_in_text("Let \\frac{a}{b} be a fraction and \\sqrt{x} be root."))
print("Test 2:", render_math_in_text("The value of $x^2 + y^2 = 1$ is given."))
