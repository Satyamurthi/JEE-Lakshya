import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, Trash2, CheckCircle2, AlertCircle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

const Settings = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [verifyError, setVerifyError] = useState('');
  const [savedKeyExists, setSavedKeyExists] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('user_gemini_api_key') || '';
    if (savedKey) {
      setApiKey(savedKey);
      setSavedKeyExists(true);
    }
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      alert("Please enter a valid API key first.");
      return;
    }
    
    setIsVerifying(true);
    setVerifyStatus('idle');
    setVerifyError('');

    try {
      const { verifyGeminiAPIKey } = await import('../geminiService');
      const isValid = await verifyGeminiAPIKey(apiKey.trim());
      if (isValid) {
        localStorage.setItem('user_gemini_api_key', apiKey.trim());
        setVerifyStatus('success');
        setSavedKeyExists(true);
      } else {
        setVerifyStatus('failed');
        setVerifyError("Verification succeeded but returned unexpected response. Check key permissions.");
      }
    } catch (err: any) {
      setVerifyStatus('failed');
      setVerifyError(err.message || "Failed to verify key. Check network connectivity or API key quota.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear your stored Gemini API key? AI generation will not function without it (system defaults/fallbacks will apply).")) {
      localStorage.removeItem('user_gemini_api_key');
      setApiKey('');
      setVerifyStatus('idle');
      setSavedKeyExists(false);
    }
  };

  const handleTestOnly = async () => {
    if (!apiKey.trim()) return;
    setIsVerifying(true);
    setVerifyStatus('idle');
    setVerifyError('');
    try {
      const isValid = await verifyGeminiAPIKey(apiKey.trim());
      if (isValid) {
        setVerifyStatus('success');
      } else {
        setVerifyStatus('failed');
        setVerifyError("Verification returned invalid response.");
      }
    } catch (err: any) {
      setVerifyStatus('failed');
      setVerifyError(err.message || "API connection test failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">
          <Key className="w-3 h-3" />
          <span>User Preferences</span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">AI Settings</h1>
        <p className="text-slate-500 font-medium max-w-xl">
          Configure your Google Gemini API key to unlock dynamic question generation in your study terminal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main form */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl shadow-slate-200/50 space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              API Credentials
            </h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">Google Gemini API Key</label>
              <div className="relative flex items-center">
                <input type="text" name="chrome_prevent_autofill_email_settings" style={{ display: 'none' }} tabIndex={-1} readOnly />
                <input type="password" name="chrome_prevent_autofill_pass_settings" style={{ display: 'none' }} tabIndex={-1} readOnly />
                <input
                  type={showKey ? "text" : "password"}
                  name="gemini_user_api_key_field"
                  id="gemini_user_api_key_field"
                  autoComplete="off"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (verifyStatus !== 'idle') setVerifyStatus('idle');
                  }}
                  placeholder="AIzaSy..."
                  className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 rounded-2xl text-sm font-semibold outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Your API key is saved locally in your browser's secure storage. It is never transmitted to our backend.
              </p>
            </div>

            {verifyStatus === 'success' && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">Verification Successful</h4>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">Gemini AI is operational and verified.</p>
                </div>
              </div>
            )}

            {verifyStatus === 'failed' && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider">Verification Failed</h4>
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 break-words leading-relaxed">{verifyError}</p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isVerifying || !apiKey.trim()}
                  className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Verify & Save
                </button>
                <button
                  onClick={handleTestOnly}
                  disabled={isVerifying || !apiKey.trim()}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  Test Connection
                </button>
              </div>

              {savedKeyExists && (
                <button
                  onClick={handleClear}
                  className="px-4 py-3.5 border border-red-200/50 hover:bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Key
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <ShieldCheck className="w-36 h-36" />
            </div>
            
            <div className="bg-indigo-600/30 border border-indigo-500/30 p-3 rounded-2xl w-fit">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-black text-lg tracking-tight">Security & Privacy</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Your key is stored strictly on this browser instance. Clearing cookies or browsing data will remove it.
              </p>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">How to get a key?</h4>
              <ol className="list-decimal pl-4 text-xs text-slate-400 font-medium space-y-2">
                <li>Visit the Google AI Studio console.</li>
                <li>Sign in with your Google account.</li>
                <li>Click <strong>"Get API Key"</strong>.</li>
                <li>Create a key in a new project and copy it here.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
