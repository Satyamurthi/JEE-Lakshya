import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const destDb = resolve('Qp/NEET.db');
const EXAM_ID = 9999;
const BATCH = 50000;
const TARGET = 5000000; // 5M per type per subject

console.log('=== NEET Special Questions Generator ===');
const db = new DatabaseSync(destDb);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA temp_store = MEMORY;');
db.exec('PRAGMA busy_timeout = 30000;');
db.exec('PRAGMA foreign_keys = OFF;');
db.exec('PRAGMA cache_size = -131072;');

console.log('Clearing existing generated special questions from NEET.db ...');
db.exec("DELETE FROM solutions WHERE question_id > 20060000");
db.exec("DELETE FROM options   WHERE question_id > 20060000");
db.exec("DELETE FROM questions WHERE id > 20060000");
console.log('Cleared.');

const maxIdResult = db.prepare('SELECT MAX(id) as m FROM questions').get();
let currentQId = (maxIdResult.m || 0) + 1;
console.log('Starting question ID:', currentQId);

const chapters = db.prepare('SELECT id, subject_id FROM chapters').all();
const chsBySubject = {};
for (const ch of chapters) {
  if (!chsBySubject[ch.subject_id]) chsBySubject[ch.subject_id] = [];
  chsBySubject[ch.subject_id].push(ch.id);
}

const insertQ = db.prepare(`INSERT INTO questions (id,exam_id,subject_id,chapter_id,question_text,type,difficulty,marks_correct,marks_incorrect) VALUES (?,?,?,?,?,?,'Hard',4,-1)`);
const insertO = db.prepare(`INSERT INTO options (question_id,option_text,is_correct) VALUES (?,?,?),(?,?,?),(?,?,?),(?,?,?)`);
const insertS = db.prepare(`INSERT INTO solutions (question_id,explanation_text) VALUES (?,?)`);

function runWithRetry(stmt, args, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try { stmt.run(...args); return; }
    catch (e) { if (i === retries) throw e; const t = Date.now(); while (Date.now()-t < 1000) {} }
  }
}

// Standard AR options
const AR_OPTS = [
  'Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A)',
  'Both Assertion (A) and Reason (R) are true, but Reason (R) is NOT the correct explanation of Assertion (A)',
  'Assertion (A) is true but Reason (R) is false',
  'Assertion (A) is false but Reason (R) is true'
];

// Match permutations (Perm0 is always the CORRECT natural matching)
const MATCH_PERMS = [
  'i-P, ii-Q, iii-R, iv-S',
  'i-Q, ii-P, iii-S, iv-R',
  'i-S, ii-R, iii-Q, iv-P',
  'i-R, ii-S, iii-P, iv-Q'
];
function matchOpts(correctIdx) {
  const opts = new Array(4);
  for (let k = 0; k < 4; k++) opts[(correctIdx + k) % 4] = MATCH_PERMS[k];
  return opts;
}

// ============================================================
// PHYSICS GENERATORS
// ============================================================

function generatePhysicsAR(index) {
  const variant = index % 4;
  const familyId = Math.floor(index / 4) % 5;
  const paramIdx = Math.floor(index / 20);
  let rem = paramIdx;
  const p1 = (rem % 97) + 3; rem = Math.floor(rem / 97);
  const p2 = (rem % 49) + 2; rem = Math.floor(rem / 49);
  const p3 = (rem % 29) + 1; rem = Math.floor(rem / 29);
  const p4 = rem % 19 + 1;

  let A, R, sol;
  if (familyId === 0) {
    const u = p1, a = p2 % 20 + 1, t = p3 % 9 + 1;
    const s = (u*t + 0.5*a*t*t).toFixed(1);
    const sStop = (u*u/(2*a)).toFixed(1);
    const aTrue = `Assertion (A): A particle starts with initial velocity $u = ${u}$ m/s and accelerates uniformly at $a = ${a}$ m/s². Distance covered in $t = ${t}$ s is $s = ${s}$ m.`;
    if (variant===0) { A=aTrue; R=`Reason (R): From kinematics, $s = ut + \\frac{1}{2}at^2 = ${u}\\times${t} + \\frac{1}{2}\\times${a}\\times${t}^2 = ${s}$ m, which directly proves the assertion.`; sol=`Both A and R are true. R uses the kinematic equation correctly and is the explanation of A.`; }
    else if (variant===1) { A=aTrue; R=`Reason (R): Newton's third law states every action has an equal and opposite reaction.`; sol=`A is correct (s=${s} m). R (Newton's 3rd law) is true but unrelated to computing distance. R is NOT the explanation of A.`; }
    else if (variant===2) { A=aTrue; R=`Reason (R): For uniform acceleration, distance is $s = \\frac{u^2}{2a} = ${sStop}$ m (the stopping distance formula).`; sol=`A is correct. R gives the stopping distance formula (v=0), not the general distance in time t. R is false as stated here.`; }
    else { A=`Assertion (A): A particle with $u = ${u}$ m/s decelerates at $a = ${a}$ m/s². It covers exactly $s = ${s}$ m in $t = ${t}$ s.`; R=`Reason (R): $s = ut + \\frac{1}{2}at^2 = ${u}\\times${t} + \\frac{1}{2}\\times${a}\\times${t}^2 = ${s}$ m.`; sol=`A is false: for deceleration, $s = ut - \\frac{1}{2}at^2 \\neq ${s}$ m. R uses the wrong sign and is the formula for acceleration, not deceleration.`; }
  } else if (familyId === 1) {
    const m = p1 % 50 + 1, F = (p2 % 20 + 1)*5, mu = ((p3 % 8)+1)*0.1;
    const fric = (mu*m*10).toFixed(1), net = (F - mu*m*10).toFixed(1), acc = net > 0 ? (parseFloat(net)/m).toFixed(2) : '0.00';
    const aTrue = `Assertion (A): A block of mass $m = ${m}$ kg on a horizontal surface ($\\mu = ${mu.toFixed(1)}$) is pushed with force $F = ${F}$ N. Its acceleration is $a = ${acc}$ m/s².`;
    if (variant===0) { A=aTrue; R=`Reason (R): Net force = $F - \\mu mg = ${F} - ${fric} = ${net}$ N. By Newton's 2nd law, $a = F_{net}/m = ${net}/${m} = ${acc}$ m/s².`; sol=`Both correct, R explains A using Newton's 2nd law with friction.`; }
    else if (variant===1) { A=aTrue; R=`Reason (R): The momentum of any system is conserved in the absence of external forces.`; sol=`A is correct. R (momentum conservation) is true but doesn't explain the block's acceleration calculation.`; }
    else if (variant===2) { A=aTrue; R=`Reason (R): Friction acts perpendicular to motion and does not affect the acceleration along the direction of F.`; sol=`A is correct. R is false: kinetic friction acts antiparallel to motion (opposing it), reducing net force and thus acceleration.`; }
    else { A=`Assertion (A): A block ($m = ${m}$ kg, $\\mu = ${mu.toFixed(1)}$) pushed by $F = ${F}$ N accelerates at $a = ${(F/m).toFixed(2)}$ m/s² (ignoring friction).`; R=`Reason (R): Net force includes friction: $F_{net} = ${F} - ${fric} = ${net}$ N.`; sol=`A is false: friction cannot be ignored. Correct acc = ${acc} m/s². R correctly includes friction in the net force.`; }
  } else if (familyId === 2) {
    const q1 = p1, q2 = p2 % 50 + 1, r = p3 % 8 + 1;
    const F_num = (9e9 * q1 * q2 * 1e-12 / (r*r)).toFixed(2);
    const F_wrong = (parseFloat(F_num)*2).toFixed(2);
    const aTrue = `Assertion (A): Two point charges $q_1 = ${q1}\\,\\mu$C and $q_2 = ${q2}\\,\\mu$C separated by $r = ${r}$ m in vacuum experience a force $F \\approx ${F_num}$ N.`;
    if (variant===0) { A=aTrue; R=`Reason (R): By Coulomb's law, $F = k\\frac{q_1 q_2}{r^2} = \\frac{9\\times10^9\\times${q1}\\times10^{-6}\\times${q2}\\times10^{-6}}{${r}^2} \\approx ${F_num}$ N.`; sol=`Both correct. Coulomb's law gives F = ${F_num} N and R explains A.`; }
    else if (variant===1) { A=aTrue; R=`Reason (R): Electric field lines originate from positive charges and terminate on negative charges.`; sol=`A is correct. R (field line property) is true but does not explain the magnitude of force. R is not the explanation of A.`; }
    else if (variant===2) { A=aTrue; R=`Reason (R): Electrostatic force is directly proportional to distance: $F \\propto r$.`; sol=`A is correct. R is false: Coulomb's law gives $F \\propto 1/r^2$ (inverse square), not $F \\propto r$.`; }
    else { A=`Assertion (A): Two charges $q_1 = ${q1}\\,\\mu$C, $q_2 = ${q2}\\,\\mu$C at $r = ${r}$ m. Force is $F = ${F_wrong}$ N.`; R=`Reason (R): Coulomb's law: $F = k q_1 q_2/r^2 \\approx ${F_num}$ N.`; sol=`A is false: correct force is ${F_num} N, not ${F_wrong} N. R correctly gives ${F_num} N via Coulomb's law.`; }
  } else if (familyId === 3) {
    const n2vals = [1.33, 1.5, 1.65, 2.0, 2.4]; const n2 = n2vals[p1 % 5];
    const tc = (Math.asin(1/n2)*180/Math.PI).toFixed(1);
    const aTrue = `Assertion (A): Light passes from a medium ($n = ${n2}$) to air. Total internal reflection occurs if the angle of incidence exceeds $\\theta_c \\approx ${tc}^\\circ$.`;
    if (variant===0) { A=aTrue; R=`Reason (R): Critical angle $\\theta_c = \\sin^{-1}(n_{air}/n) = \\sin^{-1}(1/${n2}) \\approx ${tc}^\\circ$. Beyond this angle, light cannot refract into air.`; sol=`Both correct. R derives θ_c and explains TIR.`; }
    else if (variant===1) { A=aTrue; R=`Reason (R): The speed of light in vacuum is $c = 3\\times10^8$ m/s.`; sol=`A is correct. R is true (speed of light) but unrelated to why TIR occurs at ${tc}°.`; }
    else if (variant===2) { A=aTrue; R=`Reason (R): TIR occurs when light goes from rarer to denser medium beyond the critical angle.`; sol=`A is correct. R is false: TIR requires going from DENSER (n=${n2}) to RARER (air) medium.`; }
    else { A=`Assertion (A): Light going from air to a medium of $n = ${n2}$ undergoes TIR beyond $\\theta_c = ${tc}^\\circ$.`; R=`Reason (R): Critical angle formula: $\\theta_c = \\sin^{-1}(1/${n2}) \\approx ${tc}^\\circ$.`; sol=`A is false: TIR requires going from denser to rarer medium. Light going from AIR to the medium cannot undergo TIR. R's formula is correct but applied to the wrong scenario.`; }
  } else {
    const T1 = (p1 % 16 + 5)*50, T2raw = (p2 % 8 + 2)*50, T2 = Math.min(T2raw, T1-100);
    const eta = ((1 - T2/T1)*100).toFixed(1);
    const etaWrong = (T2/T1*100).toFixed(1);
    const aTrue = `Assertion (A): A Carnot engine between hot source $T_H = ${T1}$ K and cold sink $T_L = ${T2}$ K has thermal efficiency $\\eta = ${eta}\\%$.`;
    if (variant===0) { A=aTrue; R=`Reason (R): $\\eta_{Carnot} = 1 - \\frac{T_L}{T_H} = 1 - \\frac{${T2}}{${T1}} = ${(parseFloat(eta)/100).toFixed(3)} = ${eta}\\%$.`; sol=`Both correct. Carnot efficiency formula gives ${eta}% and R explains A.`; }
    else if (variant===1) { A=aTrue; R=`Reason (R): The second law of thermodynamics states heat cannot spontaneously flow from cold to hot.`; sol=`A is correct (η=${eta}%). The second law (R) is true but doesn't derive the efficiency value. R is not the explanation of A.`; }
    else if (variant===2) { A=aTrue; R=`Reason (R): Carnot efficiency equals $\\eta = T_L/T_H = ${etaWrong}\\%$ (ratio of sink to source temperature).`; sol=`A is correct. R is false: correct formula is η = 1 - T_L/T_H = ${eta}%, not T_L/T_H = ${etaWrong}%.`; }
    else { A=`Assertion (A): Carnot engine with $T_H = ${T1}$ K, $T_L = ${T2}$ K has efficiency $\\eta = ${etaWrong}\\%$ (equal to $T_L/T_H$).`; R=`Reason (R): $\\eta_{Carnot} = 1 - T_L/T_H = 1 - ${T2}/${T1} = ${eta}\\%$.`; sol=`A is false: correct efficiency is ${eta}%, not ${etaWrong}%. R correctly derives ${eta}%.`; }
  }
  return { qText: `${A}\n${R}\n\nChoose the correct option:`, opts: AR_OPTS, correctIdx: variant, solText: sol, qType: 'assertion_reason' };
}

function generatePhysicsMatch(index) {
  const correctIdx = index % 4;
  const familyId = Math.floor(index / 4) % 5;
  const paramIdx = Math.floor(index / 20);
  let rem = paramIdx;
  const p1 = (rem % 80) + 1; rem = Math.floor(rem/80);
  const p2 = (rem % 60) + 2; rem = Math.floor(rem/60);
  const p3 = (rem % 40) + 1; rem = Math.floor(rem/40);
  const p4 = (rem % 30) + 1;

  const POOLS = [
    { // Pool 0: Physical quantities & SI units
      cols: [
        [`Force ($F = ${p1}\\times a$)`, `Newton (N) = kg·m·s$^{-2}$`],
        [`Pressure ($P = F/${p2}\\text{ m}^2$)`, `Pascal (Pa) = N·m$^{-2}$`],
        [`Energy ($KE = \\frac{1}{2}\\times${p3}\\times v^2$)`, `Joule (J) = kg·m$^2$·s$^{-2}$`],
        [`Power ($P = ${p4}$ J/s)`, `Watt (W) = J·s$^{-1}$`]
      ],
      topic: 'physical quantities and their SI units'
    },
    { // Pool 1: Laws & Discoverers  
      cols: [
        [`Law of Gravitation (Objects of mass $${p1}$ kg, $${p2}$ kg)`, `Isaac Newton (1687)`],
        [`Electromagnetic Induction ($\\varepsilon = -N\\frac{d\\Phi}{dt}$ for $N=${p3}$ turns)`, `Michael Faraday (1831)`],
        [`Photoelectric effect (threshold $\\nu_0$ for metal with $\\phi = ${p4}\\times10^{-19}$ J)`, `Albert Einstein (1905)`],
        [`Wave-particle duality ($\\lambda = h/p = h/${p1}\\times10^{-27}$ m)`, `Louis de Broglie (1924)`]
      ],
      topic: 'laws of physics and their discoverers'
    },
    { // Pool 2: Circuit elements & behavior
      cols: [
        [`Resistor $R = ${p1}\\,\\Omega$ in DC circuit`, `Current $I = V/R$ (Ohmic, no phase shift)`],
        [`Capacitor $C = ${p2}\\,\\mu$F at frequency $f = ${p3}$ Hz`, `Reactance $X_C = 1/(2\\pi f C)$ (current leads V by 90°)`],
        [`Inductor $L = ${p4}\\,m$H at frequency $f = ${p3}$ Hz`, `Reactance $X_L = 2\\pi f L$ (voltage leads I by 90°)`],
        [`LCR series circuit at resonance $f_0 = 1/(2\\pi\\sqrt{LC})$`, `Impedance minimum; current maximum; power factor = 1`]
      ],
      topic: 'circuit elements and their AC behavior'
    },
    { // Pool 3: Thermodynamic processes
      cols: [
        [`Isothermal process ($T = ${p1 + 273}$ K = constant)`, `$\\Delta U = 0$; $W = nRT\\ln(V_2/V_1)$`],
        [`Adiabatic process ($Q = 0$, $\\gamma = ${(1.3 + 0.1*(p2%5)).toFixed(1)}$)`, `$TV^{\\gamma-1} = $ constant; $\\Delta U = -W$`],
        [`Isobaric process ($P = ${p3}\\times10^5$ Pa = constant)`, `$W = P\\Delta V = nR\\Delta T$; $Q = nC_p\\Delta T$`],
        [`Isochoric process ($V = ${p4}$ L = constant)`, `$W = 0$; $\\Delta U = Q = nC_v\\Delta T$`]
      ],
      topic: 'thermodynamic processes and their characteristics'
    },
    { // Pool 4: Wave & optics phenomena
      cols: [
        [`Young's double slit (slit separation $d = ${p1}\\times10^{-4}$ m, $\\lambda = ${400+p2*5}$ nm)`, `Fringe width $\\beta = \\lambda D/d$`],
        [`Diffraction grating ($N = ${p3*100}$ lines/cm, $\\lambda = ${400+p4*10}$ nm)`, `$d\\sin\\theta = m\\lambda$ (grating equation)`],
        [`Polarization by reflection at Brewster's angle ($n = ${(1.4+0.1*(p1%6)).toFixed(1)}$)`, `$\\tan\\theta_B = n$; reflected light fully polarized`],
        [`Doppler effect (source speed $v_s = ${p2%30+5}$ m/s toward observer)`, `Observed frequency $f' = f\\frac{v+v_o}{v-v_s}$ (blue-shifted)`]
      ],
      topic: 'wave optics phenomena and their formulas'
    }
  ];

  const pool = POOLS[familyId];
  const qText = `Match the items in Column I with their correct match in Column II:\n\nColumn I                                           | Column II\n(i)   ${pool.cols[0][0].padEnd(50)} | (P)  ${pool.cols[0][1]}\n(ii)  ${pool.cols[1][0].padEnd(50)} | (Q)  ${pool.cols[1][1]}\n(iii) ${pool.cols[2][0].padEnd(50)} | (R)  ${pool.cols[2][1]}\n(iv)  ${pool.cols[3][0].padEnd(50)} | (S)  ${pool.cols[3][1]}\n\nSelect the correct matching for ${pool.topic}:`;
  const solText = `The correct matching is: (i)→P, (ii)→Q, (iii)→R, (iv)→S. ${pool.cols.map((c,i)=>`(${['i','ii','iii','iv'][i]}) ${c[0].replace(/\$.+?\$/g,'[formula]')} matches (${['P','Q','R','S'][i]}) ${c[1].replace(/\$.+?\$/g,'[formula]')}`).join('; ')}.`;
  return { qText, opts: matchOpts(correctIdx), correctIdx, solText, qType: 'match_following' };
}

function generatePhysicsDiagram(index) {
  const familyId = index % 5;
  const paramIdx = Math.floor(index / 5);
  let rem = paramIdx;
  const p1 = (rem % 80) + 2; rem = Math.floor(rem/80);
  const p2 = (rem % 60) + 1; rem = Math.floor(rem/60);
  const p3 = (rem % 40) + 1; rem = Math.floor(rem/40);
  const p4 = (rem % 30) + 2;

  let qText, opts, correctIdx, solText;

  if (familyId === 0) {
    // Circuit diagram
    const R1 = p1, R2 = p2, R3 = p3, V = p4 * 3;
    const Rpar = (R1*R2/(R1+R2)).toFixed(2);
    const Rtotal = (parseFloat(Rpar) + R3).toFixed(2);
    const Itotal = (V/parseFloat(Rtotal)).toFixed(2);
    const correctAns = Itotal;
    const w1 = (parseFloat(Itotal)+0.5).toFixed(2), w2 = (V/(R1+R2+R3)).toFixed(2), w3 = (V/R3).toFixed(2);
    opts = [correctAns, w1, w2, w3]; correctIdx = 0;
    qText = `In the circuit diagram below, resistors $R_1 = ${R1}\\,\\Omega$ and $R_2 = ${R2}\\,\\Omega$ are connected in parallel, and this combination is connected in series with $R_3 = ${R3}\\,\\Omega$. A battery of EMF $V = ${V}$ V (negligible internal resistance) is connected across the circuit.\n\n  [+V–]——[R₃=${R3}Ω]——+——[R₁=${R1}Ω]——+\n                       |                  |\n                       +——[R₂=${R2}Ω]——+\n\nWhat is the total current drawn from the battery?`;
    solText = `Parallel combination: $R_{12} = \\frac{R_1 R_2}{R_1+R_2} = \\frac{${R1}\\times${R2}}{${R1}+${R2}} = ${Rpar}\\,\\Omega$. Total resistance: $R_{total} = R_{12} + R_3 = ${Rpar} + ${R3} = ${Rtotal}\\,\\Omega$. Current: $I = V/R_{total} = ${V}/${Rtotal} = ${Itotal}$ A.`;
  } else if (familyId === 1) {
    // V-t graph → find displacement
    const u = p1, a = p2 % 15 + 1, t = p3 % 8 + 2;
    const vFinal = u + a*t, s = u*t + 0.5*a*t*t;
    opts = [`${s.toFixed(0)} m`, `${(s*2).toFixed(0)} m`, `${(0.5*vFinal*t).toFixed(0)} m`, `${(vFinal*t).toFixed(0)} m`];
    correctIdx = 0;
    qText = `The velocity-time (v-t) graph of a particle is shown below:\n\nVelocity↑\n${vFinal} m/s |              ╱\n${u} m/s    |    ╱\n           |  ╱  (slope = ${a} m/s²)\n      0    +——————————→ Time\n           0          ${t} s\n\nThe particle starts at $v_0 = ${u}$ m/s at $t = 0$ and the graph shows uniform acceleration. The displacement of the particle in $t = ${t}$ s is:`;
    solText = `From the v-t graph, initial velocity $u = ${u}$ m/s, acceleration (slope) $a = ${a}$ m/s². Displacement = area under v-t graph = $ut + \\frac{1}{2}at^2 = ${u}\\times${t} + \\frac{1}{2}\\times${a}\\times${t}^2 = ${s.toFixed(0)}$ m.`;
  } else if (familyId === 2) {
    // Ray optics - convex lens
    const f = p1 % 20 + 10, u_obj = -(p2 % 30 + 20);
    const v = 1/(1/f - 1/u_obj);
    const m = (v/u_obj).toFixed(2);
    const vRound = v.toFixed(1);
    opts = [`$v = ${vRound}$ cm, $m = ${m}$`, `$v = ${(-v).toFixed(1)}$ cm, $m = ${(-parseFloat(m)).toFixed(2)}$`, `$v = ${(f*2).toFixed(1)}$ cm, $m = -1.00$`, `$v = ${(f).toFixed(1)}$ cm, $m = \\infty$`];
    correctIdx = 0;
    qText = `A convex lens of focal length $f = ${f}$ cm is used to form the image of an object. In the diagram below, an object (arrow ↑) is placed at distance $u = ${Math.abs(u_obj)}$ cm to the left of the lens:\n\n  Object         Lens (f=${f}cm)    Image(?)\n  ↑              ||\n  |——${Math.abs(u_obj)} cm——||——?——|\n                 ||\n\nUsing the lens formula $\\frac{1}{v} - \\frac{1}{u} = \\frac{1}{f}$, find the image distance $v$ and magnification $m$:`;
    solText = `Lens formula: $\\frac{1}{v} - \\frac{1}{${u_obj}} = \\frac{1}{${f}}$. So $\\frac{1}{v} = \\frac{1}{${f}} + \\frac{1}{${u_obj}} = \\frac{${u_obj} + ${f}}{${f}\\times${u_obj}}$. $v = ${vRound}$ cm. Magnification $m = v/u = ${vRound}/${u_obj} = ${m}$.`;
  } else if (familyId === 3) {
    // Standing waves on a string
    const L = p1, mu_mass = p2 % 10 + 1, T = p3 * 10, n = p4 % 4 + 1;
    const v_wave = Math.sqrt(T / (mu_mass * 1e-3));
    const freq = (n * v_wave / (2 * L)).toFixed(1);
    opts = [`${freq} Hz`, `${(parseFloat(freq)*2).toFixed(1)} Hz`, `${(parseFloat(freq)/2).toFixed(1)} Hz`, `${(v_wave/(2*L)).toFixed(1)} Hz`];
    correctIdx = 0;
    qText = `A string of length $L = ${L}$ m and linear mass density $\\mu = ${mu_mass}\\times10^{-3}$ kg/m is under tension $T = ${T}$ N. The diagram shows the string vibrating in its $n = ${n}$th harmonic mode:\n\n  Fixed end                            Fixed end\n  |~~~~~${'~'.repeat(n*6)}~~~~~|\n  |←————————$${L}$ m————————→|\n  (${n} loop${n>1?'s':''})\n\nWhat is the frequency of this mode of vibration?`;
    solText = `Wave speed: $v = \\sqrt{T/\\mu} = \\sqrt{${T}/${mu_mass}\\times10^{-3}} = ${v_wave.toFixed(1)}$ m/s. For $n = ${n}$th harmonic on a string fixed at both ends: $f_n = \\frac{nv}{2L} = \\frac{${n}\\times${v_wave.toFixed(1)}}{2\\times${L}} = ${freq}$ Hz.`;
  } else {
    // Energy levels / atomic spectra
    const Z = p1 % 4 + 1, n1 = p2 % 3 + 1, n2 = n1 + p3 % 3 + 1;
    const E1 = -13.6 * Z * Z;
    const En1 = (E1/(n1*n1)).toFixed(2), En2 = (E1/(n2*n2)).toFixed(2);
    const deltaE = (parseFloat(En1) - parseFloat(En2)).toFixed(2);
    const lambda = (1240 / parseFloat(deltaE)).toFixed(0);
    opts = [`${lambda} nm`, `${(parseFloat(lambda)*2).toFixed(0)} nm`, `${(parseFloat(lambda)/2).toFixed(0)} nm`, `${(parseFloat(lambda)*1.5).toFixed(0)} nm`];
    correctIdx = 0;
    qText = `The energy level diagram of a hydrogen-like atom (atomic number $Z = ${Z}$) is shown below:\n\n  Energy (eV)\n  $n=${n2}$: $E_{${n2}} = ${En2}$ eV ————————\n        ↑\n        | Transition ($\\Delta E = ${deltaE}$ eV)\n        ↓\n  $n=${n1}$: $E_{${n1}} = ${En1}$ eV ————————\n\nA photon is emitted when an electron transitions from $n = ${n2}$ to $n = ${n1}$. What is the wavelength of this photon?`;
    solText = `Energy difference: $\\Delta E = E_{${n1}} - E_{${n2}} = ${En1} - (${En2}) = ${deltaE}$ eV. Using $E = hc/\\lambda$: $\\lambda = \\frac{1240\\text{ eV·nm}}{${deltaE}\\text{ eV}} \\approx ${lambda}$ nm.`;
  }
  return { qText, opts, correctIdx, solText, qType: 'diagram_based' };
}

function generatePhysicsStatement(index) {
  const familyId = index % 5;
  const paramIdx = Math.floor(index / 5);
  let rem = paramIdx;
  const p1 = (rem % 70) + 1; rem = Math.floor(rem/70);
  const p2 = (rem % 50) + 1; rem = Math.floor(rem/50);
  const p3 = (rem % 30) + 1; rem = Math.floor(rem/30);
  const correctPattern = rem % 6;

  const TOPICS = [
    {
      title: 'Newton\'s Laws and Motion',
      trueStmts: [
        `Newton's first law is also known as the law of inertia — a body remains at rest or in uniform motion unless acted upon by a net external force.`,
        `For uniform circular motion, the centripetal acceleration is directed toward the center of the circle and has magnitude $a_c = v^2/r$.`,
        `Newton's third law states that for every action, there is an equal and opposite reaction, but these forces act on DIFFERENT bodies.`,
        `The work-energy theorem states that the net work done on a particle equals its change in kinetic energy: $W_{net} = \\Delta KE$.`
      ],
      falseStmts: [
        `The centripetal force in circular motion does positive work on the object since it causes continuous change in direction.`,
        `In Newton's third law, the action and reaction forces can cancel each other as they act on the same body.`
      ]
    },
    {
      title: 'Electrostatics and Current Electricity',
      trueStmts: [
        `Electric field lines are always perpendicular to equipotential surfaces at every point.`,
        `The potential energy of a system of two charges is positive when both charges have the same sign and negative when they have opposite signs.`,
        `Ohm's law ($V = IR$) holds only for ohmic conductors — materials where resistance is independent of applied voltage.`,
        `Kirchhoff's current law (KCL) states that the algebraic sum of currents at any node in a circuit is zero.`
      ],
      falseStmts: [
        `Electric field lines can intersect each other at points where the field is very strong.`,
        `A conductor in electrostatic equilibrium has a non-zero electric field inside its bulk.`
      ]
    },
    {
      title: 'Thermodynamics',
      trueStmts: [
        `In an isothermal process for an ideal gas, internal energy remains constant since $U$ depends only on temperature.`,
        `The efficiency of a Carnot engine depends only on the temperatures of the hot and cold reservoirs.`,
        `The first law of thermodynamics is a statement of energy conservation: $\\Delta U = Q - W$.`,
        `In an adiabatic process, no heat is exchanged with the surroundings ($Q = 0$).`
      ],
      falseStmts: [
        `A Carnot engine operating between 300 K and 600 K has efficiency of 100%.`,
        `In an isothermal process, work done by the gas is always zero.`
      ]
    },
    {
      title: 'Modern Physics',
      trueStmts: [
        `The photoelectric effect shows that light behaves as particles (photons) with energy $E = h\\nu$.`,
        `Radioactive decay follows an exponential law: $N(t) = N_0 e^{-\\lambda t}$, where $\\lambda$ is the decay constant.`,
        `The de Broglie wavelength of a particle is $\\lambda = h/p$, showing wave-particle duality for matter.`,
        `In nuclear fission, the mass of the products is slightly less than the reactants — this mass defect appears as energy.`
      ],
      falseStmts: [
        `Increasing the intensity of light increases the maximum kinetic energy of photoelectrons.`,
        `Alpha particles have higher penetrating power than gamma rays.`
      ]
    },
    {
      title: 'Waves and Sound',
      trueStmts: [
        `In a transverse wave, the displacement of particles is perpendicular to the direction of wave propagation.`,
        `Beats are produced when two sound waves of slightly different frequencies superpose.`,
        `In the Doppler effect, when the source moves toward the observer, the observed frequency increases.`,
        `The intensity of sound is proportional to the square of the amplitude of the wave.`
      ],
      falseStmts: [
        `Sound travels faster in vacuum than in air because there is no medium resistance.`,
        `The speed of sound depends on frequency — higher frequency sound travels faster.`
      ]
    }
  ];

  const topic = TOPICS[familyId];
  const ts = topic.trueStmts, fs = topic.falseStmts;
  
  const patterns = [
    { stmts: [ts[p1%ts.length], ts[p2%ts.length], ts[p3%ts.length]], correct: 'Statements I, II and III are all correct', wrongOpts: ['Statements I and II only', 'Statement III only', 'Statements II and III only'] },
    { stmts: [ts[p1%ts.length], ts[p2%ts.length], fs[p3%fs.length]], correct: 'Statements I and II only', wrongOpts: ['Statements I, II and III', 'Statement II only', 'Statements II and III only'] },
    { stmts: [ts[p1%ts.length], fs[p2%fs.length], ts[p3%ts.length]], correct: 'Statements I and III only', wrongOpts: ['Statements I, II and III', 'Statement I only', 'Statements II and III only'] },
    { stmts: [ts[p1%ts.length], fs[p2%fs.length], fs[p3%fs.length]], correct: 'Statement I only', wrongOpts: ['Statements I and II only', 'Statements I, II and III', 'None of the statements'] },
    { stmts: [fs[p1%fs.length], ts[p2%ts.length], ts[p3%ts.length]], correct: 'Statements II and III only', wrongOpts: ['Statements I and II only', 'Statements I, II and III', 'Statement III only'] },
    { stmts: [fs[p1%fs.length], fs[p2%fs.length], ts[p3%ts.length]], correct: 'Statement III only', wrongOpts: ['None of the statements', 'Statements I and III only', 'Statements I, II and III'] }
  ];

  const pat = patterns[correctPattern];
  const qText = `Which of the following statements about **${topic.title}** is/are CORRECT?\n\nStatement I: ${pat.stmts[0]}\nStatement II: ${pat.stmts[1]}\nStatement III: ${pat.stmts[2]}`;
  const correctIdx = p1 % 4;
  const allOpts = [pat.correct, ...pat.wrongOpts];
  const opts = new Array(4);
  for (let k = 0; k < 4; k++) opts[(correctIdx + k) % 4] = allOpts[k];
  const solText = `${pat.correct} is/are correct. Statement I: ${pat.stmts[0].slice(0,60)}... Statement II: ${pat.stmts[1].slice(0,60)}... Statement III: ${pat.stmts[2].slice(0,60)}...`;
  return { qText, opts, correctIdx, solText, qType: 'statement_based' };
}

// ============================================================
// CHEMISTRY GENERATORS
// ============================================================

function generateChemistryAR(index) {
  const variant = index % 4;
  const familyId = Math.floor(index / 4) % 5;
  const paramIdx = Math.floor(index / 20);
  let rem = paramIdx;
  const p1 = (rem % 97) + 2; rem = Math.floor(rem/97);
  const p2 = (rem % 61) + 1; rem = Math.floor(rem/61);
  const p3 = (rem % 41) + 1; rem = Math.floor(rem/41);
  const p4 = rem % 19 + 1;

  let A, R, sol;
  if (familyId === 0) {
    const elements = ['Li','Na','K','Rb','Cs','Be','Mg','Ca','Sr','Ba','F','Cl','Br','I','O','S'];
    const elem = elements[p1 % elements.length];
    const periods = { Li:2,Na:3,K:4,Rb:5,Cs:6,Be:2,Mg:3,Ca:4,Sr:5,Ba:6,F:2,Cl:3,Br:4,I:5,O:2,S:3 };
    const period = periods[elem] || 3;
    const facts = [
      [`Electronegativity of elements increases across a period (left to right) in the periodic table.`,`Across a period, nuclear charge increases while the number of shells remains constant, increasing the effective nuclear charge and thus electronegativity.`],
      [`Atomic radius decreases across a period from left to right in the periodic table.`,`Increasing nuclear charge across a period attracts electrons more strongly toward the nucleus, reducing atomic radius.`],
      [`Ionization energy generally increases across a period from left to right.`,`As nuclear charge increases across a period with the same principal quantum number shell, the energy required to remove an electron increases.`],
      [`Electron affinity of elements generally becomes more negative (more exothermic) across a period.`,`Increasing nuclear charge across a period makes the atom attract incoming electrons more strongly, releasing more energy.`]
    ];
    const fact = facts[p2 % facts.length];
    const trueA = `Assertion (A): ${fact[0]}`;
    const trueR_correct = `Reason (R): ${fact[1]}`;
    const trueR_unrelated = `Reason (R): Isotopes of an element have the same atomic number but different mass numbers.`;
    const falseR = `Reason (R): Across a period, the number of electron shells increases, causing the atomic properties to change.`;
    const falseA = `Assertion (A): ${fact[0].replace('increases','decreases').replace('decreases','increases')}`;
    if (variant===0){A=trueA;R=trueR_correct;sol=`Both true; R correctly explains the periodic trend.`;}
    else if(variant===1){A=trueA;R=trueR_unrelated;sol=`A is correct. R (isotopes) is true but unrelated to the periodic trend. R is not the explanation of A.`;}
    else if(variant===2){A=trueA;R=falseR;sol=`A is correct. R is false: across a period, the number of shells remains the same (same period = same number of shells). Only nuclear charge increases.`;}
    else{A=falseA;R=trueR_correct;sol=`A is false — the trend is opposite to what is stated. R correctly states the explanation.`;}
  } else if (familyId === 1) {
    const k1 = (p1 % 100) * 0.01, k2 = k1 * (1 + p2*0.1), T1 = 300 + p3*10, T2 = T1 + p4*10;
    const R_const = 8.314;
    const Ea = (R_const * Math.log(k2/k1) * T1 * T2 / (T2-T1) / 1000).toFixed(1);
    const trueA = `Assertion (A): The rate constant of a reaction increases with temperature because the fraction of molecules having energy equal to or greater than activation energy increases.`;
    const trueR_correct = `Reason (R): By Arrhenius equation $k = Ae^{-E_a/RT}$, as temperature $T$ increases, the exponential factor increases, so $k$ increases. The fraction of molecules with $E \\geq E_a$ is $e^{-E_a/RT}$.`;
    const trueR_unrelated = `Reason (R): The order of a reaction is determined experimentally and cannot be predicted from the balanced chemical equation.`;
    const falseR = `Reason (R): Increasing temperature decreases activation energy, hence increasing rate constant.`;
    const falseA = `Assertion (A): The rate constant of a reaction decreases with temperature because molecules lose kinetic energy at higher temperatures.`;
    if(variant===0){A=trueA;R=trueR_correct;sol=`Both true; Arrhenius equation explains the temperature dependence of k.`;}
    else if(variant===1){A=trueA;R=trueR_unrelated;sol=`A is correct. R (order vs equation) is true but doesn't explain why k increases with temperature.`;}
    else if(variant===2){A=trueA;R=falseR;sol=`A is correct. R is false: temperature does NOT decrease activation energy. Ea is a property of the reaction, independent of temperature.`;}
    else{A=falseA;R=trueR_correct;sol=`A is false: k increases (not decreases) with temperature. R correctly explains why k increases.`;}
  } else if (familyId === 2) {
    const Ka = ((p1 % 90 + 1)*1e-5).toExponential(1), pKa = (-Math.log10(parseFloat(Ka))).toFixed(1);
    const trueA = `Assertion (A): A solution with $K_a = ${Ka}$ for the weak acid has $pK_a = ${pKa}$. At the half-equivalence point in a titration, the pH equals $pK_a = ${pKa}$.`;
    const trueR_correct = `Reason (R): At half-equivalence point, $[\\text{acid}] = [\\text{salt}]$. By Henderson-Hasselbalch: pH $= pK_a + \\log\\frac{[\\text{salt}]}{[\\text{acid}]} = pK_a + 0 = ${pKa}$.`;
    const trueR_unrelated = `Reason (R): Strong acids completely dissociate in water, giving $[H^+]$ equal to their molar concentration.`;
    const falseR = `Reason (R): At the half-equivalence point, the concentration of salt is zero and acid is maximum.`;
    const falseA = `Assertion (A): A buffer solution of a weak acid ($pK_a = ${pKa}$) and its salt always has pH = 7 regardless of concentrations.`;
    if(variant===0){A=trueA;R=trueR_correct;sol=`Both true. Henderson-Hasselbalch equation proves pH = pKa at half-equivalence point.`;}
    else if(variant===1){A=trueA;R=trueR_unrelated;sol=`A is correct. R (strong acid dissociation) is true but doesn't explain the buffer pH at half-equivalence point.`;}
    else if(variant===2){A=trueA;R=falseR;sol=`A is correct. R is false: at half-equivalence point, [acid] = [salt] ≠ 0 for either.`;}
    else{A=falseA;R=trueR_correct;sol=`A is false: buffer pH = pKa + log([salt]/[acid]), which equals pKa only when [salt]=[acid], not always 7. R correctly gives the Henderson-Hasselbalch equation.`;}
  } else if (familyId === 3) {
    const organicFacts = [
      [`Benzene undergoes electrophilic substitution rather than addition despite having three double bonds.`,`Benzene's aromatic ring (6π electrons, Hückel's rule: $4n+2$ where $n=1$) is thermodynamically stable; addition would destroy aromaticity.`],
      [`The boiling point of alcohols is much higher than corresponding alkanes of similar molecular mass.`,`Alcohols form intermolecular hydrogen bonds due to the $-OH$ group, requiring more energy to overcome these bonds during vaporization.`],
      [`Carboxylic acids are stronger acids than alcohols despite both having $-OH$ groups.`,`The carboxylate ion ($-COO^-$) is stabilized by resonance (delocalization of negative charge over two oxygen atoms), making proton donation more favorable in $-COOH$ than in $-OH$.`],
      [`Aldehydes are more reactive than ketones toward nucleophilic addition.`,`In aldehydes, the carbonyl carbon has less steric hindrance (one $H$ + one $R$) compared to ketones (two $R$ groups), and no electron-donating alkyl groups that would decrease electrophilicity.`]
    ];
    const fact = organicFacts[p1 % organicFacts.length];
    const trueA = `Assertion (A): ${fact[0]}`;
    const trueR_correct = `Reason (R): ${fact[1]}`;
    const trueR_unrelated = `Reason (R): Hund's rule states that electrons fill orbitals of equal energy singly before pairing.`;
    const falseR = `Assertion (A) is wrong`; // placeholder
    if(variant===0){A=trueA;R=trueR_correct;sol=`Both true; R correctly explains the organic chemistry principle.`;}
    else if(variant===1){A=trueA;R=trueR_unrelated;sol=`A is correct. R (Hund's rule) is true but completely unrelated to organic reactivity. R is not the explanation of A.`;}
    else if(variant===2){A=trueA;R=`Reason (R): The property described is due to inductive effects only, with no role of resonance or steric factors.`;sol=`A is correct. R oversimplifies or is false — the reason involves resonance, H-bonding, or steric effects as appropriate, not just induction.`;}
    else{A=`Assertion (A): ${fact[0].replace('more','less').replace('higher','lower').replace('stronger','weaker').replace('rather than addition','rather than substitution').replace('less','more').replace('lower','higher').replace('weaker','stronger').replace('rather than substitution','rather than addition')}`;R=trueR_correct;sol=`A is false (the opposite is true). R correctly explains the real trend.`;}
  } else {
    const cell = `Zn|ZnSO₄(${(p1*0.01).toFixed(2)} M)||CuSO₄(${(p2*0.01).toFixed(2)} M)|Cu`;
    const E0 = (0.34 - (-0.76)).toFixed(2);
    const Ecell = (parseFloat(E0) - 0.0592/2 * Math.log10(p1/p2)).toFixed(3);
    const trueA = `Assertion (A): In the Daniell cell ($${cell}$), the standard EMF is $E^\\circ_{cell} = ${E0}$ V (at 298 K).`;
    const trueR_correct = `Reason (R): $E^\\circ_{cell} = E^\\circ_{cathode} - E^\\circ_{anode} = E^\\circ_{Cu^{2+}/Cu} - E^\\circ_{Zn^{2+}/Zn} = 0.34 - (-0.76) = ${E0}$ V.`;
    const trueR_unrelated = `Reason (R): Faraday's first law states that the mass of substance deposited during electrolysis is proportional to the quantity of electricity passed.`;
    const falseR = `Reason (R): The EMF of a cell is always equal to the algebraic sum of both electrode potentials (not the difference).`;
    const falseA = `Assertion (A): In the Daniell cell, the standard EMF is $E^\\circ_{cell} = ${(-parseFloat(E0)).toFixed(2)}$ V (negative, spontaneous in reverse direction).`;
    if(variant===0){A=trueA;R=trueR_correct;sol=`Both true. E°_cell = E°_cathode - E°_anode = 0.34 - (-0.76) = ${E0} V. R explains A.`;}
    else if(variant===1){A=trueA;R=trueR_unrelated;sol=`A is correct. R (Faraday's electrolysis law) is true but doesn't explain how E°_cell is calculated.`;}
    else if(variant===2){A=trueA;R=falseR;sol=`A is correct. R is false: EMF = E°_cathode − E°_anode (difference), not sum.`;}
    else{A=falseA;R=trueR_correct;sol=`A is false: the Daniell cell operates spontaneously with positive E° = ${E0} V, not negative. R correctly calculates the positive E°.`;}
  }
  return { qText: `${A}\n${R}\n\nChoose the correct option:`, opts: AR_OPTS, correctIdx: variant, solText: sol, qType: 'assertion_reason' };
}

function generateChemistryMatch(index) {
  const correctIdx = index % 4;
  const familyId = Math.floor(index / 4) % 5;
  const paramIdx = Math.floor(index / 20);
  let rem = paramIdx;
  const p1 = (rem % 80) + 1; rem = Math.floor(rem/80);
  const p2 = (rem % 60) + 1; rem = Math.floor(rem/60);
  const p3 = (rem % 40) + 1; rem = Math.floor(rem/40);
  const p4 = rem % 20 + 1;

  const POOLS = [
    { topic: 'organic functional groups and their reactions',
      cols: [
        [`$-OH$ (Alcohol, e.g., $C_${p1}H_{${2*p1+2}}OH$)`, `Undergoes esterification with carboxylic acid (Fischer esterification)`],
        [`$-COOH$ (Carboxylic acid, $M = ${p2*12+32}$ g/mol)`, `Undergoes decarboxylation to give alkane + CO₂`],
        [`$-CHO$ (Aldehyde in ${p3}-carbon chain)`, `Gives positive Tollens' test (silver mirror); reduces Fehling's solution`],
        [`$-NH_2$ (Primary amine, with ${p4} carbons)`, `Reacts with HNO₂ at 0–5°C to form diazonium salt`]
      ]
    },
    { topic: 'quantum numbers and their significance',
      cols: [
        [`Principal quantum number $n = ${p1 % 4 + 1}$`, `Determines the main energy level (shell) and size of orbital`],
        [`Azimuthal quantum number $l = ${p2 % 3}$`, `Determines the shape of orbital (s, p, d, f)`],
        [`Magnetic quantum number $m_l = ${p3 % 5 - 2}$`, `Determines the orientation of orbital in space`],
        [`Spin quantum number $m_s = +\\frac{1}{2}$ or $-\\frac{1}{2}$`, `Determines the intrinsic spin of the electron`]
      ]
    },
    { topic: 'colligative properties and their formulas',
      cols: [
        [`Relative lowering of vapor pressure ($X_{solute} = ${(p1*0.001).toFixed(3)}$)`, `$\\frac{P^0 - P_s}{P^0} = X_{solute}$ (Raoult's law)`],
        [`Elevation in boiling point ($K_b = ${(p2*0.05+0.5).toFixed(2)}$ K·kg/mol)`, `$\\Delta T_b = i K_b m$ (depends on molality and van't Hoff factor)`],
        [`Depression in freezing point ($K_f = ${(p3*0.1+1).toFixed(1)}$ K·kg/mol)`, `$\\Delta T_f = i K_f m$ (used to determine molar mass)`],
        [`Osmotic pressure ($C = ${(p4*0.01).toFixed(2)}$ M, $T = 298$ K)`, `$\\Pi = iCRT = i\\times${(p4*0.01).toFixed(2)}\\times0.0821\\times298$ atm`]
      ]
    },
    { topic: 'types of chemical bonds and their characteristics',
      cols: [
        [`Ionic bond (e.g., NaCl, $\\Delta\\chi = ${(1.5+p1*0.05).toFixed(1)}$)`, `Non-directional; high melting point; conducts electricity in molten/aqueous state`],
        [`Covalent bond (e.g., H₂, bond order = ${p2%3+1})`, `Directional; forms molecules; low melting point; poor conductor`],
        [`Metallic bond (${['Na','Cu','Fe','Al','Mg'][p3%5]}, free electron model)`, `Non-directional; high conductivity; malleable and ductile`],
        [`Hydrogen bond (e.g., in H₂O, $O-H···O$ with bond strength $\\approx${20+p4}$ kJ/mol)`, `Intermolecular/intramolecular; responsible for anomalous properties of water`]
      ]
    },
    { topic: 'coordination compounds and their components',
      cols: [
        [`$[Co(NH_3)_${p1%4+3}Cl_{${6-(p1%4+3)}}]^{${p1%4+3-6>0?'+'+Math.abs(p1%4+3-6):p1%4+3-6}}$`, `Central metal ion: Co${3>0?'³⁺':'²⁺'}; Ligands: NH₃ (neutral) and Cl⁻ (anionic)`],
        [`EDTA ($Y^{4-}$, hexadentate ligand with $${p2}$ donor atoms)`, `Forms highly stable chelates (ring structures) with metal ions`],
        [`$\\Delta$ (crystal field splitting, strong field ligands: $CN^-$)`, `High spin configuration (large $\\Delta$) → diamagnetic complex`],
        [`Trans isomer of $[Pt(NH_3)_2Cl_2]$ (Zeise's salt parent)`, `Does not have a net dipole moment; used in antitumor research (cisplatin)`]
      ]
    }
  ];

  const pool = POOLS[familyId];
  const qText = `Match the items in Column I with their correct description in Column II:\n\nColumn I                                    | Column II\n(i)   ${pool.cols[0][0].padEnd(42)} | (P)  ${pool.cols[0][1]}\n(ii)  ${pool.cols[1][0].padEnd(42)} | (Q)  ${pool.cols[1][1]}\n(iii) ${pool.cols[2][0].padEnd(42)} | (R)  ${pool.cols[2][1]}\n(iv)  ${pool.cols[3][0].padEnd(42)} | (S)  ${pool.cols[3][1]}\n\nSelect the correct matching for ${pool.topic}:`;
  const solText = `Correct matching: i-P, ii-Q, iii-R, iv-S for ${pool.topic}.`;
  return { qText, opts: matchOpts(correctIdx), correctIdx, solText, qType: 'match_following' };
}

function generateChemistryDiagram(index) {
  const familyId = index % 5;
  const paramIdx = Math.floor(index / 5);
  let rem = paramIdx;
  const p1 = (rem % 70) + 1; rem = Math.floor(rem/70);
  const p2 = (rem % 50) + 1; rem = Math.floor(rem/50);
  const p3 = (rem % 40) + 1; rem = Math.floor(rem/40);
  const p4 = (rem % 25) + 2;

  let qText, opts, correctIdx, solText;

  if (familyId === 0) {
    // Energy profile diagram
    const Ea_f = p1 + 30, deltaH = p2 - p3;
    const Ea_r = Ea_f - deltaH;
    const reaction = deltaH < 0 ? 'exothermic' : 'endothermic';
    opts = [`${Ea_r} kJ/mol`, `${Ea_f} kJ/mol`, `${Math.abs(deltaH)} kJ/mol`, `${Ea_f + Ea_r} kJ/mol`];
    correctIdx = 0;
    qText = `The potential energy diagram for a reaction is shown below:\n\n  PE↑\n  ${Ea_f + 50} kJ |     ╭─╮  ← Transition State\n              |    ╱   ╲\n  ${50+Math.abs(deltaH<0?deltaH:0)} kJ  |   ╱     ╲\n              | ╱ Ea(f)=${Ea_f}↑  ╲  Ea(r)=?\n  ${50} kJ  |╱               ╲—→ Reactants baseline\n              +————————————————→ Reaction Coordinate\n              Reactants(${50}kJ)  Products(${50+deltaH}kJ)\n\nThis is a ${reaction} reaction ($\\Delta H = ${deltaH}$ kJ/mol). What is the activation energy for the REVERSE reaction?`;
    solText = `For the reverse reaction, activation energy = Ea(forward) − ΔH = ${Ea_f} − (${deltaH}) = ${Ea_r} kJ/mol. In an ${reaction} reaction, Ea(reverse) = Ea(forward) − ΔH.`;
  } else if (familyId === 1) {
    // Titration curve
    const vol = p1 + 10, conc = (p2*0.05+0.1).toFixed(2), pKa = (p3*0.05+3.5).toFixed(1);
    const pHhalf = pKa, pHeq = (7 + parseFloat(pKa)/2).toFixed(1);
    opts = [`${pKa} (half-equivalence point)`, `7.00 (neutral point)`, `${pHeq} (equivalence point)`, `14.00 (end point)`];
    correctIdx = 0;
    qText = `The titration curve below shows the titration of ${vol} mL of ${conc} M weak acid (pKa = ${pKa}) with a strong base (NaOH):\n\n  pH↑\n  14 |                                   ╭—————\n     |                              ╭————\n  ${pHeq} |————————————————————————╮ ← Equivalence point\n     |                      ╭————\n  ${pKa} |——————————————╮ ← Half-equivalence point (pH = pKa)\n     |           ╭————\n   0 +———————————————————————————→ Vol NaOH added\n       0     ${vol/2}mL   ${vol}mL\n\nAt what pH does the HALF-EQUIVALENCE point occur?`;
    solText = `At the half-equivalence point, [acid] = [conjugate base]. By Henderson-Hasselbalch: pH = pKa + log(1) = pKa = ${pKa}. This is used to experimentally determine the pKa of a weak acid.`;
  } else if (familyId === 2) {
    // Electrochemical cell
    const E_cath = (p1*0.02 - 0.5).toFixed(2), E_an = (p2*0.02 - 0.8).toFixed(2);
    const Ecell = (parseFloat(E_cath) - parseFloat(E_an)).toFixed(2);
    const spontaneous = parseFloat(Ecell) > 0;
    opts = [`${Ecell} V`, `${(-parseFloat(Ecell)).toFixed(2)} V`, `${Math.abs(parseFloat(E_cath)+parseFloat(E_an)).toFixed(2)} V`, `${(parseFloat(E_cath)*2).toFixed(2)} V`];
    correctIdx = 0;
    qText = `The electrochemical cell shown below is set up at 298 K:\n\n  Pt | H₂(1 atm) | H⁺(aq) || Metal²⁺(aq) | Metal\n  ←—Anode (Oxidation)——||——Cathode (Reduction)—→\n  $E^\\circ_{anode} = ${E_an}$ V           $E^\\circ_{cathode} = ${E_cath}$ V\n\nSalt bridge: KNO₃(aq)\n\nCalculate the standard EMF of the cell ($E^\\circ_{cell}$):`;
    solText = `E°_cell = E°_cathode − E°_anode = ${E_cath} − (${E_an}) = ${Ecell} V. Since E°_cell ${parseFloat(Ecell)>0?'> 0, the cell is spontaneous (galvanic).':'< 0, the cell is non-spontaneous.'}`;
  } else if (familyId === 3) {
    // Phase diagram (water-like)
    const Tm = (p1 % 50 + 250), Tb = (p2 % 100 + 300), Pc = (p3 * 2 + 50);
    opts = ['Solid, Liquid, and Gas coexist in equilibrium', 'Only liquid phase exists', 'Only solid and liquid coexist', 'Gas phase only exists'];
    correctIdx = 0;
    qText = `The phase diagram of a pure substance is shown below:\n\n  Pressure↑ (atm)\n  ${Pc} |         •← Critical Point\n       |        ╱|\\\n       |      Liquid│  Gas\n       |      ╱    │\n   1   |────────────│────────────\n       |  Solid  │\n       |         •← Triple Point (${Tm} K, ${(Pc/100).toFixed(1)} atm)\n   0   +————————————————————→ Temperature (K)\n        0     ${Tm}   ${Tb}\n\nAt the TRIPLE POINT of this substance, which of the following is TRUE?`;
    solText = `At the triple point (${Tm} K, ${(Pc/100).toFixed(1)} atm), all three phases — solid, liquid, and gas — coexist in thermodynamic equilibrium simultaneously. This is a unique point for every pure substance.`;
  } else {
    // Orbital/electron configuration diagram
    const Z = p1 % 18 + 3;
    const configs = {3:'[He]2s¹',4:'[He]2s²',5:'[He]2s²2p¹',6:'[He]2s²2p²',7:'[He]2s²2p³',8:'[He]2s²2p⁴',9:'[He]2s²2p⁵',10:'[He]2s²2p⁶',11:'[Ne]3s¹',12:'[Ne]3s²',13:'[Ne]3s²3p¹',14:'[Ne]3s²3p²',15:'[Ne]3s²3p³',16:'[Ne]3s²3p⁴',17:'[Ne]3s²3p⁵',18:'[Ne]3s²3p⁶',19:'[Ar]4s¹',20:'[Ar]4s²'};
    const config = configs[Z] || '[He]2s²2p³';
    const unpaired = config.includes('p¹')?1:config.includes('p²')?2:config.includes('p³')?3:config.includes('p⁴')?2:config.includes('p⁵')?1:config.includes('p⁶')?0:config.includes('s¹')?1:0;
    opts = [`${unpaired} unpaired electron(s)`, `${unpaired+1} unpaired electron(s)`, `${unpaired > 0 ? unpaired-1 : unpaired+2} unpaired electron(s)`, `0 unpaired electrons`];
    if (unpaired === 0) opts[0] = `0 unpaired electrons`, opts[3] = '2 unpaired electrons';
    correctIdx = 0;
    qText = `The following orbital energy diagram represents element with atomic number $Z = ${Z}$ and configuration ${config}:\n\n  ↑↓  ↑↓  ${unpaired===3?'↑  ↑  ↑':unpaired===2?'↑  ↑  __':unpaired===1?'↑  __ __':'↑↓ ↑↓ ↑↓'}\n  [1s][2s][2p or higher]\n  ↑↓ electrons fill paired; unpaired electrons shown with single arrows ↑\n\nBased on Hund's rule and the Aufbau principle, how many UNPAIRED electrons does this element have?`;
    solText = `Element Z = ${Z} has configuration ${config}. Using Hund's rule (maximum spin multiplicity), the number of unpaired electrons is ${unpaired}. ${unpaired > 0 ? `The p orbitals (or outermost subshell) contain ${unpaired} unpaired electron(s).` : 'All electrons are paired.'}`;
  }
  return { qText, opts, correctIdx, solText, qType: 'diagram_based' };
}

function generateChemistryStatement(index) {
  const familyId = index % 5;
  const paramIdx = Math.floor(index / 5);
  let rem = paramIdx;
  const p1 = (rem % 70) + 1; rem = Math.floor(rem/70);
  const p2 = (rem % 50) + 1; rem = Math.floor(rem/50);
  const p3 = (rem % 30) + 1;
  const correctPattern = rem % 6;

  const TOPICS = [
    { title: 'Chemical Equilibrium and Le Chatelier\'s Principle',
      trueStmts: ['At equilibrium, the concentrations of reactants and products remain constant, but the forward and reverse reactions continue at equal rates.','Adding a catalyst to an equilibrium system increases the rate of both forward and reverse reactions equally, without changing the equilibrium position.','Increasing temperature shifts an endothermic reaction\'s equilibrium to the right (toward products) by Le Chatelier\'s principle.','Decreasing the volume of a gaseous reaction system at equilibrium shifts equilibrium toward the side with fewer moles of gas.'],
      falseStmts: ['The equilibrium constant Kc changes when the concentration of reactants is changed.','Adding an inert gas at constant volume shifts the equilibrium position.']
    },
    { title: 'Periodic Table and Periodic Properties',
      trueStmts: ['Metallic character increases down a group in the periodic table as the outer electrons become farther from the nucleus.','The first ionization energy of noble gases is the highest in their respective periods due to their completely filled valence shells.','Electron affinity of fluorine is lower than that of chlorine because fluorine has a smaller, more electron-dense atom causing greater electron-electron repulsion.','Electronegativity follows Pauling scale: F (4.0) > O (3.5) > N (3.0) > Cl (3.2) > Br (2.8).'],
      falseStmts: ['All elements in Group 17 (halogens) are gases at room temperature.','Atomic radius increases across a period from left to right.']
    },
    { title: 'Chemical Bonding and Structure',
      trueStmts: ['In VSEPR theory, lone pairs occupy more space than bond pairs, causing greater repulsion and reduction in bond angles.','The hybridization of carbon in ethene (C₂H₄) is sp², resulting in a planar molecule with bond angles of ~120°.','Resonance structures of benzene show delocalized electrons over the ring, explaining its extra stability (resonance energy).','Ionic compounds have high melting points due to the strong electrostatic attraction between oppositely charged ions arranged in a crystal lattice.'],
      falseStmts: ['PCl₅ has tetrahedral geometry with all bond angles equal to 109.5°.','Bond order and bond length are directly proportional: higher bond order means longer bond.']
    },
    { title: 'Organic Chemistry Reactions and Mechanisms',
      trueStmts: ['SN2 reactions proceed with inversion of configuration (Walden inversion) at the carbon center being attacked.','Markovnikov\'s rule states that in addition of HX to an alkene, H adds to the carbon with more hydrogen atoms (giving the more stable carbocation).','Aldol condensation occurs between two carbonyl compounds (aldehydes or ketones) in the presence of a dilute base to form β-hydroxy carbonyl compounds.','Electrophilic aromatic substitution (EAS) involves a carbocation (arenium ion) intermediate and results in substitution to maintain aromaticity.'],
      falseStmts: ['In an SN1 reaction, the rate depends on both the substrate and nucleophile concentration.','Primary carbocations are more stable than tertiary carbocations.']
    },
    { title: 'Electrochemistry and Redox Reactions',
      trueStmts: ['During electrolysis of water, oxygen is produced at the anode (oxidation) and hydrogen at the cathode (reduction).','The Nernst equation relates the cell EMF to its standard EMF and the reaction quotient Q: E = E° − (RT/nF) ln Q.','In a galvanic cell, oxidation occurs at the anode and reduction at the cathode; electrons flow from anode to cathode through the external circuit.','Faraday\'s second law of electrolysis states that the same quantity of electricity deposits equivalents of different substances.'],
      falseStmts: ['In electrolytic cells, the positive electrode is the cathode.','The standard hydrogen electrode (SHE) has an electrode potential of +1.0 V.']
    }
  ];

  const topic = TOPICS[familyId];
  const ts = topic.trueStmts, fs = topic.falseStmts;
  const patterns = [
    { stmts: [ts[p1%ts.length], ts[p2%ts.length], ts[p3%ts.length]], correct: 'Statements I, II and III are all correct', wrongOpts: ['Statements I and II only', 'Statement III only', 'Statements II and III only'] },
    { stmts: [ts[p1%ts.length], ts[p2%ts.length], fs[p3%fs.length]], correct: 'Statements I and II only', wrongOpts: ['Statements I, II and III', 'Statement II only', 'Statements II and III only'] },
    { stmts: [ts[p1%ts.length], fs[p2%fs.length], ts[p3%ts.length]], correct: 'Statements I and III only', wrongOpts: ['Statements I, II and III', 'Statement I only', 'Statements II and III only'] },
    { stmts: [ts[p1%ts.length], fs[p2%fs.length], fs[p3%fs.length]], correct: 'Statement I only', wrongOpts: ['Statements I and II only', 'Statements I, II and III', 'None of the statements'] },
    { stmts: [fs[p1%fs.length], ts[p2%ts.length], ts[p3%ts.length]], correct: 'Statements II and III only', wrongOpts: ['Statements I and II only', 'Statements I, II and III', 'Statement III only'] },
    { stmts: [fs[p1%fs.length], fs[p2%fs.length], ts[p3%ts.length]], correct: 'Statement III only', wrongOpts: ['None of the statements', 'Statements I and III only', 'Statements I, II and III'] }
  ];
  const pat = patterns[correctPattern];
  const qText = `Which of the following statements about **${topic.title}** is/are CORRECT?\n\nStatement I: ${pat.stmts[0]}\nStatement II: ${pat.stmts[1]}\nStatement III: ${pat.stmts[2]}`;
  const correctIdx = p1 % 4;
  const allOpts = [pat.correct, ...pat.wrongOpts];
  const opts = new Array(4);
  for (let k = 0; k < 4; k++) opts[(correctIdx + k) % 4] = allOpts[k];
  return { qText, opts, correctIdx, solText: `${pat.correct} is/are correct about ${topic.title}.`, qType: 'statement_based' };
}

// ============================================================
// BIOLOGY GENERATORS (Botany + Zoology share structure)
// ============================================================

function generateBiologyAR(index, isZoology) {
  const variant = index % 4;
  const familyId = Math.floor(index / 4) % 5;
  const paramIdx = Math.floor(index / 20);
  let rem = paramIdx;
  const p1 = (rem % 97) + 2; rem = Math.floor(rem/97);
  const p2 = (rem % 61) + 1; rem = Math.floor(rem/61);
  const p3 = (rem % 41) + 1;

  const BOTANY_FACTS = [
    { A_true: `C4 plants (e.g., maize, sugarcane) have higher photosynthetic efficiency than C3 plants in high-temperature, high-light conditions.`, R_correct: `C4 plants use the Hatch-Slack pathway with PEP carboxylase (higher CO₂ affinity than RuBisCO) to concentrate CO₂ in bundle sheath cells, minimizing photorespiration.`, R_unrel: `Gymnosperms are seed-bearing plants that do not produce flowers or fruits.`, R_false: `C4 plants are more efficient because they have more chlorophyll per leaf area.`, A_false: `C3 plants are more efficient than C4 plants in high-temperature tropical conditions because they avoid the extra energy cost of the C4 cycle.` },
    { A_true: `In meiosis, genetic recombination (crossing over) occurs during prophase I, specifically in the pachytene sub-stage.`, R_correct: `During pachytene, synapsed homologous chromosomes form bivalents (tetrads), and non-sister chromatids exchange segments through chiasmata, creating new allele combinations.`, R_unrel: `Mitosis produces two genetically identical daughter cells from a single parent cell.`, R_false: `Crossing over occurs during anaphase II when sister chromatids separate.`, A_false: `Crossing over occurs during prophase II of meiosis, after the first division is complete.` },
    { A_true: `Gymnosperms produce naked seeds (not enclosed in a fruit), while angiosperms produce seeds enclosed within a fruit.`, R_correct: `In gymnosperms, ovules are borne on megasporophylls not enclosed in an ovary. In angiosperms, the ovary wall (pericarp) encloses the ovules and develops into the fruit after fertilization.`, R_unrel: `Bryophytes are the most primitive land plants and lack vascular tissue.`, R_false: `Gymnosperms produce seeds enclosed in cones made of modified leaves, which are technically fruits.`, A_false: `Both gymnosperms and angiosperms produce seeds enclosed in fruits as a defining characteristic of seed plants.` },
    { A_true: `The process of transpiration in plants primarily occurs through stomata and serves a dual role in cooling the plant and driving water transport through the xylem.`, R_correct: `Transpiration creates a negative pressure (tension) in xylem that pulls water up from roots to leaves via the cohesion-tension mechanism; evaporative cooling also reduces leaf temperature.`, R_unrel: `The Calvin cycle (dark reactions) converts CO₂ to G3P using NADPH and ATP produced in the light reactions.`, R_false: `Transpiration is purely a mechanism to excrete excess water and has no role in mineral transport or cooling.`, A_false: `Transpiration is a wasteful process that plants try to minimize at all times without any physiological benefit.` },
    { A_true: `Polyploidy is more common in plants than in animals and has been a significant mechanism in plant speciation and crop improvement.`, R_correct: `Plants can often tolerate polyploidy due to their flexible developmental plasticity, self-fertilization capability, and cell wall structure. Many important crops (wheat: hexaploid, cotton: tetraploid, banana: triploid) are polyploids.`, R_unrel: `DNA replication occurs during the S phase of the cell cycle.`, R_false: `Polyploidy is equally common in plants and animals but goes undetected in animals due to their complex development.`, A_false: `Polyploidy is more common in animals than in plants because animals can survive chromosome number changes more readily.` }
  ];

  const ZOOLOGY_FACTS = [
    { A_true: `In humans, oxygenated blood is carried from the lungs to the left atrium via the pulmonary veins.`, R_correct: `After gas exchange in the lungs, blood enriched with oxygen is collected by pulmonary capillaries → pulmonary veins → left atrium → left ventricle → aorta for systemic circulation. Pulmonary veins are unique: they carry oxygenated blood despite being veins.`, R_unrel: `The brain consumes approximately 20% of the body's total oxygen despite being only 2% of body weight.`, R_false: `Pulmonary veins carry deoxygenated blood from the body to the right side of the heart for purification.`, A_false: `Oxygenated blood is carried from the lungs to the right atrium via the pulmonary arteries.` },
    { A_true: `The kidney's functional unit, the nephron, filters blood and reabsorbs useful substances in the proximal convoluted tubule (PCT) and loop of Henle.`, R_correct: `About 65% of filtered Na⁺, water, glucose, amino acids, and HCO₃⁻ are reabsorbed in the PCT. The loop of Henle creates a concentration gradient in the renal medulla enabling water reabsorption in collecting duct.`, R_unrel: `The liver produces bile salts that emulsify fats in the small intestine.`, R_false: `Selective reabsorption occurs mainly in the collecting duct, while PCT primarily filters large proteins.`, A_false: `The nephron's Bowman's capsule reabsorbs useful substances from the filtrate, while PCT is the primary filtration site.` },
    { A_true: `Neural control of breathing is primarily regulated by the respiratory center located in the medulla oblongata.`, R_correct: `The medulla oblongata contains the dorsal respiratory group (DRG) that drives inspiration and the ventral respiratory group (VRG) that controls active expiration. It responds to CO₂ and H⁺ concentration changes in blood and CSF.`, R_unrel: `The cerebellum is responsible for coordination of voluntary muscle movements and maintenance of posture.`, R_false: `Breathing rate is controlled exclusively by O₂ levels detected by chemoreceptors in the aortic arch.`, A_false: `The primary respiratory center is located in the cerebral cortex, which sends voluntary signals to the diaphragm.` },
    { A_true: `In the human female menstrual cycle, ovulation occurs approximately on day 14 of a 28-day cycle, triggered by a surge in Luteinizing Hormone (LH).`, R_correct: `Rising estrogen from the mature Graafian follicle triggers a positive feedback on the pituitary, causing a massive LH surge around day 13-14. This LH surge triggers ovulation — rupture of the follicle and release of the secondary oocyte.`, R_unrel: `Spermatogenesis occurs in the seminiferous tubules of the testis under the influence of FSH and testosterone.`, R_false: `Ovulation is triggered by a surge in Follicle Stimulating Hormone (FSH) on day 14, which directly ruptures the follicle.`, A_false: `Ovulation in the human female menstrual cycle occurs on day 7 of a 28-day cycle, triggered by rising progesterone levels.` },
    { A_true: `Recombinant DNA technology uses restriction endonucleases to cut DNA at specific palindromic sequences, generating fragments that can be ligated into vectors.`, R_correct: `Restriction endonucleases recognize specific 4-8 bp palindromic sequences (read the same on both strands 5'→3') and cut both strands of DNA. DNA ligase then seals the sugar-phosphate backbone to join the insert DNA with the vector.`, R_unrel: `PCR (Polymerase Chain Reaction) amplifies specific DNA sequences in vitro using thermostable Taq polymerase.`, R_false: `Restriction endonucleases cut DNA randomly at any position and generate blunt ends only.`, A_false: `Restriction endonucleases recognize and cut non-palindromic sequences in DNA, generating fragments used in cloning.` }
  ];

  const facts = isZoology ? ZOOLOGY_FACTS : BOTANY_FACTS;
  const fact = facts[familyId];
  let A, R, sol;
  if (variant===0){ A=`Assertion (A): ${fact.A_true}`; R=`Reason (R): ${fact.R_correct}`; sol=`Both A and R are true, and R is the correct explanation of A.`; }
  else if(variant===1){ A=`Assertion (A): ${fact.A_true}`; R=`Reason (R): ${fact.R_unrel}`; sol=`A is correct. R is true but is not the correct explanation of A — it describes an unrelated biological concept.`; }
  else if(variant===2){ A=`Assertion (A): ${fact.A_true}`; R=`Reason (R): ${fact.R_false}`; sol=`A is correct. R is false.`; }
  else{ A=`Assertion (A): ${fact.A_false}`; R=`Reason (R): ${fact.R_correct}`; sol=`A is false. R is true and correctly describes the biological mechanism.`; }
  return { qText: `${A}\n${R}\n\nChoose the correct option:`, opts: AR_OPTS, correctIdx: variant, solText: sol, qType: 'assertion_reason' };
}

function generateBiologyMatch(index, isZoology) {
  const correctIdx = index % 4;
  const familyId = Math.floor(index / 4) % 5;
  const paramIdx = Math.floor(index / 20);
  let rem = paramIdx;
  const p1 = (rem % 80) + 1; rem = Math.floor(rem/80);
  const p2 = (rem % 60) + 1; rem = Math.floor(rem/60);
  const p3 = (rem % 40) + 1; rem = Math.floor(rem/40);
  const p4 = rem % 30 + 1;

  const BOTANY_POOLS = [
    { topic: 'plant cell organelles and their functions',
      cols: [['Chloroplast','Site of photosynthesis; contains thylakoid membranes with chlorophyll and stroma with Calvin cycle enzymes'],['Mitochondria','Site of cellular respiration; produces ATP via oxidative phosphorylation (Krebs cycle + ETC)'],['Golgi apparatus (dictyosomes)','Modification, sorting, and packaging of proteins and lipids for secretion or delivery to organelles'],['Central vacuole (large, ${p1}% cell volume)','Maintains cell turgor pressure; stores metabolites, pigments, and toxic compounds']] },
    { topic: 'plant hormones and their primary effects',
      cols: [[`Auxin (IAA, conc. $${p1}\\times10^{-6}$ M in shoots)`,'Promotes cell elongation in shoots; inhibits lateral bud growth (apical dominance)'],[`Gibberellin (GA₃, $${p2}$ μg/L treatment)`,'Promotes stem elongation, seed germination, and fruit development; breaks dormancy'],[`Cytokinin (zeatin, $${p3}$ ppm)`,'Promotes cell division (cytokinesis); delays senescence; promotes lateral bud growth'],[`Abscisic acid (ABA, stress signal at $${p4}$ nM)`,'Induces stomatal closure; promotes seed dormancy; stress response hormone']],
      topic: 'plant hormones and their primary physiological effects'
    },
    { topic: 'stages of meiosis and their key events',
      cols: [['Prophase I','Synapsis of homologous chromosomes; crossing over (chiasmata formation); bivalents visible'],['Metaphase I','Bivalents align at metaphase plate; independent assortment of homologous pairs'],['Anaphase I','Homologous chromosomes separate to opposite poles (centromeres do NOT split)'],['Telophase II','Four haploid daughter nuclei form; cytokinesis produces four haploid cells (spores/gametes)']] },
    { topic: 'photosynthesis reactions and their locations in chloroplast',
      cols: [[`Light reaction (photosystem ${p1%2+1})`,'Thylakoid membrane; produces ATP and NADPH; splits water (photolysis) releasing O₂'],[`Calvin cycle (dark reaction, fixing ${p2*10} ppm CO₂)`,'Stroma; uses ATP and NADPH to fix CO₂ into G3P using RuBisCO'],[`C4 pathway (in ${['maize','sugarcane','sorghum'][p3%3]})`,'Mesophyll cells: CO₂ fixed by PEP carboxylase → OAA → malate → bundle sheath (CO₂ release for Calvin cycle)'],[`Photorespiration (in ${['wheat','rice','soybean'][p4%3]})`,'Occurs in chloroplast/peroxisome/mitochondria; wastes energy; RuBisCO adds O₂ instead of CO₂']] },
    { topic: 'types of plant reproduction and their examples',
      cols: [['Vegetative propagation (e.g., rhizomes in ginger)','Asexual; new plant from vegetative parts; genetically identical to parent (clonal)'],['Apomixis (in some ${[\'Citrus\',\'Mangifera\',\'Taraxacum\'][p2%3]} spp.)','Seed formation without fertilization; offspring genetically identical to mother plant'],['Parthenocarpy (fruit without fertilization)','Seedless fruit development; can be induced by auxins; e.g., banana, seedless grapes'],['Double fertilization (unique to angiosperms)','One sperm + egg → zygote (2n); second sperm + 2 polar nuclei → endosperm (3n)']] }
  ];

  const ZOOLOGY_POOLS = [
    { topic: 'human organ systems and their primary functions',
      cols: [['Lymphatic system (includes ${p1} lymph nodes)','Returns interstitial fluid to blood; immune surveillance; transports fats via lacteals'],['Endocrine system (${p2} major glands)','Chemical coordination via hormones secreted directly into bloodstream; slow but long-lasting effects'],['Nervous system (${p3*10¹⁰} neurons approx.)','Rapid electrical signal transmission; sensory input → integration → motor output'],['Excretory system (${p4} million nephrons in both kidneys)','Filters blood; eliminates nitrogenous wastes; regulates water, ion, and pH balance']]},
    { topic: 'human digestive enzymes and their substrates/products',
      cols: [['Salivary amylase (pH optimum ${(6.5+p1*0.01).toFixed(1)})','Hydrolyzes starch → maltose in the mouth (neutral pH); denatured in stomach acid'],[`Pepsin (activated by HCl, pH ${(1.5+p2*0.05).toFixed(1)})`,'Digests proteins → peptides in stomach (acidic pH); inactive as pepsinogen above pH 5'],['Pancreatic lipase (with bile salts)','Hydrolyzes triglycerides → fatty acids + glycerol in small intestine; requires emulsification'],['Lactase (brush-border enzyme, ${p4} units/mL)','Hydrolyzes lactose → glucose + galactose; deficiency causes lactose intolerance']] },
    { topic: 'types of immunity and their characteristics',
      cols: [['Innate immunity (non-specific, first line)','Present from birth; includes skin, mucus, macrophages, NK cells, fever; no immunological memory'],['Adaptive/Acquired immunity (specific)','Develops after antigen exposure; B and T lymphocytes; produces memory cells for faster secondary response'],['Active immunity (e.g., ${p3*100} units vaccination)','Host produces own antibodies after exposure to antigen (infection or vaccine); long-lasting memory'],['Passive immunity (maternal antibody transfer)','Ready-made antibodies transferred from another organism; immediate protection but short-lived (no memory)']] },
    { topic: 'hormones and their target organs/effects',
      cols: [[`Insulin (${p1} IU/mL in blood)`,'Pancreatic β-cells → liver/muscle/adipose; lowers blood glucose; promotes glycogen and fat synthesis'],[`Thyroxine (T₄, iodine content: ${p2*4}μg/day)`,'Thyroid → all cells; regulates basal metabolic rate, growth, and differentiation'],[`ADH/Vasopressin (${p3*0.5}ng/mL)`,'Posterior pituitary → kidney collecting duct; promotes water reabsorption; reduces urine volume'],[`Testosterone (${p4*5}ng/dL)`,'Testes → reproductive organs, muscle, bone; secondary sexual characteristics; spermatogenesis']] },
    { topic: 'human genetic disorders and their chromosomal basis',
      cols: [[`Down syndrome (Trisomy 21, $2n = ${47}$)`,'Chromosome 21 trisomy; intellectual disability; characteristic facial features; heart defects'],[`Turner syndrome (45, X${p2%2===0?'O':' monosomy'})`,'Loss of one X chromosome (45,X); female phenotype; infertile; webbed neck; short stature'],[`Klinefelter syndrome (47, XXY)`,'Extra X in males; tall; infertile; mild intellectual disability; gynecomastia'],[`Phenylketonuria (PKU, autosomal recessive)`,'Deficiency of phenylalanine hydroxylase; buildup of phenylalanine; intellectual disability if untreated']] }
  ];

  const POOLS = isZoology ? ZOOLOGY_POOLS : BOTANY_POOLS;
  const pool = POOLS[familyId % POOLS.length];
  const cols = pool.cols.map(c => [c[0].replace(/\$\{p\d\}/g, Math.floor(Math.random()*20+1).toString()), c[1]]);
  const qText = `Match the items in Column I with their correct description in Column II:\n\nColumn I                                       | Column II\n(i)   ${cols[0][0].toString().padEnd(44)} | (P)  ${cols[0][1]}\n(ii)  ${cols[1][0].toString().padEnd(44)} | (Q)  ${cols[1][1]}\n(iii) ${cols[2][0].toString().padEnd(44)} | (R)  ${cols[2][1]}\n(iv)  ${cols[3][0].toString().padEnd(44)} | (S)  ${cols[3][1]}\n\nSelect the correct matching for ${pool.topic}:`;
  return { qText, opts: matchOpts(correctIdx), correctIdx, solText: `Correct: i-P, ii-Q, iii-R, iv-S for ${pool.topic}.`, qType: 'match_following' };
}

function generateBiologyDiagram(index, isZoology) {
  const familyId = index % 5;
  const paramIdx = Math.floor(index / 5);
  let rem = paramIdx;
  const p1 = (rem % 80) + 1; rem = Math.floor(rem/80);
  const p2 = (rem % 60) + 1; rem = Math.floor(rem/60);
  const p3 = (rem % 40) + 1;

  const BOTANY_DIAGRAMS = [
    () => {
      const glucose = p1 % 10 + 1, O2 = glucose * 6, CO2 = O2, H2O_in = glucose * 6, atp = glucose * 38;
      const wrongATP = atp + 2;
      return {
        qText: `Study the following diagram of aerobic cellular respiration for ${glucose} glucose molecules:\n\n  ${glucose} Glucose (C₆H₁₂O₆)\n       ↓ Glycolysis (cytoplasm)\n  ${glucose*2} Pyruvate + ${glucose*2} ATP + ${glucose*2} NADH\n       ↓ Pyruvate oxidation (mitochondrial matrix)\n  ${glucose*2} Acetyl-CoA + ${glucose*2} CO₂ + ${glucose*2} NADH\n       ↓ Krebs cycle\n  ${glucose*4} CO₂ + ${glucose*6} NADH + ${glucose*2} FADH₂ + ${glucose*2} ATP (GTP)\n       ↓ Oxidative Phosphorylation (ETC)\n  ~${atp} ATP (net, using P/O ratio ~2.5 for NADH)\n\nHow many total ATP molecules are produced by the complete oxidation of ${glucose} glucose molecules?`,
        opts: [`${atp} ATP`, `${wrongATP} ATP`, `${glucose*36} ATP`, `${glucose*18} ATP`],
        correctIdx: 0,
        solText: `Complete oxidation of 1 glucose yields ~38 ATP (using P/O ratio 2.5 for NADH). For ${glucose} glucose: ${glucose} × 38 = ${atp} ATP (net).`
      };
    },
    () => {
      const generation = p1 % 4 + 1;
      const genSymbols = ['I', 'II', 'III', 'IV'];
      const trait = ['autosomal dominant', 'autosomal recessive', 'X-linked recessive', 'autosomal dominant'][p2 % 4];
      return {
        qText: `Study the following pedigree chart for a hereditary condition:\n\n  Generation I:   ◻——●  (affected female × unaffected male)\n                  |    \n  Generation II: ◻ ● ◻ ◻  (1 affected female, 3 unaffected)\n                          \n  Generation III: ● ◻ ● ◻ ◻  (2 affected out of 5 children)\n\nSymbols: ● = affected female, ○ = unaffected female, ■ = affected male, □ = unaffected male\n\nBased on the pedigree, what is the most likely mode of inheritance?`,
        opts: ['Autosomal dominant', 'Autosomal recessive', 'X-linked dominant', 'X-linked recessive'],
        correctIdx: 0,
        solText: `The trait appears in every generation (Generation I, II, and III) and affects both sexes. This pattern — vertical transmission with affected individuals in each generation — is characteristic of autosomal dominant inheritance.`
      };
    },
    () => {
      const cells = p1 * 100, divTime = p2 % 10 + 2, hrs = p3 % 24 + 12;
      const doublings = Math.floor(hrs / divTime);
      const final = cells * Math.pow(2, doublings);
      return {
        qText: `The diagram below represents exponential growth of a bacterial culture:\n\n  Cell count↑ (log scale)\n  ${final} |                              ╭─\n             |                        ╭──\n  ${cells*Math.pow(2,doublings/2).toFixed(0)} |              ╭──\n             |         ╭──\n  ${cells}    |    ╭──\n             +——————————————————→ Time (hours)\n             0     ${hrs/2}      ${hrs}\n\nA culture starts with ${cells} cells. If the doubling time is ${divTime} hours, how many cells will be present after ${hrs} hours?`,
        opts: [`${final.toLocaleString()}`, `${(final/2).toLocaleString()}`, `${(cells * doublings).toLocaleString()}`, `${(final*2).toLocaleString()}`],
        correctIdx: 0,
        solText: `Number of doublings = ${hrs}/${divTime} = ${doublings}. Final count = ${cells} × 2^${doublings} = ${cells} × ${Math.pow(2,doublings)} = ${final.toLocaleString()} cells.`
      };
    },
    () => {
      const parts = [['X = Stoma (stomatal pore)','Allows gas exchange (CO₂ in, O₂ out during day) and transpiration'],['Y = Guard cell (bean-shaped)','Controls stomatal opening/closing via osmotic changes'],['Z = Subsidiary cell (epidermal)','Supports guard cell function; modifies ion exchange during stomatal movement'],['W = Chloroplast (in guard cell)','Site of photosynthesis in guard cells; generates ATP and sugar for osmotic adjustment']][p1%4];
      const correctPart = parts[0], correctFn = parts[1];
      return {
        qText: `The diagram below shows a cross-section of a leaf epidermis with the stomatal complex:\n\n        [Epidermal cell] [Epidermal cell]\n               ↓\n     ╔═══════════════════╗\n     ║  Guard cell (●)   ║ ← Y\n     ║       ╭——╮        ║\n     ║       │ X │       ║ ← Stomatal pore\n     ║       ╰——╯        ║\n     ║  Guard cell (●)   ║\n     ╠═══════════════════╣\n     ║  Subsidiary cell  ║ ← Z\n     ╚═══════════════════╝\n\nIn this diagram, what is the FUNCTION of structure labeled '${correctPart.split('=')[0].trim()}'?`,
        opts: [correctFn, 'Stores starch as energy reserve', 'Conducts water from roots to leaves', 'Performs cell division to generate new epidermal cells'],
        correctIdx: 0,
        solText: `Structure ${correctPart}. Its function: ${correctFn}.`
      };
    },
    () => {
      const stage = ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'][p1%4];
      const chroms = [46, 46, 92, 46][p1%4], chromatids = [92, 92, 92, 46][p1%4];
      return {
        qText: `The diagram below shows a cell (2n = 46) during mitosis:\n\n     ${stage === 'Metaphase' ? '  ╱——╲╱——╲╱——╲ (chromosomes aligned at plate)\n  ══════════════════ ← Metaphase plate\n     ╲——╱╲——╱╲——╱' : stage === 'Anaphase' ? '  ↑↑↑↑↑↑  ↓↓↓↓↓↓\n  (chromatids moving to opposite poles)' : stage === 'Prophase' ? '  ●●●●●● (condensed chromosomes)\n  Nuclear envelope fragmenting' : '  ●——● ●——●\n  (two forming nuclei with decondensed chromatin)'}\n\nThis cell is in **${stage}** of mitosis (human somatic cell, 2n = 46).\nHow many chromosomes and chromatids are present in this cell at this stage?`,
        opts: [`${chroms} chromosomes, ${chromatids} chromatids`, `23 chromosomes, 46 chromatids`, `92 chromosomes, 92 chromatids`, `46 chromosomes, 46 chromatids`],
        correctIdx: 0,
        solText: `During ${stage} of mitosis in a human cell (2n=46): chromosomes = ${chroms}, chromatids = ${chromatids}. ${stage === 'Anaphase' ? 'In anaphase, centromeres split giving 92 chromosomes (each = 1 chromatid), so chromatids = 92.' : 'Each chromosome still consists of 2 sister chromatids until anaphase.'}`
      };
    }
  ];

  const ZOOLOGY_DIAGRAMS = [
    () => {
      const hr = p1 * 5 + 50, sv = p2 + 60, co = Math.round(hr * sv / 1000);
      return {
        qText: `The diagram below shows the cardiac cycle and ECG of a human heart:\n\n  ECG↑\n     |      P wave     QRS complex    T wave\n     |        ╭╮          ╭╮             ╭╮\n     |   ────╯  ╰────────╯  ╰──────────╯  ╰────\n     +→ Time\n\n  Systole (0.3s): Left ventricle contracts\n  Diastole (0.5s): Heart relaxes and fills\n\nGiven: Heart rate = ${hr} beats/min, Stroke volume = ${sv} mL/beat\nCalculate the Cardiac Output (CO) = Heart Rate × Stroke Volume:`,
        opts: [`${co} L/min`, `${co+1} L/min`, `${Math.round(hr*70/1000)} L/min`, `${Math.round(co*0.5)} L/min`],
        correctIdx: 0,
        solText: `Cardiac Output = HR × SV = ${hr} beats/min × ${sv} mL/beat = ${hr*sv} mL/min = ${co} L/min.`
      };
    },
    () => {
      const gfr = p1 * 5 + 100, reabs = (95 + p2 % 3), urine = Math.round(gfr * (1 - reabs/100) * 1000);
      return {
        qText: `The diagram below illustrates nephron function in the kidney:\n\n  Bowman's capsule → PCT → Loop of Henle → DCT → Collecting Duct → Urine\n\n  Filtration at glomerulus:\n  ┌──────────────────────────────────────────┐\n  │  GFR = ${gfr} mL/min = ${gfr*1440} mL/day = ${(gfr*1440/1000).toFixed(0)} L/day │\n  │  Reabsorption = ${reabs}% in tubules         │\n  │  Tubular secretion adds H⁺, NH₄⁺, drugs│\n  │  Urine produced = ?                      │\n  └──────────────────────────────────────────┘\n\nIf the GFR is ${gfr} mL/min and ${reabs}% is reabsorbed, how much urine (in mL/day) is produced?`,
        opts: [`${urine} mL/day`, `${urine*2} mL/day`, `${(gfr*1440).toFixed(0)} mL/day`, `${Math.round(urine/2)} mL/day`],
        correctIdx: 0,
        solText: `GFR = ${gfr} mL/min = ${gfr*1440} mL/day. Urine = (100-${reabs})% of GFR = ${100-reabs}% × ${gfr*1440} = ${urine} mL/day.`
      };
    },
    () => {
      const gene = ['ABO blood group', 'Rh factor', 'sickle cell anemia', 'colour blindness'][p1%4];
      const parents = [['AB × O', 'IA IB × ii', 'IA i (50%) + IB i (50%)', 'A and B type children only'],
                       ['Rh+ × Rh–', 'Rr × rr', '50% Rr + 50% rr', '50% Rh+ and 50% Rh– children'],
                       ['Carrier × Normal', 'Ss × SS', '50% SS + 50% Ss', 'No sickle cell disease in offspring'],
                       ['Carrier mother × Normal father', 'XᴺXⁿ × XᴺY', '25% normal female, 25% carrier female, 25% normal male, 25% colour blind male', '25% of sons will be colour blind']][p1%4];
      return {
        qText: `The Punnett square below shows a cross for **${gene}**:\n\n  Parent 1 genotype: ${parents[1].split('×')[0].trim()}\n  Parent 2 genotype: ${parents[1].split('×')[1].trim()}\n\n        |  ${parents[1].split('×')[1].trim().split('')[0]}  |  ${parents[1].split('×')[1].trim().split('')[1] || ''}  |\n  ——————|———|———|\n    ${parents[1].split('×')[0].trim().split('')[0]}   |   |   |\n  ——————|———|———|\n    ${parents[1].split('×')[0].trim().split('')[1] || ''}   |   |   |\n  ——————|———|———|\n\nExpected offspring ratio: ${parents[2]}\n\nBased on this cross, which of the following is CORRECT?`,
        opts: [parents[3], `All offspring will show the dominant phenotype`, `50% of offspring will be homozygous recessive`, `This cross cannot produce any offspring with the trait`],
        correctIdx: 0,
        solText: `For ${gene}: Cross ${parents[1]}. Expected offspring: ${parents[2]}. Therefore: ${parents[3]}.`
      };
    },
    () => {
      const system = ['Digestive', 'Respiratory', 'Nervous', 'Reproductive'][p2%4];
      const structures = {
        'Digestive': [['A = Liver','Largest gland; produces bile; metabolizes nutrients; detoxification'], ['B = Pancreas','Exocrine: digestive enzymes; Endocrine: insulin and glucagon'], ['C = Duodenum','First part of small intestine; receives bile and pancreatic juice'], ['D = Ileum','Absorbs digested food; contains villi and microvilli for maximum surface area']],
        'Respiratory': [['A = Alveolus','Tiny air sac; site of gas exchange; walls are 1-cell thick'], ['B = Bronchiole','Smallest airway (no cartilage); leads to alveolar ducts and alveoli'], ['C = Diaphragm','Dome-shaped muscle; main muscle of breathing; contracts during inhalation'], ['D = Pleura','Double membrane surrounding lungs; pleural fluid reduces friction']],
        'Nervous': [['A = Synapse','Junction between neurons; neurotransmitters cross the synaptic cleft'], ['B = Myelin sheath','Fatty insulation around axons; speeds up nerve impulse conduction (saltatory)'], ['C = Dendrites','Branch-like extensions of neuron; receive incoming signals'], ['D = Axon terminal','End of neuron; releases neurotransmitters into synapse']],
        'Reproductive': [['A = Graafian follicle','Mature ovarian follicle containing the secondary oocyte; ruptures at ovulation'], ['B = Corpus luteum','Post-ovulation structure; secretes progesterone and estrogen'], ['C = Seminiferous tubule','Site of spermatogenesis (sperm production) in the testis'], ['D = Epididymis','Sperm maturation and storage site; connects testis to vas deferens']]
      };
      const idx = p3 % 4;
      const struct = structures[system][idx];
      return {
        qText: `The diagram below shows the human **${system} system** with structures labeled A, B, C, D:\n\n  [Diagram of human ${system.toLowerCase()} system]\n  ${structures[system].map((s,i) => `  ${['A','B','C','D'][i]} → ${s[0].split('=')[0].trim()}`).join('\n')}\n\nArrow in diagram points to structure labeled '${struct[0].split('=')[0].trim()}'.\n\nWhat is the CORRECT function of this labeled structure?`,
        opts: [struct[1], structures[system][(idx+1)%4][1], structures[system][(idx+2)%4][1], 'Produces hormones for blood sugar regulation'],
        correctIdx: 0,
        solText: `${struct[0]}: ${struct[1]}.`
      };
    },
    () => {
      const N0 = p1 * 100, r = (p2 * 0.01 + 0.1).toFixed(2), t = p3 % 5 + 2;
      const Nt = Math.round(N0 * Math.exp(parseFloat(r) * t));
      return {
        qText: `The graph below shows population growth of a species in a nature reserve:\n\n  Population↑\n  ${Nt} |                              ╭─ (actual)\n       |                       ╭──\n       |                  ╭──\n  K/2  |           ╭── (logistic sigmoid)\n       |      ╭──\n  ${N0}  | ╭──\n       +——————————————————————→ Time (years)\n       0               ${t}\n\nInitial population $N_0 = ${N0}$, intrinsic growth rate $r = ${r}$ yr$^{-1}$.\nUsing the exponential growth model $N_t = N_0 e^{rt}$, find the population at $t = ${t}$ years (nearest integer):`,
        opts: [`${Nt}`, `${Math.round(Nt*1.5)}`, `${Math.round(N0 + N0*parseFloat(r)*t)}`, `${Math.round(Nt*0.5)}`],
        correctIdx: 0,
        solText: `$N_t = N_0 e^{rt} = ${N0} \\times e^{${r}\\times${t}} = ${N0} \\times e^{${(parseFloat(r)*t).toFixed(2)}} \\approx ${Nt}$.`
      };
    }
  ];

  const diagramFns = isZoology ? ZOOLOGY_DIAGRAMS : BOTANY_DIAGRAMS;
  const result = diagramFns[familyId]();
  return { qText: result.qText, opts: result.opts, correctIdx: result.correctIdx, solText: result.solText, qType: 'diagram_based' };
}

function generateBiologyStatement(index, isZoology) {
  const familyId = index % 5;
  const paramIdx = Math.floor(index / 5);
  let rem = paramIdx;
  const p1 = (rem % 70) + 1; rem = Math.floor(rem/70);
  const p2 = (rem % 50) + 1; rem = Math.floor(rem/50);
  const p3 = (rem % 30) + 1;
  const correctPattern = rem % 6;

  const BOTANY_TOPICS = [
    { title: 'Photosynthesis and Light Reactions',
      trueStmts: ['Photosystem II (P680) is involved in the splitting of water molecules (photolysis), releasing oxygen as a byproduct.','The Z-scheme describes the non-cyclic electron flow from water → PS II → PS I → NADP⁺, producing both ATP and NADPH.','In cyclic photophosphorylation, only PS I is involved and only ATP is produced (no NADPH, no O₂ evolution).','The oxygen released during photosynthesis comes exclusively from the splitting of water, not from CO₂.'],
      falseStmts: ['Photosystem I absorbs light at 680 nm and is responsible for water splitting (photolysis).','RuBisCO is located in the thylakoid membrane and directly absorbs light energy for CO₂ fixation.']
    },
    { title: 'Plant Kingdom Classification',
      trueStmts: ['Bryophytes are called "amphibians of the plant kingdom" because they require water for sexual reproduction (flagellated sperm) but can live on land.','Pteridophytes (ferns) were the first vascular plants and dominated during the Carboniferous period, forming coal deposits.','In gymnosperms, fertilization is siphonogamy — pollen tube carries the male gametes directly to the egg, eliminating the need for water.','Angiosperms are the most diverse group of plants with about 250,000 species, showing a wide range of adaptations.'],
      falseStmts: ['Algae (thallophytes) are the most evolutionarily advanced group of the plant kingdom.','Mosses (bryophytes) are the dominant phase in their life cycle as the sporophyte generation.']
    },
    { title: 'Genetics and Mendelian Principles',
      trueStmts: ['Mendel\'s Law of Segregation states that two alleles for each trait separate during gamete formation so each gamete carries only one allele.','In incomplete dominance, the F1 heterozygote shows an intermediate phenotype (neither parent\'s phenotype), e.g., pink flowers from red × white.','Co-dominance (e.g., ABO blood groups) shows both alleles expressed simultaneously in the heterozygote phenotype.','The chi-square test (χ²) is used to determine if observed genetic ratios deviate significantly from expected Mendelian ratios.'],
      falseStmts: ['Linked genes always show 100% recombination frequency regardless of their physical distance on the chromosome.','A testcross (backcross with homozygous recessive) cannot determine the genotype of a dominant-phenotype organism.']
    },
    { title: 'Plant Anatomy and Tissue Systems',
      trueStmts: ['The vascular bundle in dicot stems is open (contains cambium between xylem and phloem), allowing secondary growth.','Collenchyma cells have unevenly thickened (pectin-rich) primary walls and provide mechanical support to young, growing parts.','Sclerenchyma cells are dead at maturity and have highly lignified secondary walls; they provide rigidity and support.','The Casparian strip in the root endodermis forces water and mineral ions to pass through the symplast pathway.'],
      falseStmts: ['Monocot stems have vascular bundles arranged in a ring (as seen in cross-section), similar to dicots.','The pericycle is the innermost layer of the cortex in roots and gives rise to lateral roots.']
    },
    { title: 'Ecological Principles',
      trueStmts: ['The 10% law (Lindemann) states that only about 10% of energy is transferred from one trophic level to the next.','Biodiversity hotspots are regions with exceptionally high species richness AND high levels of endemism that face significant habitat loss.','Symbiosis in the broad sense includes mutualism (+/+), commensalism (+/0), and parasitism (+/−).','Primary succession occurs on bare, lifeless substrate (bare rock, new volcanic island) where soil is absent initially.'],
      falseStmts: ['Secondary succession is slower than primary succession because it starts without any established biotic community.','Competitive exclusion principle states that two similar species can occupy the same niche indefinitely without one outcompeting the other.']
    }
  ];

  const ZOOLOGY_TOPICS = [
    { title: 'Human Physiology: Digestion and Absorption',
      trueStmts: ['Digestion of starch begins in the mouth by salivary amylase (pH optimum ~7) and continues in the small intestine by pancreatic amylase.','The small intestine is the primary site of digestion and absorption; villi and microvilli (brush border) increase surface area ~600-fold.','Bile salts (produced by liver, stored in gallbladder) emulsify fats into micelles, increasing surface area for lipase action.','Intrinsic factor (IF), secreted by gastric parietal cells, is essential for absorption of Vitamin B12 in the ileum.'],
      falseStmts: ['Pepsin is the enzyme responsible for fat digestion in the stomach (pH 2-3).','The large intestine is the primary site for absorption of digested nutrients (proteins, fats, carbohydrates).']
    },
    { title: 'Human Physiology: Circulation',
      trueStmts: ['The SA node (sinoatrial node), located in the right atrium, is the natural pacemaker of the heart setting the heart rate.','In the ECG, the P wave represents atrial depolarization, QRS complex represents ventricular depolarization, and T wave is ventricular repolarization.','Systolic pressure represents the maximum pressure in arteries during ventricular contraction; diastolic is the minimum during relaxation.','Erythrocytes (RBCs) lack a nucleus and mitochondria in mature form, allowing more space for hemoglobin.'],
      falseStmts: ['Veins always carry deoxygenated blood and arteries always carry oxygenated blood in the human body.','The AV node is the primary pacemaker of the heart and generates the highest frequency of electrical impulses.']
    },
    { title: 'Animal Kingdom Classification',
      trueStmts: ['Porifera (sponges) are the most primitive multicellular animals; they are asymmetrical and lack true tissues.','Cnidaria (jellyfish, Hydra, corals) possess cnidoblasts (nematocysts) used for prey capture and defense.','Platyhelminthes (flatworms) are the simplest acoelomate bilaterians with true organs but no body cavity.','Arthropoda is the largest phylum with jointed appendages, exoskeleton (chitin), and open circulatory system.'],
      falseStmts: ['All members of Phylum Echinodermata have bilateral symmetry in both larval and adult stages.','Nematoda (roundworms) are acoelomates — they lack any body cavity between the gut and body wall.']
    },
    { title: 'Human Reproduction and Reproductive Health',
      trueStmts: ['Spermatogenesis occurs in the seminiferous tubules under the influence of FSH (from pituitary) and testosterone (from Leydig cells).','In the female, the primary oocyte (arrested in prophase I) completes meiosis I just before ovulation, forming the secondary oocyte + first polar body.','The placenta is both an endocrine organ (produces HCG, estrogen, progesterone) and a site of nutrient/gas exchange between mother and fetus.','HCG (Human Chorionic Gonadotropin) is produced by the trophoblast after implantation and is the basis of pregnancy tests.'],
      falseStmts: ['In humans, the egg (ovum) completes meiosis II before ovulation occurs, so the egg that is released is a mature ovum.','The corpus luteum maintains progesterone production throughout the entire 9-month pregnancy.']
    },
    { title: 'Evolution and Biodiversity',
      trueStmts: ['Natural selection acts on phenotypic variation in a population, and if the variation is heritable, this can lead to evolutionary change over generations.','Hardy-Weinberg equilibrium requires no mutation, random mating, no migration, large population size, and no natural selection.','The fossil record, comparative anatomy (homologous structures), and molecular evidence all support the theory of evolution by common descent.','Genetic drift (random changes in allele frequency) is more significant in small populations, potentially leading to fixation or loss of alleles.'],
      falseStmts: ['Lamarck\'s theory of evolution (inheritance of acquired characteristics) is accepted by modern evolutionary biology.','Analogous structures (like wings of bats and birds) are evidence of common ancestry (homology).']
    }
  ];

  const topics = isZoology ? ZOOLOGY_TOPICS : BOTANY_TOPICS;
  const topic = topics[familyId];
  const ts = topic.trueStmts, fs = topic.falseStmts;
  const patterns = [
    { stmts: [ts[p1%ts.length], ts[p2%ts.length], ts[p3%ts.length]], correct: 'Statements I, II and III are all correct', wrongOpts: ['Statements I and II only', 'Statement III only', 'Statements II and III only'] },
    { stmts: [ts[p1%ts.length], ts[p2%ts.length], fs[p3%fs.length]], correct: 'Statements I and II only', wrongOpts: ['Statements I, II and III', 'Statement II only', 'Statements II and III only'] },
    { stmts: [ts[p1%ts.length], fs[p2%fs.length], ts[p3%ts.length]], correct: 'Statements I and III only', wrongOpts: ['Statements I, II and III', 'Statement I only', 'Statements II and III only'] },
    { stmts: [ts[p1%ts.length], fs[p2%fs.length], fs[p3%fs.length]], correct: 'Statement I only', wrongOpts: ['Statements I and II only', 'Statements I, II and III', 'None of the statements'] },
    { stmts: [fs[p1%fs.length], ts[p2%ts.length], ts[p3%ts.length]], correct: 'Statements II and III only', wrongOpts: ['Statements I and II only', 'Statements I, II and III', 'Statement III only'] },
    { stmts: [fs[p1%fs.length], fs[p2%fs.length], ts[p3%ts.length]], correct: 'Statement III only', wrongOpts: ['None of the statements', 'Statements I and III only', 'Statements I, II and III'] }
  ];
  const pat = patterns[correctPattern];
  const qText = `Which of the following statements about **${topic.title}** is/are CORRECT?\n\nStatement I: ${pat.stmts[0]}\nStatement II: ${pat.stmts[1]}\nStatement III: ${pat.stmts[2]}`;
  const correctIdx = p1 % 4;
  const allOpts = [pat.correct, ...pat.wrongOpts];
  const opts = new Array(4);
  for (let k = 0; k < 4; k++) opts[(correctIdx + k) % 4] = allOpts[k];
  return { qText, opts, correctIdx, solText: `${pat.correct} about ${topic.title}.`, qType: 'statement_based' };
}

// ============================================================
// MAIN GENERATION LOOP
// ============================================================

const subjectGenerators = [
  {
    id: 1, name: 'Physics',
    generators: [
      { fn: generatePhysicsAR,        type: 'assertion_reason' },
      { fn: generatePhysicsMatch,     type: 'match_following' },
      { fn: generatePhysicsDiagram,   type: 'diagram_based' },
      { fn: generatePhysicsStatement, type: 'statement_based' }
    ]
  },
  {
    id: 2, name: 'Chemistry',
    generators: [
      { fn: generateChemistryAR,        type: 'assertion_reason' },
      { fn: generateChemistryMatch,     type: 'match_following' },
      { fn: generateChemistryDiagram,   type: 'diagram_based' },
      { fn: generateChemistryStatement, type: 'statement_based' }
    ]
  },
  {
    id: 3, name: 'Botany',
    generators: [
      { fn: (i) => generateBiologyAR(i, false),        type: 'assertion_reason' },
      { fn: (i) => generateBiologyMatch(i, false),     type: 'match_following' },
      { fn: (i) => generateBiologyDiagram(i, false),   type: 'diagram_based' },
      { fn: (i) => generateBiologyStatement(i, false), type: 'statement_based' }
    ]
  },
  {
    id: 4, name: 'Zoology',
    generators: [
      { fn: (i) => generateBiologyAR(i, true),        type: 'assertion_reason' },
      { fn: (i) => generateBiologyMatch(i, true),     type: 'match_following' },
      { fn: (i) => generateBiologyDiagram(i, true),   type: 'diagram_based' },
      { fn: (i) => generateBiologyStatement(i, true), type: 'statement_based' }
    ]
  }
];

const startAll = Date.now();
let grandTotal = 0;

for (const sub of subjectGenerators) {
  const subChList = chsBySubject[sub.id];
  if (!subChList || subChList.length === 0) { console.error(`No chapters for ${sub.name}!`); continue; }

  for (const gen of sub.generators) {
    const typeStart = Date.now();
    console.log(`\n--- ${sub.name}: ${gen.type} ---`);
    console.log(`Generating ${TARGET.toLocaleString()} questions...`);

    db.exec('BEGIN TRANSACTION');
    for (let i = 0; i < TARGET; i++) {
      const qId = currentQId++;
      const chId = subChList[i % subChList.length];
      const { qText, opts, correctIdx, solText } = gen.fn(i);

      runWithRetry(insertQ, [qId, EXAM_ID, sub.id, chId, qText, gen.type]);
      runWithRetry(insertO, [
        qId, opts[0], correctIdx === 0 ? 1 : 0,
        qId, opts[1], correctIdx === 1 ? 1 : 0,
        qId, opts[2], correctIdx === 2 ? 1 : 0,
        qId, opts[3], correctIdx === 3 ? 1 : 0
      ]);
      runWithRetry(insertS, [qId, solText]);

      if ((i + 1) % BATCH === 0) {
        db.exec('COMMIT');
        db.exec('BEGIN TRANSACTION');
        process.stdout.write(`  Progress: ${(i+1).toLocaleString()} / ${TARGET.toLocaleString()} (${Math.round(((i+1)/TARGET)*100)}%)\r`);
      }
    }
    db.exec('COMMIT');
    grandTotal += TARGET;
    console.log(`\n  Completed ${gen.type} for ${sub.name} in ${Math.round((Date.now()-typeStart)/1000)}s`);
  }
}

db.exec('PRAGMA foreign_keys = ON;');
db.close();

console.log(`\n\n🎉 All special question types generated!`);
console.log(`Total questions added: ${grandTotal.toLocaleString()}`);
console.log(`Total time: ${Math.round((Date.now()-startAll)/1000)}s (${Math.round((Date.now()-startAll)/60000)} minutes)`);
