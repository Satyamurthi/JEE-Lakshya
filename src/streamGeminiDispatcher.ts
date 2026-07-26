import { Subject, ExamType, Question } from './types';
import * as neetService from './neetGeminiService';
import * as kcetService from './kcetGeminiService';
import * as upscService from './upscGeminiService';
import * as jeeService from './geminiService';

export const getStreamGeminiService = (stream: string) => {
  const normStream = (stream || '').toLowerCase();
  if (normStream.includes('neet')) {
    return neetService;
  } else if (normStream.includes('kcet')) {
    return kcetService;
  } else if (normStream.includes('upsc')) {
    return upscService;
  } else {
    return jeeService; // Default JEE
  }
};
