"use client";

import { getRiskLevel } from "@/types/telemetry";

interface RiskScoreBarProps {
  score: number;
}

export default function RiskScoreBar({ score }: RiskScoreBarProps) {
  const level = getRiskLevel(score);

  const config = {
    critical: {
      bar: "bg-coral shadow-[0_0_10px_#FF4B32]",
      text: "text-coral font-bold",
      badge: "border-coral/50 text-coral",
    },
    high: {
      bar: "bg-orange-500 shadow-[0_0_6px_#f97316]",
      text: "text-orange-400 font-semibold",
      badge: "border-orange-500/40 text-orange-300",
    },
    medium: {
      bar: "bg-amber-500 shadow-[0_0_6px_#f59e0b]",
      text: "text-amber-400",
      badge: "border-amber-500/40 text-amber-300",
    },
    low: {
      bar: "bg-steel shadow-[0_0_6px_#929DA7]",
      text: "text-steel",
      badge: "border-steel/40 text-steel",
    },
  }[level];

  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <div className="flex-1 h-1.5 w-16 bg-neutral-900 rounded-full overflow-hidden border border-steel/20">
        <div
          className={`h-full rounded-full transition-all duration-300 ${config.bar}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className={`font-mono text-xs tabular-nums ${config.text}`}>
        {score}%
      </span>
    </div>
  );
}
