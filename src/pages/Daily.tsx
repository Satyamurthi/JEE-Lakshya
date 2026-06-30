
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Zap, CheckCircle2, Lock, Play, Trophy, Clock, ChevronRight, Brain, Target, Sparkles, DollarSign, X, Loader2 } from 'lucide-react';
import { getDailyChallenge, getUserDailyAttempt, getDailyAttemptsByChallenge, getUserAllDailyAttempts } from '../supabase';
import { initiateRazorpayPayment, checkSubscriptionActive } from '../utils/payment';
import { calculateDailyStreak } from '../utils/metricsHelper';

const Daily = () => {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
  
  const isIndependent = profile.role === 'student' && !profile.admin_id;
  const needsPayment = isIndependent && profile.has_used_free_test && !checkSubscriptionActive(profile);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadDaily = async () => {
      setLoading(true);
      try {
        const targetAdminId = isIndependent ? null : profile.admin_id;
        const [challengeData, attemptData] = await Promise.all([
          getDailyChallenge(today, targetAdminId),
          getUserDailyAttempt(profile.id, today)
        ]);
        setChallenge(challengeData);
        setAttempt(attemptData);

        if (challengeData) {
          const attempts = await getDailyAttemptsByChallenge(challengeData.id);
          let leaderboardList = attempts || [];
          // For Super Admin challenge (admin_id === null), filter strictly for independent students
          if (!challengeData.admin_id) {
            leaderboardList = leaderboardList.filter((item: any) => !item.admin_id);
          }
          setLeaderboard(leaderboardList);
        }

        // Load streak for user
        const historyRaw = localStorage.getItem('exam_history');
        let combinedHistory = historyRaw ? JSON.parse(historyRaw) : [];
        if (profile.id) {
          try {
            const remoteDaily = await getUserAllDailyAttempts(profile.id);
            if (Array.isArray(remoteDaily) && remoteDaily.length > 0) {
              combinedHistory = [...combinedHistory, ...remoteDaily];
            }
          } catch (e) {}
        }
        const userStreak = calculateDailyStreak(combinedHistory);
        setStreak(userStreak);

      } catch (err) {
        console.error("Error loading daily challenge:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDaily();
  }, [today, profile.id, profile.admin_id]);

  const handlePayAndStart = async () => {
    setIsProcessingPayment(true);
    try {
      const receipt = `daily_${profile.id}_${Date.now()}`;
      const success = await initiateRazorpayPayment(
        10,
        profile.email || 'student@example.com',
        profile.full_name || 'Aspirant',
        receipt
      );
      if (success) {
        setIsPaid(true);
        setIsPaymentModalOpen(false);
        localStorage.setItem('active_exam_questions', JSON.stringify(challenge.questions));
        localStorage.setItem('active_exam_config', JSON.stringify({
            type: 'Daily Challenge',
            challenge_id: challenge.id,
            date: today,
            duration: 30,
            paid: true
        }));
        navigate('/exam-portal');
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

  const handleStart = async () => {
    if (!challenge) return;
    if (needsPayment && !isPaid) {
      handlePayAndStart();
      return;
    }

    if (isIndependent && !profile.has_used_free_test) {
      try {
        const { supabase } = await import('../supabase');
        if (supabase) {
          await supabase.from('profiles').update({ has_used_free_test: true }).eq('id', profile.id);
        }
        const updatedProfile = { ...profile, has_used_free_test: true };
        localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      } catch (err) {
        console.error("Error setting free test status:", err);
      }
    }

    // Store challenge questions in local storage for the exam portal
    localStorage.setItem('active_exam_questions', JSON.stringify(challenge.questions));
    localStorage.setItem('active_exam_config', JSON.stringify({
        type: 'Daily Challenge',
        challenge_id: challenge.id,
        date: today,
        duration: 30, // 30 minutes for daily challenge
        paid: isIndependent
    }));
    navigate('/exam-portal');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">
            <Calendar className="w-3 h-3" />
            <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Daily Challenge</h1>
          <p className="text-slate-500 font-medium max-w-xl">
            Sharpen your skills with a curated set of high-impact JEE questions. Resetting every 24 hours.
          </p>
        </div>
        
        {attempt && (
          <div className="bg-emerald-50 border border-emerald-100 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Completed</p>
              <p className="text-lg font-black text-emerald-900">Score: {attempt.score}/{attempt.total_marks}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Challenge Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`relative overflow-hidden rounded-[2.5rem] border transition-all duration-500 ${
            challenge 
              ? 'bg-white border-slate-200 shadow-xl shadow-slate-200/50' 
              : 'bg-slate-50 border-slate-200 border-dashed'
          }`}>
            {challenge && (
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Brain className="w-48 h-48" />
              </div>
            )}

            <div className="p-10 relative z-10">
              {challenge ? (
                <div className="space-y-8">
                  <div className="flex items-start justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-200">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">Today's Strategic Set</h2>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
                          <Target className="w-4 h-4 text-slate-600" />
                          <span className="text-xs font-bold text-slate-700">{challenge.questions.length} Questions</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
                          <Clock className="w-4 h-4 text-slate-600" />
                          <span className="text-xs font-bold text-slate-700">30 Minutes</span>
                        </div>
                        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-indigo-700">AI Generated</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {['Physics', 'Chemistry', 'Mathematics'].map(sub => {
                      const count = challenge.questions.filter((q: any) => q.subject === sub).length;
                      return (
                        <div key={sub} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{sub}</p>
                          <p className="text-xl font-black text-slate-900">{count} <span className="text-xs font-bold text-slate-400">Q</span></p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4">
                    {attempt ? (
                      <button 
                        onClick={() => navigate('/history')}
                        className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        View Detailed Analysis
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ) : (
                      <button 
                        onClick={handleStart}
                        className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 group transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Start Challenge Now
                        <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                  <div className="bg-slate-100 p-6 rounded-full">
                    <Lock className="w-12 h-12 text-slate-300" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-black text-slate-900">Challenge Not Available</h2>
                    <p className="text-slate-500 text-sm max-w-xs font-medium">
                      The daily challenge for today hasn't been published yet. Check back soon!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-8 space-y-4">
            <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Challenge Rules
            </h3>
            <ul className="space-y-3">
              {[
                "One attempt allowed per day for score tracking.",
                "Strict 30-minute timer applies once started.",
                "Questions are curated to cover high-weightage JEE topics.",
                "Detailed AI analysis available immediately after submission."
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-3 text-xs font-bold text-amber-800/80 leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-lg shadow-slate-200/50 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Global Leaderboard</h3>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Independent</span>
            </div>
            <div className="space-y-4">
              {leaderboard.length > 0 ? (
                leaderboard.slice(0, 5).map((item, i) => {
                  const displayName = item.user_name || (item.user_email ? item.user_email.split('@')[0] : `Aspirant #${item.user_id?.substring(0,4) || i+1}`);
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                          i === 0 ? 'bg-amber-100 text-amber-600 shadow-sm' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-amber-700/10 text-amber-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 line-clamp-1">{displayName}</p>
                          <p className="text-[10px] font-bold text-slate-400">Score: {item.score}/{item.total_marks || 100}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">+{item.score} pts</span>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-400">No independent challenge submissions yet for today.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy className="w-24 h-24" />
            </div>
            <div className="relative z-10 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest opacity-80">Daily Challenge Streak</h3>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black">{streak}</span>
                <span className="text-lg font-bold mb-1 opacity-80">Days</span>
              </div>
              <p className="text-xs font-bold leading-relaxed opacity-70">
                {streak > 0 
                  ? `Your streak is active! Complete today's challenge before 23:59 IST to keep it going.` 
                  : `Take today's Daily Challenge to start your official IST consecutive day streak!`}
              </p>
            </div>
          </div>
        </div>
      </div>
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Access Gate</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily challenge Unlock</p>
                </div>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {paymentSuccess ? (
              <div className="text-center py-8 space-y-6 animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-slate-900">Payment Successful</h4>
                  <p className="text-xs font-bold text-slate-500 font-sans">Your daily challenge environment has been unlocked.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Amount Due</span>
                  <span className="text-2xl font-black text-slate-900">₹10.00</span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  As an independent student, unlock today's daily challenge set powered by Razorpay Standard Checkout.
                </p>
                <button
                  type="button"
                  onClick={handlePayAndStart}
                  disabled={isProcessingPayment}
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                >
                  {isProcessingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  {isProcessingPayment ? "Opening Checkout..." : "Pay with Razorpay (₹10)"}
                </button>
                <div className="text-center pt-2 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Or Get Unlimited Access</p>
                  <button
                    type="button"
                    onClick={() => { setIsPaymentModalOpen(false); navigate('/pricing'); }}
                    className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    🚀 Upgrade to Premium Plan (₹299/mo)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AlertCircle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default Daily;
