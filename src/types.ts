
export enum Subject {
  Physics = 'Physics',
  Chemistry = 'Chemistry',
  Mathematics = 'Mathematics',
  Biology = 'Biology',
  Botany = 'Botany',
  Zoology = 'Zoology'
}

export enum ExamType {
  Main = 'JEE Main',
  Advanced = 'JEE Advanced',
  NEET = 'NEET'
}

export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard'
}

export enum QuestionType {
  MCQ = 'MCQ',
  Numerical = 'Numerical'
}

export interface Question {
  id: string;
  subject: Subject;
  chapter: string;
  type: QuestionType;
  difficulty: string; // Changed from Difficulty enum to string for flexibility
  statement: string;
  options?: string[]; // Only for MCQ
  correctAnswer: string | number;
  solution: string;
  explanation: string;
  concept: string;
  markingScheme: {
    positive: number;
    negative: number;
  };
}

export interface ExamSession {
  id: string;
  type: ExamType;
  startTime: number;
  durationMinutes: number;
  questions: Question[];
  responses: Record<string, string | number>;
  status: 'active' | 'completed';
  marksReview: Set<string>;
  isDaily?: boolean;
  dailyDate?: string;
}

export interface ExamResult {
  sessionId: string;
  score: number;
  totalPossible: number;
  subjectScores: Record<Subject, number>;
  accuracy: number;
  timeSpentSeconds: number;
  completedAt: number;
  questions?: any[]; // Store full question context for review
  type?: string;
}

export interface DailyChallengeConfig {
  id?: string;
  date: string;
  title: string;
  totalMarks: number;
  duration: number;
  questions: Question[];
  isPublished: boolean;
  admin_id?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'admin' | 'super_admin';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  admin_id?: string | null;
  admin_max_students?: number;
  has_used_free_test?: boolean;
}
