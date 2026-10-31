import { NextResponse } from "next/server";
import { SERVER_BACKEND_URL } from "@/lib/api-config";
import { resolveApproval } from "@/lib/edge-pep";


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = { action: "APPROVE", reviewer: "SOC_ADMIN_01" };
  }

  const action = body.action || body.decision || "APPROVE";
  const reviewer = body.reviewer || body.admin || "SOC_ADMIN_01";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${SERVER_BACKEND_URL}/api/approvals/${encodeURIComponent(id)}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer admin-secret-session-90214",
      },
      body: JSON.stringify({
        action,
        decision: action,
        reviewer,
        call_id: id,
        note: body.note,
      }),
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

  const result = resolveApproval(id, action, reviewer);
  return NextResponse.json(result, { status: 200 });
}
