// ─── AgentShield — Cryptographic Audit Trail Types ─────────────────────────

export interface AuditBlock {
  block_number: number;
  block_id: string; // e.g. "#01", "#02", "#03", "#04", "#05"
  timestamp: string; // formatted HH:MM:SS
  full_timestamp: string; // ISO-8601
  action: string; // Tool name and arguments preview
  agent_id: string;
  prev_hash: string;
  current_hash: string;
  tampered?: boolean;
  invalid_from_here?: boolean;
}

export interface AuditVerificationResponse {
  valid: boolean;
  total_blocks: number;
  tampered_block?: {
    block_number: number;
    block_id: string;
    expected_hash: string;
    actual_hash: string;
  } | null;
  message: string;
  verified_at: string;
}
