import { NextResponse } from "next/server";
import { SERVER_BACKEND_URL } from "@/lib/api-config";
import { getPendingApprovals } from "@/lib/edge-pep";


export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${SERVER_BACKEND_URL}/api/approvals/pending`, {
      method: "GET",
      headers: {
        "Authorization": "Bearer admin-secret-session-90214",
      },
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

  const items = getPendingApprovals();
  return NextResponse.json({ pending_approvals: items, count: items.length }, { status: 200 });
}
