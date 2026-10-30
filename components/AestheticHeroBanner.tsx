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
    <section className="relative overflow-hidden rounded-2xl border border-forest bg-charcoal shadow-[0_10px_50px_rgba(0,0,0,0.9)]">
      {/* Background Ambient Crimson Flare */}
      <div className="absolute top-0 right-0 w-[550px] h-[350px] pointer-events-none overflow-hidden">
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-crimson/20 blur-[100px]" />
        <div className="absolute top-20 right-28 w-64 h-64 rounded-full bg-crimson/15 blur-[70px]" />
      </div>

      {/* Forest Green Atmospheric Underglow */}
      <div className="absolute bottom-0 left-0 w-80 h-64 rounded-full bg-forest blur-[80px] opacity-75 pointer-events-none" />

      {/* Subtle Mesh Grid */}
      <div className="absolute inset-0 soc-mesh-grid opacity-35 pointer-events-none" />

      {/* Main Content Layout */}
      <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        {/* Left Column: Plain-English Vision */}
        <div className="max-w-3xl space-y-5">
          {/* Top Pill Kicker */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase bg-forest border border-emerald-900/60 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow-pulse" />
              AI FIREWALL ARMED
            </span>
            <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-neutral-400">
              AUTOMATIC THREAT INTERCEPTION & LOGGING
            </span>
          </div>

          {/* Large Hero Title */}
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl tracking-tight leading-[0.92] select-none font-editorial">
              <span className="text-crimson font-black drop-shadow-[0_0_35px_rgba(163,28,24,0.55)]">
                AGENT
              </span>{" "}
              <span className="text-neutral-100 font-bold tracking-tight">
                SHIELD
              </span>
            </h1>
            <div className="text-xs sm:text-sm font-mono tracking-widest text-neutral-400 uppercase pt-1">
              Real-time security firewall protecting AI agents from malicious instructions.
            </div>
          </div>

          {/* Subtext description in plain English */}
          <p className="text-sm sm:text-base text-neutral-300 font-mono font-light leading-relaxed max-w-2xl">
            AI agents run fast, but they can be tricked into deleting files or stealing data. 
            AgentShield intercepts dangerous commands before they execute, alerts human supervisors, 
            and locks every decision into a tamper-proof mathematical log.
          </p>

          {/* Interactive CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Primary Action Pill in Crimson Red */}
            <button
              onClick={onExplorePlayground}
              className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-crimson text-white border border-red-500/80 shadow-[0_0_20px_rgba(163,28,24,0.45)] hover:bg-red-800 hover:shadow-[0_0_30px_rgba(163,28,24,0.6)] active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer"
            >
              <Flame className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
              <span>Try Attack Simulator</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Secondary Action Pill in Forest Green */}
            <button
              onClick={onVerifyAudit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono font-medium uppercase tracking-wider bg-forest text-emerald-300 border border-emerald-900/80 hover:border-emerald-700 hover:bg-emerald-950/40 active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer shadow-[0_0_15px_rgba(6,17,12,0.8)]"
            >
              <Link2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Verify Activity Log</span>
            </button>

            {/* Emergency HITL Simulation Pill */}
            <button
              onClick={onSimulateHITL}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono font-medium uppercase tracking-wider bg-neutral-900 text-red-300 border border-crimson/50 hover:bg-crimson/20 active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 text-crimson" />
              <span>Test Safety Gate</span>
            </button>
          </div>
        </div>

        {/* Right Column: Simplified Section Indices */}
        <div className="w-full lg:w-72 flex flex-col justify-between self-stretch pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-neutral-800/80 lg:pl-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 uppercase tracking-widest pb-2 border-b border-neutral-800">
              <span className="flex items-center gap-1.5 text-neutral-300 font-bold">
                <Radio className="h-3.5 w-3.5 text-crimson animate-pulse" />
                SYSTEM MODULES
              </span>
              <span className="text-crimson font-bold">4 READY</span>
            </div>

            <div className="space-y-3 font-mono">
              <div
                onClick={onExplorePlayground}
                className="group flex items-baseline justify-between p-2 rounded-lg bg-neutral-900/40 hover:bg-neutral-900/80 border border-transparent hover:border-neutral-800 cursor-pointer transition-colors"
              >
                <span className="text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors">
                  Attack Simulator
                </span>
                <span className="text-xs font-bold text-crimson tracking-wider">01</span>
              </div>

              <div
                onClick={onVerifyAudit}
                className="group flex items-baseline justify-between p-2 rounded-lg bg-neutral-900/40 hover:bg-neutral-900/80 border border-transparent hover:border-neutral-800 cursor-pointer transition-colors"
              >
                <span className="text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors">
                  Tamper-Proof Log
                </span>
                <span className="text-xs font-bold text-emerald-400 tracking-wider">02</span>
              </div>

              <div className="group flex items-baseline justify-between p-2 rounded-lg bg-neutral-900/40 border border-transparent">
                <span className="text-xs text-neutral-400">
                  Live Activity Feed
                </span>
                <span className="text-xs font-bold text-neutral-400 tracking-wider">03</span>
              </div>

              <div
                onClick={onSimulateHITL}
                className="group flex items-baseline justify-between p-2 rounded-lg bg-neutral-900/40 hover:bg-neutral-900/80 border border-transparent hover:border-crimson/40 cursor-pointer transition-colors"
              >
                <span className="text-xs text-neutral-400 group-hover:text-red-300 transition-colors">
                  Human Safety Gate
                </span>
                <span className="text-xs font-bold text-crimson tracking-wider">04</span>
              </div>
            </div>
          </div>

          {/* Bottom Spec Badge */}
          <div className="pt-4 mt-4 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-neutral-400">RESPONSE SPEED</span>
            <span className="text-emerald-400 font-bold">&lt; 1.4ms (INSTANT)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
