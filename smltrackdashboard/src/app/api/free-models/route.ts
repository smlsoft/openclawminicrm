import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENT_URL = process.env.AGENT_URL || "http://agent:3000";

export async function GET() {
  try {
    const res = await fetch(`${AGENT_URL}/api/free-models`, { next: { revalidate: 0 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ count: 0, lastDiscovery: null, models: [], paidAI: false });
  }
}
