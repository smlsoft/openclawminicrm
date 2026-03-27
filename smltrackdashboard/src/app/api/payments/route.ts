import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const status = request.nextUrl.searchParams.get("status") || "";
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "0");

    const filter: any = {};
    if (status) filter.status = status;

    const [payments, total] = await Promise.all([
      db.collection("payments")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit)
        .toArray(),
      db.collection("payments").countDocuments(filter),
    ]);

    // Enrich with group names
    const sourceIds = [...new Set(payments.map(p => p.sourceId))];
    const metas = sourceIds.length > 0
      ? await db.collection("groups_meta").find({ sourceId: { $in: sourceIds } }, { projection: { sourceId: 1, groupName: 1 } }).toArray()
      : [];
    const metaMap = new Map(metas.map(m => [m.sourceId, m.groupName]));

    const result = payments.map(p => ({
      ...p,
      _id: p._id.toString(),
      messageId: p.messageId?.toString() || "",
      roomName: metaMap.get(p.sourceId) || p.sourceId,
    }));

    return NextResponse.json({ payments: result, total, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
