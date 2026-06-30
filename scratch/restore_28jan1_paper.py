import fitz
import json
import re

doc = fitz.open('JEE PYQ/JEE Main 2026 (28 Jan Shift 1) Previous Year Paper with Answer Keys - Competishun.pdf')

# Detailed manual restoration for questions 1 to 15 of 28 Jan Shift 1
restored_questions = {
    1: {
        "statement": r"If $g'(x) = 2f(x) + 3x^2$, $f(0) = -3$ and $g'(f(x)) = 24x^4 - 36x^2 + 72$, then $f(g(2))$ is equal to:",
        "options": [r"$\frac{25}{6}$", r"$-\frac{25}{6}$", r"$\frac{7}{2}$", r"$-\frac{7}{2}$"],
        "correctAnswer": "C"
    },
    2: {
        "statement": r"The value of $\sum_{k=1}^{\infty} (-1)^{k+1} \frac{k(k+1)}{k!}$ is:",
        "options": [r"$2/e$", r"$1/e$", r"$e$", r"$e/2$"],
        "correctAnswer": "B"
    },
    3: {
        "statement": r"Let $y = x$ be the equation of a chord of the circle $C_1$ (in the closed half-plane $x \ge 0$) of diameter 10 passing through the origin. Let $C_2$ be another circle described on the given chord as its diameter. If the equation of the chord of the circle $C_2$, which passes through the point $(2,3)$ and is farthest from the center of $C_2$, is $x + ay + b = 0$, then $a - b$ is equal to:",
        "options": ["10", "-6", "-2", "6"],
        "correctAnswer": "D"
    },
    4: {
        "statement": r"If $\frac{\tan(A-B)}{\tan A} + \frac{\sin^2 C}{\sin^2 A} = 1$, where $A, B, C \in \left(0, \frac{\pi}{2}\right)$, then:",
        "options": [
            r"$\tan A, \tan C, \tan B$ are in G.P.",
            r"$\tan A, \tan B, \tan C$ are in G.P.",
            r"$\tan A, \tan C, \tan B$ are in A.P.",
            r"$\tan A, \tan B, \tan C$ are in A.P."
        ],
        "correctAnswer": "A"
    },
    5: {
        "statement": r"Let $z$ be a complex number such that $|z - 6| = 5$ and $|z + 2 - 6i| = 5$. Then the value of $z^3 + 3z^2 - 15z + 141$ is equal to:",
        "options": ["42", "37", "50", "61"],
        "correctAnswer": "C"
    },
    6: {
        "statement": r"Let $ABC$ be an equilateral triangle with orthocenter at the origin and the side $BC$ on the line $x + 2y = 4$. If the co-ordinates of the vertex $A$ are $(\alpha, \beta)$, then the greatest integer less than or equal to |\alpha + 2\beta| is:",
        "options": ["2", "3", "5", "4"],
        "correctAnswer": "D"
    },
    7: {
        "statement": r"Let $S = \{1,2,3,4,5,6,7,8,9\}$. Let $x$ be the number of 9-digit numbers formed using the digits of the set $S$ such that only one digit is repeated and it is repeated exactly twice. Let $y$ be the number of 9-digit numbers formed using the digits of the set $S$ such that only two digits are repeated and each of these is repeated exactly twice. Then $x/y$ is equal to:",
        "options": [r"$\frac{29}{5}$", r"$\frac{45}{7}$", r"$\frac{21}{4}$", r"$\frac{56}{9}$"],
        "correctAnswer": "B"
    },
    8: {
        "statement": r"Let $S = \{x^3 + ax^2 + bx + c : a,b,c \in \mathbb{N}, a,b,c \le 20\}$ be a set of polynomials. Then the number of polynomials in $S$, which are divisible by $x^2 + 2$, is:",
        "options": ["20", "6", "120", "10"],
        "correctAnswer": "A"
    },
    9: {
        "statement": r"A bag contains 10 balls out of which $k$ are red and $(10-k)$ are black, where $0 \le k \le 10$. If three balls are drawn at random without replacement and all of them are found to be black, then the probability that the bag contains 1 red and 9 black balls is:",
        "options": [r"$\frac{7}{11}$", r"$\frac{7}{55}$", r"$\frac{7}{110}$", r"$\frac{14}{55}$"],
        "correctAnswer": "B"
    },
    10: {
        "statement": r"If $\alpha, \beta$, where $\alpha < \beta$, are the roots of the equation $x^2 - (\lambda + 3)x + 3\lambda = 0$ such that $\frac{1}{\alpha} - \frac{1}{\beta} = \frac{1}{3}$, then the sum of all possible values of $\lambda$ is:",
        "options": ["6", "2", "4", "8"],
        "correctAnswer": "C"
    },
    11: {
        "statement": r"If $\int \frac{1 - 5\cos^2 x}{\sin^5 x \cos^2 x} dx = f(x) + C$, where $C$ is the constant of integration, then $f\left(\frac{\pi}{6}\right) - f\left(\frac{\pi}{4}\right)$ is equal to:",
        "options": [
            r"$\frac{1}{3}(26\sqrt{3} + 4)$",
            r"$\frac{4}{3}(8\sqrt{6} - 4)$",
            r"$\frac{1}{3}(26\sqrt{3} - 4)$",
            r"$\frac{2}{3}(4\sqrt{6} + 4)$"
        ],
        "correctAnswer": "A"
    },
    12: {
        "statement": r"Let $f$ be a polynomial function such that $f(x^2 + 1) = x^4 + 5x^2 + 2$, for all $x \in \mathbb{R}$. Then $\int_0^3 f(x) dx$ is equal to:",
        "options": [r"$\frac{41}{3}$", r"$\frac{33}{2}$", r"$\frac{27}{2}$", r"$\frac{5}{3}$"],
        "correctAnswer": "B"
    },
    13: {
        "statement": r"The area of the region $R = \{(x,y) : xy \le 8, 1 \le y \le x^2, x \ge 0\}$ is equal to:",
        "options": [
            r"$\frac{1}{3}(49\log_e 2 - 15)$",
            r"$\frac{2}{3}(20\log_e 2 + 9)$",
            r"$\frac{1}{3}(16\log_e 2 + 7)$",
            r"$\frac{2}{3}(14\log_e 2 - 5)$"
        ],
        "correctAnswer": "A"
    }
}

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

if 'pyq_jee_main_2026_28_jan_shift_1' in data:
    paper = data['pyq_jee_main_2026_28_jan_shift_1']
    for q in paper.get('questions', []):
        q_num = q.get('questionNumber')
        if q_num in restored_questions:
            info = restored_questions[q_num]
            q['statement'] = info['statement']
            q['options'] = info['options']
            q['correctAnswer'] = info['correctAnswer']
            q['solution'] = f"Official Answer Key: {info['correctAnswer']}. Refer to full solution archive for step-by-step breakdown."

with open('src/data/officialJeeExtractedPapers.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Restored questions 1 to 13 for 28 Jan Shift 1 in officialJeeExtractedPapers.json!")
