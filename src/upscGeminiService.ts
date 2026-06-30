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
        console.warn(`[AI-UPSC] Model ${model} attempt ${attempt} failed: ${err.message || err}`);
        await delay(attempt * 500);
      }
    }
  }
  throw lastError || new Error("All Gemini AI models and retries exhausted.");
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

const generateUPSCQuestionsBatch = async (subject: Subject, count: number, mcqTarget: number, type: ExamType, chapters?: string[], difficulty?: string, topics?: string[], batchIdx: number = 0, totalBatches: number = 1): Promise<Question[]> => {
  const allQuestions: Question[] = [];
  const isFullSyllabus = !chapters || chapters.length === 0;
  let topicFocus = isFullSyllabus ? "Full Syllabus" : `Chapters: ${chapters.join(', ')}`;

  try {
      console.log(`[AI-UPSC] Generating ${count} questions for ${subject}...`);
      const sessionEntropy = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      const systemInstruction = `You are an expert UPSC Civil Services Prelims Exam coach. Generate highly analytical, statement-based questions matching the UPSC GS Paper I (General Studies) or CSAT Prelims pattern. Use multi-tier options (e.g. '1 only', '1 and 2 only', 'All of the above'). Standard marking is 2 marks positive, -0.66 negative. Ensure output matches the exact JSON schema.`;
      
      const prompt = `BatchID: ${sessionEntropy}. 
      Generate EXACTLY ${count} UNIQUE questions for ${subject} (UPSC CSE level). 
      
      TARGET DISTRIBUTION:
      - ${count} Multiple Choice Questions (type: "MCQ", must include 4 options in "options" array, formatted as UPSC statements option blocks)
      
      Scope: ${topicFocus}. Difficulty: ${difficulty || 'Hard'}.`;
      
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
                      const processedQ = {
                          ...q,
                          id: `ai-upsc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                          subject: q.subject || subject,
                          type: 'MCQ',
                          options: normalizeQuestionOptions(q.options),
                          markingScheme: { positive: 2, negative: 1 } // -0.66 represented as integer or custom schema
                      };
                      allQuestions.push(processedQ);
                  });
              }
          } catch (parseErr) {
              console.warn("[AI-UPSC] JSON Parse Failure on Gemini response.", parseErr);
              throw new Error("Failed to parse AI response into JSON format.");
          }
      }
  } catch (e: any) {
      console.error(`[AI-UPSC] Gemini API failure:`, e.message);
      throw e;
  }

  return allQuestions.slice(0, count);
};

export const generateJEEQuestions = async (subject: Subject, count: number, type: ExamType, chapters?: string[], difficulty?: string, topics?: string[], distribution?: { mcq: number, numerical: number }): Promise<Question[]> => {
  return await generateUPSCQuestionsBatch(subject, count, count, type, chapters, difficulty, topics);
};

export const getQuickHint = async (statement: string, subject: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await callAIWithFallback(ai, `Provide a single-sentence strategic analytical hint for this UPSC ${subject} question: ${statement.substring(0, 500)}`, { systemInstruction: "You are a helpful UPSC mentor." });
    return response.text || "Eliminate incorrect options based on historical facts or core concepts.";
  } catch (e) { 
    return "Hint unavailable."; 
  }
};

export const generateFullJEEDailyPaper = async (config: any): Promise<{ history: Question[], geography: Question[], polity: Question[] }> => {
  try {
    const [history, geography, polity] = await Promise.all([
      generateJEEQuestions(('History' as any), config.physics.mcq, ExamType.Main, config.physics.chapters, 'Hard', config.physics.topics),
      generateJEEQuestions(('Geography' as any), config.chemistry.mcq, ExamType.Main, config.chemistry.chapters, 'Hard', config.chemistry.topics),
      generateJEEQuestions(('Polity' as any), config.mathematics.mcq, ExamType.Main, config.mathematics.chapters, 'Hard', config.mathematics.topics)
    ]);
    return { history, geography, polity } as any;
  } catch (error) {
    console.error("Full UPSC paper generation failed:", error);
    throw error;
  }
};

export const parseDocumentToQuestions = async (questionFile: File, solutionFile?: File): Promise<Question[]> => {
  try {
    const ai = getAIClient();
    const prompt = `Digitize and structure the UPSC questions. Output a JSON array matching the question schema. Format as an EXACT JSON array.`;
    const response = await callAIWithFallback(ai, prompt, { responseMimeType: "application/json", responseSchema: questionSchema });
    const text = response.text || '[]';
    return JSON.parse(text);
  } catch (error) { 
    throw error; 
  }
};

export const getDeepAnalysis = async (result: any) => {
    return "Analysis complete. Keep practicing consistent drills to improve your elimination technique.";
};

export const generateFallbackQuestions = (subject: Subject, mcqCount: number = 8, numericalCount: number = 2): Question[] => {
  return generateDynamicQuestions(subject, mcqCount, numericalCount, "UPSC") as any;
};
