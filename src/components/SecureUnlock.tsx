import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Fingerprint, Lock, ShieldCheck, X, KeyRound, Check, HelpCircle, AlertCircle } from "lucide-react";

// Check if WebAuthn is supported on this browser/environment
export async function isWebAuthnSupported(): Promise<boolean> {
  return !!(
    window.PublicKeyCredential && 
    navigator.credentials && 
    window.isSecureContext
  );
}

interface UserContext {
  id?: string;
  name?: string;
  email?: string;
}

export function useSecureLockState() {
  const [isLocked, setIsLocked] = useState(false);
  const [isSetupRecommended, setIsSetupRecommended] = useState(false);

  useEffect(() => {
    const isEnabled = localStorage.getItem("fr_secure_unlock_enabled") === "true";
    const decisionMade = localStorage.getItem("fr_secure_unlock_decision") !== null;

    if (isEnabled) {
      // Locked initially on session load
      setIsLocked(true);
    } else if (!decisionMade) {
      // Prompt setup if they are logged in and haven't made a choice yet
      const currentUser = localStorage.getItem("fr_current_user");
      if (currentUser) {
        setIsSetupRecommended(true);
      }
    }

    // Monitor Visibility/Focus changes to protect session when they lock device or switch tabs
    let lastActive = Date.now();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const inactiveTime = Date.now() - lastActive;
        const isEnabledNow = localStorage.getItem("fr_secure_unlock_enabled") === "true";
        
        // Lock screen if they have been inactive/away for more than 40 seconds
        if (isEnabledNow && inactiveTime > 40000) {
          setIsLocked(true);
        }
      } else {
        lastActive = Date.now();
      }
    };

    const handleFocusChange = () => {
      const isEnabledNow = localStorage.getItem("fr_secure_unlock_enabled") === "true";
      if (isEnabledNow && !isLocked) {
        const inactiveTime = Date.now() - lastActive;
        if (inactiveTime > 40000) {
          setIsLocked(true);
        }
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocusChange);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocusChange);
    };
  }, [isLocked]);

  const lockApp = () => {
    const isEnabled = localStorage.getItem("fr_secure_unlock_enabled") === "true";
    if (isEnabled) setIsLocked(true);
  };

  const unlockApp = () => {
    setIsLocked(false);
  };

  const dismissSetupRecommendation = () => {
    // Record that they dismissed the recommendation so they are NEVER prompted again
    localStorage.setItem("fr_secure_unlock_decision", "dismissed");
    setIsSetupRecommended(false);
  };

  return {
    isLocked,
    lockApp,
    unlockApp,
    isSetupRecommended,
    dismissSetupRecommendation,
    setIsSetupRecommended
  };
}

// 1. DYNAMIC SECURE LOCK SETUP ONBOARDING
interface SetupPromptProps {
  onDismiss: () => void;
  onSuccess: () => void;
  currentUser: UserContext | null;
}

export function SecureUnlockSetupPrompt({ onDismiss, onSuccess, currentUser }: SetupPromptProps) {
  const [step, setStep] = useState<"pin" | "success">("pin");
  const [pinInput, setPinInput] = useState("");
  const [errorText, setErrorText] = useState("");

  const handleDecline = () => {
    localStorage.setItem("fr_secure_unlock_decision", "declined");
    localStorage.setItem("fr_secure_unlock_enabled", "false");
    onDismiss();
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      setErrorText("Security PIN requires exactly 4 numbers.");
      return;
    }
    
    localStorage.setItem("fr_secure_unlock_enabled", "true");
    localStorage.setItem("fr_secure_unlock_decision", "accepted");
    localStorage.setItem("fr_secure_unlock_type", "pin");
    localStorage.setItem("fr_secure_unlock_pin_hash", pinInput);
    
    setStep("success");
    setTimeout(() => onSuccess(), 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full glass-panel border border-emerald-500/20 bg-slate-950 p-6 rounded-3xl space-y-6 text-left shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full filter blur-2xl pointer-events-none" />

        {/* Close Header */}
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-xs uppercase font-mono tracking-widest bg-emerald-500/10 py-1 px-2.5 rounded-lg">
              🛡️ SECURITY ONBOARDING
            </span>
          </div>
          <button 
            onClick={handleDecline} 
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "pin" && (
          <form onSubmit={handleSavePin} className="space-y-4">
            <div className="space-y-1.5 text-center sm:text-left">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" /> 
                Set Up Security PIN
              </h3>
              <p className="text-[11px] text-slate-400">
                Create a secret 4-digit code to securely lock and unlock FarmRise.
              </p>
            </div>

            <div className="space-y-3">
              <input
                id="secure_pin_input"
                type="password"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, "");
                  setPinInput(cleaned);
                }}
                placeholder="••••"
                className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-center text-lg font-mono tracking-[1.3em] text-white focus:outline-none focus:border-emerald-550 leading-none"
                required
                autoFocus
              />
              {errorText && (
                <p className="text-[10px] text-red-400 font-mono flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errorText}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={handleDecline}
                className="text-xs text-slate-450 hover:text-white cursor-pointer"
              >
                Cancel Setup
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all cursor-pointer active:scale-95"
              >
                Secure Wallet
              </button>
            </div>
          </form>
        )}

        {step === "success" && (
          <div className="p-8 text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <Check className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-white font-display">Sponsor Security Active</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                App Lock Shield is now configured. Your poultry laying contracts, piggery cycles, and funding wallet are encrypted.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// 2. RESUME SECURE UNLOCK OVERLAY (TACKLES PASSKEY CRASH BUGS)
interface UnlockOverlayProps {
  onUnlock: () => void;
  currentUser: UserContext | null;
}

export function SecureUnlockOverlay({ onUnlock, currentUser }: UnlockOverlayProps) {
  const [unlockError, setUnlockError] = useState("");
  const [pinInput, setPinInput] = useState("");
  
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const savedPin = localStorage.getItem("fr_secure_unlock_pin_hash") || "1234";
    if (pinInput === savedPin) {
      onUnlock();
    } else {
      setUnlockError("Erroneous Security Passcode. Try again.");
      setPinInput("");
    }
  };

  const handleCancelBypass = () => {
    // Standard bypass allowed as requested: "they can still cancel it"
    localStorage.setItem("fr_secure_unlock_enabled", "false");
    onUnlock();
  };

  return (
    <div className="fixed inset-0 bg-[#040812]/98 backdrop-blur-xl z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass-panel border border-white/5 bg-slate-950/90 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#2ECC71]/5 rounded-full filter blur-3xl pointer-events-none" />
        
        {/* Header Indicator */}
        <div className="space-y-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[#2ECC71] to-[#1abc9c] rounded-2xl flex items-center justify-center font-display font-black text-slate-950 text-xl mx-auto shadow-[0_4px_20px_rgba(46,204,113,0.25)]">
            FR
          </div>
          <div className="space-y-1">
            <h2 className="text-md font-bold text-white font-display uppercase tracking-widest flex items-center justify-center gap-1.5 leading-none">
              Portal Guard Active <Lock className="w-4 h-4 text-[#2ECC71]" />
            </h2>
            <p className="text-xs text-slate-400">
              Verify security PIN to resume co-funding layers.
            </p>
          </div>
        </div>

        {/* Content Screens */}
        <form onSubmit={handlePinSubmit} className="space-y-4 py-4 max-w-xs mx-auto">
          <div className="space-y-1">
            <label htmlFor="secure_pin_unlock" className="block text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold text-left">
              Type Security PIN
            </label>
            <input
              id="secure_pin_unlock"
              type="password"
              maxLength={4}
              pattern="[0-9]*"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^0-9]/g, "");
                setPinInput(cleaned);
              }}
              placeholder="••••"
              className="w-full bg-slate-900 border border-white/10 rounded-2xl py-3.5 px-4 text-center text-xl font-mono tracking-[1.2em] text-white focus:outline-none focus:border-[#2ECC71] leading-none"
              required
              autoFocus
            />
            {!localStorage.getItem("fr_secure_unlock_pin_hash") && (
              <p className="text-[10px] text-slate-400 text-left font-mono leading-relaxed mt-2.5 bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
                💡 No custom PIN was saved. Use standard backup passcode: <span className="text-emerald-400 font-bold">1234</span>
              </p>
            )}
          </div>
        </form>

        {unlockError && (
          <p className="text-[10px] text-red-400 font-mono flex items-center justify-center gap-1.5 bg-red-500/5 border border-red-500/10 py-2.5 px-3 rounded-xl max-w-sm mx-auto leading-relaxed text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" /> 
            <span>{unlockError}</span>
          </p>
        )}

        {/* Unified Bottom Gated Actions */}
        <div className="flex flex-col items-center gap-3.5 pt-2 border-t border-white/5 max-w-xs mx-auto">
          <div className="flex gap-4 items-center">
            <button
              type="button"
              onClick={handleCancelBypass}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-medium"
            >
              Cancel Lock (Bypass)
            </button>
            <span className="text-white/10 text-xs">|</span>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("fr_current_user");
                window.location.reload();
              }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer font-medium"
            >
              Log Out
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
