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
    <header className="border-b border-steel/20 bg-charcoal/95 backdrop-blur px-4 py-3 sm:px-6 sticky top-0 z-30 shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 border border-coral/50 shadow-[0_0_18px_rgba(255,75,50,0.35)]">
            <Shield className="h-5 w-5 text-coral" />
            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-coral animate-glow-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-wider font-mono text-neutral-100 uppercase">
                Agent<span className="text-coral">Shield</span>
              </h1>
              <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-mono font-semibold tracking-wider text-steel border border-steel/30">
                SOC v1.0
              </span>
            </div>
            <p className="text-[11px] font-mono text-steel">
              Autonomous AI Agent Runtime Policy Engine & Telemetry Stream
            </p>
          </div>
        </div>

        {/* Minimalist Editorial Navigation */}
        <nav className="hidden xl:flex items-center gap-6 font-mono text-xs tracking-widest uppercase text-steel">
          <a
            href="#playground"
            className="hover:text-coral hover:drop-shadow-[0_0_8px_rgba(255,75,50,0.5)] transition-all"
          >
            Playground
          </a>
          <span className="text-neutral-700">/</span>
          <a
            href="#audit"
            className="hover:text-neutral-100 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all"
          >
            Audit Trail
          </a>
          <span className="text-neutral-700">/</span>
          <a
            href="#telemetry"
            className="hover:text-neutral-100 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all"
          >
            Telemetry
          </a>
          <span className="text-neutral-700">/</span>
          <a
            href="#policy"
            className="hover:text-coral hover:drop-shadow-[0_0_8px_rgba(255,75,50,0.5)] transition-all"
          >
            HITL Gate
          </a>
        </nav>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Real-time Telemetry Status */}
          <div className="hidden md:flex items-center gap-2 border-l border-steel/20 pl-4 font-mono text-xs text-steel">
            <Activity className="h-3.5 w-3.5 text-coral animate-pulse" />
            <span>BUFFER: <strong className="text-neutral-200">{eventCount}</strong></span>
          </div>

          {/* Time display */}
          <div className="hidden sm:block font-mono text-xs text-steel bg-neutral-900/80 px-2.5 py-1 rounded border border-steel/20">
            {time || "SYNCHRONIZING..."}
          </div>

          {/* Connection Status Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
              connected
                ? "bg-neutral-900 border-steel/60 text-steel shadow-[0_0_10px_rgba(146,157,167,0.2)]"
                : mockMode
                ? "bg-neutral-900 border-coral/60 text-coral shadow-[0_0_12px_rgba(255,75,50,0.25)]"
                : "bg-neutral-900 border-steel/30 text-steel"
            }`}
          >
            {connected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-steel" />
                <span>WS: CONNECTED</span>
              </>
            ) : mockMode ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-coral animate-spin" />
                <span>STREAM ACTIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-steel" />
                <span>WS: OFFLINE</span>
              </>
            )}
          </div>

          {/* Toggle Mock Button with crisp tactile feedback */}
          <button
            onClick={onToggleMock}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-lg border active:scale-[0.97] transition-all duration-100 ease-out cursor-pointer ${
              mockMode
                ? "bg-coral/20 border-coral text-coral hover:bg-coral/30 shadow-[0_0_12px_rgba(255,75,50,0.35)]"
                : "bg-neutral-900 border-steel/40 text-steel hover:border-steel hover:text-white"
            }`}
            title="Toggle between Backend WebSocket and Synthetic Mock Stream"
          >
            {mockMode ? "Stop Stream" : "Start Stream"}
          </button>
        </div>
      </div>
    </header>
  );
}
