import React, { useState, useEffect } from "react";
import { FarmProvider, useFarm } from "./context/FarmContext";
import { SplashScreen, LoginPage, RegisterPage } from "./components/AuthPages";
import UserPages from "./components/UserPages";
import AdminPages from "./components/AdminPages";
import FarmUpdatesPage from "./components/FarmUpdatesPage";
import { 
  Compass, LayoutDashboard, Calendar, User, Bell, 
  Sparkles, CheckCircle2, CircleDollarSign, LogOut, Lock, MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSecureLockState, SecureUnlockSetupPrompt, SecureUnlockOverlay } from "./components/SecureUnlock";

function MainAppShell() {
  const { 
    currentUser, 
    currentPage, 
    navigate, 
    notifications, 
    markNotificationRead: markNotificationAsRead,
    loading
  } = useFarm();

  const {
    isLocked,
    unlockApp,
    isSetupRecommended,
    dismissSetupRecommendation
  } = useSecureLockState();

  const [isSplashActive, setSplashActive] = useState(true);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Splash Screen dynamic fast timer
  useEffect(() => {
    if (!loading) {
      // Transition immediately once database resources are fully loaded and prepared
      const timer = setTimeout(() => {
        setSplashActive(false);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      // Safety threshold of maximum 1.5 seconds if waiting for network/database handshake
      const timer = setTimeout(() => {
        setSplashActive(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, setSplashActive]);

  // Track the Progressive Web App installation prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredInstallPrompt = e;
      
      const isDismissed = localStorage.getItem("fr_pwa_banner_dismissed_v2");
      if (!isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If already launched inside standalone app mode, hide installation cues
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredInstallPrompt;
    if (!promptEvent) {
      // Manual guidance when prompt is not available (such as Safari iOS)
      alert(
        "📲 To Download & Save FarmRise on Your Device:\n\n" +
        "• On Google Chrome (Android/PC): Tap the three dots [⋮] in your browser address bar and select 'Install' or 'Add to Home screen'.\n" +
        "• On Apple Safari (iPhone/iPad): Tap the 'Share' button in your browser toolbar, scroll down, and select 'Add to Home Screen'."
      );
      return;
    }
    
    try {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      console.log(`[FarmRise PWA] User selection: ${outcome}`);
      setDeferredPrompt(null);
      (window as any).deferredInstallPrompt = null;
      setShowInstallBanner(false);
    } catch (err) {
      console.warn("[FarmRise PWA] Dynamic installation prompt failed:", err);
    }
  };

  const dismissInstallBanner = () => {
    localStorage.setItem("fr_pwa_banner_dismissed_v2", "true");
    setShowInstallBanner(false);
  };

  if (isSplashActive) {
    return <SplashScreen />;
  }

  // Not logged in routing
  if (!currentUser) {
    if (currentPage === "register") {
      return <RegisterPage />;
    }
    return <LoginPage />;
  }

  // Account suspension block
  if (currentUser?.isBanned) {
    return (
      <div className="min-h-screen bg-[#081120] flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-red-500/20 bg-slate-950/40 space-y-6">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-display uppercase tracking-wider">Account Suspended</h2>
            <p className="text-xs text-slate-400">
              Your FarmRise sponsor account has been suspended/banned due to security precautions or policy violations.
            </p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl text-[10px] text-slate-450 leading-relaxed font-mono">
            If you believe this is a clerical mistake, contact FarmRise Support Operations directly: support@farmrise.co
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("fr_current_user");
              window.location.reload();
            }}
            className="w-full py-3.5 bg-red-700/60 hover:bg-red-600/80 font-bold rounded-xl text-xs uppercase tracking-wider transition-all border border-red-500/20"
          >
            Acknowledge & Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Admin routing check
  const isAdminView = currentPage.startsWith("admin-");

  if (isAdminView && !currentUser?.isAdmin) {
    setTimeout(() => navigate("dashboard"), 0);
    return null;
  }

  const unreadNotifs = notifications.filter((n) => !n.read);

  return (
    <div className="min-h-screen bg-[#081120] text-white flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* 1. Desktop Left Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-white/5 bg-black/20 flex-col p-6 shrink-0 justify-between">
        <div className="space-y-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#2ECC71] to-[#F5B300] rounded-xl flex items-center justify-center font-display font-black text-slate-900 text-lg">
              FR
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white font-display">FarmRise</h1>
              <span className="text-[9px] font-mono uppercase bg-gold-accent/15 text-gold-accent px-1.5 py-0.5 rounded-md font-semibold tracking-wide block w-fit">
                Live Terminal
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            <button
              onClick={() => navigate("dashboard")}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-sm font-medium ${
                currentPage === "dashboard" 
                  ? "bg-white/10 text-[#F5B300] shadow-sm" 
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => navigate("investment-plans")}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-sm font-medium ${
                currentPage === "investment-plans" || currentPage === "investment-details"
                  ? "bg-white/10 text-[#F5B300] shadow-sm" 
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Compass className="w-5 h-5" />
              <span>Sponsor plans</span>
            </button>

            <button
              onClick={() => navigate("active-investments")}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-sm font-medium ${
                currentPage === "active-investments"
                  ? "bg-white/10 text-[#F5B300] shadow-sm" 
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <CircleDollarSign className="w-5 h-5" />
              <span>My Portfolio</span>
            </button>

            <button
              onClick={() => navigate("farm-updates")}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-sm font-medium ${
                currentPage === "farm-updates"
                  ? "bg-white/10 text-[#F5B300] shadow-sm" 
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>Farm Updates</span>
            </button>

            <button
              onClick={() => navigate("profile")}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-sm font-medium ${
                currentPage === "profile" || currentPage === "referral" || currentPage === "withdrawal"
                  ? "bg-white/10 text-[#F5B300] shadow-sm" 
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <User className="w-5 h-5" />
              <span>Profile Settings</span>
            </button>

            {currentUser?.isAdmin && (
              <button
                onClick={() => navigate(isAdminView ? "dashboard" : "admin-dashboard")}
                className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-sm font-bold border ${
                  isAdminView 
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30" 
                    : "text-purple-400/60 hover:text-purple-300 border-transparent hover:bg-purple-500/5 hover:border-purple-500/10"
                }`}
              >
                <Bell className="w-5 h-5 text-purple-400" />
                <span>Admin Panel</span>
              </button>
            )}
          </nav>
        </div>

        {/* User Capsule at bottom */}
        <div 
          onClick={() => navigate("profile")}
          className="bg-white/5 p-4 rounded-2xl flex items-center gap-3 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-[#F5B300]/20 flex items-center justify-center text-[#F5B300] font-bold">
            {currentUser?.name?.substring(0, 2).toUpperCase() || "JD"}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-semibold truncate text-white">{currentUser?.name}</p>
            <p className="text-[10px] text-white/40 truncate">
              {currentUser?.isAdmin ? "HQ Admin Account" : "Premium Sponsor"}
            </p>
          </div>
        </div>
      </aside>

      {/* 2. Right Widescreen Panel */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Mobile Header */}
        {!isAdminView && (
          <header className="px-6 pt-5 pb-3 flex md:hidden justify-between items-center bg-slate-950/45 backdrop-blur-md z-30 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight font-display bg-gradient-to-r from-[#F5B300] to-[#2ECC71] bg-clip-text text-transparent">
                FarmRise
              </span>
              <span className="text-[9px] font-mono uppercase bg-gold-accent/15 text-gold-accent px-1.5 py-0.5 rounded-md font-semibold tracking-wide">
                Live
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setNotifPanelOpen(true)}
                className="relative p-2 rounded-full bg-slate-900 border border-white/5 opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                <Bell className="w-4 h-4 text-slate-300" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-gold-accent rounded-full animate-bounce ring-2 ring-[#081120]" />
                )}
              </button>
            </div>
          </header>
        )}

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center px-8 py-5 border-b border-white/5 bg-slate-950/10 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white font-display">
              {currentPage === "dashboard" && "Investor Overview"}
              {currentPage === "investment-plans" && "Sponsor Farm Packages"}
              {currentPage === "investment-details" && "Configure Livestock Contract"}
              {currentPage === "active-investments" && "My Livestock Portfolio"}
              {currentPage === "farm-updates" && "Live Farm updates Feed"}
              {currentPage === "profile" && "Investor profile Settings"}
              {currentPage === "withdrawal" && "Agricultural Yield redemption"}
              {currentPage === "deposit" && "Add sponsored coins to balance"}
              {currentPage === "referral" && "Cultivate group sponsors"}
              {currentPage.startsWith("admin-") && "FarmRise Control Center"}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {currentPage === "dashboard" && "Welcome back, tracking your live farm yields and cycles."}
              {currentPage === "investment-plans" && "Browse active poultry laying and piggery incubator plans."}
              {currentPage === "investment-details" && "Configure subscription size and review program yields."}
              {currentPage === "active-investments" && "Live incubation statuses and animal programs."}
              {currentPage === "farm-updates" && "Review real-time pig & poultry farm activities and telemetry."}
              {currentPage === "profile" && "Manage accounts metadata & diagnostic systems."}
              {currentPage === "withdrawal" && "Redeem your agricultural yield crops to bank accounts."}
              {currentPage === "deposit" && "Step-by-step wire deposits and transaction validations."}
              {currentPage === "referral" && "Share your custom referral links and earn standard 5% commission."}
              {currentPage.startsWith("admin-") && "HQ Administrative operational metrics & verification queues."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => navigate("deposit")}
                className="px-5 py-2 bg-[#F5B300] hover:bg-yellow-500 text-slate-950 font-bold rounded-xl text-xs uppercase cursor-pointer"
              >
                Deposit
              </button>
              <button
                onClick={() => navigate("withdrawal")}
                className="px-5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-xs cursor-pointer"
              >
                Withdraw
              </button>
            </div>
            <button
              onClick={() => setNotifPanelOpen(true)}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 relative text-white hover:bg-white/10 cursor-pointer"
            >
              <Bell className="w-5 h-5 text-white/80" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gold-accent rounded-full animate-bounce ring-2 ring-[#081120]" />
              )}
            </button>
          </div>
        </header>

        {/* Dynamic content area */}
        <main className="flex-1 overflow-y-auto px-6 pt-6 pb-24 md:p-8 bg-gradient-to-b from-[#081120] to-[#040912]">
          {showInstallBanner && (
            <div className="mb-6 max-w-7xl mx-auto">
              <div className="relative overflow-hidden p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-[#F5B300]/15 to-green-500/10 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full filter blur-2xl pointer-events-none" />
                <div className="flex items-center gap-3.5 z-10 text-center sm:text-left flex-col sm:flex-row">
                  <div className="w-11 h-11 bg-gradient-to-br from-[#F5B300] to-yellow-500 rounded-2xl text-slate-950 shrink-0 font-display font-extrabold text-sm shadow-md flex items-center justify-center animate-pulse">
                    📲
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-display">Install FarmRise App</h4>
                    <p className="text-[11px] text-white/70 mt-0.5 leading-relaxed max-w-lg">
                      Save/download the application to your mobile device or Chrome screen to receive instant critical incubation notifications and real-time audio sound chimes.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 z-10 w-full sm:w-auto justify-center sm:justify-end">
                  <button
                    onClick={handleInstallApp}
                    className="py-2.5 px-4 bg-gold-accent hover:bg-yellow-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    Install / Download
                  </button>
                  <button
                    onClick={dismissInstallBanner}
                    className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl transition-all cursor-pointer text-xs"
                    aria-label="Dismiss banner"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="h-full max-w-7xl mx-auto"
            >
              {isAdminView ? (
                <AdminPages />
              ) : currentPage === "farm-updates" ? (
                <FarmUpdatesPage />
              ) : (
                <UserPages />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Navigation bar */}
        {!isAdminView && (
          <nav className="fixed bottom-0 left-0 right-0 py-3.5 px-5 bg-slate-950/95 backdrop-blur-xl border-t border-white/5 flex md:hidden justify-between items-center z-40 shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
            <button
              onClick={() => navigate("dashboard")}
              className={`flex flex-col items-center gap-1 transition-all flex-1 ${
                currentPage === "dashboard" ? "text-gold-accent font-bold" : "text-white/40 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] font-medium">Home</span>
            </button>

            <button
              onClick={() => navigate("investment-plans")}
              className={`flex flex-col items-center gap-1 transition-all flex-1 ${
                currentPage === "investment-plans" || currentPage === "investment-details" 
                  ? "text-gold-accent font-bold" 
                  : "text-white/40 hover:text-white"
              }`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[10px] font-medium">Sponsor</span>
            </button>

            <button
              onClick={() => navigate("active-investments")}
              className={`flex flex-col items-center gap-1 transition-all flex-1 ${
                currentPage === "active-investments" ? "text-gold-accent font-bold" : "text-white/40 hover:text-white"
              }`}
            >
              <CircleDollarSign className="w-5 h-5" />
              <span className="text-[10px] font-medium">Portfolio</span>
            </button>

            <button
              onClick={() => navigate("farm-updates")}
              className={`flex flex-col items-center gap-1 transition-all flex-1 ${
                currentPage === "farm-updates" ? "text-gold-accent font-bold" : "text-white/40 hover:text-white"
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[10px] font-medium">Updates</span>
            </button>

            <button
              onClick={() => navigate("profile")}
              className={`flex flex-col items-center gap-1 transition-all flex-1 ${
                currentPage === "profile" || currentPage === "referral" || currentPage === "withdrawal"
                  ? "text-gold-accent font-bold" 
                  : "text-white/40 hover:text-white"
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-medium">Profile</span>
            </button>
          </nav>
        )}

      </div>

      {/* Notifications overlay Drawer */}
      <AnimatePresence>
        {notifPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNotifPanelOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-950 border-l border-white/5 h-full w-full max-w-md p-6 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-1.5 font-display">
                    🔔 Bulletins Inbox
                  </h3>
                  <p className="text-xs text-white/40">Official real-world farming bulletins</p>
                </div>
                <button
                  onClick={() => setNotifPanelOpen(false)}
                  className="text-xs uppercase font-mono tracking-wider text-white/60 font-bold hover:text-white cursor-pointer px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
                >
                  Close
                </button>
              </div>

              {/* Notifications list */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-16">
                    <Bell className="text-white/10 w-12 h-12 mx-auto mb-3" />
                    <p className="text-xs text-white/40">Your bulletin mailbox is clean.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => markNotificationAsRead(notif.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-3 ${
                        notif.read 
                          ? "bg-white/2 border-white/5 opacity-60" 
                          : "bg-white/5 border-[#F5B300]/20 hover:border-[#F5B300]/40"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.read ? 'bg-white/20' : 'bg-[#F5B300]'}`} />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white leading-tight">{notif.title}</h4>
                        <p className="text-[11px] text-white/70 leading-relaxed font-sans">{notif.message}</p>
                        <span className="text-[9px] font-mono text-white/30 block">
                          {new Date(notif.createdAt).toLocaleString(undefined, {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secure Unlock Overlays */}
      <AnimatePresence>
        {isLocked && (
          <SecureUnlockOverlay onUnlock={unlockApp} currentUser={currentUser} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSetupRecommended && (
          <SecureUnlockSetupPrompt 
            onDismiss={dismissSetupRecommendation} 
            onSuccess={dismissSetupRecommendation} 
            currentUser={currentUser} 
          />
        )}
      </AnimatePresence>

      {/* Floating WhatsApp Support & Community Link */}
      <div className="fixed bottom-24 md:bottom-8 right-6 z-40">
        <a
          href="https://chat.whatsapp.com/FiM7oFJz36d26XQEE2GNLu"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-4.5 py-3.5 bg-[#25D366] hover:bg-[#20ba56] text-white font-bold rounded-full shadow-[0_4px_24px_rgba(37,211,102,0.4)] hover:shadow-[0_4px_32px_rgba(37,211,102,0.65)] transition-all font-sans text-xs group active:scale-95 border border-white/10"
          title="Join our WhatsApp Community"
        >
          <div className="relative">
            <MessageCircle className="w-5.5 h-5.5 text-white fill-white/10" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          </div>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 md:max-w-xs block whitespace-nowrap font-bold tracking-wide">
            WhatsApp Group
          </span>
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FarmProvider>
      <MainAppShell />
    </FarmProvider>
  );
}
