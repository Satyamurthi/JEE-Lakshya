import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  Activity, TrendingUp, Target, Zap, Brain, Sparkles, AlertCircle, 
  ChevronRight, Award, Clock, ArrowUpRight, ArrowDownRight, Lightbulb
} from 'lucide-react';
import { getUserExamAttempts, getUserAllDailyAttempts, getDailyChallenge, getDailyAttemptsByChallenge } from '../supabase';

const Analytics = () => {
  const [examAttempts, setExamAttempts] = useState<any[]>([]);
  const [dailyAttempts, setDailyAttempts] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const profileRaw = localStorage.getItem('user_profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : {};

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Load local history as instant fallback
        const localHistoryRaw = localStorage.getItem('exam_history');
        const localHistory = localHistoryRaw ? JSON.parse(localHistoryRaw) : [];

        let exams: any[] = [];
        let daily: any[] = [];

        if (profile && profile.id) {
          try {
            const resExams = await getUserExamAttempts(profile.id);
            const resDaily = await getUserAllDailyAttempts(profile.id);
            exams = resExams || [];
            daily = resDaily || [];
          } catch (e) {
            console.warn("Could not fetch remote attempts, using local history fallback:", e);
          }
        }

        if (exams.length === 0 && localHistory.length > 0) {
          exams = localHistory;
        }

        setExamAttempts(exams);
        setDailyAttempts(daily);

        if (profile && profile.admin_id) {
          try {
            const todayChallenge = await getDailyChallenge(todayStr, profile.admin_id);
            if (todayChallenge) {
              const rankingList = await getDailyAttemptsByChallenge(todayChallenge.id);
              setLeaderboard(rankingList || []);
            }
          } catch (e) {
            console.warn("Could not fetch leaderboard:", e);
          }
        }
      } catch (err) {
        console.error("Error loading analytics data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [profile.id, profile.admin_id]);

  const stats = useMemo(() => {
    const safeExams = Array.isArray(examAttempts) ? examAttempts : [];
    const safeDaily = Array.isArray(dailyAttempts) ? dailyAttempts : [];
    const allAttempts = [...safeExams, ...safeDaily].sort((a, b) => {
      const timeA = new Date(a.submitted_at || a.completedAt || a.date || 0).getTime();
      const timeB = new Date(b.submitted_at || b.completedAt || b.date || 0).getTime();
      return timeA - timeB;
    });

    const progressData = allAttempts.map((a, i) => {
      const total = a.total_marks || a.totalQuestions || 100;
      const score = a.score || 0;
      return {
        name: `Attempt ${i + 1}`,
        score: total > 0 ? Math.round((score / total) * 100) : 0,
        date: new Date(a.submitted_at || a.completedAt || a.date || Date.now()).toLocaleDateString()
      };
    });

    if (progressData.length === 0) {
      progressData.push({ name: 'Baseline', score: 0, date: new Date().toLocaleDateString() });
    }

    const subjectScores: Record<string, { total: number, count: number }> = {};
    safeExams.forEach(a => {
      let questionsList = a.questions;
      if (typeof questionsList === 'string') {
        try { questionsList = JSON.parse(questionsList); } catch (e) { questionsList = []; }
      }
      
      if (Array.isArray(questionsList) && questionsList.length > 0) {
        const subMap: Record<string, { correct: number, total: number }> = {};
        questionsList.forEach((q: any) => {
          const sub = q.subject || 'Physics';
          if (!subMap[sub]) subMap[sub] = { correct: 0, total: 0 };
          subMap[sub].total += 1;
          if (q.isCorrect) subMap[sub].correct += 1;
        });
        Object.entries(subMap).forEach(([sub, data]) => {
          if (!subjectScores[sub]) subjectScores[sub] = { total: 0, count: 0 };
          subjectScores[sub].total += data.total > 0 ? (data.correct / data.total) * 100 : 0;
          subjectScores[sub].count += 1;
        });
      }
    });

    const activeStream = localStorage.getItem('active_stream') || 'JEE Main & Advanced';
    const isNeet = activeStream.toLowerCase().includes('neet');

    const radarData = Object.entries(subjectScores).map(([subject, data]) => ({
      subject,
      A: data.count > 0 ? Math.round(data.total / data.count) : 0,
      fullMark: 100
    }));

    const defaultJeeRadar = [
      { subject: 'Physics', A: 45, fullMark: 100 },
      { subject: 'Chemistry', A: 50, fullMark: 100 },
      { subject: 'Mathematics', A: 55, fullMark: 100 }
    ];

    const defaultNeetRadar = [
      { subject: 'Physics', A: 45, fullMark: 100 },
      { subject: 'Chemistry', A: 50, fullMark: 100 },
      { subject: 'Botany', A: 60, fullMark: 100 },
      { subject: 'Zoology', A: 55, fullMark: 100 }
    ];

    let finalRadarData = radarData.length > 0 ? radarData : (isNeet ? defaultNeetRadar : defaultJeeRadar);
    
    // If stream is JEE, filter out any Biology/Botany/Zoology leftovers and ensure Mathematics is present
    if (!isNeet) {
      finalRadarData = finalRadarData.filter(r => !['biology', 'botany', 'zoology'].includes(r.subject.toLowerCase()));
      if (!finalRadarData.some(r => r.subject.toLowerCase().includes('math'))) {
        finalRadarData.push({ subject: 'Mathematics', A: 50, fullMark: 100 });
      }
    }

    const avgAccuracy = allAttempts.length > 0 ? Math.round(
      allAttempts.reduce((acc, curr) => {
        const total = curr.total_marks || curr.totalQuestions || 100;
        const score = curr.score || 0;
        return acc + (total > 0 ? (score / total) : 0);
      }, 0) / allAttempts.length * 100
    ) : 0;

    return {
      progressData,
      radarData: finalRadarData,
      avgAccuracy,
      totalAttempts: allAttempts.length,
      bestScore: allAttempts.length > 0 ? Math.max(...allAttempts.map(a => {
        const total = a.total_marks || a.totalQuestions || 100;
        const score = a.score || 0;
        return total > 0 ? Math.round((score / total) * 100) : 0;
      })) : 0
    };
  }, [examAttempts, dailyAttempts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">
            <Activity className="w-3 h-3" />
            <span>Real-time Intelligence Engine</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">AI Analytics Dashboard</h1>
          <p className="text-slate-500 font-medium max-w-xl">
            Live cognitive analytics tracking your accuracy, streaks, and subject-wise mastery level across all attempts.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-indigo-200">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span className="text-xs font-black uppercase tracking-widest">Real-Time Sync Active</span>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Avg. Accuracy', value: `${stats.avgAccuracy}%`, icon: <Target className="w-5 h-5" />, trend: 'Live Sync', up: true },
          { label: 'Total Attempts', value: stats.totalAttempts, icon: <Activity className="w-5 h-5" />, trend: 'Recorded', up: true },
          { label: 'Peak Performance', value: `${stats.bestScore}%`, icon: <Award className="w-5 h-5" />, trend: 'Best Score', up: true },
          { label: 'System Status', value: 'Online', icon: <Clock className="w-5 h-5" />, trend: 'Active', up: true }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                {stat.icon}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowUpRight className="w-3 h-3" />
                {stat.trend}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Score Trajectory</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Percentage Progression Across Tests</p>
            </div>
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.progressData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#scoreGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Subject Mastery</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Radar Analysis</p>
            </div>
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div className="h-72 w-full px-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" margin={{ top: 20, right: 35, bottom: 20, left: 35 }} data={stats.radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#334155', fontWeight: 800 }} />
                <PolarRadiusAxis domain={[0, 100]} axisLine={false} tick={false} />
                <Radar name="Accuracy" dataKey="A" stroke="#a855f7" fill="#c084fc" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
