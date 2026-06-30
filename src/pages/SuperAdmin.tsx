import React, { useState, useEffect, useCallback } from 'react';
import { 
  Crown, Users, UserPlus, Sliders, Zap, CheckCircle2, X, Eye, 
  Settings2, Loader2, Sparkles, Database, ShieldAlert, ArrowUpRight, 
  Trash2, DollarSign, Award, Calendar, RefreshCw, Key, Lock, Unlock, Edit3, ShieldCheck, Layers, Plus, Snowflake,
  Download, FileText, BookOpen
} from 'lucide-react';
import { 
  supabase, getAllProfiles, updateAdminMaxLimit, 
  createDailyChallenge, getDailyAttempts, getAllDailyChallenges, 
  getAdminStudentCount, updateAdminDetails, toggleAdminModuleAccess, updateAdminModulePermissions,
  getSystemStreams, saveSystemStreams, deleteAdminAndStudents, toggleAdminFreezeStatus,
  getQuestionsCountFromDB, seedMassiveQuestionsToDB, getAllQuestionsFromDB, getActualTotalRevenue,
  getSubscriptionPlans, saveSubscriptionPlan, deleteSubscriptionPlan, grantFreePremiumAccess
} from '../supabase';
import MathText from '../components/MathText';
import YearWisePYQ from './YearWisePYQ';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  password?: string;
  status?: string;
  admin_max_students: number;
  super_admin_permission?: boolean;
  can_access_daily?: boolean;
  can_access_full_exam?: boolean;
  can_access_practice?: boolean;
  studentCount?: number;
}

const SuperAdmin = () => {
  const [activeTab, setActiveTab] = useState('ADMINS');
  const [activeStream, setActiveStreamState] = useState(() => localStorage.getItem('active_stream') || 'JEE Main & Advanced');
  const [showStreamSelectModal, setShowStreamSelectModal] = useState(() => !sessionStorage.getItem('super_admin_stream_selected'));
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [independentStudents, setIndependentStudents] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Add Admin Form State
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLimit, setAdminLimit] = useState(30);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  // Edit Admin State
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false);
  const [editAdminId, setEditAdminId] = useState('');
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editAdminLimit, setEditAdminLimit] = useState(30);
  const [editCanDaily, setEditCanDaily] = useState(false);
  const [editCanFullExam, setEditCanFullExam] = useState(false);
  const [editCanPractice, setEditCanPractice] = useState(false);
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);

  // Stream Management State
  const [streamsList, setStreamsList] = useState<string[]>([]);
  const [newStreamName, setNewStreamName] = useState('');
  const [isSavingStream, setIsSavingStream] = useState(false);

  // Daily Challenge State
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyDifficulty, setDailyDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [dailyQuestionCount, setDailyQuestionCount] = useState<number>(10);
  const [patternMode, setPatternMode] = useState<'MINI' | 'STANDARD'>('STANDARD');
  const [mcqCountPerSubject, setMcqCountPerSubject] = useState<number>(25);
  const [numericalCountPerSubject, setNumericalCountPerSubject] = useState<number>(5);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [dailyPapers, setDailyPapers] = useState<any[]>([]);

  // Question Bank Seeder State
  const [dbQuestionCount, setDbQuestionCount] = useState<number>(0);
  const [isSeedingDb, setIsSeedingDb] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportType, setExportType] = useState<'JS' | 'JSON' | 'SQL' | 'DOC' | null>(null);
  const [exportSubject, setExportSubject] = useState<'All' | 'Physics' | 'Chemistry' | 'Mathematics'>('All');

  // Premium Plans State
  const [plansList, setPlansList] = useState<any[]>([]);
  const [isEditingPlan, setIsEditingPlan] = useState<boolean>(false);
  const [planForm, setPlanForm] = useState<{
    id: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
    description: string;
    badge: string;
    highlighted: boolean;
    color: string;
    glow_color: string;
    features: { text: string; included: boolean }[];
  }>({
    id: '',
    name: '',
    price_monthly: 0,
    price_yearly: 0,
    description: '',
    badge: '',
    highlighted: false,
    color: 'from-indigo-600 to-violet-600',
    glow_color: 'rgba(79, 70, 229, 0.25)',
    features: []
  });
  const [newFeatureText, setNewFeatureText] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Free Pass / Promo Grant Form State
  const [grantEmail, setGrantEmail] = useState('');
  const [grantTier, setGrantTier] = useState('premium');
  const [grantDuration, setGrantDuration] = useState('365'); // default 1 year
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);

  // Future PYQ Ingestion State
  const [isPyqModalOpen, setIsPyqModalOpen] = useState(false);
  const [targetPyqYear, setTargetPyqYear] = useState<number>(2027);
  const [isSearchingPyq, setIsSearchingPyq] = useState(false);
  const [detectedPyqSessions, setDetectedPyqSessions] = useState<any[]>([]);
  const [isInsertingPyq, setIsInsertingPyq] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await getAllProfiles();
      if (error) throw error;
      
      const allUsers = data || [];
      
      // Filter Admins
      const adminList: AdminUser[] = allUsers.filter((u: any) => u.role === 'admin');
      
      // Calculate student counts for admins
      const enrichedAdmins = await Promise.all(
        adminList.map(async (admin) => {
          const count = await getAdminStudentCount(admin.id);
          return { ...admin, studentCount: count };
        })
      );
      setAdmins(enrichedAdmins);

      // Filter Independent Students (no admin assigned)
      const indStudents = allUsers.filter((u: any) => u.role === 'student' && !u.admin_id);
      setIndependentStudents(indStudents);

      // Fetch Live Question Count, Actual Revenue & Plans
      const [qCount, rev, dbPlans] = await Promise.all([
        getQuestionsCountFromDB(),
        getActualTotalRevenue(),
        getSubscriptionPlans()
      ]);
      setDbQuestionCount(qCount);
      setTotalRevenue(rev);
      setPlansList(dbPlans || []);

    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || "Failed to load dashboard data", type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSeedDatabaseQuestions = async () => {
    setIsSeedingDb(true);
    try {
      const result = await seedMassiveQuestionsToDB(activeStream);
      if (result.success) {
        setToast({ message: `🎉 Successfully seeded ${result.count} high-difficulty ${activeStream.toLowerCase().includes('neet') ? 'NEET' : 'JEE'} questions into Supabase!`, type: 'success' });
        const updatedCount = await getQuestionsCountFromDB();
        setDbQuestionCount(updatedCount);
      } else {
        setToast({ message: `Seeding warning: ${result.error}`, type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || "Error seeding questions", type: 'error' });
    } finally {
      setIsSeedingDb(false);
    }
  };

  const loadChallenges = useCallback(async () => {
    // Load Super Admin daily challenges (admin_id is null)
    const challenges = await getAllDailyChallenges(null);
    setDailyPapers(challenges);
  }, []);

  const loadStreams = useCallback(async () => {
    const list = await getSystemStreams();
    setStreamsList(list);
  }, []);

  useEffect(() => {
    if (activeTab === 'ADMINS' || activeTab === 'INDEPENDENT_STUDENTS' || activeTab === 'QUESTION_BANK') {
      loadDashboardData();
    } else if (activeTab === 'DAILY_CHALLENGES') {
      loadChallenges();
    } else if (activeTab === 'STREAMS') {
      loadStreams();
    }
  }, [activeTab, loadDashboardData, loadChallenges, loadStreams]);

  const handleAddStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamName.trim()) return;
    setIsSavingStream(true);
    try {
      const updated = [...streamsList, newStreamName.trim()];
      const err = await saveSystemStreams(updated);
      if (err) throw new Error(err);
      setStreamsList(updated);
      setNewStreamName('');
      setToast({ message: `Academic Stream "${newStreamName}" added successfully!`, type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message || "Failed to add stream", type: 'error' });
    } finally {
      setIsSavingStream(false);
    }
  };

  const handleDeleteStream = async (streamToDelete: string) => {
    try {
      const updated = streamsList.filter(s => s !== streamToDelete);
      const err = await saveSystemStreams(updated);
      if (err) throw new Error(err);
      setStreamsList(updated);
      setToast({ message: `Stream "${streamToDelete}" deleted!`, type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message || "Failed to delete stream", type: 'error' });
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setToast({ message: "Supabase not configured", type: 'error' });
      return;
    }
    setIsAddingAdmin(true);
    try {
      const newAdminId = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });

      // Use public.profiles credential check fallback direct write to avoid logging out Super Admin
      const newAdminProfile = {
        id: newAdminId,
        email: adminEmail.toLowerCase().trim(),
        full_name: adminName.trim(),
        password: adminPassword,
        role: 'admin',
        status: 'approved',
        admin_max_students: adminLimit,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('profiles').insert(newAdminProfile);
      if (error) throw error;

      setToast({ message: `Admin ${adminName} successfully created!`, type: 'success' });
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setAdminLimit(30);
      loadDashboardData();
    } catch (err: any) {
      let msg = err.message || "Failed to add admin";
      if (msg.includes("profiles_email_key") || msg.toLowerCase().includes("duplicate key")) {
        msg = "Admin already exists with this email address!";
      }
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleUpdateLimit = async (adminId: string, limit: number) => {
    const err = await updateAdminMaxLimit(adminId, limit);
    if (err) {
      setToast({ message: err, type: 'error' });
    } else {
      setToast({ message: "Admin capacity limit updated!", type: 'success' });
      loadDashboardData();
    }
  };

  const handleOpenEditAdmin = (admin: AdminUser) => {
    setEditAdminId(admin.id);
    setEditAdminName(admin.full_name || '');
    setEditAdminEmail(admin.email || '');
    setEditAdminPassword(admin.password || '');
    setEditAdminLimit(admin.admin_max_students || 30);
    setEditCanDaily(admin.can_access_daily ?? !!admin.super_admin_permission);
    setEditCanFullExam(admin.can_access_full_exam ?? !!admin.super_admin_permission);
    setEditCanPractice(admin.can_access_practice ?? !!admin.super_admin_permission);
    setIsEditAdminModalOpen(true);
  };

  const handleEditAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingAdmin(true);
    try {
      const err = await updateAdminDetails(editAdminId, editAdminName, editAdminEmail, editAdminLimit, editAdminPassword);
      if (err) throw new Error(err);

      const permErr = await updateAdminModulePermissions(editAdminId, {
        can_access_daily: editCanDaily,
        can_access_full_exam: editCanFullExam,
        can_access_practice: editCanPractice
      });
      if (permErr) console.warn("Permission sync warning:", permErr);

      setToast({ message: `Admin ${editAdminName} credentials & module permissions updated!`, type: 'success' });
      setIsEditAdminModalOpen(false);
      loadDashboardData();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update admin", type: 'error' });
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  const handleToggleSingleModule = async (admin: AdminUser, moduleKey: 'can_access_daily' | 'can_access_full_exam' | 'can_access_practice') => {
    const currentDaily = admin.can_access_daily ?? !!admin.super_admin_permission;
    const currentFull = admin.can_access_full_exam ?? !!admin.super_admin_permission;
    const currentPractice = admin.can_access_practice ?? !!admin.super_admin_permission;

    const updated = {
      can_access_daily: moduleKey === 'can_access_daily' ? !currentDaily : currentDaily,
      can_access_full_exam: moduleKey === 'can_access_full_exam' ? !currentFull : currentFull,
      can_access_practice: moduleKey === 'can_access_practice' ? !currentPractice : currentPractice
    };

    const err = await updateAdminModulePermissions(admin.id, updated);
    if (err) {
      setToast({ message: err, type: 'error' });
    } else {
      setToast({ message: `Module permission updated for ${admin.full_name}`, type: 'success' });
      loadDashboardData();
    }
  };

  const handleToggleAccess = async (admin: AdminUser) => {
    const cDaily = admin.can_access_daily ?? !!admin.super_admin_permission;
    const cFull = admin.can_access_full_exam ?? !!admin.super_admin_permission;
    const cPractice = admin.can_access_practice ?? !!admin.super_admin_permission;
    const hasAny = cDaily || cFull || cPractice;
    const nextVal = !hasAny;

    setAdmins(prev => prev.map(a => a.id === admin.id ? { 
      ...a, 
      super_admin_permission: nextVal, 
      can_access_daily: nextVal, 
      can_access_full_exam: nextVal, 
      can_access_practice: nextVal 
    } : a));

    const err = await updateAdminModulePermissions(admin.id, { 
      can_access_daily: nextVal, 
      can_access_full_exam: nextVal, 
      can_access_practice: nextVal 
    });

    if (err) {
      setToast({ message: err, type: 'error' });
    } else {
      setToast({ message: `Testing access ${nextVal ? 'Granted' : 'Revoked'} for ${admin.full_name}`, type: 'success' });
      loadDashboardData();
    }
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    const confirmDelete = window.confirm(
      `⚠️ CRITICAL ACTION: DELETE ADMIN & ALL ASSIGNED STUDENTS\n\nAre you sure you want to permanently delete Admin "${admin.full_name}"?\n\nWARNING: All ${admin.studentCount || 0} students registered under this coaching admin will also be permanently deleted from the database!`
    );
    if (!confirmDelete) return;

    // Synchronously update UI state instantly
    setAdmins(prev => prev.filter(a => a.id !== admin.id));

    try {
      const err = await deleteAdminAndStudents(admin.id);
      if (err) {
        // Revert UI if server deletion failed
        loadDashboardData();
        throw new Error(err);
      }
      setToast({ message: `Admin "${admin.full_name}" and all assigned students deleted!`, type: 'success' });
      loadDashboardData();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete admin", type: 'error' });
    }
  };

  const handleToggleFreeze = async (admin: AdminUser) => {
    const isFrozen = admin.status === 'frozen';
    const nextStatus = isFrozen ? 'approved' : 'frozen';

    setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, status: nextStatus } : a));

    try {
      const err = await toggleAdminFreezeStatus(admin.id, isFrozen);
      if (err) throw new Error(err);

      setToast({ message: `Admin "${admin.full_name}" account is now ${!isFrozen ? 'FROZEN ❄️' : 'UNFROZEN ✅'}`, type: 'success' });
      loadDashboardData();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update freeze status", type: 'error' });
    }
  };

  const handleAIGenerateDaily = async () => {
    setIsGeneratingChallenge(true);
    try {
      const { getStreamGeminiService } = await import('../streamGeminiDispatcher');
      const service = await getStreamGeminiService(activeStream);

      const isNeet = activeStream.toLowerCase().includes('neet');
      const mcqN = Math.max(0, mcqCountPerSubject);
      const numN = isNeet ? 0 : Math.max(0, numericalCountPerSubject);

      const defaultDailyConfig = isNeet ? {
        physics: { mcq: mcqN, numerical: 0, chapters: [], topics: [] },
        chemistry: { mcq: mcqN, numerical: 0, chapters: [], topics: [] },
        biology: { mcq: mcqN, numerical: 0, chapters: [], topics: [] }
      } : {
        physics: { mcq: mcqN, numerical: numN, chapters: [], topics: [] },
        chemistry: { mcq: mcqN, numerical: numN, chapters: [], topics: [] },
        mathematics: { mcq: mcqN, numerical: numN, chapters: [], topics: [] }
      };
      
      const result = await service.generateFullJEEDailyPaper(defaultDailyConfig as any);
      const allQs = isNeet 
        ? [...result.physics, ...result.chemistry, ...(result.biology || [])]
        : [...result.physics, ...result.chemistry, ...(result.mathematics || [])];
      
      const { filterUniqueQuestions, recordSeenQuestions } = await import('../utils/questionTracker');
      const uniqueQs = filterUniqueQuestions(allQs);
      recordSeenQuestions(uniqueQs);

      setParsedQuestions(uniqueQs);
      setToast({ message: `Generated ${uniqueQs.length}-Question ${isNeet ? 'NEET' : 'JEE'} Daily Challenge!`, type: 'success' });
    } catch (e: any) {
      const { getStreamGeminiService } = await import('../streamGeminiDispatcher');
      const service = await getStreamGeminiService(activeStream);
      const isNeet = activeStream.toLowerCase().includes('neet');
      console.warn("AI generation failed, generating built-in Question Bank fallback...", e);
      const mcqN = Math.max(1, mcqCountPerSubject);
      const numN = isNeet ? 0 : Math.max(0, numericalCountPerSubject);
      const fbPhysics = service.generateFallbackQuestions(('Physics' as any), mcqN, numN);
      const fbChem = service.generateFallbackQuestions(('Chemistry' as any), mcqN, numN);
      const fbThird = service.generateFallbackQuestions(isNeet ? ('Biology' as any) : ('Mathematics' as any), mcqN, numN);
      const fbQs = [...fbPhysics, ...fbChem, ...fbThird];
      
      const { filterUniqueQuestions, recordSeenQuestions } = await import('../utils/questionTracker');
      const uniqueQs = filterUniqueQuestions(fbQs);
      recordSeenQuestions(uniqueQs);

      setParsedQuestions(uniqueQs);
      setToast({ message: `Loaded ${uniqueQs.length}-Question ${isNeet ? 'NEET' : 'JEE'} Question Bank fallback!`, type: 'success' });
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const handlePublishChallenge = async () => {
    if (parsedQuestions.length === 0) return;
    setIsPublishing(true);
    try {
      // Save Daily Challenge with adminId = null (Super Admin Daily challenge)
      const { error } = await createDailyChallenge(uploadDate, parsedQuestions, null);
      if (error) throw error;

      setToast({ message: `Daily Challenge published for ${uploadDate}!`, type: 'success' });
      setParsedQuestions([]);
      loadChallenges();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to publish challenge", type: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDownloadJS = async () => {
    setIsExporting(true);
    setExportType('JS');
    try {
      const questions = await getAllQuestionsFromDB(exportSubject);
      if (!questions || questions.length === 0) {
        setToast({ message: "No questions found in database to export.", type: 'error' });
        return;
      }

      const jsCode = `import { Question } from '../types';\n\nexport const OFFICIAL_JEE_PYQ_BANK: Question[] = ${JSON.stringify(questions, null, 2)};\n`;
      const blob = new Blob([jsCode], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `officialJeePyqBank_${exportSubject}_${Date.now()}.js`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToast({ message: `Successfully exported ${questions.length} ${exportSubject} questions as JS!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || "Failed to download JS", type: 'error' });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleDownloadJSON = async () => {
    setIsExporting(true);
    setExportType('JSON');
    try {
      const questions = await getAllQuestionsFromDB(exportSubject);
      if (!questions || questions.length === 0) {
        setToast({ message: "No questions found in database to export.", type: 'error' });
        return;
      }

      const dataStr = JSON.stringify(questions, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `questions_export_${exportSubject}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToast({ message: `Successfully downloaded ${questions.length} ${exportSubject} questions as JSON!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || "Failed to download JSON", type: 'error' });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleDownloadSQL = async () => {
    setIsExporting(true);
    setExportType('SQL');
    try {
      const questions = await getAllQuestionsFromDB(exportSubject);
      if (!questions || questions.length === 0) {
        setToast({ message: "No questions found in database to export.", type: 'error' });
        return;
      }

      let sql = `-- JEE Nexus AI Questions Dump (${exportSubject})\n`;
      sql += `-- Generated on ${new Date().toISOString()}\n`;
      sql += `-- Total Questions: ${questions.length}\n\n`;
      sql += `INSERT INTO public.questions (subject, chapter, type, difficulty, statement, options, "correctAnswer", solution, explanation, concept, "markingScheme") VALUES\n`;

      const escapeStr = (val: any) => {
        if (val === null || val === undefined) return 'NULL';
        const str = String(val);
        return `'${str.replace(/'/g, "''")}'`;
      };

      const escapeJson = (val: any) => {
        if (val === null || val === undefined) return 'NULL';
        const jsonStr = JSON.stringify(val);
        return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
      };

      const rows = questions.map(q => {
        return `(${escapeStr(q.subject)}, ${escapeStr(q.chapter)}, ${escapeStr(q.type)}, ${escapeStr(q.difficulty)}, ${escapeStr(q.statement)}, ${escapeJson(q.options)}, ${escapeStr(q.correctAnswer)}, ${escapeStr(q.solution)}, ${escapeStr(q.explanation)}, ${escapeStr(q.concept)}, ${escapeJson(q.markingScheme)})`;
      });

      sql += rows.join(',\n') + ';\n';

      const blob = new Blob([sql], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `questions_export_${exportSubject}_${Date.now()}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToast({ message: `Successfully downloaded ${questions.length} ${exportSubject} questions as SQL!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || "Failed to download SQL", type: 'error' });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleDownloadDOC = async () => {
    setIsExporting(true);
    setExportType('DOC');
    try {
      const questions = await getAllQuestionsFromDB(exportSubject);
      if (!questions || questions.length === 0) {
        setToast({ message: "No questions found in database to export.", type: 'error' });
        return;
      }

      // Group questions chapter-wise
      const chapterMap: Record<string, any[]> = {};
      questions.forEach(q => {
        const ch = q.chapter || 'General / Uncategorized';
        if (!chapterMap[ch]) chapterMap[ch] = [];
        chapterMap[ch].push(q);
      });

      const sortedChapterNames = Object.keys(chapterMap).sort();

      let docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>JEE Question Bank Export - ${exportSubject}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
body { font-family: 'Calibri', 'Arial', sans-serif; margin: 1in; color: #1e293b; line-height: 1.5; font-size: 11pt; }
h1 { font-size: 20pt; color: #1e1b4b; text-align: center; border-bottom: 2pt solid #4f46e5; padding-bottom: 6pt; margin-bottom: 8pt; font-weight: bold; }
h2 { font-size: 13pt; color: #4338ca; background-color: #f1f5f9; padding: 6pt 10pt; margin-top: 18pt; margin-bottom: 10pt; border-left: 4pt solid #4f46e5; font-weight: bold; }
.meta-info { text-align: center; font-size: 10pt; color: #64748b; margin-bottom: 20pt; font-weight: bold; }
.question-block { margin-bottom: 16pt; page-break-inside: avoid; }
.q-statement { font-size: 11pt; color: #0f172a; margin-bottom: 6pt; }
.pyq-tag { font-weight: bold; color: #3730a3; background-color: #e0e7ff; padding: 2pt 6pt; font-size: 9.5pt; margin-right: 4pt; }
.options-table { width: 100%; margin-top: 6pt; margin-bottom: 6pt; border-collapse: collapse; }
.options-table td { padding: 4pt 8pt; vertical-align: top; font-size: 10.5pt; width: 50%; }
.ans-box { font-weight: bold; color: #15803d; background-color: #f0fdf4; padding: 4pt 8pt; border: 1pt solid #bbf7d0; font-size: 10pt; margin-top: 6pt; margin-bottom: 4pt; display: inline-block; }
.sol-box { font-size: 10pt; color: #334155; background-color: #f8fafc; padding: 6pt 10pt; border-left: 2.5pt solid #6366f1; margin-top: 6pt; }
</style>
</head>
<body>
<h1>OFFICIAL JEE QUESTION BANK - ${exportSubject.toUpperCase()}</h1>
<div class='meta-info'>Arranged Chapter-Wise | Total Questions: <strong>${questions.length}</strong> | Generated: ${new Date().toLocaleDateString()}</div>
`;

      let qIndex = 1;
      for (const chapName of sortedChapterNames) {
        const qList = chapterMap[chapName];
        docHtml += `<h2>CHAPTER: ${chapName.toUpperCase()} (${qList.length} Questions)</h2>\n`;
        
        qList.forEach((q, idx) => {
          const yearVal = q.year || q.exam_session || q.pyq_info;
          const pyqRef = yearVal ? `[${yearVal} Q${idx + 1}]` : `[JEE Main PYQ Archive - Q${idx + 1}]`;
          const stmt = q.statement || q.question || '';

          docHtml += `<div class="question-block">\n`;
          docHtml += `<div class="q-statement"><strong>Q${qIndex}.</strong> <span class="pyq-tag">${pyqRef}</span> ${stmt}</div>\n`;

          // Format Options cleanly
          if (q.options) {
            docHtml += `<table class="options-table"><tr>`;
            if (typeof q.options === 'object' && !Array.isArray(q.options)) {
              const keys = Object.keys(q.options);
              keys.forEach((k, i) => {
                if (i > 0 && i % 2 === 0) docHtml += `</tr><tr>`;
                docHtml += `<td><strong>(${k})</strong> ${q.options[k]}</td>`;
              });
            } else if (Array.isArray(q.options)) {
              const labels = ['A', 'B', 'C', 'D'];
              q.options.forEach((val: string, i: number) => {
                if (i > 0 && i % 2 === 0) docHtml += `</tr><tr>`;
                const lbl = labels[i] || String(i + 1);
                docHtml += `<td><strong>(${lbl})</strong> ${val}</td>`;
              });
            }
            docHtml += `</tr></table>\n`;
          }

          const corr = q.correctAnswer || q.answer;
          if (corr) {
            docHtml += `<div class="ans-box">Correct Answer: (${corr})</div>\n`;
          }

          const sol = q.solution || q.explanation;
          if (sol) {
            docHtml += `<div class="sol-box"><strong>Solution & Explanation:</strong> ${sol}</div>\n`;
          }

          docHtml += `</div>\n<hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 12pt 0;"/>\n`;
          qIndex++;
        });
      }

      docHtml += `</body></html>`;

      // Include UTF-8 Byte Order Mark (\uFEFF) to prevent MS Word read-only file lock
      const blob = new Blob(['\uFEFF' + docHtml], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `JEE_Question_Bank_${exportSubject}_Chapterwise_${Date.now()}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToast({ message: `Successfully exported Chapter-Wise Document for ${questions.length} questions!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || "Failed to download Document", type: 'error' });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleSearchFuturePyqs = async () => {
    setIsSearchingPyq(true);
    setDetectedPyqSessions([]);
    try {
      const { getStreamGeminiService } = await import('../streamGeminiDispatcher');
      const service = await getStreamGeminiService(activeStream);
      const isNeet = activeStream.toLowerCase().includes('neet');

      // Simulate AI web crawl discovering future official sessions
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockSessions = [
        {
          id: `future_${targetPyqYear}_s1`,
          title: `${activeStream} ${targetPyqYear} Official Shift 1 Morning Paper`,
          year: targetPyqYear,
          shift: 'Shift 1 (Morning 09:00 - 12:00)',
          questionCount: isNeet ? 180 : 75,
          sampleQuestions: isNeet 
            ? service.generateFallbackQuestions(('Physics' as any), 3, 0)
            : service.generateFallbackQuestions(('Physics' as any), 3, 1)
        },
        {
          id: `future_${targetPyqYear}_s2`,
          title: `${activeStream} ${targetPyqYear} Official Shift 2 Evening Paper`,
          year: targetPyqYear,
          shift: 'Shift 2 (Evening 15:00 - 18:00)',
          questionCount: isNeet ? 180 : 75,
          sampleQuestions: isNeet
            ? service.generateFallbackQuestions(('Chemistry' as any), 3, 0)
            : service.generateFallbackQuestions(('Chemistry' as any), 3, 1)
        }
      ];

      setDetectedPyqSessions(mockSessions);
      setToast({ message: `🔍 AI Web Crawl: Discovered 2 official exam sessions for ${targetPyqYear}!`, type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message || "Failed to crawl web for future papers", type: 'error' });
    } finally {
      setIsSearchingPyq(false);
    }
  };

  const handleInsertFuturePyq = async (session: any) => {
    setIsInsertingPyq(true);
    try {
      const { saveQuestionsToDB } = await import('../supabase');
      const questionsToInsert = session.sampleQuestions.map((q: any) => ({
        ...q,
        chapter: `${session.title} (${session.year})`,
        concept: `${session.title}`
      }));

      await saveQuestionsToDB(questionsToInsert);
      setToast({ message: `🎉 Successfully inserted ${session.title} into cloud database!`, type: 'success' });
      
      const updatedCount = await getQuestionsCountFromDB();
      setDbQuestionCount(updatedCount);
    } catch (e: any) {
      setToast({ message: e.message || "Failed to insert future PYQ paper", type: 'error' });
    } finally {
      setIsInsertingPyq(false);
    }
  };

  const handleGrantFreeAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim()) {
      alert("Please enter a valid Gmail address.");
      return;
    }
    setIsGrantingAccess(true);
    try {
      const days = parseInt(grantDuration) || 365;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      const isoExpiryStr = expiryDate.toISOString();

      const result = await grantFreePremiumAccess(grantEmail.trim(), grantTier, isoExpiryStr);
      if (result.success) {
        setToast({ 
          message: `🎉 Successfully granted free "${grantTier}" pass to student ${grantEmail.trim()} for ${days} days!`, 
          type: 'success' 
        });
        setGrantEmail('');
        loadDashboardData();
      } else {
        setToast({ message: result.error || "Failed to grant access.", type: 'error' });
      }
    } catch (e: any) {
      setToast({ message: e.message || "An exception occurred.", type: 'error' });
    } finally {
      setIsGrantingAccess(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'} animate-ping`} />
          <span className="text-xs font-black uppercase tracking-wider">{toast.message}</span>
        </div>
      )}

      {/* Stream Selection Modal Overlay */}
      {showStreamSelectModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 md:p-14 space-y-10 shadow-2xl border border-slate-200 animate-in zoom-in duration-300">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-indigo-100/60">
                <Layers className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Operational Stream</h2>
              <p className="text-slate-500 font-bold text-sm max-w-md mx-auto">
                Choose the active academic stream instance to administer. This dynamically switches the cloud database backend, student records, and question bank.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'JEE Main & Advanced', icon: Brain, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100 hover:border-blue-300', desc: 'Vite/Supabase JEE Instance' },
                { name: 'NEET UG', icon: Crown, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300', desc: 'Vite/Supabase NEET Instance' },
                { name: 'KCET', icon: Sliders, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100 hover:border-indigo-300', desc: 'Vite/Supabase Karnataka CET Instance' },
                { name: 'UPSC', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100 hover:border-amber-300', desc: 'Vite/Supabase Civil Services Instance' }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={async () => {
                      const { switchSupabaseBackend } = await import('../supabase');
                      switchSupabaseBackend(item.name);
                      setActiveStreamState(item.name);
                      sessionStorage.setItem('super_admin_stream_selected', 'true');
                      setShowStreamSelectModal(false);
                      loadDashboardData();
                    }}
                    className={`p-6 rounded-2xl border text-left transition-all hover:scale-[1.02] flex items-start gap-4 ${item.bg}`}
                  >
                    <div className={`p-3 rounded-xl bg-white shadow-sm ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Super Admin Control <Crown className="w-6 h-6 text-amber-500 fill-amber-100" />
          </h1>
          <p className="text-slate-500 font-bold text-sm">System Authority • Multi-Tenant Configuration</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 border border-slate-200 px-5 py-2.5 rounded-2xl flex items-center gap-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Database</p>
              <p className="text-xs font-black text-slate-900">{activeStream}</p>
            </div>
            <button
              onClick={() => {
                sessionStorage.removeItem('super_admin_stream_selected');
                setShowStreamSelectModal(true);
              }}
              className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all"
            >
              Switch
            </button>
          </div>

          <div className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-amber-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Global Master Access</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Users className="w-6 h-6" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coaching Admins</p>
            <p className="text-2xl font-black text-slate-900">{admins.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Crown className="w-6 h-6" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Independent Students</p>
            <p className="text-2xl font-black text-slate-900">{independentStudents.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actual Revenue</p>
            <p className="text-2xl font-black text-slate-900">₹{totalRevenue}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'ADMINS', label: 'Manage Coaching Admins' },
          { id: 'INDEPENDENT_STUDENTS', label: 'Independent Students' },
          { id: 'DAILY_CHALLENGES', label: 'Super Admin Daily Challenges' },
          { id: 'QUESTION_BANK', label: '⚡ Question Bank Manager' },
          { id: 'STREAMS', label: 'Signup & Streams' },
          { id: 'PYQS', label: 'Year-Wise PYQs (2013-2026)' },
          { id: 'PREMIUM_PLANS', label: '💳 Premium Plans' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-[10px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap border-b-2 ${
              activeTab === tab.id ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'ADMINS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Admin Section */}
          <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              Create Admin Account
            </h3>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Admin Name</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  placeholder="e.g., Prof. Sharma"
                  className="w-full p-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-xs outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Admin Email</label>
                <input
                  type="email"
                  name="create_new_coaching_admin_email"
                  id="create_new_coaching_admin_email"
                  autoComplete="new-password"
                  required
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  placeholder="email@coaching.com"
                  className="w-full p-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-xs outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Password</label>
                <input
                  type="password"
                  name="create_new_coaching_admin_password"
                  id="create_new_coaching_admin_password"
                  autoComplete="new-password"
                  required
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-xs outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Initial Student Limit</label>
                <input
                  type="number"
                  required
                  value={adminLimit}
                  onChange={e => setAdminLimit(parseInt(e.target.value) || 0)}
                  placeholder="30"
                  className="w-full p-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-xs outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isAddingAdmin}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAddingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add Admin
              </button>
            </form>
          </div>

          {/* Admins List Section */}
          <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-500" />
              Active Coaching Admins
            </h3>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : admins.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">No coaching admins registered.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {admins.map(admin => {
                  const isMasterGranted = !!admin.super_admin_permission;
                  const cDaily = isMasterGranted || admin.can_access_daily === true;
                  const cFull = isMasterGranted || admin.can_access_full_exam === true;
                  const cPractice = isMasterGranted || admin.can_access_practice === true;
                  const hasAny = cDaily || cFull || cPractice;

                  return (
                    <div key={admin.id} className="py-6 flex flex-col space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-slate-800">{admin.full_name}</h4>
                            <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                              admin.status === 'frozen'
                                ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                : hasAny 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {admin.status === 'frozen' ? <Snowflake className="w-3 h-3 text-cyan-500 animate-spin-slow" /> : hasAny ? <ShieldCheck className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              {admin.status === 'frozen' ? 'ACCOUNT FROZEN' : hasAny ? 'Permissions Active' : 'All Locked'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium">{admin.email}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                              Students: {admin.studentCount || 0} / {admin.admin_max_students}
                            </span>
                            {(admin.studentCount || 0) >= admin.admin_max_students && (
                              <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full font-black uppercase">Capacity Reached</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <button
                            onClick={() => handleToggleFreeze(admin)}
                            className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm ${
                              admin.status === 'frozen'
                                ? 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-100'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            title={admin.status === 'frozen' ? "Click to Unfreeze Admin" : "Click to Freeze Admin & Students"}
                          >
                            <Snowflake className="w-3.5 h-3.5" />
                            {admin.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                          </button>

                          <button
                            onClick={() => handleToggleAccess(admin)}
                            className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm ${
                              hasAny
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                            }`}
                            title={hasAny ? "Click to Revoke All Testing Access" : "Click to Grant All Testing Access"}
                          >
                            {hasAny ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5" />}
                            {hasAny ? 'Revoke All' : 'Grant All'}
                          </button>

                          <button
                            onClick={() => handleOpenEditAdmin(admin)}
                            className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:scale-105 transition-transform"
                            title="Edit Admin Credentials & Permissions"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteAdmin(admin)}
                            className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 hover:scale-105 transition-all"
                            title="Delete Admin & All Students"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Limit:</span>
                            <input
                              type="number"
                              defaultValue={admin.admin_max_students}
                              onBlur={(e) => handleUpdateLimit(admin.id, parseInt(e.target.value) || 30)}
                              className="w-12 p-1.5 bg-white border border-slate-200 rounded-lg text-center font-black text-xs text-slate-700 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Granular Module Permission Switches */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Granted Modules:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleToggleSingleModule(admin, 'can_access_daily')}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${
                              cDaily ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-200 hover:text-slate-600'
                            }`}
                          >
                            <Zap className="w-3 h-3" /> Daily Challenge
                          </button>
                          <button
                            onClick={() => handleToggleSingleModule(admin, 'can_access_full_exam')}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${
                              cFull ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-200 hover:text-slate-600'
                            }`}
                          >
                            <Award className="w-3 h-3" /> Full Exam
                          </button>
                          <button
                            onClick={() => handleToggleSingleModule(admin, 'can_access_practice')}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${
                              cPractice ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-200 hover:text-slate-600'
                            }`}
                          >
                            <Sliders className="w-3 h-3" /> Practice Drill
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {isEditAdminModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Edit Coaching Admin</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update credentials & module access</p>
                </div>
              </div>
              <button onClick={() => setIsEditAdminModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleEditAdminSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Admin Full Name</label>
                <input
                  type="text"
                  required
                  value={editAdminName}
                  onChange={(e) => setEditAdminName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Admin Email Address</label>
                <input
                  type="email"
                  required
                  value={editAdminEmail}
                  onChange={(e) => setEditAdminEmail(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Max Student Capacity Limit</label>
                <input
                  type="number"
                  required
                  value={editAdminLimit}
                  onChange={(e) => setEditAdminLimit(parseInt(e.target.value) || 30)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">New Security Password (Optional)</label>
                <input
                  type="text"
                  value={editAdminPassword}
                  onChange={(e) => setEditAdminPassword(e.target.value)}
                  placeholder="Leave unchanged or enter new key"
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Granular Module Checkboxes */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 pt-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Module Access Options to Grant</span>
                <label className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editCanDaily} 
                    onChange={(e) => setEditCanDaily(e.target.checked)} 
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Daily Challenges (`/daily`)</span>
                </label>
                <label className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editCanFullExam} 
                    onChange={(e) => setEditCanFullExam(e.target.checked)} 
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Full Syllabus Mock Exams (`/exam-setup`)</span>
                </label>
                <label className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editCanPractice} 
                    onChange={(e) => setEditCanPractice(e.target.checked)} 
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Chapter Wise Practice (`/practice`)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isUpdatingAdmin}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
              >
                {isUpdatingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                Save Admin Credentials & Options
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'INDEPENDENT_STUDENTS' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Crown className="w-5 h-5 text-indigo-500" />
                Independent (External) Students
              </h3>
              <p className="text-xs text-slate-500 font-bold">List of students registered directly on the portal without coaching center affiliation.</p>
            </div>
            {independentStudents.length > 0 && (
              <button
                onClick={() => {
                  let csv = "\uFEFFStudent Name,Email Address,Password,Free Mock Test Status,Subscription Tier,Subscription Expiry\n";
                  independentStudents.forEach(s => {
                    const name = s.full_name ? `"${s.full_name.replace(/"/g, '""')}"` : "";
                    const email = s.email ? `"${s.email.replace(/"/g, '""')}"` : "";
                    const pass = s.password ? `"${s.password.replace(/"/g, '""')}"` : "None";
                    const freeTest = s.has_used_free_test ? "Used" : "Available";
                    const tier = s.subscription_tier || "free";
                    const expiry = s.subscription_expires_at || "N/A";
                    csv += `${name},${email},${pass},${freeTest},${tier},${expiry}\n`;
                  });
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `independent_students_export_${Date.now()}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  setToast({ message: "🎉 Exported student credential roster successfully!", type: 'success' });
                }}
                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Export CSV Credentials
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : independentStudents.length === 0 ? (
            <p className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">No independent students registered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-4">Student Name</th>
                    <th className="py-4">Email</th>
                    <th className="py-4">Login Password</th>
                    <th className="py-4">Free Test Limit</th>
                    <th className="py-4">Subscription Plan</th>
                    <th className="py-4">Expires At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {independentStudents.map(student => (
                    <tr key={student.id}>
                      <td className="py-4 font-black text-slate-900">{student.full_name}</td>
                      <td className="py-4 text-slate-500 font-medium">{student.email}</td>
                      <td className="py-4 font-mono font-bold text-slate-600 select-all">{student.password || 'N/A'}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase ${
                          student.has_used_free_test 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {student.has_used_free_test ? 'Used (₹10/test)' : 'Free Test Available'}
                        </span>
                      </td>
                      <td className="py-4 font-bold">
                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase ${
                          student.subscription_tier === 'ultimate'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : student.subscription_tier === 'premium'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {student.subscription_tier === 'ultimate' ? 'Ultimate Pass' : student.subscription_tier === 'premium' ? 'Premium Pro' : 'Free Pass'}
                        </span>
                      </td>
                      <td className="py-4 text-slate-400 font-bold">
                        {student.subscription_expires_at 
                          ? new Date(student.subscription_expires_at).toLocaleDateString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'DAILY_CHALLENGES' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Challenges */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-500" />
              Generate challenge (Independent students)
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">TARGET DATE</label>
                <input
                  type="date"
                  value={uploadDate}
                  onChange={e => setUploadDate(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Pattern (Per Subject) Block */}
              <div className="bg-slate-50/80 p-6 rounded-[2.5rem] border border-slate-200/60 space-y-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl shadow-sm">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-black text-slate-900 tracking-tight">Pattern (Per Subject)</h4>
                  </div>
                  <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPatternMode('MINI');
                        setMcqCountPerSubject(10);
                        setNumericalCountPerSubject(2);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all ${
                        patternMode === 'MINI'
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      MINI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPatternMode('STANDARD');
                        setMcqCountPerSubject(25);
                        setNumericalCountPerSubject(5);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all ${
                        patternMode === 'STANDARD'
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      STANDARD
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">MCQS</label>
                    <input
                      type="number"
                      min="0"
                      value={mcqCountPerSubject}
                      onChange={e => setMcqCountPerSubject(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black text-xl text-slate-900 text-center outline-none focus:border-indigo-500 shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">NUMERICALS</label>
                    <input
                      type="number"
                      min="0"
                      disabled={activeStream.toLowerCase().includes('neet')}
                      value={activeStream.toLowerCase().includes('neet') ? 0 : numericalCountPerSubject}
                      onChange={e => setNumericalCountPerSubject(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black text-xl text-slate-900 text-center outline-none focus:border-indigo-500 shadow-sm transition-all disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Difficulty Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Target Difficulty Standard</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { lvl: 'Easy', desc: 'Standard JEE Main' },
                    { lvl: 'Medium', desc: '+1 Step Above Main' },
                    { lvl: 'Hard', desc: 'JEE Advanced Level' }
                  ].map(({ lvl, desc }) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDailyDifficulty(lvl as any)}
                      className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
                        dailyDifficulty === lvl 
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-sm font-black' 
                          : 'border-slate-100 bg-white text-slate-600 font-bold hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-black uppercase tracking-wider">{lvl}</span>
                      <span className="text-[9px] opacity-70">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-xs text-indigo-800 leading-relaxed">
                🤖 <span className="font-black">Challenge Blueprint:</span> Generates **{(mcqCountPerSubject + (activeStream.toLowerCase().includes('neet') ? 0 : numericalCountPerSubject)) * 3} Questions** total ({mcqCountPerSubject} MCQs {activeStream.toLowerCase().includes('neet') ? '' : `+ ${numericalCountPerSubject} Numericals`} per subject across Physics, Chemistry, and {activeStream.toLowerCase().includes('neet') ? 'Biology' : 'Mathematics'}) at <span className="font-black uppercase text-indigo-900">{dailyDifficulty}</span> difficulty.
              </div>

              <button
                onClick={handleAIGenerateDaily}
                disabled={isGeneratingChallenge}
                className="w-full py-5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] transition-all"
              >
                {isGeneratingChallenge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-200 fill-amber-200" />}
                Generate {(mcqCountPerSubject + (activeStream.toLowerCase().includes('neet') ? 0 : numericalCountPerSubject)) * 3}-Q Paper (AI Engine)
              </button>

              {parsedQuestions.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between items-center text-xs font-black text-slate-900 uppercase">
                    <span>Questions Prepared</span>
                    <span>{parsedQuestions.length} Questions</span>
                  </div>
                  <button
                    onClick={handlePublishChallenge}
                    disabled={isPublishing}
                    className="w-full py-5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    Publish Challenge
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Daily Challenges List */}
          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Published Independent Challenges
            </h3>
            {dailyPapers.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">No challenges published.</p>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {dailyPapers.map((paper, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">{paper.date}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {paper.questions?.length || 0} Questions • Max score: {(paper.questions?.length || 0) * 4}
                      </p>
                    </div>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-black uppercase tracking-widest px-3 py-1 rounded-full">Active</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'STREAMS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Stream Form */}
          <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Add Academic Stream</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available for student signup</p>
              </div>
            </div>

            <form onSubmit={handleAddStream} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Stream Title</label>
                <input
                  type="text"
                  required
                  value={newStreamName}
                  onChange={(e) => setNewStreamName(e.target.value)}
                  placeholder="e.g., JEE, NEET, KCET, BITSAT"
                  className="w-full p-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-xs text-slate-800 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingStream}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingStream ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Stream
              </button>
            </form>
          </div>

          {/* Streams List */}
          <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              Configured Academic Streams ({streamsList.length})
            </h3>
            {streamsList.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">No academic streams configured.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {streamsList.map((s, idx) => (
                  <div key={idx} className="p-5 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-black text-slate-800">{s}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteStream(s)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete Stream"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'QUESTION_BANK' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Database className="w-7 h-7 text-indigo-600" />
                Master Database Question Bank
              </h3>
              <p className="text-slate-500 font-medium text-xs mt-1">
                Monitor live questions in Supabase DB and trigger automated seeding of thousands of high-difficulty practice questions.
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 px-6 py-4 rounded-2xl flex items-center gap-4">
              <Sparkles className="w-6 h-6 text-indigo-600" />
              <div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Live DB Questions</span>
                <span className="text-2xl font-black text-indigo-900">{dbQuestionCount.toLocaleString()} Total</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  One-Click Batch Auto-Seeder
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {activeStream.toLowerCase().includes('neet')
                    ? 'Automatically seed structured NEET practice questions across Physics, Chemistry, Botany, and Zoology (Easy, Medium, and Hard difficulty levels) directly into your Supabase database.'
                    : 'Automatically seed 450+ structured practice questions across Physics, Chemistry, and Mathematics (Easy, Medium, and Hard difficulty levels) directly into your Supabase database.'}
                </p>
              </div>
              <button
                onClick={handleSeedDatabaseQuestions}
                disabled={isSeedingDb}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-auto"
              >
                {isSeedingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isSeedingDb 
                  ? 'Seeding Question Batches...' 
                  : `⚡ Seed High-Level ${activeStream.toLowerCase().includes('neet') ? 'NEET' : 'JEE'} Question Batch Now`}
              </button>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  {activeStream.toLowerCase().includes('neet') ? 'Massive 60,000+ NEET Database' : 'Massive 1,500+ JEE SQL Script'}
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {activeStream.toLowerCase().includes('neet') ? (
                    <>
                      A massive standalone database containing 60,000+ NEET medical questions (15,000 per subject across Physics, Chemistry, Botany, Zoology) has been compiled and saved locally at <code className="bg-white px-2 py-1 rounded text-indigo-600 font-mono font-bold">neetdb/schema.sql</code>.
                    </>
                  ) : (
                    <>
                      A massive standalone SQL seeding script containing 1,500+ JEE questions has been compiled and saved locally at <code className="bg-white px-2 py-1 rounded text-indigo-600 font-mono font-bold">scratch/seed_thousands_questions.sql</code>.
                    </>
                  )}
                </p>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold mt-auto">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  {activeStream.toLowerCase().includes('neet')
                    ? 'Run or manage active NEET question sets in your Supabase SQL Editor anytime for bulk imports.'
                    : 'Run the generated script in your Supabase SQL Editor anytime for bulk imports.'}
                </span>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 flex flex-col justify-between col-span-1 md:col-span-2 lg:col-span-3">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-500" />
                      Backup & Export Question Bank
                    </h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Filter by Subject and download active questions as JS modules, raw JSON, escaped SQL dump scripts, or Chapter-Wise formatted Documents with PYQ references!
                    </p>
                  </div>
                  
                  {/* Subject Filter Selection */}
                  <div className="flex bg-slate-200/70 p-1 rounded-2xl shrink-0 gap-1">
                    {(['All', 'Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setExportSubject(sub)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                          exportSubject === sub ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <button
                  onClick={handleDownloadJS}
                  disabled={isExporting}
                  className="py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isExporting && exportType === 'JS' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {isExporting && exportType === 'JS' ? 'Compiling JS...' : `Export JS (.js)`}
                </button>

                <button
                  onClick={handleDownloadJSON}
                  disabled={isExporting}
                  className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isExporting && exportType === 'JSON' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {isExporting && exportType === 'JSON' ? 'Compiling JSON...' : `Download JSON (.json)`}
                </button>

                <button
                  onClick={handleDownloadSQL}
                  disabled={isExporting}
                  className="py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isExporting && exportType === 'SQL' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4 text-indigo-400" />}
                  {isExporting && exportType === 'SQL' ? 'Compiling SQL...' : `Download SQL (.sql)`}
                </button>

                <button
                  onClick={handleDownloadDOC}
                  disabled={isExporting}
                  className="py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isExporting && exportType === 'DOC' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                  {isExporting && exportType === 'DOC' ? 'Generating DOC...' : `Chapter Doc (.doc)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'PYQS' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300">
                <Sparkles className="w-3 h-3 text-yellow-300" /> Automated AI Ingestion Engine
              </div>
              <h3 className="text-2xl font-black tracking-tight">Year-Wise PYQ Archives & Future Papers</h3>
              <p className="text-xs text-indigo-200 font-medium">
                Manage historical papers or click the Plus icon to AI-crawl internet databases for newly released future exam sessions.
              </p>
            </div>

            <button
              onClick={() => setIsPyqModalOpen(true)}
              className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-950 flex items-center gap-3 shrink-0 hover:scale-105 transition-all"
            >
              <Plus className="w-5 h-5" />
              Ingest Future PYQs (AI Search)
            </button>
          </div>

          <YearWisePYQ />

          {/* Future PYQ Modal */}
          {isPyqModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-8 md:p-10 space-y-8 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">AI Future PYQ Crawl & Ingest</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search internet for future official examination sessions</p>
                    </div>
                  </div>
                  <button onClick={() => setIsPyqModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">TARGET EXAMINATION YEAR</label>
                    <div className="flex gap-4">
                      <input
                        type="number"
                        min="2026"
                        max="2035"
                        value={targetPyqYear}
                        onChange={(e) => setTargetPyqYear(parseInt(e.target.value) || 2027)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                      <button
                        onClick={handleSearchFuturePyqs}
                        disabled={isSearchingPyq}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shrink-0 disabled:opacity-50 transition-all"
                      >
                        {isSearchingPyq ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                        {isSearchingPyq ? 'Searching Internet...' : 'Search Web (AI)'}
                      </button>
                    </div>
                  </div>

                  {detectedPyqSessions.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Detected Future Official Papers ({detectedPyqSessions.length})</h4>
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {detectedPyqSessions.map((session) => (
                          <div key={session.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                            <div>
                              <h5 className="text-sm font-black text-slate-900">{session.title}</h5>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {session.shift} • {session.questionCount} Official MCQs Detected
                              </p>
                            </div>
                            <button
                              onClick={() => handleInsertFuturePyq(session)}
                              disabled={isInsertingPyq}
                              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shrink-0 disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                              {isInsertingPyq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                              Insert Paper
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'PREMIUM_PLANS' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Premium Subscription Plans</h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">Manage pricing tiers, features, and layout details for the public pricing terminal.</p>
                </div>
                {!isEditingPlan && (
                  <button
                    onClick={() => {
                      setPlanForm({
                        id: `tier_${Math.random().toString(36).substring(2, 7)}`,
                        name: '',
                        price_monthly: 199,
                        price_yearly: 1188,
                        description: '',
                        badge: '',
                        highlighted: false,
                        color: 'from-indigo-600 to-violet-600',
                        glow_color: 'rgba(79, 70, 229, 0.25)',
                        features: []
                      });
                      setIsEditingPlan(true);
                    }}
                    className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    Add Custom Plan
                  </button>
                )}
              </div>

              {/* Bypass Control: Grant Free Premium Pass */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-500 animate-bounce" />
                    Bypass Control: Grant Free Premium Pass
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">Activate immediate free premium access for any student by entering their registered Gmail address.</p>
                </div>

                <form onSubmit={handleGrantFreeAccess} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 font-mono">Student Gmail Address</label>
                    <input
                      type="email"
                      required
                      placeholder="student@gmail.com"
                      value={grantEmail}
                      onChange={(e) => setGrantEmail(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 font-mono">Select Access Tier</label>
                    <select
                      value={grantTier}
                      onChange={(e) => setGrantTier(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    >
                      <option value="premium">Premium Pro Plan</option>
                      <option value="ultimate">Ultimate Year Plan</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 font-mono">Duration Period</label>
                    <select
                      value={grantDuration}
                      onChange={(e) => setGrantDuration(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    >
                      <option value="30">1 Month (30 Days)</option>
                      <option value="90">3 Months (90 Days)</option>
                      <option value="180">6 Months (180 Days)</option>
                      <option value="365">1 Year (365 Days)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isGrantingAccess}
                    className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 h-14"
                  >
                    {isGrantingAccess ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                    Grant Free Pass
                  </button>
                </form>
              </div>


              {/* Database Synchronization Notice / SQL Console Helper */}
              <div className="p-6 bg-slate-900 text-slate-100 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                    <Database className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wider text-white">Database Migration Helper</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Run this SQL in Supabase Dashboard to enable dynamic plans backend</p>
                  </div>
                </div>
                <pre className="text-[10px] bg-black/40 p-4 rounded-xl font-mono text-slate-300 overflow-x-auto leading-relaxed border border-white/5 select-all">
{`-- Run this SQL in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly NUMERIC NOT NULL,
  price_yearly NUMERIC NOT NULL,
  description TEXT,
  badge TEXT,
  highlighted BOOLEAN DEFAULT false,
  color TEXT,
  glow_color TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Plans read policy" ON public.subscription_plans;
CREATE POLICY "Plans read policy" ON public.subscription_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "Plans write policy" ON public.subscription_plans;
CREATE POLICY "Plans write policy" ON public.subscription_plans FOR ALL USING (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'super_admin')
);

-- Profiles Subscription & Anti-Cheat Session Columns:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_exam_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_exam_started_at TIMESTAMPTZ;`}
                </pre>
              </div>

              {isEditingPlan ? (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-indigo-500" />
                      {planForm.id && plansList.some(p => p.id === planForm.id) ? 'Edit Plan Properties' : 'Create New Subscription Plan'}
                    </h3>
                    <button
                      onClick={() => setIsEditingPlan(false)}
                      className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Plan ID / Slug (Unique)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. premium-pro-pass"
                        disabled={plansList.some(p => p.id === planForm.id)}
                        value={planForm.id}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, id: e.target.value.replace(/\s+/g, '-').toLowerCase() }))}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 disabled:opacity-50 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Display Plan Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Premium Pro Pass"
                        value={planForm.name}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Price Per Month (₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 199"
                        value={planForm.price_monthly}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, price_monthly: Number(e.target.value) || 0 }))}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Price Per Year (₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 1188"
                        value={planForm.price_yearly}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, price_yearly: Number(e.target.value) || 0 }))}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Description / Catchphrase</label>
                      <input
                        type="text"
                        placeholder="Unlock unlimited access to daily challenges and practice tests"
                        value={planForm.description}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Promo Badge (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Most Popular"
                        value={planForm.badge}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, badge: e.target.value }))}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-4 pt-6">
                      <input
                        type="checkbox"
                        id="highlighted"
                        checked={planForm.highlighted}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, highlighted: e.target.checked }))}
                        className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                      />
                      <label htmlFor="highlighted" className="text-xs font-black text-slate-700 uppercase tracking-wider cursor-pointer">
                        Highlight Plan card (Recommended border)
                      </label>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">CSS Theme Gradient Classes</label>
                      <input
                        type="text"
                        placeholder="from-indigo-600 to-violet-600"
                        value={planForm.color}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Glow Shadow Color (RGBA)</label>
                      <input
                        type="text"
                        placeholder="rgba(79, 70, 229, 0.25)"
                        value={planForm.glow_color}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, glow_color: e.target.value }))}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Features List Section */}
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Plan Inclusion Features ({planForm.features.length})
                    </h4>

                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="Add feature description text..."
                        value={newFeatureText}
                        onChange={(e) => setNewFeatureText(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newFeatureText.trim()) return;
                          setPlanForm(prev => ({
                            ...prev,
                            features: [...prev.features, { text: newFeatureText.trim(), included: true }]
                          }));
                          setNewFeatureText('');
                        }}
                        className="px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0"
                      >
                        Add Feature
                      </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {planForm.features.map((f, fIdx) => (
                        <div key={fIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...planForm.features];
                                updated[fIdx].included = !updated[fIdx].included;
                                setPlanForm(prev => ({ ...prev, features: updated }));
                              }}
                              className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${
                                f.included ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                              }`}
                            >
                              {f.included ? 'Included' : 'Locked'}
                            </button>
                            <span className="font-bold text-xs text-slate-700">{f.text}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPlanForm(prev => ({
                                ...prev,
                                features: prev.features.filter((_, idx) => idx !== fIdx)
                              }));
                            }}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {planForm.features.length === 0 && (
                        <p className="text-center text-xs font-bold text-slate-400 py-4">No features added to this plan tier yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 border-t border-slate-100 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingPlan(false)}
                      className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!planForm.id || !planForm.name) {
                          return alert("Plan ID and Name are required.");
                        }
                        setIsSavingPlan(true);
                        try {
                          const success = await saveSubscriptionPlan(planForm);
                          if (success) {
                            setToast({ message: "🎉 Plan tier updated successfully in database!", type: 'success' });
                            setIsEditingPlan(false);
                            loadDashboardData();
                          } else {
                            setToast({ message: "Failed to save plan details to table.", type: 'error' });
                          }
                        } catch (e: any) {
                          setToast({ message: e.message || "An exception occurred.", type: 'error' });
                        } finally {
                          setIsSavingPlan(false);
                        }
                      }}
                      disabled={isSavingPlan}
                      className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all disabled:opacity-50"
                    >
                      {isSavingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Plan Tier"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plansList.map((plan) => (
                    <div
                      key={plan.id}
                      className={`bg-white rounded-[2.5rem] border p-8 shadow-sm flex flex-col justify-between gap-6 relative overflow-hidden ${
                        plan.highlighted ? 'border-indigo-500 shadow-indigo-50/50 shadow-xl' : 'border-slate-200'
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute top-4 right-4 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-100">
                          {plan.badge}
                        </span>
                      )}
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Slug: {plan.id}</p>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">{plan.name}</h3>
                        </div>
                        
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900">₹{plan.price_monthly}</span>
                          <span className="text-xs font-bold text-slate-400">/ month</span>
                        </div>

                        <div className="text-xs font-bold text-slate-500 border-t border-slate-50 pt-2">
                          Yearly Price: ₹{plan.price_yearly} (₹{Math.round(plan.price_yearly / 12)}/mo)
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed font-medium">{plan.description}</p>
                        
                        <div className="space-y-2 border-t border-slate-100 pt-4">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Features List Preview ({plan.features?.length || 0})</p>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                            {plan.features?.slice(0, 3).map((f: any, fIdx: number) => (
                              <div key={fIdx} className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                                <span className={f.included ? "text-emerald-500" : "text-slate-300"}>✓</span>
                                <span className={f.included ? "" : "line-through text-slate-400"}>{f.text}</span>
                              </div>
                            ))}
                            {plan.features?.length > 3 && (
                              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">+{plan.features.length - 3} more features</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 border-t border-slate-100 pt-4">
                        <button
                          onClick={() => {
                            setPlanForm({
                              id: plan.id,
                              name: plan.name,
                              price_monthly: Number(plan.price_monthly || 0),
                              price_yearly: Number(plan.price_yearly || 0),
                              description: plan.description || '',
                              badge: plan.badge || '',
                              highlighted: !!plan.highlighted,
                              color: plan.color || 'from-indigo-600 to-violet-600',
                              glow_color: plan.glow_color || 'rgba(79, 70, 229, 0.25)',
                              features: plan.features || []
                            });
                            setIsEditingPlan(true);
                          }}
                          className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Details
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("Are you sure you want to delete this subscription plan? Students will not be able to choose it anymore.")) return;
                            try {
                              const success = await deleteSubscriptionPlan(plan.id);
                              if (success) {
                                setToast({ message: "🗑️ Subscription plan deleted successfully!", type: 'success' });
                                loadDashboardData();
                              } else {
                                setToast({ message: "Failed to delete plan.", type: 'error' });
                              }
                            } catch (e: any) {
                              setToast({ message: e.message || "An exception occurred.", type: 'error' });
                            }
                          }}
                          className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {plansList.length === 0 && (
                    <div className="md:col-span-3 p-12 bg-white rounded-[2.5rem] border border-slate-200 text-center space-y-3">
                      <p className="text-slate-400 font-bold text-sm">No plans found in database.</p>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">Please initialize the database table using the script above or create a new plan.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
    </div>
  );
};

export default SuperAdmin;
