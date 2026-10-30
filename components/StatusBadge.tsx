"use client";

import type { TelemetryStatus } from "@/types/telemetry";

interface StatusBadgeProps {
  status: TelemetryStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "ALLOWED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs md:text-sm font-mono font-bold uppercase tracking-wider bg-forest border border-emerald-800/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)] select-none">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-glow-pulse" />
        ALLOWED
      </span>
    );
  }

  if (status === "BLOCKED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs md:text-sm font-mono font-bold uppercase tracking-wider bg-crimson border border-[#ff4b32]/80 text-white shadow-[0_0_15px_rgba(255,75,50,0.45)] select-none">
        <span className="h-2 w-2 rounded-full bg-white animate-glow-pulse" />
        BLOCKED
      </span>
    );
  }

  // NEEDS APPROVAL
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs md:text-sm font-mono font-bold uppercase tracking-wider bg-[#17191c] border border-amber-500/70 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] select-none">
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-glow-pulse" />
      NEEDS APPROVAL
    </span>
  );
}
