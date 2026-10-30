"use client";

import { useState, useEffect } from "react";
import { Shield, Wifi, WifiOff, Activity, RefreshCw } from "lucide-react";

interface SOCHeaderProps {
  connected: boolean;
  mockMode: boolean;
  onToggleMock: () => void;
  eventCount: number;
}

export default function SOCHeader({
  connected,
  mockMode,
  onToggleMock,
  eventCount,
}: SOCHeaderProps) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-[#929da7]/20 bg-[#17191c]/95 backdrop-blur px-4 py-3 sm:px-6 sticky top-0 z-30 shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-[#17191c] border border-crimson/60 shadow-[0_0_18px_rgba(255,75,50,0.4)]">
            <Shield className="h-5 w-5 text-crimson" />
            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-crimson animate-glow-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-wider font-mono text-neutral-100 uppercase">
                Agent<span className="text-crimson">Shield</span>
              </h1>
              <span className="rounded bg-[#06110c] px-1.5 py-0.5 text-[10px] font-mono font-semibold tracking-wider text-emerald-400 border border-emerald-900/60">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#929da7]">
              Real-time security firewall protecting AI agents from malicious instructions.
            </p>
          </div>
        </div>

        {/* Plain-English Navigation */}
        <nav className="hidden xl:flex items-center gap-6 font-mono text-xs tracking-widest uppercase text-[#929da7]">
          <a
            href="#playground"
            className="hover:text-crimson hover:drop-shadow-[0_0_8px_rgba(255,75,50,0.5)] transition-all"
          >
            Attack Simulator
          </a>
          <span className="text-zinc-700">/</span>
          <a
            href="#audit"
            className="hover:text-emerald-400 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all"
          >
            Activity Log
          </a>
          <span className="text-zinc-700">/</span>
          <a
            href="#telemetry"
            className="hover:text-neutral-100 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all"
          >
            Live Feed
          </a>
          <span className="text-zinc-700">/</span>
          <a
            href="#policy"
            className="hover:text-crimson hover:drop-shadow-[0_0_8px_rgba(255,75,50,0.5)] transition-all"
          >
            Safety Gate
          </a>
        </nav>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Real-time Telemetry Status */}
          <div className="hidden md:flex items-center gap-2 border-l border-[#929da7]/20 pl-4 font-mono text-xs text-[#929da7]">
            <Activity className="h-3.5 w-3.5 text-crimson animate-pulse" />
            <span>BUFFER: <strong className="text-zinc-200">{eventCount}</strong></span>
          </div>

          {/* Time display */}
          <div className="hidden sm:block font-mono text-xs text-[#929da7] bg-[#17191c] px-2.5 py-1 rounded border border-[#929da7]/25">
            {time || "SYNCHRONIZING..."}
          </div>

          {/* Connection Status Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
              connected
                ? "bg-[#06110c] border-emerald-900/80 text-emerald-400 shadow-sm"
                : mockMode
                ? "bg-[#17191c] border-amber-500/60 text-amber-300 shadow-sm"
                : "bg-[#17191c] border-crimson/50 text-[#ff4b32]"
            }`}
          >
            {connected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span>FIREWALL ACTIVE</span>
              </>
            ) : mockMode ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                <span>SIMULATION FEED</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-crimson" />
                <span>STANDBY</span>
              </>
            )}
          </div>

          {/* Toggle Mock Button with crisp tactile feedback */}
          <button
            onClick={onToggleMock}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-lg border active:scale-[0.97] transition-all duration-100 ease-out cursor-pointer ${
              mockMode
                ? "bg-crimson/20 border-crimson text-white hover:bg-crimson/30 shadow-[0_0_12px_rgba(255,75,50,0.35)]"
                : "bg-[#17191c] border-[#929da7]/40 text-[#929da7] hover:text-white hover:border-[#929da7]"
            }`}
            title="Toggle between Backend WebSocket and Simulated Stream"
          >
            {mockMode ? "Stop Feed" : "Start Feed"}
          </button>
        </div>
      </div>
    </header>
  );
}
