import { NextResponse } from "next/server";
import { SERVER_BACKEND_URL } from "@/lib/api-config";
import { executeAttackScenario } from "@/lib/edge-pep";


export async function POST(
  request: Request,
  { params }: { params: Promise<{ attackType: string }> }
) {
  const { attackType } = await params;
  const url = new URL(request.url);
  const shieldEnabled = url.searchParams.get("shield_enabled") !== "false";
  const autoResolve = url.searchParams.get("auto_resolve");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const query = new URLSearchParams();
    query.set("shield_enabled", String(shieldEnabled));
    if (autoResolve) query.set("auto_resolve", autoResolve);

    const res = await fetch(`${SERVER_BACKEND_URL}/api/attacks/${encodeURIComponent(attackType)}?${query.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  // Edge PEP fallback simulation
  const result = executeAttackScenario(attackType, shieldEnabled, autoResolve);
  return NextResponse.json(result, { status: 200 });
}
