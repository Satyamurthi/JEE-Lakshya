import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Subject, ExamType, Question } from "./types";

const PRIMARY_MODEL = "gemini-2.5-flash";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getAIClient = (overrideKey?: string) => {
    const apiKey = overrideKey || localStorage.getItem('user_gemini_api_key') || process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("AI Generation Failed: Gemini API Key is not configured.");
    }
    return new GoogleGenAI({ apiKey });
};

export const verifyGeminiAPIKey = async (apiKey: string): Promise<boolean> => {
  try {
    const ai = getAIClient(apiKey);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Respond with exactly the word 'OK' if you can read this.",
    });
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
    required: ["subject", "statement", "correctAnswer", "solution", "type"]
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
      const systemInstruction = `You are an expert JEE coach. Your goal is to generate HIGHLY UNIQUE, ORIGINAL, and concept-heavy problems. Do not provide common textbook problems. Use LaTeX for all math. Ensure output matches the exact JSON schema provided. The questions must be correctly formed and sufficient for JEE Advanced level.`;
      
      const prompt = `BatchID: ${sessionEntropy}. 
      Generate EXACTLY ${count} COMPLETELY UNIQUE and NEVER-BEFORE-SEEN questions for ${subject} (${type} level). 
      
      DISTRIBUTION:
      - Exactly ${mcqTarget} Multiple Choice Questions (type: "MCQ")
      - Exactly ${numTarget} Numerical Value Questions (type: "Numerical")
      
      Scope: ${topicFocus}. 
      Mandatory: Do NOT repeat problems from standard mock tests or previous batches. Vary the parameters, numerical values, and conceptual combinations.
      Difficulty: ${difficulty || 'Advanced'}.
      Use LaTeX for all formulas. 
      Strict JSON format matching the schema. Note: For "Numerical" type questions, leave "options" as an empty array [] and put the exact number string in "correctAnswer".`;
      
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: { 
          responseMimeType: "application/json", 
          responseSchema: questionSchema,
          systemInstruction: systemInstruction,
          temperature: 0.95,
          topP: 0.9,
        }
      });
      
      const text = response.text;
      if (text) {
          try {
              const data = JSON.parse(text);
              if (Array.isArray(data)) {
                  data.forEach((q: any) => {
                      const processedQ = {
                          ...q,
                          id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                          subject: q.subject || subject,
                          type: q.type || (q.options && q.options.length > 0 ? 'MCQ' : 'Numerical'),
                          markingScheme: Object.assign({ positive: 4, negative: q.type === 'Numerical' ? 0 : 1 }, q.markingScheme || {})
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

  let finalMcqs = allQuestions.filter(q => q.type === 'MCQ').slice(0, mcqTarget);
  let finalNums = allQuestions.filter(q => q.type === 'Numerical').slice(0, numTarget);

  if (finalMcqs.length < mcqTarget || finalNums.length < numTarget) {
      throw new Error(`AI generated incomplete set of questions for batch ${batchIdx + 1} (${finalMcqs.length}/${mcqTarget} MCQs and ${finalNums.length}/${numTarget} Numericals).`);
  }

  return [...finalMcqs, ...finalNums];
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

  // Run the batches sequentially within each subject to stay within the free-tier rate limits,
  // but keep the three subjects running in parallel. This yields massive speedups (under 1 minute total).
  const results: Question[] = [];
  for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchQs = await generateJEEQuestionsBatch(subject, batch.mcq + batch.numerical, batch.mcq, batch.numerical, type, chapters, difficulty, topics, i, batches.length);
      results.push(...batchQs);
      if (i < batches.length - 1) {
          await delay(500); // Small pause between batches
      }
  }

  return results;
};

export const getQuickHint = async (statement: string, subject: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: `Provide a single-sentence strategic hint for this ${subject} question: ${statement.substring(0, 500)}`,
        config: { systemInstruction: "You are a helpful tutor." }
    });
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

    const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: parts,
        config: { 
            responseMimeType: "application/json",
            responseSchema: questionSchema 
        }
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
        const response = await ai.models.generateContent({
            model: PRIMARY_MODEL,
            contents: `Review this JEE performance data and provide a mentorship summary including strong areas and critical improvements: ${JSON.stringify(result).substring(0, 8000)}`,
            config: { systemInstruction: "You are an expert tutor providing constructive feedback." }
        });
        return response.text || "Analysis complete. Keep practicing consistent drills.";
    } catch (e) { 
        return "Cognitive analysis is temporarily unavailable due to a network disruption."; 
    }
};