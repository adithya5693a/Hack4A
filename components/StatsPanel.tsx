"use client";

import { ShieldAlert, ShieldCheck, Clock, Gauge } from "lucide-react";
import type { SecurityStreamStats } from "@/hooks/useSecurityStream";

interface StatsPanelProps {
  stats: SecurityStreamStats;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const blockRate = stats.total > 0 ? Math.round((stats.blocked / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Blocked Threats */}
      <div className="bg-charcoal border border-crimson/50 rounded-xl p-3.5 relative overflow-hidden shadow-[0_0_15px_rgba(163,28,24,0.15)] group hover:border-crimson transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-medium text-red-300 uppercase tracking-wider">
            Blocked Alerts
          </span>
          <div className="p-1.5 rounded-md bg-crimson/20 border border-crimson/40">
            <ShieldAlert className="h-4 w-4 text-red-300" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-mono font-bold text-red-100 tabular-nums">
            {stats.blocked}
          </span>
          <span className="text-[10px] font-mono text-red-400">High-Severity Intercepts</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-crimson" />
      </div>

      {/* Allowed Calls */}
      <div className="bg-charcoal border border-forest rounded-xl p-3.5 relative overflow-hidden shadow-[0_0_15px_rgba(6,17,12,0.8)] group hover:border-emerald-900/80 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-medium text-emerald-400 uppercase tracking-wider">
            Allowed Calls
          </span>
          <div className="p-1.5 rounded-md bg-forest border border-emerald-900/70">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-mono font-bold text-emerald-300 tabular-nums">
            {stats.allowed}
          </span>
          <span className="text-[10px] font-mono text-emerald-500/80">Safe Executions</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600/70" />
      </div>

      {/* Pending Reviews */}
      <div className="bg-charcoal border border-neutral-800 rounded-xl p-3.5 relative overflow-hidden group hover:border-neutral-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-medium text-amber-300 uppercase tracking-wider">
            Pending Actions
          </span>
          <div className="p-1.5 rounded-md bg-neutral-900 border border-neutral-800">
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-mono font-bold text-amber-200 tabular-nums">
            {stats.pending}
          </span>
          <span className="text-[10px] font-mono text-neutral-400">Awaiting SOC Approval</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/60" />
      </div>

      {/* Interception Rate */}
      <div className="bg-charcoal border border-forest rounded-xl p-3.5 relative overflow-hidden group hover:border-neutral-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-medium text-neutral-300 uppercase tracking-wider">
            Interception Rate
          </span>
          <div className="p-1.5 rounded-md bg-neutral-900 border border-neutral-800">
            <Gauge className="h-4 w-4 text-neutral-300" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-mono font-bold text-neutral-100 tabular-nums">
            {blockRate}%
          </span>
          <span className="text-[10px] font-mono text-neutral-400">Traffic Filter Ratio</span>
        </div>
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-crimson transition-all duration-300"
          style={{ width: `${blockRate}%` }}
        />
      </div>
    </div>
  );
}
