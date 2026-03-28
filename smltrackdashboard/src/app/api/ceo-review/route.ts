import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENT_URL = process.env.AGENT_URL || "http://agent:3000";

export async function GET(req: NextRequest) {
  const isStory = req.nextUrl.searchParams.get("story") === "1";

  if (isStory) {
    // ดึงนิทานสั้น
    try {
      const res = await fetch(`${AGENT_URL}/api/ceo-stories`, { signal: AbortSignal.timeout(20000) });
      if (res.ok) return NextResponse.json(await res.json());
    } catch { /* fallback */ }
    return NextResponse.json({ stories: [] });
  }

  // ดึง plan ปกติ
  try {
    const res = await fetch(`${AGENT_URL}/api/ceo-plan`, { signal: AbortSignal.timeout(25000) });
    if (res.ok) return NextResponse.json(await res.json());
  } catch { /* fallback */ }
  return NextResponse.json({});
}
