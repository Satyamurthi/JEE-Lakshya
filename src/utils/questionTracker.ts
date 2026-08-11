/**
 * Global Question Deduplication & History Tracker
 * Ensures students never get duplicate questions in a single exam,
 * and avoids repeating questions from previous exam attempts until the database pool is exhausted.
 */

const HISTORY_KEY = 'seen_question_hashes_history_v2';

// Generate a unique hash from question id or full statement + options + answer
export const getQuestionHash = (q: any): string => {
  if (!q) return '';
  if (q.pattern_id) return String(q.pattern_id);
  if (q.id) return String(q.id);
  const stmt = (q.statement || q.question || '').replace(/\s+/g, '').toLowerCase();
  const opts = q.options ? JSON.stringify(q.options).replace(/\s+/g, '') : '';
  const ans = String(q.correctAnswer || '').trim();
  return `${stmt}_${opts}_${ans}`;
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
    // Keep history bounded to last 20,000 unique questions
    const arr = Array.from(currentSet).slice(-20000);
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
    localStorage.setItem(HISTORY_KEY, JSON.stringify(Array.from(globalHistory).slice(-20000)));
  } catch (e) {}

  return reusedQuestions;
};

export const checkAndIncrementDailyGenerationLimit = (countToGenerate: number): void => {
  let profile: any = {};
  try {
    const profileRaw = localStorage.getItem('user_profile');
    if (profileRaw) {
      profile = JSON.parse(profileRaw);
    }
  } catch (e) {}

  // If the user is the Super Admin, bypass the daily Practising generation limit
  if (profile.role === 'super_admin') {
    return;
  }

  const todayStr = new Date().toDateString();
  const userId = profile.id || 'anonymous';
  const trackerKey = `daily_gen_count_${userId}`;
  const trackerDateKey = `daily_gen_date_${userId}`;
  
  const lastDate = localStorage.getItem(trackerDateKey);
  let currentCount = 0;
  
  if (lastDate === todayStr) {
    const rawCount = localStorage.getItem(trackerKey);
    currentCount = rawCount ? parseInt(rawCount, 10) : 0;
  } else {
    localStorage.setItem(trackerDateKey, todayStr);
    localStorage.setItem(trackerKey, '0');
  }
  
  if (currentCount + countToGenerate > 5) {
    throw new Error(`Daily generation limit reached! You can generate at most 5 questions per day. You have already generated ${currentCount} questions today.`);
  }
  
  localStorage.setItem(trackerKey, String(currentCount + countToGenerate));
};

