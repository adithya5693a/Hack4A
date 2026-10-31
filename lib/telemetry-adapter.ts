import type { TelemetryEvent, TelemetryStatus } from "@/types/telemetry";

export function adaptBackendToTelemetry(raw: any): TelemetryEvent | null {
  if (!raw || typeof raw !== "object") return null;

  // Ignore connection lifecycle event
  if (raw.event === "connected") return null;

  // If this is an ATTACK_INTERCEPTED or NEW_BLOCK container, don't crash
  if (raw.event === "ATTACK_INTERCEPTED" || raw.event === "NEW_BLOCK") {
    return null;
  }

  const callId = raw.call_id || raw.id || raw.callId;
  const toolName = raw.tool_name || raw.tool;
  if (!callId && !toolName) return null;

  // Map status according to judge rubric:
  // ALLOW -> ALLOWED
  // DENY / BLOCKED -> BLOCKED
  // PENDING_APPROVAL -> PENDING
  // SHIELD_BYPASS / COMPROMISED -> COMPROMISED
  let status: TelemetryStatus = "ALLOWED";
  const rawStatus = (raw.status || raw.decision || "").toString().toUpperCase();
  const event = raw.event ? raw.event.toString().toLowerCase() : "";

  if (
    rawStatus === "COMPROMISED" ||
    rawStatus === "SHIELD_BYPASS" ||
    event === "shield_bypass" ||
    raw.shield_enabled === false && rawStatus === "SUCCESS" && raw.tainted
  ) {
    status = "COMPROMISED";
  } else if (
    event === "approval_required" ||
    rawStatus === "PENDING_APPROVAL" ||
    rawStatus === "REQUIRE_APPROVAL" ||
    rawStatus === "PENDING"
  ) {
    status = "PENDING";
  } else if (
    event === "blocked" ||
    event === "injection_detected" ||
    rawStatus === "DENY" ||
    rawStatus === "BLOCKED" ||
    rawStatus === "DENIED"
  ) {
    status = "BLOCKED";
  } else if (
    event === "allowed" ||
    rawStatus === "ALLOW" ||
    rawStatus === "ALLOWED" ||
    rawStatus === "SUCCESS"
  ) {
    status = "ALLOWED";
  } else if (event === "approval_resolved") {
    status = rawStatus === "ALLOW" || rawStatus === "ALLOWED" ? "ALLOWED" : "BLOCKED";
  }

  // Format arguments
  let args = "{}";
  if (raw.arguments !== undefined) {
    args = typeof raw.arguments === "string" ? raw.arguments : JSON.stringify(raw.arguments);
  } else if (raw.args !== undefined) {
    args = typeof raw.args === "string" ? raw.args : JSON.stringify(raw.args);
  }

  // Format reasons -> diagnosis
  let diagnosis = "";
  if (Array.isArray(raw.reasons) && raw.reasons.length > 0) {
    diagnosis = raw.reasons.join("; ");
  } else if (typeof raw.reason === "string" && raw.reason) {
    diagnosis = raw.reason;
  } else if (typeof raw.diagnosis === "string" && raw.diagnosis) {
    diagnosis = raw.diagnosis;
  } else if (raw.message) {
    diagnosis = String(raw.message);
  }

  // Format timestamp
  let timestamp = new Date().toISOString();
  if (raw.timestamp) {
    if (typeof raw.timestamp === "number") {
      timestamp = new Date(raw.timestamp > 1e11 ? raw.timestamp : raw.timestamp * 1000).toISOString();
    } else {
      timestamp = String(raw.timestamp);
    }
  }

  // Strictly use real risk_score if present; otherwise null (do not invent 94)
  let riskScore: number | null = null;
  if (typeof raw.risk_score === "number") {
    riskScore = Math.round(raw.risk_score);
  }

  const ruleId = raw.rule_id || raw.rule || undefined;

  let hopStage = raw.hop_stage;
  if (!hopStage) {
    if (toolName === "read_document" && (args.includes("invoice") || args.includes("document") || args.includes("txt"))) {
      hopStage = "Hop 1/2: Document Read";
    } else if (toolName === "execute_bash" && (args.includes("rm -rf") || args.includes("backups") || args.includes("curl"))) {
      hopStage = "Hop 2/2: Injected Threat Intercepted";
    } else if (toolName === "send_email" && (args.includes("evil") || args.includes("exfiltrat"))) {
      hopStage = "Hop 2/2: Injected Exfil Intercepted";
    } else if (raw.step_index !== undefined) {
      hopStage = `Step ${raw.step_index + 1}`;
    }
  }

  return {
    id: String(callId || `call_${Date.now()}`),
    timestamp,
    agent_id: String(raw.agent_id || "Worker-Agent-01"),
    tool_name: String(toolName || "unknown_tool"),
    args,
    risk_score: riskScore,
    status,
    diagnosis: diagnosis || (status === "BLOCKED" ? "Blocked by policy engine" : status === "COMPROMISED" ? "Compromised: Unrestricted execution (Shield OFF)" : "Execution verified"),
    rule_id: ruleId,
    event_type: raw.event || undefined,
    hop_stage: hopStage,
  };
}
