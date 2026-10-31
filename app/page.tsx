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
import { adaptBackendToTelemetry } from "@/lib/telemetry-adapter";
import { BACKEND_URL } from "@/lib/api-config";
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
  WifiOff,
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
    addEvents,
    stats,
  } = useSecurityStream();

  // HITL Modal State
  const [activeModalEvent, setActiveModalEvent] = useState<TelemetryEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Keep track of events already auto-prompted so we don't bombard the user repeatedly
  const autoPromptedIdsRef = useRef<Set<string>>(new Set());

  // Acceptance Criterion: Open modal ONLY on PENDING / approval_required events.
  // NEVER open because risk_score > 70 on an already-ALLOWED row.
  useEffect(() => {
    if (isModalOpen) return;

    const pendingEvent = events.find((evt) => {
      return evt.status === "PENDING" && !autoPromptedIdsRef.current.has(evt.id);
    });

    if (pendingEvent) {
      autoPromptedIdsRef.current.add(pendingEvent.id);
      setActiveModalEvent(pendingEvent);
      setIsModalOpen(true);
    }
  }, [events, isModalOpen]);

  // Queue of remaining unhandled PENDING events
  const pendingQueue = events.filter((e) => e.status === "PENDING");

  // HITL Action Handler: Calls FastAPI backend directly
  const handleApprovalAction = async (
    event: TelemetryEvent,
    decision: ApprovalDecision
  ) => {
    const isApprove = decision === "APPROVE";

    try {
      const response = await fetch(`${BACKEND_URL}/api/approvals/${encodeURIComponent(event.id)}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: decision,
          decision,
          reviewer: "SOC_ADMIN_01",
          call_id: event.id,
        }),
      });

      if (!response.ok) {
        const errDetail = await response.text();
        toast.error("Failed to resolve approval on PEP", {
          description: `Backend returned ${response.status}: ${errDetail}`,
        });
        return;
      }

      // Backend confirmed resolution
      const newStatus = isApprove ? "ALLOWED" : "BLOCKED";
      const outcomeDiag = isApprove
        ? "Human approval granted by SOC_ADMIN_01"
        : "Human approval rejected by SOC_ADMIN_01";

      updateEventStatus(event.id, newStatus, outcomeDiag);
      setIsModalOpen(false);

      if (isApprove) {
        toast.success("Execution Allowed Once", {
          description: `${event.agent_id} [${event.tool_name}] approved by security operator.`,
          icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
        });
      } else {
        toast.error("Execution Blocked & Protected", {
          description: `${event.agent_id} [${event.tool_name}] intercepted & isolated.`,
          icon: <ShieldAlert className="h-4 w-4 text-crimson" />,
        });
      }
    } catch (err: any) {
      toast.error("Backend Unreachable", {
        description: `Could not send approval action to PEP: ${err.message || String(err)}`,
      });
    }
  };

  const handleManualReview = (event: TelemetryEvent) => {
    setActiveModalEvent(event);
    setIsModalOpen(true);
  };

  // Manual Sandbox Simulators — Real backend calls, NO fake events when backend is down
  const handleSimulateSafe = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/attacks/legitimate_approval?shield_enabled=true&auto_resolve=approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data.steps)) {
        const mapped = data.steps.map((s: any) => adaptBackendToTelemetry({ ...s, timestamp: new Date().toISOString() })).filter(Boolean) as TelemetryEvent[];
        addEvents(mapped);
      }
      toast.success("Safe Activity Verified", {
        description: "Legitimate agent task executed and audited under inspection policy.",
        icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
      });
    } catch (err: any) {
      toast.error("Backend Offline", {
        description: `Could not reach ${BACKEND_URL}. Run FastAPI backend to test.`,
        icon: <WifiOff className="h-4 w-4 text-crimson" />,
      });
    }
  };

  const handleSimulateAttack = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/attacks/poisoned_invoice?shield_enabled=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data.steps)) {
        const mapped = data.steps.map((s: any) => adaptBackendToTelemetry({ ...s, timestamp: new Date().toISOString() })).filter(Boolean) as TelemetryEvent[];
        addEvents(mapped);
      }
      toast.warning("Dangerous Threat Detected", {
        description: "Poisoned invoice attack intercepted by Taint Guard (R-TAINT-01).",
        icon: <AlertTriangle className="h-4 w-4 text-crimson" />,
      });
    } catch (err: any) {
      toast.error("Backend Offline", {
        description: `Could not reach ${BACKEND_URL}. Run FastAPI backend to test.`,
        icon: <WifiOff className="h-4 w-4 text-crimson" />,
      });
    }
  };

  // Attack Simulator Dispatcher: ingest mapped steps into stream
  const handlePlaygroundAttack = (dispatchedEvents: TelemetryEvent[]) => {
    addEvents(dispatchedEvents);
  };

  return (
    <div className="min-h-screen bg-charcoal text-neutral-200 flex flex-col font-mono selection:bg-crimson/40 selection:text-white">
      {/* Background High-Tech Subtle Glow Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Crimson Ambient Glow - Top Right */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-crimson/15 rounded-full blur-3xl" />
        {/* Forest Green Ambient Depth - Bottom Left */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-forest rounded-full blur-3xl opacity-80" />
      </div>

      {/* Top SOC Navigation Bar */}
      <SOCHeader
        connected={connected}
        mockMode={mockMode}
        onToggleMock={toggleMock}
        eventCount={events.length}
        isAuthenticated={isAuthenticated}
        onLogin={() => setIsAuthenticated(true)}
        onLogout={() => setIsAuthenticated(false)}
      />

      {/* Main SOC Dashboard Viewport */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 gap-4 sm:gap-6 relative z-10 max-w-[1700px] w-full mx-auto">
        {/* Aesthetic Hero Banner */}
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

        {/* Live Attack Simulator */}
        <div id="playground" className="scroll-mt-20">
          <AttackPlayground onAttackDispatched={handlePlaygroundAttack} />
        </div>

        {/* Quick Simulation Sandbox Strip */}
        <ManualTestToolbar
          onSimulateSafe={handleSimulateSafe}
          onSimulateAttack={handleSimulateAttack}
        />

        {/* Tamper-Proof Activity Log (SHA-256 Hash-Chained Audit Ledger) */}
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

          {/* Side Monitor Panel (1 Column on Large Screens) */}
          <div id="policy" className="space-y-4 flex flex-col scroll-mt-20">
            {/* Active Human Safety Gate Queue Card */}
            <div className="bg-charcoal border border-crimson/60 rounded-xl p-4 shadow-[0_0_20px_rgba(163,28,24,0.25)] relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-red-200 uppercase tracking-wider">
                  <Lock className="h-4 w-4 text-crimson" />
                  <span>Human Safety Gate</span>
                </div>
                {pendingQueue.length > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
                Holds high-impact commands until approved by an authenticated security administrator.
              </p>

              {pendingQueue.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="text-amber-300 font-bold flex items-center gap-1.5">
                      <Radio className="h-3 w-3 text-amber-400 animate-pulse" />
                      {pendingQueue.length} Actions Waiting
                    </span>
                    <button
                      onClick={() => handleManualReview(pendingQueue[0])}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-crimson text-white hover:bg-red-800 active:scale-[0.97] transition-all duration-100 ease-out shadow-[0_0_12px_rgba(163,28,24,0.4)] cursor-pointer"
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

            {/* 5. Security Engine Status (Job 5 Requirement: Reflects Live Backend Connection) */}
            <div className="bg-charcoal border border-forest rounded-xl p-4 shadow-[0_0_20px_rgba(6,17,12,0.8)]">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-200 uppercase tracking-wider mb-3">
                <Cpu className="h-4 w-4 text-emerald-400" />
                <span>Security Engine Status</span>
              </div>
              <div className="space-y-2.5 text-xs">
                {/* Command Interceptor */}
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Command Interceptor</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                      connected
                        ? "bg-forest border border-emerald-900/60 text-emerald-400"
                        : "bg-neutral-900 border border-neutral-800 text-neutral-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        connected ? "bg-emerald-400 animate-glow-pulse" : "bg-neutral-600"
                      }`}
                    />
                    {connected ? "Active" : "Offline"}
                  </span>
                </div>

                {/* Permission Rules */}
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Permission Rules</span>
                  <span
                    className={`text-[11px] font-semibold text-right ${
                      connected ? "text-emerald-400" : "text-neutral-500"
                    }`}
                  >
                    {connected ? "3 Tiers Active" : "Offline"}
                  </span>
                </div>

                {/* Human Safety Gate */}
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Human Safety Gate</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      connected
                        ? "bg-crimson/20 border border-crimson/50 text-red-300"
                        : "bg-neutral-900 border border-neutral-800 text-neutral-500"
                    }`}
                  >
                    {connected ? "Armed (>70% Risk)" : "Offline"}
                  </span>
                </div>

                {/* Injection Scanner */}
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Injection Scanner</span>
                  <span
                    className={`font-semibold ${
                      connected ? "text-emerald-400" : "text-neutral-500"
                    }`}
                  >
                    {connected ? "Active" : "Offline"}
                  </span>
                </div>

                {/* Tool Authenticity */}
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-400">Tool Authenticity</span>
                  <span
                    className={`font-semibold ${
                      connected ? "text-emerald-400" : "text-neutral-500"
                    }`}
                  >
                    {connected ? "Verified (HMAC-SHA256)" : "Offline"}
                  </span>
                </div>

                {/* Tamper-Proof Audit Log */}
                <div className="flex justify-between items-center py-1">
                  <span className="text-neutral-400">Tamper-Proof Audit Log</span>
                  <span
                    className={`font-semibold ${
                      connected ? "text-emerald-400" : "text-neutral-500"
                    }`}
                  >
                    {connected ? "Synchronized" : "Offline"}
                  </span>
                </div>
              </div>
            </div>

            {/* Severity Classifications */}
            <div className="bg-charcoal border border-forest rounded-xl p-4 shadow-[0_0_20px_rgba(6,17,12,0.8)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-200 uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4 text-crimson" />
                  <span>Threat Classifications</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">3 TIERS</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Tier 3: 70% - 100% Risk */}
                <div className="p-2.5 rounded-lg bg-crimson/15 border border-crimson/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-200 text-xs">70% - 100% Threat</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-crimson text-white font-bold tracking-wider">
                      NEEDS APPROVAL
                    </span>
                  </div>
                  <p className="text-[10px] text-red-300/90 leading-tight">
                    Human-in-the-Loop Review (Critical commands quarantined for manual confirmation)
                  </p>
                </div>

                {/* Tier 2: 40% - 69% Risk */}
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-300 text-xs">40% - 69% Threat</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 border border-neutral-700 text-amber-300 font-semibold tracking-wider">
                      INSPECTED
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-tight">
                    Sensitive Action (Inspected against scope before execution)
                  </p>
                </div>

                {/* Tier 1: 0% - 39% Risk */}
                <div className="p-2.5 rounded-lg bg-forest border border-emerald-900/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-300 text-xs">0% - 39% Threat</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-forest text-emerald-400 font-semibold border border-emerald-900/50 tracking-wider">
                      ALLOWED
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-tight">
                    Safe / Automated (Approved tools execute without delay)
                  </p>
                </div>
              </div>
            </div>

            {/* Ingestion Stream Guide */}
            <div className="bg-charcoal border border-forest rounded-xl p-4 shadow-[0_0_20px_rgba(6,17,12,0.8)] flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-200 uppercase tracking-wider mb-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span>Activity Feed Status</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Real-time pipeline monitoring AI agent execution commands. Use the attack simulator to test live responses.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">Live Status:</span>
                <span
                  className={`font-semibold ${
                    mockMode ? "text-amber-400" : connected ? "text-emerald-400" : "text-neutral-500"
                  }`}
                >
                  {mockMode ? "Simulation Active" : connected ? "Firewall Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* HITL Approval Modal Dialog */}
      <HITLApprovalModal
        event={activeModalEvent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAction={handleApprovalAction}
        queueCount={pendingQueue.length}
        isAuthenticated={isAuthenticated}
        onSignIn={() => setIsAuthenticated(true)}
      />

      {/* SOC Bottom Status Bar (Honest Chrome: SHA-256 hash-chained audit log) */}
      <footer className="border-t border-forest bg-charcoal/90 px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-neutral-400 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-emerald-500 animate-glow-pulse" : "bg-neutral-600"
              }`}
            />
            <span className="text-neutral-200">AgentShield PEP</span>
          </span>
          <span className="text-neutral-700">|</span>
          <span className="text-[11px] text-neutral-400">
            SHA-256 hash-chained audit log with HMAC-SHA256 tool manifest signatures
          </span>
        </div>
        <div className="text-[11px] text-neutral-400">
          Gateway: <span className="text-neutral-200">{BACKEND_URL}</span>
        </div>
      </footer>
    </div>
  );
}
