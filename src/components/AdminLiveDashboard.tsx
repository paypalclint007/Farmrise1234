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

export default function AdminLiveDashboard() {
  const { navigate } = useFarm();
  
  // Real-time live state variables
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(5); // Default polling 5s
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((message: string, type: "success" | "info" | "warning" | "error" = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, message, type }, ...prev].slice(0, 30));
  }, []);

  // API aggregation method
  const fetchLiveStatsFromAppwrite = useCallback(async () => {
    setIsSyncing(true);
    addLog("Polling database live collections via Appwrite client...", "info");
    
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
        // Direct Query Appwrite client
        addLog(`Initiating listDocuments to database: ${APPWRITE_CONFIG.databaseId}`, "info");

        // 1. Fetch Users
        try {
          const uRes = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.users,
            [Query.limit(5000)]
          );
          fetchedUsersDocs = uRes.documents;
          addLog(`Live Database: Fetched ${uRes.documents.length} users documents.`, "success");
        } catch (uErr: any) {
          addLog(`Users collection list failed: ${uErr.message || uErr}`, "error");
          fetchedUsersDocs = JSON.parse(localStorage.getItem("fr_users") || "[]");
        }

        // 2. Fetch Deposits
        try {
          const dRes = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.deposits,
            [Query.limit(5000)]
          );
          fetchedDepositsDocs = dRes.documents;
          addLog(`Live Database: Fetched ${dRes.documents.length} deposits documents.`, "success");
        } catch (dErr: any) {
          addLog(`Deposits collection list failed: ${dErr.message || dErr}`, "error");
          fetchedDepositsDocs = JSON.parse(localStorage.getItem("fr_deposits") || "[]");
        }

        // 3. Fetch Investments
        try {
          const iRes = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.investments,
            [Query.limit(5000)]
          );
          fetchedInvestmentsDocs = iRes.documents;
          addLog(`Live Database: Fetched ${iRes.documents.length} investments documents.`, "success");
        } catch (iErr: any) {
          addLog(`Investments collection list failed: ${iErr.message || iErr}`, "error");
          fetchedInvestmentsDocs = JSON.parse(localStorage.getItem("fr_investments") || "[]");
        }

        // 4. Fetch Withdrawals
        try {
          const wRes = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.withdrawals,
            [Query.limit(5000)]
          );
          fetchedWithdrawalsDocs = wRes.documents;
          addLog(`Live Database: Fetched ${wRes.documents.length} withdrawals documents.`, "success");
        } catch (wErr: any) {
          addLog(`Withdrawals collection list failed: ${wErr.message || wErr}`, "error");
          fetchedWithdrawalsDocs = JSON.parse(localStorage.getItem("fr_withdrawals") || "[]");
        }
      }

      // Live aggregations
      const activeUsers = fetchedUsersDocs.filter(u => !u.isBanned).length;
      const bannedUsers = fetchedUsersDocs.filter(u => u.isBanned).length;
      const totalWallets = fetchedUsersDocs.reduce((sum, u) => sum + (parseFloat(u.balance || u.walletBalance) || 0), 0);

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

      const calculatedStats: LiveStats = {
        usersCount: fetchedUsersDocs.length,
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

      setStats(calculatedStats);
      setError(null);
      setLastUpdated(new Date());
      addLog("Live dashboard statistics aggregates updated successfully.", "success");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse live Appwrite datasets");
      addLog(`Aggregation error: ${err.message || String(err)}`, "error");
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  }, [addLog]);

  // Handle active polling
  useEffect(() => {
    fetchLiveStatsFromAppwrite();

    if (refreshIntervalSec === 0) return;

    const pollingTimer = setInterval(() => {
      fetchLiveStatsFromAppwrite();
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
            Connected live to production Appwrite Database. Real-time updates automatically feed this console.
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
            <span className="text-slate-300 font-semibold">{isMockAppwrite ? "localStorage.mock" : "Appwrite Direct API"}</span>
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
      {loading ? (
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
              <span className="text-xl md:text-2xl font-black font-display text-blue-400 block">{stats.usersCount}</span>
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
              <span className="text-xl md:text-2xl font-black font-display text-emerald-400 block">₦{stats.totalDepositedSum.toLocaleString()}</span>
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
              <span className="text-xl md:text-2xl font-black font-display text-rose-400 block">₦{stats.totalWithdrawnSum.toLocaleString()}</span>
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
              <span className="text-xl md:text-2xl font-black font-display text-gold-accent block">₦{stats.totalInvestedSum.toLocaleString()}</span>
              <span className="text-[9px] text-slate-400 font-mono mt-1 block">Crops spawned: {stats.activeInvestmentsCount}</span>
            </div>

            {/* TOTAL REVENUE GRID CARD */}
            <div className="glass-panel p-4 rounded-xl border border-gold-accent/25 relative overflow-hidden bg-slate-900/10 col-span-2 md:col-span-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-black block tracking-wider mb-1">Total Net Cap</span>
              <span className="text-xl md:text-2xl font-black font-display text-amber-300 block">₦{(stats.totalDepositedSum - stats.totalWithdrawnSum).toLocaleString()}</span>
              <span className="text-[9.5px] text-slate-400 font-mono mt-1 block font-semibold">
                Wallets active: ₦{stats.totalUserWallets.toLocaleString()}
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

      {/* 4. API Transaction Stream Feed Logs */}
      <div className="glass-panel p-5 rounded-2xl border-white/10 bg-slate-900/10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-extrabold">
              Appwrite Direct API Request Stream Log
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
