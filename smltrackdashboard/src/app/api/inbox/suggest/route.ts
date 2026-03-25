import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Proxy → Agent: AI แนะนำคำตอบให้ admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const agentUrl = process.env.AGENT_URL || "http://localhost:3000";
    const res = await fetch(`${agentUrl}/api/inbox/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message, suggestions: [] }, { status: 500 });
  }
}
