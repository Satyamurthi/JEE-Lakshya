/**
 * Centralized Metrics & IST Daily Challenge Streak Utility
 * Ensures 100% synchronization of Accuracy, Percentile, XP, and Streaks
 */

/**
 * Converts any date input to Indian Standard Time (IST, UTC+5:30) YYYY-MM-DD string
 */
export const getISTDateString = (dateInput?: string | number | Date): string => {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return '';
  
  // IST is UTC + 5 hours 30 minutes (330 minutes)
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const istTime = new Date(utcTime + (330 * 60000));
  
  const year = istTime.getFullYear();
  const month = String(istTime.getMonth() + 1).padStart(2, '0');
  const day = String(istTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates strict Daily Challenge Streak based on Indian Standard Time (IST 00:00 - 23:59).
 * Streak is strictly dependent on completing a Daily Challenge on consecutive IST calendar days.
 */
export const calculateDailyStreak = (allHistory: any[]): number => {
  if (!allHistory || !Array.isArray(allHistory) || allHistory.length === 0) return 0;

  // 1. Filter ONLY Daily Challenge attempts
  const dailyAttempts = allHistory.filter((item: any) => {
    const typeStr = String(item.type || item.exam_type || item.source || '').toLowerCase();
    return typeStr.includes('daily') || item.is_daily_challenge || item.challenge_id;
  });

  if (dailyAttempts.length === 0) return 0;

  // 2. Extract distinct IST calendar dates where Daily Challenge was submitted
  const istDatesSet = new Set<string>();
  dailyAttempts.forEach((item: any) => {
    const d = item.completedAt || item.submitted_at || item.date || item.created_at;
    if (d) {
      const istStr = getISTDateString(d);
      if (istStr) istDatesSet.add(istStr);
    }
  });

  const now = new Date();
  const todayIST = getISTDateString(now);
  const yesterdayIST = getISTDateString(new Date(now.getTime() - 86400000));

  // Determine starting anchor date (today or yesterday)
  let anchorDateStr: string | null = null;
  if (istDatesSet.has(todayIST)) {
    anchorDateStr = todayIST;
  } else if (istDatesSet.has(yesterdayIST)) {
    anchorDateStr = yesterdayIST;
  } else {
    // Neither today nor yesterday had a Daily Challenge -> Streak Broken!
    return 0;
  }

  // 3. Count consecutive preceding IST calendar days
  let streak = 0;
  let checkDate = new Date(anchorDateStr + 'T12:00:00+05:30'); // Anchor at noon IST
  
  while (true) {
    const dateStr = getISTDateString(checkDate);
    if (istDatesSet.has(dateStr)) {
      streak++;
      checkDate.setTime(checkDate.getTime() - 86400000); // Step back 24 hours
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Calculates overall accuracy percentage across exam sessions
 */
export const calculateOverallAccuracy = (history: any[]): number => {
  if (!history || !Array.isArray(history) || history.length === 0) return 0;

  let totalCorrect = 0;
  let totalAttempted = 0;

  history.forEach((h: any) => {
    let questionsList = h.questions;
    if (typeof questionsList === 'string') {
      try { questionsList = JSON.parse(questionsList); } catch (e) { questionsList = []; }
    }

    if (Array.isArray(questionsList) && questionsList.length > 0) {
      totalAttempted += questionsList.length;
      totalCorrect += questionsList.filter((q: any) => q.isCorrect).length;
    } else {
      const qCount = h.totalQuestions || h.total_questions || (h.total_marks ? Math.round(h.total_marks / 4) : 25);
      const corr = h.correct_count !== undefined ? h.correct_count : (h.score ? Math.max(0, Math.round(h.score / 4)) : 0);
      totalAttempted += qCount;
      totalCorrect += corr;
    }
  });

  if (totalAttempted === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((totalCorrect / totalAttempted) * 100)));
};

/**
 * Calculates national percentile estimate based on average accuracy
 */
export const calculatePercentile = (accuracyPct: number): number => {
  if (!accuracyPct || accuracyPct <= 0) return 0.0;
  
  let p = 0;
  if (accuracyPct >= 95) {
    p = 99.0 + ((accuracyPct - 95) / 5) * 0.9;
  } else if (accuracyPct >= 80) {
    p = 94.0 + ((accuracyPct - 80) / 15) * 5.0;
  } else if (accuracyPct >= 50) {
    p = 75.0 + ((accuracyPct - 50) / 30) * 19.0;
  } else {
    p = Math.max(10.0, (accuracyPct / 50) * 75.0);
  }
  return parseFloat(p.toFixed(1));
};

/**
 * Calculates total XP (Experience Points) earned across tests & daily challenges
 */
export const calculateTotalXP = (history: any[], streak: number): number => {
  if (!history || !Array.isArray(history) || history.length === 0) return 0;

  let totalScore = 0;
  let totalCorrect = 0;

  history.forEach((h: any) => {
    totalScore += Math.max(0, h.score || 0);
    let questionsList = h.questions;
    if (typeof questionsList === 'string') {
      try { questionsList = JSON.parse(questionsList); } catch (e) { questionsList = []; }
    }
    if (Array.isArray(questionsList)) {
      totalCorrect += questionsList.filter((q: any) => q.isCorrect).length;
    } else if (h.correct_count) {
      totalCorrect += h.correct_count;
    }
  });

  const baseXP = totalScore * 5;
  const correctXP = totalCorrect * 20;
  const sessionsXP = history.length * 50;
  const streakXP = streak * 150;

  return baseXP + correctXP + sessionsXP + streakXP;
};
