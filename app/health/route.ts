import { NextResponse } from "next/server";
import { SERVER_BACKEND_URL } from "@/lib/api-config";


export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${SERVER_BACKEND_URL}/health`, {
      cache: "no-store",
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json();
      return NextResponse.json({ ...data, mode: "fastapi_pep" }, { status: 200 });
    }
  } catch {
    // Backend offline or unreachable, fall back to Edge PEP
  }

  return NextResponse.json(
    {
      status: "ok",
      mode: "edge_pep",
      version: "2.4.0",
      shield_active: true,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
