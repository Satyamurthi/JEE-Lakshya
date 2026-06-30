import React, { useState, useEffect } from 'react';
import type { ReactNode, FC } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LogOut, Bell, Search, Menu, Brain, ChevronLeft, Sparkles, Download, WifiOff, ShieldAlert, Lock, Shield, Snowflake, Ban, Layers, Crown, Sliders, Zap, X } from 'lucide-react';
import { MENU_ITEMS, APP_NAME } from './constants';
import { supabase } from './supabase';

// Direct imports for all pages to ensure stability and avoid context issues
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ExamSetup from './pages/ExamSetup';
import ExamPortal from './pages/ExamPortal';
import Analytics from './pages/Analytics';
import History from './pages/History';
import Results from './pages/Results';
import Admin from './pages/Admin';
import Practice from './pages/Practice';
import Daily from './pages/Daily';
import Settings from './pages/Settings';
import SuperAdmin from './pages/SuperAdmin';
import YearWisePYQ from './pages/YearWisePYQ';
import Pricing from './pages/Pricing';


const getSafeProfile = (): any => {
  try {
    const raw = localStorage.getItem('user_profile');
    if (!raw || raw === 'undefined') return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error("Safe profile parse failed:", e);
    return {};
  }
};

const resizeAndConvertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorType?: 'network' | 'logic';
}

const ProtectedRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const profileRaw = localStorage.getItem('user_profile');
  const [isAdminFrozen, setIsAdminFrozen] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  if (!profileRaw) return <Navigate to="/login" replace />;
  const profile = JSON.parse(profileRaw);

  useEffect(() => {
    let isMounted = true;
    const checkAdminStatus = async () => {
      if (profile.role === 'student' && profile.admin_id && supabase) {
        try {
          const { data: admin } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', profile.admin_id)
            .maybeSingle();
          if (isMounted) {
            if (admin && admin.status !== 'approved') {
              setIsAdminFrozen(true);
            } else {
              setIsAdminFrozen(false);
            }
          }
        } catch (err) {
          console.error("Admin status check error in ProtectedRoute:", err);
          if (isMounted) setIsAdminFrozen(false);
        }
      } else {
        if (isMounted) setIsAdminFrozen(false);
      }
      if (isMounted) setLoading(false);
    };

    checkAdminStatus();
    return () => { isMounted = false; };
  }, [profile.admin_id]);

  if (profile.status === 'frozen' || isAdminFrozen === true) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="bg-slate-800/80 p-10 rounded-[2.5rem] border border-slate-700/80 shadow-2xl max-w-lg space-y-6 relative overflow-hidden animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-cyan-500/10 text-cyan-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-cyan-500/20">
            <Snowflake className="w-10 h-10 animate-spin-slow" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 bg-cyan-500/10 px-4 py-1.5 rounded-full border border-cyan-500/20">
              Account Suspended / Frozen
            </span>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight pt-2">Access Frozen by Super Admin</h2>
            <p className="text-xs font-bold text-slate-400 leading-relaxed">
              {profile.role === 'admin' 
                ? 'Your Coaching Administrator account has been frozen by the Super Admin. All administrative functions and student accesses under your coaching institute are suspended.' 
                : 'Access for your coaching institute has been frozen by the Super Admin. Please contact your coaching institute administrator.'}
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('user_profile');
              window.location.href = '#/login';
            }}
            className="w-full py-4 bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-600 transition-all shadow-lg"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (profile.status !== 'approved') return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const profileRaw = localStorage.getItem('user_profile');
  if (!profileRaw) return <Navigate to="/login" replace />;
  const profile = JSON.parse(profileRaw);
  if (profile.role !== 'admin' && profile.role !== 'super_admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const SuperAdminRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const profileRaw = localStorage.getItem('user_profile');
  if (!profileRaw) return <Navigate to="/login" replace />;
  const profile = JSON.parse(profileRaw);
  if (profile.role !== 'super_admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const StudentModuleRoute: FC<{ children: ReactNode; moduleKey?: string }> = ({ children, moduleKey }) => {
  const [liveProfile, setLiveProfile] = useState<any>(() => {
    const profileRaw = localStorage.getItem('user_profile');
    return profileRaw ? JSON.parse(profileRaw) : null;
  });
  const [syncing, setSyncing] = useState(true);
  const [adminPermissions, setAdminPermissions] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const syncProfile = async () => {
      const stored = localStorage.getItem('user_profile');
      if (!stored) {
        if (isMounted) setSyncing(false);
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed.selected_stream) {
        const { switchSupabaseBackend } = await import('./supabase');
        switchSupabaseBackend(parsed.selected_stream);
      }
      if (supabase && parsed.id) {
        try {
          const { data } = await supabase.from('profiles').select('*').eq('id', parsed.id).maybeSingle();
          if (data && isMounted) {
            const merged = { ...parsed, ...data };
            localStorage.setItem('user_profile', JSON.stringify(merged));
            
            // Sync local subscription state with database values to prevent caching bugs
            if (data.subscription_tier) {
              localStorage.setItem('user_subscription_tier', data.subscription_tier);
            } else {
              localStorage.removeItem('user_subscription_tier');
            }
            if (data.subscription_expires_at) {
              localStorage.setItem('user_subscription_expires_at', data.subscription_expires_at);
            } else {
              localStorage.removeItem('user_subscription_expires_at');
            }
            
            setLiveProfile(merged);
          }
        } catch (e) {
          console.warn("Profile sync warning in StudentModuleRoute:", e);
        }
      }
      if (isMounted) setSyncing(false);
    };

    syncProfile();
    return () => { isMounted = false; };
  }, [moduleKey]);

  useEffect(() => {
    let isMounted = true;
    const fetchAdminPermissions = async () => {
      if (liveProfile && liveProfile.role === 'student' && liveProfile.admin_id && supabase) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('super_admin_permission, can_access_daily, can_access_full_exam, can_access_practice')
            .eq('id', liveProfile.admin_id)
            .maybeSingle();
          if (data && isMounted) {
            setAdminPermissions(data);
          }
        } catch (e) {
          console.warn("Error fetching admin permissions in StudentModuleRoute:", e);
        }
      }
    };
    fetchAdminPermissions();
    return () => { isMounted = false; };
  }, [liveProfile?.admin_id]);

  if (!liveProfile) return <Navigate to="/login" replace />;

  if (liveProfile.role === 'admin') {
    const isMasterPermission = !!liveProfile.super_admin_permission;
    const isSpecificPermission = moduleKey ? !!liveProfile[moduleKey] : false;
    const isGranted = isMasterPermission || isSpecificPermission;

    if (!isGranted && !syncing) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl max-w-lg space-y-6 relative overflow-hidden">
            <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-amber-100/60">
              <Lock className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 bg-amber-50 px-4 py-1.5 rounded-full border border-amber-100">
                Coaching Admin Restricted
              </span>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight pt-2">Module Access Locked</h2>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                This testing module is currently locked for your admin account. Super Admin can configure individual permissions for Daily Challenges, Full Exams, and Chapter Practice.
              </p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left space-y-3">
              <div className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>How to unlock this specific module?</span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Ask your Super Admin to click "Grant All" or enable individual module permissions for your Coaching Admin account.
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  if (liveProfile.role === 'student' && liveProfile.admin_id) {
    const perms = adminPermissions || {};
    const isMasterPermission = !!perms.super_admin_permission;
    const isSpecificPermission = moduleKey ? !!perms[moduleKey] : false;
    const isGranted = isMasterPermission || isSpecificPermission;

    if (!isGranted && !syncing && adminPermissions !== null) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl max-w-lg space-y-6 relative overflow-hidden">
            <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-amber-100/60">
              <Lock className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 bg-amber-50 px-4 py-1.5 rounded-full border border-amber-100">
                Coaching Admin Restricted
              </span>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight pt-2">Module Access Locked</h2>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                This testing module is currently locked for your coaching center. Access permissions for Daily Challenges, Full Exams, and Chapter Practice are managed by your coaching administrator's licensing package.
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

const getDisplayBrand = (profile: any) => {
  if (!profile || !profile.role) return "Lakshya";
  const stream = profile.selected_stream || localStorage.getItem('active_stream') || "";
  if (stream.toLowerCase().includes("jee")) return "JEE Lakshya";
  if (stream.toLowerCase().includes("neet")) return "NEET Lakshya";
  if (stream.toLowerCase().includes("kcet")) return "KCET Lakshya";
  if (stream.toLowerCase().includes("upsc")) return "UPSC Lakshya";
  if (stream) {
    const shortName = stream.split(' ')[0];
    return `${shortName} Lakshya`;
  }
  return "Lakshya";
};

const Sidebar = ({ isOpen, toggle, installPrompt, onInstall }: { isOpen: boolean, toggle: () => void, installPrompt: any, onInstall: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = getSafeProfile();

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('user_profile');
    localStorage.removeItem('user_subscription_tier');
    localStorage.removeItem('user_subscription_expires_at');
    localStorage.removeItem('unlocked_pyq_papers');
    localStorage.removeItem('user_payment_logs');
    localStorage.removeItem('active_session');
    localStorage.removeItem('active_exam_questions');
    localStorage.removeItem('active_exam_config');
    navigate('/login');
  };

  return (
    <>
      {isOpen && (
        <div 
          className="no-print fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggle}
        />
      )}
      
      <div 
        className={`no-print fixed inset-y-0 left-0 z-50 w-[280px] bg-slate-900/95 backdrop-blur-2xl border-r border-white/5 shadow-2xl transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col`}
      >
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">{getDisplayBrand(profile)}</span>
          </div>
          <button onClick={toggle} className="lg:hidden p-2 text-slate-400 hover:text-white rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar pt-4">
          {MENU_ITEMS.map((item) => {
            if (item.id === 'admin' && profile.role !== 'admin') return null;
            if (item.id === 'super-admin' && profile.role !== 'super_admin') return null;
            if (item.id === 'pricing' && profile.role === 'admin') return null;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  if (window.innerWidth < 1024) toggle();
                }}
                className={`flex items-center w-full px-5 py-3.5 text-sm font-bold rounded-2xl transition-all group relative overflow-hidden ${
                  isActive
                    ? 'text-white shadow-lg shadow-indigo-900/50 bg-gradient-to-r from-indigo-600 to-violet-600'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {!isActive && (
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                )}
                
                <span className={`relative z-10 mr-4 transition-transform group-hover:scale-110 ${isActive ? 'text-indigo-200' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                  {item.icon}
                </span>
                <span className="relative z-10 tracking-wide font-extrabold uppercase text-[11px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 space-y-4 bg-slate-900/50 border-t border-white/5">
          {installPrompt && (
            <button
              onClick={onInstall}
              className="flex items-center justify-center w-full px-4 py-3 text-[10px] font-black text-indigo-100 bg-indigo-600/20 border border-indigo-500/30 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm group animate-in fade-in"
            >
              <Download className="w-3.5 h-3.5 mr-2" />
              Install App
            </button>
          )}

          <div className="bg-white/5 rounded-[1.5rem] p-4 border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-400 to-cyan-400 flex items-center justify-center text-slate-900 font-black shadow-lg shadow-emerald-900/20">
                 {(profile.full_name || 'U').substring(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[11px] font-black text-white truncate tracking-tight">{profile.full_name}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{profile.role}</p>
              </div>
            </div>
            {profile.role === 'super_admin' && (
              <button 
                onClick={() => {
                  sessionStorage.removeItem('super_admin_stream_selected');
                  window.location.reload();
                }}
                className="flex items-center justify-center w-full px-4 py-3 text-[10px] font-black text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm group mb-2"
              >
                <Layers className="w-3.5 h-3.5 mr-2 group-hover:rotate-45 transition-transform" />
                Switch Stream
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-4 py-3 text-[10px] font-black text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm group"
            >
              <LogOut className="w-3.5 h-3.5 mr-2 group-hover:animate-pulse" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
};



const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const profile = getSafeProfile();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState(profile.full_name || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile.avatar_url || '');
  const [editCollegeName, setEditCollegeName] = useState(profile.college_name || '');
  const [editCollegeAddress, setEditCollegeAddress] = useState(profile.college_address || '');
  const [editStream, setEditStream] = useState(profile.stream || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (isEditProfileModalOpen) {
      const latestProfile = getSafeProfile();
      setEditName(latestProfile.full_name || '');
      setEditAvatarUrl(latestProfile.avatar_url || '');
      setEditCollegeName(latestProfile.college_name || '');
      setEditCollegeAddress(latestProfile.college_address || '');
      setEditStream(latestProfile.stream || '');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isEditProfileModalOpen]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      if (newPassword) {
        if (newPassword.length < 6) {
          alert("New password must be at least 6 characters long.");
          setIsUpdatingProfile(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          alert("New passwords do not match.");
          setIsUpdatingProfile(false);
          return;
        }

        if (supabase) {
          const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
          if (authError) throw authError;
        }
      }

      const updatedProfile = { 
        ...profile, 
        full_name: editName, 
        avatar_url: editAvatarUrl,
        college_name: editCollegeName,
        college_address: editCollegeAddress,
        stream: editStream,
        ...(newPassword ? { password: newPassword } : {})
      };

      if (supabase && profile.id) {
        const { error: dbError } = await supabase
          .from('profiles')
          .update({ 
            full_name: editName, 
            avatar_url: editAvatarUrl,
            college_name: editCollegeName,
            college_address: editCollegeAddress,
            stream: editStream,
            ...(newPassword ? { password: newPassword } : {})
          })
          .eq('id', profile.id);
          
        if (dbError) {
          console.warn("Database profile sync failed, using local storage:", dbError.message);
          if (dbError.message.includes('avatar_url') || dbError.message.includes('column')) {
            alert(`⚠️ Profile updated in this browser session. However, to save it permanently in the cloud backend, please run this SQL query in your Supabase SQL Editor:\n\nALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;`);
          } else {
            alert(`⚠️ Saved locally. Cloud sync failed: ${dbError.message}`);
          }
        }
      }

      localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      alert("🎉 Account settings updated successfully!");
      setIsEditProfileModalOpen(false);
    } catch (err: any) {
      console.error("Profile update failed:", err);
      alert(`Update failed: ${err.message || 'Unknown database error'}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const notifications = [
    { id: 1, title: "Daily Challenge Published", desc: "Today's high-impact 10-Q paper is live.", time: "10m ago", icon: "⚡" },
    { id: 2, title: "Cognitive Sync Active", desc: "AI performance tracking updated across modules.", time: "1h ago", icon: "🤖" },
    { id: 3, title: "Streak Milestone", desc: "You maintain a multi-day study streak!", time: "3h ago", icon: "🔥" }
  ];

  return (
    <header className="sticky top-0 z-30 lg:ml-[280px] transition-all pt-4 px-6 sm:px-10 pb-2 no-print">
      <div className="glass-panel rounded-[2rem] px-6 h-20 flex items-center justify-between shadow-sm shadow-slate-200/50 relative">
        <div className="flex items-center gap-6 flex-1">
          <button onClick={toggleSidebar} className="lg:hidden p-3 bg-white text-slate-600 border border-slate-100 rounded-xl shadow-sm active:scale-95 transition-all">
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="hidden lg:flex items-center w-[360px]">
            <div className="relative w-full group">
              <input type="text" name="chrome_prevent_autofill_email" style={{ display: 'none' }} tabIndex={-1} readOnly />
              <input type="password" name="chrome_prevent_autofill_pass" style={{ display: 'none' }} tabIndex={-1} readOnly />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="search"
                name="app_global_terminal_search"
                id="app_global_terminal_search"
                autoComplete="off"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                placeholder="Search topics, modules, insights..."
                className="w-full pl-12 pr-6 py-3 bg-white/50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 rounded-2xl text-xs font-bold outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 bg-gradient-to-r from-violet-600/5 to-indigo-600/5 px-4 py-2 rounded-full border border-indigo-200/30 hidden sm:flex">
             <Sparkles className="w-3 h-3 text-indigo-600 fill-indigo-600 animate-pulse" />
             <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Cognitive Sync</span>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setUnreadCount(0); }}
              className="p-3 text-slate-400 hover:bg-white hover:text-indigo-600 rounded-2xl relative transition-all border border-transparent hover:border-slate-100"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-ping"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">System Alerts</h4>
                  <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">Live</span>
                </div>
                <div className="space-y-4 max-h-72 overflow-y-auto custom-scrollbar">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex gap-3 items-start p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-indigo-50/40 transition-colors">
                      <span className="text-base">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-black text-slate-800 truncate">{n.title}</p>
                          <span className="text-[8px] font-bold text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{n.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-[1px] h-8 bg-slate-200 hidden sm:block mx-2" />
          <div className="flex items-center gap-4 pl-1">
            <button 
              onClick={() => setIsEditProfileModalOpen(true)}
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 flex items-center justify-center text-white font-black shadow-lg shadow-slate-900/20 ring-4 ring-white hover:scale-105 transition-all cursor-pointer overflow-hidden"
              title="Click to Edit Profile & Avatar"
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover" />
              ) : (
                (profile.full_name || 'U').substring(0, 1).toUpperCase()
              )}
            </button>
          </div>
        </div>
      </div>

      {isEditProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 md:p-10 shadow-2xl border border-slate-200 relative animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">My Account Settings</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">View & update your profile parameters</p>
              </div>
              <button 
                onClick={() => setIsEditProfileModalOpen(false)} 
                className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProfile} className="space-y-6 overflow-y-auto pr-2 flex-1 custom-scrollbar">
              {/* Account Overview Cards (ReadOnly Parameters) */}
              <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-100 space-y-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-mono">Immutable Account Credentials</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Email ID (Disabled)</label>
                    <input 
                      type="text" 
                      disabled 
                      value={profile.email || 'N/A'} 
                      className="w-full p-3 bg-slate-100/50 border border-slate-200 rounded-xl font-bold text-xs text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone Number (Disabled)</label>
                    <input 
                      type="text" 
                      disabled 
                      value={profile.mobile_number || 'N/A'} 
                      className="w-full p-3 bg-slate-100/50 border border-slate-200 rounded-xl font-bold text-xs text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Student System ID (Disabled)</label>
                    <input 
                      type="text" 
                      disabled 
                      value={profile.id || 'N/A'} 
                      className="w-full p-3 bg-slate-100/50 border border-slate-200 rounded-xl font-mono text-[10px] text-slate-400 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Affiliated Coaching ID (Disabled)</label>
                    <input 
                      type="text" 
                      disabled 
                      value={profile.admin_id || 'Direct Independent Student'} 
                      className="w-full p-3 bg-slate-100/50 border border-slate-200 rounded-xl font-bold text-xs text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block font-mono">Editable Student Information</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Student Full Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-xs text-slate-900 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Exam Stream</label>
                    <select
                      value={editStream}
                      onChange={(e) => setEditStream(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-xs text-slate-900 outline-none transition-all"
                    >
                      <option value="JEE Main & Advanced">JEE Main & Advanced</option>
                      <option value="NEET UG">NEET UG</option>
                      <option value="KCET">KCET</option>
                      <option value="UPSC">UPSC</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-950 flex items-center justify-center text-white font-black text-xl shadow-md overflow-hidden relative shrink-0 border border-slate-200">
                    {editAvatarUrl ? (
                      <img src={editAvatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      (editName || 'U').substring(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-mono">Profile Photo (JPG/PNG)</label>
                    <div className="flex items-center gap-2">
                      <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all shadow-sm">
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const base64 = await resizeAndConvertToBase64(file);
                                setEditAvatarUrl(base64);
                              } catch (err) {
                                alert("Failed to process uploaded image.");
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      {editAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setEditAvatarUrl('')}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">School / College Name</label>
                    <input
                      type="text"
                      value={editCollegeName}
                      onChange={(e) => setEditCollegeName(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-xs text-slate-900 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">College Location / Address</label>
                    <input
                      type="text"
                      value={editCollegeAddress}
                      onChange={(e) => setEditCollegeAddress(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-xs text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Password Edit Section */}
              <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100 space-y-4">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block font-mono flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" /> Modify Account Access Password
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">New Password (Min 6 chars)</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-3 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl font-bold text-xs text-slate-900 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-3 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl font-bold text-xs text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 shrink-0">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdatingProfile ? "Saving Profile Parameters..." : "Save Account Parameters"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};




const BackgroundBlobs = () => (
  <div className="no-print fixed inset-0 overflow-hidden pointer-events-none -z-10 select-none">
    <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob"></div>
    <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-cyan-200/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-200/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob animation-delay-4000"></div>
  </div>
);

const AppContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const location = useLocation();
  const isAuth = location.pathname.startsWith('/login') || location.pathname.startsWith('/signup');
  const isExamPortal = location.pathname.startsWith('/exam-portal') || location.pathname.startsWith('/exam_portal');

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => { setDeferredPrompt(null); });
    }
  };

  const profile = getSafeProfile();
  const isSuperAdmin = profile.role === 'super_admin';
  const hasSelectedStream = !!sessionStorage.getItem('super_admin_stream_selected');
  const showStreamSelect = isSuperAdmin && !hasSelectedStream && !isAuth;

  if (showStreamSelect) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl">
        <div className="bg-white rounded-[2.5rem] w-full max-w-3xl p-10 md:p-14 space-y-10 shadow-2xl border border-white/10">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-indigo-100/60">
              <Brain className="w-10 h-10 animate-pulse" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Select Active Stream</h2>
            <p className="text-slate-500 font-bold text-sm max-w-md mx-auto">
              Welcome Super Admin. Please select the academic stream you want to enter. This dynamically connects to the respective Supabase database backend.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: 'JEE Main & Advanced', icon: Brain, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100 hover:border-blue-300', desc: 'Vite/Supabase JEE Instance' },
              { name: 'NEET UG', icon: Crown, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300', desc: 'Vite/Supabase NEET Instance' },
              { name: 'KCET', icon: Sliders, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100 hover:border-indigo-300', desc: 'Vite/Supabase Karnataka CET Instance' },
              { name: 'UPSC', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100 hover:border-amber-300', desc: 'Vite/Supabase Civil Services Instance' }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={async () => {
                    const { switchSupabaseBackend } = await import('./supabase');
                    switchSupabaseBackend(item.name);
                    sessionStorage.setItem('super_admin_stream_selected', 'true');
                    window.location.reload();
                  }}
                  className={`p-6 rounded-3xl border text-left transition-all hover:scale-[1.02] flex items-start gap-4 ${item.bg}`}
                >
                  <div className={`p-3 rounded-2xl bg-white shadow-md ${item.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base">{item.name}</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="pt-4 text-center">
            <button
              onClick={async () => {
                if (supabase) await supabase.auth.signOut();
                localStorage.removeItem('user_profile');
                localStorage.removeItem('user_subscription_tier');
                localStorage.removeItem('user_subscription_expires_at');
                localStorage.removeItem('unlocked_pyq_papers');
                localStorage.removeItem('user_payment_logs');
                localStorage.removeItem('active_session');
                localStorage.removeItem('active_exam_questions');
                localStorage.removeItem('active_exam_config');
                window.location.reload();
              }}
              className="px-6 py-3 text-red-500 bg-red-50 hover:bg-red-100 transition-all font-bold text-xs uppercase tracking-widest rounded-xl"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#0f172a] selection:bg-indigo-100 selection:text-indigo-900">
        {isOffline && (
          <div 
             className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl flex items-center gap-4 border border-white/10"
          >
             <div className="bg-red-500 p-1.5 rounded-lg animate-pulse"><WifiOff className="w-4 h-4 text-white" /></div>
             <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-widest">Network Interrupted</span>
                <span className="text-[10px] font-bold text-slate-400">Operating on local cache. Reconnect to sync.</span>
             </div>
          </div>
        )}

        {isAuth ? (
          <div className="w-full min-h-screen">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        ) : isExamPortal ? (
          <div className="w-full h-full">
            <ProtectedRoute>
              <Routes>
                <Route path="/exam-portal" element={<ExamPortal />} />
                <Route path="/exam_portal" element={<ExamPortal />} />
              </Routes>
            </ProtectedRoute>
          </div>
        ) : (
          <ProtectedRoute>
            <div className="min-h-screen relative flex">
              <BackgroundBlobs />
              <Sidebar 
                  isOpen={sidebarOpen} 
                  toggle={() => setSidebarOpen(false)} 
                  installPrompt={deferredPrompt}
                  onInstall={handleInstallClick}
              />
              <div className="flex-1 flex flex-col min-w-0">
                <Header toggleSidebar={() => setSidebarOpen(true)} />
                <main className="flex-1 lg:ml-[280px] p-4 sm:p-6 lg:p-10 transition-all overflow-x-hidden pt-4">
                    <div className="w-full">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/daily" element={<StudentModuleRoute moduleKey="can_access_daily"><Daily /></StudentModuleRoute>} />
                        <Route path="/exam-setup" element={<StudentModuleRoute moduleKey="can_access_full_exam"><ExamSetup /></StudentModuleRoute>} />
                        <Route path="/practice" element={<StudentModuleRoute moduleKey="can_access_practice"><Practice /></StudentModuleRoute>} />
                        <Route path="/pyqs" element={<YearWisePYQ />} />
                        <Route path="/pricing" element={<Pricing />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/results" element={<Results />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                        <Route path="/super-admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </div>
                </main>
              </div>
            </div>
          </ProtectedRoute>
        )}
    </div>
  );
};

const App = () => {
  return (
    <AppContent />
  );
};

export default App;
