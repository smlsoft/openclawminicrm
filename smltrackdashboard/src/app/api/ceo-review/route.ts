import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENT_URL = process.env.AGENT_URL || "http://agent:3000";

// Cache per agent — ไม่ถี่เกินไป (5 นาที/ตัว)
const reviewCache: Record<string, { ceo: string; emp: string; ts: number }> = {};
const CACHE_TTL = 300000; // 5 นาที

export async function GET(req: NextRequest) {
  const agentName = req.nextUrl.searchParams.get("agent") || "";
  if (!agentName) return NextResponse.json({ ceo: "", emp: "" });

  // ใช้ cache ถ้ายังไม่หมดอายุ
  const cached = reviewCache[agentName];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ ceo: cached.ceo, emp: cached.emp });
  }

  try {
    const res = await fetch(`${AGENT_URL}/api/ceo-review?agent=${encodeURIComponent(agentName)}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ceo && data.emp) {
        reviewCache[agentName] = { ceo: data.ceo, emp: data.emp, ts: Date.now() };
        return NextResponse.json(data);
      }
    }
  } catch { /* fallback */ }

  return NextResponse.json({ ceo: "", emp: "" });
}
