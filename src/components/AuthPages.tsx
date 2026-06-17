import React, { useState, useEffect } from "react";
import { useFarm } from "../context/FarmContext";
import { LogIn, UserPlus, Shield, Sparkles, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

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
  const { loginWithEmail, forgotPassword, navigate } = useFarm();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [viewState, setViewState] = useState<"login" | "forgot">("login");

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

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-xl text-xs font-mono mb-4">
            ⚠️ {errorMsg}
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
      </motion.div>
    </div>
  );
}

export function RegisterPage() {
  const { registerWithEmail, navigate } = useFarm();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
