
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, BookOpen, Clock, AlertTriangle, CheckCircle2, Loader2, PlayCircle, Atom, Sliders, Hash, RotateCcw, Database, DollarSign, X, Sparkles } from 'lucide-react';
import { ExamType, Subject } from '../types';
import { initiateRazorpayPayment, checkSubscriptionActive } from '../utils/payment';

const ExamSetup = () => {
  const navigate = useNavigate();
  const activeStream = localStorage.getItem('active_stream') || 'JEE Main & Advanced';
  const isNeet = activeStream.toLowerCase().includes('neet');

  const [examType, setExamType] = useState<ExamType>(() => isNeet ? ExamType.NEET : ExamType.Main);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparedQuestions, setPreparedQuestions] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>(() => {
    return isNeet 
      ? [Subject.Physics, Subject.Chemistry, Subject.Botany, Subject.Zoology] 
      : [Subject.Physics, Subject.Chemistry, Subject.Mathematics];
  });
  
  const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const isIndependent = profile.role === 'student' && !profile.admin_id;
  const needsPayment = isIndependent && profile.has_used_free_test && !checkSubscriptionActive(profile);

  const initialCounts = (isIndependent && !profile.has_used_free_test) 
    ? (isNeet ? { mcq: 10, numerical: 0 } : { mcq: 8, numerical: 2 }) 
    : (isNeet ? { mcq: 45, numerical: 0 } : { mcq: 25, numerical: 5 });
  const [questionCounts, setQuestionCounts] = useState(initialCounts);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [preparationLogs, setPreparationLogs] = useState<string[]>([]);
  
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleUnlockMock = async () => {
    setIsProcessingPayment(true);
    try {
      const receipt = `mock_${profile.id}_${Date.now()}`;
      const success = await initiateRazorpayPayment(
        10,
        profile.email || 'student@example.com',
        profile.full_name || 'Aspirant',
        receipt
      );
      if (success) {
        setIsPaid(true);
        alert("Payment verified! Your premium mock exam is now unlocked.");
      } else {
        alert("Payment verification failed or was cancelled.");
      }
    } catch (err: any) {
      console.error("Razorpay error:", err);
      alert(`Razorpay error: ${err.message || err}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const [progress, setProgress] = useState<Record<string, 'pending' | 'loading' | 'done' | 'error'>>(() => {
    return isNeet ? {
      Physics: 'pending',
      Chemistry: 'pending',
      Botany: 'pending',
      Zoology: 'pending'
    } : {
      Physics: 'pending',
      Chemistry: 'pending',
      Mathematics: 'pending'
    };
  });

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');

  const preparePaper = async () => {
    if (needsPayment && !isPaid) {
      handleUnlockMock();
      return;
    }

    setIsPreparing(true);
    setPreparedQuestions([]);
    setPreparationLogs([`Initializing paper generation for ${examType}...`]);
    
    const resetProgress = { ...progress };
    selectedSubjects.forEach(s => resetProgress[s] = 'pending');
    setProgress(resetProgress);
    
    try {
      const totalPerSubject = questionCounts.mcq + questionCounts.numerical;
      const { saveQuestionsToDB, fetchQuestionsFromDB } = await import('../supabase');
      const savedKey = localStorage.getItem('user_gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY;

      const generationPromises = selectedSubjects.map(async (sub) => {
        setProgress(prev => ({ ...prev, [sub]: 'loading' }));
        
        let questions: any[] = [];
        let source = "Database Engine";

        if (savedKey) {
          try {
            setPreparationLogs(prev => [...prev, `Attempting AI generation for ${sub} (${difficulty} Level)...`]);
            const { getStreamGeminiService } = await import('../streamGeminiDispatcher');
            const service = await getStreamGeminiService(activeStream);
            questions = await service.generateJEEQuestions(
                sub, 
                totalPerSubject, 
                examType,
                undefined,
                difficulty,
                undefined,
                { mcq: questionCounts.mcq, numerical: questionCounts.numerical }
            );

            if (questions && questions.length > 0) {
                source = "AI Engine";
                setPreparationLogs(prev => [...prev, `Saving ${sub} AI questions to database...`]);
                await saveQuestionsToDB(questions);
            }
          } catch (aiErr: any) {
            setPreparationLogs(prev => [...prev, `⚠️ AI generation unavailable for ${sub}. Fetching from DB...`]);
          }
        }

        if (!questions || questions.length === 0) {
          setPreparationLogs(prev => [...prev, `Fetching ${difficulty} level JEE questions for ${sub} from Question Bank...`]);
          source = "Database Question Bank";
          try {
            questions = await fetchQuestionsFromDB(
              sub,
              undefined,
              undefined,
              questionCounts.mcq,
              questionCounts.numerical,
              difficulty
            );
          } catch (dbErr: any) {
            console.error(`[ExamSetup] Database fetch failed for ${sub}:`, dbErr);
          }
        }

        if (!questions || questions.length === 0) {
          try {
            const { getStreamGeminiService } = await import('../streamGeminiDispatcher');
            const service = await getStreamGeminiService(activeStream);
            source = "Synthesized Exam Bank";
            questions = service.generateFallbackQuestions(sub, questionCounts.mcq, questionCounts.numerical);
            await saveQuestionsToDB(questions);
          } catch (fbErr) {
            console.error(`[ExamSetup] Offline fallback synthesis failed for ${sub}:`, fbErr);
          }
        }
        
        if (questions && questions.length > 0) {
            setPreparationLogs(prev => [...prev, `✅ ${sub} prepared via ${source}`]);
            setProgress(prev => ({ ...prev, [sub]: 'done' }));
            return questions;
        } else {
            setPreparationLogs(prev => [...prev, `❌ ${sub} failed completely.`]);
            setProgress(prev => ({ ...prev, [sub]: 'error' }));
            return [];
        }
      });

      const results = await Promise.all(generationPromises);
      const allPrepared = results.flat();
      
      setPreparedQuestions(allPrepared);
      setPreparationLogs(prev => [...prev, "Paper Synthesis Complete."]);
    } catch (err: any) {
      console.error(err);
      setPreparationLogs(prev => [...prev, `Critical Error: ${err.message}`]);
    } finally {
      setIsPreparing(false);
    }
  };

  const launchExam = async () => {
    if (isIndependent && !profile.has_used_free_test) {
      try {
        const { supabase } = await import('../supabase');
        if (supabase) {
          await supabase.from('profiles').update({ has_used_free_test: true }).eq('id', profile.id);
          const updatedProfile = { ...profile, has_used_free_test: true };
          localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
        }
      } catch (err) {
        console.error("Error setting free test status:", err);
      }
    }

    let finalQuestions = preparedQuestions;
    try {
      const { filterUniqueQuestions, recordSeenQuestions } = await import('../utils/questionTracker');
      finalQuestions = filterUniqueQuestions(preparedQuestions);
      recordSeenQuestions(finalQuestions);
    } catch (trackerErr) {
      console.warn("Question tracker error in launchExam, proceeding with prepared questions:", trackerErr);
    }

    if (!finalQuestions || finalQuestions.length === 0) {
      finalQuestions = preparedQuestions;
    }

    const qCount = finalQuestions.length;
    const duration = Math.ceil(qCount * 2);
    const sessionData = {
      type: examType,
      questions: finalQuestions,
      startTime: Date.now(),
      durationMinutes: duration
    };
    localStorage.setItem('active_session', JSON.stringify(sessionData));
    navigate('/exam-portal');
  };

  const applyPreset = (mcq: number, num: number) => {
      setQuestionCounts({ mcq, numerical: isNeet ? 0 : num });
  };

  const totalQuestions = selectedSubjects.length * (questionCounts.mcq + questionCounts.numerical);
  const estimatedTime = isNeet ? totalQuestions : Math.ceil(totalQuestions * 2);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {isIndependent && !profile.has_used_free_test && (
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-100 flex items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Free Mock Test Active</h3>
              <p className="text-xs font-medium text-indigo-100 leading-relaxed">
                Your first mock test is free and locked to exactly **10 questions** (8 MCQs, 2 Numericals). Make it count!
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-white text-indigo-600 font-black uppercase tracking-widest px-4 py-2 rounded-xl shrink-0">1 Free Attempt</span>
        </div>
      )}
      {needsPayment && !isPaid && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">Payment Required</h3>
              <p className="text-xs text-amber-700 font-bold">
                You have already used your free mock test. Subsequent tests require a ₹10 unlock fee or a Premium membership.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => navigate('/pricing')}
              className="flex-1 md:flex-none px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md text-center"
            >
              🚀 Go Premium (₹299/mo)
            </button>
            <button
              onClick={handleUnlockMock}
              disabled={isProcessingPayment}
              className="flex-1 md:flex-none px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md disabled:opacity-50 text-center"
            >
              {isProcessingPayment ? "Opening..." : "Pay ₹10 Once"}
            </button>
          </div>
        </div>
      )}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Paper Configuration</h1>
        <p className="text-slate-500 text-lg font-medium">Powered by Gemini AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          <div className={`glass-panel p-8 rounded-[2.5rem] transition-opacity ${isPreparing ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Zap className="w-5 h-5" /></div>
              Target Exam
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {(isNeet ? [ExamType.NEET] : [ExamType.Main, ExamType.Advanced]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    if (type === ExamType.Advanced) {
                      alert("🚀 JEE Advanced Engine: Updated Soon! (Still Coming)");
                      return;
                    }
                    setExamType(type);
                  }}
                  className={`p-6 rounded-3xl border-2 transition-all text-center relative ${examType === type ? 'border-blue-500 bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'border-slate-100 bg-white hover:border-blue-200 text-slate-600'}`}
                >
                  {type === ExamType.Advanced && (
                    <span className="absolute -top-3 -right-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md animate-pulse">
                      Updated Soon
                    </span>
                  )}
                  <span className="block font-black text-lg">{type}</span>
                  <span className={`text-xs font-bold uppercase tracking-widest ${examType === type ? 'text-blue-200' : 'text-slate-400'}`}>
                    {type === ExamType.Advanced ? 'Coming Soon' : 'Official Pattern'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={`glass-panel p-8 rounded-[2.5rem] transition-opacity ${isPreparing ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><BookOpen className="w-5 h-5" /></div>
              Subjects
            </h2>
            <div className="space-y-3">
              {(isNeet 
                ? [Subject.Physics, Subject.Chemistry, Subject.Botany, Subject.Zoology] 
                : [Subject.Physics, Subject.Chemistry, Subject.Mathematics]).map((sub) => {
                const isSelected = selectedSubjects.includes(sub);
                return (
                    <div key={sub} onClick={() => { if (isSelected && selectedSubjects.length > 1) setSelectedSubjects(selectedSubjects.filter(s => s !== sub)); else if (!isSelected) setSelectedSubjects([...selectedSubjects, sub]); }}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${isSelected ? 'bg-purple-50 border-purple-500 shadow-md' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-300 bg-white'}`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <span className={`font-bold ${isSelected ? 'text-purple-900' : 'text-slate-600'}`}>{sub}</span>
                    </div>
                );
              })}
            </div>
          </div>

           <div className={`glass-panel p-8 rounded-[2.5rem] transition-opacity ${isPreparing ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Sliders className="w-5 h-5" /></div>
                    Pattern (Per Subject)
                </h2>
                {!(isIndependent && !profile.has_used_free_test) && (
                  <div className="flex gap-2">
                      <button onClick={() => applyPreset(isNeet ? 15 : 10, isNeet ? 0 : 2)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-lg">Mini</button>
                      <button onClick={() => applyPreset(isNeet ? 45 : 25, isNeet ? 0 : 5)} className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase rounded-lg">Standard</button>
                  </div>
                )}
            </div>
            <div className="flex gap-6">
                <div className="flex-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">MCQs</label>
                    <input type="number" min="5" max={isNeet ? 90 : 30} disabled={isIndependent && !profile.has_used_free_test} value={questionCounts.mcq} onChange={(e) => setQuestionCounts({...questionCounts, mcq: parseInt(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-slate-800 text-center focus:border-blue-500 outline-none disabled:opacity-50" />
                </div>
                {!isNeet && (
                  <div className="flex-1">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Numericals</label>
                      <input type="number" min="0" max="10" disabled={isIndependent && !profile.has_used_free_test} value={questionCounts.numerical} onChange={(e) => setQuestionCounts({...questionCounts, numerical: parseInt(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-slate-800 text-center focus:border-blue-500 outline-none disabled:opacity-50" />
                  </div>
                )}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div className={`glass-panel p-8 rounded-[2.5rem] transition-opacity ${isPreparing ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Sparkles className="w-5 h-5" /></div>
              Target Difficulty Level
            </h2>
            <p className="text-xs text-slate-400 font-medium mb-6">Select the conceptual difficulty standard for this exam session.</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { level: 'Easy', desc: 'Meets standard JEE Main level' },
                { level: 'Medium', desc: 'One step above JEE Main level' },
                { level: 'Hard', desc: 'Level of JEE Advanced' }
              ].map(({ level, desc }) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level as any)}
                  className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col justify-between ${
                    difficulty === level 
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-md' 
                      : 'border-slate-100 bg-white hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="font-black text-sm uppercase tracking-wider block mb-1">{level}</span>
                  <span className="text-[10px] font-bold opacity-75 leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <div className="glass-panel p-8 rounded-[2.5rem] h-full flex flex-col">
            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><ShieldCheck className="w-5 h-5" /></div>
              Generation Protocol
            </h2>
            
            <div className="space-y-4 flex-1">
              {selectedSubjects.map(sub => (
                <div key={sub} className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-white/40">
                  <span className="text-sm font-bold text-slate-700">{sub}</span>
                  <div className="flex items-center gap-3">
                    {progress[sub] === 'loading' ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : progress[sub] === 'done' ? <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div> : progress[sub] === 'error' ? <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><AlertTriangle className="w-3 h-3 text-white" /></div> : <div className="w-5 h-5 border-2 border-slate-200 rounded-full" />}
                  </div>
                </div>
              ))}
              
              <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-800 font-mono text-[10px] text-emerald-400 space-y-1 overflow-y-auto max-h-32 custom-scrollbar">
                {preparationLogs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                        <span className="opacity-30">[{new Date().toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit'})}]</span>
                        <span>{log}</span>
                    </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Load</p>
                        <p className="text-2xl font-black text-slate-900">{totalQuestions} Questions</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Duration</p>
                        <p className="text-2xl font-black text-slate-900">~{estimatedTime} Mins</p>
                    </div>
                </div>

                {!preparedQuestions.length ? (
                    <button onClick={preparePaper} disabled={isPreparing || selectedSubjects.length === 0}
                    className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 disabled:opacity-50">
                    {isPreparing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Atom className="w-6 h-6 text-fuchsia-400" />}
                    {isPreparing ? "Initializing..." : "Generate Paper"}
                    </button>
                ) : (
                    <button onClick={launchExam}
                    className="w-full py-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-[2rem] font-black text-xl shadow-2xl items-center justify-center gap-4 flex">
                    <PlayCircle className="w-7 h-7" />
                    Begin Examination
                    </button>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* API Key Prompt Modal */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Gemini API Key Required</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configure key to start AI examination</p>
                </div>
              </div>
              <button onClick={() => setIsApiKeyModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!inputApiKey.trim()) return alert("Please enter a valid API Key.");
              localStorage.setItem('user_gemini_api_key', inputApiKey.trim());
              setIsApiKeyModalOpen(false);
              preparePaper();
            }} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Enter Google Gemini API Key</label>
                <input
                  type="password"
                  required
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-200"
              >
                Save Key & Start Test
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSetup;
