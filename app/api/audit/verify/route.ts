import { NextResponse } from "next/server";
import type { AuditVerificationResponse } from "@/types/audit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isTampered = searchParams.get("tampered") === "true";

    if (isTampered) {
      const response: AuditVerificationResponse = {
        valid: false,
        total_blocks: 5,
        tampered_block: {
          block_number: 2,
          block_id: "#02",
          expected_hash: "0x7a89e1f48201cdba",
          actual_hash: "0xdeadbeef1337c0de",
        },
        message: "TAMPER DETECTED: Hash mismatch at Block #02",
        verified_at: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 200 });
    }

    const response: AuditVerificationResponse = {
      valid: true,
      total_blocks: 5,
      tampered_block: null,
      message: "Integrity Verified: Chain Valid",
      verified_at: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Verification routine failed", details: String(error) },
      { status: 500 }
    );
  }
}
