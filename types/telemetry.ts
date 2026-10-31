// ─── AgentShield — Telemetry Types ───────────────────────────────────────────
// Isolated in /types/telemetry.ts as required by constraints

export type TelemetryStatus = "ALLOWED" | "BLOCKED" | "PENDING" | "COMPROMISED";

export interface TelemetryEvent {
  /** Unique event identifier e.g. "evt_1048" or backend "call_id" */
  id: string;
  /** ISO-8601 UTC timestamp or string timestamp */
  timestamp: string;
  /** Originating agent identifier e.g. "Worker-Agent-01" */
  agent_id: string;
  /** Name of the tool the agent requested to execute */
  tool_name: string;
  /** Raw JSON arguments string e.g. "{\"command\": \"rm -rf /backups\"}" */
  args: string;
  /** Risk score calculated from 0 to 100 (null if unassessed) */
  risk_score?: number | null;
  /** Policy decision status: ALLOWED, BLOCKED, PENDING, or COMPROMISED */
  status: TelemetryStatus;
  /** Optional natural-language diagnosis explaining the security reasoning */
  diagnosis?: string;
  /** Security rule ID evaluated by the Policy Enforcement Point (e.g. R-TAINT-01) */
  rule_id?: string;
  /** Underlying event type (e.g. approval_required, allowed, blocked) */
  event_type?: string;
  /** Multi-hop execution stage (e.g. "Hop 1/2: Document Read") */
  hop_stage?: string;
}

export type ApprovalDecision = "APPROVE" | "REJECT";

export interface ApprovalPayload {
  decision: ApprovalDecision;
  admin: string;
}

export interface ApprovalResponse {
  success: boolean;
  event_id: string;
  decision: ApprovalDecision;
  admin: string;
  timestamp: string;
  message?: string;
}

export interface AttackScenarioDefinition {
  id: string;
  name: string;
  badge: string;
  subtext: string;
  prompt: string;
  agent_id: string;
  tool_name: string;
  args: string;
  risk_score: number;
  diagnosis: string;
}

export interface AgentRunRequest {
  prompt: string;
  scenario_id: string;
}

export interface AgentRunResponse {
  success: boolean;
  scenario_id: string;
  prompt: string;
  event: TelemetryEvent;
  message?: string;
}

/** Helper function to summarize arguments string into human-readable compact preview */
export function summariseArgs(rawArgs: string, maxLen = 70): string {
  try {
    const parsed = JSON.parse(rawArgs);
    if (typeof parsed === "object" && parsed !== null) {
      const parts = Object.entries(parsed).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
      const joined = parts.join(", ");
      return joined.length > maxLen ? `${joined.slice(0, maxLen - 3)}...` : joined;
    }
  } catch {
    // fallback if not valid JSON
  }
  return rawArgs.length > maxLen ? `${rawArgs.slice(0, maxLen - 3)}...` : rawArgs;
}

/** Risk band classifier */
export function getRiskLevel(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}
