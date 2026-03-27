import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const t0 = Date.now();
  try {
    const db = await getDB();

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "0");
    const platformFilter = request.nextUrl.searchParams.get("platform") || "";

    // 1. ดึง sourceIds — ใช้ groups_meta เป็นหลัก (มี platform info)
    let filteredMeta;
    if (platformFilter) {
      filteredMeta = await db.collection("groups_meta")
        .find({ platform: platformFilter })
        .sort({ lastMessageAt: -1 })
        .toArray();
    } else {
      filteredMeta = await db.collection("groups_meta")
        .find()
        .sort({ lastMessageAt: -1 })
        .toArray();
    }

    // Fallback: ถ้า groups_meta ว่าง ดึงจาก messages
    let allSourceIds: string[];
    if (filteredMeta.length > 0) {
      allSourceIds = filteredMeta.map(m => m.sourceId).filter(Boolean);
    } else {
      allSourceIds = (await db.collection("messages").distinct("sourceId")).filter(Boolean);
    }

    const totalCount = allSourceIds.length;
    const sourceIds = allSourceIds.slice(page * limit, (page + 1) * limit);

    // ดึง groups_meta สำหรับ sourceIds ที่ paginate แล้ว
    const allMeta = filteredMeta.length > 0
      ? filteredMeta.filter(m => sourceIds.includes(m.sourceId))
      : sourceIds.length > 0
        ? await db.collection("groups_meta").find({ sourceId: { $in: sourceIds } }).toArray()
        : [];

    // Platform counts (สำหรับ UI badges)
    const platformCounts = platformFilter
      ? undefined
      : await db.collection("groups_meta").aggregate([
          { $group: { _id: "$platform", count: { $sum: 1 } } },
        ]).toArray();

    if (sourceIds.length === 0) {
      return NextResponse.json({ groups: [], platformCounts: platformCounts || [], pagination: { total: 0, limit, page, pages: 0, hasMore: false } });
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
    const metaMap = new Map(allMeta.map((m) => [m.sourceId, m]));
    const analyticsMap = new Map(allAnalytics.map((a) => [a.sourceId, a]));
    const logMap = new Map(allLogCounts.map((l) => [l._id, l.count]));
    const msgMap = new Map(sourceIds.map((sid, i) => [sid, msgResults[i]]));

    // 5. Assemble — loop sourceIds (not allMeta which may be empty)
    const groups = sourceIds.map((sourceId) => {
      const meta = metaMap.get(sourceId);
      const analytics = analyticsMap.get(sourceId);
      const logCount = logMap.get(sourceId) || 0;
      const messages = msgMap.get(sourceId) || [];
      const lastMsg = messages[0];
      const count = messages.length;

      return {
        id: sourceId,
        name: meta?.groupName || sourceId,
        sourceType: meta?.sourceType || "unknown",
        platform: meta?.platform || "line",
        messageCount: count,
        lastMessage: lastMsg?.content?.substring(0, 50) || "",
        lastActivity: lastMsg?.createdAt || meta?.lastMessageAt || null,
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
      platformCounts: platformCounts || [],
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
