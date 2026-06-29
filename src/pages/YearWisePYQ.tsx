import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Calendar, Sparkles, Lock, CheckCircle2, ChevronRight, BookOpen, Search, Filter, ShieldCheck, DollarSign, Loader2 } from 'lucide-react';
import { initiateRazorpayPayment } from '../utils/payment';
import MathText from '../components/MathText';
import { officialJeePyqList } from '../data/officialJeePyqList';

interface PYQPaper {
  id: string;
  year: number;
  session: string;
  shift: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  priceRupees: number;
  pdfUrl?: string;
}

const generatePYQList = (isNeet: boolean = false): PYQPaper[] => {
  if (isNeet) {
    const list: PYQPaper[] = [];
    const neetYears = Array.from({ length: 2026 - 2013 + 1 }, (_, i) => 2026 - i);
    neetYears.forEach(yr => {
      list.push({
        id: `pyq_neet_${yr}`,
        year: yr,
        session: 'Official NTA NEET UG Paper',
        shift: 'National Pen & Paper Test',
        title: `NEET UG ${yr} Official Question Paper (Physics, Chem, Botany, Zoology)`,
        totalQuestions: 180,
        durationMinutes: 180,
        priceRupees: 20
      });
    });
    return list;
  }

  return officialJeePyqList;
};

const YearWisePYQ = () => {
  const navigate = useNavigate();
  const activeStream = localStorage.getItem('active_stream') || 'JEE Main & Advanced';
  const isNeet = activeStream.toLowerCase().includes('neet');
  const [papers] = useState<PYQPaper[]>(() => generatePYQList(isNeet));
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [unlockedPapers, setUnlockedPapers] = useState<Record<string, boolean>>(() => {
    const cached = localStorage.getItem('unlocked_pyq_papers');
    return cached ? JSON.parse(cached) : {};
  });

  const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const isSuperAdmin = profile.role === 'super_admin';

  const filteredPapers = papers.filter(p => {
    const matchesYear = selectedYear === 'ALL' || p.year === selectedYear;
    const matchesQuery = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.session.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesYear && matchesQuery;
  });

  const handleUnlockAndStart = async (paper: PYQPaper) => {
    // Super admin bypasses all payment locks completely
    if (isSuperAdmin || unlockedPapers[paper.id]) {
      startExamFlow(paper);
      return;
    }

    setUnlockingId(paper.id);
    try {
      const receipt = `pyq_${paper.id}_${profile.id || 'student'}_${Date.now()}`;
      const success = await initiateRazorpayPayment(
        20, // ₹20 per attempt
        profile.email || 'student@example.com',
        profile.full_name || 'Aspirant',
        receipt
      );

      if (success) {
        const updated = { ...unlockedPapers, [paper.id]: true };
        setUnlockedPapers(updated);
        localStorage.setItem('unlocked_pyq_papers', JSON.stringify(updated));
        alert(`🎉 Payment Verified! JEE ${paper.year} Paper unlocked for this attempt.`);
        startExamFlow(paper);
      }
    } catch (err: any) {
      console.error("Unlock error:", err);
      alert("Payment unlock encountered an error. Please try again.");
    } finally {
      setUnlockingId(null);
    }
  };

  const startExamFlow = async (paper: PYQPaper) => {
    try {
      const { cleanQuestionText } = await import('../utils/sanitizer');
      const { filterUniqueQuestions } = await import('../utils/questionTracker');
      const { getOfficialJeePaperQuestions } = await import('../data/officialJeePyqBank');

      // Load stagnant, authentic official paper questions for this shift
      let questions = getOfficialJeePaperQuestions(paper.id, isNeet);

      // Sanitize statements and options to remove any internal tags and fix LaTeX
      questions = questions.map(q => {
        let cleanedOpts: any = q.options;
        if (Array.isArray(q.options)) {
          cleanedOpts = q.options.map(opt => typeof opt === 'string' ? cleanQuestionText(opt) : opt);
        } else if (q.options && typeof q.options === 'object') {
          cleanedOpts = {};
          Object.entries(q.options).forEach(([k, v]) => {
            cleanedOpts[k] = typeof v === 'string' ? cleanQuestionText(v) : v;
          });
        }
        return {
          ...q,
          statement: cleanQuestionText(q.statement || ''),
          options: cleanedOpts,
          solution: cleanQuestionText(q.solution || q.explanation || '')
        };
      });

      // Filter out any duplicate questions within this paper
      questions = filterUniqueQuestions(questions, false);

      const sessionData = {
        type: isNeet ? `NEET UG ${paper.year} (${paper.shift})` : `JEE Main ${paper.year} (${paper.shift})`,
        questions: questions,
        startTime: Date.now(),
        durationMinutes: paper.durationMinutes || 180,
        pdfUrl: paper.pdfUrl
      };

      localStorage.setItem('active_session', JSON.stringify(sessionData));

      // Re-lock paper for students after starting attempt
      if (!isSuperAdmin) {
        setUnlockedPapers(prev => {
          const next = { ...prev };
          delete next[paper.id];
          localStorage.setItem('unlocked_pyq_papers', JSON.stringify(next));
          return next;
        });
      }

      navigate('/exam-portal');
    } catch (err: any) {
      console.error("Error launching PYQ test:", err);
      alert("Failed to synthesize test paper. Please try again.");
    }
  };

  const yearsList = isNeet ? [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017] : Array.from({ length: 2026 - 2013 + 1 }, (_, i) => 2026 - i);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">
            <Award className="w-3.5 h-3.5" />
            <span>Official Archives ({isNeet ? '2017 - 2024' : '2013 - 2026'})</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Year-Wise {isNeet ? 'NEET UG' : 'JEE'} Solved Papers</h1>
          <p className="text-slate-500 font-medium max-w-2xl leading-relaxed">
            Practice authentic official question papers covering {isNeet ? 'Physics, Chemistry, Botany, and Zoology' : 'Physics, Chemistry, and Mathematics'}. Micro-unlock any paper for ₹20 and receive step-by-step solutions and performance analytics.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-6 py-4 rounded-3xl shadow-xl shadow-amber-200 shrink-0">
          <DollarSign className="w-6 h-6" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest block opacity-90">Micro Unlock Fee</span>
            <span className="text-lg font-black tracking-tight">₹20 per Official Paper</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search papers by year, session, or shift..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Year Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
          <button
            onClick={() => setSelectedYear('ALL')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
              selectedYear === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            All Years
          </button>
          {yearsList.map(yr => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                selectedYear === yr ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Papers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPapers.map(paper => {
          const isUnlocked = isSuperAdmin || !!unlockedPapers[paper.id];
          const isProcessing = unlockingId === paper.id;

          return (
            <div 
              key={paper.id}
              className="bg-white rounded-[2.5rem] border border-slate-200 p-7 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex flex-col justify-between space-y-6 group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3.5 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider">
                    {isNeet ? 'NEET UG' : 'JEE Main'} {paper.year}
                  </span>
                  {isSuperAdmin ? (
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-500" /> Free (Super Admin)
                    </span>
                  ) : isUnlocked ? (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Unlocked
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" /> ₹20 / Attempt
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                    {paper.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">{paper.shift}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-500">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span>{paper.totalQuestions} Questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>{paper.durationMinutes} Minutes</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleUnlockAndStart(paper)}
                disabled={isProcessing}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${
                  isSuperAdmin
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-100'
                    : isUnlocked 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSuperAdmin ? (
                  <>
                    Launch Free Test <ChevronRight className="w-4 h-4" />
                  </>
                ) : isUnlocked ? (
                  <>
                    Start Unlocked Test <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Unlock Attempt (₹20) <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YearWisePYQ;
