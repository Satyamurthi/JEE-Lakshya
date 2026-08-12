import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Subject, ExamType, Question, QuestionType } from "./types";
import { generateDynamicQuestions } from "./utils/fallbackGenerator";

const getApiUrl = async (): Promise<string> => {
  try {
    const res = await fetch('/backend_url.txt?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      let text = (await res.text()).trim();
      if (text && text.startsWith('http')) {
        text = text.replace(/\/$/, '');
        if (!text.endsWith('/api')) text += '/api';
        return text;
      }
    }
  } catch (e) {}
  return (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080/api';
};

export const callAIProxy = async (prompt: string, systemInstruction: string, responseSchema?: any, customApiKey?: string, model?: string) => {
  const apiUrl = await getApiUrl();
  let token = '';
  try {
    const lp = localStorage.getItem('user_profile');
    if (lp) {
      const user = JSON.parse(lp);
      token = user.session_token || '';
    }
  } catch (e) {}

  const response = await fetch(`${apiUrl}/ai.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      prompt,
      systemInstruction,
      responseSchema,
      apiKey: customApiKey,
      model
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedErr = errorText;
    try {
      const errJson = JSON.parse(errorText);
      parsedErr = errJson.error || errorText;
    } catch (e) {}
    throw new Error(parsedErr);
  }

  const data = await response.json();
  if (data.success && data.text) {
    return data.text;
  }
  throw new Error(data.error || "Failed to generate AI response.");
};

export const getCleanedNvidiaKey = (apiKey: string): string => {
  let cleanKey = apiKey.trim();
  if (cleanKey.toLowerCase().startsWith("bearer ")) {
    cleanKey = cleanKey.substring(7).trim();
  }
  // If not already starting with nvapi- and not a Google key, auto-prepend nvapi-
  if (!cleanKey.startsWith("nvapi-") && !cleanKey.startsWith("AIzaSy") && !cleanKey.startsWith("AQ.")) {
    cleanKey = "nvapi-" + cleanKey;
  }
  return cleanKey;
};

export const isNvidiaKey = (apiKey: string): boolean => {
  const clean = apiKey.trim();
  if (clean.toLowerCase().includes("nvapi-")) return true;
  
  if (typeof window !== 'undefined') {
    const selectedModel = localStorage.getItem('user_ai_model') || 'google/gemini-2.5-flash';
    if (selectedModel.startsWith('z-ai/') || selectedModel.includes('gemma-4')) {
      return true;
    }
  }
  
  return !clean.startsWith("AIzaSy") && !clean.startsWith("AQ.");
};

export const callNvidiaAPI = async (apiKey: string, prompt: string, systemInstruction: string, isVerification = false): Promise<string> => {
  let model = localStorage.getItem('user_ai_model') || 'google/gemma-4-31b-it';
  if (model.includes('gemini')) {
    model = 'google/gemma-4-31b-it';
  }
  if (isVerification) {
    model = 'google/gemma-4-31b-it';
  }
  return callAIProxy(prompt, systemInstruction, undefined, apiKey, model);
};

export const verifyGeminiAPIKey = async (apiKey: string): Promise<boolean> => {
  try {
    const text = await callAIProxy("Respond with exactly the word 'OK' if you can read this.", "Answer concisely.", undefined, apiKey);
    return text.trim().toUpperCase().includes("OK") || false;
  } catch (e: any) {
    console.error("API Key verification failed:", e);
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

const generateJEEQuestionsBatch = async (subject: Subject, count: number, mcqTarget: number, numTarget: number, type: ExamType, chapters?: string[], difficulty?: string, topics?: string[], batchIdx: number = 0, totalBatches: number = 1, apiKey?: string): Promise<Question[]> => {
  const allQuestions: Question[] = [];
  const isFullSyllabus = !chapters || chapters.length === 0;
  let topicFocus = isFullSyllabus ? "Full Syllabus" : `Chapters: ${chapters.join(', ')}`;
  if (topics && topics.length > 0) {
      topicFocus += ` | Specific Topics: ${topics.join(', ')}`;
  }

  try {
      console.log(`[AI] [Batch ${batchIdx + 1} of ${totalBatches}] Generating ${count} questions for ${subject} (Batch Target: ${mcqTarget} MCQ, ${numTarget} Num)...`);
      const sessionEntropy = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const systemInstruction = `You are an expert JEE coach creating problems strictly for NTA JEE Main 2026 Syllabus.
CRITICAL SYLLABUS RULE:
You MUST ONLY generate questions for topics in the official JEE Main 2026 Syllabus.
ABSOLUTELY FORBIDDEN DELETED TOPICS:
- Physics: NO Radioactivity (half-life, decay law, decay constant), NO Transistors/Amplifiers, NO Communication Systems, NO Potentiometer, NO Earth's Magnetism/Hysteresis, NO Davisson-Germer, NO Doppler Effect, NO Carnot engine, NO Cyclotron.
- Chemistry: NO Solid State, NO Surface Chemistry, NO Metallurgy, NO Hydrogen, NO s-Block Elements, NO Environmental Chemistry, NO Polymers, NO Chemistry in Everyday Life, NO States of Matter (Gaseous/Liquid).
- Mathematics: NO Mathematical Induction, NO Mathematical Reasoning (tautology/logic), NO Linear Programming, NO 3D Geometry Planes (only line geometry allowed), NO Rolle's/Lagrange's theorems, NO Heights & Distances.

OPTIONS RULE:
For MCQ questions, options MUST be 4 distinct, plausible choices in standard LaTeX formatting or proper scientific notation. NEVER generate artificial numeric offset numbers.`;
      
      const prompt = `BatchID: ${sessionEntropy}. 
      Generate EXACTLY ${count} UNIQUE questions for ${subject} (${type} level). 
      
      TARGET DISTRIBUTION:
      - ${mcqTarget} Multiple Choice Questions (type: "MCQ", must include 4 options in "options" array)
      - ${numTarget} Numerical Value Questions (type: "Numerical", leave "options" as empty array [])
      
      Scope: ${topicFocus}. Difficulty: ${difficulty || 'Advanced'}. Use LaTeX for math formulas.`;
      
      const resolvedKey = apiKey || localStorage.getItem('user_gemini_api_key') || process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

      let text = await callAIProxy(prompt, systemInstruction, isNvidiaKey(resolvedKey) ? undefined : questionSchema, resolvedKey);
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

export const generateJEEQuestions = async (subject: Subject, count: number, type: ExamType, chapters?: string[], difficulty?: string, topics?: string[], distribution?: { mcq: number, numerical: number }, apiKey?: string): Promise<Question[]> => {
  // Enforce daily 5-question limit per user for practicing
  const { checkAndIncrementDailyGenerationLimit } = await import("./utils/questionTracker");
  checkAndIncrementDailyGenerationLimit(count);

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
      const batchQs = await generateJEEQuestionsBatch(subject, batch.mcq + batch.numerical, batch.mcq, batch.numerical, type, chapters, difficulty, topics, i, batches.length, apiKey);
      results.push(...batchQs);
      if (i < batches.length - 1) {
          await delay(300);
      }
  }
  
  // Save generated questions to Supabase database for future reuse
  try {
    const { saveQuestionsToDB } = await import("./supabase");
    await saveQuestionsToDB(results);
  } catch (dbErr) {
    console.warn("[geminiService] Failed to save generated questions to DB:", dbErr);
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

    const prompt = `Digitize and structure the JEE questions from these documents. Output a JSON array matching the JEE question schema. Use LaTeX for math. Format as an EXACT JSON array.`;
    parts.push({ text: prompt });

    const text = await callAIProxy(parts as any, "Digitizer assistant.", questionSchema);
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
        const prompt = `Review this JEE performance data and provide a mentorship summary including strong areas and critical improvements: ${JSON.stringify(result).substring(0, 8000)}`;
        const text = await callAIProxy(prompt, "You are an expert tutor providing constructive feedback.");
        return text || "Analysis complete. Keep practicing consistent drills.";
    } catch (e) { 
        return "Cognitive analysis is temporarily unavailable due to a network disruption."; 
    }
};

export const generateFallbackQuestions = (subject: Subject, mcqCount: number = 8, numericalCount: number = 2, difficulty?: string): Question[] => {
  return generateDynamicQuestions(subject, mcqCount, numericalCount, "JEE", difficulty) as any;
};