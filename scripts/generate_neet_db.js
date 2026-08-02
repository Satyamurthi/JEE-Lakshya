import { copyFileSync, existsSync, unlinkSync, mkdirSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

function getQuestionPatternId(statement) {
  const normalized = statement
    .toLowerCase()
    .replace(/-?\b\d+(?:\.\d+)?\b/g, '#')
    .replace(/[^a-z]/g, '');
  return crypto.createHash('md5').update(normalized).digest('hex');
}

const srcDb = resolve('neet/DB/questions.db');
const destDb = resolve('Qp/NEET_temp.db');

console.log('=== Step 1: Copying questions.db to NEET_temp.db ===');
const destDir = dirname(destDb);
if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}
if (existsSync(destDb)) {
  console.log('Destination DB already exists. Overwriting...');
  try {
    unlinkSync(destDb);
  } catch (e) {
    console.warn('Could not unlink destination DB (resource busy). Attempting direct copy overwrite...');
  }
}
copyFileSync(srcDb, destDb);
console.log('Successfully copied DB.');

console.log('\n=== Step 2: Connecting to NEET.db ===');
const db = new DatabaseSync(destDb);

// Insert practice exam
const practiceExamId = 9999;
db.exec(`
  INSERT OR IGNORE INTO exams (id, name, year, type, duration_minutes, total_questions)
  VALUES (${practiceExamId}, 'NEET Hard Practice Pool', 2026, 'NEET', 180, 180)
`);

// Load chapters
const chapters = db.prepare('SELECT id, subject_id FROM chapters').all();
const chaptersBySubject = { 1: [], 2: [], 3: [], 4: [] };
for (const ch of chapters) {
  if (chaptersBySubject[ch.subject_id]) {
    chaptersBySubject[ch.subject_id].push(ch.id);
  }
}

// Find starting question ID
const maxIdResult = db.prepare("SELECT MAX(id) as max_id FROM questions").get();
let currentQuestionId = (maxIdResult.max_id || 0) + 1;
console.log('Starting question ID will be:', currentQuestionId);

// Optimization PRAGMAs
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA temp_store = MEMORY;');
db.exec('PRAGMA busy_timeout = 30000;');
db.exec('PRAGMA foreign_keys = OFF;');

function runWithRetry(stmt, args, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      stmt.run(...args);
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`\n[Warn] DB statement run failed (attempt ${attempt}/${retries}): ${err.message}. Retrying in 1s...`);
      const start = Date.now();
      while (Date.now() - start < 1000) {}
    }
  }
}


// Prepared statements for insertion
const insertQuestion = db.prepare(`
  INSERT INTO questions (id, exam_id, subject_id, chapter_id, question_text, type, difficulty, marks_correct, marks_incorrect, pattern_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertOptions4 = db.prepare(`
  INSERT INTO options (question_id, option_text, is_correct)
  VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)
`);
const insertSolution = db.prepare(`
  INSERT INTO solutions (question_id, explanation_text)
  VALUES (?, ?)
`);

// Helpers for MCQ Option Generation
function getOptions(correctAns, index, isFloat = false) {
  const correctLetter = ['A', 'B', 'C', 'D'][index % 4];
  const options = { A: '', B: '', C: '', D: '' };
  
  let val = parseFloat(correctAns);
  let p1, p2, p3;
  if (isNaN(val)) {
    p1 = correctAns + ' (aq)';
    p2 = correctAns + ' (g)';
    p3 = correctAns + ' (s)';
  } else {
    if (isFloat) {
      p1 = (val + 1.25).toFixed(2);
      p2 = (val - 0.75).toFixed(2);
      p3 = (val * 1.5).toFixed(2);
      if (p1 === correctAns || p1 === p2) p1 = (val + 2.5).toFixed(2);
      if (p2 === correctAns || p2 === p3) p2 = (val - 1.5).toFixed(2);
      if (p3 === correctAns) p3 = (val * 0.5).toFixed(2);
    } else {
      p1 = String(Math.round(val + 2));
      p2 = String(Math.round(val - 3));
      p3 = String(Math.round(val * 2));
      if (p3 === correctAns) p3 = String(Math.round(val + 5));
      if (p1 === correctAns) p1 = String(Math.round(val + 1));
      if (p2 === correctAns) p2 = String(Math.round(val - 1));
    }
  }
  
  const distractors = [p1, p2, p3];
  let distIdx = 0;
  for (const letter of ['A', 'B', 'C', 'D']) {
    if (letter === correctLetter) {
      options[letter] = String(correctAns);
    } else {
      options[letter] = distractors[distIdx++];
    }
  }
  return { options, correctLetter };
}

// ----------------------------------------------------
// Physics Generator (Subject ID = 1)
// ----------------------------------------------------
function generatePhysicsQuestion(index) {
  const seed = index;
  const templateId = seed % 5;
  const paramIndex = Math.floor(seed / 5);
  
  let qText = '';
  let ansStr = '';
  let solText = '';
  let isFloat = false;
  
  if (templateId === 0) {
    let rem = paramIndex;
    const u = (rem % 491) + 10; rem = Math.floor(rem / 491);
    const thetaIdx = rem % 3; rem = Math.floor(rem / 3);
    const awRaw = (rem % 50) + 1; rem = Math.floor(rem / 50);
    const m = (rem % 50) + 1;
    
    const thetaVals = [30, 45, 60];
    const theta = thetaVals[thetaIdx];
    const rad = (theta * Math.PI) / 180;
    const aw = awRaw * 0.1;
    
    const g = 10;
    const T = (2 * u * Math.sin(rad)) / g;
    const X = u * Math.cos(rad) * T + 0.5 * aw * T * T;
    ansStr = X.toFixed(1);
    isFloat = true;
    
    qText = `A projectile of mass $${m}$ kg is launched from ground level with initial velocity $u = ${u}$ m/s at an angle of $${theta}^\\circ$ with the horizontal. If a horizontal wind force provides a constant acceleration of $a_w = ${aw.toFixed(1)}$ m/s$^2$ in the direction of motion, find the horizontal range of the projectile in meters. (Take $g = 10$ m/s$^2$, round to 1 decimal place).`;
    solText = `The time of flight is determined by the vertical motion: $T = \\frac{2 u \\sin\\theta}{g} = \\frac{2 \\cdot ${u} \\cdot \\sin(${theta}^\\circ)}{10} = ${T.toFixed(2)}$ s. The horizontal distance is given by $X = u \\cos\\theta \\cdot T + \\frac{1}{2} a_w T^2 = ${u} \\cdot \\cos(${theta}^\\circ) \\cdot ${T.toFixed(2)} + 0.5 \\cdot ${aw.toFixed(1)} \\cdot (${T.toFixed(2)})^2 \\approx ${ansStr}$ m. Note that the mass $m = ${m}$ kg is redundant since range depends only on kinematics.`;
  }
  else if (templateId === 1) {
    let rem = paramIndex;
    const q1 = (rem % 50) + 1; rem = Math.floor(rem / 50);
    const q2 = (rem % 50) + 1; rem = Math.floor(rem / 50);
    const x1 = (rem % 11) - 5; rem = Math.floor(rem / 11);
    const y1 = (rem % 11) - 5; rem = Math.floor(rem / 11);
    const x2 = (rem % 11) - 5; rem = Math.floor(rem / 11);
    const y2 = (rem % 11) - 5;
    
    const r_sq = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) || 1;
    const F_micro = (9000 * q1 * q2) / r_sq;
    ansStr = F_micro.toFixed(2);
    isFloat = true;
    
    qText = `Two point charges $q_1 = ${q1}$ $\\mu$C and $q_2 = ${q2}$ $\\mu$C are placed at coordinates $(${x1}, ${y1})$ and $(${x2}, ${y2})$ meters respectively in vacuum. Find the magnitude of the electrostatic force between them in micro-Newtons ($\\mu$N). (Take Coulomb constant $k = 9 \\times 10^9$ N m$^2$/C$^2$, round to 2 decimal places).`;
    solText = `The distance squared between the charges is $r^2 = (${x2} - ${x1})^2 + (${y2} - ${y1})^2 = ${r_sq}$ m$^2$. The force is $F = k \\frac{|q_1 q_2|}{r^2} = 9 \\times 10^9 \\frac{${q1}\\times10^{-6} \\cdot ${q2}\\times10^{-6}}{${r_sq}} = \\frac{9000 \\cdot ${q1} \\cdot ${q2}}{${r_sq}} \\times 10^{-6}$ N = ${F_micro.toFixed(2)}$ $\\mu$N.`;
  }
  else if (templateId === 2) {
    let rem = paramIndex;
    const x1 = (rem % 11) - 5; rem = Math.floor(rem / 11);
    const x2 = x1 + (rem % 10) + 1; rem = Math.floor(rem / 10);
    const aRaw = (rem % 30) + 1; rem = Math.floor(rem / 30);
    const bRaw = (rem % 30) + 1; rem = Math.floor(rem / 30);
    const c = (rem % 61) - 30;
    
    const a = 3 * aRaw;
    const b = 2 * bRaw;
    const val2 = aRaw * Math.pow(x2, 3) + bRaw * Math.pow(x2, 2) + c * x2;
    const val1 = aRaw * Math.pow(x1, 3) + bRaw * Math.pow(x1, 2) + c * x1;
    const W = val2 - val1;
    ansStr = String(W);
    
    qText = `A particle is moved along the x-axis from $x = ${x1}$ m to $x = ${x2}$ m under the action of a force $F(x) = ${a}x^2 + ${b}x + ${c === 0 ? '0' : (c > 0 ? '+ ' + c : '- ' + Math.abs(c))}$ Newtons. Find the work done by the force in Joules.`;
    solText = `Work done is given by $W = \\int_{${x1}}^{${x2}} F(x) \\, dx = \\int_{${x1}}^{${x2}} (${a}x^2 + ${b}x + ${c}) \\, dx = [${aRaw}x^3 + ${bRaw}x^2 + ${c}x]_{${x1}}^{${x2}} = (${val2}) - (${val1}) = ${W}$ J.`;
  }
  else if (templateId === 3) {
    let rem = paramIndex;
    const T1 = (rem % 801) + 400; rem = Math.floor(rem / 801);
    const T2 = (rem % 100) + 200; rem = Math.floor(rem / 100);
    const Qin = (rem % 491) + 10;
    
    const W = Qin * (T1 - T2) / T1;
    ansStr = W.toFixed(2);
    isFloat = true;
    
    qText = `A Carnot heat engine operates between a source at temperature $T_1 = ${T1}$ K and a sink at temperature $T_2 = ${T2}$ K. If the engine absorbs $Q_{in} = ${Qin}$ kJ of heat from the source in each cycle, find the work done per cycle in kJ. (Round to 2 decimal places).`;
    solText = `The efficiency of a Carnot engine is $\\eta = 1 - \\frac{T_2}{T_1} = 1 - \\frac{${T2}}{${T1}} = \\frac{${T1 - T2}}{${T1}}$. The work done is $W = \\eta \\cdot Q_{in} = \\frac{${T1 - T2}}{${T1}} \\cdot ${Qin} \\approx ${ansStr}$ kJ.`;
  }
  else {
    let rem = paramIndex;
    const c = (rem % 500) + 1; rem = Math.floor(rem / 500);
    const k = (rem % 6) + 1; rem = Math.floor(rem / 6);
    const T = (rem % 496) + 5; rem = Math.floor(rem / 496);
    const subNames = ['Uranium-235', 'Carbon-14', 'Radium-226', 'Cobalt-60', 'Iodine-131', 'Radon-222'];
    const sName = subNames[rem % 6];
    
    const N0 = c * 64;
    const t = k * T;
    const ans = N0 / Math.pow(2, k);
    ansStr = String(ans * 100000);
    
    qText = `A radioactive sample of $${sName}$ has an initial number of nuclei $N_0 = ${N0} \\times 10^5$. The half-life of $${sName}$ is $T = ${T}$ years. Find the number of remaining nuclei after $t = ${t}$ years.`;
    solText = `The number of remaining nuclei after $t = ${t}$ years (which is exactly $k = ${k}$ half-lives) is given by $N(t) = \\frac{N_0}{2^k} = \\frac{${N0} \\times 10^5}{2^{${k}}} = \\frac{${N0}}{${Math.pow(2, k)}} \\times 10^5 = ${ans} \\times 10^5 = ${ansStr}$.`;
  }
  
  return { qText, ansStr, solText, isFloat };
}

// ----------------------------------------------------
// Chemistry Generator (Subject ID = 2)
// ----------------------------------------------------
function generateChemistryQuestion(index) {
  const seed = index;
  const templateId = seed % 5;
  const paramIndex = Math.floor(seed / 5);
  
  let qText = '';
  let ansStr = '';
  let solText = '';
  let isFloat = false;
  
  if (templateId === 0) {
    let rem = paramIndex;
    const x = (rem % 30) + 1; rem = Math.floor(rem / 30);
    const y = (rem % 60) + 1; rem = Math.floor(rem / 60);
    const z = (rem % 20) + 1; rem = Math.floor(rem / 20);
    const qType = rem % 3; rem = Math.floor(rem / 3);
    const descIdx = rem % 10;
    
    const descs = [
      'A synthetic drug candidate', 'An organic compound isolated from a plant', 'A volatile liquid used as a solvent',
      'An organic compound synthesized in laboratory', 'A metabolic byproduct in muscle cells', 'A toxic substance found in seeds',
      'A food preservative compound', 'An organic dye compound', 'A compound used in perfume synthesis', 'A natural flavoring agent'
    ];
    const desc = descs[descIdx];
    
    const M = 12 * x + y + 16 * z;
    const C_pct = (12 * x / M) * 100;
    const H_pct = (y / M) * 100;
    const O_pct = (16 * z / M) * 100;
    
    if (qType === 0) {
      qText = `${desc} contains Carbon = ${C_pct.toFixed(2)}%, Hydrogen = ${H_pct.toFixed(2)}%, and the rest is Oxygen. The molecular mass of the compound is ${M} g/mol. Find the number of Carbon atoms in one molecule of the compound. (Atomic masses: C = 12, H = 1, O = 16).`;
      ansStr = String(x);
      solText = `Mass of Carbon in one mole of compound = ${C_pct.toFixed(2)}% of ${M} g = $\\frac{${C_pct.toFixed(4)} \\cdot ${M}}{100} \\approx ${12 * x}$ g. Number of Carbon atoms = $\\frac{${12 * x}}{12} = ${x}$.`;
    } else if (qType === 1) {
      qText = `${desc} contains Carbon = ${C_pct.toFixed(2)}%, Hydrogen = ${H_pct.toFixed(2)}%, and the rest is Oxygen. The molecular mass of the compound is ${M} g/mol. Find the number of Hydrogen atoms in one molecule of the compound. (Atomic masses: C = 12, H = 1, O = 16).`;
      ansStr = String(y);
      solText = `Mass of Hydrogen in one mole of compound = ${H_pct.toFixed(2)}% of ${M} g = $\\frac{${H_pct.toFixed(4)} \\cdot ${M}}{100} \\approx ${y}$ g. Number of Hydrogen atoms = $\\frac{${y}}{1} = ${y}$.`;
    } else {
      qText = `${desc} contains Carbon = ${C_pct.toFixed(2)}%, Hydrogen = ${H_pct.toFixed(2)}%, and the rest is Oxygen. The molecular mass of the compound is ${M} g/mol. Find the number of Oxygen atoms in one molecule of the compound. (Atomic masses: C = 12, H = 1, O = 16).`;
      ansStr = String(z);
      solText = `Mass of Oxygen in one mole of compound = ${O_pct.toFixed(2)}% of ${M} g = $\\frac{${O_pct.toFixed(4)} \\cdot ${M}}{100} \\approx ${16 * z}$ g. Number of Oxygen atoms = $\\frac{${16 * z}}{16} = ${z}$.`;
    }
  }
  else if (templateId === 1) {
    let rem = paramIndex;
    const rIdx = rem % 15; rem = Math.floor(rem / 15);
    const kRaw = (rem % 200) + 1; rem = Math.floor(rem / 200);
    const C0Raw = (rem % 91) + 10; rem = Math.floor(rem / 91);
    const fIdx = rem % 6; rem = Math.floor(rem / 6);
    const T = (rem % 53) + 298;
    
    const rxns = [
      'decomposition of N2O5', 'hydrolysis of ethyl acetate', 'decomposition of H2O2', 'inversion of cane sugar',
      'decomposition of azoethane', 'decarboxylation of malonic acid', 'decomposition of dimethyl ether',
      'thermal decomposition of nitrous oxide', 'hydrolysis of methyl formate', 'decomposition of sulfuryl chloride',
      'isomerization of cyclopropane', 'decomposition of di-tert-butyl peroxide', 'decomposition of phosphine',
      'mutarotation of glucose', 'chlorination of methane'
    ];
    const rxn = rxns[rIdx];
    const k = kRaw * 1e-4;
    const C0 = C0Raw * 0.1;
    const fVals = [2, 3, 4, 5, 8, 10];
    const f = fVals[fIdx];
    const Ct = C0 / f;
    
    const t = Math.log(f) / k;
    ansStr = t.toFixed(1);
    isFloat = true;
    
    qText = `For the first-order reaction (${rxn}) at temperature $T = ${T}$ K, the rate constant is $k = ${kRaw} \\times 10^{-4}$ s$^{-1}$. Find the time taken in seconds for the concentration of the reactant to decrease from $C_0 = ${C0.toFixed(1)}$ M to $C_t = ${Ct.toFixed(2)}$ M. (Round to 1 decimal place).`;
    solText = `For a first-order reaction, the time is given by $t = \\frac{1}{k} \\ln\\left(\\frac{C_0}{C_t}\\right) = \\frac{1}{${kRaw} \\times 10^{-4}} \\ln(${f}) = \\frac{10000 \\cdot ${Math.log(f).toFixed(4)}}{${kRaw}} \\approx ${ansStr}$ s.`;
  }
  else if (templateId === 2) {
    let rem = paramIndex;
    const pKaRaw = (rem % 61) + 60; rem = Math.floor(rem / 61);
    const Va = (rem % 46) * 10 + 50; rem = Math.floor(rem / 46);
    const Vs = (rem % 46) * 10 + 50; rem = Math.floor(rem / 46);
    const MaRaw = (rem % 10) + 1; rem = Math.floor(rem / 10);
    const MsRaw = (rem % 10) + 1; rem = Math.floor(rem / 10);
    const acidIdx = rem % 5;
    
    const acids = ['acetic acid', 'formic acid', 'benzoic acid', 'propanoic acid', 'nitrous acid'];
    const acid = acids[acidIdx];
    
    const pKa = pKaRaw * 0.05;
    const Ma = MaRaw * 0.1;
    const Ms = MsRaw * 0.1;
    
    const ratio = (Vs * Ms) / (Va * Ma);
    const pH = pKa + Math.log10(ratio);
    ansStr = pH.toFixed(2);
    isFloat = true;
    
    qText = `Find the pH of a buffer solution prepared by mixing $V_a = ${Va}$ mL of $M_a = ${Ma.toFixed(1)}$ M weak acid ($${acid}$, $pK_a = ${pKa.toFixed(2)}$) with $V_s = ${Vs}$ mL of $M_s = ${Ms.toFixed(1)}$ M of its conjugate salt. (Round to 2 decimal places).`;
    solText = `Using the Henderson-Hasselbalch equation: $\\text{pH} = pK_a + \\log_{10}\\left(\\frac{[\\text{salt}]}{[\\text{acid}]}\\right)$. The moles of acid and salt are $n_a = V_a M_a = ${Va} \\cdot ${Ma.toFixed(1)} = ${(Va*Ma).toFixed(1)}$ mmol, and $n_s = V_s M_s = ${Vs} \\cdot ${Ms.toFixed(1)} = ${(Vs*Ms).toFixed(1)}$ mmol. Thus, $\\text{pH} = ${pKa.toFixed(2)} + \\log_{10}\\left(\\frac{${(Vs*Ms).toFixed(1)}}{${(Va*Ma).toFixed(1)}}\\right) = ${pKa.toFixed(2)} + \\log_{10}(${ratio.toFixed(4)}) \\approx ${ansStr}$.`;
  }
  else if (templateId === 3) {
    let rem = paramIndex;
    const k1 = (rem % 100) + 1; rem = Math.floor(rem / 100);
    const k2 = k1 + (rem % 190) + 10; rem = Math.floor(rem / 190);
    const T1 = (rem % 51) + 270; rem = Math.floor(rem / 51);
    const T2 = T1 + (rem % 51) + 10;
    
    const R = 8.314;
    const Ea = (R * Math.log(k2 / k1) * T1 * T2) / (T2 - T1) / 1000;
    ansStr = Ea.toFixed(2);
    isFloat = true;
    
    qText = `The rate constant of a reaction increases from $k_1 = ${k1} \\times 10^{-5}$ s$^{-1}$ at $T_1 = ${T1}$ K to $k_2 = ${k2} \\times 10^{-5}$ s$^{-1}$ at $T_2 = ${T2}$ K. Calculate the activation energy ($E_a$) of the reaction in kJ/mol. (Take gas constant $R = 8.314$ J mol$^{-1}$ K$^{-1}$, round to 2 decimal places).`;
    solText = `Applying the Arrhenius equation: $\\ln\\left(\\frac{k_2}{k_1}\\right) = \\frac{E_a}{R}\\left(\\frac{T_2 - T_1}{T_1 T_2}\\right)$. Rearranging gives $E_a = \\frac{R \\cdot \\ln(k_2/k_1) \\cdot T_1 \\cdot T_2}{T_2 - T_1} = \\frac{8.314 \\cdot \\ln(${k2}/${k1}) \\cdot ${T1} \\cdot ${T2}}{${T2 - T1}}$ Joules $\\approx ${Ea.toFixed(2)}$ kJ/mol.`;
  }
  else {
    let rem = paramIndex;
    const CRaw = (rem % 2000) + 1; rem = Math.floor(rem / 2000);
    const T = (rem % 151) + 250; rem = Math.floor(rem / 151);
    const iIdx = rem % 6; rem = Math.floor(rem / 6);
    const soluteIdx = rem % 6;
    
    const C = CRaw * 0.001;
    const iVals = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0];
    const i = iVals[iIdx];
    const solutes = ['Glucose', 'Urea', 'NaCl', 'CaCl2', 'AlCl3', 'K4[Fe(CN)6]'];
    const solute = solutes[soluteIdx];
    
    const R = 0.0821;
    const Pi = i * C * R * T;
    ansStr = Pi.toFixed(2);
    isFloat = true;
    
    qText = `Determine the osmotic pressure (in atm) of a $C = ${C.toFixed(3)}$ M solution of $${solute}$ at temperature $T = ${T}$ K. Assume the Van 't Hoff factor $i = ${i.toFixed(1)}$ for the solute. (Take $R = 0.0821$ L atm mol$^{-1}$ K$^{-1}$, round to 2 decimal places).`;
    solText = `The osmotic pressure is $\\Pi = i C R T = ${i.toFixed(1)} \\cdot ${C.toFixed(3)} \\cdot 0.0821 \\cdot ${T} \\approx ${ansStr}$ atm.`;
  }
  
  return { qText, ansStr, solText, isFloat };
}

// ----------------------------------------------------
// Biology Generator (Subject ID = 3 for Botany, ID = 4 for Zoology)
// ----------------------------------------------------
function generateBiologyQuestion(index, isZoology) {
  const seed = index;
  const templateId = seed % 5;
  const paramIndex = Math.floor(seed / 5);
  
  let qText = '';
  let ansStr = '';
  let solText = '';
  let isFloat = false;
  
  if (templateId === 0) {
    const bases = ['A', 'T', 'G', 'C'];
    let dna = '';
    let temp = paramIndex;
    for (let i = 0; i < 12; i++) {
      dna += bases[temp % 4];
      temp = Math.floor(temp / 4);
    }
    
    let mrna = '';
    for (const b of dna) {
      mrna += { A: 'U', T: 'A', G: 'C', C: 'G' }[b];
    }
    
    qText = `In a transcription unit, the template strand of DNA has the sequence 3'-${dna}-5'. Identify the complementary sequence of the mRNA transcript.`;
    ansStr = `5'-${mrna}-3'`;
    solText = `During transcription, mRNA is synthesized complementary to the DNA template strand in the 5' to 3' direction. The base-pairing rules are: Adenine (A) pairs with Uracil (U) in RNA, Thymine (T) pairs with Adenine (A), Guanine (G) pairs with Cytosine (C), and Cytosine (C) pairs with Guanine (G). Hence, 3'-${dna}-5' is transcribed to 5'-${mrna}-3'.`;
  }
  else if (templateId === 1) {
    let rem = paramIndex;
    const g1A = rem % 3; rem = Math.floor(rem / 3);
    const g1B = rem % 3; rem = Math.floor(rem / 3);
    const g1C = rem % 3; rem = Math.floor(rem / 3);
    
    const g2A = rem % 3; rem = Math.floor(rem / 3);
    const g2B = rem % 3; rem = Math.floor(rem / 3);
    const g2C = rem % 3; rem = Math.floor(rem / 3);
    
    const offA = rem % 3; rem = Math.floor(rem / 3);
    const offB = rem % 3; rem = Math.floor(rem / 3);
    const offC = rem % 3;
    
    function prob(p1, p2, off) {
      const alleles1 = p1 === 0 ? ['A', 'A'] : p1 === 1 ? ['A', 'a'] : ['a', 'a'];
      const alleles2 = p2 === 0 ? ['A', 'A'] : p2 === 1 ? ['A', 'a'] : ['a', 'a'];
      let matches = 0;
      for (const a1 of alleles1) {
        for (const a2 of alleles2) {
          const offGen = [a1, a2].sort().join('');
          const targetGen = off === 0 ? 'AA' : off === 1 ? 'Aa' : 'aa';
          if (offGen === targetGen) matches++;
        }
      }
      return matches / 4;
    }
    
    const pA = prob(g1A, g2A, offA);
    const pB = prob(g1B, g2B, offB);
    const pC = prob(g1C, g2C, offC);
    const totalP = pA * pB * pC;
    
    const org = isZoology ? 'Drosophila melanogaster' : 'Pisum sativum';
    const genNames = ['AA', 'Aa', 'aa'];
    const g1Text = genNames[g1A] + genNames[g1B].toLowerCase() + genNames[g1C].toLowerCase().replace(/a/g,'b').replace(/b/g,'c');
    const g2Text = genNames[g2A] + genNames[g2B].toLowerCase() + genNames[g2C].toLowerCase().replace(/a/g,'b').replace(/b/g,'c');
    const offText = genNames[offA] + genNames[offB].toLowerCase() + genNames[offC].toLowerCase().replace(/a/g,'b').replace(/b/g,'c');
    
    qText = `In a genetic cross of $${org}$ with parental genotypes $${g1Text}$ and $${g2Text}$, what is the probability of obtaining an offspring with the genotype $${offText}$? (Assume independent assortment).`;
    ansStr = totalP === 0 ? '0' : `${Math.round(totalP * 64)}/64`;
    solText = `For locus A: $${g1Text.slice(0,2)} \\times ${g2Text.slice(0,2)}$ gives $${offText.slice(0,2)}$ with probability $${pA}$. For locus B: $${g1Text.slice(2,4)} \\times ${g2Text.slice(2,4)}$ gives $${offText.slice(2,4)}$ with probability $${pB}$. For locus C: $${g1Text.slice(4,6)} \\times ${g2Text.slice(4,6)}$ gives $${offText.slice(4,6)}$ with probability $${pC}$. By the product rule, the combined probability is $${pA} \\times ${pB} \\times ${pC} = ${ansStr}$.`;
  }
  else if (templateId === 2) {
    const organisms = isZoology ? 
      [
        { name: 'Homo sapiens (human)', diploid: 46 },
        { name: 'Rattus norvegicus (rat)', diploid: 42 },
        { name: 'Drosophila melanogaster (fruit fly)', diploid: 8 },
        { name: 'Felis catus (cat)', diploid: 38 },
        { name: 'Mus musculus (mouse)', diploid: 40 }
      ] :
      [
        { name: 'Allium cepa (onion)', diploid: 16 },
        { name: 'Pisum sativum (pea)', diploid: 14 },
        { name: 'Solanum tuberosum (potato)', diploid: 48 },
        { name: 'Zea mays (maize)', diploid: 20 },
        { name: 'Arabidopsis thaliana', diploid: 10 }
      ];
      
    let rem = paramIndex;
    const org = organisms[rem % organisms.length]; rem = Math.floor(rem / organisms.length);
    const stageIdx = rem % 6; rem = Math.floor(rem / 6);
    const qType = rem % 2;
    
    const stages = [
      { name: 'Metaphase of Mitosis', chrom: org.diploid, chromatids: 2 * org.diploid },
      { name: 'Anaphase of Mitosis', chrom: 2 * org.diploid, chromatids: 2 * org.diploid },
      { name: 'Anaphase I of Meiosis', chrom: org.diploid, chromatids: 2 * org.diploid },
      { name: 'Metaphase II of Meiosis', chrom: org.diploid / 2, chromatids: org.diploid },
      { name: 'Anaphase II of Meiosis', chrom: org.diploid, chromatids: org.diploid },
      { name: 'Telophase II of Meiosis (per daughter cell nucleus)', chrom: org.diploid / 2, chromatids: org.diploid / 2 }
    ];
    
    const stage = stages[stageIdx];
    
    if (qType === 0) {
      qText = `In $${org.name}$, the diploid chromosome number is $2n = ${org.diploid}$. Determine the total number of chromosomes in a cell during the $${stage.name}$.`;
      ansStr = String(stage.chrom);
      solText = `In $${org.name}$, $2n = ${org.diploid}$. At $${stage.name}$, the number of distinct chromosomes is $${stage.chrom}$.`;
    } else {
      qText = `In $${org.name}$, the diploid chromosome number is $2n = ${org.diploid}$. Determine the total number of chromatids in a cell during the $${stage.name}$.`;
      ansStr = String(stage.chromatids);
      solText = `In $${org.name}$, $2n = ${org.diploid}$ and chromatids contain duplicated DNA. At $${stage.name}$, the total number of chromatids is $${stage.chromatids}$.`;
    }
  }
  else if (templateId === 3) {
    let rem = paramIndex;
    const glucose = (rem % 100) + 1; rem = Math.floor(rem / 100);
    const shuttleIdx = rem % 2;
    
    const shuttle = shuttleIdx === 0 ? 'Glycerol Phosphate' : 'Malate-Aspartate';
    const atpPerGlucose = shuttleIdx === 0 ? 30 : 32;
    const netATP = glucose * atpPerGlucose;
    
    qText = `Calculate the net yield of ATP molecules produced during the complete aerobic oxidation of $${glucose}$ molecules of glucose in a eukaryotic cell, assuming the active transport uses the $${shuttle}$ shuttle system.`;
    ansStr = String(netATP);
    solText = `Complete oxidation of one glucose molecule yields $${atpPerGlucose}$ ATP under the $${shuttle}$ shuttle system (which yields $${shuttleIdx === 0 ? '1.5 ATP per cytosolic NADH' : '2.5 ATP per cytosolic NADH'}$). For $${glucose}$ molecules of glucose, the total net ATP yield is $${glucose} \\times ${atpPerGlucose} = ${netATP}$ ATP.`;
  }
  else {
    let rem = paramIndex;
    const N0 = (rem % 500) * 10 + 100; rem = Math.floor(rem / 500);
    const rRaw = (rem % 15) + 1; rem = Math.floor(rem / 15);
    const t = (rem % 5) + 2;
    
    const r = rRaw * 0.01 + 0.05;
    const Nt = Math.round(N0 * Math.exp(r * t));
    ansStr = String(Nt);
    
    const species = isZoology ? 'population of deer' : 'population of oak trees';
    qText = `A $${species}$ in a nature reserve has an initial population size of $N_0 = ${N0}$ and exhibits exponential growth with an intrinsic rate of natural increase $r = ${r.toFixed(2)}$ per year. Find the population size after $t = ${t}$ years. (Take $e \\approx 2.718$, round to the nearest integer).`;
    solText = `Under exponential growth, the population size at time $t$ is given by $N_t = N_0 e^{rt}$. Substituting the values: $N_{${t}} = ${N0} \\cdot e^{${r.toFixed(2)} \\cdot ${t}} = ${N0} \\cdot e^{${(r * t).toFixed(2)}} \\approx ${Nt}$.`;
  }
  
  return { qText, ansStr, solText, isFloat };
}

// ----------------------------------------------------
// Main Loop Execution
// ----------------------------------------------------
const TARGET_MCQ = 5000000;
const BATCH_SIZE = 50000;

const subjectsList = [
  { id: 1, name: 'Physics', generator: generatePhysicsQuestion },
  { id: 2, name: 'Chemistry', generator: generateChemistryQuestion },
  { id: 3, name: 'Botany', generator: (idx) => generateBiologyQuestion(idx, false) },
  { id: 4, name: 'Zoology', generator: (idx) => generateBiologyQuestion(idx, true) }
];

console.log('\n=== Step 3: Starting high-speed generation and insertion ===');
const startAll = Date.now();

for (const sub of subjectsList) {
  const subStart = Date.now();
  const subChList = chaptersBySubject[sub.id];
  if (!subChList || subChList.length === 0) {
    console.error(`No chapters found for subject ${sub.name}! Skipping.`);
    continue;
  }
  
  console.log(`\n--- Subject: ${sub.name} (ID: ${sub.id}) ---`);
  console.log(`Generating ${TARGET_MCQ} MCQs...`);
  
  db.exec('BEGIN TRANSACTION');
  for (let i = 0; i < TARGET_MCQ; i++) {
    const qId = currentQuestionId++;
    const chId = subChList[i % subChList.length];
    const { qText, ansStr, solText, isFloat } = sub.generator(i);
    const { options, correctLetter } = getOptions(ansStr, i, isFloat);
    
    const patternId = getQuestionPatternId(qText);
    // Insert Question
    runWithRetry(insertQuestion, [qId, practiceExamId, sub.id, chId, qText, 'single_choice', 'Hard', 4, -1, patternId]);
    
    // Insert Options (4 rows in 1 insert)
    runWithRetry(insertOptions4, [
      qId, options.A, options.A === ansStr ? 1 : 0,
      qId, options.B, options.B === ansStr ? 1 : 0,
      qId, options.C, options.C === ansStr ? 1 : 0,
      qId, options.D, options.D === ansStr ? 1 : 0
    ]);
    
    // Insert Solution
    runWithRetry(insertSolution, [qId, solText]);
    
    if ((i + 1) % BATCH_SIZE === 0) {
      db.exec('COMMIT');
      db.exec('BEGIN TRANSACTION');
      process.stdout.write(`Progress: ${i + 1} / ${TARGET_MCQ} (${Math.round(((i + 1) / TARGET_MCQ) * 100)}%)\r`);
    }
  }
  db.exec('COMMIT');
  console.log(`\nCompleted MCQs for ${sub.name}.`);
  console.log(`Subject ${sub.name} took ${Math.round((Date.now() - subStart) / 1000)} seconds.`);
}

console.log(`\n=== Re-enabling safety PRAGMAs & closing database ===`);
db.exec('PRAGMA foreign_keys = ON;');
db.close();

const finalDb = resolve('Qp/NEET.db');
console.log(`\n=== Step 4: Renaming NEET_temp.db to NEET.db ===`);
try {
  if (existsSync(finalDb)) {
    unlinkSync(finalDb);
  }
  renameSync(destDb, finalDb);
  console.log('🎉 Successfully renamed database to NEET.db!');
} catch (err) {
  console.warn(`\n⚠️ Warning: Could not overwrite Qp/NEET.db automatically (it might be open in your editor): ${err.message}`);
  console.warn(`👉 The generated database is safely saved at Qp/NEET_temp.db. Please close Qp/NEET.db in your editor and rename Qp/NEET_temp.db to Qp/NEET.db manually.`);
}

console.log(`\n🎉 Total process completed in ${Math.round((Date.now() - startAll) / 1000)} seconds!`);
console.log('Database is ready.');
