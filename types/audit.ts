// ─── AgentShield — Cryptographic SHA-256 Hash-Chained Audit Trail Types ───────────────────

export interface AuditBlock {
  index: number;
  block_number: number;
  block_id: string; // e.g. "#00", "#01", "#02"
  timestamp: string; // formatted HH:MM:SS or ISO
  full_timestamp: string;
  call_id: string;
  agent_id: string;
  agent_role?: string;
  parent_agent_id?: string | null;
  tool_name: string;
  args_preview: string;
  decision: string; // "ALLOW", "DENY", "PENDING_APPROVAL"
  rule_id: string;
  reason?: string;
  risk_score?: number;
  risk_level?: string;
  prev_hash: string;
  current_hash: string;
  tampered?: boolean;
  invalid_from_here?: boolean;
}

export interface BackendAuditBlock {
  index: number;
  timestamp: number | string;
  call_id: string;
  agent_id: string;
  agent_role?: string;
  parent_agent_id?: string | null;
  tool_name: string;
  arguments_hash: string;
  args_preview: string;
  decision: string;
  rule_id: string;
  reason: string;
  risk_score: number;
  risk_level: string;
  previous_hash: string;
  block_hash: string;
}

export interface AuditVerificationResponse {
  valid: boolean;
  total_blocks: number;
  broken_index?: number | null;
  tampered_block?: {
    block_number: number;
    block_id: string;
    expected_hash: string;
    actual_hash: string;
  } | null;
  message: string;
  verified_at: string;
}
