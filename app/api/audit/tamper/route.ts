import { NextResponse } from "next/server";
import { SERVER_BACKEND_URL } from "@/lib/api-config";
import { tamperAuditLedger } from "@/lib/edge-pep";


export async function POST(request: Request) {
  const url = new URL(request.url);
  const blockIndex = parseInt(url.searchParams.get("block_index") || "1", 10);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${SERVER_BACKEND_URL}/api/audit/tamper?block_index=${blockIndex}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer admin-secret-session-90214",
      },
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

  const result = tamperAuditLedger(blockIndex);
  return NextResponse.json(result, { status: 200 });
}
