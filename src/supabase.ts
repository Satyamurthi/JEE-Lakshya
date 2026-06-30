import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    // Check for VITE_ prefixed variables in import.meta.env
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        if ((import.meta as any).env[key]) return (import.meta as any).env[key];
        if ((import.meta as any).env[`VITE_${key}`]) return (import.meta as any).env[`VITE_${key}`];
    }
  } catch (e) {}
  return '';
};

// --- CONFIGURATION ---
const PROVIDED_URL = process.env.SUPABASE_URL || 'https://daitgcrjlimjajmqoemm.supabase.co';
const PROVIDED_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaXRnY3JqbGltamFqbXFvZW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1Nzc0MjIsImV4cCI6MjA5ODE1MzQyMn0.gGGHEQaVL0aXPkI-u5CMSPod5BazzBEAKr2ZfxnBh6Y';

const getCustomConfig = () => {
  if (typeof window === 'undefined') return { url: '', key: '' };
  try {
    const custom = JSON.parse(localStorage.getItem('custom_supabase_config') || '{}');
    return custom;
  } catch(e) { return { url: '', key: '' }; }
};

const customConfig = getCustomConfig();
let supabaseUrl = customConfig.url || getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || getEnv('REACT_APP_SUPABASE_URL') || PROVIDED_URL;
let supabaseAnonKey = customConfig.key || getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('REACT_APP_SUPABASE_ANON_KEY') || PROVIDED_KEY;

if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim().replace(/\.\.co$/, '.supabase.co').replace(/\.supabase\.supabase\.co$/, '.supabase.co');
  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
}
if (supabaseAnonKey) {
    supabaseAnonKey = supabaseAnonKey.trim();
}

// Initial client instance
let activeClient = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Proxy wrapper that routes calls to the currently activeClient
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!activeClient) return null;
    const value = (activeClient as any)[prop];
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  }
});

export const isSupabaseConfigured = () => !!activeClient;

// Dynamic client switcher
export const switchSupabaseBackend = (stream: string) => {
  localStorage.setItem('active_stream', stream);
  
  let url = supabaseUrl;
  let key = supabaseAnonKey;
  
  if (stream === 'NEET UG') {
    url = getEnv('NEET_SUPABASE_URL') || getEnv('VITE_NEET_SUPABASE_URL') || supabaseUrl;
    key = getEnv('NEET_SUPABASE_ANON_KEY') || getEnv('VITE_NEET_SUPABASE_ANON_KEY') || supabaseAnonKey;
  } else if (stream === 'KCET') {
    url = getEnv('KCET_SUPABASE_URL') || getEnv('VITE_KCET_SUPABASE_URL') || supabaseUrl;
    key = getEnv('KCET_SUPABASE_ANON_KEY') || getEnv('VITE_KCET_SUPABASE_ANON_KEY') || supabaseAnonKey;
  } else if (stream === 'UPSC') {
    url = getEnv('UPSC_SUPABASE_URL') || getEnv('VITE_UPSC_SUPABASE_URL') || supabaseUrl;
    key = getEnv('UPSC_SUPABASE_ANON_KEY') || getEnv('VITE_UPSC_SUPABASE_ANON_KEY') || supabaseAnonKey;
  }
  
  if (url && key) {
    url = url.trim().replace(/\.\.co$/, '.supabase.co').replace(/\.supabase\.supabase\.co$/, '.supabase.co');
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
    key = key.trim();
    activeClient = createClient(url, key);
  }
  
  window.dispatchEvent(new Event('supabase_client_changed'));
};

// Auto-switch to persisted stream backend on load if any
const savedStream = localStorage.getItem('active_stream');
if (savedStream && savedStream !== 'JEE Main & Advanced') {
  switchSupabaseBackend(savedStream);
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15);
};

export const normalizeQuestionOptions = (options: any) => {
  if (Array.isArray(options)) {
    const identifiers = ["A", "B", "C", "D"];
    const obj: any = {};
    options.forEach((opt, idx) => {
      if (idx < identifiers.length) {
        obj[identifiers[idx]] = opt;
      }
    });
    return obj;
  }
  return options || {};
};

export const saveQuestionsToDB = async (questions: any[]) => {
  // Dedup questions within the incoming batch first by statement
  const seenStatements = new Set<string>();
  const uniqueInputQuestions: any[] = [];
  for (const q of questions) {
    if (q && q.statement) {
      const trimmedStatement = q.statement.trim();
      if (!seenStatements.has(trimmedStatement)) {
        seenStatements.add(trimmedStatement);
        uniqueInputQuestions.push(q);
      }
    }
  }

  if (uniqueInputQuestions.length === 0) return;

  const formattedQuestions = uniqueInputQuestions.map(q => ({
    id: q.id || generateId(),
    subject: q.subject,
    chapter: q.chapter || q.concept || 'General',
    type: q.type || 'MCQ',
    difficulty: q.difficulty || 'Medium',
    statement: q.statement.trim(),
    options: normalizeQuestionOptions(q.options),
    correctAnswer: String(q.correctAnswer),
    solution: q.solution || q.explanation || 'No explanation available.',
    explanation: q.explanation || q.solution || 'No explanation available.',
    concept: q.concept || q.chapter || 'General',
    markingScheme: q.markingScheme || { positive: 4, negative: q.type === 'Numerical' ? 0 : 1 }
  }));

  if (!supabase) {
    try {
      const res = await fetch('http://localhost/api/questions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedQuestions)
      });
      if (!res.ok) {
        console.warn("Local DB questions save failed with status:", res.status);
      }
    } catch (e) {
      console.warn("Local XAMPP questions save failed:", e);
    }
    return;
  }

  try {
    // Query existing questions in Supabase by matching statement text
    const statements = formattedQuestions.map(q => q.statement);
    const { data: existing, error: fetchError } = await supabase
      .from('questions')
      .select('statement')
      .in('statement', statements);

    if (fetchError) throw fetchError;

    const existingSet = new Set(existing?.map(e => e.statement.trim()) || []);
    const newQuestions = formattedQuestions.filter(q => !existingSet.has(q.statement));

    if (newQuestions.length > 0) {
      const { error: insertError } = await supabase.from('questions').insert(newQuestions);
      if (insertError) throw insertError;
      console.log(`Successfully saved ${newQuestions.length} unique questions to Supabase.`);
    } else {
      console.log("No new unique questions to save.");
    }
  } catch (e) {
    console.warn("Supabase questions save failed:", e);
  }
};

export const fetchQuestionsFromDB = async (
  subject?: string, 
  chapter?: string, 
  topics?: string[], 
  mcqCount: number = 10, 
  numericalCount: number = 0,
  difficulty?: string
) => {
  if (!supabase) {
    try {
      let url = `http://localhost/api/questions.php?mcqCount=${mcqCount}&numericalCount=${numericalCount}`;
      if (subject) url += `&subject=${encodeURIComponent(subject)}`;
      if (chapter) url += `&chapter=${encodeURIComponent(chapter)}`;
      if (difficulty) url += `&difficulty=${encodeURIComponent(difficulty)}`;
      const res = await fetch(url);
      return await res.json() || [];
    } catch (e) {
      console.warn("Local XAMPP questions fetch failed:", e);
      return [];
    }
  }
  try {
    const { filterUniqueQuestions, recordSeenQuestions } = await import('./utils/questionTracker');
    
    const fetchByType = async (type: string, count: number) => {
        if (count <= 0) return [];
        let query = supabase.from('questions').select('id').eq('type', type);
        if (subject) query = query.eq('subject', subject);
        if (chapter) query = query.eq('chapter', chapter);
        if (topics && topics.length > 0) query = query.in('concept', topics);
        if (difficulty) query = query.ilike('difficulty', `%${difficulty}%`);
        
        let { data: idData, error: idError } = await query;
        if (idError) throw idError;
        
        // If strict difficulty query returned empty, fall back to any difficulty for this subject/chapter
        if (!idData || idData.length === 0) {
          let fallbackQuery = supabase.from('questions').select('id').eq('type', type);
          if (subject) fallbackQuery = fallbackQuery.eq('subject', subject);
          if (chapter) fallbackQuery = fallbackQuery.eq('chapter', chapter);
          const { data: fbData } = await fallbackQuery;
          idData = fbData || [];
        }
        
        if (!idData || idData.length === 0) return [];
        
        // Pick random set of IDs
        const shuffledIds = idData
          .map(x => x.id)
          .sort(() => Math.random() - 0.5);
        
        if (shuffledIds.length === 0) return [];
        
        const { data, error } = await supabase.from('questions').select('*').in('id', shuffledIds.slice(0, Math.min(count * 3, shuffledIds.length)));
        if (error) throw error;
        
        const fetchedList = data || [];
        // Filter out previously seen questions to guarantee no repetition until pool exhaustion
        const uniqueFetched = filterUniqueQuestions(fetchedList, count);
        recordSeenQuestions(uniqueFetched);
        return uniqueFetched;
    };

    const [mcqs, numericals] = await Promise.all([
        fetchByType('MCQ', mcqCount),
        fetchByType('Numerical', numericalCount)
    ]);

    // Fallback to local PYQ bank if database returned 0 questions
    let resultQuestions = [...mcqs, ...numericals];
    if (resultQuestions.length === 0) {
      try {
        const { OFFICIAL_JEE_PYQ_BANK } = await import('./data/officialJeePyqBank');
        let filtered = OFFICIAL_JEE_PYQ_BANK || [];
        if (subject) filtered = filtered.filter((q: any) => q.subject && q.subject.toLowerCase().includes(subject.toLowerCase()));
        if (chapter) filtered = filtered.filter((q: any) => q.chapter && q.chapter.toLowerCase().includes(chapter.toLowerCase()));
        if (difficulty) filtered = filtered.filter((q: any) => q.difficulty && q.difficulty.toLowerCase().includes(difficulty.toLowerCase()));
        resultQuestions = filterUniqueQuestions(filtered, mcqCount + numericalCount);
      } catch (err) {
        console.error("Local bank fallback in fetchQuestionsFromDB failed:", err);
      }
    }

    return resultQuestions;
  } catch (e) {
    console.warn("Supabase fetch failed:", e);
    return [];
  }
};

export const submitExamAttempt = async (attempt: any) => {
  if (!supabase) {
    try {
      const res = await fetch('http://localhost/api/exam_attempts.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt)
      });
      const data = await res.json();
      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: e.message || "Local attempt submit failed" };
    }
  }
  try {
    const { data, error } = await supabase.from('exam_attempts').insert(attempt).select().single();
    if (error && error.message && error.message.includes("paid")) {
      console.warn("Schema cache missing 'paid' column, retrying insert without 'paid' field...");
      const attemptCopy = { ...attempt };
      delete attemptCopy.paid;
      return await supabase.from('exam_attempts').insert(attemptCopy).select().single();
    }
    return { data, error };
  } catch (e: any) {
    return { data: null, error: e };
  }
};

export const getUserExamAttempts = async (userId: string) => {
  if (!supabase) {
    try {
      const res = await fetch(`http://localhost/api/exam_attempts.php?user_id=${encodeURIComponent(userId)}`);
      return await res.json() || [];
    } catch (e) {
      return [];
    }
  }
  try {
    const { data, error } = await supabase.from('exam_attempts').select('*').eq('user_id', userId).order('submitted_at', { ascending: false });
    if (error) return [];
    return data;
  } catch (e) {
    return [];
  }
};

export const getUserAllDailyAttempts = async (userId: string) => {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.from('daily_attempts').select('*').eq('user_id', userId).order('submitted_at', { ascending: false });
      if (error) return [];
      return data;
    } catch (e) {
      return [];
    }
};

export const getAllProfiles = async () => {
  if (!supabase) return { data: [], error: "Supabase not configured" };
  try {
    const response = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    return response;
  } catch (e: any) {
    return { data: [], error: e };
  }
};

export const getProfile = async (userId: string) => {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data && data.email === 'satyu000@gmail.com' && data.role !== 'super_admin') {
      data.role = 'super_admin';
      data.status = 'approved';
    }
    return data;
  } catch (e) {
    return null;
  }
};

export const updateProfileStatus = async (userId: string, status: string) => {
  if (!supabase) return "Supabase not configured";

  try {
    const { data, error } = await supabase.from('profiles').update({ status }).eq('id', userId).select();
    if (error) {
      console.error("Supabase update error:", error);
      return error.message;
    }
    return null;
  } catch (e: any) {
    return e.message || "Network error during profile update.";
  }
};

export const deleteProfile = async (userId: string) => {
  if (!supabase) return "Supabase not configured";

  try {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) {
      console.error("Supabase delete error:", error);
      return error.message;
    }
    return null;
  } catch (e: any) {
    return e.message || "Network error during profile deletion.";
  }
};

export const updateStudentCredentials = async (userId: string, full_name: string, email: string, password?: string) => {
  if (!supabase) return "Supabase not configured";
  try {
    const updates: any = { full_name, email: email.toLowerCase().trim() };
    if (password && password.trim() !== '') {
      updates.password = password;
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) return error.message;
    return null;
  } catch (e: any) {
    return e.message || "Error updating credentials";
  }
};

export const syncLocalProfilesToSupabase = async () => {
  return { success: true, message: "Local sync disabled. System is Cloud-only." };
};

export const getDailyChallenge = async (date: string, adminId: string | null = null) => {
  if (!supabase) return null;
  try {
    let query = supabase.from('daily_challenges').select('*').eq('date', date);
    if (adminId) {
      query = query.eq('admin_id', adminId);
    } else {
      query = query.is('admin_id', null);
    }
    const { data, error } = await query.maybeSingle();
    if (error) console.warn("Daily fetch error:", error);
    return data;
  } catch (e) { 
    return null; 
  }
};

export const getAllDailyChallenges = async (adminId: string | null = null) => {
    if (!supabase) return [];
    try {
        let query = supabase.from('daily_challenges').select('*');
        if (adminId) {
            query = query.eq('admin_id', adminId);
        } else {
            query = query.is('admin_id', null);
        }
        const { data } = await query.order('date', { ascending: false });
        return data || [];
    } catch (e) {
        return [];
    }
};

export const createDailyChallenge = async (date: string, questions: any[], adminId: string | null = null) => {
  if (!supabase) return { data: null, error: "Supabase not configured" };
  try {
    // Delete existing daily challenge on the same date for this admin to bypass upsert conflict target issues
    if (adminId) {
      await supabase.from('daily_challenges').delete().eq('date', date).eq('admin_id', adminId);
    } else {
      await supabase.from('daily_challenges').delete().eq('date', date).is('admin_id', null);
    }

    const newChallenge = { 
      date: date, 
      questions: questions, 
      admin_id: adminId, 
      created_at: new Date().toISOString() 
    };
    const { data, error } = await supabase.from('daily_challenges').insert(newChallenge).select().single();
    return { data, error };
  } catch (e) { 
    return { data: null, error: e }; 
  }
};

export const submitDailyAttempt = async (attempt: any) => {
  if (!supabase) return { data: null, error: "Supabase not configured" };
  try {
    const { date, ...validAttempt } = attempt || {};
    const { data, error } = await supabase.from('daily_attempts').upsert(validAttempt, { onConflict: 'user_id, challenge_id' }).select().single();
    return { data, error };
  } catch (e) {
    return { data: null, error: e };
  }
};

export const getUserDailyAttempt = async (userId: string, date: string) => {
  if (!supabase) return null;
  try {
    const profile = await getProfile(userId);
    if (!profile) return null;

    const challenge = await getDailyChallenge(date, profile.admin_id);
    if (!challenge) return null;

    const { data, error } = await supabase
      .from('daily_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('challenge_id', challenge.id)
      .maybeSingle();
      
    if (error && error.code !== 'PGRST116') return null;
    return data;
  } catch (e) {
    return null;
  }
};

export const getDailyAttempts = async (date: string, adminId: string | null = null) => {
  if (!supabase) return [];
  try {
    const challenge = await getDailyChallenge(date, adminId);
    if (!challenge) return [];

    const { data, error } = await supabase
      .from('daily_attempts')
      .select('*, profiles:user_id ( email, full_name )')
      .eq('challenge_id', challenge.id)
      .order('score', { ascending: false });
      
    if (error) return [];
    return data.map((item: any) => ({ 
      ...item, 
      user_email: item.profiles?.email, 
      user_name: item.profiles?.full_name 
    }));
  } catch (e) {
    return [];
  }
};

export const getDailyAttemptsByChallenge = async (challengeId: string) => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('daily_attempts')
      .select('*, profiles:user_id ( email, full_name, admin_id )')
      .eq('challenge_id', challengeId)
      .order('score', { ascending: false });
      
    if (error) return [];
    return data.map((item: any) => ({ 
      ...item, 
      user_email: item.profiles?.email, 
      user_name: item.profiles?.full_name,
      admin_id: item.profiles?.admin_id
    }));
  } catch (e) {
    return [];
  }
};

export const getActualTotalRevenue = async () => {
  if (!supabase) return 0;
  try {
    const { data: dailyPaid } = await supabase
      .from('daily_attempts')
      .select('score')
      .eq('paid', true);

    let examCount = 0;
    try {
      const { data: examPaid } = await supabase
        .from('exam_attempts')
        .select('score')
        .eq('paid', true);
      if (Array.isArray(examPaid)) examCount = examPaid.length;
    } catch (e) {}

    const dailyCount = Array.isArray(dailyPaid) ? dailyPaid.length : 0;
    return (dailyCount + examCount) * 10;
  } catch (e) {
    return 0;
  }
};

export const getApprovedAdmins = async () => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, admin_max_students')
      .eq('role', 'admin')
      .eq('status', 'approved');
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Fetch admins failed:", e);
    return [];
  }
};

export const getAdminStudentCount = async (adminId: string) => {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', adminId);
    if (error) throw error;
    return count || 0;
  } catch (e) {
    console.error("Fetch student count failed:", e);
    return 0;
  }
};

export const updateAdminMaxLimit = async (adminId: string, limit: number) => {
  if (!supabase) return "Supabase not configured";
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ admin_max_students: limit })
      .eq('id', adminId);
    if (error) throw error;
    return null;
  } catch (e: any) {
    return e.message || "Error updating admin limit";
  }
};

export const updateAdminDetails = async (adminId: string, full_name: string, email: string, limit: number, password?: string) => {
  if (!supabase) return "Supabase not configured";
  try {
    const updates: any = { full_name, email: email.toLowerCase().trim(), admin_max_students: limit };
    if (password && password.trim() !== '') {
      updates.password = password;
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', adminId);
    if (error) return error.message;
    return null;
  } catch (e: any) {
    return e.message || "Error updating admin credentials";
  }
};

export const toggleAdminModuleAccess = async (adminId: string, currentAccess: boolean) => {
  if (!supabase) return "Supabase not configured";
  try {
    const newPermission = !currentAccess;
    // Update main permission column
    await supabase.from('profiles').update({ super_admin_permission: newPermission }).eq('id', adminId);
    // Attempt granular columns update safely
    try {
      await supabase.from('profiles').update({ 
        can_access_daily: newPermission,
        can_access_full_exam: newPermission,
        can_access_practice: newPermission
      }).eq('id', adminId);
    } catch (gErr) {
      console.warn("Granular columns update ignored:", gErr);
    }
    return null;
  } catch (e: any) {
    return e.message || "Error toggling admin module access";
  }
};

export const updateAdminModulePermissions = async (adminId: string, perms: { can_access_daily: boolean, can_access_full_exam: boolean, can_access_practice: boolean }) => {
  if (!supabase) return "Supabase not configured";
  try {
    const hasAny = perms.can_access_daily || perms.can_access_full_exam || perms.can_access_practice;
    // Attempt full atomic update with all columns
    const { error: fullErr } = await supabase.from('profiles').update({ 
      super_admin_permission: hasAny,
      can_access_daily: perms.can_access_daily,
      can_access_full_exam: perms.can_access_full_exam,
      can_access_practice: perms.can_access_practice
    }).eq('id', adminId);

    if (fullErr) {
      console.warn("Full column update warning, falling back to master column update:", fullErr);
      const { error: masterErr } = await supabase.from('profiles').update({ super_admin_permission: hasAny }).eq('id', adminId);
      if (masterErr) return masterErr.message;
    }
    return null;
  } catch (e: any) {
    return e.message || "Error updating module permissions";
  }
};

export const deleteAdminAndStudents = async (adminId: string) => {
  if (!supabase) return "Supabase not configured";
  try {
    // 1. Delete challenges published by this admin to avoid FK block
    try {
      await supabase.from('daily_challenges').delete().eq('admin_id', adminId);
    } catch (dcErr) {
      console.warn("Challenge cleanup warning:", dcErr);
    }

    // 2. Delete all students assigned to this admin
    const { error: studentErr } = await supabase.from('profiles').delete().eq('admin_id', adminId);
    if (studentErr) console.warn("Student cascade delete warning:", studentErr);

    // 3. Delete the admin profile itself
    const { error: adminErr } = await supabase.from('profiles').delete().eq('id', adminId);
    if (adminErr) {
      console.error("Admin profile deletion error:", adminErr);
      return adminErr.message;
    }
    return null;
  } catch (e: any) {
    return e.message || "Error deleting admin and assigned students";
  }
};

export const toggleAdminFreezeStatus = async (adminId: string, isCurrentlyFrozen: boolean) => {
  if (!supabase) return "Supabase not configured";
  try {
    const newStatus = isCurrentlyFrozen ? 'approved' : 'frozen';
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', adminId);
    if (error) return error.message;
    return null;
  } catch (e: any) {
    return e.message || "Error toggling freeze status";
  }
};

export const getSystemStreams = async (): Promise<string[]> => {
  const defaultStreams = ['JEE Main & Advanced', 'NEET UG', 'KCET', 'BITSAT', 'CUET'];
  if (!supabase) {
    const cached = localStorage.getItem('system_streams');
    return cached ? JSON.parse(cached) : defaultStreams;
  }
  try {
    const { data, error } = await supabase.from('system_config').select('value').eq('key', 'system_streams').maybeSingle();
    if (error || !data) {
      const cached = localStorage.getItem('system_streams');
      return cached ? JSON.parse(cached) : defaultStreams;
    }
    return data.value || defaultStreams;
  } catch (e) {
    const cached = localStorage.getItem('system_streams');
    return cached ? JSON.parse(cached) : defaultStreams;
  }
};

export const saveSystemStreams = async (streams: string[]): Promise<string | null> => {
  localStorage.setItem('system_streams', JSON.stringify(streams));
  if (!supabase) return null;
  try {
    const { error } = await supabase.from('system_config').upsert({ key: 'system_streams', value: streams });
    if (error) return error.message;
    return null;
  } catch (e: any) {
    return e.message || "Error saving streams";
  }
};

export const getPaymentApiUrl = (endpoint: string) => {
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isDev) {
    return `http://localhost/api/${endpoint}.php`;
  }
  return `/.netlify/functions/${endpoint}`;
};

export const getQuestionsCountFromDB = async (): Promise<number> => {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase.from('questions').select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
};

export const seedMassiveQuestionsToDB = async (streamName: string = 'JEE'): Promise<{ success: boolean, count: number, error?: string }> => {
  if (!supabase) return { success: false, count: 0, error: "Supabase client not initialized." };
  
  const isNeet = streamName.toLowerCase().includes('neet');
  const subjects = isNeet ? ['Physics', 'Chemistry', 'Botany', 'Zoology'] : ['Physics', 'Chemistry', 'Mathematics'];
  const difficulties = ['Easy', 'Medium', 'Hard'];
  const chaptersMap: Record<string, string[]> = isNeet ? {
    Physics: ['Kinematics', 'Electrostatics', 'Ray Optics', 'Thermodynamics', 'Current Electricity', 'Laws of Motion', 'Gravitation', 'Wave Optics'],
    Chemistry: ['Redox Reactions', 'Chemical Bonding', 'Thermodynamics', 'Organic Chemistry Basics', 'Equilibrium', 'Structure of Atom', 'Coordination Compounds', 'Solutions'],
    Botany: ['Plant Physiology', 'Cell: Structure and Functions', 'Genetics and Evolution', 'Ecology and Environment', 'Plant Kingdom', 'Biomolecules'],
    Zoology: ['Human Physiology', 'Animal Kingdom', 'Biotechnology & Applications', 'Cell Biology', 'Evolution', 'Human Reproduction & Health', 'Animal Tissues']
  } : {
    Physics: ['Rotational Dynamics', 'Electrostatics', 'Ray Optics', 'Thermodynamics', 'Current Electricity', 'Laws of Motion', 'Gravitation'],
    Chemistry: ['Chemical Bonding', 'Thermodynamics', 'Organic Chemistry', 'Chemical Kinetics', 'Equilibrium', 'Atomic Structure', 'Solutions'],
    Mathematics: ['Calculus', 'Quadratic Equations', 'Differential Equations', 'Complex Numbers', 'Probability', 'Coordinate Geometry', 'Vectors 3D']
  };

  const batch: any[] = [];
  const countPerSub = isNeet ? 100 : 150;
  const timestampToken = Date.now().toString(36).toUpperCase();
  
  subjects.forEach(sub => {
    const chaps = chaptersMap[sub] || ['General Concepts'];
    for (let i = 0; i < countPerSub; i++) {
      const diff = difficulties[i % 3];
      const chap = chaps[i % chaps.length];
      const isMcq = isNeet ? true : (i % 2 === 0);
      const uniqueRef = `${timestampToken}-${sub.substring(0,2).toUpperCase()}${i+1}-${Math.floor(1000 + Math.random()*9000)}`;
      
      let stmt = '';
      let opts = {};
      if (isNeet) {
        if (sub === 'Botany' || sub === 'Zoology') {
          const qTypeMod = i % 3;
          if (qTypeMod === 0) {
            // Match the Following
            stmt = `[NEET ${sub} - Match Column I & II] ${chap} (Ref: ${uniqueRef}):\nMatch Column-I with Column-II and choose the correct option.\n\nColumn-I:\n(A) Structural Complex X\n(B) Regulatory Pathway Y\n(C) Enzyme/Hormone Z\n(D) Cellular Organelle W\n\nColumn-II:\n(i) Regulates osmotic balance and ionic transport\n(ii) Catalyzes ATP synthesis & phosphorylation\n(iii) Primary site of glycosylation and packaging\n(iv) Initiates transcript elongation cycle`;
            opts = {
              A: "A-(ii), B-(iv), C-(i), D-(iii)",
              B: "A-(i), B-(iii), C-(iv), D-(ii)",
              C: "A-(iii), B-(i), C-(ii), D-(iv)",
              D: "A-(iv), B-(ii), C-(iii), D-(i)"
            };
          } else if (qTypeMod === 1) {
            // Diagrammatical & Labeled Identification
            stmt = `[NEET ${sub} - Diagrammatical Identification] ${chap} (Ref: ${uniqueRef}): Refer to the anatomical/schematic diagram of ${chap}. Identify the parts labeled as (A), (B), (C), and (D) and select the correct functional representation.`;
            opts = {
              A: "(A)-Thylakoid Membrane, (B)-Stroma Matrix, (C)-Granum Stack, (D)-Outer Envelope",
              B: "(A)-Cristae Fold, (B)-Matrix Domain, (C)-Inner Membrane, (D)-Intermembrane Space",
              C: "(A)-Nucleolus Site, (B)-Chromatin Thread, (C)-Nuclear Pore, (D)-Ribosome Subunit",
              D: "(A)-Plasma Membrane, (B)-Cytosol Matrix, (C)-Golgi Cisternae, (D)-Lysosome Vesicle"
            };
          } else {
            // Statement Evaluation (Assertion/Reason or Stmt I/II)
            stmt = `[NEET ${sub} - NCERT Statement Evaluation] ${chap} (Ref: ${uniqueRef}): Read the following statements regarding ${chap}:\nStatement-I: Physiological mechanisms governing ${chap} operate under strict homeostatic control.\nStatement-II: Enzymatic catalysis rates double for every 10°C rise in temperature until denaturing occurs.\nSelect the correct answer from the options given below:`;
            opts = {
              A: "Both Statement-I and Statement-II are correct",
              B: "Both Statement-I and Statement-II are incorrect",
              C: "Statement-I is correct but Statement-II is incorrect",
              D: "Statement-I is incorrect but Statement-II is correct"
            };
          }
        } else {
          // Physics & Chemistry NEET MCQs
          stmt = `[NEET Medical ${diff}] ${chap} (Q-Ref: ${uniqueRef}): Identify the correct physiological mechanism, numerical constant, or theoretical principle governing ${sub} regarding ${chap}.`;
          opts = {
            A: `Primary physiological or physical reaction under standard NCERT ${chap} principles.`,
            B: `Alternative regulatory mechanism observed in ${sub} structural systems.`,
            C: `Inhibited metabolic or kinetic pathway during ${chap} phase.`,
            D: `Secondary kinetic equilibrium state in physical conditions.`
          };
        }
      } else {
        stmt = `[JEE Engineering ${diff}] ${chap} (Q-Ref: ${uniqueRef}): Evaluate the numerical/analytical parameters for ${sub} system model under ${chap}.`;
        opts = isMcq ? {
          A: `Calculated value parameter alpha under ${chap} dynamics.`,
          B: `Evaluated matrix boundary result for ${sub}.`,
          C: `Theoretical upper limit constraint in system state.`,
          D: `Zero field equilibrium vector constant.`
        } : {};
      }

      batch.push({
        subject: sub,
        chapter: chap,
        type: isMcq ? 'MCQ' : 'Numerical',
        difficulty: diff,
        statement: stmt,
        options: opts,
        correctAnswer: isMcq ? (["A", "B", "C", "D"][i % 4]) : String((i % 10) + 1),
        solution: `Detailed step-by-step ${isNeet ? 'NEET Medical NCERT' : 'JEE Advanced'} solution explanation for ${chap} (${uniqueRef}).`,
        concept: chap,
        markingScheme: { positive: 4, negative: isMcq ? 1 : 0 }
      });
    }
  });

  try {
    const { data, error } = await supabase.from('questions').upsert(batch, { onConflict: 'statement' }).select();
    if (error) {
      // If upsert fails due to schema conflict target, fallback to insert with random UUIDs
      const { data: insData, error: insErr } = await supabase.from('questions').insert(batch).select();
      if (insErr) return { success: false, count: 0, error: insErr.message };
      return { success: true, count: insData?.length || batch.length };
    }
    return { success: true, count: data?.length || batch.length };
  } catch (e: any) {
    return { success: false, count: 0, error: e.message };
  }
};

export const getAllQuestionsFromDB = async (subjectFilter?: string, maxRecords: number = 15000): Promise<any[]> => {
  let allData: any[] = [];
  if (supabase) {
    try {
      let from = 0;
      const limit = 1000;
      let keepFetching = true;

      while (keepFetching && allData.length < maxRecords) {
        let query = supabase
          .from('questions')
          .select('*');
          
        if (subjectFilter && subjectFilter !== 'All') {
          query = query.ilike('subject', `%${subjectFilter}%`);
        }

        const { data, error } = await query
          .range(from, from + limit - 1);

        if (error) {
          console.warn("Supabase range query warning:", error);
          break;
        }
        if (!data || data.length === 0) {
          keepFetching = false;
        } else {
          allData = [...allData, ...data];
          if (data.length < limit) {
            keepFetching = false;
          } else {
            from += limit;
          }
        }
      }
    } catch (e) {
      console.warn("Supabase fetch all questions warning, falling back to local dataset:", e);
    }
  }

  // Fallback to officialJeePyqBank if database returned empty
  if (!allData || allData.length === 0) {
    try {
      const { OFFICIAL_JEE_PYQ_BANK } = await import('./data/officialJeePyqBank');
      let localBank = OFFICIAL_JEE_PYQ_BANK || [];
      if (subjectFilter && subjectFilter !== 'All') {
        localBank = localBank.filter((q: any) => q.subject && q.subject.toLowerCase().includes(subjectFilter.toLowerCase()));
      }
      return localBank;
    } catch (err) {
      console.error("Local PYQ bank import failed:", err);
    }
  }

  return allData;
};

export const getSubscriptionPlans = async (): Promise<any[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('subscription_plans').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn("Could not fetch subscription plans from database, falling back:", e);
    return [];
  }
};

export const saveSubscriptionPlan = async (plan: any): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('subscription_plans').upsert(plan);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Failed to save subscription plan:", e);
    return false;
  }
};

export const deleteSubscriptionPlan = async (planId: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('subscription_plans').delete().eq('id', planId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Failed to delete subscription plan:", e);
    return false;
  }
};

export const grantFreePremiumAccess = async (email: string, tier: string, expiresAt: string): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Database connection failed' };
  try {
    const cleanEmail = email.toLowerCase().trim();
    // 1. Fetch user by email
    const { data: user, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
      
    if (fetchError) throw fetchError;
    if (!user) return { success: false, error: `No student account found with email "${email}"` };
    
    // 2. Update profile subscription fields
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_expires_at: expiresAt
      })
      .eq('id', user.id);
      
    if (updateError) throw updateError;
    return { success: true };
  } catch (e: any) {
    console.error("Failed to grant free premium access:", e);
    return { success: false, error: e.message || 'Unknown database error' };
  }
};

