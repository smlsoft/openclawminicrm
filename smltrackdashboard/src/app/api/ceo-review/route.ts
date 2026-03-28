import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENT_URL = process.env.AGENT_URL || "http://agent:3000";

// Proxy ไปยัง agent /api/ceo-plan — batch ทุกตัว
export async function GET() {
  try {
    const res = await fetch(`${AGENT_URL}/api/ceo-plan`, { signal: AbortSignal.timeout(25000) });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch { /* fallback */ }
  return NextResponse.json({});
}
