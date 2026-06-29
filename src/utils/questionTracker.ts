/**
 * Global Question Deduplication & History Tracker
 * Ensures students never get duplicate questions in a single exam,
 * and avoids repeating questions from previous exam attempts until the database pool is exhausted.
 */

const HISTORY_KEY = 'seen_question_hashes_history_v2';

// Generate a quick string hash from question statement or ID
export const getQuestionHash = (q: any): string => {
  if (!q) return '';
  if (q.id && typeof q.id === 'string' && !q.id.startsWith('temp')) {
    return `id_${q.id}`;
  }
  const stmt = (q.statement || q.question || '').replace(/\s+/g, '').toLowerCase();
  return stmt.substring(0, 120);
};

export const getSeenQuestionHashes = (): Set<string> => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(arr);
  } catch (e) {
    return new Set();
  }
};

export const recordSeenQuestions = (questions: any[]) => {
  try {
    const currentSet = getSeenQuestionHashes();
    questions.forEach(q => {
      const h = getQuestionHash(q);
      if (h) currentSet.add(h);
    });
    // Keep history bounded to last 5000 unique questions
    const arr = Array.from(currentSet).slice(-5000);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("Failed to record seen questions history:", e);
  }
};

export const filterUniqueQuestions = (questions: any[], targetCount?: number): any[] => {
  if (!questions || questions.length === 0) return [];
  
  const seenInCurrentExam = new Set<string>();
  const globalHistory = getSeenQuestionHashes();
  
  // First pass: pick questions not seen in current exam AND not in global history
  const freshQuestions: any[] = [];
  for (const q of questions) {
    const h = getQuestionHash(q);
    if (!h || seenInCurrentExam.has(h)) continue;
    
    if (!globalHistory.has(h)) {
      seenInCurrentExam.add(h);
      freshQuestions.push(q);
    }
  }

  const required = targetCount || questions.length;

  // If we have enough fresh questions, return them
  if (freshQuestions.length >= required) {
    return freshQuestions.slice(0, required);
  }

  // If pool is exhausted (not enough fresh questions), allow reuse by pulling from remaining questions
  const reusedQuestions: any[] = [...freshQuestions];
  for (const q of questions) {
    if (reusedQuestions.length >= required) break;
    const h = getQuestionHash(q);
    if (!h || seenInCurrentExam.has(h)) continue;
    
    seenInCurrentExam.add(h);
    reusedQuestions.push(q);
    // Remove from global history so it recycles cleanly
    globalHistory.delete(h);
  }

  // Persist updated global history after recycling
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(Array.from(globalHistory).slice(-5000)));
  } catch (e) {}

  return reusedQuestions;
};
