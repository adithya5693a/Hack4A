"use client";

import { Shield, ArrowRight, Flame, Link2, Lock, Radio } from "lucide-react";

interface AestheticHeroBannerProps {
  onExplorePlayground: () => void;
  onVerifyAudit: () => void;
  onSimulateHITL: () => void;
}

export default function AestheticHeroBanner({
  onExplorePlayground,
  onVerifyAudit,
  onSimulateHITL,
}: AestheticHeroBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#929da7]/30 bg-gradient-to-b from-[#1e2329]/70 to-[#17191c] shadow-[0_10px_50px_rgba(0,0,0,0.85)]">
      {/* Background Ambient Coral Flare */}
      <div className="absolute top-0 right-0 w-[550px] h-[350px] pointer-events-none overflow-hidden">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-crimson/20 blur-[100px]" />
        <div className="absolute top-20 right-28 w-64 h-64 rounded-full bg-crimson/15 blur-[70px]" />
      </div>

      {/* Cool Steel Atmospheric Underglow */}
      <div className="absolute bottom-0 left-0 w-80 h-64 rounded-full bg-[#929da7]/10 blur-[80px] pointer-events-none" />

      {/* Subtle Mesh Grid */}
      <div className="absolute inset-0 soc-mesh-grid opacity-35 pointer-events-none" />

      {/* Main Content Layout */}
      <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        {/* Left Column: Vision & Primary Actions */}
        <div className="max-w-3xl space-y-5">
          {/* Top Pill Kicker */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest uppercase bg-[#06110c] border border-emerald-900/60 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow-pulse" />
              FIREWALL ARMED
            </span>
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#929da7]">
              ZERO-TRUST RUNTIME DEFENSE
            </span>
          </div>

          {/* Large Hero Title */}
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl tracking-tight leading-[0.92] select-none font-editorial">
              <span className="text-crimson font-black drop-shadow-[0_0_35px_rgba(255,75,50,0.55)]">
                AGENT
              </span>{" "}
              <span className="text-zinc-100 font-bold tracking-tight">
                SHIELD
              </span>
            </h1>
            <div className="text-xs sm:text-sm font-mono tracking-widest text-[#929da7] uppercase pt-1">
              Autonomous AI Guardrails · Intercept · Quarantine · Verify
            </div>
          </div>

          {/* Subtext description in high-contrast plain English */}
          <p className="text-sm sm:text-base text-zinc-200 font-mono font-light leading-relaxed max-w-2xl">
            AI agents run fast, but can be tricked into deleting files or stealing funds. 
            AgentShield intercepts dangerous commands before they execute, alerts human supervisors, 
            and locks every decision into an immutable audit trail.
          </p>

          {/* Interactive CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Primary Action Pill in Coral Orange */}
            <button
              onClick={onExplorePlayground}
              className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-mono font-bold uppercase tracking-wider bg-crimson text-white border border-[#ff4b32]/80 shadow-[0_0_20px_rgba(255,75,50,0.45)] hover:bg-[#e03d25] hover:shadow-[0_0_30px_rgba(255,75,50,0.65)] active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer"
            >
              <Flame className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
              <span>Try Attack Simulator</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Secondary Action Pill in Cool Steel Grey / Dark */}
            <button
              onClick={onVerifyAudit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-mono font-medium uppercase tracking-wider bg-[#17191c] text-[#929da7] border border-[#929da7]/35 hover:border-[#929da7]/70 hover:text-white active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer shadow-sm"
            >
              <Link2 className="h-3.5 w-3.5 text-[#929da7]" />
              <span>Verify Activity Log</span>
            </button>

            {/* Emergency HITL Simulation Pill */}
            <button
              onClick={onSimulateHITL}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-mono font-medium uppercase tracking-wider bg-[#17191c] text-red-300 border border-crimson/50 hover:bg-crimson/20 active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 text-crimson" />
              <span>Test Safety Gate</span>
            </button>
          </div>
        </div>

        {/* Right Column: Simplified Section Indices */}
        <div className="w-full lg:w-72 flex flex-col justify-between self-stretch pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[#929da7]/25 lg:pl-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-[#929da7] uppercase tracking-widest pb-2 border-b border-[#929da7]/20">
              <span className="flex items-center gap-1.5 text-zinc-200 font-bold">
                <Radio className="h-3.5 w-3.5 text-crimson animate-pulse" />
                DEFENSE MODULES
              </span>
              <span className="text-crimson font-bold">4 ACTIVE</span>
            </div>

            <div className="space-y-3 font-mono">
              <div
                onClick={onExplorePlayground}
                className="group flex items-baseline justify-between p-2 rounded-lg bg-[#17191c] hover:bg-zinc-800/60 border border-[#929da7]/15 hover:border-[#929da7]/40 cursor-pointer transition-colors"
              >
                <span className="text-xs sm:text-sm text-zinc-300 group-hover:text-white transition-colors">
                  Attack Simulator
                </span>
                <span className="text-xs sm:text-sm font-bold text-crimson tracking-wider">01</span>
              </div>

              <div
                onClick={onVerifyAudit}
                className="group flex items-baseline justify-between p-2 rounded-lg bg-[#17191c] hover:bg-zinc-800/60 border border-[#929da7]/15 hover:border-emerald-600/40 cursor-pointer transition-colors"
              >
                <span className="text-xs sm:text-sm text-zinc-300 group-hover:text-emerald-300 transition-colors">
                  Tamper-Proof Log
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 tracking-wider">02</span>
              </div>

              <div className="group flex items-baseline justify-between p-2 rounded-lg bg-[#17191c] border border-[#929da7]/10">
                <span className="text-xs sm:text-sm text-[#929da7]">
                  Live Activity Feed
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#929da7] tracking-wider">03</span>
              </div>

              <div
                onClick={onSimulateHITL}
                className="group flex items-baseline justify-between p-2 rounded-lg bg-[#17191c] hover:bg-zinc-800/60 border border-[#929da7]/15 hover:border-crimson/40 cursor-pointer transition-colors"
              >
                <span className="text-xs sm:text-sm text-zinc-300 group-hover:text-red-300 transition-colors">
                  Human Safety Gate
                </span>
                <span className="text-xs sm:text-sm font-bold text-crimson tracking-wider">04</span>
              </div>
            </div>
          </div>

          {/* Bottom Spec Badge */}
          <div className="pt-4 mt-4 border-t border-[#929da7]/20 flex items-center justify-between text-xs font-mono">
            <span className="text-[#929da7]">RESPONSE LATENCY</span>
            <span className="text-emerald-400 font-bold">&lt; 1.4ms (INSTANT)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
