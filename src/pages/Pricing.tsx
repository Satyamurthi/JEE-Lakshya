import React, { useState, useEffect } from 'react';
import { Crown, Check, Sparkles, ShieldCheck, Zap, CreditCard, ArrowRight, Lock, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { initiateRazorpayPayment } from '../utils/payment';
import { supabase, getSubscriptionPlans } from '../supabase';

interface PlanFeature {
  text: string;
  included: boolean;
  premiumOnly?: boolean;
}

interface Plan {
  id: 'basic' | 'premium' | 'ultimate';
  name: string;
  priceMonthly: number;
  priceYearly: number;
  description: string;
  features: PlanFeature[];
  badge?: string;
  highlighted?: boolean;
  color: string;
  glowColor: string;
}

const STATIC_PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Free Trial Pass',
    priceMonthly: 0,
    priceYearly: 0,
    description: 'Test the waters of JEE/NEET study terminals',
    color: 'from-slate-700 to-slate-800',
    glowColor: 'rgba(100, 116, 139, 0.1)',
    features: [
      { text: '1st NTA mock test completely free', included: true },
      { text: 'Subsequent tests at ₹10 per attempt', included: true },
      { text: 'Standard mock question database', included: true },
      { text: 'Step-by-step math solver explanations', included: true },
      { text: 'AI question synthesis', included: false },
      { text: 'Offline compiled test downloads', included: false },
      { text: '24/7 dedicated AI Tutor assistance', included: false },
    ]
  },
  {
    id: 'premium',
    name: 'Premium Pro Pass',
    priceMonthly: 199,
    priceYearly: 1188,
    badge: 'Most Popular',
    highlighted: true,
    description: 'Unlock unlimited access to daily challenges and practice tests',
    color: 'from-indigo-600 to-violet-600',
    glowColor: 'rgba(79, 70, 229, 0.25)',
    features: [
      { text: 'Unlimited Daily Challenge papers', included: true },
      { text: 'Unlimited Chapter Practice tests', included: true },
      { text: 'Unlimited Full NTA CBT Mock exams', included: true },
      { text: 'Real-time countdown testing portal', included: true },
      { text: 'Google Gemini AI dynamic updates', included: true },
      { text: 'Custom AI remedial test generator', included: true },
      { text: '24/7 dedicated AI Tutor assistance', included: true },
    ]
  },
  {
    id: 'ultimate',
    name: 'Ultimate Year Pass',
    priceMonthly: 599,
    priceYearly: 999,
    badge: 'Best Value - Save 85%',
    description: 'Exhaustive all-access ticket for JEE / NEET top-tier ranking',
    color: 'from-amber-500 via-orange-600 to-red-600',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    features: [
      { text: 'Everything in Premium Pro Pass', included: true },
      { text: 'Exclusive Year-Wise PYQ CBTs (2013-2026)', included: true },
      { text: 'NEET high-frequency matching modules', included: true },
      { text: 'Unlimited PDF mock paper downloads', included: true },
      { text: 'PWA Service Worker offline test caching', included: true },
      { text: '24/7 priority AI Tutor access', included: true },
      { text: 'Personalized performance profiling', included: true },
    ]
  }
];

const Pricing = () => {
  const [plans, setPlans] = useState<Plan[]>(STATIC_PLANS);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);

  const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const isIndependent = profile.role === 'student' && !profile.admin_id;

  // Fetch dynamic plans on mount
  useEffect(() => {
    const fetchDbPlans = async () => {
      try {
        const dbPlans = await getSubscriptionPlans();
        if (dbPlans && dbPlans.length > 0) {
          const mapped = dbPlans.map((d: any) => ({
            id: d.id,
            name: d.name,
            priceMonthly: Number(d.price_monthly ?? d.priceMonthly ?? 0),
            priceYearly: Number(d.price_yearly ?? d.priceYearly ?? 0),
            description: d.description || '',
            badge: d.badge || undefined,
            highlighted: !!d.highlighted,
            color: d.color || 'from-indigo-600 to-violet-600',
            glowColor: d.glow_color || d.glowColor || 'rgba(79, 70, 229, 0.25)',
            features: Array.isArray(d.features) ? d.features : []
          }));
          setPlans(mapped);
        }
      } catch (e) {
        console.warn("Could not load database plans:", e);
      }
    };
    fetchDbPlans();
  }, []);

  // Retrieve local transactions if any
  useEffect(() => {
    const cachedLogs = localStorage.getItem('user_payment_logs');
    if (cachedLogs) {
      try {
        setTransactionHistory(JSON.parse(cachedLogs));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);


  const handleSubscribe = async (plan: Plan) => {
    if (plan.id === 'basic') {
      alert("You already have the Basic Trial plan active by default.");
      return;
    }

    if (profile.role === 'admin' || profile.role === 'super_admin' || profile.admin_id) {
      alert("Coaching centre affiliated accounts bypass payment requirements automatically.");
      return;
    }

    const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    const periodName = billingPeriod === 'monthly' ? 'month' : 'year';
    
    setIsProcessing(plan.id);

    try {
      const receiptId = `sub_${plan.id}_${profile.id || 'student'}_${Date.now()}`;
      
      // Initialize Razorpay modal using payment utility
      const success = await initiateRazorpayPayment(
        price,
        profile.email || 'student@example.com',
        profile.full_name || 'Aspirant Student',
        receiptId
      );

      if (success) {
        // Calculate expiration timestamp
        const expiryDate = new Date();
        if (billingPeriod === 'monthly') {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        const tierName = plan.id;
        const expiryStr = expiryDate.toISOString();

        // 1. Attempt writing to Supabase
        let dbSaved = false;
        if (supabase && profile.id) {
          try {
            const { error: dbErr } = await supabase
              .from('profiles')
              .update({
                subscription_tier: tierName,
                subscription_expires_at: expiryStr
              })
              .eq('id', profile.id);

            if (dbErr) {
              console.warn("Could not save subscription in remote table (schema update might be pending):", dbErr);
            } else {
              dbSaved = true;
            }
          } catch (dbEx) {
            console.warn("Supabase database sync exception:", dbEx);
          }
        }

        // 2. Write locally (fallback + active session update)
        localStorage.setItem('user_subscription_tier', tierName);
        localStorage.setItem('user_subscription_expires_at', expiryStr);

        const updatedProfile = { 
          ...profile, 
          subscription_tier: tierName, 
          subscription_expires_at: expiryStr 
        };
        localStorage.setItem('user_profile', JSON.stringify(updatedProfile));

        // 3. Log transaction
        const newTransaction = {
          id: receiptId,
          planName: plan.name,
          amount: price,
          date: new Date().toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }),
          status: 'Successful',
          receipt: receiptId
        };
        
        const updatedHistory = [newTransaction, ...transactionHistory];
        setTransactionHistory(updatedHistory);
        localStorage.setItem('user_payment_logs', JSON.stringify(updatedHistory));

        setPaymentSuccess({
          planName: plan.name,
          amount: price,
          expiry: expiryDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
          dbSaved
        });
      }
    } catch (err: any) {
      console.error("Subscription payment flow interrupted:", err);
      alert(`Subscription payment failed: ${err.message || err}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const getActiveSubscriptionInfo = () => {
    const localTier = localStorage.getItem('user_subscription_tier') || profile.subscription_tier || 'free';
    const localExpiry = localStorage.getItem('user_subscription_expires_at') || profile.subscription_expires_at;

    if (profile.role === 'admin' || profile.role === 'super_admin' || profile.admin_id) {
      return { tier: 'Institute / Admin', expiresAt: 'Lifetime (Coaching Managed)', active: true };
    }

    if (localTier && localTier !== 'free' && localTier !== 'basic') {
      if (localExpiry) {
        const expiry = new Date(localExpiry);
        if (expiry > new Date()) {
          return { 
            tier: localTier.toUpperCase(), 
            expiresAt: expiry.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
            active: true 
          };
        }
      } else {
        return { tier: localTier.toUpperCase(), expiresAt: 'Unlimited', active: true };
      }
    }

    return { tier: 'Basic Free Plan', expiresAt: 'N/A', active: false };
  };

  const currentSub = getActiveSubscriptionInfo();

  if (paymentSuccess) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 md:p-12 shadow-2xl shadow-slate-200/50 space-y-6 relative overflow-hidden animate-in zoom-in duration-500">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-indigo-500 to-purple-500"></div>
          
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-3xl flex items-center justify-center mx-auto shadow-inner animate-bounce">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
              Payment Successful
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight pt-3">Welcome to Premium Access!</h2>
            <p className="text-slate-500 text-sm font-medium">
              Your subscription for <strong className="text-slate-800">{paymentSuccess.planName}</strong> has been configured successfully.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left space-y-4">
            <div className="flex justify-between items-center text-xs border-b border-slate-200/50 pb-3">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Amount Paid</span>
              <span className="font-black text-slate-800 text-sm">₹{paymentSuccess.amount}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-b border-slate-200/50 pb-3">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Plan Active Until</span>
              <span className="font-black text-slate-800 text-sm">{paymentSuccess.expiry}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Cloud Database Status</span>
              <span className={`font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md ${paymentSuccess.dbSaved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {paymentSuccess.dbSaved ? 'Synchronized' : 'Saved Locally (Sync Pending)'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setPaymentSuccess(null);
              window.location.href = '#/';
              window.location.reload();
            }}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span>Launch Premium Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      
      {/* Header section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.25em]">
          <Crown className="w-4 h-4 fill-indigo-100" />
          <span>Membership & Billing</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none animate-in fade-in duration-1000">
          Choose Your Speed of Success
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
          Unlock the state-of-the-art CBT simulator, daily challenges, and priority AI-synthesis models. Pay per test, or subscribe once to practice without restrictions.
        </p>

        {/* Current Active Plan Widget */}
        <div className="inline-flex items-center gap-3 bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm mt-3">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Plan:</span>
          <span className="text-xs font-black text-slate-800">{currentSub.tier}</span>
          <span className="text-slate-300">|</span>
          <span className="text-[11px] font-bold text-slate-500">Expires: {currentSub.expiresAt}</span>
        </div>
      </div>

      {/* Toggle period */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setBillingPeriod('monthly')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            billingPeriod === 'monthly'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Monthly Billing
        </button>
        <div className="relative">
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              billingPeriod === 'yearly'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>Yearly Billing</span>
            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider animate-bounce">
              Save Up to 85%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          const displayPrice = plan.id === 'ultimate' && billingPeriod === 'yearly' 
            ? '999' 
            : plan.id === 'premium' && billingPeriod === 'yearly'
            ? '99'
            : price;
          
          const labelSuffix = plan.priceMonthly === 0 ? '' : billingPeriod === 'yearly' ? '/mo' : '/mo';
          const billingInfo = plan.priceMonthly === 0 
            ? 'Free forever basic features' 
            : plan.id === 'ultimate' && billingPeriod === 'yearly'
            ? 'Billed ₹999 annually'
            : plan.id === 'premium' && billingPeriod === 'yearly'
            ? 'Billed ₹1,188 annually (₹99/mo)'
            : `Billed ₹${price} monthly`;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-[2.5rem] border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                plan.highlighted
                  ? 'border-indigo-500 md:scale-[1.03] shadow-2xl shadow-indigo-105 bg-gradient-to-b from-white to-slate-50/20'
                  : 'border-slate-200 hover:border-slate-300 hover:scale-[1.01] shadow-xl shadow-slate-100/50'
              }`}
              style={{
                boxShadow: plan.highlighted ? `0 25px 50px -12px ${plan.glowColor}` : undefined
              }}
            >
              {/* Header Top Decoration */}
              {plan.badge && (
                <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[9px] font-black text-white uppercase tracking-widest bg-gradient-to-r ${plan.color}`}>
                  {plan.badge}
                </div>
              )}

              <div className="p-8 md:p-10 space-y-8 flex-1">
                {/* Plan Info */}
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                  <p className="text-slate-400 text-xs font-semibold leading-relaxed">{plan.description}</p>
                </div>

                {/* Price tag */}
                <div className="py-2 border-y border-slate-100 flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                    ₹{displayPrice}
                  </span>
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                    {labelSuffix}
                  </span>
                  <div className="ml-auto text-right">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">{billingInfo}</p>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">What's Included</h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs font-semibold">
                        <span className={`p-0.5 rounded-full shrink-0 mt-0.5 ${
                          feature.included 
                            ? plan.highlighted ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'
                            : 'bg-slate-50 text-slate-300'
                        }`}>
                          <Check className="w-3.5 h-3.5" />
                        </span>
                        <span className={feature.included ? 'text-slate-700' : 'text-slate-400 line-through decoration-slate-200'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button Container */}
              <div className="p-8 md:p-10 pt-0">
                {plan.id === 'basic' ? (
                  <div className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest text-center">
                    Current Free Default
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isProcessing !== null || !isIndependent}
                    className={`w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${plan.color}`}
                    style={{ 
                      boxShadow: plan.glowColor ? `0 10px 25px -4px ${plan.glowColor}` : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    {isProcessing === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opening Secure Gateway...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Subscribe Now</span>
                      </>
                    )}
                  </button>
                )}
                {!isIndependent && plan.id !== 'basic' && (
                  <p className="text-[9px] text-slate-400 font-bold text-center mt-2 uppercase tracking-wide">
                    Center student accounts bypass payment locks
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction History Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 md:p-10 shadow-xl shadow-slate-100/50 space-y-6">
        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-500" />
          <span>Your Transaction History</span>
        </h3>
        
        {transactionHistory.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-2xl">
            <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 font-bold text-xs">No transactions logged on this device yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9px] font-black">
                  <th className="py-4 text-left">Receipt Reference</th>
                  <th className="py-4 text-left">Subscribed Plan</th>
                  <th className="py-4 text-left">Amount</th>
                  <th className="py-4 text-left">Transaction Date</th>
                  <th className="py-4 text-left">Gateway Status</th>
                </tr>
              </thead>
              <tbody>
                {transactionHistory.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 font-mono text-[10px] text-slate-400">{tx.id}</td>
                    <td className="py-4 text-slate-800 font-bold">{tx.planName}</td>
                    <td className="py-4 text-slate-900 font-black">₹{tx.amount}</td>
                    <td className="py-4 text-slate-500 font-medium">{tx.date}</td>
                    <td className="py-4">
                      <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border border-emerald-100">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default Pricing;
