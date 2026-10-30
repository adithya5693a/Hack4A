import { NextResponse } from "next/server";
import type { ApprovalPayload, ApprovalResponse } from "@/types/telemetry";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as ApprovalPayload;

    if (!body || !body.decision || !body.admin) {
      return NextResponse.json(
        { error: "Invalid approval payload. Expected 'decision' and 'admin'." },
        { status: 400 }
      );
    }

    const response: ApprovalResponse = {
      success: true,
      event_id: id,
      decision: body.decision,
      admin: body.admin,
      timestamp: new Date().toISOString(),
      message:
        body.decision === "APPROVE"
          ? `Authorization granted one-time by ${body.admin}`
          : `Execution blocked & agent quarantined by ${body.admin}`,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process approval action", details: String(error) },
      { status: 500 }
    );
  }
}
