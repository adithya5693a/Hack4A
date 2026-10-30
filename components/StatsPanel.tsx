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
      {/* Blocked Attacks in Crimson Red #A31C18 */}
      <div className="bg-charcoal border border-crimson/50 rounded-xl p-3.5 relative overflow-hidden shadow-[0_0_15px_rgba(163,28,24,0.18)] group hover:border-crimson transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-red-300 uppercase tracking-wider">
            Blocked Attacks
          </span>
          <div className="p-1.5 rounded-md bg-crimson/20 border border-crimson/40">
            <ShieldAlert className="h-4 w-4 text-crimson" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tabular-nums">
            {stats.blocked}
          </span>
          <span className="text-[10px] text-red-400">Dangerous Intercepts</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-crimson" />
      </div>

      {/* Allowed Actions in Forest Green #06110C */}
      <div className="bg-charcoal border border-forest rounded-xl p-3.5 relative overflow-hidden shadow-[0_0_15px_rgba(6,17,12,0.8)] group hover:border-emerald-900/80 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
            Allowed Actions
          </span>
          <div className="p-1.5 rounded-md bg-forest border border-emerald-900/70">
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
      <div className="bg-charcoal border border-neutral-800 rounded-xl p-3.5 relative overflow-hidden group hover:border-neutral-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-amber-300 uppercase tracking-wider">
            Needs Approval
          </span>
          <div className="p-1.5 rounded-md bg-neutral-900 border border-neutral-800">
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-amber-200 tabular-nums">
            {stats.pending}
          </span>
          <span className="text-[10px] text-neutral-400">Awaiting Human Confirmation</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/60" />
      </div>

      {/* Protection Rate */}
      <div className="bg-charcoal border border-forest rounded-xl p-3.5 relative overflow-hidden group hover:border-neutral-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-neutral-300 uppercase tracking-wider">
            Protection Rate
          </span>
          <div className="p-1.5 rounded-md bg-neutral-900 border border-neutral-800">
            <Gauge className="h-4 w-4 text-neutral-300" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-neutral-100 tabular-nums">
            {blockRate}%
          </span>
          <span className="text-[10px] text-neutral-400">Threat Filter Ratio</span>
        </div>
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-crimson transition-all duration-300"
          style={{ width: `${blockRate}%` }}
        />
      </div>
    </div>
  );
}
