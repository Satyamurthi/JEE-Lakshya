const fs = require('fs');
const path = require('path');

const subjects = ['Physics', 'Chemistry', 'Mathematics'];
const difficulties = ['Easy', 'Medium', 'Hard'];

const chapters = {
  Physics: [
    'Kinematics', 'Laws of Motion', 'Work Energy Power', 'Rotational Dynamics', 
    'Gravitation', 'Thermodynamics', 'Electrostatics', 'Current Electricity', 
    'Magnetism', 'Electromagnetic Induction', 'Ray Optics', 'Wave Optics', 'Modern Physics'
  ],
  Chemistry: [
    'Atomic Structure', 'Chemical Bonding', 'Thermodynamics', 'Equilibrium', 
    'Chemical Kinetics', 'Solutions', 'Electrochemistry', 'Coordination Compounds', 
    'General Organic Chemistry', 'Hydrocarbons', 'Alcohol Phenol Ether', 'Aldehydes Ketones'
  ],
  Mathematics: [
    'Quadratic Equations', 'Sequences and Series', 'Complex Numbers', 'Matrices and Determinants', 
    'Permutations and Combinations', 'Binomial Theorem', 'Limits and Continuity', 
    'Differential Calculus', 'Integral Calculus', 'Differential Equations', 
    'Coordinate Geometry', 'Vector Algebra', '3D Geometry', 'Probability'
  ]
};

const templates = {
  Physics: [
    {
      stmt: (a, b) => `A particle moves along a straight line with velocity $v = ${a}t^2 + ${b}t\\text{ m/s}$. Find the acceleration of the particle at $t = 2\\text{ s}$ in $\\text{m/s}^2$:`,
      ans: (a, b) => 4 * a + b,
      type: 'Numerical',
      chap: 'Kinematics'
    },
    {
      stmt: (a, b) => `A block of mass $${a}\\text{ kg}$ is pulled by a force of $${b}\\text{ N}$ on a smooth horizontal surface. The acceleration produced is:`,
      opts: (a, b) => [`$${(b/a).toFixed(1)}\\text{ m/s}^2$`, `$${((b+2)/a).toFixed(1)}\\text{ m/s}^2$`, `$${((b*2)/a).toFixed(1)}\\text{ m/s}^2$`, `$${((b/2)/a).toFixed(1)}\\text{ m/s}^2$`],
      correctAns: 'A',
      type: 'MCQ',
      chap: 'Laws of Motion'
    },
    {
      stmt: (a, b) => `An ideal gas at temperature $${a}\\text{ K}$ is heated at constant pressure until its volume doubles. Its final temperature in Kelvin is:`,
      ans: (a, b) => 2 * a,
      type: 'Numerical',
      chap: 'Thermodynamics'
    },
    {
      stmt: (a, b) => `Two point charges of $+${a}\\mu\\text{C}$ and $+${b}\\mu\\text{C}$ are separated by a distance $r$. The ratio of electrostatic force on charge 1 to charge 2 is:`,
      opts: (a, b) => ["$1:1$", `$${a}:${b}$`, `$${b}:${a}$`, `$${a*a}:${b*b}$`],
      correctAns: 'A',
      type: 'MCQ',
      chap: 'Electrostatics'
    },
    {
      stmt: (a, b) => `A resistor of $${a}\\,\\Omega$ and an inductor of $${b}\\text{ mH}$ are connected in series. The phase angle between voltage and current at high frequencies approaches:`,
      opts: (a, b) => ["$90^\\circ$", "$45^\\circ$", "$0^\\circ$", "$60^\\circ$"],
      correctAns: 'A',
      type: 'MCQ',
      chap: 'Current Electricity'
    }
  ],
  Chemistry: [
    {
      stmt: (a, b) => `The number of radial nodes in a $${a}p$ orbital is:`,
      ans: (a, b) => a - 2,
      type: 'Numerical',
      chap: 'Atomic Structure'
    },
    {
      stmt: (a, b) => `For a reaction with rate constant $k = ${a} \\times 10^{-${b}}\\text{ s}^{-1}$, the order of the reaction is:`,
      opts: (a, b) => ["First order", "Zero order", "Second order", "Third order"],
      correctAns: 'A',
      type: 'MCQ',
      chap: 'Chemical Kinetics'
    },
    {
      stmt: (a, b) => `The oxidation state of Manganese in $\\text{K}_${a}\\text{MnO}_4$ when $a=${a}$ is:`,
      ans: (a, b) => 8 - a,
      type: 'Numerical',
      chap: 'Equilibrium'
    },
    {
      stmt: (a, b) => `Which of the following molecules exhibits $sp^3d$ hybridisation?`,
      opts: (a, b) => ["$\\text{PCl}_5$", "$\\text{SF}_6$", "$\\text{CH}_4$", "$\\text{BF}_3$"],
      correctAns: 'A',
      type: 'MCQ',
      chap: 'Chemical Bonding'
    }
  ],
  Mathematics: [
    {
      stmt: (a, b) => `If the roots of $x^2 - ${2*a}x + k = 0$ are equal, the value of $k$ is:`,
      ans: (a, b) => a * a,
      type: 'Numerical',
      chap: 'Quadratic Equations'
    },
    {
      stmt: (a, b) => `The value of $\\lim_{x \\to 0} \\frac{\\sin(${a}x)}{${b}x}$ is:`,
      opts: (a, b) => [`$${a}/${b}$`, `$${b}/${a}$`, "$0$", "$1$"],
      correctAns: 'A',
      type: 'MCQ',
      chap: 'Limits and Continuity'
    },
    {
      stmt: (a, b) => `The derivative of $f(x) = x^${a} + ${b}x$ at $x = 1$ is:`,
      ans: (a, b) => a + b,
      type: 'Numerical',
      chap: 'Differential Calculus'
    },
    {
      stmt: (a, b) => `The distance between parallel lines $3x + 4y + ${a} = 0$ and $3x + 4y - ${b} = 0$ is:`,
      ans: (a, b) => (a + b) / 5,
      type: 'Numerical',
      chap: 'Coordinate Geometry'
    }
  ]
};

console.log("Generating 1,500 structured questions SQL batch...");

let sql = `-- ==========================================
-- JEE NEXUS AI - MASSIVE 1,500+ QUESTION BANK SEEDING SCRIPT
-- ==========================================

INSERT INTO public.questions (id, subject, chapter, type, difficulty, statement, options, "correctAnswer", solution, concept, "markingScheme")
VALUES\n`;

const rows = [];
let idCounter = 1;

for (let sIdx = 0; sIdx < subjects.length; sIdx++) {
  const sub = subjects[sIdx];
  const chapList = chapters[sub];
  const tmplList = templates[sub];

  for (let i = 0; i < 500; i++) {
    const diff = difficulties[i % 3];
    const chap = chapList[i % chapList.length];
    const tmpl = tmplList[i % tmplList.length];
    const paramA = (i % 9) + 2;
    const paramB = (i % 7) + 3;

    const stmtText = tmpl.stmt(paramA, paramB).replace(/'/g, "''");
    const qType = tmpl.type;
    
    let optionsJson = "'{}'::jsonb";
    let corrAns = "";
    let solText = "";

    if (qType === 'MCQ') {
      const opts = tmpl.opts(paramA, paramB);
      const optObj = { A: opts[0], B: opts[1], C: opts[2], D: opts[3] };
      optionsJson = `'${JSON.stringify(optObj).replace(/'/g, "''")}'::jsonb`;
      corrAns = tmpl.correctAns;
      solText = `Direct evaluation gives option ${corrAns}.`;
    } else {
      corrAns = String(tmpl.ans(paramA, paramB));
      solText = `Substituting values gives exact numeric value = ${corrAns}.`;
    }

    const pos = 4;
    const neg = qType === 'MCQ' ? 1 : 0;
    const markingJson = `'{"positive": ${pos}, "negative": ${neg}}'::jsonb`;

    rows.push(`  (gen_random_uuid(), '${sub}', '${chap}', '${qType}', '${diff}', '${stmtText}', ${optionsJson}, '${corrAns}', '${solText}', '${chap}', ${markingJson})`);
  }
}

sql += rows.join(',\n') + '\nON CONFLICT DO NOTHING;\n';

const outputPath = path.join(__dirname, 'seed_thousands_questions.sql');
fs.writeFileSync(outputPath, sql);
console.log(`Successfully generated ${rows.length} questions in ${outputPath}!`);
