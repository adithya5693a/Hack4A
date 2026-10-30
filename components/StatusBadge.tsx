"use client";

import type { TelemetryStatus } from "@/types/telemetry";

interface StatusBadgeProps {
  status: TelemetryStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "ALLOWED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-forest border border-emerald-900/80 text-emerald-400 shadow-[0_0_8px_rgba(6,17,12,0.8)]">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow-pulse" />
        ALLOWED
      </span>
    );
  }

  if (status === "BLOCKED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-crimson border border-red-500/60 text-white shadow-[0_0_12px_rgba(163,28,24,0.45)]">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-glow-pulse" />
        BLOCKED
      </span>
    );
  }

  // NEEDS APPROVAL (Pending manual human confirmation)
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-neutral-900 border border-neutral-800 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-glow-pulse" />
      NEEDS APPROVAL
    </span>
  );
}
