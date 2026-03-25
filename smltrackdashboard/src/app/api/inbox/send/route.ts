import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Dashboard proxy: forward send request to Agent
// รองรับ: text, imageUrl, videoUrl, audioUrl, location, sticker, template, flex, quickReply
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, platform } = body;

    if (!sourceId || !platform) {
      return NextResponse.json({ error: "sourceId and platform required" }, { status: 400 });
    }

    // Forward ทั้ง body ไปให้ Agent (proxy) ซึ่งมี LINE/Meta tokens
    const agentUrl = process.env.AGENT_URL || "http://localhost:3000";
    const agentRes = await fetch(`${agentUrl}/api/inbox/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!agentRes.ok) {
      const errText = await agentRes.text().catch(() => "agent error");
      return NextResponse.json({ error: errText }, { status: agentRes.status });
    }

    const result = await agentRes.json().catch(() => ({ ok: true }));
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
