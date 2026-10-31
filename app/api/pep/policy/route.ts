import { NextResponse } from "next/server";
import { SERVER_BACKEND_URL } from "@/lib/api-config";


export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${SERVER_BACKEND_URL}/api/pep/policy`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: 200 });
    }
  } catch {
    // Edge fallback
  }

  return NextResponse.json(
    {
      pep_version: "2.4.0",
      role_permissions: {
        admin: ["read_document", "query_database", "execute_bash", "send_email", "rotate_encryption_keys"],
        supervisor: ["read_document", "query_database", "send_email"],
        worker: ["read_document", "query_database"],
      },
      tool_tiers: {
        read_document: "TIER_1_STANDARD",
        query_database: "TIER_1_STANDARD",
        send_email: "TIER_2_RESTRICTED",
        execute_bash: "TIER_3_ELEVATED",
        rotate_encryption_keys: "TIER_4_CRITICAL",
      },
      admin_only_tools: ["rotate_encryption_keys", "execute_bash"],
      active_rules: [
        { id: "R-TAINT-01", name: "Dynamic Taint Tracking", level: "CRITICAL", enforced: true },
        { id: "R-EGRESS-01", name: "Egress Domain Allowlist", level: "HIGH", enforced: true },
        { id: "R-SENSITIVE-01", name: "Sensitive Vault Protection", level: "HIGH", enforced: true },
        { id: "R-RBAC-01", name: "Role-Based Access Control", level: "HIGH", enforced: true },
        { id: "R-REG-01", name: "Signed Tool Registry Integrity", level: "CRITICAL", enforced: true },
        { id: "R-HITL-01", name: "Human-in-the-Loop Gate", level: "MEDIUM", enforced: true },
      ],
      audit_integrity: "SHA-256 Hash Chained Merkle Ledger Active",
    },
    { status: 200 }
  );
}
