import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const t0 = Date.now();
  try {
    const db = await getDB();
    const tDb = Date.now();

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "0");

    // 1. ดึง sourceIds + lastActivity + count ด้วย aggregation เดียว (แทน N+1)
    const sourceAgg = await db
      .collection("messages")
      .aggregate([
        {
          $group: {
            _id: "$sourceId",
            messageCount: { $sum: 1 },
            lastActivity: { $max: "$createdAt" },
          },
        },
        { $sort: { lastActivity: -1 } },
        { $skip: page * limit },
        { $limit: limit },
      ])
      .toArray();

    const total = await db.collection("messages").aggregate([
      { $group: { _id: "$sourceId" } },
      { $count: "total" },
    ]).toArray();
    const totalCount = total[0]?.total || 0;

    const sourceIds = sourceAgg.map((s) => s._id).filter(Boolean);
    if (sourceIds.length === 0) {
      return NextResponse.json({ groups: [], pagination: { total: 0, limit, page, pages: 0, hasMore: false } });
    }

    // 2. Batch queries — ดึงทุกอย่างใน $in เดียว (ไม่มี N+1)
    // Dashboard ไม่ต้องการ full messages — แค่ lastMessage ก็พอ
    const [allMeta, allAnalytics, allLogCounts, lastMessages] = await Promise.all([
      db.collection("groups_meta").find({ sourceId: { $in: sourceIds } }).toArray(),
      db.collection("chat_analytics").find({ sourceId: { $in: sourceIds } }).toArray(),
      db.collection("analysis_logs").aggregate([
        { $match: { sourceId: { $in: sourceIds } } },
        { $group: { _id: "$sourceId", count: { $sum: 1 } } },
      ]).toArray(),
      // ดึงแค่ข้อความล่าสุด 1 ข้อความต่อ sourceId (เร็วมาก)
      db.collection("messages").aggregate([
        { $match: { sourceId: { $in: sourceIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$sourceId", lastMsg: { $first: "$$ROOT" } } },
        { $project: { "lastMsg.embedding": 0, "lastMsg.imageUrl": 0 } },
      ]).toArray(),
    ]);

    // 3. Build lookup maps
    const metaMap = new Map(allMeta.map((m) => [m.sourceId, m]));
    const analyticsMap = new Map(allAnalytics.map((a) => [a.sourceId, a]));
    const logMap = new Map(allLogCounts.map((l) => [l._id, l.count]));
    const lastMsgMap = new Map(lastMessages.map((m) => [m._id, m.lastMsg]));

    // 4. Assemble results (no DB calls in loop)
    const groups = sourceAgg.map((src) => {
      const sourceId = src._id;
      const meta = metaMap.get(sourceId);
      const analytics = analyticsMap.get(sourceId);
      const logCount = logMap.get(sourceId) || 0;
      const lastMsg = lastMsgMap.get(sourceId);

      return {
        id: sourceId,
        name: meta?.groupName || sourceId,
        sourceType: meta?.sourceType || "unknown",
        platform: meta?.platform || "line",
        messageCount: src.messageCount,
        lastMessage: lastMsg?.content?.substring(0, 50) || "",
        lastActivity: src.lastActivity || null,
        sentiment: analytics?.overallSentiment || analytics?.sentiment || null,
        customerSentiment: analytics?.customerSentiment || null,
        staffSentiment: analytics?.staffSentiment || null,
        overallSentiment: analytics?.overallSentiment || analytics?.sentiment || null,
        purchaseIntent: analytics?.purchaseIntent || null,
        analysisLogsCount: logCount,
      };
    });

    const tEnd = Date.now();
    console.log(`[/api/groups] page=${page} limit=${limit} groups=${groups.length} total=${totalCount} db=${tDb - t0}ms query=${tEnd - tDb}ms total=${tEnd - t0}ms`);

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
