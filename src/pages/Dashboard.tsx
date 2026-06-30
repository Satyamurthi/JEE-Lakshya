
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Target, TrendingUp, BookOpen, ChevronRight, Brain, Flame, Activity, Zap, Layers, Crown, Sparkles, X, Loader2, CheckCircle2 } from 'lucide-react';

import { getUserExamAttempts, getUserAllDailyAttempts } from '../supabase';
import { calculateDailyStreak, calculateOverallAccuracy, calculatePercentile, calculateTotalXP } from '../utils/metricsHelper';
import { checkSubscriptionActive } from '../utils/payment';

const StatCard = ({ Icon, label, value, subValue, gradient, delay }: any) => (
  <div 
    className={`p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group ${gradient}`}
  >
    <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-150 transition-transform duration-700 rotate-12">
      <Icon className="w-40 h-40 text-white" />
    </div>
    
    <div className="relative z-10">
        <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl w-fit mb-8 border border-white/20 shadow-lg">
           <Icon className="w-6 h-6 text-white" />
        </div>
        <p className="text-6xl font-black tracking-tighter drop-shadow-sm mb-2">{value}</p>
        <p className="text-sm font-bold text-white/90 tracking-widest uppercase">{label}</p>
        <div className="mt-6 flex items-center gap-2 text-xs font-medium text-white/80 bg-black/10 w-fit px-3 py-1 rounded-full">
           <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
           {subValue}
        </div>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>({});
  const [stats, setStats] = useState({
    avgScore: 0,
    accuracy: 0,
    percentile: 0,
    testsTaken: 0,
    streak: 0,
    xp: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [weakAreas, setWeakAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');
  const [isRemedialModalOpen, setIsRemedialModalOpen] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      const profileRaw = localStorage.getItem('user_profile');
      const userProf = profileRaw ? JSON.parse(profileRaw) : {};
      setProfile(userProf);

      const activeStream = localStorage.getItem('active_stream') || userProf.selected_stream || 'JEE Main & Advanced';
      const isNeet = activeStream.toLowerCase().includes('neet');

      const historyRaw = localStorage.getItem('exam_history');
      let combinedHistory = historyRaw ? JSON.parse(historyRaw) : [];

      if (userProf && userProf.id) {
        try {
          const remoteExams = await getUserExamAttempts(userProf.id);
          const remoteDaily = await getUserAllDailyAttempts(userProf.id);
          if (Array.isArray(remoteExams) && remoteExams.length > 0) combinedHistory = [...combinedHistory, ...remoteExams];
          if (Array.isArray(remoteDaily) && remoteDaily.length > 0) combinedHistory = [...combinedHistory, ...remoteDaily];
        } catch (e) {
          console.warn("Could not load remote attempts for dashboard:", e);
        }
      }

      const history = combinedHistory.filter((item: any, index: number, self: any[]) =>
        index === self.findIndex((t: any) => (t.id && t.id === item.id) || (t.submitted_at && t.submitted_at === item.submitted_at))
      );

      const currentStreak = calculateDailyStreak(history);

      if (history.length > 0) {
        const totalScore = history.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
        const accuracy = calculateOverallAccuracy(history);
        const percentile = calculatePercentile(accuracy);
        const xp = calculateTotalXP(history, currentStreak);

        setStats({
          avgScore: Math.round(totalScore / history.length),
          accuracy,
          percentile,
          testsTaken: history.length,
          streak: currentStreak,
          xp
        });

        const conceptMap: Record<string, { total: number, correct: number }> = {};
        history.forEach((h: any) => {
            let questionsList = h.questions;
            if (typeof questionsList === 'string') {
              try { questionsList = JSON.parse(questionsList); } catch (e) { questionsList = []; }
            }
            if (Array.isArray(questionsList)) {
                questionsList.forEach((q: any) => {
                    const key = q.chapter || q.concept || q.subject || "General Concepts";
                    if (!conceptMap[key]) conceptMap[key] = { total: 0, correct: 0 };
                    conceptMap[key].total++;
                    if (q.isCorrect) conceptMap[key].correct++;
                });
            }
        });
        
        const performance = Object.entries(conceptMap)
          .map(([name, s]) => ({ name, accuracy: (s.correct / s.total) * 100, count: s.total }))
          .filter(p => p.count >= 1)
          .sort((a, b) => a.accuracy - b.accuracy); 
        
        if (history.length > 0 && performance.length > 0) {
            setWeakAreas(performance.slice(0, 3).map(p => p.name));
        } else {
            setWeakAreas([]);
        }
        
        setRecentActivity(history.slice(0, 4));
      } else {
          setStats({ avgScore: 0, accuracy: 0, percentile: 0, testsTaken: 0, streak: 0 });
          setWeakAreas([]);
      }
      setLoading(false);
    };
    loadDashboardData();
  }, []);

  const handleTriggerRemedialPlan = () => {
    navigate('/exam-setup');
  };

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good Morning";
      if (hour < 18) return "Good Afternoon";
      return "Good Evening";
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
             {checkSubscriptionActive(profile) ? (
               <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm cursor-pointer" onClick={() => navigate('/pricing')}>
                  <Crown className="w-3 h-3 text-yellow-200 fill-yellow-200" />
                  {profile.subscription_tier === 'ultimate' ? 'Ultimate Pass' : 'Premium Aspirant'}
               </span>
             ) : (
               <span className="px-4 py-1.5 rounded-full bg-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-300 cursor-pointer transition-all" onClick={() => navigate('/pricing')}>
                  <Zap className="w-3 h-3 text-slate-400" />
                  Free Trial (Upgrade)
               </span>
             )}
             {profile.selected_stream && (
               <span className="px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-indigo-200/50">
                  <Brain className="w-3.5 h-3.5 text-indigo-600" />
                  {profile.selected_stream}
               </span>
             )}
             <span className="px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3 h-3" />
                Systems Online
             </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
            {getGreeting()}, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 animate-gradient-x">
                {profile.full_name?.split(' ')[0] || 'Scholar'}
            </span>.
          </h1>
        </div>
        <div className="hidden md:block pb-2">
            <p className="text-slate-400 font-bold text-right text-lg">Current Streak</p>
            <div className="flex items-center gap-2 justify-end">
                <Flame className={`w-8 h-8 ${stats.streak > 0 ? 'text-orange-500 fill-orange-500 animate-bounce' : 'text-slate-300'}`} />
                <span className="text-4xl font-black text-slate-900">{stats.streak}</span>
                <span className="text-xl font-bold text-slate-300">Days</span>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard 
            Icon={Target} 
            label="Avg. Accuracy" 
            value={`${stats.accuracy}%`} 
            subValue={stats.testsTaken > 0 ? `${stats.testsTaken} Sessions Analyzed` : "Pending calibration"}
            gradient="bg-gradient-to-br from-violet-600 to-indigo-700"
            delay={0.1}
        />
        <StatCard 
            Icon={Award} 
            label="Est. Percentile" 
            value={stats.percentile > 0 ? stats.percentile : '--'} 
            subValue="National Projection" 
            gradient="bg-gradient-to-br from-fuchsia-600 to-pink-600"
            delay={0.2} 
        />
        <StatCard 
            Icon={Zap} 
            label="Total XP" 
            value={`${stats.xp}`} 
            subValue="Knowledge Points" 
            gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
            delay={0.3} 
        />
      </div>
      
      {/* Premium Upgrade Promotion Banner */}
      {!checkSubscriptionActive(profile) && profile.role === 'student' && !profile.admin_id && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-4 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-2xl hidden sm:block shrink-0 shadow-inner">
              <Crown className="w-8 h-8 fill-indigo-500/20 text-yellow-400" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-md border border-indigo-500/20">
                Unlock Unlimited Potential
              </span>
              <h3 className="text-2xl font-black text-white tracking-tight pt-2">Upgrade to Premium Pro Passes</h3>
              <p className="text-slate-400 text-xs font-semibold max-w-lg leading-relaxed">
                Unlock all CBT Mock Exams, unlimited Topic Practice, and daily NTA challenges. Eliminate the ₹10 per attempt micro-transactions now.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/pricing')}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
          >
            Upgrade Now (₹299/mo)
          </button>
        </div>
      )}

      {/* Main Actions - Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Large Action Card: Exam Simulator */}
        <div 
          className="lg:col-span-8 bg-slate-900 p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group cursor-pointer flex flex-col justify-between min-h-[400px]"
          onClick={() => navigate('/exam-setup')}
        >
          {/* Animated Background */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <div className="absolute -right-20 -top-20 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px] opacity-30 group-hover:opacity-40 transition-opacity duration-700"></div>
          <div className="absolute -left-20 -bottom-20 w-[400px] h-[400px] bg-fuchsia-500 rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 backdrop-blur-md mb-8">
                <Brain className="w-4 h-4 text-indigo-300" />
                <span className="text-xs font-black text-indigo-100 uppercase tracking-widest">Core Module</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight mb-6 leading-tight">Full Syllabus <br /> Simulation</h2>
            <p className="text-indigo-200 max-w-lg text-xl font-medium leading-relaxed">
               Engage the Gemini AI engine to generate a unique, NTA-compliant examination paper tailored to your current mastery level.
            </p>
          </div>
          
          <div className="relative z-10 flex items-center gap-6 mt-12">
             <div className="h-16 w-16 rounded-full bg-white text-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-white/20">
                <ChevronRight className="w-8 h-8" />
             </div>
             <span className="font-black text-lg tracking-wide group-hover:translate-x-2 transition-transform">Initialize Protocol</span>
          </div>
        </div>

        {/* Vertical Stack */}
        <div className="lg:col-span-4 flex flex-col gap-8">
            {/* Practice Card */}
            <div 
            className="flex-1 bg-white p-10 rounded-[3rem] shadow-premium border border-slate-100 group cursor-pointer relative overflow-hidden"
            onClick={() => navigate('/practice')}
            >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Layers className="w-32 h-32" />
                </div>
                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 text-orange-600 group-hover:scale-110 transition-transform duration-300">
                    <Flame className="w-7 h-7" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Drill Mode</h2>
                <p className="text-slate-500 font-medium leading-relaxed">Target specific chapters for rapid-fire refinement.</p>
            </div>

            {/* Daily Card */}
            <div 
            className="flex-1 bg-gradient-to-br from-emerald-50 to-teal-50 p-10 rounded-[3rem] border border-emerald-100 group cursor-pointer relative overflow-hidden"
            onClick={() => navigate('/daily')}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                        <Activity className="w-7 h-7" />
                    </div>
                    <span className="px-3 py-1 bg-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-full">Live</span>
                </div>
                <h2 className="text-3xl font-black text-emerald-900 mb-2">Daily Challenge</h2>
                <p className="text-emerald-700/80 font-medium">Compete globally.</p>
            </div>
        </div>
      </div>

      {/* Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Weak Areas */}
        <div className="lg:col-span-1 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-premium relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
             
             <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-8">
               <Brain className="w-6 h-6 text-fuchsia-500" />
               Focus Required
             </h3>
             
             <div className="space-y-4 relative z-10">
               {weakAreas.length > 0 ? weakAreas.map((area, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      localStorage.setItem('focus_practice_target', JSON.stringify({ topic: area }));
                      navigate('/practice');
                    }}
                    className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-fuchsia-100/50 hover:border-fuchsia-100 transition-all cursor-pointer group"
                  >
                     <div className="flex items-center gap-4">
                         <span className="text-xs font-black text-slate-300">0{i+1}</span>
                         <p className="text-sm font-bold text-slate-700 group-hover:text-fuchsia-700 transition-colors line-clamp-1">{area}</p>
                     </div>
                     <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-fuchsia-500" />
                  </div>
                )) : (
                  <div className="p-6 bg-slate-50/70 rounded-[2rem] border border-dashed border-slate-200 text-center space-y-3">
                    <div className="w-10 h-10 bg-fuchsia-100 text-fuchsia-600 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                      <Brain className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">
                      AI Engine Ready: Complete an examination session to activate real-time performance profiling and lock specific chapters.
                    </p>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => {
                  if (weakAreas.length > 0) {
                    localStorage.setItem('focus_practice_target', JSON.stringify({ topic: weakAreas[0] }));
                  }
                  navigate('/practice');
                }} 
                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
              >
                 <Sparkles className="w-4 h-4 text-fuchsia-400" />
                 Target Weak Area Drill
              </button>
         </div>

         {/* Live Feed */}
         <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-premium">
             <div className="flex items-center justify-between mb-8">
                 <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                     <Activity className="w-6 h-6 text-blue-500" />
                     Activity Log
                 </h3>
                 <button 
                   onClick={() => navigate('/history')}
                   className="px-5 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                 >
                   View All
                 </button>
             </div>

             <div className="space-y-4">
               {recentActivity.length === 0 ? (
                   <div className="p-8 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                       <p className="text-slate-400 font-medium text-sm">No recent activity detected. Start a simulation to populate data.</p>
                   </div>
               ) : (
                   recentActivity.map((item, idx) => (
                     <div key={idx} onClick={() => { localStorage.setItem('last_exam_result', JSON.stringify(item)); navigate('/results'); }} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 hover:border-blue-200 transition-all cursor-pointer group shadow-sm hover:shadow-xl hover:shadow-blue-100/50">
                       <div className="flex items-center gap-5 mb-4 sm:mb-0">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-md ${
                             item.score > (item.totalPossible * 0.7) ? 'bg-emerald-500 shadow-emerald-200' : 'bg-indigo-500 shadow-indigo-200'
                          }`}>
                             {item.totalPossible > 0 ? Math.round((item.score/item.totalPossible)*10) : '-'}
                          </div>
                          <div>
                             <p className="font-bold text-slate-900 text-lg group-hover:text-blue-700 transition-colors">{item.type || 'Standard Drill'}</p>
                             <div className="flex items-center gap-3 mt-1">
                                 <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                                     {(() => {
                                       const dRaw = item.completedAt || item.submitted_at || item.created_at || item.date;
                                       if (!dRaw) return 'Today';
                                       const dObj = new Date(dRaw);
                                       return isNaN(dObj.getTime()) ? 'Today' : dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                     })()}
                                 </span>
                                 <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                 <span className="text-xs font-bold text-slate-500">
                                   {item.accuracy !== undefined ? item.accuracy : (item.total_marks > 0 ? Math.round(((item.score || 0) / item.total_marks) * 100) : 0)}% Acc
                                 </span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-6 sm:pl-6 sm:border-l border-slate-100">
                         <div className="text-right">
                             <p className="text-2xl font-black text-slate-900">{item.score}</p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                         </div>
                         <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                             <ChevronRight className="w-5 h-5" />
                         </div>
                       </div>
                     </div>
                   ))
               )}
             </div>
         </div>

      </div>

      {/* API Key Modal */}
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
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unlock AI Examination Terminal</p>
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
              navigate('/exam-setup');
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

      {/* Remedial Plan Modal */}
      {isRemedialModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 md:p-10 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in duration-300 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-fuchsia-50 text-fuchsia-600 rounded-2xl">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">AI Cognitive Remedial Plan</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personalized 3-Step Mastery Roadmap</p>
                </div>
              </div>
              <button onClick={() => setIsRemedialModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {isGeneratingPlan ? (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-fuchsia-600 animate-spin mx-auto" />
                <p className="text-sm font-black text-slate-800">Synthesizing Remedial Modules via Gemini AI...</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                <div className="p-4 bg-fuchsia-50/60 border border-fuchsia-100 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-fuchsia-900 font-black text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-fuchsia-600" />
                    <span>Target Concept Refinement</span>
                  </div>
                  <p className="text-xs text-fuchsia-800 font-medium leading-relaxed">
                    Based on your analytics, our AI engine has isolated high-priority topics for focused drills: <strong>{weakAreas.join(', ')}</strong>.
                  </p>
                </div>

                {weakAreas.map((topic, idx) => (
                  <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md">Step 0{idx + 1} Protocol</span>
                      <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Recommended</span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900">{topic} Refinement Module</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Complete 15 high-yield practice MCQs focusing on core formulas, reaction mechanisms, and boundary cases.
                    </p>
                  </div>
                ))}

                <button
                  onClick={() => {
                    setIsRemedialModalOpen(false);
                    navigate('/practice');
                  }}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                >
                  Start Remedial Practice Drills Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
