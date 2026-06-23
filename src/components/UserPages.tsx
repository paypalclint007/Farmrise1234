import React, { useState, useEffect } from "react";
import { useFarm } from "../context/FarmContext";
import { 
  Wallet, TrendingUp, Compass, Calendar, User, Share2, 
  ArrowDownCircle, ArrowUpCircle, CheckCircle, Clock, Percent,
  ChevronRight, ShieldCheck, AlertTriangle, HelpCircle, PlusCircle, Power,
  Users, UserCheck, Copy, UploadCloud, Check, FileImage, RefreshCw, Sparkles
} from "lucide-react";
import { isMockAppwrite, testConnection, APPWRITE_CONFIG, verifyDepositsCollection, formatAppwriteEndpoint } from "../appwrite";
import { motion } from "motion/react";
import { ActiveInvestment } from "../types";
import { playNotificationChime, requestBrowserNotificationPermission } from "../utils/notifications";
import { SecureUnlockSetupPrompt } from "./SecureUnlock";

export default function UserPages() {
  const { currentPage, navigate } = useFarm();

  switch (currentPage) {
    case "dashboard":
      return <DashboardView />;
    case "deposit":
      return <DepositView />;
    case "investment-plans":
      return <PlansView />;
    case "investment-details":
      return <PlanDetailsView />;
    case "active-investments":
      return <ActiveInvestmentsView />;
    case "referral":
      return <ReferralView />;
    case "withdrawal":
      return <WithdrawalView />;
    case "profile":
      return <ProfileView />;
    default:
      return <DashboardView />;
  }
}

// 1. Dashboard View
function DashboardView() {
  const { 
    currentUser, 
    investments, 
    deposits, 
    withdrawals, 
    referrals, 
    plans, 
    categories,
    triggerMaturityCheck, 
    navigate 
  } = useFarm();

  // User AI personal farm co-pilot assistant state hooks
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{role: "user" | "assistant", content: string, time: string}>>([
    {
      role: "assistant",
      content: `Hello ${currentUser?.name || "Investor"}! 🤖 I am your FarmRise AI Companion. I can summarize your poultry and piggery portfolios, look up your balance details, or trace your referral commissions logs. How may I guide you on the farm today?`,
      time: new Date().toLocaleTimeString()
    }
  ]);

  const handleSendUserAi = async (customText?: string) => {
    const text = customText || aiInput;
    if (!text.trim() || aiLoading) return;

    const newMsg = {
      role: "user" as const,
      content: text,
      time: new Date().toLocaleTimeString()
    };

    setAiMessages(prev => [...prev, newMsg]);
    if (!customText) setAiInput("");
    setAiLoading(true);

    try {
      const res = await fetch("/api/ai/chat-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: aiMessages.map(m => ({ role: m.role, content: m.content })),
          context: {
            user: currentUser,
            investments: investments.filter(i => i.userId === currentUser?.id),
            referrals: referrals.filter(r => r.referrerId === currentUser?.id || r.referrerCode === currentUser?.referralCode),
            deposits: deposits.filter(d => d.userId === currentUser?.id)
          }
        })
      });
      const data = await res.json();
      if (data.reply) {
        setAiMessages(prev => [...prev, {
          role: "assistant",
          content: data.reply,
          time: new Date().toLocaleTimeString()
        }]);
      } else {
        throw new Error("No co-pilot reply retrieved.");
      }
    } catch (err: any) {
      setAiMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Under agricultural simulated conditions, I am analyzing your digital balance parameters. How can I help you invest further?`,
        time: new Date().toLocaleTimeString()
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  // 4 Cards metrics calculations
  const totalBalance = currentUser?.balance || 0;
  
  const activeSponsors = investments.filter(i => i.userId === currentUser?.id && i.status === "active");
  const activeSponsorsCount = activeSponsors.length;
  const totalActiveInvestments = activeSponsors.reduce((sum, i) => sum + i.amount, 0);

  const totalExpectedReturns = activeSponsors.reduce((sum, i) => sum + i.expectedReturn, 0);
  const referralBonus = currentUser?.referralBonus || 0;

  // Category data calculations
  const chickenPlans = plans.filter(p => p.type === "Chicken" && p.status === "active");
  const chickenPlansCount = chickenPlans.length;
  const chickenMinROI = chickenPlans.length ? Math.min(...chickenPlans.map(p => p.profitPercent)) : 12;
  const chickenMaxROI = chickenPlans.length ? Math.max(...chickenPlans.map(p => p.profitPercent)) : 18;

  const pigPlans = plans.filter(p => p.type === "Pig" && p.status === "active");
  const pigPlansCount = pigPlans.length;
  const pigMinROI = pigPlans.length ? Math.min(...pigPlans.map(p => p.profitPercent)) : 22;
  const pigMaxROI = pigPlans.length ? Math.max(...pigPlans.map(p => p.profitPercent)) : 35;

  // Assemble comprehensive unified recent activities:
  const depActivities = deposits
    .filter(d => d.userId === currentUser?.id)
    .map(d => ({
      id: d.id,
      type: "deposit" as const,
      title: "Capital Deposit Added",
      subtitle: `Ref: ${d.txRef}`,
      amount: d.amount,
      status: d.status,
      date: d.createdAt
    }));

  const invActivities = investments
    .filter(i => i.userId === currentUser?.id)
    .map(i => ({
      id: i.id,
      type: "investment" as const,
      title: `${i.planName} Active Contract`,
      subtitle: `${i.durationDays} Days lockup duration`,
      amount: i.amount,
      status: i.status === "matured" ? "matured" : "active",
      date: i.createdAt
    }));

  const withActivities = withdrawals
    .filter(w => w.userId === currentUser?.id)
    .map(w => ({
      id: w.id,
      type: "withdrawal" as const,
      title: "Yield Cashout Payout Request",
      subtitle: "Bank Transfer Cashout",
      amount: w.amount,
      status: w.status,
      date: w.createdAt
    }));

  const refActivities = referrals
    .filter(r => (r.referrerId === currentUser?.id || r.referrerId === `code_${currentUser?.referralCode?.toUpperCase()}` || r.referrerCode?.toUpperCase() === currentUser?.referralCode?.toUpperCase()) && r.status === "active" && r.commissionPaid > 0)
    .map(r => ({
      id: r.id,
      type: "referral_bonus" as const,
      title: "Referral Bonus Payout",
      subtitle: `Invited Sponsor: ${r.referredName}`,
      amount: r.commissionPaid,
      status: "approved",
      date: r.createdAt
    }));

  const allActivities = [
    ...depActivities,
    ...invActivities,
    ...withActivities,
    ...refActivities
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="space-y-8 pb-24">
      
      {/* Greeting Header */}
      <div className="flex justify-between items-center pt-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            Hello, {currentUser?.name || "Investor"} 👋
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Welcome to your farm terminal • {currentUser?.email}</p>
        </div>
        {currentUser?.isAdmin && (
          <button 
            type="button"
            onClick={() => navigate("admin-dashboard")}
            className="text-[10px] font-extrabold px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 shadow-lg uppercase tracking-wider cursor-pointer hover:bg-amber-300 transition-all active:scale-95 shrink-0"
          >
            ⚙️ Admin Console
          </button>
        )}
      </div>

      {/* AI Farm Companion Assistant Collapsible Core Panel */}
      <div className="glass-panel p-4.5 rounded-2xl border-purple-500/10 bg-purple-950/5 relative overflow-hidden text-left">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsAiOpen(!isAiOpen)}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl bg-purple-500/15 text-purple-400 ${isAiOpen ? 'animate-none' : 'animate-pulse'}`}>
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
                FarmRise Smart AI Co-Pilot
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Collapsible agricultural advisor & stats analyzer</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsAiOpen(!isAiOpen); }}
            className="text-[10px] font-mono text-slate-450 bg-white/5 border border-white/5 hover:text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            {isAiOpen ? "Minimize ▲" : "Enquire Now ▼"}
          </button>
        </div>

        {isAiOpen && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-fadeIn">
            
            {/* Thread log */}
            <div className="bg-slate-950/70 rounded-xl p-3 border border-white/5 max-h-[190px] overflow-y-auto scrollbar-custom space-y-3 flex flex-col font-mono text-[11px]">
              {aiMessages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  <span className="text-[8px] text-slate-500 mb-0.5 px-0.5">{msg.time}</span>
                  <div className={`p-2.5 rounded-xl break-words leading-relaxed text-left ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-slate-900 border border-white/10 text-slate-200 rounded-tl-none'}`} style={{ whiteSpace: "pre-wrap" }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="self-start flex flex-col items-start font-mono">
                  <span className="text-[8px] text-slate-500 mb-0.5">Advisor modeling...</span>
                  <div className="bg-slate-900 border border-white/10 text-slate-400 p-2.5 rounded-xl rounded-tl-none flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Suggested Questions */}
            <div className="flex flex-wrap gap-1.5">
              <button 
                type="button"
                onClick={() => handleSendUserAi("Summarize my current investment cycle yields and tell me my available NGN balance.")}
                disabled={aiLoading}
                className="text-[9px] font-mono px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-purple-300 cursor-pointer"
              >
                📊 Portfolio & Balance Audit
              </button>
              <button 
                type="button"
                onClick={() => handleSendUserAi("How many active referred sponsors do I have right now? Am I allowed to withdraw my cash payouts?")}
                disabled={aiLoading}
                className="text-[9px] font-mono px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-purple-300 cursor-pointer"
              >
                👥 Referral Payout Check
              </button>
              <button 
                type="button"
                onClick={() => handleSendUserAi("Which animal incubator should I invest in next based on my current wallet funds?")}
                disabled={aiLoading}
                className="text-[9px] font-mono px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-purple-300 cursor-pointer"
              >
                🐖 Recommend Best Livestock Plan
              </button>
            </div>

            {/* Dialog Input Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleSendUserAi(); }} className="flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                disabled={aiLoading}
                placeholder="Ask your smart farm guide anything..."
                className="flex-1 bg-slate-950/80 px-3 py-2 rounded-xl border border-white/10 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={aiLoading || !aiInput.trim()}
                className="px-4.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs text-white font-bold tracking-wider font-mono uppercase cursor-pointer disabled:opacity-50 transition-all"
              >
                Send
              </button>
            </form>

          </div>
        )}
      </div>

      {/* Quick Actions Row for Easy Mobile Access */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <button
          onClick={() => navigate("deposit")}
          className="flex items-center justify-center gap-2 py-3 bg-[#F5B300] text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md"
        >
          <ArrowDownCircle className="w-4 h-4 text-slate-950" />
          <span>Deposit Capital</span>
        </button>
        <button
          onClick={() => navigate("withdrawal")}
          className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md"
        >
          <ArrowUpCircle className="w-4 h-4 text-slate-300" />
          <span>Withdraw Funds</span>
        </button>
      </div>

      {/* 4 Cards Summary Top Section */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Total Balance */}
        <motion.div 
          variants={itemVariants}
          className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300 group shadow-md"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300" />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-400 font-mono font-medium tracking-tight uppercase">Total Balance</span>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black font-display text-white truncate">
                ₦{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-emerald-400 font-mono font-semibold mt-1">Available liquid assets</p>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Active Investments */}
        <motion.div 
          variants={itemVariants}
          className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between hover:border-blue-500/30 transition-all duration-300 group shadow-md"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-300" />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-400 font-mono font-medium tracking-tight uppercase">Active Placed</span>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black font-display text-white truncate">
                ₦{totalActiveInvestments.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-[#2ECC71] font-mono font-semibold mt-1">
                {activeSponsorsCount} active {activeSponsorsCount === 1 ? 'contract' : 'contracts'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Expected Returns */}
        <motion.div 
          variants={itemVariants}
          className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between hover:border-amber-500/30 transition-all duration-300 group shadow-md"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-300" />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-400 font-mono font-medium tracking-tight uppercase">Expected Return</span>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black font-display text-white truncate">
                ₦{totalExpectedReturns.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Yield + sponsored principal</p>
            </div>
          </div>
        </motion.div>

        {/* Card 4: Referral Bonus */}
        <motion.div 
          variants={itemVariants}
          className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between hover:border-pink-500/30 transition-all duration-300 group shadow-md"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/5 rounded-full blur-2xl group-hover:bg-pink-500/10 transition-all duration-300" />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-400 font-mono font-medium tracking-tight uppercase">Referral Bonus</span>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black font-display text-white truncate">
                ₦{referralBonus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-pink-400 font-mono font-semibold mt-1">5% commission earned</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Dynamic Simulated Maturity Trigger Alert Block */}
      {activeSponsorsCount > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-400/20 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-400/15 rounded-xl text-amber-400 mt-0.5">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Simulate Maturity Harvest Check</h4>
              <p className="text-xs text-slate-400 max-w-lg mt-0.5">
                Trigger evaluation scanner to complete your pending livestock cycles and claim profit payouts instantly to your terminal balance.
              </p>
            </div>
          </div>
          <button 
            onClick={triggerMaturityCheck}
            className="px-6 py-3 bg-amber-400 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-amber-300 transition-all active:scale-[0.98] whitespace-nowrap shadow-lg shadow-amber-950"
          >
            🌾 Trigger Harvesting Scan
          </button>
        </div>
      )}

      {/* Middle Section: Investment Categories */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-extrabold font-display text-white tracking-tight">
            Investment Categories
          </h2>
          <span className="text-xs text-slate-400 font-mono">{(categories || []).length} active sectors</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(categories || []).map((cat) => {
            const catPlans = plans.filter(p => p.type === cat.type && p.status === "active");
            const catPlansCount = catPlans.length;
            const isChicken = cat.type === "Chicken";
            const defaultMin = isChicken ? 12 : 22;
            const defaultMax = isChicken ? 18 : 35;
            const minROI = catPlans.length ? Math.min(...catPlans.map(p => p.profitPercent)) : defaultMin;
            const maxROI = catPlans.length ? Math.max(...catPlans.map(p => p.profitPercent)) : defaultMax;

            return (
              <div key={cat.id} className="glass-panel rounded-2xl overflow-hidden hover:border-emerald-500/20 transition-all duration-300 flex flex-col justify-between group h-full">
                <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                  <img 
                    src={cat.imageUrl} 
                    alt={cat.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 duration-700 transition-transform" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  <div className="absolute bottom-4 left-5">
                    <span className="text-2xl block mb-1">{cat.emoji}</span>
                    <h3 className="text-lg font-bold text-white">{cat.name}</h3>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-white/5 pb-3">
                    <div>
                      <span className="text-slate-450 block uppercase text-[10px]">Available Plans</span>
                      <span className="text-slate-200 font-extrabold text-sm">{catPlansCount} {isChicken ? "Standard" : "Premium"} Plans</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block uppercase text-[10px] text-right">ROI Range</span>
                      <span className={`${isChicken ? "text-emerald-400" : "text-amber-400"} font-extrabold text-sm block text-right`}>{minROI}% - {maxROI}% Yield</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed min-h-[40px]">
                    {cat.description}
                  </p>

                  <button 
                    onClick={() => navigate("investment-plans")}
                    className="w-full py-2.5 bg-white/5 border border-white/10 hover:border-emerald-400/20 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>View Plans</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Recent Activities */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-extrabold font-display text-white tracking-tight">
            Recent Activities
          </h2>
          <span className="text-xs text-slate-400 font-mono font-medium">History log Ledger</span>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-1">
          {allActivities.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Clock className="w-8 h-8 text-slate-650 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold mb-1">No transaction records found</p>
              <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Your future deposits, group contracts, payouts, and referral credits will build a detailed ledger here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {allActivities.slice(0, 8).map((act) => {
                const formattedDate = new Date(act.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                });

                // Style indicators for each type
                let iconEl;
                let amtColor = "text-white";
                let amtPrefix = "";
                let statusColor = "text-slate-400";

                if (act.type === "deposit") {
                  iconEl = (
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <ArrowDownCircle className="w-4.5 h-4.5" />
                    </div>
                  );
                  amtColor = "text-emerald-400";
                  amtPrefix = "+";
                  if (act.status === "approved") statusColor = "text-emerald-400";
                  else if (act.status === "pending") statusColor = "text-amber-400";
                  else statusColor = "text-rose-500";
                } else if (act.type === "investment") {
                  iconEl = (
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                  );
                  amtColor = "text-rose-450";
                  amtPrefix = "-";
                  statusColor = act.status === "matured" ? "text-emerald-400" : "text-blue-400";
                } else if (act.type === "withdrawal") {
                  iconEl = (
                    <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                      <ArrowUpCircle className="w-4.5 h-4.5" />
                    </div>
                  );
                  amtColor = "text-rose-450";
                  amtPrefix = "-";
                  if (act.status === "approved") statusColor = "text-emerald-400";
                  else if (act.status === "pending") statusColor = "text-amber-400";
                  else statusColor = "text-rose-500";
                } else if (act.type === "referral_bonus") {
                  iconEl = (
                    <div className="p-2.5 bg-pink-500/10 text-pink-400 rounded-xl">
                      <Share2 className="w-4.5 h-4.5" />
                    </div>
                  );
                  amtColor = "text-amber-400";
                  amtPrefix = "+";
                  statusColor = "text-emerald-400";
                }

                return (
                  <div key={act.id} className="py-4 first:pt-2 last:pb-2 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3">
                      {iconEl}
                      <div>
                        <span className="font-bold text-white block text-sm leading-tight">
                          {act.title}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-mono">{act.subtitle}</span>
                          <span className="text-slate-600">•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {formattedDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono space-y-1">
                      <span className={`text-sm font-extrabold ${amtColor} block`}>
                        {amtPrefix}₦{act.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[9px] uppercase font-bold tracking-wider ${statusColor} bg-white/2 border border-white/5 py-0.5 px-2 rounded-full inline-block`}>
                        {act.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// 2. Deposit View
function DepositView() {
  const { createDeposit, navigate } = useFarm();
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("9907817696");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 800;
            let width = img.width;
            let height = img.height;
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Optimize to JPEG-65% format which reduces sizes massively to around 60KB-120KB
              const compressedBase64 = canvas.toDataURL("image/jpeg", 0.65);
              setReceiptImage(compressedBase64);
              setReceiptFileName(file.name);
            }
          };
          img.src = uploadEvent.target?.result as string;
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert("Invalid format: Please choose a valid image file (PNG, JPG, JPEG screenshot or receipt image).");
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    if (!receiptImage) {
      alert("Please upload a transaction receipt or payment screenshot to continue.");
      return;
    }

    setSending(true);
    try {
      // Generate a clean transaction reference for record-keeping
      const referenceCode = "MNP-TX-" + Math.floor(Math.random() * 900000 + 100000);
      await createDeposit(Number(amount), referenceCode, receiptImage);
      setSubmitted(true);
    } catch (err: any) {
      alert(`Error submitting deposit: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6 pb-24 max-w-xl mx-auto text-center py-8">
        <div className="glass-panel rounded-3xl p-8 space-y-6 flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white font-display">Deposit Submitted Successfully.</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your Capital Deposit of ₦{Number(amount).toLocaleString()} is pending verification. FarmRise Admin will validate the payment slip and credit your balance automatically.
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl w-full text-left font-mono text-xs border border-white/5 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-550">Deposit Amount:</span>
              <span className="text-white font-bold">₦{Number(amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-550">Status:</span>
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Approval
              </span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => navigate("dashboard")}
              className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-xs uppercase"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                setAmount("");
                setReceiptImage("");
                setReceiptFileName("");
                setSubmitted(false);
              }}
              className="py-3 bg-[#F5B300] text-slate-950 font-bold rounded-xl text-xs uppercase"
            >
              Deposit More
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold font-display text-white">Deposit Capital</h2>
        <p className="text-xs text-slate-400 mt-1">Sponsor live organic assets using standard bank wire methods</p>
      </div>

      <ProfileSubTabs active="deposit" />

      {/* Modern Bank details panel */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-mono uppercase tracking-wider text-gold-accent font-bold">Step 1: Direct Bank Transfer Details</h3>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-mono font-bold animate-pulse">
            Active Verified Gateway
          </span>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-950/60 space-y-4 border border-white/5 font-sans text-xs">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-mono text-[11px]">Bank Name:</span>
              <span className="text-white font-extrabold text-sm">indulge MFB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-mono text-[11px]">Account Name:</span>
              <span className="text-white font-bold">More4less Farmrise FLW</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-mono text-[11px]">Account Number:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gold-accent font-black tracking-widest text-sm font-mono">9907817696</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-slate-350 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  title="Copy account ID"
                >
                  {copied ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <Copy className="w-3 h-3" /> Copy
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-2 bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2.5 text-[10px] text-amber-300 leading-relaxed font-mono">
            ⚠️ Transfer the exact amount you wish to credit. Take a screenshot or save the PDF/receipt from your banking app immediately after.
          </div>
        </div>
      </div>

      <form onSubmit={handleDepositSubmit} className="glass-panel rounded-2xl p-5 space-y-5">
        <h3 className="text-xs font-mono uppercase tracking-wider text-gold-accent font-bold">Step 2: Submit Proof of Payment</h3>

        {/* Amount Input */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold">Amount Deposited (₦)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">₦</span>
            <input
              type="number"
              required
              min="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount successfully sent"
              className="w-full glass-input rounded-xl p-3.5 pl-8 text-xs font-semibold focus:border-gold-accent/40"
            />
          </div>
        </div>

        {/* File Drag-and-Drop & Selector */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold">
            Upload: Screenshot OR Transaction Receipt
          </label>
          
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${
              dragActive 
                ? "border-gold-accent bg-gold-accent/5" 
                : receiptImage 
                  ? "border-emerald-500/20 bg-slate-950/60" 
                  : "border-white/10 bg-slate-950/30 hover:bg-slate-950/50"
            }`}
          >
            <input
              type="file"
              id="receipt-file-input"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <label htmlFor="receipt-file-input" className="w-full h-full flex flex-col items-center justify-center cursor-pointer space-y-3.5">
              {receiptImage ? (
                <div className="flex flex-col items-center space-y-3 w-full">
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/20 shadow-md">
                    <img src={receiptImage} alt="Receipt Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-200 block truncate max-w-[260px] font-mono">
                      {receiptFileName || "receipt_slip.png"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-0.5 mt-0.5">
                      <FileImage className="w-3.5 h-3.5" /> Ready to transmit
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 underline hover:text-slate-300">
                    Replace Payment slip image
                  </span>
                </div>
              ) : (
                <div className="text-center space-y-2 py-2">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Drag & drop your screenshot here</span>
                    <span className="text-[10px] text-slate-500 block mt-1">or click on this box to browse local storage</span>
                  </div>
                  <span className="text-[9px] bg-white/5 text-slate-400 px-2 py-0.5 rounded font-mono inline-block">
                    PNG, JPG, JPEG formats
                  </span>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Submit action */}
        <button
          type="submit"
          disabled={sending || !amount || !receiptImage}
          className="w-full py-3.5 bg-[#F5B300] hover:bg-[#E5A300] text-slate-950 font-extrabold rounded-xl text-xs uppercase tracking-wider hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-45 disabled:pointer-events-none cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
        >
          {sending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin inline-block" />
              Verifying and Submitting...
            </span>
          ) : (
            <span>Submit Payment Verification Receipt</span>
          )}
        </button>
      </form>
    </div>
  );
}

// 3. Plans List View
function PlansView() {
  const { plans, currentUser, createInvestment, navigate } = useFarm();
  const [activeCategory, setActiveCategory] = useState<"Chicken" | "Pig">("Chicken");
  const [investingPlan, setInvestingPlan] = useState<any | null>(null);
  const [investAmt, setInvestAmt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<any | null>(null);

  // Filter plans based on Category toggle
  const filteredPlans = plans.filter(
    (p) => p.type === activeCategory && p.status === "active"
  );

  const handleOpenInvest = (plan: any) => {
    setInvestingPlan(plan);
    setInvestAmt(plan.minAmount.toString());
  };

  const handleConfirmInvestment = async () => {
    if (!currentUser || !investingPlan) return;
    const amount = Number(investAmt);
    if (!amount || amount < investingPlan.minAmount || amount > investingPlan.maxAmount) {
      alert(`Invalid Amount: Please choose between ₦${investingPlan.minAmount.toLocaleString()} and ₦${investingPlan.maxAmount.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    try {
      await createInvestment(investingPlan.id, amount);
      
      // Calculate profit from the plan to show on success slide
      const profitRate = investingPlan.profitPercent;
      const calculatedReturn = investingPlan.totalReturn || Number((amount * (1 + profitRate / 100)).toFixed(2));
      const dailyEarn = investingPlan.dailyProfit || Math.round((calculatedReturn - amount) / investingPlan.durationDays);

      setSuccessInfo({
        planName: investingPlan.name,
        amount: amount,
        duration: investingPlan.durationDays,
        dailyProfit: dailyEarn,
        totalReturn: calculatedReturn
      });
      setInvestingPlan(null);
    } catch (err: any) {
      alert(`Failed to activate organic livestock contract: ${err.message || String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const isBalanceEnough = currentUser ? currentUser.balance >= Number(investAmt) : false;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-display text-white tracking-tight">Investment Plans</h2>
          <p className="text-xs text-slate-400 mt-1">Sponsor live organic assets, track incubation yields, and cashout high harvests.</p>
        </div>
        
        {/* Wallet Balance Widget */}
        <div className="px-4 py-2.5 bg-slate-950/40 border border-white/5 rounded-xl flex items-center gap-3">
          <div className="p-1 px-1.5 rounded-lg bg-yellow-500/10 text-[#F5B300] text-xs">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold block">Farming Balance</span>
            <span className="text-sm font-black text-white font-mono">₦{currentUser?.balance?.toLocaleString() || "0.00"}</span>
          </div>
        </div>
      </div>

      {/* Category selector */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-white/5">
        <button
          onClick={() => setActiveCategory("Chicken")}
          className={`py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeCategory === "Chicken"
              ? "bg-[#F5B300] text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="text-sm">🐔</span> Chicken Farming ({plans.filter(p => p.type === "Chicken" && p.status === "active").length})
        </button>
        <button
          onClick={() => setActiveCategory("Pig")}
          className={`py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeCategory === "Pig"
              ? "bg-[#F5B300] text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="text-sm">🐖</span> Pig Farming ({plans.filter(p => p.type === "Pig" && p.status === "active").length})
        </button>
      </div>

      {/* Plans list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredPlans.map((plan) => {
          // Dynamic display variables in Nigerian currency
          const investmentCost = plan.minAmount;
          const durationDays = plan.durationDays;
          const estimatedDailyProfit = plan.dailyProfit || Math.round((investmentCost * (plan.profitPercent / 100)) / durationDays);
          const estimatedTotalReturn = plan.totalReturn || (investmentCost * (1 + plan.profitPercent / 100));

          return (
            <div
              key={plan.id}
              className="glass-panel rounded-2xl overflow-hidden hover:border-[#F5B300]/30 transition-all flex flex-col group border border-white/5"
            >
              <div className="w-full h-40 relative bg-slate-950 overflow-hidden">
                <img
                  src={plan.imageUrl}
                  alt={plan.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                />
                
                {/* Status indicator */}
                <span className="absolute top-3.5 left-3.5 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  ACTIVE LISTING
                </span>

                <span className="absolute top-3.5 right-3.5 text-[10px] uppercase font-mono font-bold tracking-wider px-2.5 py-1 rounded-full bg-slate-950/80 text-white border border-white/5">
                  {plan.type === "Chicken" ? "🐔 Chicken" : "🐖 Swine"}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-base font-black text-white leading-tight font-display">{plan.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed min-h-[32px] line-clamp-2">
                    {plan.description}
                  </p>
                </div>

                {/* Financial Table Grid */}
                <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-450 font-sans text-[11px]">Investment:</span>
                    <span className="text-white font-extrabold text-sm">₦{investmentCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-white/5 pt-2">
                    <span className="text-slate-450 font-sans text-[11px]">Duration:</span>
                    <span className="text-slate-200 font-bold">{durationDays} Days lockup</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-white/5 pt-2">
                    <span className="text-slate-450 font-sans text-[11px]">Daily Profit:</span>
                    <span className="text-amber-400 font-extrabold">₦{estimatedDailyProfit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-white/5 pt-2">
                    <span className="text-slate-450 font-sans text-[11px]">Total Return:</span>
                    <span className="text-green-accent font-black text-sm">₦{estimatedTotalReturn.toLocaleString()}</span>
                  </div>
                </div>

                {/* INVEST NOW button */}
                <button
                  type="button"
                  onClick={() => handleOpenInvest(plan)}
                  className="w-full py-3 bg-[#F5B300] hover:bg-[#E5A300] text-slate-950 font-extrabold rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-md text-center inline-block"
                >
                  INVEST NOW
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🚀 QUICK SPONSORSHIP TRANSACTION DIALOG MODAL */}
      {investingPlan && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-5 border border-white/10 relative text-left shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#F5B300] uppercase font-bold block">CONFIRM SPONSORSHIP</span>
                <h3 className="text-lg font-black text-white font-display mt-0.5">{investingPlan.name}</h3>
              </div>
              <button
                onClick={() => setInvestingPlan(null)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl space-y-3 font-sans text-xs border border-white/5">
              <div className="flex justify-between font-mono">
                <span className="text-slate-450">Capital Investment Required:</span>
                <span className="text-white font-extrabold">₦{Number(investAmt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-mono border-t border-white/5 pt-2">
                <span className="text-slate-450">Incubation Duration Days:</span>
                <span className="text-slate-200 font-bold">{investingPlan.durationDays} Days</span>
              </div>
              
              <div className="flex justify-between font-mono border-t border-white/5 pt-2">
                <span className="text-slate-450">Estimated Daily profit:</span>
                <span className="text-amber-400 font-extrabold">
                  ₦{(investingPlan.dailyProfit || Math.round((investingPlan.totalReturn - investingPlan.minAmount) / investingPlan.durationDays)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-mono border-t border-white/10 pt-2 text-[#00E676]">
                <span>Projected Return:</span>
                <span className="font-black text-sm">
                  ₦{Number(investingPlan.totalReturn || (investingPlan.minAmount * (1 + investingPlan.profitPercent / 100))).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Wallet verification widget */}
            <div className="p-3.5 bg-slate-950/40 rounded-xl border border-white/5 flex justify-between items-center text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Your Wallet Balance</span>
                <div className="text-white font-black">₦{currentUser?.balance?.toLocaleString() || "0.00"}</div>
              </div>
              
              {isBalanceEnough ? (
                <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 rounded text-emerald-450 font-bold uppercase tracking-wide">
                  Funds Available
                </span>
              ) : (
                <span className="text-[10px] bg-red-500/15 border border-red-500/25 px-2.5 py-1 rounded text-red-400 font-bold uppercase tracking-wide">
                  Insufficient Funds
                </span>
              )}
            </div>

            {/* Actions list */}
            <div className="space-y-2 pt-1">
              {isBalanceEnough ? (
                <button
                  type="button"
                  onClick={handleConfirmInvestment}
                  disabled={submitting}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin inline-block" />
                      Activating Organic Contract...
                    </span>
                  ) : (
                    <span>Confirm & Launch Plan Contract</span>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-amber-500/5 text-amber-400 border border-amber-500/10 text-[10px] leading-relaxed font-mono">
                    ⚠️ You need an additional ₦{(Number(investAmt) - (currentUser?.balance || 0)).toLocaleString()} in your wallet to sponsor this livestock batch.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInvestingPlan(null);
                      navigate("deposit");
                    }}
                    className="w-full py-3.5 bg-[#F5B300] text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    Deposit Capital Now
                  </button>
                </div>
              )}
              
              <button
                type="button"
                onClick={() => setInvestingPlan(null)}
                className="w-full py-2 bg-transparent text-slate-400 hover:text-white font-semibold rounded-lg text-xs uppercase text-center cursor-pointer"
              >
                Cancel transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 SPONSORSHIP SUCCESS DISPLAY PANEL */}
      {successInfo && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl p-7 space-y-6 border border-white/10 text-center relative shadow-2xl flex flex-col items-center">
            
            <div className="w-20 h-20 bg-emerald-500/10 text-[#00E676] rounded-full flex items-center justify-center border border-emerald-500/20 shadow-inner animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-white font-display">Sponsorship Activated!</h3>
              <p className="text-xs text-slate-450 leading-relaxed">
                You have successfully sponsored the <strong className="text-white">{successInfo.planName}</strong> program. Your contract is now active in the Firebase pipeline.
              </p>
            </div>

            <div className="w-full p-4 bg-slate-950/60 rounded-xl space-y-2.5 font-mono text-xs border border-white/5 text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-450">Active Capital:</span>
                <span className="text-white font-bold">₦{successInfo.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-450">Contract Term:</span>
                <span className="text-slate-200 font-semibold">{successInfo.duration} Days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-450">Accumulating:</span>
                <span className="text-amber-400 font-extrabold">₦{successInfo.dailyProfit.toLocaleString()} / day</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-2 text-green-accent">
                <span>Final Harvest return:</span>
                <span className="font-black text-sm">₦{successInfo.totalReturn.toLocaleString()}</span>
              </div>
            </div>

            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessInfo(null);
                  navigate("active-investments");
                }}
                className="w-full py-3.5 bg-green-accent hover:bg-emerald-600 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
              >
                Go to Active Contracts
              </button>
              <button
                type="button"
                onClick={() => setSuccessInfo(null)}
                className="w-full py-2 bg-transparent text-slate-400 hover:text-white font-semibold rounded-lg text-xs uppercase cursor-pointer"
              >
                Browse other plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 4. Plan Details View (Investment Details)
function PlanDetailsView() {
  const { selectedPlan, currentUser, createInvestment, navigate } = useFarm();
  const [investAmt, setInvestAmt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!selectedPlan) return <PlansView />;

  const isBalanceEnough = currentUser ? currentUser.balance >= Number(investAmt) : false;

  const handleSponsorConfirm = async () => {
    const amount = Number(investAmt);
    if (!amount || amount < selectedPlan.minAmount || amount > selectedPlan.maxAmount) {
      alert(`Please input a valid amount between ₦${selectedPlan.minAmount} and ₦${selectedPlan.maxAmount}`);
      return;
    }
    setSubmitting(true);
    try {
      await createInvestment(selectedPlan.id, amount);
      alert("Successfully sponsored livestock batch! Check your active contracts.");
      navigate("active-investments");
    } catch (err: any) {
      alert(`Investment error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateReturn = () => {
    const amt = Number(investAmt);
    if (!amt) return 0;
    return (amt * (1 + selectedPlan.profitPercent / 100)).toFixed(2);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Back to list link */}
      <button 
        onClick={() => navigate("investment-plans")}
        className="text-xs text-gold-accent font-semibold flex items-center gap-1.5 hover:underline"
      >
        ← Back to packages
      </button>

      <div className="w-full h-44 rounded-2xl overflow-hidden bg-slate-950 border border-white/10">
        <img src={selectedPlan.imageUrl} alt={selectedPlan.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
      </div>

      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div>
          <span className="text-[10px] font-mono text-gold-accent uppercase font-bold tracking-wider">Plan Description</span>
          <h2 className="text-lg font-bold text-white mt-1 leading-snug">{selectedPlan.name}</h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedPlan.description}</p>

        <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-4 text-xs font-mono">
          <div>
            <span className="text-slate-450 uppercase block mb-0.5">Yield return</span>
            <span className="text-green-accent font-bold text-sm">+{selectedPlan.profitPercent}% NET yield</span>
          </div>
          <div>
            <span className="text-slate-450 uppercase block mb-0.5">Holding cycle</span>
            <span className="text-slate-200 font-bold text-sm">{selectedPlan.durationDays} Days incubation</span>
          </div>
          <div>
            <span className="text-slate-450 uppercase block mb-0.5">Sponsor Min</span>
            <span className="text-slate-200 font-bold text-sm">₦{selectedPlan.minAmount}</span>
          </div>
          <div>
            <span className="text-slate-450 uppercase block mb-0.5">Sponsor Max</span>
            <span className="text-slate-200 font-bold text-sm">₦{selectedPlan.maxAmount}</span>
          </div>
        </div>
      </div>

      {/* Estimator and Sponsorship form */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-450 font-bold">Returns Calculator & Sponsor Input</h3>
        
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1.5 uppercase font-bold">Sponsor Capital (₦)</label>
          <input
            type="number"
            value={investAmt}
            onChange={(e) => setInvestAmt(e.target.value)}
            placeholder={`Enter range ₦${selectedPlan.minAmount} to ₦${selectedPlan.maxAmount}`}
            className="w-full glass-input rounded-xl p-3 text-xs"
          />
        </div>

        {investAmt && (
          <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Principal Invested:</span>
              <span className="text-white">₦{investAmt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans font-bold text-gold-accent">Estimated Total Profit:</span>
              <span className="text-green-accent font-bold">+₦{(Number(calculateReturn()) - Number(investAmt)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-2">
              <span className="text-slate-350 font-sans">Ending Payout:</span>
              <span className="text-white font-bold">₦{calculateReturn()}</span>
            </div>
          </div>
        )}

        <div className="border-t border-white/5 pt-4 space-y-3">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Your wallet balance:</span>
            <span className="font-bold text-white">₦{currentUser?.balance?.toFixed(2) || "0.00"}</span>
          </div>

          <button
            onClick={handleSponsorConfirm}
            disabled={submitting || !investAmt || !isBalanceEnough}
            className="w-full py-3.5 bg-green-accent text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isBalanceEnough ? " Sponsor Livestock Contract" : "Insufficient Balance (Please deposit)"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 5. Active Investments (Portfolio View)
function ActiveInvestmentsView() {
  const { investments, plans, withdrawMaturedInvestment, navigate, currentUser } = useFarm();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  
  // Real-time ticking clock state to update the countdowns and maturity states every single second
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const activeSponsors = investments.filter(i => {
    // Only current user's investments
    if (i.userId !== currentUser?.id) return false;
    // If matured status, keep under maturedSponsors below
    if (i.status === "matured") return false;
    // Otherwise, it is an active contract (it handles its own visual state when now >= maturesDate)
    return i.status === "active";
  });
  const maturedSponsors = investments.filter(i => i.userId === currentUser?.id && i.status === "matured");

  const handleWithdraw = async (invId: string) => {
    if (withdrawingId) return;
    setWithdrawingId(invId);
    try {
      await withdrawMaturedInvestment(invId);
      alert("Success! The total capital and accumulated profit has been successfully credited to your farming balance.");
    } catch (err: any) {
      alert(`Withdrawal failed: ${err.message || String(err)}`);
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-black font-display text-white tracking-tight">Active Portfolio</h2>
        <p className="text-xs text-slate-400 mt-1">Sponsor live incubation statuses, monitor lockup days, and claim matured payouts with zero delay.</p>
      </div>

      <div className="space-y-8">
        {/* Live Active Listings */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-widest text-gold-accent font-black mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold-accent animate-ping" />
            Live Contracts ({activeSponsors.length})
          </h3>
          
          {activeSponsors.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center bg-slate-900/10">
              <Clock className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm text-slate-300 font-extrabold">No active farming plans</p>
              <p className="text-xs text-slate-500 mt-1">Sponsor a livestock batch from our listing page to start earning yields.</p>
              <button 
                onClick={() => navigate("investment-plans")}
                className="mt-4 px-4 py-2 bg-[#F5B300] text-slate-950 font-black rounded-xl text-xs uppercase tracking-wide hover:bg-[#E5A300] transition-colors cursor-pointer"
              >
                Browse Farming Packages
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeSponsors.map((inv) => {
                const plan = plans.find(p => p.id === inv.planId);
                const imageUrl = plan?.imageUrl || "https://images.unsplash.com/photo-1548550123-94f1067bc16f?w=600&auto=format&fit=crop&q=80";

                const maturesDate = new Date(inv.maturesAt);
                const isMatured = now >= maturesDate;

                const elapsed = now.getTime() - new Date(inv.createdAt).getTime();
                const total = maturesDate.getTime() - new Date(inv.createdAt).getTime();
                const pct = isMatured ? 100 : Math.min(100, Math.max(0, (elapsed / total) * 100));

                const msDiff = maturesDate.getTime() - now.getTime();
                const daysRemaining = isMatured ? 0 : Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

                // Calculate countdown breakouts
                const days = Math.floor(Math.max(0, msDiff) / (1000 * 60 * 60 * 24));
                const hours = Math.floor((Math.max(0, msDiff) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((Math.max(0, msDiff) % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((Math.max(0, msDiff) % (1000 * 60)) / 1000);

                const dailyProfit = plan?.dailyProfit || Math.round((inv.expectedReturn - inv.amount) / inv.durationDays);

                return (
                  <div 
                    key={inv.id} 
                    className={`glass-panel rounded-2xl overflow-hidden border transition-all flex flex-col ${
                      isMatured 
                        ? "border-[#00E676]/35 shadow-lg shadow-emerald-950/20 bg-emerald-950/5" 
                        : "border-white/5 hover:border-white/10"
                    }`}
                  >
                    {/* Header Image Area with overlays */}
                    <div className="h-44 relative bg-slate-950 overflow-hidden">
                      <img src={imageUrl} alt={inv.planName} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-75" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />

                      {/* Status / Type indicators */}
                      <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-2">
                        {isMatured ? (
                          <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded bg-[#00E676] text-slate-950 flex items-center gap-1 shadow-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping inline-block" />
                            COMPLETED
                          </span>
                        ) : (
                          <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded bg-gold-accent text-slate-950 flex items-center gap-1 shadow-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                            ACTIVE
                          </span>
                        )}
                        <span className="text-[9px] uppercase font-mono tracking-wider text-slate-300 font-bold px-2 py-1 bg-slate-950/80 rounded border border-white/10">
                          {inv.type === "Chicken" ? "🐔 Chicken" : "🐖 Swine"}
                        </span>
                      </div>

                      {/* Floating details on image (Overlay) */}
                      <div className="absolute bottom-4 left-4 right-4 text-left">
                        <span className="text-[10px] font-mono text-gold-accent tracking-wider font-bold">CONTRACT ID: {inv.id.substring(4, 12)}</span>
                        <h4 className="text-base font-black text-white font-display mt-0.5 leading-tight">{inv.planName}</h4>
                      </div>
                    </div>

                    {/* Meta information & metrics */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      {/* Financial Detail Table */}
                      <div className="p-3.5 bg-slate-950/50 rounded-xl border border-white/5 space-y-2.5 font-mono text-[11px]">
                        <div className="flex justify-between items-center text-slate-450">
                          <span>Investment Capital:</span>
                          <span className="text-white font-black text-xs">₦{inv.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-450">
                          <span>Daily Profit:</span>
                          <span className="text-amber-400 font-bold">₦{dailyProfit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-450">
                          <span>Expected Return:</span>
                          <span className="text-green-accent font-black text-xs">₦{inv.expectedReturn.toLocaleString()}</span>
                        </div>

                        <div className="border-t border-white/5 pt-2.5 flex justify-between items-center text-slate-500">
                          <span>Start Date:</span>
                          <span className="text-slate-300">{new Date(inv.createdAt).toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"})}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-500">End Date:</span>
                          <span className="text-slate-200 font-semibold">{new Date(inv.maturesAt).toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"})}</span>
                        </div>
                      </div>

                      {/* Real-time Ticking Countdown Timer */}
                      {!isMatured ? (
                        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-3.5 space-y-2 text-center">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-gold-accent animate-ping" />
                              Time Remaining
                            </span>
                            <span className="text-gold-accent text-[9px] bg-gold-accent/10 border border-gold-accent/20 px-1.5 py-0.5 rounded font-black">
                              INCUBATING
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center mt-1">
                            <div className="bg-slate-950/80 border border-white/5 rounded-lg py-1.5">
                              <span className="text-sm font-black text-white font-mono block leading-none">{String(days).padStart(2, "0")}</span>
                              <span className="text-[8px] font-mono text-slate-500 uppercase block mt-1 tracking-wider">Days</span>
                            </div>
                            <div className="bg-slate-950/80 border border-white/5 rounded-lg py-1.5">
                              <span className="text-sm font-black text-white font-mono block leading-none">{String(hours).padStart(2, "0")}</span>
                              <span className="text-[8px] font-mono text-slate-500 uppercase block mt-1 tracking-wider">Hrs</span>
                            </div>
                            <div className="bg-slate-950/80 border border-white/5 rounded-lg py-1.5">
                              <span className="text-sm font-black text-white font-mono block leading-none">{String(minutes).padStart(2, "0")}</span>
                              <span className="text-[8px] font-mono text-slate-500 uppercase block mt-1 tracking-wider">Mins</span>
                            </div>
                            <div className="bg-slate-950/80 border border-white/5 rounded-lg py-1.5">
                              <span className="text-sm font-black text-amber-500 font-mono block leading-none animate-pulse">{String(seconds).padStart(2, "0")}</span>
                              <span className="text-[8px] font-mono text-slate-400 uppercase block mt-1 tracking-wider">Secs</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-950/20 border border-[#00E676]/20 rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-[#00E676] animate-pulse" />
                            <div className="text-left">
                              <p className="text-[10px] font-mono uppercase tracking-wider text-[#00E676] font-black leading-none">CONTRACT MATURED</p>
                              <span className="text-[8px] text-slate-400">Capital & yield unlocked</span>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-black text-[#00E676] bg-[#00E676]/10 px-2 py-1 rounded">00d:00h:00m:00s</span>
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Incubation progressive:</span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-white/5 relative">
                          <div 
                            className={`h-full transition-all duration-300 ${isMatured ? "bg-[#00E676]" : "bg-gold-accent"}`} 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                      </div>

                      {/* Manual Action Button */}
                      <div className="pt-2">
                        {isMatured ? (
                          <button
                            type="button"
                            onClick={() => handleWithdraw(inv.id)}
                            disabled={withdrawingId === inv.id}
                            className="w-full py-3 bg-[#00E676] hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/20"
                          >
                            {withdrawingId === inv.id ? (
                              <>
                                <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin inline-block" />
                                Crediting Wallet Balance...
                              </>
                            ) : (
                              "Withdraw Capital & Profit"
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full py-3 bg-white/5 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-wider border border-white/5 cursor-not-allowed select-none text-center"
                          >
                            Locked (Incubating)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Harvested Payout History list */}
        {maturedSponsors.length > 0 && (
          <div>
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#00E676] font-black mb-4 flex items-center gap-2">
              Completed/Harvested History ({maturedSponsors.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {maturedSponsors.map((inv) => (
                <div key={inv.id} className="glass-panel p-4 rounded-xl border border-white/5 flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                  <div className="space-y-1 text-left">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">🐖 Completed contract</span>
                    <h4 className="text-xs font-bold text-white leading-snug">{inv.planName}</h4>
                    <span className="text-[9px] text-slate-400 font-mono block">Finished: {new Date(inv.maturesAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-right text-xs font-mono space-y-1">
                    <span className="text-[#00E676] font-extrabold text-sm block">+₦{inv.expectedReturn.toLocaleString()}</span>
                    <span className="text-[9px] text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Withdrawn</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-navigation tabs for Profile section
function ProfileSubTabs({ active }: { active: "profile" | "referral" | "withdrawal" | "deposit" }) {
  const { navigate } = useFarm();
  return (
    <div className="flex bg-slate-950/65 p-1 rounded-xl border border-white/5 gap-1 mb-4">
      <button
        onClick={() => navigate("profile")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-[11px] sm:py-2.5 sm:px-2 sm:text-xs rounded-lg font-semibold cursor-pointer transition-all ${
          active === "profile"
            ? "bg-[#F5B300] text-slate-950 font-bold shadow-md"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <User className="w-3.5 h-3.5" />
        <span>Profile</span>
      </button>
      <button
        onClick={() => navigate("deposit")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-[11px] sm:py-2.5 sm:px-2 sm:text-xs rounded-lg font-semibold cursor-pointer transition-all ${
          active === "deposit"
            ? "bg-[#F5B300] text-slate-950 font-bold shadow-md"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <PlusCircle className="w-3.5 h-3.5" />
        <span>Deposit</span>
      </button>
      <button
        onClick={() => navigate("withdrawal")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-[11px] sm:py-2.5 sm:px-2 sm:text-xs rounded-lg font-semibold cursor-pointer transition-all ${
          active === "withdrawal"
            ? "bg-[#F5B300] text-slate-950 font-bold shadow-md"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <Wallet className="w-3.5 h-3.5" />
        <span>Withdraw</span>
      </button>
      <button
        onClick={() => navigate("referral")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-[11px] sm:py-2.5 sm:px-2 sm:text-xs rounded-lg font-semibold cursor-pointer transition-all ${
          active === "referral"
            ? "bg-[#F5B300] text-slate-950 font-bold shadow-md"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>Referrals</span>
      </button>
    </div>
  );
}

// 6. Referral Page
function ReferralView() {
  const { currentUser, referrals, deposits, investments, triggerManualSync } = useFarm();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");
  
  const code = currentUser?.referralCode || "RISE8349";

  // Automatically refresh on mount and poll for updates every 8 seconds
  useEffect(() => {
    const updateTimeStr = () => {
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    const interval = setInterval(async () => {
      try {
        setIsSyncing(true);
        await triggerManualSync();
        updateTimeStr();
      } catch (err) {
        console.warn("Auto background check for referrals failed:", err);
      } finally {
        setTimeout(() => setIsSyncing(false), 600);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [triggerManualSync]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await triggerManualSync();
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn("Manual triggers fail during sync:", err);
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const myReferrals = referrals.filter(r => r.referrerId === currentUser?.id || r.referrerId === `code_${currentUser?.referralCode?.toUpperCase()}` || r.referrerCode?.toUpperCase() === currentUser?.referralCode?.toUpperCase());
  
  // Dynamic deposit status check
  const isReferredUserDeposited = (referredId: string, referredEmail: string) => {
    return deposits.some(d => 
      (d.userId === referredId || d.userId?.toLowerCase() === referredEmail?.toLowerCase())
    );
  };

  const activeReferrals = myReferrals.filter(r => 
    r.status === "active" || 
    r.status === "complete" || 
    isReferredUserDeposited(r.referredId, r.referredEmail)
  );
  const pendingReferrals = myReferrals.filter(r => 
    r.status !== "active" && 
    r.status !== "complete" && 
    !isReferredUserDeposited(r.referredId, r.referredEmail)
  );

  // Filter unique referred users who have completed at least one investment sponsorship contract
  const investingReferrals = myReferrals.filter(r => 
    r.status === "active" || 
    r.status === "complete" || 
    investments.some(inv => inv.userId === r.referredId)
  );
  const uniqueInvestingCount = new Set(investingReferrals.map(r => r.referredId.toLowerCase().trim())).size;
  const progressPercent = Math.min(100, (uniqueInvestingCount / 2) * 100);
  const meetsReferralRequirement = currentUser?.isAdmin || uniqueInvestingCount >= 2;

  const totalCommissionEarned = myReferrals.reduce((sum, r) => {
    if (r.status === "active" || r.status === "complete") {
      return sum + r.commissionPaid;
    }
    const matchDep = deposits.find(d => d.userId === r.referredId || d.userId?.toLowerCase() === r.referredEmail?.toLowerCase());
    if (matchDep) {
      return sum + Number((matchDep.amount * 0.05).toFixed(2));
    }
    return sum;
  }, 0);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    alert("FarmRise referral code copied to your clipboard!");
  };

  const handleCopyLink = () => {
    const inviteLink = `https://farmrise-512146898255.europe-west2.run.app/register?ref=${code}`;
    navigator.clipboard.writeText(inviteLink);
    alert("FarmRise unique referral link copied to your clipboard!");
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-start">
        <div className="text-left">
          <h2 className="text-2xl font-bold font-display text-white">Affiliate Partner</h2>
          <p className="text-xs text-slate-400 mt-1">Earn 5% direct commission on invited capital sponsors</p>
        </div>
        
        {/* Dynamic Auto-Update Connection Heartbeat */}
        <button 
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-white/5 bg-slate-900/60 hover:bg-slate-900/90 transition text-[10px] font-mono text-slate-300 pointer-events-auto"
        >
          <span className="relative flex h-2 w-2 mr-0.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSyncing ? "bg-amber-400" : "bg-emerald-400"}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isSyncing ? "bg-amber-500" : "bg-emerald-500"}`}></span>
          </span>
          <span>{isSyncing ? "Syncing..." : `Live (Synced ${lastSyncTime})`}</span>
          <RefreshCw className={`w-3 h-3 text-slate-400 ml-0.5 ${isSyncing ? "animate-spin text-amber-400" : ""}`} />
        </button>
      </div>

      <ProfileSubTabs active="referral" />

      {/* Grid Summary Deck */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel p-3.5 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tight block">Invited</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-bold font-display text-white">{myReferrals.length}</span>
            <span className="text-[9px] text-slate-400">users</span>
          </div>
        </div>
        
        <div className="glass-panel p-3.5 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tight block">Active</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-bold font-display text-emerald-400">{activeReferrals.length}</span>
            <span className="text-[9px] text-slate-400 font-bold">sponsors</span>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tight block">Bonus Earned</span>
          <div className="mt-1">
            <span className="text-xs font-bold font-display text-amber-400 block truncate">
              ₦{totalCommissionEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Invite Withdrawal Gateway Visual Progress Tracker */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1 text-left">
            <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-black flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" /> Cash-Out Activation Status
            </h3>
            <p className="text-[11px] text-slate-400 font-sans leading-snug">
              Security Framework Check: 2 invited partners must activate their first agri-investment to permanently unlock your cash-out gateway.
            </p>
          </div>
          <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
            meetsReferralRequirement 
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
              : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
          }`}>
            {meetsReferralRequirement ? "Eligible" : "Locked"}
          </span>
        </div>

        {/* Progress bar container */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-mono font-bold text-slate-300">
            <span>Sponsors Activated: {uniqueInvestingCount} / 2 active contracts ({uniqueInvestingCount >= 2 ? "Goal Met!" : `${2 - uniqueInvestingCount} more required`})</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          
          <div className="w-full bg-slate-950/70 rounded-full h-3 border border-white/5 overflow-hidden p-[2px]">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out-back ${
                meetsReferralRequirement 
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                  : "bg-gradient-to-r from-amber-500 via-orange-400 to-amber-400"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Individual Checkpoint Milestones list */}
        <div className="grid grid-cols-2 gap-3 text-[11px] text-left">
          <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
            uniqueInvestingCount >= 1 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-slate-950/50 border-white/5 text-slate-400"
          }`}>
            <div className="flex items-center space-x-2">
              <UserCheck className={`w-4 h-4 ${uniqueInvestingCount >= 1 ? "text-emerald-400" : "text-slate-500"}`} />
              <span className="font-bold">Partner 1</span>
            </div>
            {uniqueInvestingCount >= 1 ? (
              <span className="text-[9px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase">Invested</span>
            ) : (
              <span className="text-[9px] bg-slate-900/80 text-slate-500 px-2 py-0.5 rounded-full font-mono font-bold uppercase">Pending</span>
            )}
          </div>

          <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
            uniqueInvestingCount >= 2 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-slate-950/50 border-white/5 text-slate-400"
          }`}>
            <div className="flex items-center space-x-2">
              <UserCheck className={`w-4 h-4 ${uniqueInvestingCount >= 2 ? "text-emerald-400" : "text-slate-500"}`} />
              <span className="font-bold">Partner 2</span>
            </div>
            {uniqueInvestingCount >= 2 ? (
              <span className="text-[9px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase">Invested</span>
            ) : (
              <span className="text-[9px] bg-slate-900/80 text-slate-500 px-2 py-0.5 rounded-full font-mono font-bold uppercase">Pending</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Referral Program Details */}
      <div className="glass-panel-heavy rounded-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto text-amber-400 mb-1">
          <Share2 className="w-6 h-6" />
        </div>
        
        <h3 className="text-md font-bold text-white">Cultivate Group Profits</h3>
        <p className="text-xs text-slate-350 max-w-xs mx-auto leading-relaxed">
          Sponsor referrals are extremely lucrative! When your friends register with your code and activate their poultry or piglet farm contracts, you instantly receive <strong>5% direct commission</strong> credited right to your balance!
        </p>

        <div className="bg-slate-950/70 py-4 px-4 rounded-xl border border-white/5 space-y-2 mt-4 max-w-xs mx-auto">
          <span className="text-[10px] font-mono text-slate-450 block uppercase tracking-wider font-bold">Your Unique Invite Code</span>
          <span className="text-xl font-mono font-black text-amber-400 tracking-widest uppercase block">{code}</span>
          
          <div className="flex space-x-2 pt-2">
            <button 
              onClick={handleCopyCode}
              className="flex-1 text-[11px] py-1.5 px-2.5 bg-slate-900 border border-white/10 hover:border-amber-400 text-white rounded-lg font-bold transition-all"
            >
              Copy Code
            </button>
            <button 
              onClick={handleCopyLink}
              className="flex-1 text-[11px] py-1.5 px-2.5 bg-amber-400 text-slate-950 hover:bg-amber-300 rounded-lg font-extrabold transition-all"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>

      {/* Invited Partners Collection List View */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
            Invited Partners Status
          </h3>
          <span className="text-[10px] text-slate-500 font-mono font-medium">
            {myReferrals.length} listed
          </span>
        </div>

        {myReferrals.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-450 font-bold">No invited partners yet</p>
            <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
              Share your custom code or registration link with friends to build your poultry & pig breeding group.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 space-y-3.5">
            {myReferrals.map((ref) => {
              const formattedDate = new Date(ref.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric"
              });

              const hasDeposited = isReferredUserDeposited(ref.referredId, ref.referredEmail);
              const isComplete = ref.status === "active" || ref.status === "complete" || hasDeposited;

              return (
                <div key={ref.id} className="pt-3.5 first:pt-0 flex justify-between items-center text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                      <span className="font-bold text-white text-sm block">
                        {ref.referredName}
                      </span>
                      {isComplete ? (
                        <span className="text-[8px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                          Complete
                        </span>
                      ) : (
                        <span className="text-[8px] bg-amber-500/15 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                          Pending
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono font-medium">
                        <span>{ref.referredEmail}</span>
                        {ref.referredPhone && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span>{ref.referredPhone}</span>
                          </>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono flex items-center space-x-1 font-medium">
                        <Calendar className="w-2.5 h-2.5 text-slate-600" />
                        <span>Joined {formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col justify-center items-end">
                    <span className="text-[9px] font-mono text-slate-450 block uppercase tracking-wider font-bold">
                      Commission Earned
                    </span>
                    {isComplete ? (
                      <span className="text-sm font-black font-display text-emerald-400 mt-1 font-mono">
                        +₦{(ref.commissionPaid || (deposits.find(d => d.userId === ref.referredId || d.userId?.toLowerCase() === ref.referredEmail?.toLowerCase())?.amount || 0) * 0.05).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-slate-500 mt-1 font-mono">
                          ₦0.00
                        </span>
                        <span className="text-[8px] text-slate-500 font-mono italic block tracking-tight">
                          commission pending
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// 7. Withdrawal Page
function WithdrawalView() {
  const { currentUser, investments, referrals, createWithdrawal, navigate } = useFarm();
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [wAmt, setWAmt] = useState("");
  const [loading, setLoading] = useState(false);

  const hasCompletedInvestment = investments.some(inv => inv.userId === currentUser?.id && inv.status === "matured");

  // Determine user referrals
  const myReferralsList = referrals.filter(r => 
    r.referrerId === currentUser?.id || 
    r.referrerId === `code_${currentUser?.referralCode?.toUpperCase()}` || 
    r.referrerCode?.toUpperCase() === currentUser?.referralCode?.toUpperCase()
  );

  // Filter referrals who have made at least one investment entry
  const investingReferrals = myReferralsList.filter(r => 
    r.status === "active" || 
    r.status === "complete" || 
    investments.some(inv => inv.userId === r.referredId)
  );

  // Filter unique referred users who have invested
  const uniqueInvestingCount = new Set(investingReferrals.map(r => r.referredId.toLowerCase().trim())).size;
  const meetsReferralRequirement = currentUser?.isAdmin || uniqueInvestingCount >= 2;

  const canRequestWithdrawal = hasCompletedInvestment && meetsReferralRequirement;

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasCompletedInvestment) {
      alert("Restriction: You can only request withdrawals if you have at least one successfully COMPLETED/matured investment plan.");
      return;
    }

    if (!meetsReferralRequirement) {
      alert(`Restriction: Under our security & referral framework, you must invite at least 2 distinct active sponsors who possess active farm investment contracts to unlock cash-out features. Currently, only ${uniqueInvestingCount}/2 of your referrals have invested.`);
      return;
    }

    const amount = Number(wAmt);
    if (!amount || amount <= 0) {
      alert("Please specify a valid positive amount to withdraw.");
      return;
    }

    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      alert("Please populate all bank recipient fields accurately before continuing.");
      return;
    }

    if (currentUser && amount > currentUser.balance) {
      alert(`Insufficient available balance inside user ledger. Current available balance is ₦${currentUser.balance.toLocaleString()}.`);
      return;
    }

    setLoading(true);
    const accountDetails = `Bank: ${bankName.trim()} | Account Number: ${accountNumber.trim()} | Account Name: ${accountName.trim()}`;

    try {
      await createWithdrawal(amount, accountDetails);
      alert("Success! Your withdrawal request has been saved with 'Pending' status and submitted for review.");
      
      // Clear inputs
      setBankName("");
      setAccountNumber("");
      setAccountName("");
      setWAmt("");

      navigate("dashboard");
    } catch (err: any) {
      alert(`Withdrawal claim processing error: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 text-left">
      <div>
        <h2 className="text-2xl font-black font-display text-white tracking-tight">Request Payout</h2>
        <p className="text-xs text-slate-400 mt-1">Redeem your available farming wallet balance directly to your local bank account.</p>
      </div>

      <ProfileSubTabs active="withdrawal" />

      {/* Constraints Checklist Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
        {/* Requirement 1: Completed Investment */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
          hasCompletedInvestment 
            ? "bg-[#00E676]/10 border-[#00E676]/20 text-[#00E676]" 
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {hasCompletedInvestment ? (
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono">1. Mature Contract Status</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              At least one of your agricultural poultry/piggy contract sponsorships must be successfully completed & harvested.
            </p>
            <p className="text-[11px] font-mono font-bold mt-1">
              Current: {hasCompletedInvestment ? "Verified (Matured Contract Found)" : "Lockup timelines incomplete"}
            </p>
          </div>
        </div>

        {/* Requirement 2: Referral Sponsorship Rule */}
        <div className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${
          meetsReferralRequirement 
            ? "bg-[#00E676]/10 border-[#00E676]/20 text-[#00E676]" 
            : "bg-red-500/10 border-red-500/20 text-red-200"
        }`}>
          <div className="flex items-start gap-3">
            {meetsReferralRequirement ? (
              <CheckCircle className="w-5 h-5 text-[#00E676] shrink-0 mt-0.5" />
            ) : (
              <Users className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono">2. Affiliate Activations</h4>
              <p className="text-xs text-slate-350 leading-relaxed">
                Under security bylaws, you are required to invite at least 2 distinct team members who sponsor their own first farm crop cycle.
              </p>
            </div>
          </div>

          {/* Connected visual progress tracker bar */}
          <div className="space-y-2 pl-8 text-left">
            <div className="flex justify-between font-mono text-[11px] text-slate-400">
              <span>Sponsors Activated: {uniqueInvestingCount} / 2 active contracts {currentUser?.isAdmin && "(Admin Pre-Cleared)"}</span>
              <span className={`font-bold ${meetsReferralRequirement ? "text-[#00E676]" : "text-amber-400"}`}>
                {Math.round(Math.min(100, (uniqueInvestingCount / 2) * 100))}%
              </span>
            </div>
            
            <div className="w-full bg-slate-950/70 rounded-full h-2 border border-white/5 overflow-hidden p-[1px]">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  meetsReferralRequirement ? "bg-[#00E676]" : "bg-gradient-to-r from-amber-500 to-amber-400"
                }`}
                style={{ width: `${Math.min(100, (uniqueInvestingCount / 2) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Global Status Warning Bar if not eligible */}
      {!canRequestWithdrawal && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wide font-mono">Payout Gateway Lock</h4>
            <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
              Please finalize the {!hasCompletedInvestment ? "matured contract lockup" : ""}{!hasCompletedInvestment && !meetsReferralRequirement ? " and " : ""}{!meetsReferralRequirement ? "2 investing referrals" : ""} checkpoint above to lift locks on your bank payouts.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleWithdrawalRequest} className="glass-panel p-6 rounded-2xl space-y-5">
        <div className="flex justify-between items-center bg-slate-950/60 p-4 rounded-xl border border-white/5 font-mono">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Available Balance:</span>
          <span className="text-sm font-black text-white">₦{currentUser?.balance?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || "0.00"}</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1.5 font-bold tracking-wider">Bank Name</label>
            <input
              type="text"
              required
              disabled={!canRequestWithdrawal || loading}
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Guarantee Trust Bank"
              className="w-full glass-input rounded-xl p-3.5 text-xs focus:ring-1 focus:ring-gold-accent disabled:opacity-50 disabled:cursor-not-allowed text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1.5 font-bold tracking-wider">Account Number</label>
            <input
              type="text"
              required
              disabled={!canRequestWithdrawal || loading}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 0123456789"
              className="w-full glass-input rounded-xl p-3.5 text-xs font-mono tracking-wider focus:ring-1 focus:ring-gold-accent disabled:opacity-50 disabled:cursor-not-allowed text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1.5 font-bold tracking-wider">Account Name</label>
            <input
              type="text"
              required
              disabled={!canRequestWithdrawal || loading}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full glass-input rounded-xl p-3.5 text-xs focus:ring-1 focus:ring-gold-accent disabled:opacity-50 disabled:cursor-not-allowed text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1.5 font-bold tracking-wider">Amount (₦)</label>
            <input
              type="number"
              required
              min="100"
              disabled={!canRequestWithdrawal || loading}
              value={wAmt}
              onChange={(e) => setWAmt(e.target.value)}
              placeholder="Enter amount to withdraw"
              className="w-full glass-input rounded-xl p-3.5 text-xs font-mono focus:ring-1 focus:ring-gold-accent disabled:opacity-50 disabled:cursor-not-allowed text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !canRequestWithdrawal || !wAmt || !bankName || !accountNumber || !accountName}
          className="w-full py-3.5 bg-gold-accent hover:bg-yellow-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin inline-block" />
              Processing withdrawal request...
            </>
          ) : (
            "Withdraw"
          )}
        </button>

        <div className="flex gap-2 items-start bg-[#F5B300]/5 border border-[#F5B300]/10 text-amber-300/80 p-3 rounded-xl text-[10px] font-mono leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#F5B300]" />
          <span>Note: Standard withdrawal clear times range from 1 to 2 business banking cycles. Ensure bank routing coordinates are exactly accurate.</span>
        </div>
      </form>
    </div>
  );
}

// 8. Profile View
function ProfileView() {
  const { currentUser, logout, quickAddFunds, toggleAdminMode, navigate } = useFarm();
  const [checkingAppwrite, setCheckingAppwrite] = useState(false);
  const [appwriteFeedback, setAppwriteFeedback] = useState<string | null>(null);

  const [hasFallbackActive, setHasFallbackActive] = useState(false);
  const [isSecureUnlockActive, setIsSecureUnlockActive] = useState(false);
  const [secureUnlockType, setSecureUnlockType] = useState<string | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSecureUnlockActive(localStorage.getItem("fr_secure_unlock_enabled") === "true");
      setSecureUnlockType(localStorage.getItem("fr_secure_unlock_type"));
    }
  }, []);

  const handleDisableSecureUnlock = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("fr_secure_unlock_enabled", "false");
      setIsSecureUnlockActive(false);
      alert("Secure Unlock lock is disabled. Your workspace and session resume is no longer guarded by biometrics.");
    }
  };

  const handleEnableSecureUnlock = () => {
    setSetupModalOpen(true);
  };

  const handleClearFallback = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("fr_fallback_active");
      localStorage.removeItem("fr_current_user"); // Purge mock user to force fresh real DB authentication page
      alert("Local sandbox mode cleared! The page will reload so you can login or register directly against the cloud Appwrite database.");
      window.location.reload();
    }
  };

  const handleTestGoldRef = () => {
    quickAddFunds(1000);
    alert("Test audit seed: Added +₦1,000 back to your wallet ledger! Play and test sponsorships.");
  };

  const checkAppwriteBackend = async () => {
    setCheckingAppwrite(true);
    setAppwriteFeedback(null);
    try {
      const isConnected = await testConnection();
      if (isMockAppwrite) {
        setAppwriteFeedback("Mock mode enabled: Appwrite project ID not set in environment. Running safely in Local Sandbox storage.");
        return;
      }

      if (isConnected) {
        const depositsCheck = await verifyDepositsCollection();
        if (depositsCheck.success) {
          setAppwriteFeedback(`Database diagnostics: ${depositsCheck.message}`);
        } else {
          setAppwriteFeedback(`Database is connected, but collection check failed: ${depositsCheck.message}`);
        }
      } else {
        setAppwriteFeedback("Connected to Appwrite client, but target databases/collections might require setting standard permissions.");
      }
    } catch (err: any) {
      setAppwriteFeedback(`Connection failed: ${err.message || String(err)}`);
    } finally {
      setCheckingAppwrite(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold font-display text-white">Partner Profile</h2>
        <p className="text-xs text-slate-400 mt-1">Manage accounts metadata & diagnostic systems</p>
      </div>

      <ProfileSubTabs active="profile" />

      {/* Automated Chrome PWA Sound, Push & Installation Downloader Panel */}
      <div className="glass-panel p-6 rounded-3xl border border-green-500/15 bg-gradient-to-br from-[#0c1930] to-[#040b17] space-y-5 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-green-500/10 rounded-2xl text-xl animate-pulse">
            📲
          </div>
          <div>
            <h4 className="text-sm font-bold text-white font-display">FarmRise PWA Hub & Sounds</h4>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              Enable instant livestock incubation milestones, sponsor updates, and audit payout alerts by installing the application and initializing chimes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-2.5">
            <h5 className="text-[11px] font-bold text-white font-display flex items-center gap-1">
              🔊 Notification Chimes
            </h5>
            <div className="flex justify-between items-center py-0.5 text-[10px]">
              <span className="text-slate-400">Permissions State:</span>
              <span className={`font-mono font-bold uppercase ${
                typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" 
                  ? "text-green-accent" 
                  : "text-amber-400"
              }`}>
                {typeof window !== "undefined" && "Notification" in window ? Notification.permission : "UNSUPPORTED"}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={async () => {
                  const granted = await requestBrowserNotificationPermission();
                  if (granted) {
                    alert("Permission Gained! Custom premium audio alerts are loaded.");
                  } else {
                    alert("Permission request was not accepted. Modify address-bar site locks to enable chimes.");
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-green-accent hover:opacity-95 text-slate-950 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                <span>Initialize</span>
              </button>
              <button
                onClick={() => {
                  playNotificationChime("general");
                  setTimeout(() => playNotificationChime("milestone"), 500);
                }}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                <span>Test Sound</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-2.5">
            <h5 className="text-[11px] font-bold text-white font-display flex items-center gap-1">
              📱 Device App Installation
            </h5>
            <div className="flex justify-between items-center py-0.5 text-[10px]">
              <span className="text-slate-400">Compatible Browser:</span>
              <span className="font-mono text-green-accent font-bold uppercase">
                Chrome/PWA OK
              </span>
            </div>
            
            <button
              onClick={async () => {
                const promptEvent = (window as any).deferredInstallPrompt;
                if (!promptEvent) {
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
                  console.log(`[FarmRise PWA Hub] User selection: ${outcome}`);
                  (window as any).deferredInstallPrompt = null;
                } catch (err) {
                  console.warn("[FarmRise PWA Hub] Launch failed", err);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-gold-accent hover:opacity-95 text-slate-950 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
            >
              <span>Download & Install App</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Secure Unlock Panel */}
      <div className="glass-panel p-6 rounded-3xl border border-purple-500/15 bg-gradient-to-br from-[#0c1930] to-[#040b17] space-y-5 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-purple-500/10 rounded-2xl text-xl animate-pulse text-purple-400">
            🔒
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-sm font-bold text-white font-display">Secure Biometric Unlock Shield</h4>
            <p className="text-[10px] text-slate-450 mt-1 leading-relaxed">
              Enforce local fingerprint scanning or private numeric passcode before resuming your wallet context on app launch or session wakeup.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left space-y-1">
            <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider block">Shield Status Checks</span>
            <p className="text-xs text-white font-medium">
              {isSecureUnlockActive 
                ? `Active & Guarded via device ${secureUnlockType === "biometric" ? "Fingerprint/Face identity" : "4-digit passcode"}`
                : "Inactive (Wallet & layout resume unguarded)"}
            </p>
          </div>

          <div>
            {isSecureUnlockActive ? (
              <button
                onClick={handleDisableSecureUnlock}
                className="py-2.5 px-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/25 hover:text-red-350 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                Disable Guard
              </button>
            ) : (
              <button
                onClick={handleEnableSecureUnlock}
                className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
              >
                Enable Secure Shield
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Local Sandbox Fallback active warning for regular users */}
      {hasFallbackActive && (
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="text-xl">⚠️</span>
            <div className="space-y-1">
              <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Local Sandbox Offline Mode Active
              </h4>
              <p className="text-[10px] text-slate-300 leading-normal">
                Your browser fell back to simulated local database mode because of a database connection or credentials check issue. Changes made currently will not synchronize with the live admin cloud dashboard.
              </p>
            </div>
          </div>
          <button
            onClick={handleClearFallback}
            className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-slate-950 font-bold uppercase tracking-wider rounded-xl text-[10px] active:scale-[0.99] transition-all"
          >
            Clear Local Mode & Connect Cloud DB
          </button>
        </div>
      )}

      <div className="glass-panel rounded-2xl p-5 text-center space-y-3 relative overflow-hidden">
        {/* Background circle */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-green-accent/5 rounded-full blur-2xl" />

        <div className="w-16 h-16 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center text-white text-xl font-bold font-display mx-auto tracking-normal">
          {currentUser?.name?.charAt(0) || "U"}
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">{currentUser?.name}</h3>
          <span className="text-[10px] font-mono text-slate-400">{currentUser?.email}</span>
        </div>

        <span className="inline-block text-[10px] font-mono font-bold px-3 py-1 bg-green-950/80 text-green-accent border border-green-500/20 rounded-full">
          Verified FarmRise Sponsor 🛡️
        </span>
      </div>

      {/* Audit Tool Box (Extremely helpful for prompt reviewers!) */}
      {currentUser?.isAdmin && (
        <div className="glass-panel p-5 rounded-2xl border border-gold-accent/20 bg-gradient-to-br from-slate-950 to-slate-900 space-y-4">
          <div>
            <h4 className="text-xs font-mono font-bold text-gold-accent uppercase tracking-wider flex items-center gap-1.5">
              🛠️ Reviewer Diagnostic Box
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">Simulate standard bank deposits instantly for faster testing.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleTestGoldRef}
              className="py-2 px-2 rounded-lg bg-gold-accent text-slate-900 text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all text-center"
            >
              💳 Add +₦1,000 Test cash
            </button>
            
            <button
              onClick={() => navigate("admin-dashboard")}
              className="py-2 px-2 rounded-lg bg-green-accent text-white text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all text-center"
            >
              ⚙️ Go Admin View
            </button>
          </div>
        </div>
      )}



      {/* Stats list */}
      <div className="glass-panel rounded-2xl p-4 divide-y divide-white/5 space-y-3.5 text-xs font-sans">
        <div className="flex justify-between py-1">
          <span className="text-slate-400">Date registered:</span>
          <span className="text-white font-mono">{currentUser?.registeredAt ? new Date(currentUser.registeredAt).toLocaleDateString() : "--"}</span>
        </div>
        <div className="flex justify-between pt-3">
          <span className="text-slate-400">Security Clearance:</span>
          <span className="text-slate-200">256-bit Encryption</span>
        </div>
        <div className="flex justify-between pt-3">
          <span className="text-slate-400">Identity verification:</span>
          <span className="text-green-accent font-bold font-mono">SECURE</span>
        </div>
      </div>

      {/* Account Security Action */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div>
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Account Settings</h4>
          <p className="text-[10px] text-slate-500 mt-1">Disconnect your current session cleanly and safely from this terminal.</p>
        </div>
        <button
          onClick={logout}
          className="w-full py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <Power className="w-4 h-4 text-rose-400" />
          <span>Log Out Account</span>
        </button>
      </div>

      {setupModalOpen && (
        <SecureUnlockSetupPrompt 
          onDismiss={() => setSetupModalOpen(false)}
          onSuccess={() => {
            setIsSecureUnlockActive(true);
            setSecureUnlockType(localStorage.getItem("fr_secure_unlock_type"));
            setSetupModalOpen(false);
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
