import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

function calcTier(scores: { engagement: number; purchaseIntent: number; lifetimeValue: number; churnRisk: number; overall: number }) {
  if (scores.overall >= 80) return "vip";
  if (scores.purchaseIntent >= 70 && scores.engagement >= 50) return "hot_lead";
  if (scores.churnRisk >= 60) return "at_risk";
  if (scores.overall >= 40) return "active";
  return "dormant";
}

export async function POST() {
  try {
    const db = await getDB();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    // ดึงข้อมูลลูกค้าทั้งหมด
    const groups = await db.collection("groups_meta").find({ sourceType: { $ne: "group" } }).toArray();
    let calculated = 0;

    for (const group of groups) {
      const sourceId = group.sourceId;

      // นับข้อความ 30 วัน
      const [msgCount30d, msgCount7d, lastMsg, payments, analytics] = await Promise.all([
        db.collection("messages").countDocuments({ sourceId, createdAt: { $gte: thirtyDaysAgo } }),
        db.collection("messages").countDocuments({ sourceId, createdAt: { $gte: sevenDaysAgo } }),
        db.collection("messages").findOne({ sourceId, role: "user" }, { sort: { createdAt: -1 } }),
        db.collection("payments").aggregate([
          { $match: { sourceId, status: "confirmed" } },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]).toArray(),
        db.collection("chat_analytics").findOne({ sourceId }, { sort: { createdAt: -1 } }),
      ]);

      // คำนวณ Engagement (0-100)
      const engagement = Math.min(100, Math.round(
        (msgCount30d > 0 ? Math.min(50, msgCount30d * 2) : 0) +
        (msgCount7d > 0 ? Math.min(30, msgCount7d * 5) : 0) +
        (lastMsg ? Math.max(0, 20 - Math.floor((now.getTime() - new Date(lastMsg.createdAt).getTime()) / 86400000)) : 0)
      ));

      // Purchase Intent (0-100) จาก AI analysis
      let purchaseIntent = 30;
      if (analytics?.purchaseIntent === "green") purchaseIntent = 85;
      else if (analytics?.purchaseIntent === "yellow") purchaseIntent = 55;
      else if (analytics?.purchaseIntent === "red") purchaseIntent = 15;

      // Lifetime Value (0-100) จาก payments
      const totalPaid = payments[0]?.total || 0;
      const payCount = payments[0]?.count || 0;
      const lifetimeValue = Math.min(100, Math.round(
        (totalPaid > 0 ? Math.min(60, totalPaid / 500) : 0) +
        (payCount > 0 ? Math.min(40, payCount * 10) : 0)
      ));

      // Churn Risk (0-100) ยิ่งสูงยิ่งเสี่ยง
      const daysSinceLastMsg = lastMsg
        ? Math.floor((now.getTime() - new Date(lastMsg.createdAt).getTime()) / 86400000)
        : 999;
      const churnRisk = Math.min(100, Math.round(
        daysSinceLastMsg >= 30 ? 90 :
        daysSinceLastMsg >= 14 ? 70 :
        daysSinceLastMsg >= 7 ? 50 :
        daysSinceLastMsg >= 3 ? 25 : 5
      ));

      // Overall (ค่าเฉลี่ยถ่วงน้ำหนัก)
      const overall = Math.round(
        engagement * 0.3 +
        purchaseIntent * 0.3 +
        lifetimeValue * 0.25 +
        (100 - churnRisk) * 0.15
      );

      const scores = { engagement, purchaseIntent, lifetimeValue, churnRisk, overall };
      const tier = calcTier(scores);

      await db.collection("customer_scores").updateOne(
        { sourceId },
        {
          $set: {
            sourceId,
            customerName: group.groupName || sourceId,
            platform: group.platform || "line",
            scores,
            tier,
            lastCalculated: now,
            updatedAt: now,
          },
          $push: { history: { $each: [{ date: now, overall }], $slice: -30 } } as any,
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
      calculated++;
    }

    return NextResponse.json({ ok: true, calculated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
