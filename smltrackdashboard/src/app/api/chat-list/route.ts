import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat-list — Fast conversation list for Chat page
 * ดึงแค่ groups_meta + chat_analytics + last message (1 ข้อความ/ห้อง)
 * เร็วกว่า /api/groups 10x เพราะไม่ดึง messages array
 */
export async function GET(request: NextRequest) {
  const t0 = Date.now();
  try {
    const db = await getDB();
    const platform = request.nextUrl.searchParams.get("platform") || "";

    // 1. ดึง groups_meta ทั้งหมด (เรียงตาม lastMessageAt)
    const filter: any = {};
    if (platform) filter.platform = platform;

    const [allMeta, allAnalytics] = await Promise.all([
      db.collection("groups_meta")
        .find(filter, { projection: { sourceId: 1, groupName: 1, platform: 1, sourceType: 1, messageCount: 1, lastMessageAt: 1 } })
        .sort({ lastMessageAt: -1 })
        .toArray(),
      db.collection("chat_analytics")
        .find({}, { projection: { sourceId: 1, overallSentiment: 1, sentiment: 1, customerSentiment: 1, purchaseIntent: 1 } })
        .toArray(),
    ]);

    // 2. Batch ดึง last message ของทุกห้อง (1 query ด้วย aggregate)
    const sourceIds = allMeta.map(m => m.sourceId);
    const lastMessages = await db.collection("messages").aggregate([
      { $match: { sourceId: { $in: sourceIds } } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: "$sourceId",
        content: { $first: "$content" },
        userName: { $first: "$userName" },
        createdAt: { $first: "$createdAt" },
        platform: { $first: "$platform" },
      }},
    ]).toArray();

    // 3. Build maps
    const analyticsMap = new Map(allAnalytics.map(a => [a.sourceId, a]));
    const lastMsgMap = new Map(lastMessages.map(m => [m._id, m]));

    // 4. Assemble
    const conversations = allMeta.map(meta => {
      const analytics = analyticsMap.get(meta.sourceId);
      const lastMsg = lastMsgMap.get(meta.sourceId);
      return {
        id: meta.sourceId,
        name: meta.groupName || meta.sourceId,
        sourceType: meta.sourceType || "unknown",
        platform: meta.platform || "line",
        messageCount: meta.messageCount || 0,
        lastMessage: lastMsg?.content?.substring(0, 60) || "",
        lastUser: lastMsg?.userName || "",
        lastActivity: lastMsg?.createdAt || meta.lastMessageAt || null,
        sentiment: analytics?.overallSentiment || analytics?.sentiment || null,
        customerSentiment: analytics?.customerSentiment || null,
        purchaseIntent: analytics?.purchaseIntent || null,
      };
    });

    const tEnd = Date.now();
    console.log(`[/api/chat-list] ${conversations.length} convs, platform=${platform || "all"}, ${tEnd - t0}ms`);

    return NextResponse.json({
      conversations,
      total: conversations.length,
    });
  } catch (err: any) {
    console.error("[/api/chat-list] error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
