import { Subject, ExamType, Question } from './types';

export const getStreamGeminiService = async (stream: string) => {
  const normStream = stream.toLowerCase();
  if (normStream.includes('neet')) {
    return await import('./neetGeminiService');
  } else if (normStream.includes('kcet')) {
    return await import('./kcetGeminiService');
  } else if (normStream.includes('upsc')) {
    return await import('./upscGeminiService');
  } else {
    return await import('./geminiService'); // Default JEE
  }
};
