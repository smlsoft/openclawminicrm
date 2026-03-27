import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDB();

    const [
      totalMessages, totalCustomers, totalGroups,
      platformMsgs, sentimentDist, pipelineDist,
      paymentStats, documentStats, staffSkills,
    ] = await Promise.all([
      db.collection("messages").countDocuments(),
      db.collection("customers").countDocuments(),
      db.collection("groups_meta").countDocuments(),
      // Messages by platform
      db.collection("messages").aggregate([
        { $group: { _id: "$platform", count: { $sum: 1 } } },
      ]).toArray(),
      // Sentiment distribution
      db.collection("chat_analytics").aggregate([
        { $group: { _id: "$overallSentiment.level", count: { $sum: 1 } } },
      ]).toArray(),
      // Pipeline distribution
      db.collection("customers").aggregate([
        { $group: { _id: "$pipelineStage", count: { $sum: 1 }, totalValue: { $sum: { $ifNull: ["$dealValue", 0] } } } },
      ]).toArray(),
      // Payment stats
      db.collection("payments").aggregate([
        { $group: { _id: "$status", count: { $sum: 1 }, totalAmount: { $sum: { $ifNull: ["$amount", 0] } } } },
      ]).toArray(),
      // Document stats
      db.collection("documents").aggregate([
        { $group: { _id: "$categoryGroup", count: { $sum: 1 } } },
      ]).toArray(),
      // Staff message counts
      db.collection("user_skills").aggregate([
        { $match: { isStaff: true } },
        { $group: { _id: "$userName", totalMessages: { $sum: "$messageCount" }, rooms: { $sum: 1 } } },
        { $sort: { totalMessages: -1 } },
        { $limit: 10 },
      ]).toArray(),
    ]);

    // Active/Inactive/At-risk customers
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);

    const [activeCount, atRiskCount, inactiveCount] = await Promise.all([
      db.collection("groups_meta").countDocuments({ lastMessageAt: { $gte: threeDaysAgo } }),
      db.collection("groups_meta").countDocuments({ lastMessageAt: { $gte: sevenDaysAgo, $lt: threeDaysAgo } }),
      db.collection("groups_meta").countDocuments({ lastMessageAt: { $lt: sevenDaysAgo } }),
    ]);

    // Purchase intent distribution
    const purchaseIntentDist = await db.collection("chat_analytics").aggregate([
      { $group: { _id: "$purchaseIntent.level", count: { $sum: 1 } } },
    ]).toArray();

    // Daily message volume (last 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const dailyMessages = await db.collection("messages").aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]).toArray();

    // Response time from KPI
    const kpiData = await db.collection("user_skills").aggregate([
      { $match: { isStaff: true } },
      { $group: {
        _id: "$userName",
        avgMessages: { $avg: "$messageCount" },
        totalRooms: { $sum: 1 },
      }},
      { $sort: { avgMessages: -1 } },
      { $limit: 10 },
    ]).toArray();

    return NextResponse.json({
      summary: { totalMessages, totalCustomers, totalGroups },
      platform: platformMsgs.map(p => ({ name: p._id || "unknown", value: p.count })),
      sentiment: sentimentDist.map(s => ({ name: s._id || "unknown", value: s.count })),
      purchaseIntent: purchaseIntentDist.map(p => ({ name: p._id || "unknown", value: p.count })),
      pipeline: pipelineDist.map(p => ({ name: p._id || "new", value: p.count, amount: p.totalValue })),
      payments: paymentStats.map(p => ({ name: p._id, value: p.count, amount: p.totalAmount })),
      documents: documentStats.map(d => ({ name: d._id || "unknown", value: d.count })),
      staff: staffSkills.map(s => ({ name: (s._id || "").replace("SML-", ""), messages: s.totalMessages, rooms: s.rooms })),
      staffKpi: kpiData.map(s => ({ name: (s._id || "").replace("SML-", ""), avgMessages: Math.round(s.avgMessages), rooms: s.totalRooms })),
      customerHealth: [
        { name: "ใช้งาน", value: activeCount },
        { name: "เสี่ยง", value: atRiskCount },
        { name: "หลุด", value: inactiveCount },
      ],
      dailyMessages: dailyMessages.map(d => ({
        name: d._id.substring(5), // MM-DD
        value: d.count,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
