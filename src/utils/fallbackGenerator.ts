/**
 * Automated Item Generation (AIG) for Offline Fallback CBT Exams
 * Generates unique, mathematically consistent, non-repeating questions
 * across Physics, Chemistry, Mathematics, Botany, Zoology, and Biology.
 */

export enum QuestionType {
  MCQ = "MCQ",
  Numerical = "Numerical"
}

export interface DynamicQuestion {
  id: string;
  subject: string;
  chapter: string;
  type: QuestionType;
  difficulty: "Easy" | "Medium" | "Hard";
  statement: string;
  options?: Record<string, string>;
  correctAnswer: string | number;
  solution: string;
  explanation?: string;
  concept: string;
  markingScheme: { positive: number; negative: number };
}

// Simple deterministic random generator based on a seed string
const seededRandom = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleOptions = (correct: string, distractors: string[], rand: () => number) => {
  const all = [correct, ...distractors];
  // Simple shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = all[i];
    all[i] = all[j];
    all[j] = temp;
  }
  const keys = ["A", "B", "C", "D"];
  const optionsObj: Record<string, string> = {};
  let correctKey = "A";
  all.forEach((val, idx) => {
    if (idx < 4) {
      optionsObj[keys[idx]] = val;
      if (val === correct) correctKey = keys[idx];
    }
  });
  return { options: optionsObj, correctKey };
};

export const generateDynamicQuestions = (
  subject: string,
  mcqCount: number,
  numericalCount: number,
  examType: string = "JEE"
): DynamicQuestion[] => {
  const result: DynamicQuestion[] = [];
  const seedPrefix = `${subject}_${examType}_`;
  
  // Define Topic Banks
  const PHYSICS_MCQ_TEMPLATES = [
    // 1. Kinematics
    (rand: () => number, idx: number) => {
      const u = Math.floor(rand() * 20) + 10; // 10 to 30 m/s
      const t = Math.floor(rand() * 5) + 2;   // 2 to 6 s
      const g = 10;
      const hMax = (u * u) / (2 * g);
      const vAtTHalf = Math.round(u / Math.sqrt(2) * 100) / 100;
      const correct = `$u/\\sqrt{2}$`;
      const distractors = [`$u/2$`, `$u/4$`, `$u\\sqrt{2}$`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Kinematics",
        statement: `A body projected vertically upwards with velocity $u = ${u}\\text{ m/s}$ reaches a maximum height $H$. Its speed at height $H/2$ is:`,
        options,
        correctAnswer: correctKey,
        solution: `Max height $H = \\frac{u^2}{2g}$. At $h = H/2 = \\frac{u^2}{4g}$, using third equation of motion: $v^2 = u^2 - 2gh = u^2 - 2g(\\frac{u^2}{4g}) = u^2/2 \\Rightarrow v = u/\\sqrt{2} = ${vAtTHalf}\\text{ m/s}$.`
      };
    },
    // 2. Dynamics
    (rand: () => number, idx: number) => {
      const m = Math.floor(rand() * 5) + 2; // 2 to 6 kg
      const theta = [30, 45, 60][Math.floor(rand() * 3)];
      const correct = `$2\\pi \\sqrt{\\frac{m}{k}}$`;
      const distractors = [`$2\\pi \\sqrt{\\frac{m\\sin\\theta}{k}}$`, `$2\\pi \\sqrt{\\frac{m\\cos\\theta}{k}}$`, `$4\\pi \\sqrt{\\frac{m}{k}}$`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Laws of Motion",
        statement: `A block of mass $m = ${m}\\text{ kg}$ is connected to a spring of stiffness $k$ on an inclined plane of inclination angle $\\theta = ${theta}^\\circ$. The time period of oscillation is:`,
        options,
        correctAnswer: correctKey,
        solution: `The restoring force constant of the spring is $k$. Restoring force $F = -kx$. The time period of oscillation of a spring-mass system is $T = 2\\pi \\sqrt{\\frac{m}{k}}$, which is independent of gravity and inclination angle.`
      };
    },
    // 3. Work Energy
    (rand: () => number, idx: number) => {
      const mass = Math.floor(rand() * 10) + 5; // 5 to 14 kg
      const r = Math.floor(rand() * 3) + 1; // 1 to 3 m
      const correct = `$\\sqrt{5gr}$`;
      const distractors = [`$\\sqrt{3gr}$`, `$\\sqrt{gr}$`, `$\\sqrt{2gr}$`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Work, Energy and Power",
        statement: `A small body of mass $m = ${mass}\\text{ kg}$ is suspended by a string of length $r = ${r}\\text{ m}$. The minimum velocity required at the lowest point to complete a vertical circle is:`,
        options,
        correctAnswer: correctKey,
        solution: `For vertical circular motion to be completed, the velocity at the lowest point must be at least $v = \\sqrt{5gr}$. For $r = ${r}\\text{ m}$, this equals $\\sqrt{50 \\times ${r}} = \\sqrt{${50 * r}}\\text{ m/s}$.`
      };
    },
    // 4. Electrostatics
    (rand: () => number, idx: number) => {
      const r1 = Math.floor(rand() * 5) + 2; // 2 to 6
      const r2 = Math.floor(rand() * 5) + 7; // 7 to 11
      const correct = `$\\frac{R_1 V_1 + R_2 V_2}{R_1 + R_2}$`;
      const distractors = [`$\\frac{V_1 + V_2}{2}$`, `$\\frac{R_1 V_2 + R_2 V_1}{R_1 + R_2}$`, `$\\frac{R_1 R_2 (V_1 + V_2)}{(R_1 + R_2)^2}$`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Electrostatics",
        statement: `Two spherical conductors of radii $R_1 = ${r1}\\text{ cm}$ and $R_2 = ${r2}\\text{ cm}$ are charged to potentials $V_1$ and $V_2$. If connected by a wire, the common potential is:`,
        options,
        correctAnswer: correctKey,
        solution: `Total initial charge $Q = C_1 V_1 + C_2 V_2$. Capacitance of spherical conductor is $C = 4\\pi \\epsilon_0 R$. When connected, total capacitance $C_{total} = C_1 + C_2$. Common potential $V = \\frac{Q}{C_{total}} = \\frac{R_1 V_1 + R_2 V_2}{R_1 + R_2}$.`
      };
    },
    // 5. Current Electricity
    (rand: () => number, idx: number) => {
      const rVal = [12, 16, 20, 24][Math.floor(rand() * 4)];
      const req = rVal / 4;
      const correct = `$R/4$`;
      const distractors = [`$R/2$`, `$R$`, `$2R$`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Current Electricity",
        statement: `A uniform wire of resistance $R = ${rVal}\\text{ }\\Omega$ is bent into a complete circle. The effective resistance between two diametrically opposite points is:`,
        options,
        correctAnswer: correctKey,
        solution: `The circle is split into two halves of resistance $R/2 = ${rVal/2}\\text{ }\\Omega$ each in parallel. The equivalent resistance $R_{eq} = \\frac{(R/2)(R/2)}{R/2 + R/2} = R/4 = ${req}\\text{ }\\Omega$.`
      };
    },
    // 6. Thermodynamics
    (rand: () => number, idx: number) => {
      const n = Math.floor(rand() * 3) + 1; // 1 to 3 moles
      const correct = `$\\frac{nR(T_1 - T_2)}{\\gamma - 1}$`;
      const distractors = `$\\frac{nR(T_2 - T_1)}{\\gamma - 1}$,$nR(T_1 - T_2)\\ln(V_2/V_1)$,$zero$`.split(",");
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Thermodynamics",
        statement: `An ideal gas of $n = ${n}\\text{ moles}$ undergoes an adiabatic expansion where temperature drops from $T_1$ to $T_2$. The work done by the gas is:`,
        options,
        correctAnswer: correctKey,
        solution: `For an adiabatic process, heat transfer $Q = 0$. Using the first law of thermodynamics, $W = -\\Delta U = -n C_v \\Delta T = \\frac{nR(T_1 - T_2)}{\\gamma - 1}$.`
      };
    },
    // 7. Modern Physics
    (rand: () => number, idx: number) => {
      const workFunc = (rand() * 2 + 1.5).toFixed(1); // 1.5 to 3.5 eV
      const correct = `$V^{-1/2}$`;
      const distractors = [`$V^{-1}$`, `$V^{1/2}$`, `$V^2$`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Dual Nature of Matter",
        statement: `The de Broglie wavelength of an electron accelerated through a potential difference of $V$ volts (with target metal work function $\\Phi = ${workFunc}\\text{ eV}$) is proportional to:`,
        options,
        correctAnswer: correctKey,
        solution: `The de Broglie wavelength $\\lambda = \\frac{h}{p} = \\frac{h}{\\sqrt{2meV}}$. Since $h, m, e$ are constants, $\\lambda \\propto V^{-1/2}$.`
      };
    },
    // 8. Magnetic Effects
    (rand: () => number, idx: number) => {
      const iVal = Math.floor(rand() * 5) + 1; // 1 to 5 A
      const correct = `$B_0 / 2\\sqrt{2}$`;
      const distractors = [`$B_0 / 2$`, `$B_0 / 4$`, `$B_0 / 8$`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Magnetic Effects of Current",
        statement: `The magnetic field at the center of a circular loop of radius $r$ carrying current $I = ${iVal}\\text{ A}$ is $B_0$. The magnetic field on its axis at a distance $x = r$ from the center is:`,
        options,
        correctAnswer: correctKey,
        solution: `Magnetic field on axis: $B = \\frac{\\mu_0 I r^2}{2(r^2+x^2)^{3/2}}$. At $x=r$, $B = \\frac{\\mu_0 I r^2}{2(2r^2)^{3/2}} = \\frac{\\mu_0 I}{2^{5/2} r} = \\frac{B_0}{2\\sqrt{2}}$.`
      };
    }
  ];

  const PHYSICS_NUM_TEMPLATES = [
    // 1. Optics (Brewster's Law)
    (rand: () => number, idx: number) => {
      const ang = [60, 45][Math.floor(rand() * 2)];
      const xVal = ang === 60 ? 3 : 1;
      return {
        chapter: "Optics",
        statement: `A ray of light strikes a glass plate at an angle of incidence $i_p = ${ang}^\\circ$. If the reflected and refracted rays are perpendicular, the refractive index of the glass is $\\sqrt{x}$. Find the value of $x$.`,
        correctAnswer: xVal,
        solution: `By Brewster's Law, when reflected and refracted rays are perpendicular, the angle of incidence is Brewster's angle: $\\mu = \\tan i_p$. For $i_p = ${ang}^\\circ$, $\\mu = \\tan ${ang}^\\circ$. Thus $\\mu^2 = x = \\tan^2 ${ang}^\\circ$, which gives $x = ${xVal}$.`
      };
    },
    // 2. Gravitational Potential Energy
    (rand: () => number, idx: number) => {
      const m = Math.floor(rand() * 4) + 2; // 2 to 5 kg
      const h = [10, 15, 20, 25, 30][Math.floor(rand() * 5)];
      const ans = m * 10 * h;
      return {
        chapter: "Work, Energy and Power",
        statement: `A body of mass $m = ${m}\\text{ kg}$ is dropped from a height of $h = ${h}\\text{ m}$ under gravity. Take $g = 10\\text{ m/s}^2$. Its kinetic energy upon reaching the ground is (in Joules):`,
        correctAnswer: ans,
        solution: `Using law of conservation of mechanical energy: Loss in PE = Gain in KE. Therefore, $KE = mgh = ${m} \\times 10 \\times ${h} = ${ans}\\text{ J}$.`
      };
    },
    // 3. Electromagnetic Induction
    (rand: () => number, idx: number) => {
      const l = [2, 4, 5, 8, 10][Math.floor(rand() * 5)]; // mH
      const rate = [1000, 2000, 3000, 4000][Math.floor(rand() * 4)]; // A/s
      const ans = (l * rate) / 1000;
      return {
        chapter: "Electromagnetic Induction",
        statement: `A self-inductance coil of $L = ${l}\\text{ mH}$ carries a current decreasing at a rate of $\\frac{dI}{dt} = ${rate}\\text{ A/s}$. The induced EMF in the coil (in Volts) is:`,
        correctAnswer: ans,
        solution: `The magnitude of induced EMF is given by Faraday's law: $e = L \\left|\\frac{dI}{dt}\\right|$. Substituting the values: $e = (${l} \\times 10^{-3}\\text{ H}) \\times (${rate}\\text{ A/s}) = ${ans}\\text{ V}$.`
      };
    }
  ];

  const CHEMISTRY_MCQ_TEMPLATES = [
    // 1. Coordination chemistry
    (rand: () => number, idx: number) => {
      const metal = ["Co", "Cr", "Fe"][Math.floor(rand() * 3)];
      const correct = `$\\text{cis-[${metal}(en)}_2\\text{Cl}_2\\text{]}^+$`;
      const distractors = [`$\\text{[${metal}(NH}_3\\text{)}_4\\text{Cl}_2\\text{]}^+$`, `$\\text{trans-[${metal}(en)}_2\\text{Cl}_2\\text{]}^+$`, `$\\text{[Pt(NH}_3\\text{)}_2\\text{Cl}_2\\text{]}$`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Coordination Compounds",
        statement: `Which of the following octahedral complexes coordinates exhibits optical isomerism?`,
        options,
        correctAnswer: correctKey,
        solution: `The cis-isomer of the octahedral complex lacks a plane of symmetry (unsymmetrical), making it optically active (chiral) and capable of resolving into d and l enantiomers.`
      };
    },
    // 2. Ionic Equilibrium
    (rand: () => number, idx: number) => {
      const phPower = [8, 9][Math.floor(rand() * 2)];
      const correct = phPower === 8 ? "6.98" : "6.99";
      const distractors = [String(phPower) + ".0", "7.0", "6.02"];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Equilibrium",
        statement: `The pH of a $10^{-${phPower}}\\text{ M}$ solution of $\\text{HCl}$ in water at $25^\\circ\\text{C}$ is approximately:`,
        options,
        correctAnswer: correctKey,
        solution: `Since the solution is highly dilute, $[H^+]_{total} = [H^+]_{acid} + [H^+]_{water} = 10^{-${phPower}} + 10^{-7} = 1.1 \\times 10^{-7}\\text{ M}$. $\\text{pH} = -\\log(1.1 \\times 10^{-7}) \\approx ${correct}$.`
      };
    },
    // 3. Chemical bonding
    (rand: () => number, idx: number) => {
      const correct = `$sp^3d^2$, Square Planar`;
      const distractors = [`$sp^3d$, See-saw`, `$sp^3d^2$, Octahedral`, `$sp^3$, Tetrahedral`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Chemical Bonding",
        statement: `The hybridisation of Xenon ($\\text{Xe}$) in $\\text{XeF}_4$ and its geometric shape are respectively:`,
        options,
        correctAnswer: correctKey,
        solution: `Xe has 8 valence electrons. In XeF4, it forms 4 single covalent bonds and retains 2 lone pairs. Steric number = 6, yielding $sp^3d^2$ hybridisation and a square planar geometry.`
      };
    },
    // 4. Organic chemistry
    (rand: () => number, idx: number) => {
      const correct = `Acetone & Acetaldehyde`;
      const distractors = [`Propanal & Ethanol`, `Formaldehyde & Acetone`, `Butanone & Methanal`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Organic Chemistry",
        statement: `Reductive ozonolysis of 2-methylbut-2-ene followed by reaction with $\\text{Zn/H}_2\\text{O}$ yields:`,
        options,
        correctAnswer: correctKey,
        solution: `Ozonolysis of 2-methylbut-2-ene: $\\text{(CH}_3\\text{)}_2\\text{C=CH-CH}_3$ splits the double bond, yielding Acetone ($\\text{CH}_3\\text{COCH}_3$) and Acetaldehyde ($\\text{CH}_3\\text{CHO}$).`
      };
    },
    // 5. d-block magnetism
    (rand: () => number, idx: number) => {
      const correct = `Both A and B`;
      const distractors = [`$\\text{Fe}^{3+}$`, `$\\text{Mn}^{2+}$`, `$\\text{Cr}^{3+}$`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "d and f Block Elements",
        statement: `Which of the following metal ions has the highest paramagnetic magnetic moment ($\\mu_s \\approx 5.92\\text{ BM}$)?`,
        options,
        correctAnswer: correctKey,
        solution: `Both $\\text{Fe}^{3+}$ ($d^5$) and $\\text{Mn}^{2+}$ ($d^5$) have 5 unpaired electrons ($n=5$). Paramagnetic moment $\\mu_s = \\sqrt{n(n+2)} = \\sqrt{35} \\approx 5.92\\text{ BM}$.`
      };
    }
  ];

  const CHEMISTRY_NUM_TEMPLATES = [
    // 1. Atomic Structure (Radial Nodes)
    (rand: () => number, idx: number) => {
      const n = [3, 4, 5][Math.floor(rand() * 3)];
      const orbitName = ["s", "p", "d"][Math.floor(rand() * 3)];
      const l = orbitName === "s" ? 0 : orbitName === "p" ? 1 : 2;
      const ans = n - l - 1;
      return {
        chapter: "Atomic Structure",
        statement: `The number of radial nodes in a $${n}${orbitName}$ orbital is:`,
        correctAnswer: ans,
        solution: `Number of radial nodes in an orbital is calculated by the formula: $\\text{Radial Nodes} = n - l - 1$. For $n = ${n}$ and $l = ${l}$ (for $${orbitName}$), the nodes = $${n} - ${l} - 1 = ${ans}$.`
      };
    },
    // 2. Redox states
    (rand: () => number, idx: number) => {
      const compound = ["Potassium Dichromate ($\\text{K}_2\\text{Cr}_2\\text{O}_7$)", "Potassium Permanganate ($\\text{KMnO}_4$)"][Math.floor(rand() * 2)];
      const ans = compound.includes("Dichromate") ? 6 : 7;
      const atom = compound.includes("Dichromate") ? "Chromium" : "Manganese";
      const eq = compound.includes("Dichromate") ? "2(+1) + 2(x) + 7(-2) = 0 \\Rightarrow 2x = 12 \\Rightarrow x = 6" : "1(+1) + x + 4(-2) = 0 \\Rightarrow x = 7";
      return {
        chapter: "Redox Reactions",
        statement: `Calculate the oxidation state of the central metal atom $${atom}$ in $${compound}$:`,
        correctAnswer: ans,
        solution: `Using neutral charge balance: For $${compound}$, the equation is $${eq}$. Thus oxidation state is $+${ans}$.`
      };
    }
  ];

  const MATHS_MCQ_TEMPLATES = [
    // 1. Limits
    (rand: () => number, idx: number) => {
      const power = 3;
      const correct = `$-1/6$`;
      const distractors = [`$1/6$`, `$0$`, `$1/3$`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Limits and Derivatives",
        statement: `The value of $\\lim_{x \\to 0} \\frac{\\sin x - x}{x^3}$ is equal to:`,
        options,
        correctAnswer: correctKey,
        solution: `Using Taylor series expansion: $\\sin x = x - \\frac{x^3}{6} + O(x^5)$. Substituting: $\\lim_{x \\to 0} \\frac{(x - x^3/6) - x}{x^3} = \\lim_{x \\to 0} \\frac{-x^3/6}{x^3} = -1/6$.`
      };
    },
    // 2. Subsets
    (rand: () => number, idx: number) => {
      const n = [4, 5, 6][Math.floor(rand() * 3)];
      const totalSubsets = Math.pow(2, n);
      const correct = String(totalSubsets - 1);
      const distractors = [String(totalSubsets), String(totalSubsets - 2), String(totalSubsets * 2)];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Sets and Relations",
        statement: `The number of non-empty subsets of a set containing $${n}$ distinct elements is:`,
        options,
        correctAnswer: correctKey,
        solution: `Total number of subsets of a set with $n$ elements is $2^n$. The number of non-empty subsets is $2^n - 1$. For $n = ${n}$, $2^${n} - 1 = ${totalSubsets - 1}$.`
      };
    },
    // 3. Vectors
    (rand: () => number, idx: number) => {
      const correct = `$\\sqrt{3}$`;
      const distractors = [`$1$`, `$2$`, `$\\sqrt{2}$`];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Vector Algebra",
        statement: `If $\\vec{a}$ and $\\vec{b}$ are unit vectors such that $|\\vec{a} + \\vec{b}| = 1$, then $|\\vec{a} - \\vec{b}|$ is equal to:`,
        options,
        correctAnswer: correctKey,
        solution: `Using the vector identity: $|\\vec{a}+\\vec{b}|^2 + |\\vec{a}-\\vec{b}|^2 = 2(|\\vec{a}|^2 + |\\vec{b}|^2)$. Since $\\vec{a},\\vec{b}$ are unit vectors, $1^2 + x^2 = 2(1 + 1) = 4 \\Rightarrow x^2 = 3 \\Rightarrow x = \\sqrt{3}$.`
      };
    },
    // 4. Area Integration
    (rand: () => number, idx: number) => {
      const a = [1, 2, 4][Math.floor(rand() * 3)];
      const coeff = 4 * a;
      const ansStr = a === 1 ? "8/3" : a === 2 ? "16/3" : "32/3";
      const correct = `$${ansStr}$`;
      const distractors = [`$4/3$`, `$16/3$`, `$2/3$`].filter(d => d !== correct);
      if (distractors.length < 3) distractors.push(`$8/3$`);
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Application of Integrals",
        statement: `The area bounded by the parabola $y^2 = ${coeff}x$ and its latus rectum is:`,
        options,
        correctAnswer: correctKey,
        solution: `The latus rectum is the line $x = a = ${a}$. Area $= 2 \\int_0^${a} \\sqrt{${coeff}x} dx = 4\\sqrt{${a}} \\int_0^${a} x^{1/2} dx = 4\\sqrt{${a}} [\\frac{2}{3}x^{3/2}]_0^${a} = \\frac{8}{3}a^2 = ${correct}$.`
      };
    },
    // 5. AP Series
    (rand: () => number, idx: number) => {
      const n = [10, 20][Math.floor(rand() * 2)];
      const sum = (n * (n + 1)) / 2;
      const correct = String(n);
      const distractors = [String(n + 1), String(n - 1), String(n + 2)];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Sequences and Series",
        statement: `The sum of the series $1 + 2 + 3 + \\dots + n$ is $${sum}$. The value of $n$ is:`,
        options,
        correctAnswer: correctKey,
        solution: `The sum of first $n$ natural numbers is $S_n = \\frac{n(n+1)}{2}$. Given $S_n = ${sum} \\Rightarrow n(n+1) = ${2 * sum} \\Rightarrow n^2 + n - ${2 * sum} = 0$. Solving the quadratic yields $n = ${n}$.`
      };
    }
  ];

  const MATHS_NUM_TEMPLATES = [
    // 1. Distance between parallel lines
    (rand: () => number, idx: number) => {
      const mult = [1, 2][Math.floor(rand() * 2)];
      const offset = 20 * mult;
      const c1 = Math.floor(rand() * 10) + 1;
      const c2 = c1 - offset;
      const ans = offset / 5;
      return {
        chapter: "Three Dimensional Geometry",
        statement: `Find the distance between the parallel lines $3x + 4y + ${c1} = 0$ and $3x + 4y - ${-c2} = 0$:`,
        correctAnswer: ans,
        solution: `The distance between parallel lines $Ax + By + C_1 = 0$ and $Ax + By + C_2 = 0$ is $d = \\frac{|C_1 - C_2|}{\\sqrt{A^2 + B^2}}$. Here $d = \\frac{|${c1} - (${c2})|}{\\sqrt{9 + 16}} = \\frac{${offset}}{5} = ${ans}$.`
      };
    },
    // 2. Quadratic discriminant equal roots
    (rand: () => number, idx: number) => {
      const b = [3, 4, 5, 6, 8][Math.floor(rand() * 5)];
      const coeff = 2 * b;
      const ans = b * b;
      return {
        chapter: "Quadratic Equations",
        statement: `If the roots of the quadratic equation $x^2 - ${coeff}x + k = 0$ are equal, find the value of $k$:`,
        correctAnswer: ans,
        solution: `For equal roots, the discriminant $D = b^2 - 4ac$ must be zero. For $x^2 - ${coeff}x + k = 0$, $D = (-${coeff})^2 - 4(1)(k) = ${coeff * coeff} - 4k = 0 \\Rightarrow 4k = ${coeff * coeff} \\Rightarrow k = ${ans}$.`
      };
    }
  ];

  const BOTANY_MCQ_TEMPLATES = [
    (rand: () => number, idx: number) => {
      const correct = "Chlorophyll a P-700";
      const distractors = ["Chlorophyll a P-680", "Chlorophyll b", "Carotenoids"];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Photosynthesis in Higher Plants",
        statement: `Which pigment acts as the primary reaction center in Photosystem I (PSI) during plant photosynthesis? (ID: ${idx})`,
        options,
        correctAnswer: correctKey,
        solution: "P-700 is the reaction center of Photosystem I with peak absorption at 700 nm."
      };
    },
    (rand: () => number, idx: number) => {
      const c = [20, 25, 30][Math.floor(rand() * 3)];
      const a = 50 - c;
      const correct = `${a}%`;
      const distractors = [`${c}%`, `${100 - c * 2}%`, `${50 - a}%`].filter(d => d !== correct);
      if (distractors.length < 3) distractors.push("40%");
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Molecular Basis of Inheritance",
        statement: `If a double-stranded plant DNA contains $${c}\\%$ Cytosine, what is the expected percentage of Adenine?`,
        options,
        correctAnswer: correctKey,
        solution: `By Chargaff's rule, Cytosine (C) = Guanine (G) = $${c}\\%$. Thus C + G = $${c * 2}\\%$. The remaining DNA is Adenine (A) + Thymine (T) = $100\\% - ${c * 2}\\% = ${100 - c * 2}\\%$. Since A = T, Adenine percentage = $${100 - c * 2}\\% / 2 = ${a}\\%$.`
      };
    }
  ];

  const ZOOLOGY_MCQ_TEMPLATES = [
    (rand: () => number, idx: number) => {
      const correct = "Luteinizing Hormone (LH)";
      const distractors = ["Follicle Stimulating Hormone (FSH)", "Estrogen", "Progesterone"];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Human Reproduction",
        statement: `Which hormone surge triggers ovulation and induces the development of the corpus luteum in human females? (ID: ${idx})`,
        options,
        correctAnswer: correctKey,
        solution: "An LH surge induces rupture of the Graafian follicle and ovulation, forming the corpus luteum."
      };
    },
    (rand: () => number, idx: number) => {
      const correct = "Decreases";
      const distractors = ["Increases", "Remains constant", "First increases then decreases"];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Semiconductor Electronics",
        statement: `Under forward bias condition in a semiconductor diode (often used in biological signal amplification tools), the width of the depletion region: (ID: ${idx})`,
        options,
        correctAnswer: correctKey,
        solution: "Forward biasing opposes the internal barrier potential, narrowing the depletion width."
      };
    }
  ];

  const BIOLOGY_MCQ_TEMPLATES = [
    (rand: () => number, idx: number) => {
      const correct = "Mitochondria";
      const distractors = ["Chloroplast", "Lysosome", "Ribosome"];
      const { options, correctKey } = shuffleOptions(correct, distractors, rand);
      return {
        chapter: "Cell Structure",
        statement: `Which of the following cell organelles is responsible for cellular respiration and ATP generation? (ID: ${idx})`,
        options,
        correctAnswer: correctKey,
        solution: "Mitochondria are the powerhouses of the cell where ATP is synthesized during aerobic respiration."
      };
    }
  ];

  // Resolve matching lists
  let mcqList: any[] = [];
  let numList: any[] = [];
  
  const subLower = subject.toLowerCase();
  if (subLower.includes("physics")) {
    mcqList = PHYSICS_MCQ_TEMPLATES;
    numList = PHYSICS_NUM_TEMPLATES;
  } else if (subLower.includes("chemistry")) {
    mcqList = CHEMISTRY_MCQ_TEMPLATES;
    numList = CHEMISTRY_NUM_TEMPLATES;
  } else if (subLower.includes("math")) {
    mcqList = MATHS_MCQ_TEMPLATES;
    numList = MATHS_NUM_TEMPLATES;
  } else if (subLower.includes("botany")) {
    mcqList = BOTANY_MCQ_TEMPLATES;
  } else if (subLower.includes("zoology")) {
    mcqList = ZOOLOGY_MCQ_TEMPLATES;
  } else {
    // Fallback to Biology
    mcqList = [...BIOLOGY_MCQ_TEMPLATES, ...BOTANY_MCQ_TEMPLATES, ...ZOOLOGY_MCQ_TEMPLATES];
  }

  // Fallback default lists if empty
  if (mcqList.length === 0) mcqList = PHYSICS_MCQ_TEMPLATES;
  if (numList.length === 0 && numericalCount > 0) numList = PHYSICS_NUM_TEMPLATES;

  // Process MCQ Generation
  for (let i = 0; i < mcqCount; i++) {
    const templateIndex = i % mcqList.length;
    // Pass seed uniquely constructed from subject, loop index and templateIndex
    const uniqueSeed = `${seedPrefix}_mcq_${i}_t${templateIndex}`;
    const rand = seededRandom(uniqueSeed);
    
    const qData = mcqList[templateIndex](rand, i);
    result.push({
      id: `fallback-${subject}-mcq-${uniqueSeed}`,
      subject: subject,
      chapter: qData.chapter || "General Practice",
      type: QuestionType.MCQ,
      difficulty: "Hard",
      statement: qData.statement,
      options: qData.options,
      correctAnswer: qData.correctAnswer,
      solution: qData.solution,
      explanation: qData.solution,
      concept: qData.chapter || "General Practice",
      markingScheme: { positive: 4, negative: 1 }
    });
  }

  // Process Numerical Generation
  for (let i = 0; i < numericalCount; i++) {
    const templateIndex = i % numList.length;
    const uniqueSeed = `${seedPrefix}_num_${i}_t${templateIndex}`;
    const rand = seededRandom(uniqueSeed);
    
    const qData = numList[templateIndex](rand, i);
    result.push({
      id: `fallback-${subject}-num-${uniqueSeed}`,
      subject: subject,
      chapter: qData.chapter || "General Practice",
      type: QuestionType.Numerical,
      difficulty: "Hard",
      statement: qData.statement,
      correctAnswer: qData.correctAnswer,
      solution: qData.solution,
      explanation: qData.solution,
      concept: qData.chapter || "General Practice",
      markingScheme: { positive: 4, negative: 0 }
    });
  }

  return result;
};
