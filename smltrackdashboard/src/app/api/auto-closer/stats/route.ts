import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDB();

    const [ruleStats, queueByStatus, totalRules] = await Promise.all([
      db.collection("follow_up_rules").aggregate([
        {
          $group: {
            _id: null,
            totalTriggered: { $sum: "$stats.triggered" },
            totalReplied: { $sum: "$stats.replied" },
            totalConverted: { $sum: "$stats.converted" },
          },
        },
      ]).toArray(),
      db.collection("follow_up_queue").aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).toArray(),
      db.collection("follow_up_rules").countDocuments(),
    ]);

    const stats = ruleStats[0] || { totalTriggered: 0, totalReplied: 0, totalConverted: 0 };
    const replyRate = stats.totalTriggered > 0 ? Math.round((stats.totalReplied / stats.totalTriggered) * 100) : 0;
    const conversionRate = stats.totalTriggered > 0 ? Math.round((stats.totalConverted / stats.totalTriggered) * 100) : 0;

    return NextResponse.json({
      totalRules,
      totalTriggered: stats.totalTriggered,
      totalReplied: stats.totalReplied,
      totalConverted: stats.totalConverted,
      replyRate,
      conversionRate,
      queueByStatus: Object.fromEntries(queueByStatus.map((s) => [s._id, s.count])),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
