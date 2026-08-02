import { copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

function getQuestionPatternId(statement) {
  const normalized = statement
    .toLowerCase()
    .replace(/-?\b\d+(?:\.\d+)?\b/g, '#')
    .replace(/[^a-z]/g, '');
  return crypto.createHash('md5').update(normalized).digest('hex');
}

const srcDb = resolve('jee/DB/questions.db');
const destDb = resolve('jee/DB/jeebakend.DB');

console.log('=== Step 1: Copying questions.db to jeebakend.DB ===');
if (existsSync(destDb)) {
  console.log('Destination DB already exists. Overwriting...');
  unlinkSync(destDb);
}
copyFileSync(srcDb, destDb);
console.log('Successfully copied DB.');

console.log('\n=== Step 2: Connecting to jeebakend.DB ===');
const db = new DatabaseSync(destDb);

// Insert practice exam
const practiceExamId = 9999;
db.exec(`
  INSERT OR IGNORE INTO exams (id, name, year, type, duration_minutes, total_questions)
  VALUES (${practiceExamId}, 'JEE Hard Practice Pool', 2026, 'Main', 180, 100)
`);

// Load chapters
const chapters = db.prepare('SELECT id, subject_id FROM chapters').all();
const chaptersBySubject = { 1: [], 2: [], 3: [] };
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
db.exec('PRAGMA synchronous = OFF;');
db.exec('PRAGMA journal_mode = OFF;');
db.exec('PRAGMA temp_store = MEMORY;');
db.exec('PRAGMA foreign_keys = OFF;');

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
function generatePhysicsQuestion(index, type) {
  const isMCQ = (type === 'MCQ');
  const seed = isMCQ ? index : index + 10000000;
  
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
function generateChemistryQuestion(index, type) {
  const isMCQ = (type === 'MCQ');
  const seed = isMCQ ? index : index + 10000000;
  
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
// Mathematics Generator (Subject ID = 3)
// ----------------------------------------------------
function generateMathQuestion(index, type) {
  const isMCQ = (type === 'MCQ');
  const seed = isMCQ ? index : index + 10000000;
  
  const templateId = seed % 5;
  const paramIndex = Math.floor(seed / 5);
  
  let qText = '';
  let ansStr = '';
  let solText = '';
  let isFloat = false;
  
  if (templateId === 0) {
    const varNames = ['x', 'y', 't', 'u', 'z'];
    const vIdx = paramIndex % 5;
    let rem = Math.floor(paramIndex / 5);

    const aVal = (rem % 11) - 5; rem = Math.floor(rem / 11);
    const bVal = aVal + (rem % 10) + 1; rem = Math.floor(rem / 10);
    
    let cRaw = (rem % 15) - 7; if (cRaw >= 0) cRaw++; rem = Math.floor(rem / 15);
    let dRaw = (rem % 15) - 7; if (dRaw >= 0) dRaw++; rem = Math.floor(rem / 15);
    const eVal = (rem % 21) - 10;
    
    const cVal = 3 * cRaw;
    const dVal = 2 * dRaw;
    
    const valB = cRaw * Math.pow(bVal, 3) + dRaw * Math.pow(bVal, 2) + eVal * bVal;
    const valA = cRaw * Math.pow(aVal, 3) + dRaw * Math.pow(aVal, 2) + eVal * aVal;
    const I = valB - valA;
    
    qText = `Evaluate the definite integral: $\\int_{${aVal}}^{${bVal}} (${cVal}${varNames[vIdx]}^2 + ${dVal}${varNames[vIdx]} + ${eVal}) \\, d${varNames[vIdx]}$.`;
    ansStr = String(I);
    solText = `The antiderivative is $F(${varNames[vIdx]}) = ${cRaw}${varNames[vIdx]}^3 + ${dRaw}${varNames[vIdx]}^2 + ${eVal}${varNames[vIdx]}$. Evaluating from ${aVal} to ${bVal} gives $F(${bVal}) - F(${aVal}) = (${valB}) - (${valA}) = ${I}$.`;
  } 
  else if (templateId === 1) {
    let rem = paramIndex;
    const e = [];
    for (let i = 0; i < 9; i++) {
      e.push((rem % 5) - 2);
      rem = Math.floor(rem / 5);
    }
    const det = e[0]*(e[4]*e[8] - e[5]*e[7]) - e[1]*(e[3]*e[8] - e[5]*e[6]) + e[2]*(e[3]*e[7] - e[4]*e[6]);
    
    qText = `Find the determinant of the matrix: $A = \\begin{pmatrix} ${e[0]} & ${e[1]} & ${e[2]} \\\\ ${e[3]} & ${e[4]} & ${e[5]} \\\\ ${e[6]} & ${e[7]} & ${e[8]} \\end{pmatrix}$.`;
    ansStr = String(det);
    solText = `The determinant of matrix $A$ is $|A| = ${e[0]}(${e[4]} \\cdot ${e[8]} - ${e[5]} \\cdot ${e[7]}) - ${e[1]}(${e[3]} \\cdot ${e[8]} - ${e[5]} \\cdot ${e[6]}) + ${e[2]}(${e[3]} \\cdot ${e[7]} - ${e[4]} \\cdot ${e[6]}) = ${det}$.`;
  }
  else if (templateId === 2) {
    let rem = paramIndex;
    const x1 = (rem % 7) - 3; rem = Math.floor(rem / 7);
    const y1 = (rem % 7) - 3; rem = Math.floor(rem / 7);
    const z1 = (rem % 7) - 3; rem = Math.floor(rem / 7);
    const x2 = (rem % 7) - 3; rem = Math.floor(rem / 7);
    const y2 = (rem % 7) - 3; rem = Math.floor(rem / 7);
    const z2 = (rem % 7) - 3; rem = Math.floor(rem / 7);
    const kVal = (rem % 9) - 4;
    
    const cx = y1*z2 - z1*y2;
    const cy = z1*x2 - x1*z2;
    const cz = x1*y2 - y1*x2;
    const cross_mag_sq = cx*cx + cy*cy + cz*cz;
    const dot = x1*x2 + y1*y2 + z1*z2;
    const ans = cross_mag_sq + kVal * dot;
    
    qText = `Given two vectors $\\vec{a} = ${x1}\\hat{i} + ${y1}\\hat{j} + ${z1}\\hat{k}$ and $\\vec{b} = ${x2}\\hat{i} + ${y2}\\hat{j} + ${z2}\\hat{k}$. Find the value of $|\\vec{a} \\times \\vec{b}|^2 + ${kVal}(\\vec{a} \\cdot \\vec{b})$.`;
    ansStr = String(ans);
    solText = `First, compute $\\vec{a} \\times \\vec{b} = (${cx})\\hat{i} + (${cy})\\hat{j} + (${cz})\\hat{k}$. Its magnitude squared is $|\\vec{a} \\times \\vec{b}|^2 = ${cx}^2 + ${cy}^2 + ${cz}^2 = ${cross_mag_sq}$. Second, the dot product $\\vec{a} \\cdot \\vec{b} = ${x1}\\cdot${x2} + ${y1}\\cdot${y2} + ${z1}\\cdot${z2} = ${dot}$. Thus, the final value is ${cross_mag_sq} + ${kVal}(${dot}) = ${ans}$.`;
  }
  else if (templateId === 3) {
    const normals = [
      [1, 2, 2, 3],
      [2, 3, 6, 7],
      [1, 4, 8, 9],
      [4, 4, 7, 9]
    ];
    let rem = paramIndex;
    const normIdx = rem % 4; rem = Math.floor(rem / 4);
    const signIdx = rem % 8; rem = Math.floor(rem / 8);
    const x0 = (rem % 21) - 10; rem = Math.floor(rem / 21);
    const y0 = (rem % 21) - 10; rem = Math.floor(rem / 21);
    const z0 = (rem % 21) - 10; rem = Math.floor(rem / 21);
    const D = (rem % 41) - 20;
    
    let A = normals[normIdx][0];
    let B = normals[normIdx][1];
    let C = normals[normIdx][2];
    const denom = normals[normIdx][3];

    if (signIdx & 1) A = -A;
    if (signIdx & 2) B = -B;
    if (signIdx & 4) C = -C;

    const numerator = Math.abs(A * x0 + B * y0 + C * z0 + D);
    const dist = numerator / denom;
    ansStr = dist.toFixed(2);
    isFloat = true;
    
    qText = `Find the perpendicular distance of the point $P(${x0}, ${y0}, ${z0})$ from the plane $${A}x + ${B}y + ${C}z + ${D} = 0$. (Round to 2 decimal places).`;
    solText = `The perpendicular distance is given by $d = \\frac{|A x_0 + B y_0 + C z_0 + D|}{\\sqrt{A^2 + B^2 + C^2}} = \\frac{|${A}(${x0}) + ${B}(${y0}) + ${C}(${z0}) + ${D}|}{\\sqrt{${A}^2 + ${B}^2 + ${C}^2}} = \\frac{${numerator}}{${denom}} \\approx ${ansStr}$.`;
  }
  else {
    let rem = paramIndex;
    const bVal = (rem % 61) - 30; rem = Math.floor(rem / 61);
    const cVal = (rem % 101) - 50; rem = Math.floor(rem / 101);
    const kVal = (rem % 11) - 5; rem = Math.floor(rem / 11);
    const mVal = (rem % 11) - 5; rem = Math.floor(rem / 11);
    const varNames = ['x', 'y', 'z', 'u'];
    const vName = varNames[rem % 4];
    
    const sum2 = bVal*bVal - 2*cVal;
    const sum3 = 3*bVal*cVal - Math.pow(bVal, 3);
    const ans = kVal * sum2 + mVal * sum3;
    
    qText = `If $\\alpha$ and $\\beta$ are the roots of the quadratic equation $${vName}^2 + ${bVal === 0 ? '' : (bVal > 0 ? '+ ' + bVal : '- ' + Math.abs(bVal))}${vName} + ${cVal === 0 ? '0' : (cVal > 0 ? '+ ' + cVal : '- ' + Math.abs(cVal))} = 0$, find the value of ${kVal}(\\alpha^2 + \\beta^2) + ${mVal}(\\alpha^3 + \\beta^3)$.`;
    ansStr = String(ans);
    solText = `We know $\\alpha + \\beta = -b = ${-bVal}$ and $\\alpha\\beta = c = ${cVal}$. Thus, $\\alpha^2 + \\beta^2 = (\\alpha+\\beta)^2 - 2\\alpha\\beta = ${sum2}$. Also, $\\alpha^3 + \\beta^3 = (\\alpha+\\beta)^3 - 3\\alpha\\beta(\\alpha+\\beta) = ${sum3}$. Substituting these values, we get $${kVal}(${sum2}) + ${mVal}(${sum3}) = ${ans}$.`;
  }
  
  return { qText, ansStr, solText, isFloat };
}

// ----------------------------------------------------
// Main Loop Execution
// ----------------------------------------------------
const TARGET_MCQ = 5000000;
const TARGET_NUM = 1000000;
const BATCH_SIZE = 50000;

const subjectsList = [
  { id: 1, name: 'Physics', generator: generatePhysicsQuestion },
  { id: 2, name: 'Chemistry', generator: generateChemistryQuestion },
  { id: 3, name: 'Mathematics', generator: generateMathQuestion }
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
  
  // 1. Generate MCQs (single_choice)
  console.log(`Generating ${TARGET_MCQ} MCQs...`);
  db.exec('BEGIN TRANSACTION');
  for (let i = 0; i < TARGET_MCQ; i++) {
    const qId = currentQuestionId++;
    const chId = subChList[i % subChList.length];
    const { qText, ansStr, solText, isFloat } = sub.generator(i, 'MCQ');
    const { options, correctLetter } = getOptions(ansStr, i, isFloat);
    
    const patternId = getQuestionPatternId(qText);
    // Insert Question
    insertQuestion.run(qId, practiceExamId, sub.id, chId, qText, 'single_choice', 'Hard', 4, -1, patternId);
    
    // Insert Options (4 rows in 1 insert)
    insertOptions4.run(
      qId, options.A, options.A === ansStr ? 1 : 0,
      qId, options.B, options.B === ansStr ? 1 : 0,
      qId, options.C, options.C === ansStr ? 1 : 0,
      qId, options.D, options.D === ansStr ? 1 : 0
    );
    
    // Insert Solution
    insertSolution.run(qId, solText);
    
    if ((i + 1) % BATCH_SIZE === 0) {
      db.exec('COMMIT');
      db.exec('BEGIN TRANSACTION');
      process.stdout.write(`Progress (MCQ): ${i + 1} / ${TARGET_MCQ} (${Math.round(((i + 1) / TARGET_MCQ) * 100)}%)\r`);
    }
  }
  db.exec('COMMIT');
  console.log(`\nCompleted MCQs for ${sub.name}.`);

  // 2. Generate Numericals (numerical)
  console.log(`Generating ${TARGET_NUM} Numericals...`);
  db.exec('BEGIN TRANSACTION');
  for (let i = 0; i < TARGET_NUM; i++) {
    const qId = currentQuestionId++;
    const chId = subChList[i % subChList.length];
    const { qText, ansStr, solText } = sub.generator(i, 'Numerical');
    
    const patternId = getQuestionPatternId(qText);
    // Insert Question
    insertQuestion.run(qId, practiceExamId, sub.id, chId, qText, 'numerical', 'Hard', 4, 0, patternId);
    
    // Insert Solution
    insertSolution.run(qId, solText);
    
    if ((i + 1) % BATCH_SIZE === 0) {
      db.exec('COMMIT');
      db.exec('BEGIN TRANSACTION');
      process.stdout.write(`Progress (NUM): ${i + 1} / ${TARGET_NUM} (${Math.round(((i + 1) / TARGET_NUM) * 100)}%)\r`);
    }
  }
  db.exec('COMMIT');
  console.log(`\nCompleted Numericals for ${sub.name}.`);
  console.log(`Subject ${sub.name} took ${Math.round((Date.now() - subStart) / 1000)} seconds.`);
}

console.log(`\n=== Re-enabling safety PRAGMAs & closing database ===`);
db.exec('PRAGMA foreign_keys = ON;');
db.close();

console.log(`\n🎉 Total process completed in ${Math.round((Date.now() - startAll) / 1000)} seconds!`);
console.log('jeebakend.DB is ready and fully populated.');
