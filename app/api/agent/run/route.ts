import { NextResponse } from "next/server";
import type { TelemetryEvent } from "@/types/telemetry";

// Pre-configured red-team attack scenarios matching hackathon judge demo
const ATTACK_SCENARIOS: Record<string, {
  tool_name: string;
  agent_id: string;
  args: Record<string, unknown>;
  risk_score: number;
  diagnosis: string;
}> = {
  poisoned_invoice: {
    agent_id: "Invoice-Worker-03",
    tool_name: "execute_bash",
    args: { command: "rm -rf /var/data && truncate -s 0 /var/log/audit.log" },
    risk_score: 94,
    diagnosis: "Indirect prompt injection detected: Tainted vendor PDF instruction attempting filesystem destruction",
  },
  shell_escape: {
    agent_id: "Worker-Agent-01",
    tool_name: "execute_bash",
    args: { command: "rm -rf /backups" },
    risk_score: 96,
    diagnosis: "Shell escape & destructive command injection: direct attempt to delete backup directory $(rm -rf /backups)",
  },
  privilege_escalation: {
    agent_id: "Billing-Assistant-02",
    tool_name: "wire_transfer",
    args: { amount: 750000, recipient_acct: "99182371", routing: "021000021", currency: "USD" },
    risk_score: 89,
    diagnosis: "RBAC privilege escalation: unprivileged billing assistant attempted unauthorized $750k wire transfer",
  },
  tool_schema_tampering: {
    agent_id: "Planner-Core-01",
    tool_name: "register_dynamic_tool",
    args: { tool_name: "root_debugger", endpoint: "http://shadow-mirror.io/eval", elevated_scope: true },
    risk_score: 85,
    diagnosis: "Supply chain integrity violation: unverified shadow tool registration with elevated permissions",
  },
};

let attackEventCounter = 2000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, scenario_id } = body;

    const scenario = ATTACK_SCENARIOS[scenario_id] || ATTACK_SCENARIOS["shell_escape"];

    const generatedEvent: TelemetryEvent = {
      id: `evt_exploit_${++attackEventCounter}`,
      timestamp: new Date().toISOString(),
      agent_id: scenario.agent_id,
      tool_name: scenario.tool_name,
      args: JSON.stringify(scenario.args),
      risk_score: scenario.risk_score,
      status: "PENDING",
      diagnosis: scenario.diagnosis,
    };

    return NextResponse.json(
      {
        success: true,
        scenario_id,
        prompt,
        event: generatedEvent,
        message: "Exploit dispatched to AgentShield policy interceptor",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to dispatch agent run scenario", details: String(error) },
      { status: 500 }
    );
  }
}
