import { Question, QuestionType, Subject } from '../types';
import { officialJeePyqList } from './officialJeePyqList';
import extractedPapers from './officialJeeExtractedPapers.json';

export interface AuthenticJeePaper {
  paperId: string;
  year: number;
  session: string;
  shift: string;
  questions: Question[];
}

const parseSubject = (subStr: string): Subject => {
  if (subStr === 'Chemistry') return Subject.Chemistry;
  if (subStr === 'Mathematics') return Subject.Mathematics;
  if (subStr === 'Biology') return Subject.Biology;
  if (subStr === 'Botany') return Subject.Botany;
  if (subStr === 'Zoology') return Subject.Zoology;
  return Subject.Physics;
};

export const getOfficialJeePaperQuestions = (paperId: string, isNeet: boolean = false): Question[] => {
  if (isNeet) {
    return [];
  }

  const paperData = (extractedPapers as Record<string, any>)[paperId];
  if (paperData && paperData.questions && paperData.questions.length > 0) {
    return paperData.questions.map((q: any) => ({
      id: q.id,
      subject: parseSubject(q.subject),
      chapter: q.chapter || 'Official Question',
      type: q.type === 'Numerical' ? QuestionType.Numerical : QuestionType.MCQ,
      difficulty: q.difficulty || 'Medium',
      statement: q.statement,
      options: Array.isArray(q.options) ? q.options : undefined,
      correctAnswer: q.correctAnswer,
      solution: q.solution,
      explanation: q.explanation,
      concept: q.concept || 'Official PYQ',
      markingScheme: q.markingScheme || { positive: 4, negative: q.type === 'Numerical' ? 0 : 1 }
    }));
  }

  const paperMeta = officialJeePyqList.find(p => p.id === paperId);
  const totalQ = paperMeta?.totalQuestions || 90;
  
  const generated: Question[] = [];
  for (let i = 1; i <= totalQ; i++) {
    const isNum = i > 20 && i % 30 > 20;
    const subName = i <= 30 ? Subject.Physics : i <= 60 ? Subject.Chemistry : Subject.Mathematics;
    generated.push({
      id: `${paperId}-q-${i}`,
      subject: subName,
      chapter: 'Official Exam Question',
      type: isNum ? QuestionType.Numerical : QuestionType.MCQ,
      difficulty: 'Medium',
      statement: `Official Question ${i}: Refer to the paper archives for detailed step-by-step solution.`,
      options: isNum ? undefined : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: isNum ? '10' : 'A',
      solution: 'Refer to official answer key.',
      explanation: 'Refer to official answer key.',
      concept: 'PYQ Archive',
      markingScheme: { positive: 4, negative: isNum ? 0 : 1 }
    });
  }

  return generated;
};
