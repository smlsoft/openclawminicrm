import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const agentUrl = () => process.env.AGENT_URL || "http://localhost:3000";

// GET — รายการ KB ทั้งหมด
export async function GET() {
  try {
    const res = await fetch(`${agentUrl()}/api/km`);
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — สร้าง KB ใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${agentUrl()}/api/km`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
