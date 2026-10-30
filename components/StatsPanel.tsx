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
      {/* Blocked Threats in Vibrant Coral Orange */}
      <div className="bg-charcoal border border-coral/50 rounded-xl p-3.5 relative overflow-hidden shadow-[0_0_18px_rgba(255,75,50,0.18)] group hover:border-coral transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-coral uppercase tracking-wider">
            Blocked Alerts
          </span>
          <div className="p-1.5 rounded-md bg-coral/20 border border-coral/40">
            <ShieldAlert className="h-4 w-4 text-coral" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tabular-nums">
            {stats.blocked}
          </span>
          <span className="text-[10px] text-coral/80">High-Severity Intercepts</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-coral" />
      </div>

      {/* Allowed Calls in Cool Steel Grey */}
      <div className="bg-charcoal border border-steel/30 rounded-xl p-3.5 relative overflow-hidden shadow-[0_0_15px_rgba(146,157,167,0.1)] group hover:border-steel transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-steel uppercase tracking-wider">
            Allowed Calls
          </span>
          <div className="p-1.5 rounded-md bg-neutral-900 border border-steel/30">
            <ShieldCheck className="h-4 w-4 text-steel" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-neutral-100 tabular-nums">
            {stats.allowed}
          </span>
          <span className="text-[10px] text-steel">Safe Executions</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-steel" />
      </div>

      {/* Pending Reviews */}
      <div className="bg-charcoal border border-steel/20 rounded-xl p-3.5 relative overflow-hidden group hover:border-steel/50 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-amber-300 uppercase tracking-wider">
            Pending Actions
          </span>
          <div className="p-1.5 rounded-md bg-neutral-900 border border-steel/20">
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-amber-200 tabular-nums">
            {stats.pending}
          </span>
          <span className="text-[10px] text-steel">Awaiting SOC Approval</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/60" />
      </div>

      {/* Interception Rate */}
      <div className="bg-charcoal border border-steel/20 rounded-xl p-3.5 relative overflow-hidden group hover:border-steel/50 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-steel uppercase tracking-wider">
            Interception Rate
          </span>
          <div className="p-1.5 rounded-md bg-neutral-900 border border-steel/20">
            <Gauge className="h-4 w-4 text-steel" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-neutral-100 tabular-nums">
            {blockRate}%
          </span>
          <span className="text-[10px] text-steel">Traffic Filter Ratio</span>
        </div>
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-steel via-amber-500 to-coral transition-all duration-300"
          style={{ width: `${blockRate}%` }}
        />
      </div>
    </div>
  );
}
