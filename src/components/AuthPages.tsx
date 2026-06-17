import React, { useState, useEffect } from "react";
import { useFarm } from "../context/FarmContext";
import { LogIn, UserPlus, Shield, Sparkles, RefreshCw, Settings, Database, Sliders, Check, HelpCircle } from "lucide-react";
import { motion } from "motion/react";
import { getAppwriteConfig, saveAppwriteOverride, clearAppwriteOverride } from "../appwrite";

export function SplashScreen() {
  const { navigate } = useFarm();

  useEffect(() => {
    // Standard splash duration then navigate to Login
    const timer = setTimeout(() => {
      // In FarmContext, onAuthStateChanged handles auto login redirect, 
      // but if not logged in yet, goes to login
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#081120] flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Decorative blurred gold & green rings */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gold-accent/10 rounded-full blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-green-accent/10 rounded-full blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="text-center z-10 flex flex-col items-center"
      >
        <div className="w-20 h-20 bg-gradient-to-tr from-gold-accent to-green-accent rounded-3xl flex items-center justify-center shadow-lg shadow-gold-accent/15 mb-6">
          <span className="text-slate-900 font-extrabold text-3xl font-display">FR</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 font-display">
          Farm<span className="text-gold-accent">Rise</span>
        </h1>
        
        <p className="text-sm text-slate-400 font-medium max-w-xs mt-1">
          High-Yield Agricultural Investment in Poultry & Pig Farming
        </p>

        <div className="mt-8 flex items-center gap-2 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
          <RefreshCw className="animate-spin w-3.5 h-3.5 text-gold-accent" />
          Synchronizing Livestock assets...
        </div>
      </motion.div>
    </div>
  );
}

export function LoginPage() {
  const { loginWithEmail, forgotPassword, navigate, connectionError, reconnectAppwrite } = useFarm();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retryingConn, setRetryingConn] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [viewState, setViewState] = useState<"login" | "forgot">("login");

  const initialCfg = getAppwriteConfig();
  const [showSettings, setShowSettings] = useState(false);
  const [useMock, setUseMock] = useState(initialCfg.isMockAppwrite);
  const [customEndpoint, setCustomEndpoint] = useState(initialCfg.endpoint);
  const [customProjectId, setCustomProjectId] = useState(initialCfg.projectId);
  const [customDatabaseId, setCustomDatabaseId] = useState(initialCfg.databaseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid authentication credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await forgotPassword(email);
      setSuccessMsg("A secure password reset verification link has been transmitted to your email inbox.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to trigger password recovery request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col justify-center items-center p-6 relative overflow-y-auto">
      {/* Background decorations */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-gold-accent/5 rounded-full blur-[60px]" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-green-accent/5 rounded-full blur-[60px]" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm glass-panel rounded-3xl p-6 glow-gold"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-gold-accent to-orange-500 rounded-2xl flex items-center justify-center shadow-md mb-3 mx-auto">
            <span className="text-slate-950 font-bold text-xl font-display">FR</span>
          </div>
          <h2 className="text-xl font-bold font-display text-white">
            {viewState === "login" ? "Welcome back" : "Recover Password"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {viewState === "login" ? "FarmRise livestock monitoring platform" : "Password recovery pipeline"}
          </p>
        </div>

        {connectionError && (
          <div className="bg-amber-500/10 border border-amber-500/25 p-3.5 rounded-2xl text-xs mb-4 space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 font-mono text-[10px] uppercase tracking-wide flex items-center gap-1">
                ⚠️ Connection Offline
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/12 text-amber-305 font-mono uppercase font-bold animate-pulse text-amber-450">
                Connection Fail
              </span>
            </div>
            
            <p className="text-[10.5px] leading-relaxed text-slate-300 font-sans">
              Could not contact the Appwrite cloud. This usually happens if domain authorization is pending or web CORS is disabled in your Appwrite panel.
            </p>

            <div className="bg-black/35 p-2 rounded-lg text-[9px] font-mono text-slate-400 border border-white/5 whitespace-pre-wrap overflow-x-auto max-h-[80px] break-all">
              {connectionError}
            </div>

            <div className="pt-1.5 border-t border-amber-500/10">
              <button
                type="button"
                onClick={() => {
                  saveAppwriteOverride({
                    endpoint: "https://cloud.appwrite.io/v1",
                    projectId: "",
                    databaseId: "default",
                    useMock: true
                  });
                }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 hover:opacity-95 rounded-xl text-[11px] font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/15"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Activate Sandbox Mode (No Setup!)
              </button>
              <p className="text-[9px] text-slate-405 text-center mt-1 text-slate-400">
                ⚡ Play & test instantly in stable simulated offline sandbox!
              </p>
            </div>

            <div className="flex gap-2 pt-1 border-t border-white/5">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setRetryingConn(true);
                    await reconnectAppwrite();
                  } catch (e) {
                    console.error("Manual reconnect failed", e);
                  } finally {
                    setRetryingConn(false);
                  }
                }}
                disabled={retryingConn}
                className="flex-1 py-1.5 px-2 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-amber-500/20 font-sans"
              >
                <RefreshCw className={`w-3 h-3 ${retryingConn ? "animate-spin" : ""}`} />
                Retry Conn
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowSettings(true);
                }}
                className="px-2.5 py-1.5 border border-white/10 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-slate-300 font-bold uppercase tracking-wider transition-all"
              >
                Configure
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-100 p-3.5 rounded-xl text-xs font-sans mb-4 space-y-2">
            <div className="flex gap-2 text-red-200 font-bold font-mono">
              <span>⚠️</span>
              <span>Authentication Error</span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-red-350">
              {errorMsg}
            </p>
            {errorMsg.toLowerCase().includes("failed to fetch") && (
              <div className="text-[10px] bg-black/40 p-2.5 rounded-lg border border-red-500/10 text-slate-300 space-y-1.5 mt-1 font-sans text-left">
                <span className="font-bold text-amber-405 block text-amber-400">💡 Network Connection Check Needed:</span>
                <p className="leading-normal text-slate-300">
                  This error occurs if your domain (<code className="text-gold-accent font-mono">{typeof window !== "undefined" ? window.location.hostname : ""}</code>) has not been added as a <strong>Web Platform</strong> inside your Appwrite console settings.
                </p>
                <p className="leading-normal text-slate-400">
                  To bypass this, you can toggle <strong>Local Sandbox Mode</strong> below to run the app instantly with simulated offline state!
                </p>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-500/15 border border-green-500/30 text-green-250 p-3 rounded-xl text-xs mb-4">
            ✅ {successMsg}
          </div>
        )}

        {viewState === "login" ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-450 uppercase mb-1.5 font-bold">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investor@farmrise.com"
                  className="w-full glass-input rounded-xl p-3 text-xs focus:border-gold-accent font-sans"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] font-mono text-slate-450 uppercase font-bold">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg("");
                      setSuccessMsg("");
                      setViewState("forgot");
                    }}
                    className="text-gold-accent hover:underline text-[10px] font-bold uppercase tracking-wider"
                  >
                    Forgot?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full glass-input rounded-xl p-3 text-xs focus:border-gold-accent font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gold-accent text-slate-950 font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                {submitting ? (
                  <RefreshCw className="animate-spin w-4 h-4" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Authenticate Account
                  </>
                )}
              </button>

              <div className="text-center">
                <span className="inline-block text-[9px] text-[#A6ACAF] font-sans leading-normal px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                  🛡️ <strong>By-All-Means Login active</strong>: If cloud endpoints fail or CORS is unauthorized, you will be authenticated into a live <strong>Offline Sandbox</strong> instantly.
                </span>
              </div>
            </form>

          </>
        ) : (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-450 uppercase mb-1.5 font-bold">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="investor@farmrise.com"
                className="w-full glass-input rounded-xl p-3 text-xs focus:border-gold-accent font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gold-accent text-slate-950 font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              {submitting ? (
                <RefreshCw className="animate-spin w-4 h-4" />
              ) : (
                "Send Password Reset Email"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setSuccessMsg("");
                setViewState("login");
              }}
              className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Back to Login
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-slate-440 mt-5">
          New to FarmRise?{" "}
          <button onClick={() => navigate("register")} className="text-gold-accent font-bold hover:underline">
            Register Account
          </button>
        </p>

        {/* Dynamic Appwrite Settings Override */}
        <div className="mt-6 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-400 hover:text-gold-accent transition-colors"
          >
            <Settings className={`w-3 h-3 ${showSettings ? "animate-spin text-gold-accent" : ""}`} />
            {showSettings ? "Hide Connection Settings" : "Configure Appwrite Connection"}
          </button>

          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3.5 space-y-3 bg-black/40 p-3.5 rounded-xl border border-white/5 text-left"
            >
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 font-mono uppercase tracking-wide">
                <Database className="w-3.5 h-3.5 text-gold-accent" /> Connection Setup
              </div>

              {/* Toggle offline vs cloud */}
              <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-1 rounded-lg border border-white/5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setUseMock(true)}
                  className={`py-1.5 rounded-md font-bold uppercase transition-all tracking-wider ${
                    useMock
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                      : "text-slate-400 hover:text-slate-200 border border-transparent font-medium"
                  }`}
                >
                  Local Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => setUseMock(false)}
                  className={`py-1.5 rounded-md font-bold uppercase transition-all tracking-wider ${
                    !useMock
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                      : "text-slate-400 hover:text-slate-200 border border-transparent font-medium"
                  }`}
                >
                  Cloud Mode (Real API)
                </button>
              </div>

              {useMock ? (
                <div className="text-[10px] space-y-1.5 text-slate-300 bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/10 leading-normal">
                  <span className="font-bold text-amber-400 uppercase tracking-wide text-[9px] block">⚠️ Sandbox mode active</span>
                  <p>
                    All database queries and user accounts will operate on simulated storage locally in your browser. This bypasses Appwrite cloud access entirely! No custom setup or permissions are needed.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-[10px]">
                  <p className="text-[9px] text-slate-400 leading-normal bg-black/20 p-2 rounded-lg border border-white/5">
                    Enter your Appwrite Project ID and Endpoint. Don't forget to add <code className="text-gold-accent font-mono">{typeof window !== "undefined" ? window.location.hostname : ""}</code> as a <strong>Web Platform</strong> inside your Appwrite console settings!
                  </p>
                  <div>
                    <label className="block text-slate-400 font-mono text-[9px] uppercase mb-1">API Endpoint</label>
                    <input
                      type="text"
                      value={customEndpoint}
                      onChange={(e) => setCustomEndpoint(e.target.value)}
                      placeholder="https://cloud.appwrite.io/v1"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-1.5 text-xs font-mono text-white focus:border-gold-accent/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono text-[9px] uppercase mb-1 font-bold">Project ID</label>
                    <input
                      type="text"
                      value={customProjectId}
                      onChange={(e) => setCustomProjectId(e.target.value)}
                      placeholder="Enter Appwrite Project ID"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-1.5 text-xs font-mono text-white focus:border-gold-accent/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono text-[9px] uppercase mb-1">Database ID</label>
                    <input
                      type="text"
                      value={customDatabaseId}
                      onChange={(e) => setCustomDatabaseId(e.target.value)}
                      placeholder="default"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-1.5 text-xs font-mono text-white focus:border-gold-accent/40 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    saveAppwriteOverride({
                      endpoint: customEndpoint,
                      projectId: useMock ? "" : customProjectId,
                      databaseId: customDatabaseId,
                      useMock: useMock
                    });
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-gold-accent text-slate-950 text-[10px] font-bold uppercase tracking-wider text-center hover:opacity-90"
                >
                  Save & Reload
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAppwriteOverride();
                  }}
                  className="px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 text-[10px] font-bold uppercase tracking-wider hover:bg-white/10"
                >
                  Reset Defaults
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function RegisterPage() {
  const { registerWithEmail, navigate, connectionError, reconnectAppwrite } = useFarm();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retryingConn, setRetryingConn] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Scan and automatically prefill referral links (e.g., /register?ref=RISE1234)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref") || params.get("referredCode") || params.get("code");
      if (ref) {
        setReferredBy(ref.trim().toUpperCase());
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phoneNumber || !password || !confirmPassword) {
      setErrorMsg("Please populate all required fields.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Password confirmation does not match the entered password.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      await registerWithEmail(email, password, name, phoneNumber, referredBy);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create investor account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col justify-center items-center p-6 relative overflow-y-auto">
      <div className="absolute top-10 left-10 w-48 h-48 bg-gold-accent/5 rounded-full blur-[60px]" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-green-accent/5 rounded-full blur-[60px]" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm glass-panel rounded-3xl p-6 glow-green my-8"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-tr from-green-accent to-emerald-500 rounded-2xl flex items-center justify-center shadow-md mb-3 mx-auto">
            <span className="text-slate-950 font-bold text-xl font-display">FR</span>
          </div>
          <h2 className="text-xl font-bold font-display text-white">Join FarmRise</h2>
          <p className="text-xs text-slate-400 mt-1">Begin sponsoring premium livestock contracts</p>
        </div>

        {connectionError && (
          <div className="bg-amber-500/10 border border-amber-500/25 p-3.5 rounded-2xl text-xs mb-4 space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 font-mono text-[10px] uppercase tracking-wide flex items-center gap-1">
                ⚠️ Connection Offline
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/12 text-amber-305 font-mono uppercase font-bold animate-pulse text-amber-450">
                Offline Mode available
              </span>
            </div>
            
            <p className="text-[10.5px] leading-relaxed text-slate-300 font-sans">
              Appwrite backend is offline. You can still test and play instantly in a simulated offline state!
            </p>

            <div className="pt-1 border-t border-amber-500/10">
              <button
                type="button"
                onClick={() => {
                  saveAppwriteOverride({
                    endpoint: "https://cloud.appwrite.io/v1",
                    projectId: "",
                    databaseId: "default",
                    useMock: true
                  });
                }}
                className="w-full py-2 px-3 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 hover:opacity-95 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-1 shadow-lg shadow-amber-500/15 animate-shimmer"
              >
                <Sparkles className="w-3 h-3" />
                Activate Sandbox (Direct Registration)
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-xl text-xs font-mono mb-4">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono text-slate-450 uppercase mb-1 font-bold">Full Investor Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full glass-input rounded-xl p-2.5 text-xs focus:border-gold-accent font-sans"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-450 uppercase mb-1 font-bold">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="investor@gmail.com"
              className="w-full glass-input rounded-xl p-2.5 text-xs focus:border-[#2ECC71] font-sans"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-450 uppercase mb-1 font-bold">Phone Number *</label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+234 801 234 5678"
              className="w-full glass-input rounded-xl p-2.5 text-xs focus:border-[#2ECC71] font-sans"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-450 uppercase mb-1 font-bold">Secure Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full glass-input rounded-xl p-2.5 text-xs focus:border-[#2ECC71] font-sans"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-450 uppercase mb-1 font-bold">Confirm Password *</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full glass-input rounded-xl p-2.5 text-xs focus:border-[#2ECC71] font-sans"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-450 uppercase mb-1 font-bold">Referral Code (Optional)</label>
            <input
              type="text"
              value={referredBy}
              onChange={(e) => setReferredBy(e.target.value)}
              placeholder="RISE9284"
              className="w-full glass-input rounded-xl p-2.5 text-xs font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 mt-2 rounded-xl bg-green-accent text-white font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.01]"
          >
            {submitting ? (
              <RefreshCw className="animate-spin w-4 h-4" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Register New Account
              </>
            )}
          </button>

          <div className="text-center mt-3">
            <span className="inline-block text-[9px] text-[#A6ACAF] font-sans leading-normal px-2 py-1 bg-white/5 rounded-lg border border-white/5">
              🛡️ <strong>Automated signup fallback</strong>: If cloud connection CORS is blocked, your account is immediately registered in a high-speed <strong>Offline Sandbox</strong> instantly.
            </span>
          </div>
        </form>

        <p className="text-center text-[11px] text-slate-440 mt-5">
          Already registered?{" "}
          <button onClick={() => navigate("login")} className="text-gold-accent font-bold hover:underline">
            Login here
          </button>
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-[10px] font-mono">
          <Shield className="w-3.5 h-3.5 text-green-accent" />
          End-to-end 256-bit secure wallet infrastructure
        </div>
      </motion.div>
    </div>
  );
}
