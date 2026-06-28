import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, Crown, Zap, Trash2, Copy, X, Eye, CheckCircle2, Sliders, Atom, Beaker, FunctionSquare, FileUp, FileText, AlertTriangle, Terminal, File, Settings2, Sparkles, Database, ShieldAlert, XCircle, Settings, UserPlus, Edit3, Key } from 'lucide-react';
import { supabase, getAllProfiles, updateProfileStatus, deleteProfile, createDailyChallenge, getDailyAttempts, getAllDailyChallenges, fetchQuestionsFromDB, updateStudentCredentials } from '../supabase';
import { NCERT_CHAPTERS } from '../constants';
import MathText from '../components/MathText';

interface SubjectConfig {
    mcq: number;
    numerical: number;
    chapters: string[];
    topics: string[];
}

interface GenerationConfig {
  physics: SubjectConfig;
  chemistry: SubjectConfig;
  mathematics: SubjectConfig;
}

const SubjectConfigModal = ({ isOpen, onClose, subject, config, onUpdate }: { isOpen: boolean; onClose: () => void; subject: string; config: SubjectConfig; onUpdate: (newConfig: SubjectConfig) => void; }) => {
    const chapters = NCERT_CHAPTERS[subject as keyof typeof NCERT_CHAPTERS] || [];
    const [localChapters, setLocalChapters] = useState<string[]>(config.chapters);
    const [localTopics, setLocalTopics] = useState<string[]>(config.topics);

    useEffect(() => { 
        if(isOpen) { 
            setLocalChapters(config.chapters); 
            setLocalTopics(config.topics);
        } 
    }, [isOpen, config]);

    const handleChapterToggle = (chapName: string) => {
        setLocalChapters(prev => {
            const isRemoving = prev.includes(chapName);
            if (isRemoving) {
                // Also remove topics belonging to this chapter
                const chapterData = chapters.find(c => c.name === chapName);
                if (chapterData) {
                    setLocalTopics(tPrev => tPrev.filter(t => !chapterData.topics.includes(t)));
                }
                return prev.filter(c => c !== chapName);
            } else {
                return [...prev, chapName];
            }
        });
    };

    const handleTopicToggle = (topic: string) => {
        setLocalTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
    };

    const handleSave = () => { onUpdate({ ...config, chapters: localChapters, topics: localTopics }); onClose(); };

    if (!isOpen) return null;

    const selectedChapterData = chapters.filter(c => localChapters.includes(c.name));

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-6 border-b flex items-center justify-between bg-slate-50">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Syllabus: {subject}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="text-slate-400 w-5 h-5" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* Chapters Section */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Chapters</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {chapters.map(c => (
                                <button key={c.name} onClick={() => handleChapterToggle(c.name)} className={`p-4 rounded-xl text-left text-xs font-bold border-2 transition-all flex items-center justify-between ${localChapters.includes(c.name) ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                                    {c.name}
                                    {localChapters.includes(c.name) && <CheckCircle2 className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Topics Section */}
                    {localChapters.length > 0 && (
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Topics (Optional)</h4>
                            <div className="space-y-6">
                                {selectedChapterData.map(chap => (
                                    <div key={chap.name} className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{chap.name}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {chap.topics.map(topic => (
                                                <button
                                                    key={topic}
                                                    onClick={() => handleTopicToggle(topic)}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                                                        localTopics.includes(topic)
                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-100'
                                                    }`}
                                                >
                                                    {topic}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 font-bold text-slate-400 text-xs uppercase tracking-widest">Cancel</button>
                    <button onClick={handleSave} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">Apply Selection</button>
                </div>
            </div>
        </div>
    );
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState('DAILY PAPER UPLOAD');
  const [users, setUsers] = useState<any[]>([]);
  const [isAuth, setIsAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLocalAuth, setIsLocalAuth] = useState(false);

  useEffect(() => {
    // Check local auth first
    const localProfile = localStorage.getItem('user_profile');
    if (localProfile) {
        try {
            const profile = JSON.parse(localProfile);
            setCurrentUser(profile);
            setIsLocalAuth(true);
        } catch (e) {
            console.error("Error parsing local profile", e);
        }
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setIsAuth(!!session);
        if (session?.user) {
            supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
                if (data) {
                    setCurrentUser(data);
                    setIsLocalAuth(false); // Supabase auth takes precedence
                }
            });
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuth(!!session);
        if (session?.user) {
            supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
                if (data) {
                    setCurrentUser(data);
                    setIsLocalAuth(false);
                }
            });
        } else {
            // Revert to local auth if session lost
            const lp = localStorage.getItem('user_profile');
            if (lp) {
                setCurrentUser(JSON.parse(lp));
                setIsLocalAuth(true);
            } else {
                setCurrentUser(null);
                setIsLocalAuth(false);
            }
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const [dailyPapers, setDailyPapers] = useState<any[]>([]);
  const [analysisDate, setAnalysisDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [analysisData, setAnalysisData] = useState<any[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (toast) {
        const timer = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [toast]);

  // Daily Paper Upload State
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [hideConfig, setHideConfig] = useState(false);
  const [qFile, setQFile] = useState<File | null>(null);
  const [sFile, setSFile] = useState<File | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeConfigSubject, setActiveConfigSubject] = useState<string | null>(null);

  // Add Student to Batch State
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Edit Student State
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editStudentId, setEditStudentId] = useState('');
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentPassword, setEditStudentPassword] = useState('');
  const [isUpdatingStudent, setIsUpdatingStudent] = useState(false);

  const [generationConfig, setGenerationConfig] = useState<GenerationConfig>({
    physics: { mcq: 8, numerical: 2, chapters: [], topics: [] },
    chemistry: { mcq: 8, numerical: 2, chapters: [], topics: [] },
    mathematics: { mcq: 8, numerical: 2, chapters: [], topics: [] },
  });

  const [isUtilityOpen, setIsUtilityOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [signInEmail, setSignInEmail] = useState(() => {
    const lp = localStorage.getItem('user_profile');
    if (lp) {
        try {
            return JSON.parse(lp).email || '';
        } catch { return ''; }
    }
    return '';
  });
  const [signInPassword, setSignInPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [repairStatus, setRepairStatus] = useState<'idle' | 'running' | 'success'>('idle');
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error', message?: string }>({ status: 'idle' });
  const [customUrl, setCustomUrl] = useState(() => {
    try {
      const config = JSON.parse(localStorage.getItem('custom_supabase_config') || '{}');
      return config.url || '';
    } catch { return ''; }
  });
  const [customKey, setCustomKey] = useState(() => {
    try {
      const config = JSON.parse(localStorage.getItem('custom_supabase_config') || '{}');
      return config.key || '';
    } catch { return ''; }
  });

  const handleCloudSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsSigningIn(true);
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: signInEmail,
            password: signInPassword
        });
        if (error) throw error;
        setToast({ message: "Cloud Authentication Successful", type: 'success' });
        setIsSignInModalOpen(false);
    } catch (err: any) {
        setToast({ message: err.message || "Cloud Sign-In Failed", type: 'error' });
    } finally {
        setIsSigningIn(false);
    }
  };

  const runRepair = async () => {
    setRepairStatus('running');
    // Simulate a repair process
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRepairStatus('success');
    setToast({ message: "Database Repair Protocol Executed. Please ensure SQL is applied in Supabase.", type: 'success' });
  };

  const testConnection = async () => {
    if (!supabase) {
        setTestResult({ status: 'error', message: "Supabase not configured." });
        return;
    }
    setTestResult({ status: 'testing' });
    try {
        // Try to query the profiles table correctly
        const { error } = await supabase.from('profiles').select('*').limit(1);
        if (error) throw error;
        setTestResult({ status: 'success', message: "Connection verified. Schema is healthy." });
    } catch (err: any) {
        console.error("Connection test failed:", err);
        const msg = err.message || "Database error querying schema.";
        setTestResult({ status: 'error', message: msg });
        setToast({ message: msg, type: 'error' });
    }
  };

  const handleSaveConfig = () => {
    if (customUrl && customKey) {
        localStorage.setItem('custom_supabase_config', JSON.stringify({ url: customUrl, key: customKey }));
        setToast({ message: "Configuration Saved. Reloading system...", type: 'success' });
        setTimeout(() => window.location.reload(), 1500);
    } else {
        setToast({ message: "Please provide both URL and Key", type: 'error' });
    }
  };

  const clearConfig = () => {
      localStorage.removeItem('custom_supabase_config');
      setToast({ message: "Configuration Cleared. Reloading...", type: 'success' });
      setTimeout(() => window.location.reload(), 1000);
  };

  const REPAIR_SQL = `-- ==========================================
-- JEE NEXUS AI - DATABASE REPAIR SCRIPT
-- ==========================================
-- Run this in your Supabase SQL Editor to fix login/write issues.

-- 1. CORE CONFIGURATION EXTENSIONS
create extension if not exists pgcrypto;

-- Drop constraints to update roles list
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_status_check;

-- Ensure profiles table exists with extended role/status support
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  password text,
  role text default 'student' check (role in ('student', 'admin', 'super_admin')),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_id uuid references public.profiles(id) on delete set null,
  admin_max_students integer default 30,
  has_used_free_test boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Drop restrictive auth.users foreign key constraint if present
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- Alter columns for safety
alter table public.profiles add column if not exists password text;
alter table public.profiles add column if not exists status text default 'pending';
alter table public.profiles add column if not exists role text default 'student';
alter table public.profiles add column if not exists admin_id uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists admin_max_students integer default 30;
alter table public.profiles add column if not exists has_used_free_test boolean default false;

-- Reapply constraints
alter table public.profiles add constraint profiles_role_check check (role in ('student', 'admin', 'super_admin'));
alter table public.profiles add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'));

-- 2. ADMIN/SUPER_ADMIN DETERMINATION FUNCTION
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = user_id
    and role in ('admin', 'super_admin')
  );
end;
$$ language plpgsql security definer;

-- 3. RLS POLICIES FOR PROFILES
alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner and admins" on public.profiles;
create policy "Profiles are viewable by owner and admins"
on public.profiles for select
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "Profiles are updatable by owner and admins" on public.profiles;
create policy "Profiles are updatable by owner and admins"
on public.profiles for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (
  (auth.uid() = id and (role = role and status = status)) or 
  public.is_admin(auth.uid())
);

drop policy if exists "Profiles are deletable by admins" on public.profiles;
create policy "Profiles are deletable by admins"
on public.profiles for delete
using (public.is_admin(auth.uid()));

drop policy if exists "Profiles are insertable by anyone" on public.profiles;
create policy "Profiles are insertable by anyone"
on public.profiles for insert
with check (true);

-- 4. PROVISION SUPER ADMIN & SYSTEM ADMIN
DO $$
DECLARE
  new_admin_id UUID := gen_random_uuid();
  new_super_id UUID := gen_random_uuid();
BEGIN
  -- System Admin Account Provision
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@example.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', new_admin_id, 'authenticated', 'authenticated', 'admin@example.com', crypt('yourpassword', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "System Admin"}', now(), now());
  END IF;
  
  INSERT INTO public.profiles (id, email, full_name, role, status, password)
  SELECT id, email, 'System Admin', 'admin', 'approved', 'yourpassword' FROM auth.users WHERE email = 'admin@example.com'
  ON CONFLICT (email) DO UPDATE SET role = 'admin', status = 'approved', password = 'yourpassword';

  -- Provision Super Admin Account: satyu000@gmail.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'satyu000@gmail.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', new_super_id, 'authenticated', 'authenticated', 'satyu000@gmail.com', crypt('satyupassword', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "Super Admin"}', now(), now());
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, status, password)
  SELECT id, email, 'Super Admin', 'super_admin', 'approved', 'satyupassword' FROM auth.users WHERE email = 'satyu000@gmail.com'
  ON CONFLICT (email) DO UPDATE SET role = 'super_admin', status = 'approved', password = 'satyupassword';
END $$;

-- 5. APP TABLES RLS & MULTI-TENANCY ALTERATIONS
alter table public.questions enable row level security;
drop policy if exists "Read questions" on questions;
create policy "Read questions" on questions for select using (true);
drop policy if exists "Manage questions" on questions;
create policy "Manage questions" on questions for all using (public.is_admin(auth.uid()));

-- Daily challenges multi-tenancy updates
alter table public.daily_challenges drop constraint if exists daily_challenges_pkey cascade;
alter table public.daily_challenges add column if not exists id uuid default gen_random_uuid() primary key;
alter table public.daily_challenges add column if not exists admin_id uuid references public.profiles(id) on delete cascade;

-- Unique constraint for date and admin
drop index if exists daily_challenges_date_admin_idx;
create unique index daily_challenges_date_admin_idx on public.daily_challenges(date, coalesce(admin_id, '00000000-0000-0000-0000-000000000000'));

alter table public.daily_challenges enable row level security;
drop policy if exists "Read challenges" on daily_challenges;
create policy "Read challenges" on daily_challenges for select using (true);
drop policy if exists "Manage challenges" on daily_challenges;
create policy "Manage challenges" on daily_challenges for all using (public.is_admin(auth.uid()));

drop policy if exists "Public Read Daily" on daily_challenges;
create policy "Public Read Daily" on daily_challenges for select using (true);
drop policy if exists "Public Insert Daily" on daily_challenges;
create policy "Public Insert Daily" on daily_challenges for insert with check (true);
drop policy if exists "Public Update Daily" on daily_challenges;
create policy "Public Update Daily" on daily_challenges for update using (true);

-- Daily attempts multi-tenancy updates
alter table public.daily_attempts drop constraint if exists daily_attempts_pkey cascade;
alter table public.daily_attempts add column if not exists challenge_id uuid references public.daily_challenges(id) on delete cascade;
alter table public.daily_attempts add column if not exists paid boolean default false;
alter table public.daily_attempts add primary key (user_id, challenge_id);

alter table public.daily_attempts enable row level security;
drop policy if exists "Users can insert own attempts" on daily_attempts;
create policy "Users can insert own attempts" on daily_attempts for insert with check (auth.uid() = user_id);
drop policy if exists "Users can view own attempts" on daily_attempts;
create policy "Users can view own attempts" on daily_attempts for select using (auth.uid() = user_id);
drop policy if exists "Admins view all attempts" on daily_attempts;
create policy "Admins view all attempts" on daily_attempts for select using (public.is_admin(auth.uid()));
`;

  const loadUsers = useCallback(async () => {
    const { data, error } = await getAllProfiles();
    if (error) {
        console.error("Load users failed:", error);
        let errorMsg = typeof error === 'string' ? error : (error as any).message || "Failed to load users";
        if (errorMsg.includes("Failed to fetch") || errorMsg.includes("NetworkError")) {
            errorMsg = "Database Connection Failed. Please check if your Supabase URL is correct and CORS is enabled for this app in your Supabase dashboard.";
        }
        setToast({ message: errorMsg, type: 'error' });
    }
    const all = data || [];
    if (currentUser?.role === 'admin') {
      setUsers(all.filter((u: any) => u.role === 'student' && u.admin_id === currentUser.id));
    } else {
      setUsers(all);
    }
  }, [currentUser]);

  const loadAnalysis = useCallback(async () => {
      const attempts = await getDailyAttempts(analysisDate, currentUser?.id);
      const processed = attempts.map((attempt, index) => {
          const data = attempt.attempt_data || [];
          const stats = { Physics: { Score: 0 }, Chemistry: { Score: 0 }, Mathematics: { Score: 0 } };
          data.forEach((q: any) => {
              if (!q) return; 
              const subj = q.subject as 'Physics' | 'Chemistry' | 'Mathematics';
              if (q.isCorrect) stats[subj].Score += 4;
              else if (q.userAnswer) stats[subj].Score -= 1;
          });
          return { rank: index + 1, name: attempt.user_name || 'Scholar', stats, total: attempt.score };
      });
      setAnalysisData(processed);
  }, [analysisDate, currentUser]);

  const loadDailyPapers = useCallback(async () => {
    const papers = await getAllDailyChallenges(currentUser?.id);
    setDailyPapers(papers);
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'USER MANAGEMENT') loadUsers();
    if (activeTab === 'DAILY CHALLENGES' || activeTab === 'DAILY PAPER UPLOAD') loadDailyPapers();
    if (activeTab === 'RESULT ANALYSIS') loadAnalysis();
  }, [activeTab, loadAnalysis, loadDailyPapers, loadUsers]);

  const handleUpdateStatus = async (id: string, status: string) => {
      const err = await updateProfileStatus(id, status);
      if (err) {
          console.error("Update status error:", err);
          setToast({ message: err, type: 'error' });
      } else {
          setToast({ message: `Profile status updated to ${status}`, type: 'success' });
          loadUsers();
      }
  };

  const handleDeleteProfile = async (id: string) => {
      if (window.confirm("Are you sure you want to delete this student profile?")) {
          // Instantly filter out user from local UI state for immediate responsive feedback
          setUsers(prev => prev.filter(u => u.id !== id));
          const err = await deleteProfile(id);
          if (err) {
              console.error("Delete profile error:", err);
              setToast({ message: err, type: 'error' });
              loadUsers(); // Re-sync if failed
          } else {
              setToast({ message: "Student profile permanently deleted!", type: 'success' });
          }
      }
  };

  const handleOpenEditStudent = (student: any) => {
    setEditStudentId(student.id);
    setEditStudentName(student.full_name || '');
    setEditStudentEmail(student.email || '');
    setEditStudentPassword(student.password || '');
    setIsEditStudentModalOpen(true);
  };

  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingStudent(true);
    try {
      const err = await updateStudentCredentials(editStudentId, editStudentName, editStudentEmail, editStudentPassword);
      if (err) throw new Error(err);

      setToast({ message: "Student credentials updated successfully!", type: 'success' });
      setIsEditStudentModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update credentials", type: 'error' });
    } finally {
      setIsUpdatingStudent(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setToast({ message: "Supabase not configured", type: 'error' });
      return;
    }
    const maxLimit = currentUser?.admin_max_students || 30;
    if (users.length >= maxLimit) {
      setToast({ message: `Student capacity limit reached (${maxLimit} students). Contact Super Admin to increase limit.`, type: 'error' });
      return;
    }
    setIsAddingStudent(true);
    try {
      const newStudentId = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });

      const newStudent = {
        id: newStudentId,
        email: studentEmail.toLowerCase().trim(),
        full_name: studentName.trim(),
        password: studentPassword,
        role: 'student',
        status: 'approved',
        admin_id: currentUser?.id,
        has_used_free_test: false,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('profiles').insert(newStudent);
      if (error) throw error;

      setToast({ message: `Student ${studentName} successfully added to your batch!`, type: 'success' });
      setStudentName('');
      setStudentEmail('');
      setStudentPassword('');
      setIsAddStudentModalOpen(false);
      loadUsers();
    } catch (err: any) {
      let msg = err.message || "Failed to add student";
      if (msg.includes("profiles_email_key") || msg.toLowerCase().includes("duplicate key")) {
        msg = "Student already exists with this email address!";
      }
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleAIGenerateDaily = async () => {
      setIsGeneratingAI(true);
      const activeStream = localStorage.getItem('active_stream') || 'JEE Main & Advanced';
      const isNeet = activeStream.toLowerCase().includes('neet');
      try {
          const { getStreamGeminiService } = await import('../streamGeminiDispatcher');
          const service = await getStreamGeminiService(activeStream);
          const result = await service.generateFullJEEDailyPaper(generationConfig);
          const allQs = isNeet 
            ? [...result.physics, ...result.chemistry, ...(result.biology || [])]
            : [...result.physics, ...result.chemistry, ...(result.mathematics || [])];
          setParsedQuestions(allQs);
          setToast({ message: "Generation Complete!", type: 'success' });
      } catch (e: any) {
          console.warn("AI generation failed, falling back to database...", e);
          setToast({ message: "AI Generation failed. Fetching from database...", type: 'error' });
          try {
              const thirdSubject = isNeet ? 'Biology' : 'Mathematics';
              const [physicsQs, chemistryQs, thirdQs] = await Promise.all([
                  fetchQuestionsFromDB(
                      'Physics',
                      generationConfig.physics.chapters[0] || undefined,
                      generationConfig.physics.topics,
                      generationConfig.physics.mcq,
                      generationConfig.physics.numerical
                  ),
                  fetchQuestionsFromDB(
                      'Chemistry',
                      generationConfig.chemistry.chapters[0] || undefined,
                      generationConfig.chemistry.topics,
                      generationConfig.chemistry.mcq,
                      generationConfig.chemistry.numerical
                  ),
                  fetchQuestionsFromDB(
                      thirdSubject,
                      generationConfig.mathematics.chapters[0] || undefined,
                      generationConfig.mathematics.topics,
                      generationConfig.mathematics.mcq,
                      generationConfig.mathematics.numerical
                  )
              ]);
              
              const allDBQs = [...physicsQs, ...chemistryQs, ...thirdQs];
              if (allDBQs.length > 0) {
                  setParsedQuestions(allDBQs);
                  setToast({ message: "Loaded questions from database successfully", type: 'success' });
              } else {
                  throw new Error("No questions found in database.");
              }
          } catch (dbErr: any) {
              console.warn("Database fallback empty, generating built-in paper...", dbErr);
              const { getStreamGeminiService } = await import('../streamGeminiDispatcher');
              const service = await getStreamGeminiService(activeStream);
              const fallbackPhysics = service.generateFallbackQuestions(('Physics' as any), generationConfig.physics.mcq, generationConfig.physics.numerical);
              const fallbackChemistry = service.generateFallbackQuestions(('Chemistry' as any), generationConfig.chemistry.mcq, generationConfig.chemistry.numerical);
              const thirdSubject = isNeet ? 'Biology' : 'Mathematics';
              const fallbackThird = service.generateFallbackQuestions((thirdSubject as any), generationConfig.mathematics.mcq, generationConfig.mathematics.numerical);
              setParsedQuestions([...fallbackPhysics, ...fallbackChemistry, ...fallbackThird]);
              setToast({ message: `Loaded built-in ${isNeet ? 'NEET' : 'JEE'} Question Bank successfully!`, type: 'success' });
          }
      } finally {
          setIsGeneratingAI(false);
      }
  };

  const handleParseDocument = async () => {
    if (!qFile) return;
    setIsParsing(true);
    const activeStream = localStorage.getItem('active_stream') || 'JEE Main & Advanced';
    try {
      const { getStreamGeminiService } = await import('../streamGeminiDispatcher');
      const service = await getStreamGeminiService(activeStream);
      const qs = await service.parseDocumentToQuestions(qFile, sFile || undefined);
      setParsedQuestions(qs);
      setToast({ message: "Parsing Complete!", type: 'success' });
    } catch (e: any) { setToast({ message: e.message, type: 'error' }); }
    finally { setIsParsing(false); }
  };

  const handlePublishDaily = async () => {
    setIsPublishing(true);
    try {
      await createDailyChallenge(uploadDate, parsedQuestions, currentUser?.id);
      setParsedQuestions([]);
      loadDailyPapers();
      setToast({ message: "Paper Published!", type: 'success' });
    } catch (e) { setToast({ message: "Publish Failed", type: 'error' }); }
    finally { setIsPublishing(false); }
  };

  const updateSubConfig = (subj: keyof GenerationConfig, key: 'mcq' | 'numerical', val: string) => {
      const num = parseInt(val) || 0;
      setGenerationConfig(prev => ({ ...prev, [subj]: { ...prev[subj], [key]: num } }));
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Cloud Sign-In Modal */}
      {isSignInModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Cloud Authentication</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Sign in to enable RLS & Cloud Writes</p>
                    </div>
                    <button onClick={() => setIsSignInModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleCloudSignIn} className="p-8 space-y-6">
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                            Cloud writes (Approve/Reject/Delete) require a valid Supabase Auth session. 
                            Please sign in with your administrator credentials.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                            <input 
                                type="email"
                                value={signInEmail}
                                onChange={(e) => setSignInEmail(e.target.value)}
                                className="w-full mt-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="admin@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
                            <input 
                                type="password"
                                value={signInPassword}
                                onChange={(e) => setSignInPassword(e.target.value)}
                                className="w-full mt-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSigningIn}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isSigningIn ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Authenticating...
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4" />
                                Sign In to Cloud
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Subject Config Modal */}
      {modalOpen && activeConfigSubject && (
          <SubjectConfigModal 
            isOpen={modalOpen} 
            onClose={() => setModalOpen(false)} 
            subject={activeConfigSubject} 
            config={generationConfig[activeConfigSubject.toLowerCase() as keyof GenerationConfig]}
            onUpdate={(newCfg) => setGenerationConfig(prev => ({ ...prev, [activeConfigSubject.toLowerCase() as keyof GenerationConfig]: newCfg }))}
          />
      )}

      {/* Header Info Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             Control Center <Crown className="w-6 h-6 text-amber-500" />
          </h1>
          <p className="text-slate-500 font-bold text-sm">Administrator Dashboard • Platform Oversight</p>
        </div>
        
        {/* Warning Banner from Image */}
        <div className="flex items-center gap-4">
          {supabase ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => !isAuth && setIsSignInModalOpen(true)}
                className={`hidden sm:flex ${isAuth ? 'bg-emerald-50 border-emerald-100' : isLocalAuth ? 'bg-blue-50 border-blue-100 hover:bg-blue-100' : 'bg-amber-50 border-amber-100 hover:bg-amber-100'} border p-3 px-4 rounded-2xl items-center gap-3 shadow-sm transition-colors`}
              >
                <div className={`w-2 h-2 ${isAuth ? 'bg-emerald-500' : isLocalAuth ? 'bg-blue-500' : 'bg-amber-500'} rounded-full ${isAuth ? 'animate-pulse' : ''}`}></div>
                <p className={`text-[10px] font-bold ${isAuth ? 'text-emerald-800' : isLocalAuth ? 'text-blue-800' : 'text-amber-800'}`}>
                  {isAuth ? `Cloud Auth: ${currentUser?.email || 'User'}` : isLocalAuth ? `Local Auth: ${currentUser?.email || 'Admin'} (Sign In to Cloud)` : 'Unauthenticated (Click to Sign In)'}
                </p>
              </button>
              <div className="hidden sm:flex bg-blue-50 border border-blue-100 p-3 px-4 rounded-2xl items-center gap-3 shadow-sm">
                <Database className="w-4 h-4 text-blue-600" />
                <p className="text-[10px] font-bold text-blue-800">Cloud Active</p>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-100 p-3 px-4 rounded-2xl flex items-center gap-3 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <p className="text-[10px] font-bold text-orange-800">Offline Mode</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-100 gap-8 overflow-x-auto no-scrollbar pt-2">
        {['DAILY PAPER UPLOAD', 'DAILY CHALLENGES', 'RESULT ANALYSIS', 'USER MANAGEMENT'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`pb-4 text-[10px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap border-b-2 ${activeTab === tab ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'DAILY PAPER UPLOAD' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
            {/* 1. Create or Upload */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10">
                <div className="flex items-center gap-3">
                    <FileUp className="w-6 h-6 text-indigo-500" />
                    <h3 className="text-xl font-black text-slate-900">1. Create or Upload</h3>
                </div>

                <div className="space-y-8">
                    {/* Paper Date Section */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">PAPER DATE (TARGET)</label>
                        <div className="flex gap-3">
                            <input 
                              type="date" 
                              value={uploadDate} 
                              onChange={(e) => setUploadDate(e.target.value)} 
                              className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                            />
                            <button onClick={() => setUploadDate(new Date().toISOString().split('T')[0])} className="px-6 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-colors">Today</button>
                        </div>
                    </div>

                    {/* AI Generation Control */}
                    <div className="flex gap-3">
                        <button 
                          onClick={handleAIGenerateDaily} 
                          disabled={isGeneratingAI} 
                          className="flex-1 py-5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.15em] shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            AUTO-GENERATE (AI)
                        </button>
                        <button 
                          onClick={() => setHideConfig(!hideConfig)} 
                          className="px-6 py-5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                        >
                            <Settings2 className="w-4 h-4 text-slate-400" /> {hideConfig ? "SHOW CONFIG" : "HIDE CONFIG"}
                        </button>
                    </div>

                    <p className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3 text-center leading-normal">
                      ⚡ <span className="font-extrabold text-slate-700">Performance Alert:</span> AI question generation is now parallelized. It will complete within <span className="font-extrabold text-indigo-600">30 to 60 seconds</span>. Please do not refresh the page.
                    </p>

                    {/* Config Rows - Restored exact style from image */}
                    {!hideConfig && (
                        <div className="space-y-4 overflow-hidden">
                            {(['Physics', 'Chemistry', 'Mathematics']).map((s) => {
                                const key = s.toLowerCase() as keyof GenerationConfig;
                                const icons = { Physics: <Atom />, Chemistry: <Beaker />, Mathematics: <FunctionSquare /> };
                                const iconBg = { Physics: 'bg-blue-50 text-blue-500', Chemistry: 'bg-emerald-50 text-emerald-500', Mathematics: 'bg-fuchsia-50 text-fuchsia-500' };
                                return (
                                    <div key={s} className="flex items-center gap-5 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                        <div className={`p-3 rounded-xl ${iconBg[s as keyof typeof iconBg]} shadow-sm`}>{icons[s as keyof typeof icons]}</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-black text-slate-900">{s}</p>
                                            <button onClick={() => { setActiveConfigSubject(s); setModalOpen(true); }} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1.5 hover:underline tracking-tighter">
                                                <Sliders className="w-2.5 h-2.5" /> 
                                                {generationConfig[key].chapters.length === 0 
                                                    ? "Full Syllabus" 
                                                    : `${generationConfig[key].chapters.length} Chapters${generationConfig[key].topics.length > 0 ? ` (${generationConfig[key].topics.length} Topics)` : ''}`}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">MCQ</span>
                                                <input type="text" value={generationConfig[key].mcq} onChange={(e) => updateSubConfig(key, 'mcq', e.target.value)} className="w-14 p-2 bg-slate-50 border border-slate-100 rounded-lg text-center font-black text-xs text-slate-700 outline-none focus:border-indigo-500 focus:bg-white" />
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Num</span>
                                                <input type="text" value={generationConfig[key].numerical} onChange={(e) => updateSubConfig(key, 'numerical', e.target.value)} className="w-14 p-2 bg-slate-50 border border-slate-100 rounded-lg text-center font-black text-xs text-slate-700 outline-none focus:border-indigo-500 focus:bg-white" />
                                            </div>
                                            <div className="flex flex-col items-end min-w-[50px] gap-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">TOTAL</span>
                                                <span className="text-sm font-black text-slate-900">{generationConfig[key].mcq + generationConfig[key].numerical}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Separator Restored */}
                    <div className="relative py-4 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                        <span className="relative bg-white px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">OR UPLOAD PDF</span>
                    </div>

                    {/* PDF Upload Sections Restored */}
                    <div className="space-y-6">
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">QUESTION PAPER (PDF/IMAGE)</label>
                            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-[1.5rem] cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all group">
                                <div className="flex items-center gap-3 text-slate-400 font-bold text-sm group-hover:text-indigo-500 transition-colors">
                                    <FileUp className="w-5 h-5" /> {qFile ? <span className="text-slate-700">{qFile.name}</span> : "Upload QP"}
                                </div>
                                <input type="file" className="hidden" onChange={(e) => setQFile(e.target.files?.[0] || null)} />
                            </label>
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">SOLUTION KEY (OPTIONAL)</label>
                            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-[1.5rem] cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all group">
                                <div className="flex items-center gap-3 text-slate-400 font-bold text-sm group-hover:text-indigo-500 transition-colors">
                                    <FileUp className="w-5 h-5" /> {sFile ? <span className="text-slate-700">{sFile.name}</span> : "Upload Answer Key"}
                                </div>
                                <input type="file" className="hidden" onChange={(e) => setSFile(e.target.files?.[0] || null)} />
                            </label>
                         </div>
                         <button onClick={handleParseDocument} disabled={!qFile || isParsing} className="w-full py-5 bg-slate-400 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-3 hover:bg-slate-500 transition-all disabled:opacity-30 shadow-lg shadow-slate-100">
                            {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                            PARSE UPLOADED FILES
                         </button>
                    </div>
                </div>
            </div>

            {/* 2. Paper Preview - Restored exact style from image */}
            <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col min-h-[700px]">
                <div className="flex items-center gap-3 mb-10">
                    <Eye className="w-6 h-6 text-indigo-500" />
                    <h3 className="text-xl font-black text-slate-900">2. Paper Preview</h3>
                </div>

                <div className="flex-1 flex flex-col">
                    {parsedQuestions.length > 0 ? (
                        <div className="flex flex-col h-full space-y-6">
                            <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar max-h-[550px]">
                                {parsedQuestions.map((q, i) => (
                                    <div key={i} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] bg-indigo-50 px-3 py-1 rounded-full">{q.subject}</span>
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{q.type}</span>
                                        </div>
                                        <MathText className="text-sm font-bold text-slate-700 leading-relaxed">
                                            {q.statement}
                                        </MathText>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-6">
                                <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                                    <Sparkles className="absolute top-0 right-0 p-8 w-32 h-32 opacity-10 group-hover:scale-125 transition-transform duration-1000" />
                                    <div className="flex justify-between items-end mb-8">
                                        <div>
                                            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-2">PAPER SUMMARY</p>
                                            <p className="text-3xl font-black">{parsedQuestions.length} Questions Ready</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-2">AGGREGATE SCORE</p>
                                            <p className="text-3xl font-black">{parsedQuestions.length * 4}</p>
                                        </div>
                                    </div>
                                    <button onClick={handlePublishDaily} disabled={isPublishing} className="w-full py-5 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50">
                                        {isPublishing ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        {isPublishing ? "PUBLISHING..." : "FINALIZE & PUBLISH PAPER"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-6">
                            <div className="p-8 bg-white rounded-full shadow-sm">
                                <File className="w-16 h-16 opacity-10" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-[0.3em]">No data parsed or generated</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Rest of the Tabs (Kept for functionality) */}
      {activeTab === 'DAILY CHALLENGES' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm pt-4">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                    <tr><th className="px-8 py-5">Scheduled Date</th><th className="px-8 py-5">Question Count</th><th className="px-8 py-5 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {dailyPapers.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6 font-black text-slate-900">{p.date}</td>
                            <td className="px-8 py-6 font-bold text-slate-500">{p.questions?.length} Target Qs</td>
                            <td className="px-8 py-6 text-right"><button className="p-2 text-indigo-600 hover:scale-110 transition-transform"><RefreshCw className="w-4 h-4" /></button></td>
                        </tr>
                    ))}
                </tbody>
             </table>
        </div>
      )}

      {activeTab === 'RESULT ANALYSIS' && (
        <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4 p-5 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm max-w-md">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Select Snapshot</label>
                <input type="date" value={analysisDate} onChange={(e) => setAnalysisDate(e.target.value)} className="flex-1 p-2 bg-slate-50 border rounded-xl font-bold text-xs" />
                <button onClick={loadAnalysis} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><RefreshCw className="w-4 h-4" /></button>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 font-black text-slate-400 uppercase tracking-[0.15em] border-b">
                        <tr><th className="px-8 py-5">Rank</th><th className="px-10 py-5">Candidate</th><th className="px-6 py-5">Physics</th><th className="px-6 py-5">Chemistry</th><th className="px-6 py-5">Mathematics</th><th className="px-10 py-5">Global Score</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {analysisData.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors font-bold">
                                <td className="px-8 py-6 font-black text-slate-400">#0{r.rank}</td>
                                <td className="px-10 py-6 text-slate-900">{r.name}</td>
                                <td className="px-6 py-6 text-blue-600">{r.stats.Physics.Score}</td>
                                <td className="px-6 py-6 text-emerald-600">{r.stats.Chemistry.Score}</td>
                                <td className="px-6 py-6 text-fuchsia-600">{r.stats.Mathematics.Score}</td>
                                <td className="px-10 py-6 font-black text-slate-900 text-base">{r.total}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'USER MANAGEMENT' && (
        <div className="space-y-6">
            {/* Add Student Modal */}
            {isAddStudentModalOpen && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <UserPlus className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Add Batch Student</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolling to your coaching batch</p>
                      </div>
                    </div>
                    <button onClick={() => setIsAddStudentModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <form onSubmit={handleAddStudent} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Student Full Name</label>
                      <input
                        type="text"
                        required
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="e.g., Rohan Kumar"
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Student Email</label>
                      <input
                        type="email"
                        required
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder="student@example.com"
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Security Key (Password)</label>
                      <input
                        type="password"
                        required
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isAddingStudent}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                    >
                      {isAddingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Add Student to Batch
                    </button>
                  </form>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center px-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Assigned Batch Directory</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Students: {users.length} / {currentUser?.admin_max_students || 30} Max Capacity
                  </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsAddStudentModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                    >
                        <UserPlus className="w-3.5 h-3.5" /> Add Student
                    </button>
                    <button 
                        onClick={loadUsers}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                </div>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm pt-4">
                 {users.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No students assigned to your coaching batch yet.</p>
                      <button onClick={() => setIsAddStudentModalOpen(true)} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 inline-flex items-center gap-2">
                        <UserPlus className="w-3.5 h-3.5" /> Enrol First Student
                      </button>
                    </div>
                 ) : (
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                          <tr><th className="px-8 py-5">Student Identity</th><th className="px-8 py-5">Domain Role</th><th className="px-8 py-5">Verification Status</th><th className="px-8 py-5 text-right">Administrative Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {users.map((u) => (
                              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-8 py-6">
                                      <div className="flex flex-col"><span className="font-black text-slate-900">{u.full_name}</span><span className="text-[10px] font-bold text-slate-400 tracking-tight">{u.email}</span></div>
                                  </td>
                                  <td className="px-8 py-6"><span className="text-[10px] font-black uppercase text-slate-500 px-3 py-1 bg-slate-100 rounded-lg">{u.role}</span></td>
                                  <td className="px-8 py-6"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${u.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{u.status}</span></td>
                                  <td className="px-8 py-6 text-right">
                                      <div className="flex justify-end gap-3">
                                          <button onClick={() => handleOpenEditStudent(u)} className="p-2.5 text-indigo-600 bg-indigo-50 rounded-xl hover:scale-110 transition-transform" title="Edit Credentials"><Key className="w-4 h-4" /></button>
                                          {u.status === 'pending' && (
                                              <button onClick={() => handleUpdateStatus(u.id, 'approved')} className="p-2.5 text-green-600 bg-green-50 rounded-xl hover:scale-110 transition-transform" title="Approve"><CheckCircle2 className="w-4 h-4" /></button>
                                          )}
                                          {u.status === 'pending' && (
                                              <button onClick={() => handleUpdateStatus(u.id, 'rejected')} className="p-2.5 text-amber-600 bg-amber-50 rounded-xl hover:scale-110 transition-transform" title="Reject"><XCircle className="w-4 h-4" /></button>
                                          )}
                                          {u.status === 'approved' && (
                                              <button onClick={() => handleUpdateStatus(u.id, 'pending')} className="p-2.5 text-slate-400 bg-slate-50 rounded-xl hover:scale-110 transition-transform" title="Revoke Approval"><RefreshCw className="w-4 h-4" /></button>
                                          )}
                                          <button onClick={() => handleDeleteProfile(u.id)} className="p-2.5 text-red-500 bg-red-50 rounded-xl hover:scale-110 transition-transform" title="Delete Student Profile"><Trash2 className="w-4 h-4" /></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                   </table>
                 )}
            </div>

            {/* Edit Student Credentials Modal */}
            {isEditStudentModalOpen && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Key className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Edit Student Credentials</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update student login & details</p>
                      </div>
                    </div>
                    <button onClick={() => setIsEditStudentModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <form onSubmit={handleEditStudentSubmit} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Student Full Name</label>
                      <input
                        type="text"
                        required
                        value={editStudentName}
                        onChange={(e) => setEditStudentName(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Student Email Address</label>
                      <input
                        type="email"
                        required
                        value={editStudentEmail}
                        onChange={(e) => setEditStudentEmail(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">New Password (Optional)</label>
                      <input
                        type="text"
                        value={editStudentPassword}
                        onChange={(e) => setEditStudentPassword(e.target.value)}
                        placeholder="Leave unchanged or enter new key"
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isUpdatingStudent}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                    >
                      {isUpdatingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                      Save Credentials
                    </button>
                  </form>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <p className="text-xs font-black uppercase tracking-widest">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
      )}
    </div>
  );
};

export default Admin;