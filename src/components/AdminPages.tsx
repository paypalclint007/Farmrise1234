import React, { useState } from "react";
import { useFarm } from "../context/FarmContext";
import AdminLiveDashboard from "./AdminLiveDashboard";
import { 
  Users, DollarSign, FileText, Check, X, ShieldAlert, Award,
  ArrowLeft, Bell, Landmark, Settings, Plus, Star, Layers, Percent,
  Ban, UserCheck, Search, Image as ImageIcon, Video, Trash2, Edit,
  TrendingUp, Coins, AlertTriangle, Play, HelpCircle, Sparkles, Loader2,
  Calendar, Clock, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { InvestmentPlan, UserProfile, FarmUpdate, LivestockCategory } from "../types";

// Curated Real High-Quality Farm Photos (Unsplash)
const PHOTO_PRESETS = [
  {
    name: "Coop Broiler Feeding",
    category: "Chicken",
    url: "https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Free Range Hens",
    category: "Chicken",
    url: "https://images.unsplash.com/photo-1548550123-94f1067bc16f?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Egg Sorting Harvest",
    category: "Chicken",
    url: "https://images.unsplash.com/photo-1598965402089-897db520192b?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Smart Bio-Secure Barn",
    category: "General",
    url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Berkshire Hogs Herd",
    category: "Pig",
    url: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Straw Bedded Piglets",
    category: "Pig",
    url: "https://images.unsplash.com/photo-1516802273409-68526ee1bdd6?w=800&auto=format&fit=crop&q=80",
  },
];

// Curated Real Free Stock Farm Videos (Mixkit direct MP4 loops)
const VIDEO_PRESETS = [
  {
    name: "Chickens Feeding Session",
    url: "https://assets.mixkit.co/videos/preview/mixkit-poultry-farm-chickens-caged-and-eating-40097-large.mp4",
  },
  {
    name: "Egg Collecting Harvest",
    url: "https://assets.mixkit.co/videos/preview/mixkit-man-harvesting-eggs-from-a-chicken-coop-40096-large.mp4",
  },
  {
    name: "Piglets Resting Bed",
    url: "https://assets.mixkit.co/videos/preview/mixkit-little-piglet-sleeping-on-the-hay-40098-large.mp4",
  },
  {
    name: "Open Field Chicken Run",
    url: "https://assets.mixkit.co/videos/preview/mixkit-flock-of-hens-running-around-the-courtyard-40095-large.mp4",
  },
];

export default function AdminPages() {
  const { currentPage, navigate } = useFarm();

  switch (currentPage) {
    case "admin-dashboard":
      return <AdminLiveDashboard />;
    case "admin-users":
      return <UsersManagementView />;
    case "admin-deposits":
      return <DepositApprovalView />;
    case "admin-withdrawals":
      return <WithdrawalApprovalView />;
    case "admin-plans":
      return <PlansManagementView />;
    case "admin-updates":
      return <FarmUpdatesManagementView />;
    case "admin-notifications":
      return <NotificationsManagementView />;
    default:
      return <AdminLiveDashboard />;
  }
}

// 1. Admin Dashboard Overview
function AdminDashboardView() {
  const { users, deposits, withdrawals, plans, investments, navigate } = useFarm();

  const pendingDeps = deposits.filter(d => d.status === "pending");
  const pendingWths = withdrawals.filter(w => w.status === "pending");

  // Statistical calculations
  const totalApprovedDeposits = deposits.filter(d => d.status === "approved").reduce((sum, d) => sum + d.amount, 0);
  const totalApprovedWithdrawals = withdrawals.filter(w => w.status === "approved").reduce((sum, w) => sum + w.amount, 0);
  const totalActiveInvestmentsSum = investments.filter(i => i.status === "active").reduce((sum, i) => sum + i.amount, 0);
  
  // Total Revenue as platform deposit flow or Net liquidity growth
  const totalRevenueVal = totalApprovedDeposits; 
  const netSurplusVal = totalApprovedDeposits - totalApprovedWithdrawals;

  return (
    <div className="space-y-6 pb-24 font-sans text-left">
      <div className="flex justify-between items-start pt-2">
        <div>
          <h2 className="text-2xl font-black font-display text-white flex items-center gap-2">
            <ShieldAlert className="text-gold-accent w-6 h-6" /> FarmRise HQ Control
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Admin administrative operations & logs</p>
        </div>
        <button 
          onClick={() => navigate("dashboard")}
          className="text-xs font-bold font-mono px-3 py-1.5 rounded-lg border border-white/20 text-white hover:bg-slate-900 transition-all flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back Live Client
        </button>
      </div>

      {/* Grid statistics highlights */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div 
          onClick={() => navigate("admin-users")}
          className="glass-panel p-4 rounded-xl cursor-pointer hover:border-white/20 transition-all relative overflow-hidden"
        >
          <span className="text-[10px] font-mono text-slate-400 uppercase font-black block tracking-wider mb-2">Total Users</span>
          <span className="text-xl md:text-2xl font-black font-display text-blue-400 block">{users.length}</span>
          <span className="text-[9px] text-slate-500 font-mono mt-1 block">Sponsor accounts</span>
        </div>

        <div 
          onClick={() => navigate("admin-deposits")}
          className="glass-panel p-4 rounded-xl cursor-pointer hover:border-white/20 transition-all relative overflow-hidden"
        >
          <span className="text-[10px] font-mono text-slate-400 uppercase font-black block tracking-wider mb-2">Total Deposits</span>
          <span className="text-xl md:text-2xl font-black font-display text-emerald-400 block">₦{totalApprovedDeposits.toLocaleString()}</span>
          <span className="text-[9px] text-amber-400 font-mono mt-1 block flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
            {pendingDeps.length} Pending approvals
          </span>
        </div>

        <div 
          onClick={() => navigate("admin-withdrawals")}
          className="glass-panel p-4 rounded-xl cursor-pointer hover:border-white/20 transition-all relative overflow-hidden"
        >
          <span className="text-[10px] font-mono text-slate-400 uppercase font-black block tracking-wider mb-2">Total Payouts</span>
          <span className="text-xl md:text-2xl font-black font-display text-rose-400 block">₦{totalApprovedWithdrawals.toLocaleString()}</span>
          <span className="text-[9px] text-red-400 font-mono mt-1 block flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-450 inline-block" />
            {pendingWths.length} Pending pay
          </span>
        </div>

        <div 
          onClick={() => navigate("admin-plans")}
          className="glass-panel p-4 rounded-xl cursor-pointer hover:border-white/20 transition-all relative overflow-hidden"
        >
          <span className="text-[10px] font-mono text-slate-400 uppercase font-black block tracking-wider mb-2">Active Portfolios</span>
          <span className="text-xl md:text-2xl font-black font-display text-gold-accent block">₦{totalActiveInvestmentsSum.toLocaleString()}</span>
          <span className="text-[9px] text-slate-400 font-mono mt-1 block">Live sponsored crops</span>
        </div>

        <div 
          className="glass-panel p-4 rounded-xl border border-gold-accent/25 relative overflow-hidden bg-slate-900/10 col-span-2 md:col-span-1"
        >
          <span className="text-[10px] font-mono text-slate-400 uppercase font-black block tracking-wider mb-2">Total Revenue</span>
          <span className="text-xl md:text-2xl font-black font-display text-amber-300 block">₦{totalRevenueVal.toLocaleString()}</span>
          <span className="text-[9.5px] text-slate-400 font-mono mt-1 block font-semibold">
            Net: ₦{netSurplusVal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Quick Administrative shortcuts */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">HQ Operations Dashboard</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div 
            onClick={() => navigate("admin-users")}
            className="glass-panel p-4.5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-white/15 bg-slate-950/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Sponsors & Partners ({users.length})</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Search sponsors, view active portfolios & suspension ban controls</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 hover:text-white">Directory →</span>
          </div>

          <div 
            onClick={() => navigate("admin-deposits")}
            className="glass-panel p-4.5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-white/15 bg-slate-950/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Deposit Pipeline ({pendingDeps.length} Pending)</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Authorize incoming wire proofs and wallets credit increments</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 hover:text-white">Pipeline →</span>
          </div>

          <div 
            onClick={() => navigate("admin-withdrawals")}
            className="glass-panel p-4.5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-white/15 bg-slate-950/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Withdrawal Clearances ({pendingWths.length} Pending)</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Review, execute or reject user wallet withdrawal payout redemptions</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 hover:text-white">Clearances →</span>
          </div>

          <div 
            onClick={() => navigate("admin-plans")}
            className="glass-panel p-4.5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-white/15 bg-slate-950/20"
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
            <span className="text-xs font-mono font-bold text-slate-500 hover:text-white">Blueprints →</span>
          </div>

          <div 
            onClick={() => navigate("admin-updates")}
            className="glass-panel p-4.5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-white/15 bg-slate-950/20"
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
            <span className="text-xs font-mono font-bold text-slate-500 hover:text-white">Logs Desk →</span>
          </div>

          <div 
            onClick={() => navigate("admin-notifications")}
            className="glass-panel p-4.5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-white/15 bg-slate-950/20"
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
            <span className="text-xs font-mono font-bold text-slate-500 hover:text-white">Dispatch →</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Users Management Board (With Search & Ban/Unban)
function UsersManagementView() {
  const { users, banUser, adjustUserWallet, navigate } = useFarm();
  const [searchQuery, setSearchQuery] = useState("");
  const [blockingId, setBlockingId] = useState<string | null>(null);

  // Editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState("");
  const [editInvested, setEditInvested] = useState("");
  const [editEarnings, setEditEarnings] = useState("");
  const [editReferralBonus, setEditReferralBonus] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  // Search filter implementation
  const filteredUsers = users.filter((u) => {
    const nameMatch = u.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = u.phoneNumber?.includes(searchQuery);
    return nameMatch || emailMatch || phoneMatch;
  });

  const handleToggleBanned = async (u: UserProfile) => {
    const isCurrentlyBanned = !!u.isBanned;
    const confirmMsg = isCurrentlyBanned 
      ? `Are you surely willing to reinstate ${u.name}'s FarmRise access status?`
      : `Are you surely willing to suspend/BAN ${u.name}? They will be instantly booted and locked out of operations.`;
    
    if (!confirm(confirmMsg)) return;
    
    setBlockingId(u.id);
    try {
      await banUser(u.id, !isCurrentlyBanned);
      alert(`User account successfully ${!isCurrentlyBanned ? "SUSPENDED" : "REINSTATED"}`);
    } catch (err: any) {
      alert(`Fatal Error performing action: ${err.message || String(err)}`);
    } finally {
      setBlockingId(null);
    }
  };

  const handleStartEdit = (u: UserProfile) => {
    setEditingUserId(u.id);
    setEditBalance(String(u.balance || 0));
    setEditInvested(String(u.totalInvested || 0));
    setEditEarnings(String(u.totalEarnings || 0));
    setEditReferralBonus(String(u.referralBonus || 0));
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
  };

  const handleSaveMetrics = async (userId: string) => {
    setSavingUserId(userId);
    try {
      await adjustUserWallet(userId, {
        balance: Number(editBalance) || 0,
        totalInvested: Number(editInvested) || 0,
        totalEarnings: Number(editEarnings) || 0,
        referralBonus: Number(editReferralBonus) || 0,
      });
      alert("Sponsor metrics have been securely saved and synchronized!");
      setEditingUserId(null);
    } catch (err: any) {
      alert(`Error updating sponsor metrics: ${err.message || String(err)}`);
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-6 pb-24 text-left">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-2">
        <div>
          <button onClick={() => navigate("admin-dashboard")} className="text-xs text-gold-accent font-semibold hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back Control Center
          </button>
          <h2 className="text-2xl font-black font-display text-white mt-1">Partners Directory</h2>
          <p className="text-xs text-slate-400">Search sponsors, update profile metrics & ban users instantly</p>
        </div>

        {/* Search bar */}
        <div className="relative max-w-sm w-full shrink-0">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone or email..."
            className="w-full bg-slate-950/80 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-gold-accent transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full border border-dashed border-white/10 rounded-2xl p-12 text-center bg-slate-900/10">
            <Users className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">No Partners Match Selection</p>
            <p className="text-[10px] text-slate-500 mt-1">Refine your search parameters at the search input bar</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isEditing = editingUserId === u.id;
            return (
              <div 
                key={u.id} 
                className={`glass-panel p-5 rounded-2xl space-y-4 relative overflow-hidden transition-all border ${
                  u.isBanned 
                    ? "border-red-500/30 bg-red-950/5/10" 
                    : isEditing
                    ? "border-gold-accent bg-gold-accent/5"
                    : "hover:border-white/15"
                }`}
              >
                {u.isBanned && (
                  <div className="absolute top-0 right-0 bg-red-650/90 text-white text-[9px] font-mono tracking-widest font-black uppercase px-3.5 py-1 rounded-bl-xl border-l border-b border-red-500/20">
                    Suspended Banned
                  </div>
                )}

                <div className="flex justify-between items-start pr-16 max-w-full">
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-black text-white hover:text-gold-accent block leading-none truncate max-w-[200px]">{u.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1.5 truncate max-w-[200px]">{u.email}</span>
                    {u.phoneNumber && (
                      <span className="text-[9.5px] text-slate-500 font-mono block mt-0.5">Phone: {u.phoneNumber}</span>
                    )}
                    {u.referredBy && (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-mono px-1.5 py-0.5 rounded inline-block mt-2">
                        Referred By: {u.referredBy}
                      </span>
                    )}
                  </div>
                  
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {/* Role Badge */}
                    {u.isAdmin ? (
                      <span className="text-[9px] bg-red-500/15 font-mono text-red-400 px-2 py-0.5 border border-red-500/20 rounded-md font-extrabold uppercase tracking-wider block text-center">
                        ADMIN
                      </span>
                    ) : (
                      <span className="text-[9px] bg-blue-500/10 font-mono text-blue-400 px-2 py-0.5 border border-blue-500/10 rounded-md font-bold uppercase tracking-wider block text-center">
                        SPONSOR
                      </span>
                    )}

                    {/* Status Badge */}
                    {u.isBanned ? (
                      <span className="text-[9px] bg-amber-500/15 font-mono text-amber-400 px-2 py-0.5 border border-amber-500/20 rounded-md font-bold uppercase tracking-wider block text-center">
                        SUSPENDED
                      </span>
                    ) : (
                      <span className="text-[9px] bg-emerald-500/15 font-mono text-emerald-400 px-2 py-0.5 border border-emerald-500/20 rounded-md font-bold uppercase tracking-wider block text-center">
                        ACTIVE
                      </span>
                    )}
                    
                    {!isEditing && (
                      <button 
                        onClick={() => handleStartEdit(u)}
                        className="text-[10px] font-mono font-bold uppercase tracking-wider text-gold-accent hover:underline flex items-center gap-1 bg-white/5 py-1 px-2.5 rounded border border-white/5 mt-1"
                      >
                        <Edit className="w-3 h-3" /> Edit Metrics
                      </button>
                    )}
                  </div>
                </div>

                {!isEditing ? (
                  /* Financial balances static display */
                  <div className="grid grid-cols-4 gap-1 text-[9px] uppercase font-mono bg-slate-950/65 p-2 rounded-xl border border-white/5 text-center">
                    <div>
                      <span className="text-slate-500 block text-[7.5px] font-bold">Live Funds:</span>
                      <span className="text-white font-bold block mt-0.5">₦{(u.balance || 0).toLocaleString(undefined, {minimumFractionDigits:0})}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[7.5px] font-bold">Invested:</span>
                      <span className="text-gold-accent font-bold block mt-0.5">₦{(u.totalInvested || 0).toLocaleString(undefined, {minimumFractionDigits:0})}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[7.5px] font-bold">Earnings:</span>
                      <span className="text-green-accent font-bold block mt-0.5">₦{(u.totalEarnings || 0).toLocaleString(undefined, {minimumFractionDigits:0})}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[7.5px] font-bold">Ref Bonus:</span>
                      <span className="text-[#F5B300] font-bold block mt-0.5">₦{(u.referralBonus || 0).toLocaleString(undefined, {minimumFractionDigits:0})}</span>
                    </div>
                  </div>
                ) : (
                  /* Financial metrics dynamic inputs form */
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 bg-slate-950 rounded-xl border border-gold-accent/25 space-y-3"
                  >
                    <div className="text-[10px] uppercase font-mono text-gold-accent font-bold flex items-center gap-1 border-b border-white/5 pb-1">
                      <Settings className="w-3.5 h-3.5 animate-spin-slow" /> Sponsor Account Ledger adjustments
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <label className="block text-[8.5px] font-mono text-slate-400 mb-1">LIVE FUNDS (₦)</label>
                        <input 
                          type="number"
                          value={editBalance}
                          onChange={(e) => setEditBalance(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white font-mono font-bold focus:outline-none focus:border-gold-accent text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[8.5px] font-mono text-slate-400 mb-1">LOCKED CAPITAL (₦)</label>
                        <input 
                          type="number"
                          value={editInvested}
                          onChange={(e) => setEditInvested(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white font-mono font-bold focus:outline-none focus:border-gold-accent text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[8.5px] font-mono text-slate-400 mb-1">TOTAL EARNINGS (₦)</label>
                        <input 
                          type="number"
                          value={editEarnings}
                          onChange={(e) => setEditEarnings(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white font-mono font-bold focus:outline-none focus:border-gold-accent text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[8.5px] font-mono text-slate-400 mb-1">REFERRAL BONUS (₦)</label>
                        <input 
                          type="number"
                          value={editReferralBonus}
                          onChange={(e) => setEditReferralBonus(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white font-mono font-bold focus:outline-none focus:border-gold-accent text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button 
                        disabled={savingUserId === u.id}
                        onClick={() => handleSaveMetrics(u.id)}
                        className="flex-1 py-1.5 rounded-lg bg-gold-accent text-slate-950 text-[10px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1 hover:brightness-110"
                      >
                        {savingUserId === u.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" /> Save Changes
                          </>
                        )}
                      </button>
                      <button 
                        onClick={handleCancelEdit}
                        className="py-1.5 px-3 rounded-lg border border-white/10 text-slate-400 hover:text-white text-[10px] font-mono font-bold uppercase"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-1">
                  {!u.isAdmin && (
                    <button
                      disabled={blockingId === u.id}
                      onClick={() => handleToggleBanned(u)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        u.isBanned
                          ? "bg-emerald-500 text-slate-950 font-black"
                          : "bg-red-950/40 text-red-400 border border-red-500/20 hover:bg-red-900 hover:text-white"
                      }`}
                    >
                      {blockingId === u.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : u.isBanned ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" /> Reinstate Partner
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5" /> Suspend BAN Account
                        </>
                      )}
                    </button>
                  )}

                  <span className="text-[9px] font-mono text-slate-550 shrink-0 select-all">
                    UID: {u.id}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// 3. Deposit Approval Pipeline with Status Filter Toggles (Approve / Reject)
function DepositApprovalView() {
  const { deposits, approveDeposit, rejectDeposit, navigate } = useFarm();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const handleImagePreview = (imgUrl: string) => {
    setPreviewImage(imgUrl);
    setScale(1);
    setRotation(0);
  };

  const filteredDeposits = deposits.filter((d) => d.status === activeTab);

  return (
    <div className="space-y-6 pb-24 text-left">
      <div>
        <button onClick={() => navigate("admin-dashboard")} className="text-xs text-gold-accent font-semibold hover:underline flex items-center gap-1">
          ← Back Control Center
        </button>
        <h2 className="text-2xl font-black font-display text-white mt-1">Deposit Pipeline</h2>
        <p className="text-xs text-slate-400">Approve wire proofs, credit sponsor wallets or reject invalid transactions</p>
      </div>

      {/* Pipeline tabs filters */}
      <div className="flex border-b border-white/10 p-1 bg-slate-950/60 rounded-xl space-x-1">
        {(["pending", "approved", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === tab 
                ? tab === "pending"
                  ? "bg-amber-500 text-slate-950"
                  : tab === "approved"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-red-500 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab === "pending" && `⏳ Pending Queue`}
            {tab === "approved" && `✅ Approved Ledger`}
            {tab === "rejected" && `❌ Rejected Tickets`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredDeposits.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center bg-slate-900/10">
            <Check className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-xs text-slate-400 uppercase tracking-wider">Empty {activeTab} deposits list</p>
            <p className="text-[10px] text-slate-500 mt-1">No sponsors currently trigger this status classification</p>
          </div>
        ) : (
          filteredDeposits.map((dep) => (
            <div key={dep.id} className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300 font-mono">ID: {dep.id}</span>
                    <span className={`text-[9px] font-mono tracking-widest font-bold uppercase rounded px-2 py-0.5 ${
                      dep.status === "pending"
                        ? "bg-amber-950 text-amber-400 border border-amber-500/20"
                        : dep.status === "approved"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-950 text-rose-400 border border-rose-500/20"
                    }`}>
                      {dep.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-450 block mt-2">Timestamp: {new Date(dep.createdAt).toLocaleString()}</span>
                  <span className="text-[10px] text-sky-400 font-mono block mt-0.5">Sponsor: {dep.userId}</span>
                </div>
                <span className="text-lg font-black text-emerald-400 font-mono">₦{dep.amount.toLocaleString()}</span>
              </div>

              {/* Receipt metadata details */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 font-mono text-[11px] border border-white/5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Deposit Wire Ref:</span>
                  <span className="text-white font-bold select-all">{dep.txRef}</span>
                </div>
              </div>

              {dep.proofImg && (
                <div className="w-full h-44 rounded-xl overflow-hidden border border-white/5 relative group bg-black">
                  <img src={dep.proofImg} alt="Proof of wire payment" referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-80" />
                  <button
                    type="button"
                    onClick={() => handleImagePreview(dep.proofImg!)}
                    className="absolute inset-0 w-full h-full bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white font-semibold text-xs gap-1.5 cursor-pointer z-10"
                  >
                    <span>Click to Zoom / Expand Document 🔍</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImagePreview(dep.proofImg!)}
                    className="absolute bottom-3 right-3 bg-slate-950/80 hover:bg-slate-900 text-gold-accent font-mono text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/10 transition-all z-20 cursor-pointer"
                  >
                    View Original File ↗
                  </button>
                </div>
              )}

              {dep.status === "pending" && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setConfirmConfig({
                        title: "Credit User Portfolio",
                        message: `Are you sure you want to approve this receipt of ₦${dep.amount.toLocaleString()} and instantly credit funds to the user's account balance?`,
                        onConfirm: () => approveDeposit(dep.id)
                      });
                    }}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Credit Funds
                  </button>
                  <button
                    onClick={() => {
                      setConfirmConfig({
                        title: "Decline / Reject Proof",
                        message: `Are you sure you want to reject/decline this deposit request of ₦${dep.amount.toLocaleString()} NGN? The user will be notified in their bulletins.`,
                        onConfirm: () => rejectDeposit(dep.id)
                      });
                    }}
                    className="py-2.5 rounded-xl bg-red-950/40 text-red-400 font-bold text-xs uppercase hover:bg-red-950/80 flex items-center justify-center gap-1.5 transition-all border border-red-500/20 cursor-pointer"
                  >
                    <X className="w-4 h-4" /> Decline Proof
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Interactive High Definition Image Viewer Overlay Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4 md:p-8"
            onClick={() => setPreviewImage(null)}
          >
            {/* Modal Controls Bar */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="w-full max-w-4xl bg-slate-900/95 border border-white/5 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 mb-4 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-bold text-white flex items-center gap-1.5 font-display">
                  ✨ High-Definition Document Lens
                </span>
              </div>

              {/* Functional adjustments */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.max(0.25, s - 0.25))}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-mono font-bold border border-white/5 cursor-pointer"
                  title="Zoom Out"
                >
                  Zoom -
                </button>
                <span className="text-xs font-mono text-slate-400 min-w-[3rem] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.min(4, s + 0.25))}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-mono font-bold border border-white/5 cursor-pointer"
                  title="Zoom In"
                >
                  Zoom +
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-mono font-bold border border-white/5 cursor-pointer flex items-center gap-1"
                  title="Rotate Image"
                >
                  Rotate ⟳
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScale(1);
                    setRotation(0);
                  }}
                  className="px-1.5 py-1.5 text-slate-400 hover:text-white text-xs font-mono"
                >
                  Reset
                </button>
              </div>

              {/* Close & Download Actions */}
              <div className="flex items-center gap-2">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-[#F5B300] hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-bold uppercase cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open Direct ↗
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="px-3.5 py-1.5 bg-red-950 text-red-400 hover:bg-red-900 hover:text-white rounded-lg text-xs font-bold uppercase border border-red-500/20 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>

            {/* Live Interactive Image Box */}
            <div 
              className="flex-1 w-full max-w-4xl flex items-center justify-center overflow-auto rounded-3xl bg-slate-950/60 border border-white/5 p-4 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
              <div 
                className="transition-transform duration-200 ease-out select-none flex items-center justify-center"
                style={{ 
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                }}
              >
                <img
                  src={previewImage}
                  alt="High Resolution Wire Proof"
                  referrerPolicy="no-referrer"
                  className="max-h-[70vh] md:max-h-[65vh] w-auto h-auto object-contain rounded-xl shadow-2xl border border-white/10"
                  draggable="false"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-3 font-mono text-center">
              💡 Pro Tip: Is the receipt turned sideways/landscape? Click the "Rotate ⟳" button to turn it! Click "Open Direct ↗" to view full size in high-res link.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Visual Confirmation Dialog Overlay for sandboxed iframes compatibility */}
      <AnimatePresence>
        {confirmConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4"
            onClick={() => setConfirmConfig(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[#F5B300]" />
                </div>
                <div className="space-y-1 text-left">
                  <h3 className="text-base font-bold text-white font-display">
                    {confirmConfig.title || "Confirm Administrative Action"}
                  </h3>
                  <p className="text-xs text-white/70 leading-relaxed font-sans mt-1">
                    {confirmConfig.message}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmConfig(null)}
                  className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all border border-white/11 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmConfig.onConfirm();
                    setConfirmConfig(null);
                  }}
                  className="py-2.5 rounded-xl bg-[#F5B300] hover:bg-yellow-500 text-slate-950 font-bold text-xs uppercase tracking-wide transition-all cursor-pointer"
                >
                  Confirm Proceed
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 4. Withdrawal Clearance Pipeline (Approve / Reject)
function WithdrawalApprovalView() {
  const { withdrawals, approveWithdrawal, rejectWithdrawal, navigate } = useFarm();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const filteredWithdrawals = withdrawals.filter((w) => w.status === activeTab);

  return (
    <div className="space-y-6 pb-24 text-left">
      <div>
        <button onClick={() => navigate("admin-dashboard")} className="text-xs text-gold-accent font-semibold hover:underline flex items-center gap-1">
          ← Back Control Center
        </button>
        <h2 className="text-2xl font-black font-display text-white mt-1">Withdrawal Clearances</h2>
        <p className="text-xs text-slate-400">Review pending checkout redemption requests, dispatch wire transfers or abort logs</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-white/10 p-1 bg-slate-950/60 rounded-xl space-x-1">
        {(["pending", "approved", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === tab 
                ? tab === "pending"
                  ? "bg-amber-500 text-slate-950"
                  : tab === "approved"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-red-500 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab === "pending" && `⏳ Clear Pending`}
            {tab === "approved" && `✅ Settled Ledger`}
            {tab === "rejected" && `❌ Bounced Aborted`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredWithdrawals.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center bg-slate-900/10">
            <Check className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-xs text-slate-400 uppercase tracking-wider">Empty {activeTab} withdrawals queue</p>
            <p className="text-[10px] text-slate-500 mt-1">Everything looks cleared and synced right now</p>
          </div>
        ) : (
          filteredWithdrawals.map((wth) => (
            <div key={wth.id} className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300 font-mono">Payout Ref: {wth.id}</span>
                    <span className={`text-[9px] font-mono tracking-widest font-bold uppercase rounded px-2 py-0.5 ${
                      wth.status === "pending"
                        ? "bg-amber-950 text-amber-400 border border-amber-500/20"
                        : wth.status === "approved"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-950 text-rose-400 border border-rose-500/20"
                    }`}>
                      {wth.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-2">{new Date(wth.createdAt).toLocaleString()}</span>
                  <span className="text-[10px] text-sky-400 block font-mono mt-0.5">Sponsor: {wth.userId}</span>
                </div>
                <span className="text-lg font-black text-rose-400 font-mono">-₦{wth.amount.toLocaleString()}</span>
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl space-y-2 border border-white/5 font-mono text-[11px]">
                <div className="text-slate-400 block mb-1 uppercase font-bold text-[9px]">Sponsor Bank Destination:</div>
                <div className="text-slate-200 leading-relaxed whitespace-pre-wrap select-all">{wth.accountDetails}</div>
              </div>

              {wth.status === "pending" && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setConfirmConfig({
                        title: "Confirm Settle Wire",
                        message: `Are you completely sure you have processed the NGN bank payment of ₦${wth.amount.toLocaleString()} to: ${wth.accountDetails}?`,
                        onConfirm: () => approveWithdrawal(wth.id)
                      });
                    }}
                    className="py-2 rounded-xl bg-gold-accent text-slate-900 font-bold text-xs uppercase flex items-center justify-center gap-1 filter hover:brightness-110 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Settled wire
                  </button>
                  <button
                    onClick={() => {
                      setConfirmConfig({
                        title: "Declined & Refund Payout",
                        message: `Are you sure you want to decline this payout request of ₦${wth.amount.toLocaleString()} NGN? The funds will be instantly refunded to the user's active agricultural yield balance.`,
                        onConfirm: () => rejectWithdrawal(wth.id)
                      });
                    }}
                    className="py-2 rounded-xl bg-red-950/45 text-red-405 font-bold text-xs uppercase hover:bg-red-950 flex items-center justify-center gap-1 transition-all cursor-pointer border border-red-500/10"
                  >
                    <X className="w-4 h-4" /> Abort Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Interactive Visual Confirmation Dialog Overlay for sandboxed iframes compatibility */}
      <AnimatePresence>
        {confirmConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4"
            onClick={() => setConfirmConfig(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[#F5B300]" />
                </div>
                <div className="space-y-1 text-left">
                  <h3 className="text-base font-bold text-white font-display">
                    {confirmConfig.title || "Confirm Administrative Action"}
                  </h3>
                  <p className="text-xs text-white/70 leading-relaxed font-sans mt-1">
                    {confirmConfig.message}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmConfig(null)}
                  className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all border border-white/11 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmConfig.onConfirm();
                    setConfirmConfig(null);
                  }}
                  className="py-2.5 rounded-xl bg-[#F5B300] hover:bg-yellow-500 text-slate-950 font-bold text-xs uppercase tracking-wide transition-all cursor-pointer"
                >
                  Confirm Proceed
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 5. Investment Plans Management Board (Add, Edit, Delete, Enable/Disable)
function PlansManagementView() {
  const { plans, categories, createOrUpdatePlan, createOrUpdateCategory, deletePlan, navigate } = useFarm();
  
  // Tab switcher
  const [activeAdminTab, setActiveAdminTab] = useState<"plans" | "categories">("plans");

  // Package Builder Form state
  const [pId, setPId] = useState("");
  const [pName, setPName] = useState("");
  const [pType, setPType] = useState<"Chicken" | "Pig">("Chicken");
  const [pMin, setPMin] = useState("");
  const [pMax, setPMax] = useState("");
  const [pYield, setPYield] = useState("");
  const [pDays, setPDays] = useState("");
  const [pImg, setPImg] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pStatus, setPStatus] = useState<"active" | "inactive">("active");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category Form State
  const [catId, setCatId] = useState("");
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState("Chicken");
  const [catEmoji, setCatEmoji] = useState("🐔");
  const [catImg, setCatImg] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [isCatSubmitting, setIsCatSubmitting] = useState(false);

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !catEmoji || !catImg || !catDesc) {
      alert("Please specify all category details.");
      return;
    }
    setIsCatSubmitting(true);
    const draftId = catId || "category_" + Date.now();
    const model: LivestockCategory = {
      id: draftId,
      name: catName,
      type: catType,
      emoji: catEmoji,
      imageUrl: catImg,
      description: catDesc
    };

    try {
      await createOrUpdateCategory(model);
      alert(`Livestock Category '${catName}' successfully deployed!`);
      // Reset state
      setCatId("");
      setCatName("");
      setCatType("Chicken");
      setCatEmoji("🐔");
      setCatImg("");
      setCatDesc("");
    } catch (err: any) {
      alert(`Failed to save category blueprint: ${err.message || String(err)}`);
    } finally {
      setIsCatSubmitting(false);
    }
  };

  const handleSelectCategoryToEdit = (cat: LivestockCategory) => {
    setCatId(cat.id);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatEmoji(cat.emoji);
    setCatImg(cat.imageUrl);
    setCatDesc(cat.description);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pMin || !pMax || !pYield || !pDays || !pImg || !pDesc) {
      alert("Please fully specify all blueprint fields.");
      return;
    }
    
    setIsSubmitting(true);
    const draftId = pId || "plan_" + Date.now();
    const model: InvestmentPlan = {
      id: draftId,
      name: pName,
      type: pType,
      minAmount: Number(pMin),
      maxAmount: Number(pMax),
      profitPercent: Number(pYield),
      durationDays: Number(pDays),
      imageUrl: pImg,
      description: pDesc,
      status: pStatus
    };

    try {
      await createOrUpdatePlan(model);
      alert(`Farming Plan blueprint '${pName}' successfully deployed!`);
      // Reset State
      setPId(""); 
      setPName(""); 
      setPMin(""); 
      setPMax(""); 
      setPYield(""); 
      setPDays(""); 
      setPImg(""); 
      setPDesc("");
      setPStatus("active");
    } catch (err: any) {
      alert(`Failed to save package blueprint: ${err.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectToEdit = (plan: InvestmentPlan) => {
    setPId(plan.id);
    setPName(plan.name);
    setPType(plan.type);
    setPMin(plan.minAmount.toString());
    setPMax(plan.maxAmount.toString());
    setPYield(plan.profitPercent.toString());
    setPDays(plan.durationDays.toString());
    setPImg(plan.imageUrl);
    setPDesc(plan.description);
    setPStatus(plan.status || "active");
    
    // Smooth scroll up to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTogglePlanState = async (plan: InvestmentPlan) => {
    const updatedStatusValue = plan.status === "active" ? "inactive" : "active";
    if (!confirm(`Are you sure you want to change the status of ${plan.name} to ${updatedStatusValue.toUpperCase()}?`)) return;
    
    try {
      await createOrUpdatePlan({
        ...plan,
        status: updatedStatusValue
      });
      alert(`Plan updated to: ${updatedStatusValue.toUpperCase()}`);
    } catch (err: any) {
      alert(`Error toggling status: ${err.message || String(err)}`);
    }
  };

  return (
    <div className="space-y-6 pb-24 text-left">
      <div>
        <button onClick={() => navigate("admin-dashboard")} className="text-xs text-gold-accent font-semibold hover:underline flex items-center gap-1">
          ← Back Control Center
        </button>
        <h2 className="text-2xl font-black font-display text-white mt-1">Farm Management Board</h2>
        <p className="text-xs text-slate-400">Configure investment plans blueprints, manage livestock sectors, edit featured pictures and descriptions</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={() => setActiveAdminTab("plans")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 border-b-2 rounded-t-lg ${
            activeAdminTab === "plans"
              ? "text-gold-accent border-gold-accent bg-slate-950/20"
              : "text-slate-400 border-transparent hover:text-white"
          }`}
        >
          📈 Investment Plans ({plans.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveAdminTab("categories")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 border-b-2 rounded-t-lg ml-2 ${
            activeAdminTab === "categories"
              ? "text-gold-accent border-gold-accent bg-slate-950/20"
              : "text-slate-400 border-transparent hover:text-white"
          }`}
        >
          📂 Livestock Categories ({(categories || []).length})
        </button>
      </div>

      {activeAdminTab === "categories" ? (
        <div className="space-y-6">
          {/* Category Form */}
          <form onSubmit={handleCategorySubmit} className="glass-panel p-5 rounded-2xl space-y-4 border border-gold-accent/15 bg-slate-950/20">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-gold-accent font-bold">
                {catId ? "🛠️ Edit Featured Category Picture & Details" : "➕ Create Livestock Category"}
              </h3>
              {catId && (
                <button
                  type="button"
                  onClick={() => {
                    setCatId(""); setCatName(""); setCatType("Chicken"); setCatEmoji("🐔"); setCatImg(""); setCatDesc("");
                  }}
                  className="text-[10px] font-mono hover:text-white text-slate-400 uppercase font-bold"
                >
                  Clear edit mode [X]
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Category Display Name</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Chicken Farming"
                  className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Livestock Type / Key</label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="Chicken">🐔 Chicken</option>
                  <option value="Pig">🐖 Pig / Swine</option>
                  <option value="General">📡 General / Logistics</option>
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Category Emoji</label>
                <input
                  type="text"
                  required
                  value={catEmoji}
                  onChange={(e) => setCatEmoji(e.target.value)}
                  placeholder="e.g. 🐔"
                  className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold font-bold">Featured Cover Image URL</label>
                <input
                  type="text"
                  required
                  value={catImg}
                  onChange={(e) => setCatImg(e.target.value)}
                  placeholder="Paste cover URL or upload below..."
                  className="w-full glass-input rounded-xl p-2.5 text-xs font-mono text-white placeholder-slate-500"
                />
              </div>

              {/* Upload image for category */}
              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Upload Featured Category Cover Photo</label>
                <div className="flex gap-2 items-center">
                  <label
                    htmlFor="category-file-uploader"
                    className="py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider border border-white/10 hover:border-white/25 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <ImageIcon className="w-4 h-4 text-gold-accent" />
                    <span>Upload From Device</span>
                  </label>
                  <input
                    type="file"
                    id="category-file-uploader"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
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
                            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
                            setCatImg(compressedBase64);
                          }
                        };
                        img.src = event.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  {catImg && (
                    <div className="flex items-center gap-2">
                      <img src={catImg} alt="Preview" referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                      <button
                        type="button"
                        onClick={() => setCatImg("")}
                        className="text-xs text-red-400 hover:text-red-500 font-mono font-bold"
                      >
                        [Remove]
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Category Dashboard Description</label>
              <textarea
                required
                rows={3}
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Discuss this sector's yields, duration types and bio-security protocols..."
                className="w-full glass-input rounded-xl p-2.5 text-xs leading-relaxed text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isCatSubmitting}
              className="w-full py-3 bg-gold-accent hover:bg-yellow-500 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center justify-center gap-1"
            >
              {isCatSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : catId ? (
                "Update Livestock Category"
              ) : (
                "Create Livestock Category"
              )}
            </button>
          </form>

          {/* Current Category list */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">Current Livestock Sectors ({(categories || []).length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(categories || []).map((cat) => (
                <div key={cat.id} className="glass-panel rounded-2xl overflow-hidden border border-white/5 flex flex-col justify-between group h-full bg-slate-950/25">
                  <div className="relative h-36 w-full bg-slate-950 overflow-hidden">
                    <img 
                      src={cat.imageUrl} 
                      alt={cat.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-80" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      <span className="text-xl block">{cat.emoji}</span>
                      <h4 className="text-sm font-bold text-white">{cat.name} ({cat.type})</h4>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed min-h-[40px]">
                      {cat.description}
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleSelectCategoryToEdit(cat)}
                        className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all border border-white/5 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-gold-accent" />
                        <span>Edit Category Details / Picture</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Package Form */}
          <form onSubmit={handlePlanSubmit} className="glass-panel p-5 rounded-2xl space-y-4 border border-gold-accent/15 bg-slate-950/20">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-gold-accent font-bold">
                {pId ? "🛠️ Edit Farming Plan Blueprint" : "➕ Deploy Farming Plan Blueprint"}
              </h3>
              {pId && (
                <button
                  type="button"
                  onClick={() => {
                    setPId(""); setPName(""); setPMin(""); setPMax(""); setPYield(""); setPDays(""); setPImg(""); setPDesc(""); setPStatus("active");
                  }}
                  className="text-[10px] font-mono hover:text-white text-slate-400 uppercase font-bold"
                >
                  Clear edit mode [X]
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Plan Package Title</label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="e.g. Broiler Batch Grow"
                  className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Livestock Class</label>
                <select
                  value={pType}
                  onChange={(e: any) => setPType(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="Chicken">🐔 Chicken Broilers Setup</option>
                  <option value="Pig">🐷 Pigs Growth Setup</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Profit Return Yield (%)</label>
                <input
                  type="number"
                  required
                  value={pYield}
                  onChange={(e) => setPYield(e.target.value)}
                  placeholder="e.g. 20"
                  className="w-full glass-input rounded-xl p-2.5 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Duration (Term Days)</label>
                <input
                  type="number"
                  required
                  value={pDays}
                  onChange={(e) => setPDays(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full glass-input rounded-xl p-2.5 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Min Sponsor Limit (₦)</label>
                <input
                  type="number"
                  required
                  value={pMin}
                  onChange={(e) => setPMin(e.target.value)}
                  placeholder="e.g. 3000"
                  className="w-full glass-input rounded-xl p-2.5 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Max Sponsor Limit (₦)</label>
                <input
                  type="number"
                  required
                  value={pMax}
                  onChange={(e) => setPMax(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full glass-input rounded-xl p-2.5 text-xs font-mono text-white"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Illustration Photo / Cover Image</label>
                
                {/* Elegant Device Photo Upload Zone */}
                <div className="grid grid-cols-1 sm:grid-cols-10 gap-3.5 mt-1.5">
                  <div className="sm:col-span-3 h-28 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 flex flex-col items-center justify-center relative group">
                    {pImg ? (
                      <>
                        <img src={pImg} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPImg("")}
                          className="absolute top-2 right-2 bg-slate-950/80 hover:bg-red-500/80 text-white rounded-full p-1.5 transition-all text-[10px] border border-white/10 cursor-pointer"
                          title="Clear photo"
                        >
                          ✕
                        </button>
                        <div className="absolute inset-x-0 bottom-0 bg-slate-950/90 py-1.5 text-center text-[9px] font-mono text-gold-accent font-semibold opacity-0 group-hover:opacity-100 transition-all">
                          Photo Loaded ✓
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-3">
                        <span className="text-xl block mb-1">📷</span>
                        <span className="text-[10px] font-mono text-slate-400 block font-bold leading-none">NO COVER</span>
                        <span className="text-[8px] text-slate-500 block mt-1 font-sans">800x600 recommended</span>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-7 flex flex-col justify-between space-y-2">
                    <input
                      type="text"
                      required
                      value={pImg}
                      onChange={(e) => setPImg(e.target.value)}
                      placeholder="Paste cover URL or upload file below..."
                      className="w-full glass-input rounded-xl p-2.5 text-xs font-mono text-white placeholder-slate-500"
                    />
                    
                    <div className="flex gap-2">
                      <label
                        htmlFor="blueprint-file-uploader"
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-center text-[10px] font-bold uppercase tracking-wider border border-white/10 hover:border-white/25 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <ImageIcon className="w-4 h-4 text-gold-accent" />
                        <span>Upload From Device</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const matchedPreset = PHOTO_PRESETS.find(p => p.category === pType);
                          if (matchedPreset) setPImg(matchedPreset.url);
                        }}
                        className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0"
                      >
                        Use Preset
                      </button>
                    </div>
                    
                    <p className="text-[9px] text-slate-400 leading-normal">
                      Supports JPEG, PNG, or WebP. Files are resized and optimized automatically before saving.
                    </p>
                    <input
                      type="file"
                      id="blueprint-file-uploader"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith("image/")) {
                          alert("Please select a valid image file.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
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
                              const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
                              setPImg(compressedBase64);
                            }
                          };
                          img.src = event.target?.result as string;
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Plan Initial Status</label>
                <select
                  value={pStatus}
                  onChange={(e: any) => setPStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="active">Active (Visible to user sponsors)</option>
                  <option value="inactive">Inactive (Disabled / Hidden)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1 tracking-wider font-semibold">Detailed Blueprint Description</label>
              <textarea
                required
                rows={3}
                value={pDesc}
                onChange={(e) => setPDesc(e.target.value)}
                placeholder="Discuss veterinary monitoring parameters, live feeding audits protocols, export channels and security..."
                className="w-full glass-input rounded-xl p-2.5 text-xs leading-relaxed text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gold-accent hover:bg-yellow-500 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center justify-center gap-1"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : pId ? (
                "Update Operational Blueprint"
              ) : (
                "Deploy Live Package Blueprint"
              )}
            </button>
          </form>

          {/* Plans List */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">Current System Blueprints ({plans.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((p) => {
                const isPlanDisabled = p.status === "inactive";
                return (
                  <div 
                    key={p.id} 
                    className={`glass-panel p-4 rounded-2xl flex flex-col justify-between border transition-all ${
                      isPlanDisabled ? "border-amber-500/20 bg-slate-950/40 opacity-70" : "hover:border-white/10"
                    }`}
                  >
                    <div className="flex gap-3 mb-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black">
                        <img src={p.imageUrl} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          {p.name}
                          <span className={`text-[8px] font-mono tracking-widest font-black uppercase px-2 py-0.5 rounded ${
                            isPlanDisabled 
                              ? "bg-slate-900 border border-slate-700 text-slate-400" 
                              : "bg-emerald-950 border border-emerald-500/20 text-emerald-400"
                          }`}>
                            {p.status || "active"}
                          </span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono uppercase block mt-1.5">
                          Class: {p.type} • +{p.profitPercent}% Yield • {p.durationDays} Days Incubation
                        </span>
                        <span className="text-[10px] text-gold-accent font-mono block mt-0.5">
                          Limits: ₦{p.minAmount.toLocaleString()} - ₦{p.maxAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-white/5 pt-3 justify-between items-center">
                      <button
                        onClick={() => handleTogglePlanState(p)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all ${
                          isPlanDisabled
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950"
                            : "bg-amber-500/10 text-amber-400 border border-gold-accent/20 hover:bg-amber-500 hover:text-slate-950"
                        }`}
                      >
                        {isPlanDisabled ? "Enable Plan" : "Disable Plan"}
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSelectToEdit(p)}
                          className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-gold-accent text-[9px] font-mono font-bold transition-all"
                        >
                          <Edit className="w-3 h-3 inline mr-1" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you completely sure you want to hard delete/remove '${p.name}'?`)) {
                              deletePlan(p.id);
                            }
                          }}
                          className="py-1.5 px-3 rounded-lg bg-red-950/20 hover:bg-red-500 hover:text-white text-red-400 text-[9px] font-mono font-bold transition-all"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// 6. Farm Updates Management Board (Add, Edit, Delete Updates with Presets)
function FarmUpdatesManagementView() {
  const { farmUpdates, createFarmUpdate, editFarmUpdate, deleteFarmUpdate, navigate } = useFarm();

  // Update input Form status
  const [uId, setUId] = useState("");
  const [uTitle, setUTitle] = useState("");
  const [uDesc, setUDesc] = useState("");
  const [uType, setUType] = useState<"Chicken" | "Pig" | "General">("General");
  const [uImgRaw, setUImgRaw] = useState(PHOTO_PRESETS[0].url);
  const [uVidRaw, setUVidRaw] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);

  // Form submit handler
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uTitle.trim() || !uDesc.trim() || !uImgRaw.trim()) {
      alert("Please specify operational summary, description and thumbnail photo.");
      return;
    }

    setIsSaving(true);
    try {
      if (uId) {
        // Edit flow
        await editFarmUpdate(
          uId,
          uTitle.trim(),
          uDesc.trim(),
          uType,
          uImgRaw.trim(),
          uVidRaw.trim() || undefined
        );
        alert(`Success! Operational Log '${uTitle}' updated successfully in the DB.`);
      } else {
        // Create flow
        await createFarmUpdate(
          uTitle.trim(),
          uDesc.trim(),
          uType,
          uImgRaw.trim(),
          uVidRaw.trim() || undefined
        );
        alert("Success! Operational update published.");
      }

      // Reset Form fields
      setUId("");
      setUTitle("");
      setUDesc("");
      setUType("General");
      setUImgRaw(PHOTO_PRESETS[0].url);
      setUVidRaw("");
    } catch (err: any) {
      alert(`Fatal Error sending operational audit update: ${err.message || String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectToEditUpdate = (item: FarmUpdate) => {
    setUId(item.id);
    setUTitle(item.title);
    setUDesc(item.content);
    setUType(item.type || "General");
    setUImgRaw(item.imageUrl);
    setUVidRaw(item.videoUrl || "");
    
    // Smooth scroll to editor form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRemoveUpdate = async (item: FarmUpdate) => {
    if (!confirm(`Are you sure you want to permanently delete '${item.title}' operational update from the database?`)) return;
    try {
      await deleteFarmUpdate(item.id);
      alert("Operational Log deleted successfully.");
    } catch (err: any) {
      alert(`Error deleting update: ${err.message || String(err)}`);
    }
  };

  return (
    <div className="space-y-6 pb-24 text-left">
      <div>
        <button onClick={() => navigate("admin-dashboard")} className="text-xs text-gold-accent font-semibold hover:underline flex items-center gap-1">
          ← Back Control Center
        </button>
        <h2 className="text-2xl font-black font-display text-white mt-1">Live Operational Updates</h2>
        <p className="text-xs text-slate-400">Post or edit bio-security reports, feeding cycles & live video logs directly to users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Creator Form - Col 7 */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-5 border border-amber-500/15 bg-slate-950/20">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                {uId ? "🛠️ Edit Operational Log" : "➕ Post New Operational Log"}
              </h3>
              <p className="text-[10px] text-slate-400">Manage real photos, feeding summaries & video loops uploads</p>
            </div>
            {uId && (
              <button
                type="button"
                onClick={() => {
                  setUId(""); setUTitle(""); setUDesc(""); setUType("General"); setUImgRaw(PHOTO_PRESETS[0].url); setUVidRaw("");
                }}
                className="text-[10px] font-mono hover:text-white text-slate-400 uppercase font-bold"
              >
                Exit edit [X]
              </button>
            )}
          </div>

          <form onSubmit={handleLogSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1.5 font-bold tracking-wider">
                Log Category / Activity Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Chicken", "Pig", "General"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setUType(cat);
                      const matchedPreset = PHOTO_PRESETS.find(p => p.category === cat);
                      if (matchedPreset) setUImgRaw(matchedPreset.url);
                    }}
                    className={`py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all border ${
                      uType === cat
                        ? "bg-slate-900 text-gold-accent border-gold-accent/50 shadow-md"
                        : "bg-slate-950/50 text-slate-400 border-white/5 hover:border-white/10"
                    }`}
                  >
                    {cat === "Chicken" ? "🐔 Poultry" : cat === "Pig" ? "🐷 Piggery" : "📡 Technical"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1.5 font-bold tracking-wider">
                Operational Title
              </label>
              <input
                type="text"
                required
                value={uTitle}
                onChange={(e) => setUTitle(e.target.value)}
                placeholder="e.g., Feeding Audit Session #14 on Broiler Yard A Completes"
                className="w-full glass-input rounded-xl p-3.5 text-xs text-white placeholder-slate-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1.5 font-bold tracking-wider">
                Detailed Live Log / Description
              </label>
              <textarea
                required
                rows={4}
                value={uDesc}
                onChange={(e) => setUDesc(e.target.value)}
                placeholder="Discuss bio-security level scores, feed consumption, veterinary reports, etc."
                className="w-full glass-input rounded-xl p-3.5 text-xs text-white placeholder-slate-500 leading-relaxed font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1.5 font-bold tracking-wider">
                Featured Cover Photo / Image Attachment
              </label>

              {/* Elegant Device Photo Upload Zone for Updates */}
              <div className="grid grid-cols-1 sm:grid-cols-10 gap-3.5 mt-1.5">
                <div className="sm:col-span-3 h-24 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 flex flex-col items-center justify-center relative group">
                  {uImgRaw ? (
                    <>
                      <img src={uImgRaw} alt="Live Update Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setUImgRaw("")}
                        className="absolute top-1.5 right-1.5 bg-slate-950/80 hover:bg-red-500/80 text-white rounded-full p-1.5 transition-all text-[9.5px] border border-white/10 cursor-pointer"
                        title="Clear photo"
                      >
                        ✕
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-slate-950/90 py-1 text-center text-[8.5px] font-mono text-gold-accent font-semibold opacity-0 group-hover:opacity-100 transition-all">
                        Loaded ✓
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <span className="text-lg block">📷</span>
                      <span className="text-[9px] font-mono text-slate-400 block font-bold leading-none mt-0.5">NO IMAGE</span>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-7 flex flex-col justify-between space-y-1.5">
                  <input
                    type="text"
                    required
                    value={uImgRaw}
                    onChange={(e) => setUImgRaw(e.target.value)}
                    placeholder="Paste image URL or select from device below..."
                    className="w-full glass-input rounded-xl p-2.5 text-xs text-white placeholder-slate-500 font-mono"
                  />
                  
                  <div className="flex gap-2">
                    <label
                      htmlFor="update-file-uploader"
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-center text-[10px] font-bold uppercase tracking-wider border border-white/10 hover:border-white/25 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <ImageIcon className="w-4 h-4 text-gold-accent" />
                      <span>Upload Device Image</span>
                    </label>
                  </div>
                  
                  <input
                    type="file"
                    id="update-file-uploader"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith("image/")) {
                        alert("Please select a high quality image file.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
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
                            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
                            setUImgRaw(compressedBase64);
                          }
                        };
                        img.src = event.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
              </div>

              {/* Cover Photo presets quick selector */}
              <div className="mt-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[8.5px] font-mono uppercase text-slate-400 block mb-2 font-bold tracking-wider">
                  Preset Premium Farm Photo Selectors:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PHOTO_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setUImgRaw(p.url);
                        if (p.category === "Chicken" || p.category === "Pig") {
                          setUType(p.category);
                        } else {
                          setUType("General");
                        }
                      }}
                      className={`flex items-center gap-1.5 p-1 rounded border text-left text-[9px] font-semibold truncate transition-all ${
                        uImgRaw === p.url
                          ? "bg-slate-900 border-gold-accent text-gold-accent font-black"
                          : "bg-slate-950/40 border-white/5 hover:border-white/10 text-slate-350"
                      }`}
                    >
                      <img src={p.url} alt={p.name} referrerPolicy="no-referrer" className="w-4 h-4 rounded object-cover shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1.5 font-bold tracking-wider">
                Associated Video MP4 Attachment URL (Optional)
              </label>
              <input
                type="text"
                value={uVidRaw}
                onChange={(e) => setUVidRaw(e.target.value)}
                placeholder="e.g. https://assets.mixkit.co/videos/...mp4"
                className="w-full glass-input rounded-xl p-3 text-xs text-white placeholder-slate-550 font-mono"
              />

              {/* Video attachments loops selection */}
              <div className="mt-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[8.5px] font-mono uppercase text-slate-400 block mb-2 font-bold tracking-wider">
                  Preset Livestock Video Feed Attachment Selectors:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {VIDEO_PRESETS.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setUVidRaw(v.url)}
                      className={`flex items-center gap-1.5 p-1.5 rounded border text-left text-[8.5px] font-mono font-bold transition-all truncate ${
                        uVidRaw === v.url
                          ? "bg-slate-900 border-cyan-400 text-cyan-400"
                          : "bg-slate-950/40 border-white/5 hover:border-white/10 text-slate-300"
                      }`}
                    >
                      <Play className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{v.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 bg-gold-accent hover:bg-yellow-500 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4 text-slate-950" /> Saving to Database...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-slate-950" /> {uId ? "Commit Edit Changes" : "Dispatch Operational Log"}
                </>
              )}
            </button>
          </form>
        </div>

        {/* List of Updates - Col 5 */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-405 block tracking-widest px-1">
            📦 Current Updates Pipeline ({farmUpdates.length})
          </span>

          <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
            {farmUpdates.map((item) => (
              <div key={item.id} className="glass-panel p-4 rounded-xl space-y-3 relative overflow-hidden bg-slate-900/10">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-950 border border-white/5 relative">
                    <img src={item.imageUrl} alt={item.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    {item.videoUrl && (
                      <span className="absolute bottom-1 right-1 bg-cyan-400 text-slate-950 rounded p-0.5 text-[7px] font-black uppercase font-mono">
                        VID
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-[8px] bg-sky-950/80 text-sky-400 border border-sky-500/10 rounded px-1.5 py-0.5 uppercase tracking-wider font-mono">
                      {item.type || "General"}
                    </span>
                    <h4 className="text-[11.5px] font-bold text-white line-clamp-2 mt-1 leading-snug">{item.title}</h4>
                    <span className="text-[8.5px] text-slate-500 font-mono block mt-1">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end border-t border-white/5 pt-2">
                  <button
                    onClick={() => handleSelectToEditUpdate(item)}
                    className="py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-gold-accent text-[9px] font-mono font-bold transition-all flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleRemoveUpdate(item)}
                    className="py-1 px-2.5 rounded bg-red-950/20 hover:bg-red-500 hover:text-white text-red-400 text-[9px] font-mono font-bold transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 7. Broadcast Bulletins System View (Announcements & Investment Updates)
function NotificationsManagementView() {
  const { sendBroadcastNotification, navigate } = useFarm();
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
  const [targetId, setTargetId] = useState("all");
  const [notifCategory, setNotifCategory] = useState<"Announcement" | "Investment Update">("Announcement");
  const [isSending, setIsSending] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMsg.trim()) {
      alert("Please specify a notification title and complete alert body.");
      return;
    }

    setIsSending(true);
    // Combine bullet details if they selected Investment updates style
    const pushTitle = notifCategory === "Investment Update"
      ? `📈 PORTFOLIO ALERT: ${notifTitle.trim()}`
      : `📣 BULLETIN: ${notifTitle.trim()}`;

    try {
      await sendBroadcastNotification(pushTitle, notifMsg.trim(), targetId);
      alert("Success! Bulletin alert has been dispatched and stored on Firebase/Firestore successfully.");
      setNotifTitle("");
      setNotifMsg("");
    } catch (err: any) {
      alert(`Broadcast failed: ${err.message || String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 text-left">
      <div>
        <button onClick={() => navigate("admin-dashboard")} className="text-xs text-gold-accent font-semibold hover:underline flex items-center gap-1">
          ← Back Control Center
        </button>
        <h2 className="text-2xl font-black font-display text-white mt-1">Platform Bulletins</h2>
        <p className="text-xs text-slate-400">Broadcast official alerts or active investment portfolio statements directly to sponsor layouts</p>
      </div>

      <form onSubmit={handleBroadcast} className="glass-panel p-6 rounded-2xl space-y-4 border border-purple-500/15 bg-slate-950/20 max-w-2xl">
        <h3 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">➕ Deploy Broadcast Bulletin</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1.5 font-bold tracking-wider">Bulletin Dispatch Class</label>
            <div className="flex gap-2 bg-slate-950 p-1 border border-white/5 rounded-xl">
              <button
                type="button"
                onClick={() => setNotifCategory("Announcement")}
                className={`flex-1 py-2 text-[10px] font-mono font-bold uppercase rounded-lg transition-all ${
                  notifCategory === "Announcement"
                    ? "bg-purple-650 text-white"
                    : "text-slate-450 hover:text-white"
                }`}
              >
                📢 Announcement
              </button>
              <button
                type="button"
                onClick={() => setNotifCategory("Investment Update")}
                className={`flex-1 py-2 text-[10px] font-mono font-bold uppercase rounded-lg transition-all ${
                  notifCategory === "Investment Update"
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-450 hover:text-white"
                }`}
              >
                📈 Portfolio Update
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1.5 font-bold tracking-wider">Target Sponsor Segment</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white h-11"
            >
              <option value="all">Broadcast Global Segment (All Sponsors)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1.5 font-bold tracking-wider">Bulletin Header Title</label>
          <input
            type="text"
            required
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            placeholder="e.g. Major Feed Shipments Cleared at Broiler Port"
            className="w-full glass-input rounded-xl p-3 text-xs text-white"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono text-slate-350 uppercase mb-1.5 font-bold tracking-wider">Alert Message Copy</label>
          <textarea
            required
            rows={5}
            value={notifMsg}
            onChange={(e) => setNotifMsg(e.target.value)}
            placeholder="Provide complete descriptions regarding veterinary checks, shipment numbers, or critical security updates..."
            className="w-full glass-input rounded-xl p-3 text-xs leading-relaxed text-white whitespace-pre-wrap"
          />
        </div>

        <button
          type="submit"
          disabled={isSending}
          className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 font-black rounded-xl text-xs uppercase tracking-widest text-white transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
        >
          {isSending ? (
            <Loader2 className="animate-spin w-4 h-4 text-white" />
          ) : (
            <>
              <Check className="w-4 h-4 text-white" /> Dispatch Live Push Notification
            </>
          )}
        </button>
      </form>
    </div>
  );
}
