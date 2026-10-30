"use client";

import type { TelemetryStatus } from "@/types/telemetry";

interface StatusBadgeProps {
  status: TelemetryStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "ALLOWED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-neutral-900 border border-steel/40 text-steel shadow-[0_0_8px_rgba(146,157,167,0.2)]">
        <span className="h-1.5 w-1.5 rounded-full bg-steel animate-glow-pulse" />
        ALLOWED
      </span>
    );
  }

  if (status === "BLOCKED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-coral border border-coral text-white shadow-[0_0_15px_rgba(255,75,50,0.5)]">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-glow-pulse" />
        BLOCKED
      </span>
    );
  }

  // PENDING
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-neutral-900 border border-steel/25 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-glow-pulse" />
      PENDING
    </span>
  );
}
