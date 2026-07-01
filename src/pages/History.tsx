
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Search, Target, Zap, ChevronRight, Award, BookOpen, FileText, CheckCircle2, HelpCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { getUserExamAttempts, getUserAllDailyAttempts, getAllDailyChallenges } from '../supabase';
import MathText from '../components/MathText';

const History = () => {
  const navigate = useNavigate();
  const [examAttempts, setExamAttempts] = useState<any[]>([]);
  const [dailyAttempts, setDailyAttempts] = useState<any[]>([]);
  const [uploadedPapers, setUploadedPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<'exams' | 'daily' | 'uploaded'>(() => isAdmin ? 'uploaded' : 'exams');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const [exams, daily, uploaded] = await Promise.all([
          getUserExamAttempts(profile.id),
          getUserAllDailyAttempts(profile.id),
          getAllDailyChallenges(profile.role === 'admin' ? profile.id : null)
        ]);
        setExamAttempts(exams || []);
        setDailyAttempts(daily || []);
        setUploadedPapers(uploaded || []);
      } catch (err) {
        console.error("Error loading history:", err);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [profile.id, profile.role]);

  const safeExams = Array.isArray(examAttempts) ? examAttempts : [];
  const safeDaily = Array.isArray(dailyAttempts) ? dailyAttempts : [];
  const safeUploaded = Array.isArray(uploadedPapers) ? uploadedPapers : [];

  const filteredExams = safeExams.filter(a => {
    if (!a) return false;
    let config = a.config || {};
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch (e) { config = {}; }
    }
    const type = config?.type || '';
    const subject = config?.subject || '';
    const chapter = config?.chapter || '';
    return type.toLowerCase().includes(searchQuery.toLowerCase()) ||
           subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
           chapter.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredDaily = safeDaily.filter(a => {
    if (!a) return false;
    const dateStr = a.date ? String(a.date) : (a.submitted_at ? String(a.submitted_at).split('T')[0] : '');
    return dateStr.includes(searchQuery);
  });

  const filteredUploaded = safeUploaded.filter(p => {
    if (!p) return false;
    const dateStr = p.date ? String(p.date) : '';
    return dateStr.includes(searchQuery);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">
            <HistoryIcon className="w-3 h-3" />
            <span>{isAdmin ? 'Management Archive' : 'Learning Journey'}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">{isAdmin ? 'Uploaded Questions Archive' : 'Attempt History'}</h1>
          <p className="text-slate-500 font-medium max-w-xl">
            {isAdmin ? 'Access all daily uploaded papers with complete question statements, options, and solutions.' : 'Review your past performances, track your progress, and analyze your growth over time.'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
          {isAdmin && (
            <button
              onClick={() => setActiveTab('uploaded')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                activeTab === 'uploaded' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Uploaded Papers ({safeUploaded.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
              activeTab === 'exams' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Exams & Practice
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
              activeTab === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Daily Attempts
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        <input 
          type="text"
          placeholder={`Search ${activeTab === 'exams' ? 'exams, subjects or chapters' : 'dates'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 shadow-sm transition-all"
        />
      </div>

      {/* History List */}
      <div className="space-y-4">
        {activeTab === 'uploaded' ? (
          filteredUploaded.length > 0 ? (
            filteredUploaded.map((paper) => {
              const dateStr = paper.date || paper.created_at || '';
              const isExpanded = expandedPaperId === paper.id;
              let qs: any[] = paper.questions || [];
              if (typeof qs === 'string') {
                try { qs = JSON.parse(qs); } catch (e) { qs = []; }
              }

              return (
                <div key={paper.id} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm transition-all">
                  <div 
                    onClick={() => setExpandedPaperId(isExpanded ? null : paper.id)}
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Uploaded Paper</span>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                            {qs.length} Questions Included
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mt-0.5">
                          Paper Target Date: {dateStr}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">
                        {isExpanded ? <>Collapse Questions <ChevronUp className="w-4 h-4" /></> : <>Inspect Questions & Answers <ChevronDown className="w-4 h-4" /></>}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 p-8 bg-slate-50/50 space-y-8 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Question Bank & Answer Keys</h4>
                        <span className="text-xs font-bold text-slate-500">Total {qs.length} Questions</span>
                      </div>

                      <div className="space-y-6">
                        {qs.map((q: any, idx: number) => {
                          const options = q.options || {};
                          const optsArray = Array.isArray(options) ? options : Object.entries(options).map(([key, val]) => ({ key, val }));
                          const correct = String(q.correctAnswer || q.correct_answer || '');

                          return (
                            <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                              <div className="flex items-center justify-between gap-4">
                                <span className="px-3.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                  Q{idx + 1} • {q.subject || 'JEE'} ({q.type || 'MCQ'})
                                </span>
                                {q.chapter && (
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {q.chapter}
                                  </span>
                                )}
                              </div>

                              <div className="text-sm font-bold text-slate-900 leading-relaxed">
                                <MathText text={q.statement || q.question_text || ''} />
                              </div>

                              {/* Options */}
                              {optsArray.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                  {optsArray.map((opt: any, oIdx: number) => {
                                    const optKey = opt.key || String.fromCharCode(65 + oIdx);
                                    const optVal = typeof opt === 'string' ? opt : (opt.val || opt.text || '');
                                    const isCorrectOpt = correct.toUpperCase() === optKey.toUpperCase() || correct === optVal;

                                    return (
                                      <div 
                                        key={oIdx} 
                                        className={`p-4 rounded-2xl border flex items-start gap-3 text-xs font-semibold transition-all ${
                                          isCorrectOpt 
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm' 
                                            : 'bg-slate-50 border-slate-100 text-slate-700'
                                        }`}
                                      >
                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                                          isCorrectOpt ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                        }`}>
                                          {optKey}
                                        </span>
                                        <div className="flex-1 pt-0.5">
                                          <MathText inlineOnly text={optVal} />
                                        </div>
                                        {isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Numerical / Direct Answer if no options */}
                              {optsArray.length === 0 && correct && (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>Correct Answer: <strong>{correct}</strong></span>
                                </div>
                              )}

                              {/* Solution / Explanation */}
                              {(q.solution || q.explanation) && (
                                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-1 mt-2">
                                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Solution & Explanation</span>
                                  <div className="text-xs text-slate-700 font-medium leading-relaxed">
                                    <MathText text={q.solution || q.explanation} />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <EmptyState message="No daily uploaded papers found in system database." />
          )
        ) : activeTab === 'exams' ? (
          filteredExams.length > 0 ? (
            filteredExams.map((attempt, i) => {
              let config = attempt.config || {};
              if (typeof config === 'string') {
                try { config = JSON.parse(config); } catch (e) { config = {}; }
              }
              const totalMarks = attempt.total_marks || 40;
              const score = attempt.score || 0;
              const accuracy = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
              const dateStr = attempt.submitted_at || attempt.date || new Date().toISOString();

              return (
                <div 
                  key={i}
                  className="bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-2xl ${
                      config.type === 'Full Exam' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {config.type === 'Full Exam' ? <Target className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{config.type || 'Mock Exam'}</span>
                         <span className="w-1 h-1 rounded-full bg-slate-200" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                           {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                         </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900">
                        {config.chapter || config.subject || 'Full Syllabus Mock'}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                      <p className="text-xl font-black text-slate-900">
                        {score} <span className="text-xs text-slate-400">/ {totalMarks}</span>
                      </p>
                    </div>
                    <div className="h-10 w-px bg-slate-100 hidden md:block" />
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Accuracy</p>
                      <p className="text-xl font-black text-emerald-600">
                        {accuracy}%
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        let questionsList = attempt.questions || [];
                        if (typeof questionsList === 'string') {
                          try { questionsList = JSON.parse(questionsList); } catch (e) { questionsList = []; }
                        }
                        localStorage.setItem('last_exam_result', JSON.stringify({
                          ...attempt,
                          config,
                          questions: questionsList
                        }));
                        navigate('/results');
                      }}
                      className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:bg-indigo-600 hover:text-white transition-all group-hover:translate-x-1"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState message="No exam attempts found. Start your first practice session!" />
          )
        ) : (
          filteredDaily.length > 0 ? (
            filteredDaily.map((attempt, i) => {
              const totalMarks = attempt.total_marks || 40;
              const score = attempt.score || 0;
              const dateStr = attempt.date || attempt.submitted_at || new Date().toISOString();

              return (
                <div 
                  key={i}
                  className="bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className="p-4 rounded-2xl bg-violet-50 text-violet-600">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Challenge</span>
                         <span className="w-1 h-1 rounded-full bg-slate-200" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                           {new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                         </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900">Strategic Drill Attempt</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                      <p className="text-xl font-black text-slate-900">
                        {score} <span className="text-xs text-slate-400">/ {totalMarks}</span>
                      </p>
                    </div>
                    <div className="h-10 w-px bg-slate-100 hidden md:block" />
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                      <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                         <Award className="w-4 h-4" />
                         Completed
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                          let questionsList = attempt.attempt_data || attempt.questions || [];
                          if (typeof questionsList === 'string') {
                            try { questionsList = JSON.parse(questionsList); } catch (e) { questionsList = []; }
                          }
                          localStorage.setItem('last_exam_result', JSON.stringify({
                              ...attempt,
                              config: { type: 'Daily Challenge', date: attempt.date },
                              questions: questionsList
                          }));
                          navigate('/results');
                      }}
                      className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:bg-indigo-600 hover:text-white transition-all group-hover:translate-x-1"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState message="No daily challenges completed yet. Take today's challenge!" />
          )
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 opacity-40">
    <div className="bg-slate-100 p-8 rounded-full">
      <HistoryIcon className="w-16 h-16 text-slate-400" />
    </div>
    <p className="text-lg font-black text-slate-500 max-w-xs">{message}</p>
  </div>
);

export default History;
