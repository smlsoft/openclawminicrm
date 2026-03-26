import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agentUrl = process.env.AGENT_URL || "http://localhost:3000";
    const res = await fetch(`${agentUrl}/api/customers/duplicates`);
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
