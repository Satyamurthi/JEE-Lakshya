import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Target, CheckCircle2, XCircle, AlertCircle, Brain, Sparkles,
  ArrowLeft, Download, Share2, AlertTriangle, X
} from 'lucide-react';
import MathText from '../components/MathText';

const Results = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [activeSubject, setActiveSubject] = useState<string>('All');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');

  useEffect(() => {
    const lastResult = localStorage.getItem('last_exam_result');
    if (lastResult) {
      setResult(JSON.parse(lastResult));
      const emailNote = localStorage.getItem('show_email_notification');
      if (emailNote === 'true') {
        setShowEmailModal(true);
        localStorage.removeItem('show_email_notification');
      }
    } else {
      navigate('/history');
    }
  }, [navigate]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!result) return null;

  const subjects = ['All', ...new Set(result.questions.map((q: any) => q.subject))];
  const filteredQuestions = activeSubject === 'All' 
    ? result.questions 
    : result.questions.filter((q: any) => q.subject === activeSubject);

  const stats = {
    correct: result.questions.filter((q: any) => q.isCorrect).length,
    incorrect: result.questions.filter((q: any) => q.userAnswer !== undefined && !q.isCorrect).length,
    unattempted: result.questions.filter((q: any) => q.userAnswer === undefined).length,
    accuracy: result.accuracy,
    score: result.score,
    totalMarks: result.total_marks
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setToast({ message: "Report copied to clipboard!", type: 'success' });
      })
      .catch(() => {
        setToast({ message: "Failed to copy report", type: 'error' });
      });
  };

  const handleShare = async () => {
    const examType = result.config?.type || 'Examination';
    const scoreStr = `${stats.score}/${stats.totalMarks}`;
    const accStr = `${stats.accuracy}%`;
    const breakdown = subjects.filter(s => s !== 'All').map(sub => {
      const subQs = result.questions.filter((q: any) => q.subject === sub);
      const subCorrect = subQs.filter((q: any) => q.isCorrect).length;
      const subAcc = subQs.length > 0 ? Math.round((subCorrect / subQs.length) * 100) : 0;
      return `${sub}: Accuracy ${subAcc}%, Correct: ${subCorrect}/${subQs.length}`;
    }).join('\n');

    const shareText = `📊 JEE Nexus AI - ${examType} Performance Report\n\n` +
      `🏆 Final Score: ${scoreStr}\n` +
      `🎯 Accuracy: ${accStr}\n` +
      `✅ Correct Questions: ${stats.correct}\n` +
      `❌ Incorrect Questions: ${stats.incorrect}\n\n` +
      `📚 Subject Breakdown:\n${breakdown}\n\n` +
      `Keep learning and practicing on JEE Nexus AI! 🚀`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `JEE Nexus AI - ${examType} Report`,
          text: shareText,
        });
        setToast({ message: "Report shared successfully", type: 'success' });
      } catch (err) {
        copyToClipboard(shareText);
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popup windows to generate the Answer Sheet PDF report!");
      return;
    }

    const dateStr = new Date(result.submitted_at || Date.now()).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const questionsHTML = result.questions.map((q: any, i: number) => {
      const isCorrect = q.isCorrect;
      const isUnattempted = q.userAnswer === undefined || q.userAnswer === null;
      const userAnsText = isUnattempted ? 'Unattempted' : q.userAnswer;
      const correctAnsText = q.correctAnswer;

      const statusBadge = isCorrect 
        ? '<span style="color:#059669; background:#ecfdf5; border:1px solid #a7f3d0; padding:4px 12px; border-radius:20px; font-weight:bold; font-size:12px;">✅ CORRECT (+4)</span>'
        : isUnattempted
        ? '<span style="color:#475569; background:#f8fafc; border:1px solid #e2e8f0; padding:4px 12px; border-radius:20px; font-weight:bold; font-size:12px;">⚪ UNATTEMPTED (0)</span>'
        : '<span style="color:#dc2626; background:#fef2f2; border:1px solid #fecaca; padding:4px 12px; border-radius:20px; font-weight:bold; font-size:12px;">❌ INCORRECT (-1)</span>';

      let optionsListHTML = '';
      if (q.options && typeof q.options === 'object') {
        optionsListHTML = Object.entries(q.options).map(([key, val]) => {
          const isUserChoice = String(q.userAnswer) === String(key) || String(q.userAnswer) === String(val);
          const isCorrectChoice = String(q.correctAnswer) === String(key) || String(q.correctAnswer) === String(val);
          let optStyle = "padding:10px 14px; margin-bottom:8px; border-radius:10px; border:1px solid #e2e8f0; font-size:14px; background:#ffffff;";
          if (isCorrectChoice) {
            optStyle = "padding:10px 14px; margin-bottom:8px; border-radius:10px; border:2px solid #10b981; background:#ecfdf5; color:#065f46; font-weight:bold; font-size:14px;";
          } else if (isUserChoice && !isCorrect) {
            optStyle = "padding:10px 14px; margin-bottom:8px; border-radius:10px; border:2px solid #ef4444; background:#fef2f2; color:#991b1b; font-weight:bold; font-size:14px;";
          }
          return `<div style="${optStyle}"><strong>(${key.toUpperCase()})</strong> ${val}</div>`;
        }).join('');
      }

      return `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; margin-bottom:24px; page-break-inside:avoid; break-inside:avoid; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:12px; margin-bottom:16px;">
            <div>
              <span style="background:#e0e7ff; color:#3730a3; font-size:11px; font-weight:900; padding:4px 10px; border-radius:8px; text-transform:uppercase; margin-right:8px;">Q${i+1}</span>
              <span style="color:#64748b; font-size:12px; font-weight:bold; text-transform:uppercase;">${q.subject || 'GENERAL'}</span>
            </div>
            <div>${statusBadge}</div>
          </div>
          
          <div style="font-size:15px; font-weight:700; color:#1e293b; line-height:1.6; margin-bottom:16px;">
            ${q.statement || q.question || ''}
          </div>

          ${optionsListHTML ? `<div style="margin-bottom:16px;">${optionsListHTML}</div>` : ''}

          <div style="background:#f8fafc; border-radius:12px; padding:16px; border:1px solid #f1f5f9; font-size:13px; color:#334155;">
            <div style="display:flex; gap:24px; margin-bottom:10px; font-weight:bold;">
              <span>Your Marked Answer: <strong style="color:${isCorrect ? '#059669' : isUnattempted ? '#64748b' : '#dc2626'}">${userAnsText}</strong></span>
              <span>Official Correct Answer: <strong style="color:#059669">${correctAnsText}</strong></span>
            </div>
            ${q.explanation || q.solution ? `
              <div style="border-top:1px dashed #cbd5e1; padding-top:10px; margin-top:10px;">
                <span style="color:#4f46e5; font-weight:900; font-size:11px; text-transform:uppercase; display:block; margin-bottom:4px;">💡 Detailed Solution / Explanation:</span>
                <div style="color:#475569; line-height:1.5;">${q.explanation || q.solution}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${result.config?.type || 'JEE Main Exam'} - Official Answer Sheet & Solutions</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
            body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px; }
            .header { background: linear-gradient(135deg, #1e1b4b, #312e81); color: white; padding: 36px; border-radius: 24px; margin-bottom: 32px; }
            .header h1 { margin: 0 0 8px 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
            .header p { margin: 0; opacity: 0.85; font-size: 13px; font-weight: 600; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
            .stat-card { background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 16px; text-align: center; }
            .stat-card .val { font-size: 24px; font-weight: 900; color: #0f172a; }
            .stat-card .lbl { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-top: 4px; }
            @media print {
              body { background: white; padding: 0; }
              .no-print-btn { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div style="max-width:900px; margin:0 auto;">
            <div style="text-align:right; margin-bottom:20px;" class="no-print-btn">
              <button onclick="window.print()" style="background:#4f46e5; color:white; border:none; padding:12px 24px; border-radius:12px; font-weight:bold; font-size:14px; cursor:pointer; shadow:0 4px 12px rgba(79,70,229,0.3);">📥 Save as PDF / Print Official Answer Sheet</button>
            </div>
            <div class="header">
              <div style="font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:2px; color:#a5b4fc; margin-bottom:6px;">JEE Nexus AI — Official Evaluation Document</div>
              <h1>${result.config?.type || 'JEE Main Exam'} Answer Sheet & Solutions</h1>
              <p>Candidate: <strong>${profile.full_name || 'Student Aspirant'}</strong> (${profile.email || 'Registered Candidate'}) • Date: ${dateStr}</p>
            </div>

            <div class="stats-grid">
              <div class="stat-card"><div class="val">${stats.score} / ${stats.totalMarks}</div><div class="lbl">Final Score</div></div>
              <div class="stat-card"><div class="val" style="color:#4f46e5;">${stats.accuracy}%</div><div class="lbl">Accuracy</div></div>
              <div class="stat-card"><div class="val" style="color:#059669;">${stats.correct}</div><div class="lbl">Correct</div></div>
              <div class="stat-card"><div class="val" style="color:#dc2626;">${stats.incorrect}</div><div class="lbl">Incorrect</div></div>
            </div>

            <h2 style="font-size:18px; font-weight:900; margin-bottom:20px; color:#1e293b;">Question Paper, Marked Responses & Solutions</h2>
            ${questionsHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/history')}
            className="no-print p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">
              <Sparkles className="w-3 h-3" />
              <span>Performance Analysis</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {result.config?.type || 'Examination'} Result
            </h1>
          </div>
        </div>

        <div className="no-print flex items-center gap-3">
          <button 
            onClick={handleExportPDF}
            className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button 
            onClick={handleShare}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
          >
            <Share2 className="w-3.5 h-3.5" /> Share Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Trophy className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Final Score</p>
            <p className="text-4xl font-black">{stats.score} <span className="text-sm opacity-40">/ {stats.totalMarks}</span></p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg shadow-slate-200/50 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accuracy</p>
            <Target className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.accuracy}%</p>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${stats.accuracy}%` }} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg shadow-slate-200/50 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correct</p>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.correct}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questions</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg shadow-slate-200/50 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incorrect</p>
            <XCircle className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.incorrect}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questions</p>
        </div>
      </div>

      {/* Main Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Question Review */}
        <div className="lg:col-span-8 space-y-6">
          <div className="no-print flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex gap-2">
                {subjects.map(sub => (
                  <button
                    key={sub}
                    onClick={() => setActiveSubject(sub)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeSubject === sub ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
             </div>
          </div>

          <div className="space-y-6">
            {filteredQuestions.map((q: any, i: number) => (
              <div key={i} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="p-8 md:p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg">Q{i + 1}</span>
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{q.subject}</span>
                    </div>
                    {q.userAnswer === undefined ? (
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" /> Unattempted
                      </span>
                    ) : q.isCorrect ? (
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> Correct
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                        <XCircle className="w-3 h-3" /> Incorrect
                      </span>
                    )}
                  </div>

                  <div className="prose prose-slate max-w-none">
                    <MathText className="text-lg font-bold text-slate-800 leading-relaxed">
                      {q.statement}
                    </MathText>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.type === 'MCQ' ? (
                      Object.entries(q.options || {}).map(([key, val]: [string, any]) => {
                        const isUserAnswer = q.userAnswer === key;
                        const isCorrectAnswer = q.correctAnswer === key;
                        
                        let borderClass = 'border-slate-100 bg-slate-50/50';
                        if (isCorrectAnswer) borderClass = 'border-emerald-500 bg-emerald-50 shadow-sm';
                        else if (isUserAnswer && !isCorrectAnswer) borderClass = 'border-rose-500 bg-rose-50 shadow-sm';

                        return (
                          <div key={key} className={`p-5 rounded-2xl border-2 flex items-center gap-4 ${borderClass}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                              isCorrectAnswer ? 'bg-emerald-500 text-white' : isUserAnswer ? 'bg-rose-500 text-white' : 'bg-white text-slate-400 border border-slate-200'
                            }`}>
                              {key}
                            </div>
                            <MathText className={`font-bold text-sm ${isCorrectAnswer ? 'text-emerald-900' : isUserAnswer ? 'text-rose-900' : 'text-slate-600'}`}>
                              {val}
                            </MathText>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-2 space-y-4">
                        <div className="flex gap-4">
                          <div className="flex-1 p-5 rounded-2xl border-2 border-rose-100 bg-rose-50/30">
                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Your Answer</p>
                            <p className="text-xl font-black text-rose-900">{q.userAnswer || 'N/A'}</p>
                          </div>
                          <div className="flex-1 p-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/30">
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Correct Answer</p>
                            <p className="text-xl font-black text-emerald-900">{q.correctAnswer}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {q.explanation && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 space-y-3">
                       <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                         <Brain className="w-3.5 h-3.5" /> AI Explanation
                       </h4>
                       <MathText className="text-xs font-bold text-indigo-900/80 leading-relaxed">
                         {q.explanation}
                       </MathText>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/20 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Sparkles className="w-24 h-24" />
              </div>
              <div className="relative z-10 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-300">AI Cognitive Insight</h3>
                <div className="space-y-4">
                   <p className="text-sm font-medium text-white/80 leading-relaxed">
                     Based on this session, your accuracy in <span className="text-indigo-300 font-bold">{activeSubject === 'All' ? 'this set' : activeSubject}</span> is {stats.accuracy}%. 
                     {stats.accuracy > 70 ? " You're showing strong conceptual mastery." : " We recommend revisiting the fundamental concepts for this topic."}
                   </p>
                   <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Strategic Tip</p>
                      <p className="text-xs font-bold text-white/60">Focus on time management in numerical questions to improve overall score by ~15%.</p>
                   </div>
                </div>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-lg shadow-slate-200/50 space-y-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Subject Breakdown</h3>
              <div className="space-y-4">
                {subjects.filter(s => s !== 'All').map(sub => {
                  const subQs = result.questions.filter((q: any) => q.subject === sub);
                  const subCorrect = subQs.filter((q: any) => q.isCorrect).length;
                  const subAcc = subQs.length > 0 ? Math.round((subCorrect / subQs.length) * 100) : 0;
                  
                  return (
                    <div key={sub} className="space-y-2">
                       <div className="flex justify-between items-end">
                          <span className="text-xs font-black text-slate-900">{sub}</span>
                          <span className="text-xs font-black text-indigo-600">{subAcc}%</span>
                       </div>
                       <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${subAcc}%` }} />
                       </div>
                    </div>
                  );
                })}
              </div>
           </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`no-print fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <p className="text-xs font-black uppercase tracking-widest">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
      )}
      
      {showEmailModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 no-print animate-in fade-in duration-300">
          <div className="bg-slate-950 text-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl border border-white/10 flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
            
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/5 text-indigo-400 rounded-2xl">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">📧 Automated Dispatch</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email System Simulator</p>
                </div>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4 font-sans text-xs">
              <div className="bg-white/5 p-4 rounded-2xl space-y-2 border border-white/5">
                <p className="font-bold text-slate-400">To: <span className="text-slate-200">{profile.email}</span></p>
                <p className="font-bold text-slate-400">Subject: <span className="text-slate-200">JEE Nexus AI - Daily Challenge Performance Report</span></p>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                <p className="text-sm font-black text-indigo-400">Dear {profile.full_name},</p>
                <p className="text-slate-300 leading-relaxed">
                  Your daily challenge score report has been compiled and emailed to you. Here is a summary of your performance:
                </p>
                
                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="bg-white/5 p-3 rounded-xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Score</p>
                    <p className="text-lg font-black text-white">{stats.score} / {stats.totalMarks}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Accuracy</p>
                    <p className="text-lg font-black text-white">{stats.accuracy}%</p>
                  </div>
                </div>

                <p className="text-slate-300 leading-relaxed font-bold">
                  💡 AI Recommendation:
                </p>
                <p className="text-[11px] text-indigo-300 bg-indigo-500/5 p-3 rounded-xl leading-relaxed italic border border-indigo-500/10">
                  "Your speed was optimal. Focus on reducing numerical mistakes in Chemistry. Your Mathematics logic remains consistent."
                </p>
              </div>

              <button
                onClick={() => setShowEmailModal(false)}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
              >
                Close Mail Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;
