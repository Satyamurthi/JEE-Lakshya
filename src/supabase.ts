import { generateJEEQuestions as generateJEEServiceQuestions } from './geminiService';
import { generateJEEQuestions as generateNEETServiceQuestions } from './neetGeminiService';
import { Subject, ExamType } from './types';

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

class LocalSupabaseBuilder {
  private table: string;
  private action: string = 'select';
  private columns: string = '*';
  private payload: any = null;
  private filters: any[] = [];
  private orderCol: string | null = null;
  private orderAsc: boolean = true;
  private limitVal: number | null = null;
  private offsetVal: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private countOption: string | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*', options: { count?: string } = {}) {
    this.action = 'select';
    this.columns = columns;
    if (options.count) {
      this.countOption = options.count;
    }
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.payload = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.payload = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(data: any, options: any = {}) {
    this.action = 'upsert';
    this.payload = data;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, op: 'eq', value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, op: 'neq', value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, op: 'in', value: values });
    return this;
  }

  like(column: string, value: string) {
    this.filters.push({ column, op: 'like', value });
    return this;
  }

  ilike(column: string, value: string) {
    this.filters.push({ column, op: 'ilike', value });
    return this;
  }

  not(column: string, op: string, value: any) {
    this.filters.push({ column, op: 'not', value: { op, value } });
    return this;
  }

  is(column: string, value: any) {
    this.filters.push({ column, op: 'is', value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.orderCol = column;
    this.orderAsc = options.ascending !== false;
    return this;
  }

  limit(value: number) {
    this.limitVal = value;
    return this;
  }

  range(from: number, to: number) {
    this.limitVal = to - from + 1;
    this.offsetVal = from;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const activeStream = localStorage.getItem('active_stream') || 'JEE Main & Advanced';
      const apiUrl = getEnv('API_URL') || getEnv('VITE_API_URL') || 'http://localhost/api';
      const response = await fetch(`${apiUrl}/local_db.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Active-Stream': activeStream
        },
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          columns: this.columns,
          payload: this.payload,
          filters: this.filters,
          orderCol: this.orderCol,
          orderAsc: this.orderAsc,
          limitVal: this.limitVal,
          offsetVal: this.offsetVal,
          isSingle: this.isSingle,
          isMaybeSingle: this.isMaybeSingle,
          countOption: this.countOption
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (onfulfilled) {
        return onfulfilled(result);
      }
      return result;
    } catch (error: any) {
      console.error("Local DB builder request failed:", error);
      const errObj = { data: null, error: { message: error.message || String(error) }, count: 0 };
      if (onfulfilled) {
        return onfulfilled(errObj);
      }
      return errObj;
    }
  }
}

const fakeAuth = {
  signInWithPassword: async (credentials: any) => {
    try {
      const apiUrl = getEnv('API_URL') || getEnv('VITE_API_URL') || 'http://localhost/api';
      const res = await fetch(`${apiUrl}/auth.php?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credentials.email, password: credentials.password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { data: { user: data.user, session: { user: data.user } }, error: null };
      }
      return { data: { user: null, session: null }, error: { message: data.error || "Login failed" } };
    } catch (e: any) {
      return { data: { user: null, session: null }, error: { message: e.message || "Network error during login" } };
    }
  },
  signUp: async (credentials: any) => {
    try {
      const apiUrl = getEnv('API_URL') || getEnv('VITE_API_URL') || 'http://localhost/api';
      const res = await fetch(`${apiUrl}/auth.php?action=signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: credentials.options?.data?.full_name || credentials.email,
          email: credentials.email,
          password: credentials.password
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { data: { user: { id: data.userId || 'temp-local-id', email: credentials.email } }, error: null };
      }
      return { data: { user: null }, error: { message: data.error || "Enrollment failed" } };
    } catch (e: any) {
      return { data: { user: null }, error: { message: e.message || "Network error during signup" } };
    }
  },
  signOut: async () => ({ error: null }),
  getSession: async () => {
    try {
      const lp = localStorage.getItem('user_profile');
      if (lp) {
        const user = JSON.parse(lp);
        return { data: { session: { user } }, error: null };
      }
      return { data: { session: null }, error: null };
    } catch {
      return { data: { session: null }, error: null };
    }
  },
  onAuthStateChange: (callback: any) => {
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  updateUser: async (updates: any) => {
    return { data: { user: null }, error: null };
  },
  resetPasswordForEmail: async (email: string, options: any) => {
    return { data: null, error: { message: "Password reset not supported locally." } };
  }
};

// Proxy wrapper that routes calls to LocalSupabaseBuilder and fakeAuth
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (prop === 'from') {
      return (table: string) => new LocalSupabaseBuilder(table);
    }
    if (prop === 'auth') {
      return fakeAuth;
    }
    return null;
  }
});

export const isSupabaseConfigured = () => false;

// Dynamic client switcher
export const switchSupabaseBackend = (stream: string) => {
  localStorage.setItem('active_stream', stream);
  window.dispatchEvent(new Event('supabase_client_changed'));
};

// Auto-switch to persisted stream backend on load if any
const savedStream = localStorage.getItem('active_stream');
if (savedStream && savedStream !== 'JEE Main & Advanced') {
  switchSupabaseBackend(savedStream);
}

export const generateId = () => {
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

  if (!isSupabaseConfigured()) {
    try {
      const activeStream = localStorage.getItem('active_stream') || 'JEE Main & Advanced';
      const res = await fetch('http://localhost/api/questions.php', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Active-Stream': activeStream
        },
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
  if (!isSupabaseConfigured()) {
    try {
      const activeStream = localStorage.getItem('active_stream') || 'JEE Main & Advanced';
      let url = `http://localhost/api/questions.php?mcqCount=${mcqCount}&numericalCount=${numericalCount}&stream=${encodeURIComponent(activeStream)}`;
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
  if (!isSupabaseConfigured()) {
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
    const { data, error } = await supabase.from('exam_attempts').upsert(attempt).select().single();
    if (error && error.message && error.message.includes("paid")) {
      console.warn("Schema cache missing 'paid' column, retrying upsert without 'paid' field...");
      const attemptCopy = { ...attempt };
      delete attemptCopy.paid;
      return await supabase.from('exam_attempts').upsert(attemptCopy).select().single();
    }
    return { data, error };
  } catch (e: any) {
    return { data: null, error: e };
  }
};

export const createDraftPaidAttempt = async (attemptId: string, userId: string, userName: string, type: string, paperIdOrChapter: string) => {
  const draftAttempt = {
    id: attemptId,
    user_id: userId,
    user_name: userName,
    score: 0,
    total_marks: 0,
    accuracy: 0,
    config: {
      paid: true,
      type: type,
      paperIdOrChapter: paperIdOrChapter,
      isDraft: true
    },
    paid: true,
    submitted_at: new Date().toISOString()
  };
  try {
    const { data, error } = await supabase.from('exam_attempts').upsert(draftAttempt).select().single();
    if (error && error.message && error.message.includes("paid")) {
      const attemptCopy = { ...draftAttempt };
      delete attemptCopy.paid;
      return await supabase.from('exam_attempts').upsert(attemptCopy).select().single();
    }
    return { data, error };
  } catch (e: any) {
    return { data: null, error: e };
  }
};

export const getUserExamAttempts = async (userId: string) => {
  if (!isSupabaseConfigured()) {
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
    try {
      const { data, error } = await supabase.from('daily_attempts').select('*').eq('user_id', userId).order('submitted_at', { ascending: false });
      if (error) return [];
      return data;
    } catch (e) {
      return [];
    }
};

export const getAllProfiles = async () => {
  try {
    const response = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    return response;
  } catch (e: any) {
    return { data: [], error: e };
  }
};

export const getProfile = async (userId: string) => {
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
  try {
    const { date, ...validAttempt } = attempt || {};
    const { data, error } = await supabase.from('daily_attempts').upsert(validAttempt, { onConflict: 'user_id, challenge_id' }).select().single();
    return { data, error };
  } catch (e) {
    return { data: null, error: e };
  }
};

export const getUserDailyAttempt = async (userId: string, date: string) => {
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
  try {
    const { data: dailyPaid } = await supabase
      .from('daily_attempts')
      .select('score')
      .eq('paid', true);

    let examCount = 0;
    try {
      const { data: examPaid } = await supabase
        .from('exam_attempts')
        .select('paid, config');
      if (Array.isArray(examPaid)) {
        examCount = examPaid.filter((item: any) => {
          if (item.paid === true) return true;
          if (item.config && typeof item.config === 'object') {
            return item.config.paid === true;
          }
          try {
            if (typeof item.config === 'string') {
              const parsed = JSON.parse(item.config);
              return parsed.paid === true;
            }
          } catch {}
          return false;
        }).length;
      }
    } catch (e) {
      console.warn("Table exam_attempts does not support paid column directly, trying config fallback:", e);
      try {
        const { data: examPaidOnlyConfig } = await supabase
          .from('exam_attempts')
          .select('config');
        if (Array.isArray(examPaidOnlyConfig)) {
          examCount = examPaidOnlyConfig.filter((item: any) => {
            if (item.config && typeof item.config === 'object') {
              return item.config.paid === true;
            }
            try {
              if (typeof item.config === 'string') {
                const parsed = JSON.parse(item.config);
                return parsed.paid === true;
              }
            } catch {}
            return false;
          }).length;
        }
      } catch (innerErr) {
        console.error("Config fallback fetch failed:", innerErr);
      }
    }

    const dailyCount = Array.isArray(dailyPaid) ? dailyPaid.length : 0;
    return (dailyCount + examCount) * 10;
  } catch (e) {
    return 0;
  }
};

export const getApprovedAdmins = async () => {
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

export const updateAdminDetails = async (
  adminId: string, 
  full_name: string, 
  email: string, 
  limit: number, 
  password?: string,
  subscription_expires_at?: string | null
) => {
  try {
    const updates: any = { full_name, email: email.toLowerCase().trim(), admin_max_students: limit };
    if (password && password.trim() !== '') {
      updates.password = password;
    }
    if (subscription_expires_at !== undefined) {
      updates.subscription_expires_at = subscription_expires_at;
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', adminId);
    if (error) return error.message;
    return null;
  } catch (e: any) {
    return e.message || "Error updating admin credentials";
  }
};

export const toggleAdminModuleAccess = async (adminId: string, currentAccess: boolean) => {
  try {
    const newPermission = !currentAccess;
    await supabase.from('profiles').update({ super_admin_permission: newPermission }).eq('id', adminId);
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
  try {
    const hasAny = perms.can_access_daily || perms.can_access_full_exam || perms.can_access_practice;
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
  try {
    try {
      await supabase.from('daily_challenges').delete().eq('admin_id', adminId);
    } catch (dcErr) {
      console.warn("Challenge cleanup warning:", dcErr);
    }

    const { error: studentErr } = await supabase.from('profiles').delete().eq('admin_id', adminId);
    if (studentErr) console.warn("Student cascade delete warning:", studentErr);

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
  if (!isSupabaseConfigured()) {
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
  if (!isSupabaseConfigured()) return null;
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
  if (isDev || useLocalServer) {
    const apiUrl = getEnv('API_URL') || getEnv('VITE_API_URL') || 'http://localhost/api';
    return `${apiUrl}/${endpoint}.php`;
  }
  return `/.netlify/functions/${endpoint}`;
};

export const getQuestionsCountFromDB = async (): Promise<number> => {
  try {
    const { count, error } = await supabase.from('questions').select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
};

export const seedMassiveQuestionsToDB = async (streamName: string = 'JEE'): Promise<{ success: boolean, count: number, error?: string }> => {
  const isNeet = streamName.toLowerCase().includes('neet');
  
  try {
    // 1. Fetch server API keys from profiles where gemini_api_key is stored
    let apiKeys: string[] = [];
    try {
      const { data: dbProfiles } = await supabase.from('profiles').select('gemini_api_key').not('gemini_api_key', 'is', null);
      if (dbProfiles) {
        apiKeys = dbProfiles.map(p => p.gemini_api_key).filter(k => k && k.trim() !== '');
      }
    } catch (fetchErr) {
      console.warn("[Seeder] Failed to fetch server API keys, falling back to local:", fetchErr);
    }
    
    // Fallback to local storage or env key if none found on server
    if (apiKeys.length === 0) {
      const localKey = typeof window !== 'undefined' ? localStorage.getItem('user_gemini_api_key') : '';
      const envKey = getEnv('GEMINI_API_KEY') || getEnv('VITE_GEMINI_API_KEY');
      const fallback = localKey || envKey;
      if (fallback) apiKeys.push(fallback);
    }
    
    if (apiKeys.length === 0) {
      return { success: false, count: 0, error: "AI Generation Failed: Gemini API Key is not configured on server or client." };
    }

    // 2. Prepare the list of tasks (each task generates exactly 1 question)
    interface GenTask {
      subject: Subject;
      type: 'MCQ' | 'Numerical';
    }
    const tasks: GenTask[] = [];
    if (isNeet) {
      const subjects = [Subject.Physics, Subject.Chemistry, Subject.Botany, Subject.Zoology];
      subjects.forEach(sub => {
        for (let i = 0; i < 45; i++) {
          tasks.push({ subject: sub, type: 'MCQ' });
        }
      });
    } else {
      const subjects = [Subject.Physics, Subject.Chemistry, Subject.Mathematics];
      subjects.forEach(sub => {
        for (let i = 0; i < 20; i++) {
          tasks.push({ subject: sub, type: 'MCQ' });
        }
        for (let i = 0; i < 10; i++) {
          tasks.push({ subject: sub, type: 'Numerical' });
        }
      });
    }

    let successCount = 0;
    let apiKeyIndex = 0;
    
    console.log(`[Seeder] Starting sequential generation of ${tasks.length} questions strictly via Gemini API...`);
    
    // 3. Loop sequentially and generate 1 question at a time using round-robin keys
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const currentApiKey = apiKeys[apiKeyIndex % apiKeys.length];
      apiKeyIndex++;
      
      console.log(`[Seeder] [Question ${i + 1}/${tasks.length}] Generating 1 ${task.type} question for ${task.subject} using API Key index ${apiKeyIndex % apiKeys.length}...`);
      
      try {
        let generated: any[] = [];
        if (isNeet) {
          generated = await generateNEETServiceQuestions(
            task.subject,
            1,
            ExamType.NEET,
            [],
            'Medium',
            [],
            { mcq: 1, numerical: 0 },
            currentApiKey
          );
        } else {
          generated = await generateJEEServiceQuestions(
            task.subject,
            1,
            ExamType.Main,
            [],
            'Hard',
            [],
            { mcq: task.type === 'MCQ' ? 1 : 0, numerical: task.type === 'Numerical' ? 1 : 0 },
            currentApiKey
          );
        }
        
        if (generated && generated.length > 0) {
          const q = generated[0];
          const isMcq = q.type === 'MCQ' || (q.options && Object.keys(q.options).length >= 2);
          const formatted = {
            subject: q.subject,
            chapter: q.chapter || 'General Concepts',
            type: isMcq ? 'MCQ' : 'Numerical',
            difficulty: q.difficulty || 'Medium',
            statement: q.statement,
            options: isMcq ? (q.options || {}) : {},
            correctAnswer: String(q.correctAnswer),
            solution: q.solution || q.explanation || 'Detailed step-by-step solution.',
            explanation: q.explanation || q.solution || 'Detailed explanation.',
            concept: q.concept || q.chapter || 'General Concepts',
            markingScheme: q.markingScheme || { positive: 4, negative: isMcq ? 1 : 0 }
          };
          
          // Immediately upload/upsert each question to the database
          const { error } = await supabase.from('questions').upsert([formatted], { onConflict: 'statement' });
          if (error) {
            // Fallback direct insert
            const { error: insErr } = await supabase.from('questions').insert([formatted]);
            if (insErr) {
              console.warn(`[Seeder] Database upload failed for question ${i + 1}:`, insErr.message);
            } else {
              successCount++;
              console.log(`[Seeder] Seeded ${successCount}/${tasks.length} successfully.`);
            }
          } else {
            successCount++;
            console.log(`[Seeder] Seeded ${successCount}/${tasks.length} successfully.`);
          }
        } else {
          console.warn(`[Seeder] Question ${i + 1} generation returned 0 valid questions.`);
        }
      } catch (genErr: any) {
        console.error(`[Seeder] Error generating question ${i + 1}:`, genErr.message || genErr);
      }
      
      // Dynamic delay based on available keys count to stay safely below Gemini's 15 RPM rate limit per key
      const dynamicDelay = apiKeys.length === 1 ? 4200 : (apiKeys.length === 2 ? 2200 : 1500);
      await new Promise(r => setTimeout(r, dynamicDelay));
    }
    
    return { success: true, count: successCount };
    
  } catch (e: any) {
    console.error("[Seeder] Seeding error:", e);
    return { success: false, count: 0, error: e.message || "Error generating or seeding questions from Gemini" };
  }
};

export const getQuestionsCountAddedToday = async (): Promise<number> => {
  if (!isSupabaseConfigured()) return 0;
  try {
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const { count, error } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
};

export const runAutomaticDailyQuestionSeeding = async (streamName: string = 'JEE'): Promise<{ success: boolean, count: number, error?: string }> => {
  if (!isSupabaseConfigured()) return { success: false, count: 0, error: "Supabase not configured." };
  
  try {
    const countToday = await getQuestionsCountAddedToday();
    const limit = 100;
    if (countToday >= limit) {
      console.log(`[AutoSeeder] Daily limit of ${limit} questions already reached today (${countToday} seeded). Skipping.`);
      return { success: true, count: 0 };
    }
    
    const remaining = limit - countToday;
    console.log(`[AutoSeeder] Starting automatic daily question seeding for ${streamName}. Remaining to seed today: ${remaining}`);
    
    // Fetch server API keys
    let apiKeys: string[] = [];
    const { data: dbProfiles } = await supabase.from('profiles').select('gemini_api_key').not('gemini_api_key', 'is', null);
    if (dbProfiles) {
      apiKeys = dbProfiles.map(p => p.gemini_api_key).filter(k => k && k.trim() !== '');
    }
    
    if (apiKeys.length === 0) {
      const localKey = typeof window !== 'undefined' ? localStorage.getItem('user_gemini_api_key') : '';
      const envKey = getEnv('GEMINI_API_KEY') || getEnv('VITE_GEMINI_API_KEY');
      const fallback = localKey || envKey;
      if (fallback) apiKeys.push(fallback);
    }
    
    if (apiKeys.length === 0) {
      return { success: false, count: 0, error: "No Gemini API keys found on server or client." };
    }
    
    const isNeet = streamName.toLowerCase().includes('neet');
    let successCount = 0;
    let apiKeyIndex = 0;
    
    const subjects = isNeet 
      ? [Subject.Physics, Subject.Chemistry, Subject.Botany, Subject.Zoology]
      : [Subject.Physics, Subject.Chemistry, Subject.Mathematics];
      
    for (let i = 0; i < remaining; i++) {
      const currentApiKey = apiKeys[apiKeyIndex % apiKeys.length];
      apiKeyIndex++;
      
      const sub = subjects[i % subjects.length];
      const type = isNeet ? 'MCQ' : (i % 2 === 0 ? 'MCQ' : 'Numerical');
      
      try {
        let generated: any[] = [];
        if (isNeet) {
          generated = await generateNEETServiceQuestions(
            sub,
            1,
            ExamType.NEET,
            [],
            'Medium',
            [],
            { mcq: 1, numerical: 0 },
            currentApiKey
          );
        } else {
          generated = await generateJEEServiceQuestions(
            sub,
            1,
            ExamType.Main,
            [],
            'Hard',
            [],
            { mcq: type === 'MCQ' ? 1 : 0, numerical: type === 'Numerical' ? 1 : 0 },
            currentApiKey
          );
        }
        
        if (generated && generated.length > 0) {
          const q = generated[0];
          const isMcq = q.type === 'MCQ' || (q.options && Object.keys(q.options).length >= 2);
          const formatted = {
            subject: q.subject,
            chapter: q.chapter || 'General Concepts',
            type: isMcq ? 'MCQ' : 'Numerical',
            difficulty: q.difficulty || 'Medium',
            statement: q.statement,
            options: isMcq ? (q.options || {}) : {},
            correctAnswer: String(q.correctAnswer),
            solution: q.solution || q.explanation || 'Detailed step-by-step solution.',
            explanation: q.explanation || q.solution || 'Detailed explanation.',
            concept: q.concept || q.chapter || 'General Concepts',
            markingScheme: q.markingScheme || { positive: 4, negative: isMcq ? 1 : 0 }
          };
          
          const { error } = await supabase.from('questions').upsert([formatted], { onConflict: 'statement' });
          if (!error) {
            successCount++;
            console.log(`[AutoSeeder] Successfully auto-seeded question ${successCount}/${remaining} (${sub} - ${type}).`);
          }
        }
      } catch (err: any) {
        console.error(`[AutoSeeder] Failed to generate question ${i + 1}:`, err.message || err);
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
    
    return { success: true, count: successCount };
  } catch (e: any) {
    return { success: false, count: 0, error: e.message };
  }
};


export const getAllQuestionsFromDB = async (subjectFilter?: string, maxRecords: number = 15000): Promise<any[]> => {
  let allData: any[] = [];
  try {
    const { data, error } = await supabase.from('questions').select('*');
    if (!error && data && data.length > 0) {
      allData = data;
      if (subjectFilter && subjectFilter !== 'All') {
        allData = allData.filter((q: any) => q.subject && q.subject.toLowerCase().includes(subjectFilter.toLowerCase()));
      }
      if (allData.length > maxRecords) {
        allData = allData.slice(0, maxRecords);
      }
    }
  } catch (e) {
    console.warn("Local DB fetch all questions failed, falling back:", e);
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
  const { error } = await supabase.from('subscription_plans').upsert(plan);
  if (error) {
    console.error("Failed to save subscription plan:", error);
    throw error;
  }
  return true;
};

export const deleteSubscriptionPlan = async (planId: string): Promise<boolean> => {
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

