import { NextResponse } from "next/server";
import { SERVER_BACKEND_URL } from "@/lib/api-config";
import { runCustomPrompt } from "@/lib/edge-pep";


export async function POST(request: Request) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = { prompt: "Default inspection task" };
  }

  const prompt = body.prompt || "Default inspection task";
  const shieldEnabled = body.shield_enabled !== false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${SERVER_BACKEND_URL}/api/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, shield_enabled: shieldEnabled }),
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
  const result = runCustomPrompt(prompt, shieldEnabled);
  return NextResponse.json(result, { status: 200 });
}
