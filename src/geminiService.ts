import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Subject, ExamType, Question, QuestionType } from "./types";

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getAIClient = (overrideKey?: string) => {
    const apiKey = overrideKey || localStorage.getItem('user_gemini_api_key') || process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("AI Generation Failed: Gemini API Key is not configured.");
    }
    return new GoogleGenAI({ apiKey });
};

const callAIWithFallback = async (ai: GoogleGenAI, contents: any, config: any) => {
  let lastError: any = null;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI] Model ${model} attempt ${attempt} failed: ${err.message || err}`);
        await delay(attempt * 500);
      }
    }
  }
  throw lastError || new Error("All Gemini AI models and retries exhausted.");
};

export const verifyGeminiAPIKey = async (apiKey: string): Promise<boolean> => {
  try {
    const ai = getAIClient(apiKey);
    const response = await callAIWithFallback(ai, "Respond with exactly the word 'OK' if you can read this.", { systemInstruction: "Answer concisely." });
    return response.text?.trim().toUpperCase().includes("OK") || false;
  } catch (e: any) {
    console.error("Gemini API Key verification failed:", e);
    throw new Error(e.message || "Invalid API key or network error.");
  }
};

const questionSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING },
      chapter: { type: Type.STRING },
      type: { type: Type.STRING },
      difficulty: { type: Type.STRING },
      statement: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      correctAnswer: { type: Type.STRING },
      solution: { type: Type.STRING },
      explanation: { type: Type.STRING },
      concept: { type: Type.STRING },
      markingScheme: {
         type: Type.OBJECT,
         properties: { positive: { type: Type.INTEGER }, negative: { type: Type.INTEGER } }
      }
    },
    required: ["subject", "statement", "correctAnswer", "solution"]
  }
};

const generateJEEQuestionsBatch = async (subject: Subject, count: number, mcqTarget: number, numTarget: number, type: ExamType, chapters?: string[], difficulty?: string, topics?: string[], batchIdx: number = 0, totalBatches: number = 1): Promise<Question[]> => {
  const allQuestions: Question[] = [];
  const isFullSyllabus = !chapters || chapters.length === 0;
  let topicFocus = isFullSyllabus ? "Full Syllabus" : `Chapters: ${chapters.join(', ')}`;
  if (topics && topics.length > 0) {
      topicFocus += ` | Specific Topics: ${topics.join(', ')}`;
  }

  try {
      console.log(`[AI] [Batch ${batchIdx + 1} of ${totalBatches}] Generating ${count} questions for ${subject} (Batch Target: ${mcqTarget} MCQ, ${numTarget} Num)...`);
      const sessionEntropy = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const systemInstruction = `You are an expert JEE coach. Generate HIGHLY UNIQUE, ORIGINAL, and concept-heavy problems. Do not provide common textbook problems. Use LaTeX for math. Ensure output matches the exact JSON schema.`;
      
      const prompt = `BatchID: ${sessionEntropy}. 
      Generate EXACTLY ${count} UNIQUE questions for ${subject} (${type} level). 
      
      TARGET DISTRIBUTION:
      - ${mcqTarget} Multiple Choice Questions (type: "MCQ", must include 4 options in "options" array)
      - ${numTarget} Numerical Value Questions (type: "Numerical", leave "options" as empty array [])
      
      Scope: ${topicFocus}. Difficulty: ${difficulty || 'Advanced'}. Use LaTeX for math formulas.`;
      
      const ai = getAIClient();
      const response = await callAIWithFallback(ai, prompt, { 
        responseMimeType: "application/json", 
        responseSchema: questionSchema,
        systemInstruction: systemInstruction,
        temperature: 0.8,
        topP: 0.9,
      });
      
      let text = response.text || '';
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();

      if (text) {
          try {
              const data = JSON.parse(text);
              if (Array.isArray(data)) {
                  const normalizeQuestionOptions = (opts: any) => {
                      if (Array.isArray(opts)) {
                          const identifiers = ["A", "B", "C", "D"];
                          const obj: any = {};
                          opts.forEach((opt, idx) => {
                              if (idx < identifiers.length) {
                                  obj[identifiers[idx]] = opt;
                              }
                          });
                          return obj;
                      }
                      return opts || {};
                  };

                  data.forEach((q: any) => {
                      const hasOptions = Array.isArray(q.options) && q.options.length >= 2;
                      const qType = hasOptions ? 'MCQ' : 'Numerical';
                      const processedQ = {
                          ...q,
                          id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                          subject: q.subject || subject,
                          type: qType,
                          options: normalizeQuestionOptions(hasOptions ? q.options : []),
                          markingScheme: Object.assign({ positive: 4, negative: qType === 'Numerical' ? 0 : 1 }, q.markingScheme || {})
                      };
                      allQuestions.push(processedQ);
                  });
              }
          } catch (parseErr) {
              console.warn("[AI] JSON Parse Failure on Gemini response.", parseErr);
              throw new Error("Failed to parse AI response into JSON format.");
          }
      }
  } catch (e: any) {
      console.error(`[AI] [Batch ${batchIdx + 1}] Gemini API failure:`, e.message);
      throw e;
  }

  let finalMcqs = allQuestions.filter(q => q.type === 'MCQ');
  let finalNums = allQuestions.filter(q => q.type === 'Numerical');

  let selected = [...finalMcqs.slice(0, mcqTarget), ...finalNums.slice(0, numTarget)];
  if (selected.length < count && allQuestions.length > selected.length) {
      const remaining = allQuestions.filter(q => !selected.includes(q));
      selected.push(...remaining.slice(0, count - selected.length));
  }

  if (selected.length === 0) {
      throw new Error(`AI generated no valid questions for batch ${batchIdx + 1}.`);
  }

  return selected;
};

export const generateJEEQuestions = async (subject: Subject, count: number, type: ExamType, chapters?: string[], difficulty?: string, topics?: string[], distribution?: { mcq: number, numerical: number }): Promise<Question[]> => {
  let totalMcqTarget = distribution ? distribution.mcq : Math.ceil(count * 0.8);
  let totalNumTarget = distribution ? distribution.numerical : count - totalMcqTarget;
  
  const BATCH_SIZE = 10;
  const batches: { mcq: number; numerical: number }[] = [];
  
  let remainingMcq = totalMcqTarget;
  let remainingNum = totalNumTarget;
  
  while (remainingMcq > 0 || remainingNum > 0) {
      let batchMcq = 0;
      let batchNum = 0;
      
      while (batchMcq + batchNum < BATCH_SIZE && (remainingMcq > 0 || remainingNum > 0)) {
          if (remainingMcq > 0 && batchMcq < Math.ceil(BATCH_SIZE * 0.8)) {
              batchMcq++;
              remainingMcq--;
          } else if (remainingNum > 0) {
              batchNum++;
              remainingNum--;
          } else if (remainingMcq > 0) {
              batchMcq++;
              remainingMcq--;
          }
      }
      batches.push({ mcq: batchMcq, numerical: batchNum });
  }

  console.log(`[AI] Generating ${count} total questions for ${subject} split into ${batches.length} batches...`);

  const results: Question[] = [];
  for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchQs = await generateJEEQuestionsBatch(subject, batch.mcq + batch.numerical, batch.mcq, batch.numerical, type, chapters, difficulty, topics, i, batches.length);
      results.push(...batchQs);
      if (i < batches.length - 1) {
          await delay(300);
      }
  }

  return results;
};

export const getQuickHint = async (statement: string, subject: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await callAIWithFallback(ai, `Provide a single-sentence strategic hint for this ${subject} question: ${statement.substring(0, 500)}`, { systemInstruction: "You are a helpful tutor." });
    return response.text || "Focus on fundamental principles.";
  } catch (e) { 
    return "Hint unavailable."; 
  }
};

export const generateFullJEEDailyPaper = async (config: any): Promise<{ physics: Question[], chemistry: Question[], mathematics: Question[] }> => {
  try {
    // Generate all 3 subjects in parallel
    const [physics, chemistry, mathematics] = await Promise.all([
      generateJEEQuestions(Subject.Physics, config.physics.mcq + config.physics.numerical, ExamType.Advanced, config.physics.chapters, 'Hard', config.physics.topics, config.physics),
      generateJEEQuestions(Subject.Chemistry, config.chemistry.mcq + config.chemistry.numerical, ExamType.Advanced, config.chemistry.chapters, 'Hard', config.chemistry.topics, config.chemistry),
      generateJEEQuestions(Subject.Mathematics, config.mathematics.mcq + config.mathematics.numerical, ExamType.Advanced, config.mathematics.chapters, 'Hard', config.mathematics.topics, config.mathematics)
    ]);
    return { physics, chemistry, mathematics };
  } catch (error) {
    console.error("Full paper generation failed:", error);
    throw error;
  }
};

export const parseDocumentToQuestions = async (questionFile: File, solutionFile?: File): Promise<Question[]> => {
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  try {
    const parts: any[] = [];
    const qData = await fileToBase64(questionFile);
    parts.push({ inlineData: { mimeType: questionFile.type, data: qData } });

    if (solutionFile) {
        const sData = await fileToBase64(solutionFile);
        parts.push({ inlineData: { mimeType: solutionFile.type, data: sData } });
    }

    const ai = getAIClient();
    const prompt = `Digitize and structure the JEE questions from these documents. Output a JSON array matching the JEE question schema. Use LaTeX for math. Format as an EXACT JSON array.`;
    
    parts.push({ text: prompt });

    const response = await callAIWithFallback(ai, parts, { 
      responseMimeType: "application/json",
      responseSchema: questionSchema 
    });

    const text = response.text;
    if (!text) throw new Error("Parser response empty");
    
    const parsed = JSON.parse(text);
    
    if (!Array.isArray(parsed)) throw new Error("Unexpected data structure");
    return parsed.map((q, idx) => ({ ...q, id: `parsed-${Date.now()}-${idx}` }));
  } catch (error) { 
    console.error("Document parsing failed:", error);
    throw error; 
  }
};

export const getDeepAnalysis = async (result: any) => {
    try {
        const ai = getAIClient();
        const response = await callAIWithFallback(ai, `Review this JEE performance data and provide a mentorship summary including strong areas and critical improvements: ${JSON.stringify(result).substring(0, 8000)}`, { systemInstruction: "You are an expert tutor providing constructive feedback." });
        return response.text || "Analysis complete. Keep practicing consistent drills.";
    } catch (e) { 
        return "Cognitive analysis is temporarily unavailable due to a network disruption."; 
    }
};

export const generateFallbackQuestions = (subject: Subject, mcqCount: number = 8, numericalCount: number = 2): Question[] => {
  const generateId = () => Math.random().toString(36).substring(2, 15);
  
  const sampleBank: Record<string, { mcq: any[], numerical: any[] }> = {
    Physics: {
      mcq: [
        { statement: "A particle moves in a circle of radius $R$ with constant angular acceleration $\\alpha$. If it starts from rest, the total acceleration at time $t$ is:", options: ["$R\\alpha$", "$R\\alpha^2 t^2$", "$R\\alpha \\sqrt{1 + \\alpha^2 t^4}$", "$R\\alpha^2 t$"], correctAnswer: "C", concept: "Circular Motion", solution: "Tangential acceleration $a_t = R\\alpha$, Radial acceleration $a_r = \\omega^2 R = (\\alpha t)^2 R$. Total $a = \\sqrt{a_t^2 + a_r^2} = R\\alpha \\sqrt{1 + \\alpha^2 t^4}$." },
        { statement: "A block of mass $m$ is connected to a spring of stiffness $k$. The time period of oscillation on an inclined plane of angle $\\theta$ is:", options: ["$2\\pi \\sqrt{\\frac{m}{k}}$", "$2\\pi \\sqrt{\\frac{m\\sin\\theta}{k}}$", "$2\\pi \\sqrt{\\frac{m\\cos\\theta}{k}}$", "$4\\pi \\sqrt{\\frac{m}{k}}$"], correctAnswer: "A", concept: "Simple Harmonic Motion", solution: "The time period of a spring-mass system $T = 2\\pi \\sqrt{m/k}$ is independent of the inclination angle or gravity." },
        { statement: "Two spherical conductors of radii $R_1$ and $R_2$ are charged to potentials $V_1$ and $V_2$. If connected by a wire, the common potential is:", options: ["$\\frac{R_1 V_1 + R_2 V_2}{R_1 + R_2}$", "$\\frac{V_1 + V_2}{2}$", "$\\frac{R_1 V_2 + R_2 V_1}{R_1 + R_2}$", "$\\frac{R_1 R_2 (V_1 + V_2)}{(R_1 + R_2)^2}$"], correctAnswer: "A", concept: "Electrostatics", solution: "Total charge $Q = C_1 V_1 + C_2 V_2 = R_1 V_1 + R_2 V_2$. Total capacitance $C = R_1 + R_2$. Common potential $V = Q/C$." },
        { statement: "An ideal gas undergoes an adiabatic expansion where temperature drops from $T_1$ to $T_2$. The work done by the gas is:", options: ["$\\frac{nR(T_1 - T_2)}{\\gamma - 1}$", "$\\frac{nR(T_2 - T_1)}{\\gamma - 1}$", "$nR(T_1 - T_2)\\ln(V_2/V_1)$", "$zero$"], correctAnswer: "A", concept: "Thermodynamics", solution: "For adiabatic processes, $W = \\frac{nR(T_1 - T_2)}{\\gamma - 1}$." },
        { statement: "A wire of resistance $R$ is bent into a complete circle. The effective resistance between two diametrically opposite points is:", options: ["$R/4$", "$R/2$", "$R$", "$2R$"], correctAnswer: "A", concept: "Current Electricity", solution: "The two semicircular halves each have resistance $R/2$ connected in parallel. $R_{eq} = \\frac{(R/2)(R/2)}{R/2 + R/2} = R/4$." },
        { statement: "The de Broglie wavelength of an electron accelerated through a potential difference of $V$ volts is proportional to:", options: ["$V^{-1/2}$", "$V^{-1}$", "$V^{1/2}$", "$V^2$"], correctAnswer: "A", concept: "Dual Nature of Matter", solution: "$\\lambda = \\frac{h}{\\sqrt{2meV}} \\Rightarrow \\lambda \\propto V^{-1/2}$." },
        { statement: "A body projected vertically upwards with velocity $u$ reaches a maximum height $H$. Its speed at height $H/2$ is:", options: ["$u/\\sqrt{2}$", "$u/2$", "$u/4$", "$u\\sqrt{2}$"], correctAnswer: "A", concept: "Kinematics", solution: "$v^2 = u^2 - 2g(H/2) = u^2 - g(u^2/2g) = u^2/2 \\Rightarrow v = u/\\sqrt{2}$." },
        { statement: "The magnetic field at the center of a circular loop of radius $r$ carrying current $I$ is $B_0$. The magnetic field on its axis at a distance $r$ from center is:", options: ["$B_0 / 2\\sqrt{2}$", "$B_0 / 2$", "$B_0 / 4$", "$B_0 / 8$"], correctAnswer: "A", concept: "Magnetic Effects of Current", solution: "$B_{axis} = \\frac{\\mu_0 I r^2}{2(r^2+x^2)^{3/2}}$. At $x=r$, $B = \\frac{\\mu_0 I}{2^{5/2} r} = \\frac{B_0}{2\\sqrt{2}}$." }
      ],
      numerical: [
        { statement: "A ray of light strikes a glass plate at an angle of incidence $60^\\circ$. If the reflected and refracted rays are perpendicular, the refractive index of glass is $\\sqrt{x}$. Find $x$.", correctAnswer: 3, concept: "Optics", solution: "By Brewster's law, $\\tan i_p = \\mu \\Rightarrow \\mu = \\tan 60^\\circ = \\sqrt{3}$. Thus $x = 3$." },
        { statement: "A body of mass $2\\text{ kg}$ is dropped from a height of $20\\text{ m}$. Take $g = 10\\text{ m/s}^2$. Its kinetic energy upon reaching ground is (in Joules):", correctAnswer: 400, concept: "Work, Energy and Power", solution: "$KE = mgh = 2 \\times 10 \\times 20 = 400\\text{ J}$." },
        { statement: "A self-inductance coil of $5\\text{ mH}$ carries a current decreasing at $2000\\text{ A/s}$. Induced EMF in volts is:", correctAnswer: 10, concept: "Electromagnetic Induction", solution: "$e = -L \\frac{dI}{dt} = 5 \\times 10^{-3} \\times 2000 = 10\\text{ V}$." }
      ]
    },
    Chemistry: {
      mcq: [
        { statement: "Which of the following compounds exhibits optical isomerism?", options: ["$\\text{[Co(NH}_3\\text{)}_4\\text{Cl}_2\\text{]}^+$", "$\\text{cis-[Co(en)}_2\\text{Cl}_2\\text{]}^+$", "$\\text{trans-[Co(en)}_2\\text{Cl}_2\\text{]}^+$", "$\\text{[Pt(NH}_3\\text{)}_2\\text{Cl}_2\\text{]}$"], correctAnswer: "B", concept: "Coordination Compounds", solution: "cis-[Co(en)2Cl2]+ lacks a plane of symmetry and is non-superimposable on its mirror image." },
        { statement: "The pH of a $10^{-8}\\text{ M}$ solution of $\\text{HCl}$ in water at $25^\\circ\\text{C}$ is approximately:", options: ["8.0", "7.0", "6.98", "6.0"], correctAnswer: "C", concept: "Equilibrium", solution: "Total $[H^+] = 10^{-8} + 10^{-7} = 1.1 \\times 10^{-7}\\text{ M} \\Rightarrow \\text{pH} \\approx 6.98$." },
        { statement: "The hybridisation of $\\text{Xe}$ in $\\text{XeF}_4$ and its geometry are respectively:", options: ["$sp^3d^2$, Square Planar", "$sp^3d$, See-saw", "$sp^3d^2$, Octahedral", "$sp^3$, Tetrahedral"], correctAnswer: "A", concept: "Chemical Bonding", solution: "XeF4 has 4 bond pairs and 2 lone pairs $\\Rightarrow 6$ electron pairs ($sp^3d^2$ hybridisation, square planar geometry)." },
        { statement: "Ozonolysis of 2-methylbut-2-ene followed by reaction with Zn/H2O gives:", options: ["Acetone & Acetaldehyde", "Propanal & Ethanol", "Formaldehyde & Acetone", "Butanone & Methanal"], correctAnswer: "A", concept: "Organic Chemistry", solution: "Cleavage of the C=C bond in (CH3)2C=CH-CH3 yields Propan-2-one (acetone) and Ethanal (acetaldehyde)." },
        { statement: "Which metal ion has the highest paramagnetic moment among the following?", options: ["$\\text{Fe}^{3+}$", "$\\text{Mn}^{2+}$", "$\\text{Cr}^{3+}$", "Both A and B"], correctAnswer: "D", concept: "d and f Block Elements", solution: "Both Fe3+ and Mn2+ have $d^5$ high spin configuration with 5 unpaired electrons, giving magnetic moment $\\mu = \\sqrt{35} \\approx 5.92\\text{ BM}$." }
      ],
      numerical: [
        { statement: "Calculate the oxidation state of Chromium in Potassium Dichromate ($\\text{K}_2\\text{Cr}_2\\text{O}_7$):", correctAnswer: 6, concept: "Redox Reactions", solution: "$2(+1) + 2(x) + 7(-2) = 0 \\Rightarrow 2x = 12 \\Rightarrow x = 6$." },
        { statement: "The number of radial nodes in a $4p$ orbital is:", correctAnswer: 2, concept: "Atomic Structure", solution: "Radial nodes $= n - l - 1 = 4 - 1 - 1 = 2$." }
      ]
    },
    Mathematics: {
      mcq: [
        { statement: "The value of $\\lim_{x \\to 0} \\frac{\\sin x - x}{x^3}$ is equal to:", options: ["$-1/6$", "$1/6$", "$0$", "$1/3$"], correctAnswer: "A", concept: "Calculus", solution: "Using Taylor series expansion $\\sin x = x - \\frac{x^3}{6} + \\dots \\Rightarrow \\frac{-x^3/6}{x^3} = -1/6$." },
        { statement: "The number of non-empty subsets of a set containing $5$ distinct elements is:", options: ["$31$", "$32$", "$30$", "$64$"], correctAnswer: "A", concept: "Sets and Functions", solution: "Total subsets $= 2^5 = 32$. Non-empty subsets $= 32 - 1 = 31$." },
        { statement: "If $\\vec{a}$ and $\\vec{b}$ are unit vectors such that $|\\vec{a} + \\vec{b}| = 1$, then $|\\vec{a} - \\vec{b}|$ is equal to:", options: ["$\\sqrt{3}$", "$1$", "$2$", "$\\sqrt{2}$"], correctAnswer: "A", concept: "Vector Algebra", solution: "$|\\vec{a}+\\vec{b}|^2 + |\\vec{a}-\\vec{b}|^2 = 2(|\\vec{a}|^2 + |\\vec{b}|^2) \\Rightarrow 1 + x^2 = 4 \\Rightarrow x = \\sqrt{3}$." },
        { statement: "The area bounded by the parabola $y^2 = 4x$ and its latus rectum is:", options: ["$8/3$", "$4/3$", "$16/3$", "$2/3$"], correctAnswer: "A", concept: "Integral Calculus", solution: "Area $= 2 \\int_0^1 2\\sqrt{x} dx = 4 [\\frac{2}{3} x^{3/2}]_0^1 = 8/3$." },
        { statement: "The sum of the series $1 + 2 + 3 + \\dots + n$ is $55$. The value of $n$ is:", options: ["$10$", "$11$", "$9$", "$12$"], correctAnswer: "A", concept: "Sequences and Series", solution: "$\\frac{n(n+1)}{2} = 55 \\Rightarrow n^2 + n - 110 = 0 \\Rightarrow (n-10)(n+11) = 0 \\Rightarrow n = 10$." }
      ],
      numerical: [
        { statement: "If the roots of the quadratic equation $x^2 - 8x + k = 0$ are equal, find the value of $k$:", correctAnswer: 16, concept: "Algebra", solution: "Discriminant $D = b^2 - 4ac = 64 - 4k = 0 \\Rightarrow k = 16$." },
        { statement: "Find the distance between parallel lines $3x + 4y + 5 = 0$ and $3x + 4y - 15 = 0$:", correctAnswer: 4, concept: "Coordinate Geometry", solution: "$d = \\frac{|c_1 - c_2|}{\\sqrt{a^2+b^2}} = \\frac{|5 - (-15)|}{\\sqrt{9+16}} = \\frac{20}{5} = 4$." }
      ]
    }
  };

  const bank = sampleBank[subject] || sampleBank.Physics;
  const result: Question[] = [];
  
  // Dynamic shuffle for rich randomization
  const shuffledMCQ = [...bank.mcq].sort(() => 0.5 - Math.random());
  const shuffledNum = [...bank.numerical].sort(() => 0.5 - Math.random());

  const normalizeQuestionOptions = (opts: any) => {
    if (Array.isArray(opts)) {
      const identifiers = ["A", "B", "C", "D"];
      const obj: any = {};
      opts.forEach((opt, idx) => {
        if (idx < identifiers.length) {
          obj[identifiers[idx]] = opt;
        }
      });
      return obj;
    }
    return opts || {};
  };

  for (let i = 0; i < mcqCount; i++) {
    const template = shuffledMCQ[i % shuffledMCQ.length];
    result.push({
      id: `practice-${subject}-mcq-${generateId()}`,
      subject: subject,
      chapter: template.concept,
      type: QuestionType.MCQ,
      difficulty: 'Hard',
      statement: template.statement,
      options: normalizeQuestionOptions(template.options) as any,
      correctAnswer: template.correctAnswer,
      solution: template.solution,
      explanation: template.solution,
      concept: template.concept,
      markingScheme: { positive: 4, negative: 1 }
    });
  }

  for (let i = 0; i < numericalCount; i++) {
    const template = shuffledNum[i % shuffledNum.length];
    result.push({
      id: `practice-${subject}-num-${generateId()}`,
      subject: subject,
      chapter: template.concept,
      type: QuestionType.Numerical,
      difficulty: 'Hard',
      statement: template.statement,
      correctAnswer: template.correctAnswer,
      solution: template.solution,
      explanation: template.solution,
      concept: template.concept,
      markingScheme: { positive: 4, negative: 0 }
    });
  }

  return result;
};