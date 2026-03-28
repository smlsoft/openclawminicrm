import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDB();
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const pipeline = [
      { $match: { createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: null,
          todayCost: { $sum: { $cond: [{ $gte: ["$createdAt", todayStart] }, "$costUsd", 0] } },
          todayCalls: { $sum: { $cond: [{ $gte: ["$createdAt", todayStart] }, 1, 0] } },
          todayTokens: { $sum: { $cond: [{ $gte: ["$createdAt", todayStart] }, "$totalTokens", 0] } },
          yesterdayCost: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", yesterdayStart] }, { $lt: ["$createdAt", todayStart] }] }, "$costUsd", 0] } },
          yesterdayCalls: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", yesterdayStart] }, { $lt: ["$createdAt", todayStart] }] }, 1, 0] } },
          weekCost: { $sum: { $cond: [{ $gte: ["$createdAt", weekStart] }, "$costUsd", 0] } },
          weekCalls: { $sum: { $cond: [{ $gte: ["$createdAt", weekStart] }, 1, 0] } },
          monthCost: { $sum: "$costUsd" },
          monthCalls: { $sum: 1 },
          monthTokens: { $sum: "$totalTokens" },
        },
      },
    ];

    const [result] = await db.collection("ai_costs").aggregate(pipeline).toArray();
    const THB = 35;

    return NextResponse.json({
      today: { thb: +((result?.todayCost || 0) * THB).toFixed(2), calls: result?.todayCalls || 0, tokens: result?.todayTokens || 0 },
      yesterday: { thb: +((result?.yesterdayCost || 0) * THB).toFixed(2), calls: result?.yesterdayCalls || 0 },
      week: { thb: +((result?.weekCost || 0) * THB).toFixed(2), calls: result?.weekCalls || 0 },
      month: { thb: +((result?.monthCost || 0) * THB).toFixed(2), calls: result?.monthCalls || 0, tokens: result?.monthTokens || 0 },
    });
  } catch {
    return NextResponse.json({ today: { thb: 0, calls: 0, tokens: 0 }, yesterday: { thb: 0, calls: 0 }, week: { thb: 0, calls: 0 }, month: { thb: 0, calls: 0, tokens: 0 } });
  }
}
