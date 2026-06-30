import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Brain, Sparkles, User, Mail, Lock, Phone, GraduationCap, MapPin, Layers, ChevronRight, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { supabase, getSystemStreams } from '../supabase';
import { APP_NAME } from '../constants';

const Signup = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [collegeAddress, setCollegeAddress] = useState('');
  const [selectedStream, setSelectedStream] = useState('JEE Main & Advanced');
  const [streams, setStreams] = useState<string[]>([]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [isIndependent, setIsIndependent] = useState(true);
  const [adminList, setAdminList] = useState<any[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const { getApprovedAdmins } = await import('../supabase');
        const [admins, sysStreams] = await Promise.all([
          getApprovedAdmins(),
          getSystemStreams()
        ]);
        setAdminList(admins || []);
        if (admins && admins.length > 0) {
          setSelectedAdminId(admins[0].id);
        }
        setStreams(sysStreams || ['JEE Main & Advanced', 'NEET UG', 'KCET']);
        if (sysStreams && sysStreams.length > 0) {
          setSelectedStream(sysStreams[0]);
        }
      } catch (e) {
        console.error("Error loading signup options:", e);
      }
    };
    loadInitialData();
  }, []);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (mobileNumber.trim().length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      setIsLoading(false);
      return;
    }

    if (!isIndependent) {
      if (!selectedAdminId) {
        setError("Please select a coaching administrator.");
        setIsLoading(false);
        return;
      }
      try {
        const { getAdminStudentCount } = await import('../supabase');
        const count = await getAdminStudentCount(selectedAdminId);
        const selectedAdmin = adminList.find(a => a.id === selectedAdminId);
        const maxLimit = selectedAdmin?.admin_max_students ?? 30;
        
        if (count >= maxLimit) {
          setError(`Selected Admin capacity limit reached (${maxLimit} students). Please enroll independently or select another admin.`);
          setIsLoading(false);
          return;
        }
      } catch (countErr) {
        console.error("Error checking capacity:", countErr);
      }
    }

    if (supabase) {
      try {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();

        if (existingUser) {
          setError("An account has already been registered with this email address. Please log in instead.");
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Pre-enrollment email verification check bypassed:", err);
      }
    }

    try {
      let finalUserId = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      // 1. Trigger Supabase Auth Email Verification SignUp
      if (supabase) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              full_name: fullName,
              mobile_number: mobileNumber,
              college_name: collegeName,
              college_address: collegeAddress,
              stream: selectedStream
            }
          }
        });

        if (authError) {
          console.error("Supabase auth signup failed:", authError);
          setError(`Enrollment failed: ${authError.message}`);
          setIsLoading(false);
          return;
        }

        if (authData.user) {
          finalUserId = authData.user.id;
        }
      }

      const newUser = {
        id: finalUserId,
        email: email.toLowerCase().trim(),
        full_name: fullName,
        mobile_number: mobileNumber,
        college_name: collegeName,
        college_address: collegeAddress,
        stream: selectedStream,
        password: password,
        role: 'student',
        status: isIndependent ? 'approved' : 'pending',
        admin_id: isIndependent ? null : selectedAdminId,
        has_used_free_test: false,
        created_at: new Date().toISOString()
      };

      if (supabase) {
        // Use upsert to cleanly merge profile fields whether inserted by Auth trigger or direct enrollment
        const { error: dbError } = await supabase.from('profiles').upsert(newUser, { onConflict: 'id' });
        if (dbError) {
          console.warn("Supabase profile upsert warning, attempting update fallback:", dbError.message);
          const { error: updateErr } = await supabase.from('profiles').update(newUser).eq('id', finalUserId);
          if (updateErr) {
            console.error("Supabase profile creation/update failed:", updateErr);
            setError(`Profile setup error: ${updateErr.message}`);
            setIsLoading(false);
            return;
          }
        }
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error("Signup error:", err);
      setError("An unexpected error occurred during enrollment.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#f8faff] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-indigo-100 max-w-lg space-y-6 border border-slate-100 relative overflow-hidden">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-indigo-100/60">
            <Send className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
              Gmail Verification Required
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight pt-2">Check Your Inbox!</h1>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              We have dispatched a verification link to <strong className="text-slate-800">{email}</strong>.
            </p>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
              <span>Next Steps to Enter App</span>
            </div>
            <ol className="text-xs text-slate-600 font-medium leading-relaxed list-decimal list-inside space-y-1">
              <li>Open your Gmail inbox for <span className="font-bold text-slate-800">{email}</span>.</li>
              <li>Click the confirmation link to verify your email identity.</li>
              <li>Return here and authorize your access.</li>
            </ol>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            Go to Login Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faff] flex flex-col items-center justify-center p-6 relative overflow-hidden py-12">
      {/* Background Blobs */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-100/50 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-100/50 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-2000"></div>

      <div className="relative z-10 w-full max-w-[540px] flex flex-col items-center">
        {/* Logo Section */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="bg-white p-4 rounded-[2rem] shadow-2xl shadow-indigo-100 mb-4 group transition-transform hover:scale-105 duration-500">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-4 rounded-[1.5rem] shadow-inner">
              <Brain className="w-9 h-9 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{APP_NAME}</h1>
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
          </div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">Student Registration Portal</p>
        </div>

        {/* Signup Card */}
        <div className="w-full bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(79,70,229,0.1)] p-8 sm:p-10 border border-indigo-50/50 backdrop-blur-sm space-y-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 rounded-2xl text-xs font-bold outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="tel" 
                    placeholder="10-digit Mobile" 
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 rounded-2xl text-xs font-bold outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gmail / Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="email" 
                  placeholder="student@gmail.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 rounded-2xl text-xs font-bold outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Academic Stream Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Academic Stream</label>
              <div className="relative group">
                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                <select
                  value={selectedStream}
                  onChange={(e) => setSelectedStream(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 rounded-2xl text-xs font-bold outline-none transition-all appearance-none cursor-pointer"
                >
                  {streams.map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* College Name & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">College / School Name</label>
                <div className="relative group">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Institution Name" 
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 rounded-2xl text-xs font-bold outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">College Address</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="City, State" 
                    value={collegeAddress}
                    onChange={(e) => setCollegeAddress(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 rounded-2xl text-xs font-bold outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 rounded-2xl text-xs font-bold outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 rounded-2xl text-xs font-bold outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Enrollment Route */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enrollment Category</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsIndependent(true)}
                  className={`p-3 rounded-2xl border-2 text-center transition-all ${
                    isIndependent 
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm' 
                      : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  <span className="block font-black text-xs uppercase tracking-wider">Independent</span>
                  <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">1 Free Test, then ₹10</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsIndependent(false)}
                  className={`p-3 rounded-2xl border-2 text-center transition-all ${
                    !isIndependent 
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm' 
                      : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  <span className="block font-black text-xs uppercase tracking-wider">Coaching Admin</span>
                  <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">Admin Assigned</span>
                </button>
              </div>
            </div>

            {!isIndependent && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Coaching Admin</label>
                {adminList.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 text-xs font-bold rounded-2xl">
                    ⚠️ No coaching admins available. Please enroll as Independent student.
                  </div>
                ) : (
                  <select
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    className="w-full p-3.5 bg-slate-50/50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 rounded-2xl text-xs font-bold outline-none transition-all"
                  >
                    {adminList.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.full_name} ({admin.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Register & Verify Gmail
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span className="text-xs font-bold text-red-600 tracking-tight leading-relaxed">
                {error}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-slate-400 font-bold text-xs tracking-tight">
          Already Registered? <Link to="/login" className="text-indigo-600 hover:underline">Authorize Access</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
