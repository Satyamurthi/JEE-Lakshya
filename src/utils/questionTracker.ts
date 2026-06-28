/**
 * Global Question Deduplication & History Tracker
 * Ensures students never get duplicate questions in a single exam,
 * and avoids repeating questions from previous exam attempts.
 */

const HISTORY_KEY = 'seen_question_hashes_history';

// Generate a quick string hash from question statement
export const getQuestionHash = (q: any): string => {
  if (!q) return '';
  const stmt = (q.statement || q.question || '').replace(/\s+/g, '').toLowerCase();
  return stmt.substring(0, 100);
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
    // Keep history manageable (last 2000 unique questions)
    const arr = Array.from(currentSet).slice(-2000);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("Failed to record seen questions history:", e);
  }
};

export const filterUniqueQuestions = (questions: any[], enforceStrictHistory: boolean = false): any[] => {
  const seenInCurrentExam = new Set<string>();
  const globalHistory = getSeenQuestionHashes();
  const uniqueList: any[] = [];

  for (const q of questions) {
    const h = getQuestionHash(q);
    if (!h) continue;

    // Must be unique within current exam session
    if (seenInCurrentExam.has(h)) continue;

    // If enforcing strict history and already seen in past exams, skip if possible
    if (enforceStrictHistory && globalHistory.has(h) && questions.length > 30) {
      continue;
    }

    seenInCurrentExam.add(h);
    uniqueList.push(q);
  }

  return uniqueList;
};
