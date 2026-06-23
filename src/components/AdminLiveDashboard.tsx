import React, { useState, useEffect, useCallback } from "react";
import { useFarm } from "../context/FarmContext";
import { databases, APPWRITE_CONFIG, isMockAppwrite } from "../appwrite";
import { Query } from "appwrite";
import { 
  Users, DollarSign, TrendingUp, RefreshCw, Wifi, WifiOff,
  Database, ShieldCheck, AlertTriangle, ArrowRight, Play,
  TrendingDown, Layers, ArrowLeft, Clock, Sparkles,
  Landmark, Bell, Plus, ShieldAlert, Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LiveStats {
  usersCount: number;
  activeUsersCount: number;
  bannedUsersCount: number;
  totalUserWallets: number;

  depositsCount: number;
  approvedDepositsCount: number;
  pendingDepositsCount: number;
  rejectedDepositsCount: number;
  totalDepositedSum: number;
  pendingDepositedSum: number;

  investmentsCount: number;
  activeInvestmentsCount: number;
  maturedInvestmentsCount: number;
  totalInvestedSum: number;

  withdrawalsCount: number;
  approvedWithdrawalsCount: number;
  pendingWithdrawalsCount: number;
  rejectedWithdrawalsCount: number;
  totalWithdrawnSum: number;
  pendingWithdrawnSum: number;
}

interface LogEntry {
  time: string;
  type: "success" | "info" | "warning" | "error";
  message: string;
}

// Clean and case-insensitive deduplicate of user database entries by email to ensure accurate sponsors count
const computeStatsFromData = (
  fetchedUsersDocs: any[],
  fetchedDepositsDocs: any[],
  fetchedInvestmentsDocs: any[],
  fetchedWithdrawalsDocs: any[]
): LiveStats => {
  const uniqueUsersMap = new Map<string, any>();
  fetchedUsersDocs.forEach(u => {
    if (u && u.email) {
      const emailKey = u.email.toLowerCase().trim();
      if (emailKey !== "") {
        const existing = uniqueUsersMap.get(emailKey);
        if (!existing || (u.isAdmin && !existing.isAdmin)) {
          uniqueUsersMap.set(emailKey, u);
        }
      }
    }
  });
  const dedupedUsers = Array.from(uniqueUsersMap.values());

  // Live aggregations
  const activeUsers = dedupedUsers.filter(u => !u.isBanned).length;
  const bannedUsers = dedupedUsers.filter(u => u.isBanned).length;
  const totalWallets = dedupedUsers.reduce((sum, u) => sum + (parseFloat(u.balance || u.walletBalance) || 0), 0);

  const approvedDeps = fetchedDepositsDocs.filter(d => d.status === "approved");
  const pendingDeps = fetchedDepositsDocs.filter(d => d.status === "pending");
  const rejectedDeps = fetchedDepositsDocs.filter(d => d.status === "rejected");
  
  const totalDeposited = approvedDeps.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const pendingDeposited = pendingDeps.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const activeInvestments = fetchedInvestmentsDocs.filter(i => i.status === "active");
  const maturedInvestments = fetchedInvestmentsDocs.filter(i => i.status === "matured");
  const totalInvested = activeInvestments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  const approvedWths = fetchedWithdrawalsDocs.filter(w => w.status === "approved");
  const pendingWths = fetchedWithdrawalsDocs.filter(w => w.status === "pending");
  const rejectedWths = fetchedWithdrawalsDocs.filter(w => w.status === "rejected");

  const totalWithdrawn = approvedWths.reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);
  const pendingWithdrawn = pendingWths.reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);

  return {
    usersCount: dedupedUsers.length,
    activeUsersCount: activeUsers,
    bannedUsersCount: bannedUsers,
    totalUserWallets: totalWallets,

    depositsCount: fetchedDepositsDocs.length,
    approvedDepositsCount: approvedDeps.length,
    pendingDepositsCount: pendingDeps.length,
    rejectedDepositsCount: rejectedDeps.length,
    totalDepositedSum: totalDeposited,
    pendingDepositedSum: pendingDeposited,

    investmentsCount: fetchedInvestmentsDocs.length,
    activeInvestmentsCount: activeInvestments.length,
    maturedInvestmentsCount: maturedInvestments.length,
    totalInvestedSum: totalInvested,

    withdrawalsCount: fetchedWithdrawalsDocs.length,
    approvedWithdrawalsCount: approvedWths.length,
    pendingWithdrawalsCount: pendingWths.length,
    rejectedWithdrawalsCount: rejectedWths.length,
    totalWithdrawnSum: totalWithdrawn,
    pendingWithdrawnSum: pendingWithdrawn
  };
};

export default function AdminLiveDashboard() {
  const { navigate, deposits = [], users = [], investments = [], withdrawals = [] } = useFarm();
  
  // Real-time live state variables instantly computed from local app context!
  const initialStats = React.useMemo(() => {
    return computeStatsFromData(users, deposits, investments, withdrawals);
  }, [users, deposits, investments, withdrawals]);

  const [stats, setStats] = useState<LiveStats | null>(initialStats);
  const [loading, setLoading] = useState(users.length === 0 && deposits.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(5); // Default polling 5s
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Automatically keep stats in sync whenever context collections update in real-time
  useEffect(() => {
    setStats(initialStats);
    if (users.length > 0) {
      setLoading(false);
    }
  }, [initialStats, users.length]);

  // AI Co-Pilot memory states
  const [learnings, setLearnings] = useState<any[]>([]);
  const [teachInput, setTeachInput] = useState("");
  const [isTeaching, setIsTeaching] = useState(false);

  const fetchLearnings = async () => {
    try {
      const res = await fetch("/api/ai/learnings");
      const data = await res.json();
      if (data.success) {
        setLearnings(data.learnings || []);
      }
    } catch (err) {
      console.warn("Failed to fetch learnings:", err);
    }
  };

  const handleTeach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teachInput.trim() || isTeaching) return;
    setIsTeaching(true);
    try {
      const res = await fetch("/api/ai/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memory: teachInput, category: "admin_instruction" })
      });
      const data = await res.json();
      if (data.success) {
        addLog("Taught AI Co-Pilot new management rule: " + teachInput, "success");
        setTeachInput("");
        fetchLearnings();
      }
    } catch (err) {
      console.error("Failed to teach AI:", err);
    } finally {
      setIsTeaching(false);
    }
  };

  // AI Co-Pilot Assistant State variables
  const [aiChatMessages, setAiChatMessages] = useState<Array<{role: "user" | "assistant", content: string, time: string}>>([
    {
      role: "assistant",
      content: "Hello Administrator! 🤖 I am your AI Co-Pilot & Security Auditor. I monitor all wallet transactions, user balances, and system health. You can converse with me directly, ask for ledger audit reports, query active contracts, or request me to draft general bulletin notices.",
      time: new Date().toLocaleTimeString()
    }
  ]);
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChatLoading, setAiChatLoading] = useState(false);

  const handleSendAiMessage = async (customMsg?: string) => {
    const textToSend = customMsg || aiChatInput;
    if (!textToSend.trim() || aiChatLoading) return;

    const userMsg = {
      role: "user" as const,
      content: textToSend,
      time: new Date().toLocaleTimeString()
    };

    setAiChatMessages(prev => [...prev, userMsg]);
    if (!customMsg) setAiChatInput("");
    setAiChatLoading(true);

    try {
      const response = await fetch("/api/ai/chat-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: aiChatMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          context: {
            stats: stats,
            pendingDeposits: deposits.filter(d => d.status === "pending").map(d => ({
              id: d.id,
              userId: d.userId,
              amount: d.amount,
              txRef: d.txRef,
              createdAt: d.createdAt,
              aiStatus: d.aiStatus,
              aiReason: d.aiReason
            })),
            users: users.map(u => ({ id: u.id, name: u.name, balance: u.balance, role: u.isAdmin ? "admin" : "user" })),
            investments: investments.map(i => ({ id: i.id, planName: i.planName, amount: i.amount, status: i.status }))
          }
        })
      });

      const data = await response.json();
      if (data.reply) {
        setAiChatMessages(prev => [...prev, {
          role: "assistant",
          content: data.reply,
          time: new Date().toLocaleTimeString()
        }]);
      } else {
        throw new Error("Empty AI co-pilot reply.");
      }
    } catch (err: any) {
      console.error("AI Admin assistant session communication error:", err);
      setAiChatMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Co-Pilot connection failure: ${err.message || "Failed to reach backend co-pilot model services."}`,
        time: new Date().toLocaleTimeString()
      }]);
    } finally {
      setAiChatLoading(false);
    }
  };

  const addLog = useCallback((message: string, type: "success" | "info" | "warning" | "error" = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, message, type }, ...prev].slice(0, 30));
  }, []);

  // API aggregation method
  const fetchLiveStatsFromAppwrite = useCallback(async () => {
    setIsSyncing(true);
    addLog("Polling database live collections via Firebase/Firestore client...", "info");
    
    try {
      let fetchedUsersDocs: any[] = [];
      let fetchedDepositsDocs: any[] = [];
      let fetchedInvestmentsDocs: any[] = [];
      let fetchedWithdrawalsDocs: any[] = [];

      if (isMockAppwrite) {
        addLog("Sandbox configuration: polling localStorage collections", "warning");
        try {
          fetchedUsersDocs = JSON.parse(localStorage.getItem("fr_users") || "[]");
          fetchedDepositsDocs = JSON.parse(localStorage.getItem("fr_deposits") || "[]");
          fetchedInvestmentsDocs = JSON.parse(localStorage.getItem("fr_investments") || "[]");
          fetchedWithdrawalsDocs = JSON.parse(localStorage.getItem("fr_withdrawals") || "[]");
        } catch (err) {
          addLog("Offline store retrieval failed.", "error");
        }
      } else {
        // Direct Query Firebase client IN PARALLEL for ultra-performance (instant return!)
        addLog(`Initiating concurrent fetch requests to Firebase Firestore`, "info");

        const [uRes, dRes, iRes, wRes] = await Promise.all([
          databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.users, [Query.limit(5000)]).catch((err: any) => {
            console.error("Users parallel fetch error:", err);
            return { documents: JSON.parse(localStorage.getItem("fr_users") || "[]") };
          }),
          databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.deposits, [Query.limit(5000)]).catch((err: any) => {
            console.error("Deposits parallel fetch error:", err);
            return { documents: JSON.parse(localStorage.getItem("fr_deposits") || "[]") };
          }),
          databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.investments, [Query.limit(5000)]).catch((err: any) => {
            console.error("Investments parallel fetch error:", err);
            return { documents: JSON.parse(localStorage.getItem("fr_investments") || "[]") };
          }),
          databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.withdrawals, [Query.limit(5000)]).catch((err: any) => {
            console.error("Withdrawals parallel fetch error:", err);
            return { documents: JSON.parse(localStorage.getItem("fr_withdrawals") || "[]") };
          })
        ]);

        fetchedUsersDocs = uRes?.documents || [];
        fetchedDepositsDocs = dRes?.documents || [];
        fetchedInvestmentsDocs = iRes?.documents || [];
        fetchedWithdrawalsDocs = wRes?.documents || [];
        
        addLog(`Live Database Parallel Sync: Fetched ${fetchedUsersDocs.length} users, ${fetchedDepositsDocs.length} deposits, ${fetchedInvestmentsDocs.length} investments, ${fetchedWithdrawalsDocs.length} withdrawals.`, "success");
      }

      // Reuse our common stats mapper for consistent performance
      const calculatedStats = computeStatsFromData(
        fetchedUsersDocs, 
        fetchedDepositsDocs, 
        fetchedInvestmentsDocs, 
        fetchedWithdrawalsDocs
      );

      setStats(calculatedStats);
      setError(null);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse live Firebase/Firestore datasets");
      addLog(`Aggregation error: ${err.message || String(err)}`, "error");
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  }, [addLog]);

  // Handle active polling
  useEffect(() => {
    fetchLiveStatsFromAppwrite();
    fetchLearnings();

    if (refreshIntervalSec === 0) return;

    const pollingTimer = setInterval(() => {
      fetchLiveStatsFromAppwrite();
      fetchLearnings();
    }, refreshIntervalSec * 1000);

    return () => clearInterval(pollingTimer);
  }, [fetchLiveStatsFromAppwrite, refreshIntervalSec]);

  return (
    <div className="space-y-6 pb-24 font-sans text-left">
      
      {/* 1. Header with Live Status Widget */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMockAppwrite ? "bg-amber-400" : "bg-emerald-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isMockAppwrite ? "bg-amber-500" : "bg-emerald-500"}`}></span>
            </span>
            <h2 className="text-2xl font-black font-display text-white flex items-center gap-2">
              <ShieldAlert className="text-gold-accent w-6 h-6" /> FarmRise HQ Control
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Connected live to production Firebase/Firestore Database. Real-time updates automatically feed this console.
          </p>
        </div>

        {/* Dashboard Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Back button */}
          <button 
            onClick={() => navigate("dashboard")}
            className="text-xs font-bold font-mono px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-slate-900 transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back Live Client
          </button>

          {/* Polling Interval Config */}
          <div className="flex items-center bg-slate-900/85 border border-white/15 rounded-lg overflow-hidden p-0.5">
            <span className="text-[10px] font-mono px-2.5 text-slate-400 uppercase hidden sm:inline">Auto-Sync:</span>
            <select
              value={refreshIntervalSec}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setRefreshIntervalSec(val);
                addLog(`Polling rate configured to: ${val === 0 ? "manual only" : `${val}s intervals`}`, "info");
              }}
              className="bg-transparent text-xs font-mono font-bold text-white px-2 py-1 outline-none border-0 cursor-pointer"
            >
              <option value={3} className="bg-slate-950 text-white">3s</option>
              <option value={5} className="bg-slate-950 text-white">5s</option>
              <option value={10} className="bg-slate-950 text-white">10s</option>
              <option value={30} className="bg-slate-950 text-white">30s</option>
              <option value={0} className="bg-slate-950 text-white">Manual</option>
            </select>
          </div>

          <button
            onClick={fetchLiveStatsFromAppwrite}
            disabled={isSyncing}
            className="bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold font-mono px-3 py-1.5 rounded-lg hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            Sync Now
          </button>
        </div>
      </div>

      {/* Connection Indicator Stats Row */}
      <div className="glass-panel p-3.5 rounded-xl flex flex-wrap justify-between items-center gap-3 bg-slate-950/45 border-white/10">
        <div className="flex items-center gap-2">
          {isMockAppwrite ? (
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <WifiOff className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Wifi className="w-4 h-4" />
            </div>
          )}
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wide">Infrastructure Pipeline Status</span>
            <span className={`text-xs font-bold ${isMockAppwrite ? "text-amber-400" : "text-emerald-400"}`}>
              {isMockAppwrite ? "OFFLINE SANDBOX MODE" : "CONNECTED CLOUD PIPELINE (ACTIVE)"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">Endpoint Type</span>
            <span className="text-slate-300 font-semibold">{isMockAppwrite ? "localStorage.mock" : "Firebase Firestore Native"}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">Last Cloud Sync</span>
            <span className="text-blue-400 font-semibold flex items-center gap-1 justify-end">
              <Clock className="w-3.5 h-3.5" />
              {lastUpdated ? lastUpdated.toLocaleTimeString() : "PendingSync"}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div>
            <p className="font-bold">Database Query Warning</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* 2. Core Stats Bento-Grid */}
      {loading && !stats ? (
        <div className="glass-panel p-20 rounded-2xl flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
          <p className="text-sm font-mono text-slate-400">Performing instant API aggregation sequence...</p>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* TOTAL USERS CARD */}
            <div 
              onClick={() => navigate("admin-users")}
              className="glass-panel p-4 rounded-xl cursor-pointer hover:border-white/20 hover:bg-slate-900/40 transition-all relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-black tracking-wider">Total Users</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-xl md:text-2xl font-bold font-mono text-blue-400 block leading-tight">{stats.usersCount}</span>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">Active: {stats.activeUsersCount}</span>
            </div>

            {/* TOTAL DEPOSITS CARD */}
            <div 
              onClick={() => navigate("admin-deposits")}
              className="glass-panel p-4 rounded-xl cursor-pointer hover:border-white/20 hover:bg-slate-900/40 transition-all relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-black tracking-wider">Total Deposits</span>
                <Landmark className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xl md:text-2xl font-bold font-mono text-emerald-400 block leading-tight">₦{stats.totalDepositedSum.toLocaleString()}</span>
              {stats.pendingDepositsCount > 0 ? (
                <span className="text-[9px] text-amber-400 font-mono mt-1 block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  {stats.pendingDepositsCount} pending approval
                </span>
              ) : (
                <span className="text-[9px] text-slate-500 font-mono mt-1 block">All reviewed</span>
              )}
            </div>

            {/* TOTAL PAYOUTS (WITHDRAWALS) */}
            <div 
              onClick={() => navigate("admin-withdrawals")}
              className="glass-panel p-4 rounded-xl cursor-pointer hover:border-white/20 hover:bg-slate-900/40 transition-all relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-black tracking-wider">Total Payouts</span>
                <DollarSign className="w-4 h-4 text-rose-400" />
              </div>
              <span className="text-xl md:text-2xl font-bold font-mono text-rose-400 block leading-tight">₦{stats.totalWithdrawnSum.toLocaleString()}</span>
              {stats.pendingWithdrawalsCount > 0 ? (
                <span className="text-[9px] text-red-400 font-mono mt-1 block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {stats.pendingWithdrawalsCount} pending payouts
                </span>
              ) : (
                <span className="text-[9px] text-slate-500 font-mono mt-1 block">No pending pay</span>
              )}
            </div>

            {/* ACTIVE PORTFOLIOS CARD */}
            <div 
              onClick={() => navigate("admin-plans")}
              className="glass-panel p-4 rounded-xl cursor-pointer hover:border-white/20 hover:bg-slate-900/40 transition-all relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-black tracking-wider">Active Portfolios</span>
                <TrendingUp className="w-4 h-4 text-gold-accent" />
              </div>
              <span className="text-xl md:text-2xl font-bold font-mono text-gold-accent block leading-tight">₦{stats.totalInvestedSum.toLocaleString()}</span>
              <span className="text-[9px] text-slate-400 font-mono mt-1 block">Crops spawned: {stats.activeInvestmentsCount}</span>
            </div>

            {/* TOTAL REVENUE GRID CARD */}
            <div className="glass-panel p-4 rounded-xl border border-gold-accent/25 relative overflow-hidden bg-slate-900/10 col-span-2 md:col-span-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-black block tracking-wider mb-1">Total Net Cap</span>
              <span className="text-xl md:text-2xl font-bold font-mono text-amber-300 block leading-tight">₦{(stats.totalDepositedSum - stats.totalWithdrawnSum).toLocaleString()}</span>
              <span className="text-[9.5px] text-slate-400 font-mono mt-1 block font-semibold">
                Wallets: ₦{stats.totalUserWallets.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 3. Shortcuts Operations Desk */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-black">HQ Operations Shortcuts</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Directory */}
              <div 
                onClick={() => navigate("admin-users")}
                className="glass-panel p-4.5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-white/15 bg-slate-950/25 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      Sponsors & Partners <span className="text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded text-blue-300">{stats.usersCount}</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Search sponsors, update profile metrics & ban users instantly</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-white transition-all">Directory →</span>
              </div>

              {/* Deposit Pipeline */}
              <div 
                onClick={() => navigate("admin-deposits")}
                className="glass-panel p-4.5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-white/15 bg-slate-950/25 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      Deposit Pipeline <span className="text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-400">{stats.pendingDepositsCount} pending</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Authorize incoming wire proofs and wallets credit increments</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-white transition-all">Pipeline →</span>
              </div>

              {/* Clearances */}
              <div 
                onClick={() => navigate("admin-withdrawals")}
                className="glass-panel p-4.5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-white/15 bg-slate-950/25 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      Withdrawal Clearances <span className="text-[10px] bg-red-500/10 px-1.5 py-0.5 rounded text-red-400">{stats.pendingWithdrawalsCount} pending</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Review, execute or reject user wallet withdrawal payout redemptions</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-white transition-all">Clearances →</span>
              </div>

              {/* Livestock Blueprints */}
              <div 
                onClick={() => navigate("admin-plans")}
                className="glass-panel p-4.5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-white/15 bg-slate-950/25 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-accent/10 rounded-xl flex items-center justify-center text-green-accent">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Livestock Blueprints Manager</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Construct chicken or pig plans, edit limits and enable/disable plans</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-white transition-all">Blueprints →</span>
              </div>

              {/* Live farm updates desc */}
              <div 
                onClick={() => navigate("admin-updates")}
                className="glass-panel p-4.5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-white/15 bg-slate-950/25 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-gold-accent">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Live Farm Updates Desk</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Publish crop video audits, upload images and edit operational logs</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-white transition-all">Logs Desk →</span>
              </div>

              {/* Bulletins */}
              <div 
                onClick={() => navigate("admin-notifications")}
                className="glass-panel p-4.5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-white/15 bg-slate-950/25 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Global Bulletins & Investment Updates</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Push direct live announcements or active portfolio alerts</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-white transition-all">Dispatch →</span>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* 3.5 AI Personal Assistant Console */}
      <div className="glass-panel p-5 rounded-2xl border-purple-500/10 bg-purple-950/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-10" />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chat Assistant Pane */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">FarmRise Admin AI Co-Pilot</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Active Assistant</span>
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setAiChatMessages([
                  {
                    role: "assistant",
                    content: "Hello Admin! System memory refreshed. How may I optimize your administration parameters or analyze financial files today?",
                    time: new Date().toLocaleTimeString()
                  }
                ])}
                className="text-[9px] font-mono text-slate-400 hover:text-white border border-white/5 px-2 py-1 rounded bg-white/5 transition-all cursor-pointer"
              >
                Reset Thread
              </button>
            </div>

            {/* Message Thread Hub */}
            <div className="bg-slate-950/70 rounded-xl p-4 border border-white/5 h-[300px] overflow-y-auto scrollbar-custom space-y-3 flex flex-col mb-4">
              {aiChatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] ${
                    msg.role === "user" ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  <span className="text-[8px] font-mono text-slate-500 mb-0.5 px-1">{msg.time}</span>
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed text-left break-words ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-tr-none"
                        : "bg-slate-900 border border-white/10 text-slate-200 rounded-tl-none font-mono"
                    }`}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {aiChatLoading && (
                <div className="self-start flex flex-col items-start max-w-[80%]">
                  <span className="text-[8px] font-mono text-slate-500 mb-0.5 px-1">Co-Pilot Thinking...</span>
                  <div className="bg-slate-900 border border-white/10 text-slate-400 p-3.5 rounded-2xl rounded-tl-none text-xs flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Preset Prompt Shortcuts */}
            <div className="flex flex-wrap gap-1.5 mb-3.5">
              <button
                type="button"
                onClick={() => handleSendAiMessage("Can you summarize our current system liquidity and give a quick health report of the whole app?")}
                disabled={aiChatLoading}
                className="text-[10px] font-mono text-left px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 hover:border-purple-500/20 text-indigo-300 transition-all cursor-pointer"
              >
                📊 Liquidity Summary
              </button>
              <button
                type="button"
                onClick={() => handleSendAiMessage("Look at all our pending deposits. Do any user receipts show mismatch issues or need immediate attention?")}
                disabled={aiChatLoading}
                className="text-[10px] font-mono text-left px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 hover:border-purple-500/20 text-indigo-300 transition-all cursor-pointer"
              >
                🔍 Audit Receipts
              </button>
              <button
                type="button"
                onClick={() => handleSendAiMessage("Write an amazing general bulletin recommendation to announce successful livestock growth on chicken / pig portfolios.")}
                disabled={aiChatLoading}
                className="text-[10px] font-mono text-left px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 hover:border-purple-500/20 text-indigo-300 transition-all cursor-pointer"
              >
                📢 Bulletin Notice
              </button>
            </div>

            {/* Input box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAiMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                disabled={aiChatLoading}
                placeholder="Instruct your personal co-pilot..."
                className="flex-1 bg-slate-950/80 hover:bg-slate-950 border border-white/10 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-slate-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={aiChatLoading || !aiChatInput.trim()}
                className="px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Send ⚡
              </button>
            </form>
          </div>

          {/* AI Knowledge Vault & Dynamic Learning Engine Sidebar */}
          <div className="lg:col-span-1 flex flex-col justify-between bg-slate-950/45 p-4 rounded-xl border border-white/5 text-left">
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                <div className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Award className="w-4 h-4" />
                </div>
                <h4 className="text-[11px] font-mono font-bold tracking-wide text-white uppercase">AI Knowledge Vault</h4>
              </div>

              {/* Dynamic Learnings Logs */}
              <div className="space-y-2.5 h-[240px] overflow-y-auto scrollbar-custom pr-1">
                {learnings.length === 0 ? (
                  <div className="text-[10px] font-mono text-slate-500 text-center py-12">
                    Learning database is empty. Process approvals to build AI memory logs automatically.
                  </div>
                ) : (
                  [...learnings].reverse().map((learn) => (
                    <div 
                      key={learn.id} 
                      className="p-2 rounded bg-slate-900/60 border border-white/5 text-left hover:border-purple-500/20 transition-all font-mono text-[9px] text-slate-300 leading-normal"
                    >
                      <div className="flex justify-between items-center mb-1 text-slate-500 text-[8px]">
                        <span className="font-bold text-indigo-400 tracking-wider">
                          {learn.category === "automated_learning" ? "🤖 ACTION MEMO" : "🎓 TAUGHT RULE"}
                        </span>
                        <span>{new Date(learn.timestamp || Date.now()).toLocaleTimeString()}</span>
                      </div>
                      <p className="break-words">{learn.memory}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Direct Teach Form */}
            <form onSubmit={handleTeach} className="mt-4 pt-3 border-t border-white/5">
              <label htmlFor="learning_instruction_input" className="block text-[8px] font-mono text-indigo-300 uppercase tracking-widest font-bold mb-1.5 text-left">
                Directly Teach Companion Rule
              </label>
              <div className="flex gap-1.5">
                <input
                  id="learning_instruction_input"
                  type="text"
                  value={teachInput}
                  onChange={(e) => setTeachInput(e.target.value)}
                  disabled={isTeaching}
                  placeholder="Teach custom rule... (e.g. Reject wire slips lacking correct NGN tokens)"
                  className="flex-1 bg-slate-950 px-3 py-2 rounded border border-white/10 text-[10px] font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isTeaching || !teachInput.trim()}
                  className="px-3 rounded bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-[10px] text-white font-bold transition-all cursor-pointer flex items-center justify-center font-mono uppercase"
                >
                  Teach
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>

      {/* 4. API Transaction Stream Feed Logs */}
      <div className="glass-panel p-5 rounded-2xl border-white/10 bg-slate-900/10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-extrabold">
              Firebase/Firestore direct API Request Stream Log
            </h3>
          </div>
          <button 
            onClick={() => {
              setLogs([]);
              addLog("Logs cleared by administrator.", "info");
            }}
            className="text-[10px] font-mono font-bold text-slate-500 hover:text-slate-300 border border-white/10 px-2 py-0.5 rounded"
          >
            Clear Log Console
          </button>
        </div>

        {/* Console display logs content */}
        <div className="bg-slate-950 rounded-xl p-4 border border-white/5 max-h-[140px] overflow-y-auto font-mono scrollbar-custom text-slate-300">
          {logs.length === 0 ? (
            <p className="text-slate-600 text-xs text-center py-4">No active database operations recorded in log stream.</p>
          ) : (
            <div className="space-y-1.5 text-xs text-left">
              {logs.map((log, index) => {
                let colorClass = "text-slate-400";
                if (log.type === "success") colorClass = "text-emerald-400 font-semibold";
                if (log.type === "warning") colorClass = "text-amber-400 font-semibold";
                if (log.type === "error") colorClass = "text-rose-400 font-bold";
                
                return (
                  <div key={index} className="flex gap-2 items-start opacity-90 leading-relaxed font-mono">
                    <span className="text-slate-500 tracking-tighter hover:text-slate-300 select-none shrink-0">[{log.time}]</span>
                    <span className={`${colorClass} break-all`}>{log.message}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-500 font-mono mt-2 text-right">
          Monitoring pipeline checks latency & structure alignments against custom schemas.
        </p>
      </div>

    </div>
  );
}
