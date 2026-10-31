import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api-config";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/audit/verify`, {
      method: "GET",
      cache: "no-store",
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
      { error: "Failed to forward audit verify to backend", details: String(error) },
      { status: 502 }
    );
  }
}
