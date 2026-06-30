import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Subject, ExamType, Question, QuestionType } from "./types";
import { generateDynamicQuestions } from "./utils/fallbackGenerator";

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
        console.warn(`[AI-NEET] Model ${model} attempt ${attempt} failed: ${err.message || err}`);
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

const generateNEETQuestionsBatch = async (subject: Subject, count: number, mcqTarget: number, numTarget: number, type: ExamType, chapters?: string[], difficulty?: string, topics?: string[], batchIdx: number = 0, totalBatches: number = 1): Promise<Question[]> => {
  const allQuestions: Question[] = [];
  const isFullSyllabus = !chapters || chapters.length === 0;
  let topicFocus = isFullSyllabus ? "Full Syllabus" : `Chapters: ${chapters.join(', ')}`;
  if (topics && topics.length > 0) {
      topicFocus += ` | Specific Topics: ${topics.join(', ')}`;
  }

  try {
      console.log(`[AI-NEET] [Batch ${batchIdx + 1} of ${totalBatches}] Generating ${count} questions for ${subject} (Batch Target: ${mcqTarget} MCQ, ${numTarget} Num)...`);
      const sessionEntropy = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      const systemInstruction = `You are an expert NEET medical entrance exam coach. Generate HIGHLY UNIQUE, ORIGINAL, and concept-heavy problems mapped strictly to the NEET UG NCERT syllabus for ${subject}. Biology questions should span Botany and Zoology with application-based clinical or logical statements. Use LaTeX for math/formulas. Ensure output matches the exact JSON schema.`;
      
      const prompt = `BatchID: ${sessionEntropy}. 
      Generate EXACTLY ${count} UNIQUE questions for ${subject} (NEET UG level). 
      
      TARGET DISTRIBUTION:
      - ${mcqTarget} Multiple Choice Questions (type: "MCQ", must include 4 options in "options" array)
      - ${numTarget} Numerical Value Questions (type: "Numerical", leave "options" as empty array [])
      
      Scope: ${topicFocus}. Difficulty: ${difficulty || 'Medium'}. Use LaTeX for math/formulas.`;
      
      const ai = getAIClient();
      const response = await callAIWithFallback(ai, prompt, { 
        responseMimeType: "application/json", 
        responseSchema: questionSchema,
        systemInstruction: systemInstruction,
        temperature: 0.85,
        topP: 0.95,
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
                          id: `ai-neet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                          subject: q.subject || subject,
                          type: qType,
                          options: normalizeQuestionOptions(hasOptions ? q.options : []),
                          markingScheme: Object.assign({ positive: 4, negative: qType === 'Numerical' ? 0 : 1 }, q.markingScheme || {})
                      };
                      allQuestions.push(processedQ);
                  });
              }
          } catch (parseErr) {
              console.warn("[AI-NEET] JSON Parse Failure on Gemini response.", parseErr);
              throw new Error("Failed to parse AI response into JSON format.");
          }
      }
  } catch (e: any) {
      console.error(`[AI-NEET] [Batch ${batchIdx + 1}] Gemini API failure:`, e.message);
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
      throw new Error(`AI generated no valid NEET questions for batch ${batchIdx + 1}.`);
  }

  return selected;
};

export const generateJEEQuestions = async (subject: Subject, count: number, type: ExamType, chapters?: string[], difficulty?: string, topics?: string[], distribution?: { mcq: number, numerical: number }): Promise<Question[]> => {
  // NEET has absolutely no numerical entry questions; all questions are 100% MCQ.
  let totalMcqTarget = count;
  let totalNumTarget = 0;
  
  const BATCH_SIZE = 10;
  const batches: { mcq: number; numerical: number }[] = [];
  
  let remainingMcq = totalMcqTarget;
  
  while (remainingMcq > 0) {
      let batchMcq = 0;
      while (batchMcq < BATCH_SIZE && remainingMcq > 0) {
          batchMcq++;
          remainingMcq--;
      }
      batches.push({ mcq: batchMcq, numerical: 0 });
  }

  console.log(`[AI-NEET] Generating ${count} total MCQ questions for ${subject} split into ${batches.length} batches...`);

  const results: Question[] = [];
  for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchQs = await generateNEETQuestionsBatch(subject, batch.mcq, batch.mcq, 0, type, chapters, difficulty, topics, i, batches.length);
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
    const response = await callAIWithFallback(ai, `Provide a single-sentence strategic hint for this NEET ${subject} question: ${statement.substring(0, 500)}`, { systemInstruction: "You are a helpful medical tutor." });
    return response.text || "Focus on fundamental NCERT principles.";
  } catch (e) { 
    return "Hint unavailable."; 
  }
};

export const generateFullJEEDailyPaper = async (config: any): Promise<{ physics: Question[], chemistry: Question[], biology: Question[] }> => {
  try {
    const bioConfig = config.biology || config.mathematics || { mcq: 8, numerical: 2, chapters: [], topics: [] };
    const [physics, chemistry, biology] = await Promise.all([
      generateJEEQuestions(Subject.Physics, config.physics.mcq + config.physics.numerical, ExamType.NEET, config.physics.chapters, 'Medium', config.physics.topics, config.physics),
      generateJEEQuestions(Subject.Chemistry, config.chemistry.mcq + config.chemistry.numerical, ExamType.NEET, config.chemistry.chapters, 'Medium', config.chemistry.topics, config.chemistry),
      generateJEEQuestions(Subject.Biology, bioConfig.mcq + bioConfig.numerical, ExamType.NEET, bioConfig.chapters, 'Medium', bioConfig.topics, bioConfig)
    ]);
    return { physics, chemistry, biology };
  } catch (error) {
    console.error("Full NEET daily paper generation failed:", error);
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
    const prompt = `Digitize and structure the NEET questions from these documents. Output a JSON array matching the question schema. Use LaTeX for math. Format as an EXACT JSON array.`;
    
    parts.push({ text: prompt });

    const response = await callAIWithFallback(ai, parts, { 
      responseMimeType: "application/json",
      responseSchema: questionSchema 
    });

    const text = response.text;
    if (!text) throw new Error("Parser response empty");
    
    const parsed = JSON.parse(text);
    
    if (!Array.isArray(parsed)) throw new Error("Unexpected data structure");
    return parsed.map((q, idx) => ({ ...q, id: `parsed-neet-${Date.now()}-${idx}` }));
  } catch (error) { 
    console.error("Document parsing failed:", error);
    throw error; 
  }
};

export const getDeepAnalysis = async (result: any) => {
    try {
        const ai = getAIClient();
        const response = await callAIWithFallback(ai, `Review this NEET performance data and provide a mentorship summary including strong areas and critical improvements: ${JSON.stringify(result).substring(0, 8000)}`, { systemInstruction: "You are an expert NEET medical tutor providing constructive feedback." });
        return response.text || "Analysis complete. Keep practicing consistent drills.";
    } catch (e) { 
        return "Cognitive analysis is temporarily unavailable due to a network disruption."; 
    }
};

export const generateFallbackQuestions = (subject: Subject, mcqCount: number = 8, numericalCount: number = 2): Question[] => {
  return generateDynamicQuestions(subject, mcqCount, numericalCount, "NEET") as any;
};
