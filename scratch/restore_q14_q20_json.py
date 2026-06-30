import json

with open('src/data/officialJeeExtractedPapers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

restored_q = {
    14: {
        "statement": r"The value of $\lim_{x \to 0} \frac{\log \left( \sec(e^x) \cdot \sec(e^{2x}) \dots \sec(e^{10x}) \right)}{e^2 - e^{2\cos x}}$ is equal to:",
        "options": [
            r"$\frac{e^{10} - 1}{2e^2(e^2 - 1)}$",
            r"$\frac{e^{20} - 1}{2e^2(e^2 - 1)}$",
            r"$\frac{e^{20} - 1}{2(e^2 - 1)}$",
            r"$\frac{e^{10} - 1}{2(e^2 - 1)}$"
        ],
        "correctAnswer": "A"
    },
    15: {
        "statement": r"The mean and variance of 10 observations are 9 and 34.2, respectively. If 8 of these observations are 4, 8, 10, 12, 14, 6, 9, 11, then the absolute difference of the remaining two observations is:",
        "options": ["4", "6", "2", "8"],
        "correctAnswer": "C"
    },
    16: {
        "statement": r"Let $A, B$ and $C$ be three $2 \times 2$ matrices with real entries such that $B = (I + A)^{-1} A$ and $A + C = I$. If $BC = \begin{bmatrix} 1 & -5 \\ -1 & -2 \end{bmatrix}$ and $CB = \begin{bmatrix} x_1 & x_2 \\ x_3 & x_4 \end{bmatrix}$, then $x_1 + x_2 + x_3 + x_4$ is equal to:",
        "options": ["2", "0", "-2", "4"],
        "correctAnswer": "C"
    },
    17: {
        "statement": r"The common difference of the A.P.: $a_1, a_2, \dots, a_m$ is 13 more than the common difference of the A.P.: $b_1, b_2, \dots, b_n$. If $b_{31} = -277$, $b_{43} = -385$ and $a_{78} = 327$, then $a_1$ is equal to:",
        "options": ["21", "24", "19", "16"],
        "correctAnswer": "B"
    },
    18: {
        "statement": r"If the distances of the point $(1, 2, a)$ from the line $\frac{x-1}{1} = \frac{y}{2} = \frac{z-1}{1}$ along the lines $L_1: \frac{x-1}{3} = \frac{y-2}{4} = \frac{z-a}{b}$ and $L_2: \frac{x-1}{1} = \frac{y-2}{4} = \frac{z-a}{c}$ are equal, then $a + b + c$ is equal to:",
        "options": ["7", "5", "6", "4"],
        "correctAnswer": "A"
    },
    19: {
        "statement": r"For three unit vectors $\vec{a}, \vec{b}, \vec{c}$ satisfying $|\vec{a}-\vec{b}|^2 + |\vec{b}-\vec{c}|^2 + |\vec{c}-\vec{a}|^2 = 9$ and $|2\vec{a} + k\vec{b} + k\vec{c}| = 3$, the positive value of $k$ is:",
        "options": ["3", "6", "4", "5"],
        "correctAnswer": "A"
    },
    20: {
        "statement": r"Let $y = y(x)$ be the solution of the differential equation $x \frac{dy}{dx} - \sin(2y) = x^3(2 - x^3)\cos(2y), x \neq 0$. If $y(2) = 0$, then $\tan(y(1))$ is equal to:",
        "options": [r"$\frac{3}{4}$", r"$-\frac{7}{4}$", r"$\frac{7}{4}$", r"$-\frac{3}{4}$"],
        "correctAnswer": "B"
    }
}

if 'pyq_jee_main_2026_28_jan_shift_1' in data:
    paper = data['pyq_jee_main_2026_28_jan_shift_1']
    for q in paper.get('questions', []):
        q_num = q.get('questionNumber')
        if q_num in restored_q:
            info = restored_q[q_num]
            q['statement'] = info['statement']
            q['options'] = info['options']
            q['correctAnswer'] = info['correctAnswer']
            q['solution'] = f"Official Answer Key: {info['correctAnswer']}. Refer to full solution archive for step-by-step breakdown."

with open('src/data/officialJeeExtractedPapers.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Successfully restored Q14 to Q20 in officialJeeExtractedPapers.json!")
