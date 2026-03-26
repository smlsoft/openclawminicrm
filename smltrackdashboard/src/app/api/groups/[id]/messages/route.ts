import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t0 = Date.now();
  try {
    const { id: sourceId } = await params;
    const db = await getDB();

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const before = url.searchParams.get("before");

    const query: any = { sourceId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await db
      .collection("messages")
      .find(query, { projection: { embedding: 0, "analysis": 0, "aiResponse": 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    console.log(`[/api/groups/messages] sourceId=${sourceId.substring(0,10)}... limit=${limit} count=${messages.length} time=${Date.now() - t0}ms`);

    return NextResponse.json(messages.reverse().map((m) => ({
      ...m,
      _id: m._id.toString(),
    })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
