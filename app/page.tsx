"use client";

import { useState, useEffect, useRef } from "react";
import SOCHeader from "@/components/SOCHeader";
import AestheticHeroBanner from "@/components/AestheticHeroBanner";
import ManualTestToolbar from "@/components/ManualTestToolbar";
import AttackPlayground from "@/components/AttackPlayground";
import CryptographicAuditVisualizer from "@/components/CryptographicAuditVisualizer";
import StatsPanel from "@/components/StatsPanel";
import LiveTelemetryStream from "@/components/LiveTelemetryStream";
import HITLApprovalModal from "@/components/HITLApprovalModal";
import { useSecurityStream } from "@/hooks/useSecurityStream";
import type { TelemetryEvent, ApprovalDecision } from "@/types/telemetry";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Activity,
  Radio,
  Lock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function SOCDashboardPage() {
  const {
    events,
    connected,
    mockMode,
    toggleMock,
    clearStream,
    updateEventStatus,
    injectEvent,
    simulateSafeEvent,
    simulateTier3Attack,
    stats,
  } = useSecurityStream();

  // HITL Modal State
  const [activeModalEvent, setActiveModalEvent] = useState<TelemetryEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Keep track of events already auto-prompted so we don't bombard the user repeatedly
  const autoPromptedIdsRef = useRef<Set<string>>(new Set());
  // Prevent any auto-popup on initial website mount
  const hasUserStartedStreamRef = useRef<boolean>(false);

  useEffect(() => {
    if (mockMode || connected) {
      hasUserStartedStreamRef.current = true;
    }
  }, [mockMode, connected]);

  // 1. Trigger Condition:
  // Only trigger automatically during an active stream (mock or WebSocket), NEVER on initial load
  useEffect(() => {
    if (isModalOpen) return;
    if (!hasUserStartedStreamRef.current) return;

    const highRiskOrPending = events.find((evt) => {
      const isUrgent = evt.status === "PENDING" || evt.risk_score > 70;
      return isUrgent && !autoPromptedIdsRef.current.has(evt.id);
    });

    if (highRiskOrPending) {
      autoPromptedIdsRef.current.add(highRiskOrPending.id);
      setActiveModalEvent(highRiskOrPending);
      setIsModalOpen(true);
    }
  }, [events, isModalOpen]);

  // Queue of remaining unhandled PENDING events
  const pendingQueue = events.filter((e) => e.status === "PENDING");

  // Dual CTAs Action Handler
  const handleApprovalAction = async (
    event: TelemetryEvent,
    decision: ApprovalDecision
  ) => {
    const isApprove = decision === "APPROVE";
    const newStatus = isApprove ? "ALLOWED" : "BLOCKED";

    try {
      // API Integration: POST /api/approvals/{id}/action
      const response = await fetch(`/api/approvals/${event.id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision,
          admin: "SOC_ADMIN_01",
        }),
      });

      if (!response.ok) {
        console.warn("[HITL] API returned non-200, applying optimistic local state.");
      }
    } catch (err) {
      console.warn("[HITL] API network error, applying optimistic state:", err);
    }

    // Update telemetry stream item cleanly in place without page flickers
    updateEventStatus(event.id, newStatus);
    setIsModalOpen(false);

    // Display SOC-themed toast notification
    if (isApprove) {
      toast.success("Execution Authorized One-Time", {
        description: `${event.agent_id} [${event.tool_name}] approved by SOC_ADMIN_01.`,
        icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
      });
    } else {
      toast.error("Execution Blocked & Quarantined", {
        description: `${event.agent_id} [${event.tool_name}] intercepted & isolated by SOC_ADMIN_01.`,
        icon: <ShieldAlert className="h-4 w-4 text-crimson" />,
      });
    }
  };

  const handleManualReview = (event: TelemetryEvent) => {
    setActiveModalEvent(event);
    setIsModalOpen(true);
  };

  // Manual Sandbox Simulators
  const handleSimulateSafe = () => {
    const safe = simulateSafeEvent();
    toast.success("Safe Telemetry Injected", {
      description: `${safe.agent_id} → ${safe.tool_name} (Risk: ${safe.risk_score}% ALLOWED)`,
      icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
    });
  };

  const handleSimulateAttack = () => {
    const attack = simulateTier3Attack();
    autoPromptedIdsRef.current.add(attack.id);
    setActiveModalEvent(attack);
    setIsModalOpen(true);
    toast.warning("Tier 3 Security Alert Injected", {
      description: `${attack.agent_id} attempted ${attack.tool_name} (${attack.risk_score}% CRITICAL). HITL Gate Armed.`,
      icon: <AlertTriangle className="h-4 w-4 text-crimson" />,
    });
  };

  // Member 4: Judges' 1-Click Attack Playground Dispatcher
  const handlePlaygroundAttack = (event: TelemetryEvent) => {
    injectEvent(event);
    autoPromptedIdsRef.current.add(event.id);
    setActiveModalEvent(event);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-charcoal text-neutral-200 flex flex-col font-mono selection:bg-crimson/40 selection:text-white">
      {/* Background High-Tech Subtle Glow Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle Crimson Ambient Glow - Top Right */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-crimson/10 rounded-full blur-3xl" />
        {/* Subtle Forest Green Ambient Glow - Bottom Left */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-forest rounded-full blur-3xl opacity-80" />
      </div>

      {/* Top SOC Navigation Bar */}
      <SOCHeader
        connected={connected}
        mockMode={mockMode}
        onToggleMock={toggleMock}
        eventCount={events.length}
      />

      {/* Main SOC Dashboard Viewport */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 gap-4 sm:gap-6 relative z-10 max-w-[1700px] w-full mx-auto">
        {/* Aesthetic Editorial Hero Banner (Matches Automotive Reference: "BUILT DIFFERENTLY") */}
        <AestheticHeroBanner
          onExplorePlayground={() => {
            const el = document.getElementById("playground");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          onVerifyAudit={() => {
            const el = document.getElementById("audit");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          onSimulateHITL={handleSimulateAttack}
        />

        {/* Member 4: Judges' 1-Click Attack Playground */}
        <div id="playground" className="scroll-mt-20">
          <AttackPlayground onAttackDispatched={handlePlaygroundAttack} />
        </div>

        {/* Quick Simulation Sandbox Strip */}
        <ManualTestToolbar
          onSimulateSafe={handleSimulateSafe}
          onSimulateAttack={handleSimulateAttack}
        />

        {/* Member 4: Cryptographic Audit Visualizer (SHA-256 Merkle Chain) */}
        <div id="audit" className="scroll-mt-20">
          <CryptographicAuditVisualizer />
        </div>

        {/* Top SOC Metrics Strip */}
        <StatsPanel stats={stats} />

        {/* Core Layout Grid: Telemetry Stream + Side Monitor */}
        <div id="telemetry" className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 min-h-[580px] scroll-mt-20">
          {/* Main Telemetry Feed (3 Columns on Large Screens) */}
          <div className="lg:col-span-3 h-[640px] lg:h-auto min-h-[500px]">
            <LiveTelemetryStream
              events={events}
              onClear={clearStream}
              mockMode={mockMode}
              onToggleMock={toggleMock}
              onSelectForReview={handleManualReview}
            />
          </div>

          {/* Side SOC Monitor Panel (1 Column on Large Screens) */}
          <div id="policy" className="space-y-4 flex flex-col scroll-mt-20">
            {/* Active HITL Review Queue Card */}
            <div className="bg-charcoal border border-crimson/60 rounded-xl p-4 shadow-[0_0_20px_rgba(163,28,24,0.2)] relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-red-200 uppercase tracking-wider">
                  <Lock className="h-4 w-4 text-crimson" />
                  <span>Human-in-the-Loop Gate</span>
                </div>
                {pendingQueue.length > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
                Quarantines Tier 3 actions (&gt; 70% risk) pending SOC analyst decision.
              </p>

              {pendingQueue.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="text-amber-300 font-bold flex items-center gap-1.5">
                      <Radio className="h-3 w-3 text-amber-400 animate-pulse" />
                      {pendingQueue.length} Pending Actions
                    </span>
                    <button
                      onClick={() => handleManualReview(pendingQueue[0])}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-crimson text-white hover:bg-red-800 active:scale-[0.97] transition-all duration-100 ease-out shadow-[0_0_10px_rgba(163,28,24,0.4)] cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-400 p-2.5 rounded-lg bg-forest border border-emerald-900/60">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>No actions waiting in queue</span>
                </div>
              )}
            </div>

            {/* 1. Policy Engine Status (Clean & Accurate) */}
            <div className="bg-charcoal border border-forest rounded-xl p-4 shadow-[0_0_20px_rgba(6,17,12,0.8)]">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-200 uppercase tracking-wider mb-3">
                <Cpu className="h-4 w-4 text-emerald-400" />
                <span>Policy Engine Status</span>
              </div>
              <div className="space-y-2.5 text-xs">
                {/* Tool Traffic Interceptor */}
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Tool Traffic Interceptor</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-forest border border-emerald-900/60 text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow-pulse" />
                    Active
                  </span>
                </div>

                {/* Permission Rule Engine */}
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Permission Rule Engine</span>
                  <span className="text-[11px] text-emerald-400 font-semibold text-right">
                    3 Tiers Active (Safe / Sensitive / Critical)
                  </span>
                </div>

                {/* Human Approval Gate */}
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Human Approval Gate</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-crimson/20 border border-crimson/50 text-red-300">
                    Armed (Risk &gt; 70%)
                  </span>
                </div>

                {/* Prompt Injection Guard */}
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Prompt Injection Guard</span>
                  <span className="text-emerald-400 font-semibold">Active</span>
                </div>

                {/* Tool Authenticity Verification */}
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Tool Authenticity Verification</span>
                  <span className="text-emerald-400 font-semibold">Verified</span>
                </div>

                {/* Tamper-Proof Audit Trail */}
                <div className="flex justify-between items-center py-1">
                  <span className="text-neutral-400">Tamper-Proof Audit Trail</span>
                  <span className="text-emerald-400 font-semibold">Synchronized</span>
                </div>
              </div>
            </div>

            {/* 2. Severity Classification (Aligned with Demo Pitch) */}
            <div className="bg-charcoal border border-forest rounded-xl p-4 shadow-[0_0_20px_rgba(6,17,12,0.8)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-200 uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4 text-crimson" />
                  <span>Severity Classification</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">3 TIERS</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Tier 3: 70% - 100% Risk */}
                <div className="p-2.5 rounded-lg bg-crimson/15 border border-crimson/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-200 text-xs">70% - 100% Risk</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-crimson text-white font-bold tracking-wider">
                      PENDING
                    </span>
                  </div>
                  <p className="text-[10px] text-red-300/90 leading-tight">
                    Human-in-the-Loop Review (Demo Pitch: 96% injection attack quarantines for manual approval)
                  </p>
                </div>

                {/* Tier 2: 40% - 69% Risk */}
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-charcoal space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-300 text-xs">40% - 69% Risk</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 border border-charcoal text-amber-300 font-semibold tracking-wider">
                      INSPECTED
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-tight">
                    Sensitive Read (Inspected against scope before execution)
                  </p>
                </div>

                {/* Tier 1: 0% - 39% Risk */}
                <div className="p-2.5 rounded-lg bg-forest border border-emerald-900/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-300 text-xs">0% - 39% Risk</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-forest text-emerald-400 font-semibold border border-emerald-900/50 tracking-wider">
                      ALLOWED
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-tight">
                    Safe / Automated (Whitelisted tools execute without delay)
                  </p>
                </div>
              </div>
            </div>

            {/* Ingestion Stream Guide */}
            <div className="bg-charcoal border border-forest rounded-xl p-4 shadow-[0_0_20px_rgba(6,17,12,0.8)] flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-200 uppercase tracking-wider mb-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span>Telemetry Feed Control</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Connects to FastAPI at{" "}
                  <code className="text-crimson bg-neutral-950 px-1 py-0.5 rounded">
                    ws://localhost:8000/ws/security-stream
                  </code>
                  . Use the attack playground or manual sandbox bar to simulate exploits.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">Telemetry Stream:</span>
                <span
                  className={`font-semibold ${
                    mockMode ? "text-amber-400" : connected ? "text-emerald-400" : "text-neutral-400"
                  }`}
                >
                  {mockMode ? "Synthetic Active" : connected ? "WebSocket Live" : "Standby (Idle)"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Reduced-Size HITL Approval Modal Dialog */}
      <HITLApprovalModal
        event={activeModalEvent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAction={handleApprovalAction}
        queueCount={pendingQueue.length}
      />

      {/* SOC Bottom Status Bar */}
      <footer className="border-t border-forest bg-charcoal/90 px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-neutral-400 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-glow-pulse" />
            <span>AgentShield Defense Mesh</span>
          </span>
          <span className="text-neutral-700">|</span>
          <span className="text-[11px] text-neutral-400">Strict 3-Color SOC Palette (#171717 / #06110C / #A31C18)</span>
        </div>
        <div className="text-[11px] text-neutral-400">
          SOC Node: <span className="text-neutral-300">AS-PRIMARY-01</span>
        </div>
      </footer>
    </div>
  );
}
