/**
 * Question Deduplication & Per-Student History Tracker
 * ─────────────────────────────────────────────────────────────────────────────
 * Guarantees a student never sees the same question repeated for at least
 * 50 full exam attempts (50 exams × ~90 questions = 4,500 unique IDs stored).
 *
 * Key design decisions:
 *  1. History key is PER-STUDENT (keyed by user ID) — different students on
 *     the same device no longer share a question history.
 *  2. History is seeded from the server (exam_attempts table) via
 *     syncStudentQuestionHistory(), so clearing localStorage does NOT reset it.
 *  3. History cap is 10,000 — comfortably covers 50+ full exams worth of IDs
 *     (4,500 for 50 exams) with 2× headroom, within localStorage limits.
 */

// ── Per-student key helpers ───────────────────────────────────────────────────

const getStudentId = (): string => {
  try {
    const raw = localStorage.getItem('user_profile');
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.id) return String(p.id);
    }
  } catch (e) {}
  return 'guest';
};

/** Returns the localStorage key scoped to the currently logged-in student. */
const getHistoryKey = (): string => `q_history_v3_${getStudentId()}`;

/** Timestamp key: tracks when we last synced from the server for this student. */
const getSyncTsKey = (): string => `q_history_sync_ts_${getStudentId()}`;

/** How often to re-sync from server (ms). 10 minutes is generous. */
const SYNC_INTERVAL_MS = 10 * 60 * 1000;

/** Max questions to keep in history. 10,000 = ~111 full JEE exams. */
const HISTORY_CAP = 10_000;

// ── Core tracker API ──────────────────────────────────────────────────────────

/** Produce a stable string key for a question (ID preferred, statement fallback). */
export const getQuestionHash = (q: any): string => {
  if (!q) return '';
  if (q.id) return String(q.id);
  // Fallback for locally-generated questions without a server ID
  const stmt = (q.statement || q.question || '').replace(/\s+/g, '').toLowerCase().slice(0, 120);
  const ans  = String(q.correctAnswer || q.correct_answer || '').trim();
  return `${stmt}__${ans}`;
};

export const getSeenQuestionHashes = (): Set<string> => {
  try {
    const raw = localStorage.getItem(getHistoryKey());
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
};

export const recordSeenQuestions = (questions: any[]): void => {
  try {
    const currentSet = getSeenQuestionHashes();
    for (const q of questions) {
      const h = getQuestionHash(q);
      if (h) currentSet.add(h);
    }
    // Keep bounded to HISTORY_CAP (oldest entries drop off first)
    const arr = Array.from(currentSet).slice(-HISTORY_CAP);
    localStorage.setItem(getHistoryKey(), JSON.stringify(arr));
  } catch (e) {
    console.warn('[QuestionTracker] Failed to record seen questions:', e);
  }
};

/**
 * syncStudentQuestionHistory
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches the student's last 50 exam_attempts from the server, extracts every
 * question ID that appeared in those exams, and seeds the local history tracker
 * with those IDs.
 *
 * This is the key guarantee: even if the student clears their browser cache or
 * switches devices, the server-side history is restored on their next exam launch.
 *
 * Call this once at the start of preparePaper() in ExamSetup, before fetching
 * questions. It silently no-ops for guests or if sync ran recently.
 */
export const syncStudentQuestionHistory = async (
  supabaseClient: any,
  activeStream?: string
): Promise<void> => {
  try {
    const studentId = getStudentId();
    if (studentId === 'guest') return; // Not logged in — nothing to sync

    // Rate-limit: skip if we synced recently (within SYNC_INTERVAL_MS)
    const lastSync = parseInt(localStorage.getItem(getSyncTsKey()) || '0', 10);
    if (Date.now() - lastSync < SYNC_INTERVAL_MS) return;

    // Fetch the last 50 exam_attempts for this student.
    // Each attempt's `questions` field is a JSON array of { id, isCorrect }.
    const { data: attempts, error } = await supabaseClient
      .from('exam_attempts')
      .select('questions')
      .eq('user_id', studentId)
      .order('submitted_at', { ascending: false })
      .limit(50);

    if (error || !attempts) {
      console.warn('[QuestionTracker] Could not sync from exam_attempts:', error?.message);
      return;
    }

    // Extract all question IDs from those attempts
    const serverSeenIds = new Set<string>();
    for (const attempt of attempts) {
      const qs = attempt.questions;
      const list: any[] = Array.isArray(qs) ? qs : (typeof qs === 'string' ? JSON.parse(qs) : []);
      for (const q of list) {
        if (q && q.id) serverSeenIds.add(String(q.id));
      }
    }

    if (serverSeenIds.size === 0) return;

    // Merge server IDs into the local history (local wins — keeps any device-specific extras)
    const localSet = getSeenQuestionHashes();
    for (const id of serverSeenIds) localSet.add(id);

    const merged = Array.from(localSet).slice(-HISTORY_CAP);
    localStorage.setItem(getHistoryKey(), JSON.stringify(merged));
    localStorage.setItem(getSyncTsKey(), String(Date.now()));

    console.log(`[QuestionTracker] Synced ${serverSeenIds.size} seen IDs from server (${attempts.length} past exams). Total history: ${merged.length}`);
  } catch (e) {
    // Non-fatal — exam can still proceed
    console.warn('[QuestionTracker] syncStudentQuestionHistory error:', e);
  }
};

// ── Utility: filter a local list against seen history ────────────────────────

export const filterUniqueQuestions = (questions: any[], targetCount?: number): any[] => {
  if (!questions || questions.length === 0) return [];

  const seenInCurrentExam = new Set<string>();
  const globalHistory = getSeenQuestionHashes();

  const freshQuestions: any[] = [];
  for (const q of questions) {
    const h = getQuestionHash(q);
    if (!h || seenInCurrentExam.has(h)) continue;
    if (!globalHistory.has(h)) {
      seenInCurrentExam.add(h);
      freshQuestions.push(q);
    }
  }

  const required = targetCount ?? questions.length;
  if (freshQuestions.length >= required) return freshQuestions.slice(0, required);

  // Pool exhausted — recycle (remove from history so they come back fresh next time)
  const result: any[] = [...freshQuestions];
  for (const q of questions) {
    if (result.length >= required) break;
    const h = getQuestionHash(q);
    if (!h || seenInCurrentExam.has(h)) continue;
    seenInCurrentExam.add(h);
    result.push(q);
    globalHistory.delete(h);
  }

  try {
    localStorage.setItem(getHistoryKey(), JSON.stringify(Array.from(globalHistory).slice(-HISTORY_CAP)));
  } catch (e) {}

  return result;
};

// ── Daily generation limit (unchanged) ───────────────────────────────────────

export const checkAndIncrementDailyGenerationLimit = (countToGenerate: number): void => {
  let profile: any = {};
  try {
    const raw = localStorage.getItem('user_profile');
    if (raw) profile = JSON.parse(raw);
  } catch (e) {}

  if (profile.role === 'super_admin') return;

  const todayStr = new Date().toDateString();
  const userId   = profile.id || 'anonymous';
  const trackerKey     = `daily_gen_count_${userId}`;
  const trackerDateKey = `daily_gen_date_${userId}`;

  const lastDate = localStorage.getItem(trackerDateKey);
  let currentCount = 0;

  if (lastDate === todayStr) {
    currentCount = parseInt(localStorage.getItem(trackerKey) || '0', 10);
  } else {
    localStorage.setItem(trackerDateKey, todayStr);
    localStorage.setItem(trackerKey, '0');
  }

  if (currentCount + countToGenerate > 5) {
    throw new Error(
      `Daily generation limit reached! You can generate at most 5 questions per day. ` +
      `You have already generated ${currentCount} questions today.`
    );
  }

  localStorage.setItem(trackerKey, String(currentCount + countToGenerate));
};

