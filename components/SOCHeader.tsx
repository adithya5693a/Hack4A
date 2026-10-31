"use client";

import { useState, useEffect } from "react";
import { Shield, Wifi, WifiOff, Activity, RefreshCw, Zap, Cpu } from "lucide-react";
import GoogleAuthWidget from "./GoogleAuthWidget";
import { BACKEND_URL } from "@/lib/api-config";

interface SOCHeaderProps {
  connected: boolean;
  mockMode: boolean;
  onToggleMock: () => void;
  eventCount: number;
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOpenMCPPolicy?: () => void;
  onRunJudgeTour?: () => void;
  isTourRunning?: boolean;
}

export default function SOCHeader({
  connected,
  mockMode,
  onToggleMock,
  eventCount,
  isAuthenticated,
  onLogin,
  onLogout,
  onOpenMCPPolicy,
  onRunJudgeTour,
  isTourRunning = false,
}: SOCHeaderProps) {
  const [time, setTime] = useState<string>("");
  const [latency, setLatency] = useState<number | null>(null);

  // Time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Live Backend Ping Latency Poller (Feature 8)
  useEffect(() => {
    let isMounted = true;
    const pingBackend = async () => {
      try {
        const start = performance.now();
        const res = await fetch(`${BACKEND_URL}/health`, { cache: "no-store" });
        if (res.ok && isMounted) {
          const duration = Math.round(performance.now() - start);
          setLatency(duration);
        } else if (isMounted) {
          setLatency(null);
        }
      } catch {
        if (isMounted) setLatency(null);
      }
    };

    pingBackend();
    const interval = setInterval(pingBackend, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="border-b border-forest bg-charcoal/95 backdrop-blur px-4 py-3 sm:px-6 sticky top-0 z-30 shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-forest border border-crimson/60 shadow-[0_0_18px_rgba(163,28,24,0.35)]">
            <Shield className="h-5 w-5 text-crimson" />
            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-crimson animate-glow-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-wider font-mono text-neutral-100 uppercase">
                Agent<span className="text-crimson">Shield</span>
              </h1>
              <span className="rounded bg-forest px-1.5 py-0.5 text-[10px] font-mono font-semibold tracking-wider text-emerald-400 border border-emerald-900/60">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] font-mono text-neutral-400">
              Real-time security firewall protecting AI agents from malicious instructions.
            </p>
          </div>
        </div>

        {/* Plain-English Navigation */}
        <nav className="hidden xl:flex items-center gap-5 font-mono text-xs tracking-widest uppercase text-neutral-400">
          <a
            href="#playground"
            className="hover:text-red-300 hover:drop-shadow-[0_0_8px_rgba(163,28,24,0.5)] transition-all"
          >
            Attack Simulator
          </a>
          <span className="text-neutral-700">/</span>
          <a
            href="#audit"
            className="hover:text-emerald-400 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all"
          >
            Activity Log
          </a>
          <span className="text-neutral-700">/</span>
          <a
            href="#telemetry"
            className="hover:text-neutral-100 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all"
          >
            Live Feed
          </a>
          <span className="text-neutral-700">/</span>
          <a
            href="#policy"
            className="hover:text-red-300 hover:drop-shadow-[0_0_8px_rgba(163,28,24,0.5)] transition-all"
          >
            Safety Gate
          </a>
        </nav>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Feature 5: 1-Click Judge Validation Tour */}
          {onRunJudgeTour && (
            <button
              onClick={onRunJudgeTour}
              disabled={isTourRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-amber-600/30 to-crimson/30 border border-amber-500 hover:border-amber-400 text-amber-200 active:scale-[0.97] transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer disabled:opacity-50"
              title="Run 5-Stage Automated Demonstration for Hackathon Reviewers"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>{isTourRunning ? "Validating Tour..." : "⚡ Judge Audit Tour"}</span>
            </button>
          )}

          {/* Feature 6: MCP Policies Drawer Trigger */}
          {onOpenMCPPolicy && (
            <button
              onClick={onOpenMCPPolicy}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg bg-neutral-900 border border-neutral-700 hover:border-emerald-600 hover:text-emerald-300 text-neutral-300 active:scale-[0.97] transition-all cursor-pointer shadow-sm"
              title="Open MCP Tool Permission Profiles Matrix"
            >
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              <span>MCP Policies</span>
            </button>
          )}

          {/* Feature 8: Live Backend Connection & Ping Latency Indicator */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
              connected && latency !== null
                ? "bg-forest border-emerald-900/80 text-emerald-400 shadow-[0_0_10px_rgba(6,17,12,0.8)]"
                : mockMode
                ? "bg-neutral-900 border-amber-600/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                : "bg-neutral-900 border-crimson/50 text-red-300"
            }`}
          >
            {connected && latency !== null ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span>PEP ONLINE ({latency}ms)</span>
              </>
            ) : mockMode ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                <span>SIMULATION FEED</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-crimson" />
                <span>PEP OFFLINE</span>
              </>
            )}
          </div>

          {/* Google Authentication Widget with 1-Click Demo Lead Bypass */}
          <GoogleAuthWidget
            isAuthenticated={isAuthenticated}
            onLogin={onLogin}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
}
