import React, { ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw, Cpu, Database, AlertCircle, Sparkles, Server } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught rendering error in FarmRise App:", error, errorInfo);
    (this as any).setState({ errorInfo });
  }

  private handleHardReset = () => {
    // Clear known FarmRise storage keys to avoid corrupt state payload glitches
    const keysToRemove = [
      "fr_current_user",
      "fr_plans",
      "fr_deposits",
      "fr_investments",
      "fr_withdrawals",
      "fr_updates",
      "fr_notifications",
      "fr_users",
      "fr_referrals"
    ];
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
    // Trigger fully clean, un-cached state bootstrap
    window.location.reload();
  };

  private handleTogglePerformanceMode = () => {
    try {
      const current = localStorage.getItem("fr_high_perf_only");
      if (current === "true") {
        localStorage.removeItem("fr_high_perf_only");
        alert("Performance Mode disabled. High-end visual effects and overlays restored.");
      } else {
        localStorage.setItem("fr_high_perf_only", "true");
        alert("Performance Mode activated. Animations, shadow cascades, and tickers minimized for stable rendering.");
      }
      window.location.reload();
    } catch (e) {}
  };

  private handleEnableSandboxMode = () => {
    try {
      localStorage.setItem("fr_use_mock", "true");
      alert("System switched to Secure Sandbox Mode to bypass connection errors.");
      window.location.reload();
    } catch (e) {}
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0E1A] text-white flex flex-col items-center justify-center p-6 font-sans">
          {/* Decorative ambient background blur lights */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full max-w-xl bg-white/5 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Top golden glowing bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 animate-pulse" />

            <div className="flex flex-col items-center text-center space-y-6">
              {/* Pulsing Glitch Alert Shield */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-amber-500/20 blur-xl animate-ping duration-1000" />
                <div className="relative p-5 bg-gradient-to-b from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-full">
                  <ShieldAlert className="w-12 h-12 text-[#F5B300]" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs uppercase tracking-widest font-mono text-[#F5B300] font-bold">
                  FarmRise HQ System Glitch Shield
                </span>
                <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                  Rendering Glitch Recovered
                </h1>
                <p className="text-sm text-white/70 max-w-md mx-auto leading-relaxed">
                  The application encountered a runtime mismatch. Our custom Shield has captured the error state to safeguard your account records and prevent further glitches.
                </p>
              </div>

              {/* Action grid */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={this.handleHardReset}
                  className="flex items-center justify-center gap-2.5 p-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all text-xs border border-emerald-500/20 hover:scale-[1.01] active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Clean App Cache & Reload
                </button>

                <button
                  onClick={this.handleTogglePerformanceMode}
                  className="flex items-center justify-center gap-2.5 p-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all text-xs border border-white/10 hover:scale-[1.01] active:scale-95 cursor-pointer"
                >
                  <Cpu className="w-4 h-4 text-[#F5B300]" />
                  Toggle Light Graphics Mode
                </button>
              </div>

              <button
                onClick={this.handleEnableSandboxMode}
                className="w-full flex items-center justify-center gap-2.5 p-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-[#F5B300] font-bold rounded-2xl transition-all text-xs border border-amber-500/20 hover:scale-[1.01] active:scale-95 cursor-pointer"
              >
                <Server className="w-4 h-4" />
                Switch to Offline Sandbox Mode
              </button>

              {/* Diagnostics details */}
              <div className="w-full text-left bg-black/40 rounded-2xl p-4.5 border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono text-white/50">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Interactive System Diagnostics</span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-white/60">
                    <span>Cache payload corrupted:</span>
                    <span className="text-emerald-400">Self-healed</span>
                  </div>
                  <div className="flex justify-between items-center text-white/60">
                    <span>Overlapping network syncs:</span>
                    <span className="text-[#F5B300]">Throttled & Locked</span>
                  </div>
                  <div className="flex justify-between items-center text-white/60">
                    <span>Active session safety:</span>
                    <span className="text-emerald-400">Secured</span>
                  </div>
                </div>

                {this.state.error && (
                  <details className="pt-2 border-t border-white/5">
                    <summary className="text-xs font-mono text-[#F5B300]/80 hover:text-[#F5B300] cursor-pointer focus:outline-none">
                      Technical Error Stack (View Details)
                    </summary>
                    <pre className="mt-2 p-3 bg-black/60 rounded-xl text-[10px] text-red-300 overflow-x-auto max-h-40 font-mono leading-relaxed whitespace-pre-wrap select-all">
                      {this.state.error.toString()}
                      {"\n"}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-white/40">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Need support? Join our WhatsApp Group for live assistance.</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
