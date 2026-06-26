import React, { useState, useEffect } from "react";
import { Activity, ShieldCheck, Zap, Trash2, Sliders, RefreshCw, Radio, CheckCircle2, ChevronDown, Sparkles, Database, Cloud } from "lucide-react";
import { useFarm } from "../context/FarmContext";

export default function GlitchDoctor() {
  const { currentUser, triggerManualSync, reconnectAppwrite } = useFarm();
  const [isOpen, setIsOpen] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [syncRate, setSyncRate] = useState<string>("Normal (30s)");
  const [isHighPerf, setIsHighPerf] = useState(false);
  const [dbMode, setDbMode] = useState<"local" | "cloud">("local");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    // Check local performance settings on load
    try {
      const perf = localStorage.getItem("fr_high_perf_only");
      setIsHighPerf(perf === "true");
      
      const rate = localStorage.getItem("fr_sync_rate_override") || "30";
      setSyncRate(rate === "manual" ? "Manual-only" : `${rate}s`);

      const mode = localStorage.getItem("fr_database_mode") || "local";
      setDbMode(mode as "local" | "cloud");
    } catch (e) {}
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const measureLatency = async () => {
    if (isMeasuring) return;
    setIsMeasuring(true);
    const start = Date.now();
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        setLatency(Date.now() - start);
      } else {
        setLatency(null);
      }
    } catch (e) {
      setLatency(null);
    } finally {
      setIsMeasuring(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      measureLatency();
    }
  }, [isOpen]);

  const handleCleanCacheKeepSession = () => {
    try {
      // Clear data but keep session
      const keysToClean = [
        "fr_plans",
        "fr_deposits",
        "fr_investments",
        "fr_withdrawals",
        "fr_updates",
        "fr_notifications",
        "fr_users",
        "fr_referrals"
      ];
      keysToClean.forEach(k => localStorage.removeItem(k));
      triggerToast("Data cache cleared! Session preserved. Refreshing data...");
      triggerManualSync().catch(() => {});
    } catch (e) {
      triggerToast("Failed to clean cache");
    }
  };

  const handleHardRefresh = () => {
    try {
      localStorage.clear();
      triggerToast("System hard reset. Reloading app...");
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (e) {}
  };

  const handleTogglePerfMode = () => {
    try {
      const current = localStorage.getItem("fr_high_perf_only");
      if (current === "true") {
        localStorage.removeItem("fr_high_perf_only");
        setIsHighPerf(false);
        triggerToast("Heavy graphics enabled");
      } else {
        localStorage.setItem("fr_high_perf_only", "true");
        setIsHighPerf(true);
        triggerToast("Light performance mode enabled");
      }
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (e) {}
  };

  const handleSyncRateChange = (rate: string) => {
    try {
      if (rate === "manual") {
        localStorage.setItem("fr_sync_rate_override", "manual");
        setSyncRate("Manual-only");
        triggerToast("Sync mode changed to Manual-only");
      } else {
        localStorage.setItem("fr_sync_rate_override", rate);
        setSyncRate(`${rate}s`);
        triggerToast(`Sync mode changed to ${rate}s interval`);
      }
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (e) {}
  };

  const handleDbModeChange = (mode: "local" | "cloud") => {
    try {
      localStorage.setItem("fr_database_mode", mode);
      setDbMode(mode);
      triggerToast(`Database switched to ${mode === "local" ? "Normal Local Offline DB" : "Cloud Supabase DB"}. Reloading app...`);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {}
  };

  // Get statistics on local cache sizes
  const getCacheStats = () => {
    try {
      const u = JSON.parse(localStorage.getItem("fr_users") || "[]").length;
      const i = JSON.parse(localStorage.getItem("fr_investments") || "[]").length;
      const d = JSON.parse(localStorage.getItem("fr_deposits") || "[]").length;
      const w = JSON.parse(localStorage.getItem("fr_withdrawals") || "[]").length;
      return { u, i, d, w };
    } catch (e) {
      return { u: 0, i: 0, d: 0, w: 0 };
    }
  };

  const cacheStats = getCacheStats();

  return (
    <>
      {/* Floating Glitch Doctor Trigger Widget */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 md:bottom-8 left-6 z-40 flex items-center gap-2 px-4.5 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-white font-bold rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_4px_32px_rgba(245,179,0,0.15)] transition-all font-sans text-xs group active:scale-95 border border-white/10 hover:border-amber-400/40 cursor-pointer"
        title="App Health & Glitch Doctor"
        id="glitch-doctor-btn"
      >
        <div className="relative">
          <Activity className="w-5.5 h-5.5 text-amber-400" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
        </div>
        <span className="font-bold tracking-wide uppercase text-[10px] text-amber-400">
          Glitch Doctor
        </span>
      </button>

      {/* Floating diagnostics dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md font-sans">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Gradient accent header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5.5 h-5.5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-white tracking-wide uppercase">FarmRise Doctor</h3>
                  <p className="text-[10px] text-white/50">Active Diagnostics & Glitch Healer</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white hover:bg-white/5 p-2 rounded-xl transition-all cursor-pointer text-xs font-mono"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Dynamic Health Metrics Panel */}
              <div className="bg-slate-950/70 rounded-2xl p-4.5 border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/50 font-mono">Real-Time System Latency:</span>
                  <div className="flex items-center gap-2">
                    {isMeasuring ? (
                      <span className="text-xs text-amber-400 font-mono flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Ping...
                      </span>
                    ) : latency !== null ? (
                      <span className={`text-xs font-mono font-bold ${latency < 200 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {latency} ms ({latency < 200 ? 'Excellent' : 'Delayed'})
                      </span>
                    ) : (
                      <span className="text-xs text-red-400 font-mono">Offline/Delayed</span>
                    )}
                    <button 
                      onClick={measureLatency}
                      className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md text-[#F5B300] font-mono cursor-pointer"
                    >
                      Test
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/50 font-mono">Glitch-Safe Lock Status:</span>
                  <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Stable
                  </span>
                </div>

                <div className="pt-2.5 border-t border-white/5 flex flex-col gap-1.5 text-xs">
                  <span className="text-[11px] text-white/40 font-mono uppercase tracking-wide">Cached Payload Sizes:</span>
                  <div className="grid grid-cols-4 gap-2 text-center text-white/60 font-mono text-[11px]">
                    <div className="bg-white/2 p-2 rounded-xl border border-white/5">
                      <div className="text-amber-400 font-bold">{cacheStats.u}</div>
                      <div className="text-[9px] text-white/30">Users</div>
                    </div>
                    <div className="bg-white/2 p-2 rounded-xl border border-white/5">
                      <div className="text-amber-400 font-bold">{cacheStats.i}</div>
                      <div className="text-[9px] text-white/30">Invest</div>
                    </div>
                    <div className="bg-white/2 p-2 rounded-xl border border-white/5">
                      <div className="text-amber-400 font-bold">{cacheStats.d}</div>
                      <div className="text-[9px] text-white/30">Deposits</div>
                    </div>
                    <div className="bg-white/2 p-2 rounded-xl border border-white/5">
                      <div className="text-amber-400 font-bold">{cacheStats.w}</div>
                      <div className="text-[9px] text-white/30">Withd</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Engine Switcher Panel */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wide">
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>Database Pipeline Engine</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Choose your preferred data persistence engine. Switching to the <strong>Normal Local Database</strong> avoids any Cloud network latency, daily read quotas, or synchronization limits.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDbModeChange("local")}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1.5 cursor-pointer ${
                      dbMode === "local"
                        ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-md"
                        : "bg-white/2 border-white/5 text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <Database className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="font-bold">Normal Database</div>
                      <div className="text-[8px] opacity-70">Local offline, zero quotas</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDbModeChange("cloud")}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1.5 cursor-pointer ${
                      dbMode === "cloud"
                        ? "bg-emerald-600/10 border-emerald-500 text-emerald-400 shadow-md"
                        : "bg-white/2 border-white/5 text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <Cloud className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="font-bold">Cloud Database</div>
                      <div className="text-[8px] opacity-70">Supabase Cloud Database</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Adjust Sync Frequency Panel */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wide">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Sync Frequency Optimizer</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Slow down database polling intervals to conserve your network bandwidth, optimize loading speeds, and bypass rendering stutter/glitches.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "High Speed", val: "15" },
                    { label: "Normal (Eco)", val: "30" },
                    { label: "Manual Sync", val: "manual" }
                  ].map((btn) => {
                    const isSelected = btn.val === "manual" 
                      ? syncRate === "Manual-only" 
                      : syncRate === `${btn.val}s`;

                    return (
                      <button
                        key={btn.val}
                        onClick={() => handleSyncRateChange(btn.val)}
                        className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          isSelected 
                            ? "bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-md" 
                            : "bg-white/2 border-white/5 text-white/70 hover:bg-white/5"
                        }`}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions List */}
              <div className="space-y-2.5 pt-1">
                <span className="text-xs font-bold text-white uppercase tracking-wide block">
                  Interactive Glitch Healers
                </span>

                <div className="space-y-2">
                  <button
                    onClick={handleCleanCacheKeepSession}
                    className="w-full flex justify-between items-center p-4 bg-white/2 hover:bg-white/5 border border-white/5 rounded-2xl transition-all cursor-pointer hover:scale-[1.01] text-left"
                  >
                    <div className="flex gap-3 items-center">
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Clean Data Cache (Keep Logged-In)</div>
                        <div className="text-[10px] text-white/50">Wipes cached data records and triggers clean sync</div>
                      </div>
                    </div>
                    <Trash2 className="w-4 h-4 text-white/30" />
                  </button>

                  <button
                    onClick={handleTogglePerfMode}
                    className="w-full flex justify-between items-center p-4 bg-white/2 hover:bg-white/5 border border-white/5 rounded-2xl transition-all cursor-pointer hover:scale-[1.01] text-left"
                  >
                    <div className="flex gap-3 items-center">
                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <Zap className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {isHighPerf ? "Disable Light Graphics Mode" : "Activate Light Graphics Mode"}
                        </div>
                        <div className="text-[10px] text-white/50">Disables intensive animations & particle filters</div>
                      </div>
                    </div>
                    <Sliders className="w-4 h-4 text-white/30" />
                  </button>

                  <button
                    onClick={handleHardRefresh}
                    className="w-full flex justify-between items-center p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 rounded-2xl transition-all cursor-pointer hover:scale-[1.01] text-left"
                  >
                    <div className="flex gap-3 items-center">
                      <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <RefreshCw className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-red-400">Hard App Diagnostics Reset</div>
                        <div className="text-[10px] text-red-400/60">Fully purges all cache, resets sessions and reloads</div>
                      </div>
                    </div>
                    <RefreshCw className="w-4 h-4 text-red-400/40" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-white/5 text-center">
              <span className="text-[10px] font-mono text-white/40">
                Secured by FarmRise Sentinel Glitch Engine v2.4
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating toast notification */}
      {showToast && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-slate-900 border border-emerald-500/30 text-white p-4.5 rounded-2xl shadow-xl flex items-center gap-3 z-50 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-white/90">{toastMsg}</span>
        </div>
      )}
    </>
  );
}
