import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Subject, ExamType, Question, QuestionType } from "./types";
import { generateDynamicQuestions } from "./utils/fallbackGenerator";
import { callAIProxy, isNvidiaKey, delay } from "./geminiService";

export const verifyGeminiAPIKey = async (apiKey: string): Promise<boolean> => {
  try {
    const text = await callAIProxy("Respond with exactly the word 'OK' if you can read this.", "Answer concisely.", undefined, apiKey);
    return text.trim().toUpperCase().includes("OK") || false;
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

const generateNEETQuestionsBatch = async (subject: Subject, count: number, mcqTarget: number, numTarget: number, type: ExamType, chapters?: string[], difficulty?: string, topics?: string[], batchIdx: number = 0, totalBatches: number = 1, apiKey?: string): Promise<Question[]> => {
  const allQuestions: Question[] = [];
  const isFullSyllabus = !chapters || chapters.length === 0;
  let topicFocus = isFullSyllabus ? "Full Syllabus" : `Chapters: ${chapters.join(', ')}`;
  if (topics && topics.length > 0) {
      topicFocus += ` | Specific Topics: ${topics.join(', ')}`;
  }

  try {
      console.log(`[AI-NEET] [Batch ${batchIdx + 1} of ${totalBatches}] Generating ${count} questions for ${subject} (Batch Target: ${mcqTarget} MCQ, ${numTarget} Num)...`);
      const sessionEntropy = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      const systemInstruction = `You are an expert NEET UG medical entrance exam coach. Generate HIGHLY UNIQUE, ORIGINAL, and concept-heavy multiple-choice questions (MCQs) mapped strictly to the NEET UG NCERT syllabus for ${subject}. Under NO circumstances should you generate any math, JEE engineering, or programming questions. All questions must be strictly biological, physical, or chemical sciences relevant to the NEET medical curriculum. Biology questions (Botany or Zoology) must focus on physiological, anatomical, clinical, or biochemical concepts from the NCERT textbook. Use LaTeX only for chemical formulas or physical units. Ensure output matches the exact JSON schema.`;
      
      const prompt = `BatchID: ${sessionEntropy}. 
      Generate EXACTLY ${count} UNIQUE questions for ${subject} (NEET UG level). 
      
      TARGET DISTRIBUTION:
      - ${mcqTarget} Multiple Choice Questions (type: "MCQ", must include 4 options in "options" array)
      - ${numTarget} Numerical Value Questions (type: "Numerical", leave "options" as empty array [])
      
      Scope: ${topicFocus}. Difficulty: ${difficulty || 'Medium'}. DO NOT generate any engineering or JEE-like math questions. Biology questions must be related strictly to NCERT concepts.`;
      
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

export const generateJEEQuestions = async (subject: Subject, count: number, type: ExamType, chapters?: string[], difficulty?: string, topics?: string[], distribution?: { mcq: number, numerical: number }, apiKey?: string): Promise<Question[]> => {
  // Enforce daily 5-question limit per user for practicing
  const { checkAndIncrementDailyGenerationLimit } = await import("./utils/questionTracker");
  checkAndIncrementDailyGenerationLimit(count);

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
      const batchQs = await generateNEETQuestionsBatch(subject, batch.mcq, batch.mcq, 0, type, chapters, difficulty, topics, i, batches.length, apiKey);
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
    console.warn("[neetGeminiService] Failed to save generated questions to DB:", dbErr);
  }

  return results;
};

export const getQuickHint = async (statement: string, subject: string): Promise<string> => {
  try {
    const text = await callAIProxy(
      `Provide a single-sentence strategic hint for this NEET ${subject} question: ${statement.substring(0, 500)}`,
      "You are a helpful medical tutor. Provide a concise, clear hint without giving away the full answer."
    );
    return text || "Focus on fundamental NCERT principles.";
  } catch (e) { 
    return "Hint unavailable."; 
  }
};

export const generateFullJEEDailyPaper = async (config: any): Promise<{ physics: Question[], chemistry: Question[], botany: Question[], zoology: Question[] }> => {
  try {
    const botanyConfig = config.botany || { mcq: 10, numerical: 0, chapters: [], topics: [] };
    const zoologyConfig = config.zoology || { mcq: 10, numerical: 0, chapters: [], topics: [] };
    const [physics, chemistry, botany, zoology] = await Promise.all([
      generateJEEQuestions(Subject.Physics, config.physics.mcq, ExamType.NEET, config.physics.chapters, 'Medium', config.physics.topics, config.physics),
      generateJEEQuestions(Subject.Chemistry, config.chemistry.mcq, ExamType.NEET, config.chemistry.chapters, 'Medium', config.chemistry.topics, config.chemistry),
      generateJEEQuestions(Subject.Botany, botanyConfig.mcq, ExamType.NEET, botanyConfig.chapters, 'Medium', botanyConfig.topics, botanyConfig),
      generateJEEQuestions(Subject.Zoology, zoologyConfig.mcq, ExamType.NEET, zoologyConfig.chapters, 'Medium', zoologyConfig.topics, zoologyConfig)
    ]);
    return { physics, chemistry, botany, zoology };
  } catch (error) {
    console.error("Full NEET daily paper generation failed:", error);
    throw error;
  }
};

export const parseDocumentToQuestions = async (questionFile: File, solutionFile?: File): Promise<Question[]> => {
  try {
    const prompt = `Digitize and structure the NEET questions from file ${questionFile.name}. Output a JSON array matching the question schema. Use LaTeX for math. Format as an EXACT JSON array.`;
    const text = await callAIProxy(prompt, "You are a document digitizer. Return JSON array matching question schema.", questionSchema);
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
        const text = await callAIProxy(
          `Review this NEET performance data and provide a mentorship summary including strong areas and critical improvements: ${JSON.stringify(result).substring(0, 8000)}`,
          "You are an expert NEET medical tutor providing constructive feedback."
        );
        return text || "Analysis complete. Keep practicing consistent drills.";
    } catch (e) { 
        return "Cognitive analysis is temporarily unavailable due to a network disruption."; 
    }
};

export const generateFallbackQuestions = (subject: Subject, mcqCount: number = 8, numericalCount: number = 2): Question[] => {
  return generateDynamicQuestions(subject, mcqCount, numericalCount, "NEET") as any;
};
