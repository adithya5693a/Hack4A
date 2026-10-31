import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api-config";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Map body to backend ApprovalAction schema:
    // backend expects { action: "APPROVE" | "REJECT", reviewer: string, ... }
    const action = body.action || body.decision;
    const reviewer = body.reviewer || body.admin || "SOC_ADMIN_01";

    const res = await fetch(`${BACKEND_URL}/api/approvals/${encodeURIComponent(id)}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        decision: action,
        reviewer,
        call_id: id,
        note: body.note,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Backend returned ${res.status}`, details: errText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to forward approval action to backend", details: String(error) },
      { status: 502 }
    );
  }
}
