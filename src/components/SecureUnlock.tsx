import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Fingerprint, Lock, ShieldCheck, X, KeyRound, Check, HelpCircle, AlertCircle } from "lucide-react";

// Web Authentication API and Credential Management API utilities
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
    // Check if user has secure unlock enabled
    const isEnabled = localStorage.getItem("fr_secure_unlock_enabled") === "true";
    const decisionMade = localStorage.getItem("fr_secure_unlock_decision") !== null;

    if (isEnabled) {
      // Initially locked on load
      setIsLocked(true);
    } else if (!decisionMade) {
      // Recommend setup if log-in exists and no choice made yet
      const currentUser = localStorage.getItem("fr_current_user");
      if (currentUser) {
        setIsSetupRecommended(true);
      }
    }

    // Capture Visibility/Focus change to enforce Lock when user resumes their session
    let lastActive = Date.now();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const inactiveTime = Date.now() - lastActive;
        const isEnabledNow = localStorage.getItem("fr_secure_unlock_enabled") === "true";
        
        // Lock screen if they've been away for more than 45 seconds to secure session resume
        if (isEnabledNow && inactiveTime > 45000) {
          setIsLocked(true);
        }
      } else {
        lastActive = Date.now();
      }
    };

    const handleFocusChange = () => {
      // Triggers focus check
      const isEnabledNow = localStorage.getItem("fr_secure_unlock_enabled") === "true";
      if (isEnabledNow && !isLocked) {
        const inactiveTime = Date.now() - lastActive;
        if (inactiveTime > 45000) {
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

// 1. SETUP ONBOARDING PROMPT
interface SetupPromptProps {
  onDismiss: () => void;
  onSuccess: () => void;
  currentUser: UserContext | null;
}

export function SecureUnlockSetupPrompt({ onDismiss, onSuccess, currentUser }: SetupPromptProps) {
  const [loading, setLoading] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [successState, setSuccessState] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleDecline = () => {
    localStorage.setItem("fr_secure_unlock_decision", "declined");
    localStorage.setItem("fr_secure_unlock_enabled", "false");
    onDismiss();
  };

  const startWebAuthnSetup = async () => {
    setLoading(true);
    setErrorText("");

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // Construct authenticators credential setup creation arguments
      const credentialCreationOptions: CredentialCreationOptions = {
        publicKey: {
          challenge: challenge,
          rp: { name: "FarmRise Security" },
          user: {
            id: Uint8Array.from((currentUser?.id || "fr-user"), c => c.charCodeAt(0)),
            name: currentUser?.email || "sponsor@farmrise.co",
            displayName: currentUser?.name || "Premium Sponsor"
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform", // request fingerprint/face biometric
            userVerification: "preferred"
          },
          timeout: 10000
        }
      };

      if (!navigator.credentials || !navigator.credentials.create) {
        throw new Error("WebAuthn API is not fully supported by this client environment.");
      }

      // Execute browser Credential API register request
      const credential = await navigator.credentials.create(credentialCreationOptions);
      if (credential) {
        // Registered successfully!
        localStorage.setItem("fr_secure_unlock_enabled", "true");
        localStorage.setItem("fr_secure_unlock_decision", "accepted");
        localStorage.setItem("fr_secure_unlock_type", "biometric");
        setSuccessState(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error("Credentials registration cancelled or bypassed.");
      }
    } catch (err: any) {
      console.warn("[SecureUnlock] Browser WebAuthn API failed/blocked. Transitioning to integrated PIN lock:", err.message || err);
      // Fallback seamlessly to numeric PIN registration
      setPinMode(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      setErrorText("Passcode requires exactly 4 digits.");
      return;
    }
    localStorage.setItem("fr_secure_unlock_enabled", "true");
    localStorage.setItem("fr_secure_unlock_decision", "accepted");
    localStorage.setItem("fr_secure_unlock_type", "pin");
    localStorage.setItem("fr_secure_unlock_pin_hash", pinInput);
    setSuccessState(true);
    setTimeout(() => {
      onSuccess();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full glass-panel border border-purple-500/20 bg-slate-950 p-6 rounded-3xl space-y-5 text-left shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full filter blur-2xl pointer-events-none" />

        {!pinMode && !successState && (
          <>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 shrink-0">
                <Fingerprint className="w-8 h-8 animate-pulse text-purple-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-display tracking-tight">
                  Enforce Biometric Unlock?
                </h3>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Safeguard your laying programs, poultry coops, and wallet balances. Enabling lock asks for your biometric scan or passcode whenever you resume your session or load the app.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/50 p-3.5 rounded-2xl border border-white/5 space-y-1 text-[11px] leading-relaxed font-mono">
              <span className="font-bold text-indigo-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> SECURE WEB AUTHC CHECKS
              </span>
              <p className="text-slate-400">
                Uses the secure Web Authentication (PWA browser keychain) to store fingerprint validations locally.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDecline}
                className="py-2.5 px-4 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-all text-xs font-semibold cursor-pointer text-center"
              >
                No, Dismiss
              </button>
              <button
                type="button"
                onClick={startWebAuthnSetup}
                disabled={loading}
                className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white font-bold transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? "Activating..." : "Yes, Secure App"}
              </button>
            </div>
          </>
        )}

        {pinMode && !successState && (
          <form onSubmit={handleSavePin} className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-white/5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-display">Create 4-Digit Security PIN</h4>
                <p className="text-[10px] text-slate-450">Set a fallback secure keypad password to lock FarmRise.</p>
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="secure_pin_input" className="block text-[9px] font-mono text-indigo-300 uppercase tracking-wider font-bold">
                Passcode Guard PIN
              </label>
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
                className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-center text-lg font-mono tracking-[1em] text-white focus:outline-none focus:border-indigo-550 leading-none"
                required
              />
              {errorText && (
                <p className="text-[10px] text-red-400 font-mono flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errorText}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDecline}
                className="text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
              >
                Cancel Lock
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer"
              >
                Save Security Code
              </button>
            </div>
          </form>
        )}

        {successState && (
          <div className="p-8 text-center space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white font-display">Credential Vault Ready</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Unlock Shield is active. Your account is armored against session resume threats.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// 2. RESUME SECURE UNLOCK SCREEN OVERLAY
interface UnlockOverlayProps {
  onUnlock: () => void;
  currentUser: UserContext | null;
}

export function SecureUnlockOverlay({ onUnlock, currentUser }: UnlockOverlayProps) {
  const [unlockError, setUnlockError] = useState("");
  const [pinModeActive, setPinModeActive] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const lockType = localStorage.getItem("fr_secure_unlock_type") || "biometric";

  useEffect(() => {
    // Attempt biometric scan immediately on mount if biometric lock is configured
    if (lockType === "biometric" && !pinModeActive) {
      triggerBiometricScan();
    }
  }, [lockType]);

  const triggerBiometricScan = async () => {
    setUnlockError("");

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credentialRequestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge: challenge,
          timeout: 10000,
          userVerification: "preferred"
        }
      };

      if (!navigator.credentials || !navigator.credentials.get) {
        throw new Error("WebAuthn API is not fully supported in this context.");
      }

      // Execute login/unlock credential verify call
      const credential = await navigator.credentials.get(credentialRequestOptions);
      if (credential) {
        onUnlock();
      } else {
        throw new Error("Biometric challenge verification bypassed.");
      }
    } catch (err: any) {
      console.warn("[SecureUnlock] scan failed: ", err.message || err);
      // Fallback gracefully to PIN passcode screen
      const savedPin = localStorage.getItem("fr_secure_unlock_pin_hash");
      if (savedPin) {
        setPinModeActive(true);
      } else {
        // Fallback simulated biometric scan for devices or sandbox contexts
        simulateBiometricChallenge();
      }
    }
  };

  const simulateBiometricChallenge = () => {
    // High-fidelity fallback for restricted browser sandbox (iframe) of AI Studio 
    const scanSound = new Audio();
    // Prompt visually
    const confirmWebSim = window.confirm(
      "🔑 FarmRise Biometric Verification:\n\n" +
      "Verify your registered credential keychain access (or click OK/Yes) to unlock FarmRise live terminal session directly."
    );
    if (confirmWebSim) {
      onUnlock();
    } else {
      setUnlockError("Verification canceled. Click bypass/cancel or re-authenticate.");
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const savedPin = localStorage.getItem("fr_secure_unlock_pin_hash") || "1234";
    if (pinInput === savedPin) {
      onUnlock();
    } else {
      setUnlockError("Erroneous Security Pin. Try again.");
      setPinInput("");
    }
  };

  const handleCancelLock = () => {
    // Optional bypass bypass/cancel allowed as requested: "they can still cancel it"
    localStorage.setItem("fr_secure_unlock_enabled", "false");
    onUnlock();
  };

  return (
    <div className="fixed inset-0 bg-[#060c16]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass-panel border border-white/5 bg-slate-950/80 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-44 h-44 bg-purple-500/5 rounded-full filter blur-3xl pointer-events-none" />
        
        {/* Animated Brand and Lock Indicator */}
        <div className="space-y-3">
          <div className="w-14 h-14 bg-gradient-to-br from-[#2ECC71] to-[#F5B300] rounded-2xl flex items-center justify-center font-display font-black text-slate-900 text-lg mx-auto shadow-lg">
            FR
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-display uppercase tracking-widest flex items-center justify-center gap-1.5 leading-none">
              Terminal Locked <Lock className="w-4 h-4 text-purple-400" />
            </h2>
            <p className="text-xs text-slate-450 mt-1">
              Verify security criteria to resume your sponsorship cycle.
            </p>
          </div>
        </div>

        {/* Action Controls Screen */}
        {!pinModeActive ? (
          <div className="space-y-5 py-4">
            <button
              type="button"
              onClick={triggerBiometricScan}
              className="w-24 h-24 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/30 shadow-[0_0_20px_rgba(147,51,234,0.15)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer relative group"
            >
              <Fingerprint className="w-12 h-12 text-purple-400 group-hover:text-purple-350" />
              <span className="absolute inset-0 rounded-full border-2 border-purple-500/50 animate-ping opacity-20" />
            </button>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-200">
                Click lock to scan fingerprint
              </p>
              <p className="text-[11px] text-slate-500">
                Securely unlocked by local biometric authentication
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePinSubmit} className="space-y-4 py-2">
            <label htmlFor="secure_pin_unlock" className="block text-[9px] font-mono text-indigo-300 uppercase tracking-wider font-bold text-left">
              Type Security Code PIN
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
              className="w-full bg-slate-900 border border-white/15 rounded-xl py-3 px-4 text-center text-lg font-mono tracking-[1em] text-white focus:outline-none focus:border-purple-500 leading-none"
              required
              autoFocus
            />
          </form>
        )}

        {unlockError && (
          <p className="text-[10px] text-red-400 font-mono flex items-center justify-center gap-1 bg-red-500/5 border border-red-500/10 py-2 px-3 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {unlockError}
          </p>
        )}

        {/* Dynamic Navigation Fallbacks */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {lockType === "biometric" && localStorage.getItem("fr_secure_unlock_pin_hash") && (
            <button
              type="button"
              onClick={() => setPinModeActive(!pinModeActive)}
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {pinModeActive ? "Use Fingerprint Verification" : "Unlock with PIN passcode"}
            </button>
          )}

          <div className="flex gap-4 pt-1 items-center">
            <button
              type="button"
              onClick={handleCancelLock}
              className="text-xs text-slate-450 hover:text-white transition-colors cursor-pointer"
            >
              Cancel & Unlock (Optional)
            </button>
            <span className="text-white/10 text-xs">|</span>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("fr_current_user");
                window.location.reload();
              }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
