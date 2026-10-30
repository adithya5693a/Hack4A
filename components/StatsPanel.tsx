"use client";

import { ShieldAlert, ShieldCheck, Clock, Gauge } from "lucide-react";
import type { SecurityStreamStats } from "@/hooks/useSecurityStream";

interface StatsPanelProps {
  stats: SecurityStreamStats;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const blockRate = stats.total > 0 ? Math.round((stats.blocked / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
      {/* Blocked Attacks in Vibrant Coral Orange */}
      <div className="bg-gradient-to-b from-[#1e2329]/70 to-[#17191c] border border-crimson/50 rounded-xl p-3.5 relative overflow-hidden shadow-[0_0_15px_rgba(255,75,50,0.18)] group hover:border-crimson transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-red-300 uppercase tracking-wider">
            Blocked Attacks
          </span>
          <div className="p-1.5 rounded-md bg-crimson/20 border border-crimson/40">
            <ShieldAlert className="h-4 w-4 text-crimson" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tabular-nums drop-shadow-[0_0_8px_rgba(255,75,50,0.4)]">
            {stats.blocked}
          </span>
          <span className="text-[10px] text-red-400">Dangerous Intercepts</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-crimson" />
      </div>

      {/* Allowed Actions */}
      <div className="bg-gradient-to-b from-[#1e2329]/70 to-[#17191c] border border-[#929da7]/25 rounded-xl p-3.5 relative overflow-hidden shadow-sm group hover:border-emerald-900/80 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
            Allowed Actions
          </span>
          <div className="p-1.5 rounded-md bg-[#17191c] border border-emerald-900/70">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-300 tabular-nums">
            {stats.allowed}
          </span>
          <span className="text-[10px] text-emerald-500/80">Safe Executions</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600/70" />
      </div>

      {/* Needs Approval */}
      <div className="bg-gradient-to-b from-[#1e2329]/70 to-[#17191c] border border-[#929da7]/25 rounded-xl p-3.5 relative overflow-hidden group hover:border-[#929da7]/50 transition-all shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-amber-300 uppercase tracking-wider">
            Needs Approval
          </span>
          <div className="p-1.5 rounded-md bg-[#17191c] border border-zinc-800">
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-amber-200 tabular-nums">
            {stats.pending}
          </span>
          <span className="text-[10px] text-[#929da7]">Awaiting Human Confirmation</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/60" />
      </div>

      {/* Protection Rate */}
      <div className="bg-gradient-to-b from-[#1e2329]/70 to-[#17191c] border border-[#929da7]/25 rounded-xl p-3.5 relative overflow-hidden group hover:border-[#929da7]/50 transition-all shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#929da7] uppercase tracking-wider">
            Protection Rate
          </span>
          <div className="p-1.5 rounded-md bg-[#17191c] border border-zinc-800">
            <Gauge className="h-4 w-4 text-[#929da7]" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-neutral-100 tabular-nums">
            {blockRate}%
          </span>
          <span className="text-[10px] text-[#929da7]">Threat Filter Ratio</span>
        </div>
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-crimson transition-all duration-300"
          style={{ width: `${blockRate}%` }}
        />
      </div>
    </div>
  );
}
