import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, ChevronLeft, ChevronRight, CheckCircle2, Flag, 
  RotateCcw, Send, Menu, X, Brain, ShieldAlert, Lock
} from 'lucide-react';
import { submitExamAttempt, submitDailyAttempt, supabase } from '../supabase';
import MathText from '../components/MathText';
import { cleanQuestionText } from '../utils/sanitizer';
import { recordSeenQuestions } from '../utils/questionTracker';

const VirtualKeypad = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', '.'];
  
  const handleKeyClick = (key: string) => {
    let current = String(value || '');
    if (key === '-') {
      if (current.startsWith('-')) {
        onChange(current.substring(1));
      } else {
        onChange('-' + current);
      }
    } else if (key === '.') {
      if (!current.includes('.')) {
        onChange(current + '.');
      }
    } else {
      onChange(current + key);
    }
  };

  const handleBackspace = () => {
    let current = String(value || '');
    if (current.length > 0) {
      onChange(current.slice(0, -1));
    }
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200/60 shadow-sm max-w-xs mx-auto space-y-3 font-mono mt-4">
      <div className="grid grid-cols-3 gap-2">
        {keys.map(k => (
          <button
            key={k}
            type="button"
            onClick={() => handleKeyClick(k)}
            className="p-3 bg-white active:bg-slate-200 text-slate-800 rounded-xl font-black text-md border border-slate-200 shadow-sm active:scale-95 transition-all flex items-center justify-center h-12"
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={handleBackspace}
          className="p-3 bg-rose-50 active:bg-rose-100 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-wider border border-rose-200 shadow-sm col-span-2 active:scale-95 transition-all flex items-center justify-center h-12"
        >
          Backspace
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="p-3 bg-slate-200 active:bg-slate-350 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-wider border border-slate-300 shadow-sm active:scale-95 transition-all flex items-center justify-center h-12"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

const ExamPortal = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [status, setStatus] = useState<Record<number, 'answered' | 'marked' | 'marked-answered' | 'not-visited' | 'not-answered'>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'pdf' | 'answers'>('pdf');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSessionBlocked, setIsSessionBlocked] = useState(false);
  const [sessionCheckLoading, setSessionCheckLoading] = useState(true);

  let profile: any = {};
  try {
    const raw = localStorage.getItem('user_profile');
    if (raw && raw !== 'undefined') profile = JSON.parse(raw);
  } catch (e) {
    console.error("Safe profile parse failed in ExamPortal:", e);
  }

  const isRestricted = profile.role !== 'super_admin';

  // Security and Lockout State
  const [securityWarnings, setSecurityWarnings] = useState(3);
  const [activeViolation, setActiveViolation] = useState<'fullscreen' | 'focus' | 'tab' | null>(null);
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(isRestricted && !!document.fullscreenElement);
  const [isInitialGateActive, setIsInitialGateActive] = useState(isRestricted && !document.fullscreenElement);

  const handleResumeExam = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setTimeout(() => {
        setActiveViolation(null);
      }, 300);
    } catch (err) {
      console.warn("Could not request fullscreen on resume:", err);
      alert("Fullscreen mode is required to resume the exam. Please ensure you are not in split-screen mode.");
    }
  };

  const [isOverridingSession, setIsOverridingSession] = useState(false);

  const handleOverrideSession = async () => {
    setIsOverridingSession(true);
    try {
      let deviceToken = localStorage.getItem('exam_device_token');
      if (!deviceToken) {
        deviceToken = `dev_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
        localStorage.setItem('exam_device_token', deviceToken);
      }

      if (supabase && profile.id) {
        const { error } = await supabase
          .from('profiles')
          .update({
            current_exam_token: deviceToken,
            current_exam_started_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (error) {
          alert("Failed to override session: " + error.message);
          return;
        }

        // Release local block
        setIsSessionBlocked(false);
        // Force them to re-authenticate fullscreen
        setIsInitialGateActive(isRestricted && !document.fullscreenElement);
      }
    } catch (err: any) {
      alert("Error overriding session: " + (err.message || err));
    } finally {
      setIsOverridingSession(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      let score = 0;
      const results = questions.map((q, i) => {
        const userAnswer = answers[i];
        const isCorrect = userAnswer === q.correctAnswer;
        if (isCorrect) score += 4;
        else if (userAnswer !== undefined) score -= 1;
        
        return {
          ...q,
          userAnswer,
          isCorrect
        };
      });

      const attemptData = {
        user_id: profile.id,
        user_name: profile.full_name,
        score,
        total_marks: questions.length * 4,
        accuracy: questions.length > 0 ? Math.round((results.filter(r => r.isCorrect).length / questions.length) * 100) : 0,
        config,
        paid: config?.paid || false,
        questions: results,
        submitted_at: new Date().toISOString()
      };

      let submitResult;
      if (config && config.type === 'Daily Challenge') {
        const dailyAttemptData = {
          user_id: profile.id,
          challenge_id: config.challenge_id,
          score,
          total_marks: questions.length * 4,
          paid: config.paid || false,
          stats: {
            accuracy: attemptData.accuracy
          },
          attempt_data: results,
          submitted_at: new Date().toISOString()
        };
        submitResult = await submitDailyAttempt(dailyAttemptData);
        
        // If independent, simulate emailing results
        const isIndependent = profile.role === 'student' && !profile.admin_id;
        if (isIndependent && (!submitResult || !submitResult.error)) {
          localStorage.setItem('show_email_notification', 'true');
        }
      } else {
        submitResult = await submitExamAttempt(attemptData);
      }

      if (submitResult && submitResult.error) {
        console.error("Submission failed to save in Database:", submitResult.error);
        alert(`Submission failed: ${submitResult.error.message || JSON.stringify(submitResult.error)}`);
        setIsSubmitting(false);
        return;
      }
      
      // Clear database session locks
      if (supabase && profile.id) {
        try {
          await supabase
            .from('profiles')
            .update({
              current_exam_token: null,
              current_exam_started_at: null
            })
            .eq('id', profile.id);
        } catch (dbErr) {
          console.warn("Could not clear database session lock on submission:", dbErr);
        }
      }

      // Android App Bridge Stop lockdown (Unlocks app screen on completion)
      if ((window as any).AndroidBridge && typeof (window as any).AndroidBridge.stopLockdown === 'function') {
        try {
          (window as any).AndroidBridge.stopLockdown();
        } catch (err) {
          console.warn("Android bridge stopLockdown failed:", err);
        }
      }
      
      // Clear session
      localStorage.removeItem('active_session');
      localStorage.removeItem('active_exam_questions');
      localStorage.removeItem('active_exam_config');
      
      // Clear dynamic start time keys
      if (config) {
        const sessionKey = `start_time_${config.type}_${config.date || config.chapter || 'practice'}`;
        localStorage.removeItem(sessionKey);
      }
      
      // Store result for analytics page
      localStorage.setItem('last_exam_result', JSON.stringify(attemptData));
      
      navigate('/results');
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Submission failed. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }, [questions, answers, config, profile, navigate]);

  // Anti-Cheat / Integrity constraints
  useEffect(() => {
    if (!isRestricted || questions.length === 0) return;

    // Android App Bridge Start lockdown (Locks app screen on custom WebView wrappers)
    if ((window as any).AndroidBridge && typeof (window as any).AndroidBridge.startLockdown === 'function') {
      try {
        (window as any).AndroidBridge.startLockdown();
      } catch (err) {
        console.warn("Android bridge startLockdown failed:", err);
      }
    }

    // 1. Prevent right-click context menu and keyboard defaults
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        return;
      }
      
      // Allow numerical and decimal typing for numerical input elements
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const allowedKeys = ['0','1','2','3','4','5','6','7','8','9','.','-','Backspace','Delete','ArrowLeft','ArrowRight','Tab'];
        if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
          return;
        }
      }

      e.preventDefault();
      return false;
    };

    // Prevent Copy, Cut, Paste, and Selection
    const handleCopy = (e: ClipboardEvent) => e.preventDefault();
    const handleCut = (e: ClipboardEvent) => e.preventDefault();
    const handlePaste = (e: ClipboardEvent) => e.preventDefault();
    const handleSelectStart = (e: Event) => e.preventDefault();

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('selectstart', handleSelectStart);

    // Violation trigger function
    const triggerViolation = (type: 'fullscreen' | 'focus' | 'tab') => {
      // Ignore checks if initial gate is still active
      if (isInitialGateActive) return;

      const isAlreadyViolated = document.getElementById('security-lockout-overlay') !== null;
      if (isAlreadyViolated) return;

      setActiveViolation(type);
      setSecurityWarnings((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          handleSubmit();
          return 0;
        }
        return next;
      });
    };

    // 2. Fullscreen Change
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setHasEnteredFullscreen(true);
      } else if (hasEnteredFullscreen) {
        triggerViolation('fullscreen');
      }
    };

    // 3. Tab focus / Visibility warning checks
    const handleVisibility = () => {
      if (document.hidden) {
        triggerViolation('tab');
      }
    };

    // 4. Window focus loss (switching applications)
    const handleBlur = () => {
      triggerViolation('focus');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);

    // 5. Back navigation / History locks
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      triggerViolation('focus');
    };
    window.addEventListener('popstate', handlePopState);

    // 6. Page exit warnings
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Active exam in progress. Leaving will forfeit your attempt.";
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isRestricted, questions.length, isInitialGateActive, hasEnteredFullscreen, handleSubmit]);

  

  

  // Session Lock / Anti-Cheat Check
  useEffect(() => {
    const verifyAndLockSession = async () => {
      if (!supabase || !profile.id) {
        setSessionCheckLoading(false);
        return;
      }

      try {
        // 1. Get unique device token from localStorage (create one if not exists)
        let deviceToken = localStorage.getItem('exam_device_token');
        if (!deviceToken) {
          deviceToken = `dev_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
          localStorage.setItem('exam_device_token', deviceToken);
        }

        // 2. Query user's current session tokens from supabase
        const { data: dbProfile, error } = await supabase
          .from('profiles')
          .select('current_exam_token, current_exam_started_at')
          .eq('id', profile.id)
          .maybeSingle();

        if (error) throw error;

        if (dbProfile) {
          const dbToken = dbProfile.current_exam_token;
          const dbStartedAt = dbProfile.current_exam_started_at;

          // Check if session has expired (active window is 3.5 hours)
          const isExpired = dbStartedAt 
            ? (Date.now() - new Date(dbStartedAt).getTime() > 3.5 * 60 * 60 * 1000)
            : true;

          if (dbToken && dbToken !== deviceToken && !isExpired) {
            // Block user - session is active on another device!
            setIsSessionBlocked(true);
            setSessionCheckLoading(false);
            return;
          }
        }

        // 3. Otherwise, session is free or it belongs to the same device!
        // Lock/renew the session in the database
        const { error: lockError } = await supabase
          .from('profiles')
          .update({
            current_exam_token: deviceToken,
            current_exam_started_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (lockError) console.warn("Failed to set exam session lock in database:", lockError.message);

      } catch (err) {
        console.warn("Anti-cheat session check bypassed due to network error:", err);
      } finally {
        setSessionCheckLoading(false);
      }
    };

    verifyAndLockSession();
  }, [profile.id]);

  // Periodic session lock check (polls Supabase every 10 seconds to verify lock has not been stolen)
  useEffect(() => {
    if (!supabase || !profile.id || isSessionBlocked || isInitialGateActive) return;

    const interval = setInterval(async () => {
      try {
        const deviceToken = localStorage.getItem('exam_device_token');
        const { data: dbProfile, error } = await supabase
          .from('profiles')
          .select('current_exam_token')
          .eq('id', profile.id)
          .maybeSingle();

        if (!error && dbProfile) {
          const dbToken = dbProfile.current_exam_token;
          if (dbToken && dbToken !== deviceToken) {
            // Our session was hijacked/terminated by another device!
            setIsSessionBlocked(true);
            
            // Exit fullscreen if we are currently in it
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn("Periodic session check error:", err);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [profile.id, isSessionBlocked, isInitialGateActive]);

  // Load Exam Data
  useEffect(() => {
    const activeSession = localStorage.getItem('active_session');
    const dailyChallenge = localStorage.getItem('active_exam_questions');
    const dailyConfig = localStorage.getItem('active_exam_config');

    let examQuestions: any[] = [];
    let examConfig: any = null;
    let elapsedSeconds = 0;

    if (activeSession) {
      const session = JSON.parse(activeSession);
      examQuestions = session.questions || [];
      examConfig = { type: session.type, duration: session.durationMinutes, paid: session.paid || false };
      if (session.pdfUrl) {
        setPdfUrl(session.pdfUrl);
      }
    } else if (dailyChallenge && dailyConfig) {
      examQuestions = JSON.parse(dailyChallenge) || [];
      examConfig = JSON.parse(dailyConfig);
    }

    if (!examQuestions || examQuestions.length === 0) {
      navigate('/');
      return;
    }

    // Sanitize and clean all questions dynamically

    examQuestions = examQuestions.map(q => {
      const cleanedOpts: any = {};
      if (q.options && typeof q.options === 'object') {
        Object.entries(q.options).forEach(([k, v]) => {
          cleanedOpts[k] = typeof v === 'string' ? cleanQuestionText(v) : v;
        });
      }
      return {
        ...q,
        statement: cleanQuestionText(q.statement || q.question || ''),
        options: cleanedOpts,
        solution: cleanQuestionText(q.solution || q.explanation || '')
      };
    });

    recordSeenQuestions(examQuestions);

    let durationMins = (examConfig && examConfig.duration) || 30;
    if (examQuestions.length >= 60 || (examConfig && examConfig.type && (examConfig.type.includes('PYQ') || examConfig.type.includes('Full')))) {
      durationMins = 180;
    }
    const totalDurationSeconds = durationMins * 60;

    if (activeSession) {
      const session = JSON.parse(activeSession);
      if (!session.startTime || (Math.floor((Date.now() - session.startTime) / 1000) >= totalDurationSeconds)) {
        session.startTime = Date.now();
        localStorage.setItem('active_session', JSON.stringify(session));
      }
      elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
    } else if (dailyConfig) {
      const sessionKey = `start_time_${examConfig.type}_${examConfig.date || examConfig.chapter || 'practice'}`;
      let savedStart = localStorage.getItem(sessionKey);
      if (!savedStart || (Math.floor((Date.now() - parseInt(savedStart)) / 1000) >= totalDurationSeconds)) {
        savedStart = Date.now().toString();
        localStorage.setItem(sessionKey, savedStart);
      }
      elapsedSeconds = Math.floor((Date.now() - parseInt(savedStart)) / 1000);
    }

    setQuestions(examQuestions);
    setConfig(examConfig);
    
    const remaining = Math.max(1, totalDurationSeconds - elapsedSeconds);
    setTimeLeft(remaining);

    // Initialize status
    const initialStatus: any = {};
    examQuestions.forEach((_: any, i: number) => {
      initialStatus[i] = 'not-visited';
    });
    initialStatus[0] = 'not-answered';
    setStatus(initialStatus);
  }, [navigate]);

  // Timer Logic
  useEffect(() => {
    if (questions.length === 0) return;

    const timer = setInterval(() => {
      let durationMins = config?.duration || 180;
      if (questions.length >= 60 || (config?.type && (config.type.includes('PYQ') || config.type.includes('Full')))) {
        durationMins = 180;
      }
      let totalDurationSeconds = durationMins * 60;
      let startTime = null;

      const activeSession = localStorage.getItem('active_session');
      if (activeSession) {
        try {
          const session = JSON.parse(activeSession);
          startTime = session.startTime;
        } catch (e) {}
      } else if (config) {
        const sessionKey = `start_time_${config.type}_${config.date || config.chapter || 'practice'}`;
        const savedStart = localStorage.getItem(sessionKey);
        if (savedStart) startTime = parseInt(savedStart);
      }

      if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, totalDurationSeconds - elapsed);
        
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(timer);
          handleSubmit();
        }
      } else {
        // Fallback tick
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [questions.length, config, handleSubmit]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (val: any) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: val }));
    if (status[currentIndex] === 'marked' || status[currentIndex] === 'marked-answered') {
        setStatus(prev => ({ ...prev, [currentIndex]: 'marked-answered' }));
    } else {
        setStatus(prev => ({ ...prev, [currentIndex]: 'answered' }));
    }
  };

  const handleMarkForReview = () => {
    if (answers[currentIndex] !== undefined) {
        setStatus(prev => ({ ...prev, [currentIndex]: 'marked-answered' }));
    } else {
        setStatus(prev => ({ ...prev, [currentIndex]: 'marked' }));
    }
    handleNext();
  };

  const handleClear = () => {
    const newAnswers = { ...answers };
    delete newAnswers[currentIndex];
    setAnswers(newAnswers);
    setStatus(prev => ({ ...prev, [currentIndex]: 'not-answered' }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      if (status[nextIdx] === 'not-visited') {
        setStatus(prev => ({ ...prev, [nextIdx]: 'not-answered' }));
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };



  if (sessionCheckLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-[300] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Securing Testing Terminal...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center z-[300] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Initializing Exam Sheets...</p>
      </div>
    );
  }

  if (isInitialGateActive) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 z-[300] text-center select-none">
        <div className="bg-slate-900 border border-indigo-500/20 rounded-[2.5rem] w-full max-w-md p-10 space-y-8 shadow-2xl shadow-indigo-950/20 animate-in zoom-in duration-300">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-3xl border border-indigo-500/20 flex items-center justify-center mx-auto shadow-lg animate-pulse">
              <Lock className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight uppercase">Terminal Lock Required</h3>
            <p className="text-indigo-400 font-extrabold uppercase tracking-widest text-[10px] bg-indigo-500/10 py-1.5 px-4 rounded-full inline-block border border-indigo-500/20">
              Exam Integrity Verification
            </p>
            <p className="pt-2 text-slate-300 text-xs font-medium leading-relaxed">
              To start this competitive mock examination, your browser terminal must be locked in Fullscreen Mode. This prevents switching tabs or opening other applications during the test.
            </p>
          </div>

          <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 text-left space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Lockdown Parameters</p>
            <ul className="text-[10px] text-slate-400 font-bold space-y-1.5 list-disc list-inside">
              <li>Automatic Fullscreen Mode is enforced.</li>
              <li>Tab/Application switches will trigger violations.</li>
              <li>Exiting fullscreen or losing focus reduces integrity attempts.</li>
              <li>3 security warnings will result in auto-submission.</li>
            </ul>
          </div>

          <button 
            onClick={async () => {
              try {
                if (!document.fullscreenElement) {
                  await document.documentElement.requestFullscreen();
                }
                setTimeout(() => {
                  setIsInitialGateActive(false);
                  setHasEnteredFullscreen(true);
                }, 300);
              } catch (err) {
                console.warn("Could not request fullscreen on start:", err);
                alert("Fullscreen mode is required to take this exam. Please ensure you are not in split-screen or windowed mode.");
              }
            }}
            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/40 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            Secure Terminal & Start Exam
          </button>
        </div>
      </div>
    );
  }

  // Dynamically extract and order subjects from exam questions
  const detectedSubjects = Array.from(new Set(questions.map(q => q.subject).filter(Boolean)));
  const defaultOrder = config?.type?.includes('NEET') 
    ? ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'] 
    : ['Physics', 'Chemistry', 'Mathematics'];
  
  const subjects = (defaultOrder as any[]).filter(s => (detectedSubjects as any[]).includes(s))
    .concat((detectedSubjects as any[]).filter(s => !(defaultOrder as any[]).includes(s)));
    
  if (subjects.length === 0) {
    subjects.push(...defaultOrder);
  }

  const currentSubject = currentQuestion?.subject || subjects[0];

  if (isSessionBlocked) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 z-[300] text-center select-none">
        <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl border border-red-500/20 flex items-center justify-center mb-6 shadow-2xl shadow-red-950 animate-bounce">
          <Brain className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Active Session Locked</h2>
        <p className="text-red-400 text-xs font-black uppercase tracking-widest mb-6">Error Code: SEC_DUPLICATE_LOGIN</p>
        <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 max-w-md space-y-4 mb-8">
          <p className="text-xs text-slate-300 font-bold leading-relaxed">
            By system integrity policy, you are not allowed to open two exam sessions simultaneously or login from a second system (Android/Web/Mobile) while taking a mock test.
          </p>
          <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">
            Your active session token is locked to another browser window or device.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center px-4">
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
          <button
            onClick={handleOverrideSession}
            disabled={isOverridingSession}
            className="flex-1 px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-550 hover:to-rose-550 disabled:from-red-800 disabled:to-rose-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isOverridingSession ? 'Overriding...' : 'Start Here (Override)'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col z-[100] overflow-hidden">
      {/* Top Header */}
      <header className="bg-slate-900 text-white h-16 px-6 flex items-center justify-between shrink-0 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Brain className="w-5 h-5" />
          </div>
          <h1 className="font-black text-sm uppercase tracking-widest hidden sm:block">
            {config?.type || 'JEE Simulation'}
          </h1>
        </div>



        {isRestricted && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">Terminal Integrity Locked ({securityWarnings} warnings left)</span>
          </div>
        )}

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-3 px-4 py-1.5 rounded-full border ${
            timeLeft < 300 ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' : 'bg-white/10 border-white/10 text-indigo-300'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
          </div>
          
          <button 
            onClick={() => setShowSubmitConfirm(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20"
          >
            Submit
          </button>
        </div>
      </header>

      {/* Subject Bar */}
      <div className="bg-white border-b border-slate-200 h-12 flex items-center px-4 gap-2 shrink-0 overflow-x-auto no-scrollbar">
        {subjects.map(sub => {
          const subQuestions = questions.filter(q => q.subject === sub);
          if (subQuestions.length === 0) return null;
          const isActive = currentSubject === sub;
          return (
            <button
              key={sub}
              onClick={() => {
                const firstIdx = questions.findIndex(q => q.subject === sub);
                if (firstIdx !== -1) setCurrentIndex(firstIdx);
              }}
              className={`px-6 h-full text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                isActive ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50' : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {sub} ({subQuestions.length})
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {pdfUrl ? (
          <>
            {/* Left side: PDF Viewer */}
            <div className={`w-full lg:w-[65%] border-r border-slate-200 h-full flex flex-col bg-slate-100 ${
              mobileView === 'pdf' ? 'flex' : 'hidden lg:flex'
            }`}>
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full border-0"
                title="JEE Question Paper PDF"
              />
            </div>

            {/* Right side: OMR Answer Panel */}
            <div className={`w-full lg:w-[35%] flex flex-col h-full bg-slate-50 ${
              mobileView === 'answers' ? 'flex' : 'hidden lg:flex'
            }`}>
              {/* Question Subject & Header */}
              <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-sm">
                <span className="px-4 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                  Question {currentIndex + 1}
                </span>
                <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest">
                  {currentQuestion?.subject}
                </span>
              </div>

              {/* OMR Options */}
              <div className="flex-1 overflow-y-auto p-8 flex flex-col justify-center space-y-8 bg-slate-50/50">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Answer in OMR Sheet</p>
                  <p className="text-slate-500 font-medium text-xs leading-relaxed">
                    Read Question {currentIndex + 1} from the PDF on the left, then bubble your answer below.
                  </p>
                </div>

                {currentQuestion?.type === 'MCQ' ? (
                  <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto w-full">
                    {['A', 'B', 'C', 'D'].map((key) => (
                      <button
                        key={key}
                        onClick={() => handleAnswer(key)}
                        className={`p-6 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-2 group ${
                          answers[currentIndex] === key
                            ? 'border-indigo-600 bg-indigo-50 shadow-md scale-105'
                            : 'border-slate-200 hover:border-slate-350 bg-white'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors ${
                          answers[currentIndex] === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {key}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="max-w-xs mx-auto w-full space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Numerical Response</p>
                    <input 
                      type="text"
                      readOnly={isRestricted}
                      value={answers[currentIndex] || ''}
                      onChange={(e) => handleAnswer(e.target.value)}
                      placeholder={isRestricted ? "Use keypad below..." : "Enter response..."}
                      className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl font-black text-xl text-center text-slate-900 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    />
                    <VirtualKeypad value={answers[currentIndex] || ''} onChange={(val) => handleAnswer(val)} />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Question Area */
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                 <span className="px-4 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                   Question {currentIndex + 1}
                 </span>
                 <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> +4 Correct</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> -1 Wrong</span>
                 </div>
              </div>

              <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-10">
                 <div className="prose prose-slate max-w-none">
                    <MathText className="text-xl font-bold text-slate-800 leading-relaxed">
                      {currentQuestion?.statement}
                    </MathText>
                 </div>

                 {currentQuestion?.type === 'MCQ' ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {Object.entries(currentQuestion?.options || {}).map(([key, val]: [string, any]) => (
                       <button
                         key={key}
                         onClick={() => handleAnswer(key)}
                         className={`p-6 rounded-2xl border-2 text-left transition-all flex items-center gap-4 group ${
                           answers[currentIndex] === key
                             ? 'border-indigo-600 bg-indigo-50 shadow-md'
                             : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                         }`}
                       >
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition-colors ${
                           answers[currentIndex] === key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'
                         }`}>
                           {key}
                         </div>
                         <MathText inlineOnly className={`font-bold text-sm ${answers[currentIndex] === key ? 'text-indigo-900' : 'text-slate-600'}`}>
                           {val}
                         </MathText>
                       </button>
                     ))}
                   </div>
                 ) : (
                    <div className="space-y-4">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Numerical Answer</p>
                      <input 
                        type="text"
                        readOnly={isRestricted}
                        value={answers[currentIndex] || ''}
                        onChange={(e) => handleAnswer(e.target.value)}
                        placeholder={isRestricted ? "Use keypad below..." : "Enter your numerical response..."}
                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-900 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                      />
                      <VirtualKeypad value={answers[currentIndex] || ''} onChange={(val) => handleAnswer(val)} />
                    </div>
                 )}
              </div>
            </div>
          </div>
        )}

        {/* Question Palette - Desktop Sidebar */}
        <aside className={`fixed lg:relative inset-y-0 lg:inset-auto right-0 lg:right-auto z-40 lg:z-0 w-80 h-full bg-white border-l border-slate-200 transform ${showPalette ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 transition-transform duration-300 flex flex-col shadow-2xl lg:shadow-none`}>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
             <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Palette</h3>
             <button onClick={() => setShowPalette(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600">
               <X className="w-5 h-5" />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="grid grid-cols-5 gap-3">
              {questions.map((_, i) => {
                const s = status[i];
                let bg = 'bg-slate-100 text-slate-400';
                if (s === 'answered') bg = 'bg-emerald-500 text-white shadow-lg shadow-emerald-200';
                if (s === 'marked') bg = 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 rounded-full';
                if (s === 'marked-answered') bg = 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 relative after:content-[""] after:absolute after:bottom-0 after:right-0 after:w-3 after:h-3 after:bg-emerald-500 after:rounded-full after:border-2 after:border-white';
                if (s === 'not-answered') bg = 'bg-rose-500 text-white shadow-lg shadow-rose-200';
                
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all hover:scale-110 ${bg} ${
                      currentIndex === i ? 'ring-4 ring-indigo-600/20 scale-110' : ''
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
             <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
                   <div className="w-3 h-3 bg-emerald-500 rounded-md" /> Answered
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
                   <div className="w-3 h-3 bg-rose-500 rounded-md" /> Not Answered
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
                   <div className="w-3 h-3 bg-indigo-600 rounded-full" /> Marked
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
                   <div className="w-3 h-3 bg-slate-200 rounded-md" /> Not Visited
                </div>
             </div>
          </div>
        </aside>
      </div>

      {/* Bottom Controls */}
      <footer className="bg-white border-t border-slate-200 p-4 md:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {pdfUrl && (
            <button
              onClick={() => setMobileView(mobileView === 'pdf' ? 'answers' : 'pdf')}
              className="lg:hidden px-6 py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              {mobileView === 'pdf' ? 'Show OMR' : 'Show PDF'}
            </button>
          )}
          <button 
            onClick={handleMarkForReview}
            className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 hidden sm:flex items-center gap-2"
          >
            <Flag className="w-3.5 h-3.5" /> Mark for Review
          </button>
          <button 
            onClick={handleClear}
            className="px-6 py-3 text-slate-400 hover:text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowPalette(true)}
            className="lg:hidden p-3 bg-slate-100 text-slate-600 rounded-xl"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-3 bg-slate-100 text-slate-600 rounded-xl disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10"
            >
              Save & Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 space-y-8 shadow-2xl border border-slate-200 animate-in zoom-in duration-300">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Send className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Final Submission</h3>
              <p className="text-slate-500 font-medium">Are you sure you want to end the examination? Your responses will be analyzed by AI.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
               <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Answered</p>
                  <p className="text-2xl font-black text-slate-900">{Object.keys(answers).length}</p>
               </div>
               <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining</p>
                  <p className="text-2xl font-black text-slate-900">{questions.length - Object.keys(answers).length}</p>
               </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all"
              >
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Submission
              </button>
              <button 
                onClick={() => setShowSubmitConfirm(false)}
                className="w-full py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all"
              >
                Return to Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {activeViolation && (
        <div 
          id="security-lockout-overlay"
          className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 text-center select-none"
        >
          <div className="bg-slate-900 border border-red-500/30 rounded-[2.5rem] w-full max-w-md p-10 space-y-8 shadow-2xl shadow-red-950/20 animate-in zoom-in duration-300">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl border border-red-500/20 flex items-center justify-center mx-auto shadow-lg animate-pulse">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight uppercase">Terminal Blocked</h3>
              <p className="text-red-400 font-extrabold uppercase tracking-widest text-[10px] bg-red-500/10 py-1.5 px-4 rounded-full inline-block border border-red-500/20">
                Security Violation Detected
              </p>
              
              <div className="pt-2 text-slate-300 text-sm font-medium leading-relaxed">
                {activeViolation === 'fullscreen' && "You exited Fullscreen mode. To maintain test integrity, the exam requires you to stay in fullscreen."}
                {activeViolation === 'focus' && "The exam terminal lost focus. Switching windows, clicking external notifications, or launching external tools is blocked."}
                {activeViolation === 'tab' && "You switched browser tabs. This action is recorded and blocked."}
              </div>
            </div>

            <div className="bg-slate-950/50 p-6 rounded-3xl border border-white/5 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Integrity Status</p>
              <div className="flex items-center justify-center gap-3">
                {[1, 2, 3].map((num) => {
                  const isActive = num <= securityWarnings;
                  return (
                    <div 
                      key={num} 
                      className={`w-10 h-3 rounded-full transition-all duration-300 ${
                        isActive ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-slate-800'
                      }`} 
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-red-400 font-extrabold uppercase tracking-wider mt-1">
                {securityWarnings} of 3 attempts remaining
              </p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleResumeExam}
                className="w-full py-5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-900/40 flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <Lock className="w-4 h-4" />
                Resume & Re-Lock Terminal
              </button>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                Exiting again or losing warnings will trigger an automatic submission of your exam paper.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamPortal;
