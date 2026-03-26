import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const t0 = Date.now();
  try {
    const db = await getDB();

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "0");

    // 1. ดึง groups จาก groups_meta (ใช้ index, ไม่ต้อง aggregate messages)
    const allMeta = await db.collection("groups_meta")
      .find()
      .sort({ lastMessageAt: -1, _id: -1 })
      .skip(page * limit)
      .limit(limit)
      .toArray();

    const totalCount = await db.collection("groups_meta").countDocuments();
    const sourceIds = allMeta.map((m) => m.sourceId).filter(Boolean);

    if (sourceIds.length === 0) {
      return NextResponse.json({ groups: [], pagination: { total: 0, limit, page, pages: 0, hasMore: false } });
    }

    // 2. Batch fetch analytics + logs (simple $in queries — fast)
    const [allAnalytics, allLogCounts] = await Promise.all([
      db.collection("chat_analytics").find({ sourceId: { $in: sourceIds } }).toArray(),
      db.collection("analysis_logs").aggregate([
        { $match: { sourceId: { $in: sourceIds } } },
        { $group: { _id: "$sourceId", count: { $sum: 1 } } },
      ]).toArray(),
    ]);

    // 3. ดึง messages แบบ parallel find ต่อ sourceId (ใช้ index sourceId+createdAt)
    const msgResults = await Promise.all(
      sourceIds.map((sid) =>
        db.collection("messages")
          .find({ sourceId: sid }, { projection: { embedding: 0 } })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray()
      )
    );

    // 4. Build lookup maps
    const analyticsMap = new Map(allAnalytics.map((a) => [a.sourceId, a]));
    const logMap = new Map(allLogCounts.map((l) => [l._id, l.count]));
    const msgMap = new Map(sourceIds.map((sid, i) => [sid, msgResults[i]]));

    // 5. Assemble
    const groups = allMeta.map((meta) => {
      const sourceId = meta.sourceId;
      const analytics = analyticsMap.get(sourceId);
      const logCount = logMap.get(sourceId) || 0;
      const messages = msgMap.get(sourceId) || [];
      const lastMsg = messages[0];
      const count = meta.messageCount || messages.length;

      return {
        id: sourceId,
        name: meta.groupName || sourceId,
        sourceType: meta.sourceType || "unknown",
        platform: meta.platform || "line",
        messageCount: count,
        lastMessage: lastMsg?.content?.substring(0, 50) || "",
        lastActivity: lastMsg?.createdAt || meta.lastMessageAt || null,
        sentiment: analytics?.overallSentiment || analytics?.sentiment || null,
        customerSentiment: analytics?.customerSentiment || null,
        staffSentiment: analytics?.staffSentiment || null,
        overallSentiment: analytics?.overallSentiment || analytics?.sentiment || null,
        purchaseIntent: analytics?.purchaseIntent || null,
        analysisLogsCount: logCount,
        messages: messages.reverse().map((m: any) => ({
          ...m,
          _id: m._id.toString(),
          hasImage: m.messageType === "image",
        })),
      };
    });

    const tEnd = Date.now();
    console.log(`[/api/groups] page=${page} limit=${limit} groups=${groups.length} total=${totalCount} time=${tEnd - t0}ms`);

    return NextResponse.json({
      groups,
      pagination: {
        total: totalCount,
        limit,
        page,
        pages: Math.ceil(totalCount / limit),
        hasMore: (page + 1) * limit < totalCount,
      },
    });
  } catch (err: any) {
    console.error("[/api/groups] error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
