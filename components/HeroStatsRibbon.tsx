"use client";

import { ShieldCheck, ShieldAlert, Cpu, Activity, Radio, AlertOctagon } from "lucide-react";

interface HeroStatsRibbonProps {
  blockedCount: number;
}

export default function HeroStatsRibbon({ blockedCount }: HeroStatsRibbonProps) {
  return (
    <div className="w-full bg-gradient-to-b from-[#1e2329]/70 to-[#17191c] border border-[#929da7]/30 rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.85)] font-mono relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-crimson/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Benchmark Pill Tag */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#929da7]/20">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson" />
          </span>
          <span className="text-xs uppercase font-bold tracking-wider text-[#929da7]">
            Live Gateway Health & Defense Telemetry
          </span>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-[#17191c] border border-[#929da7]/30 text-[#929da7] shadow-sm">
          SIMULATED BENCHMARK
        </span>
      </div>

      {/* High-Visibility 3-Column Stats Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-[#929da7]/20">
        {/* Stat 1: Attacks Blocked / Quarantined */}
        <div className="pt-2 md:pt-0 md:px-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#929da7] uppercase tracking-wider font-semibold">
            <span>Attacks Blocked / Quarantined</span>
            <div className="p-1 rounded bg-crimson/15 border border-crimson/40">
              <ShieldAlert className="h-4 w-4 text-crimson" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-mono font-bold text-crimson drop-shadow-[0_0_15px_rgba(255,75,50,0.55)] tabular-nums">
              {blockedCount}
            </span>
            <span className="text-xs text-[#929da7] font-medium">
              Live Intercepts
            </span>
          </div>
          <p className="text-[11px] text-[#929da7]/90 mt-1">
            Real-time policy quarantine enforcing zero-trust execution
          </p>
        </div>

        {/* Stat 2: System Interception Rate */}
        <div className="pt-3 md:pt-0 md:px-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#929da7] uppercase tracking-wider font-semibold">
            <span>System Interception Rate</span>
            <div className="p-1 rounded bg-[#17191c] border border-[#929da7]/30">
              <Activity className="h-4 w-4 text-[#929da7]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-mono font-bold text-zinc-100 tabular-nums">
              99.8%
            </span>
            <span className="text-xs text-emerald-400 font-semibold">
              Live Gateway Inspection
            </span>
          </div>
          <p className="text-[11px] text-[#929da7]/90 mt-1">
            Simulated Red-Team Environment
          </p>
        </div>

        {/* Stat 3: Active Protection Level */}
        <div className="pt-3 md:pt-0 md:px-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#929da7] uppercase tracking-wider font-semibold">
            <span>Active Protection Level</span>
            <div className="p-1 rounded bg-emerald-950/40 border border-emerald-900/60">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-glow-pulse" />
              <span className="text-2xl sm:text-3xl font-mono font-bold text-emerald-300 tracking-tight">
                Tier 3 Enforced
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#929da7]/90 mt-1">
            Automated guardrails with Human-in-the-Loop escalation
          </p>
        </div>
      </div>
    </div>
  );
}
