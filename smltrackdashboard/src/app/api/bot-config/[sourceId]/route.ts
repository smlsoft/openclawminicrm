import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const agentUrl = () => process.env.AGENT_URL || "http://agent:3000";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  try {
    const res = await fetch(`${agentUrl()}/config/${encodeURIComponent(sourceId)}`, {
      next: { revalidate: 0 },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  try {
    const body = await request.json();
    const res = await fetch(`${agentUrl()}/config/${encodeURIComponent(sourceId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
