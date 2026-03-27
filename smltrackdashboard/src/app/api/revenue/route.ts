import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const period = request.nextUrl.searchParams.get("period") || "month";

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // ยอดรวมแต่ละช่วง
    const [todayTotal, weekTotal, monthTotal, lastMonthTotal, yearTotal] = await Promise.all([
      db.collection("payments").aggregate([
        { $match: { status: "confirmed", createdAt: { $gte: todayStart } } },
        { $group: { _id: null, sum: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]).toArray(),
      db.collection("payments").aggregate([
        { $match: { status: "confirmed", createdAt: { $gte: weekStart } } },
        { $group: { _id: null, sum: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]).toArray(),
      db.collection("payments").aggregate([
        { $match: { status: "confirmed", createdAt: { $gte: monthStart } } },
        { $group: { _id: null, sum: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]).toArray(),
      db.collection("payments").aggregate([
        { $match: { status: "confirmed", createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: null, sum: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]).toArray(),
      db.collection("payments").aggregate([
        { $match: { status: "confirmed", createdAt: { $gte: yearStart } } },
        { $group: { _id: null, sum: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]).toArray(),
    ]);

    // รายได้รายวัน 30 วัน
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyRevenue = await db.collection("payments").aggregate([
      { $match: { status: "confirmed", createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sum: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    // แยกตาม platform
    const byPlatform = await db.collection("payments").aggregate([
      { $match: { status: "confirmed", createdAt: { $gte: monthStart } } },
      { $group: { _id: "$platform", sum: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]).toArray();

    // Pipeline value (มูลค่ารอปิด)
    const activeStages = ["interested", "quoting", "negotiating", "following_up"];
    const pipelineValue = await db.collection("customers").aggregate([
      { $match: { pipelineStage: { $in: activeStages } } },
      { $group: { _id: "$pipelineStage", sum: { $sum: "$dealValue" }, count: { $sum: 1 } } },
    ]).toArray();

    const wonValue = await db.collection("customers").aggregate([
      { $match: { pipelineStage: "closed_won" } },
      { $group: { _id: null, sum: { $sum: "$dealValue" }, count: { $sum: 1 } } },
    ]).toArray();

    // ทำนายยอดสิ้นเดือน (linear projection)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const monthSoFar = monthTotal[0]?.sum || 0;
    const projected = dayOfMonth > 0 ? Math.round((monthSoFar / dayOfMonth) * daysInMonth) : 0;

    // เปรียบเทียบเดือนก่อน
    const lastMonthSum = lastMonthTotal[0]?.sum || 0;
    const monthSum = monthTotal[0]?.sum || 0;
    const monthChange = lastMonthSum > 0 ? Math.round(((monthSum - lastMonthSum) / lastMonthSum) * 100) : 0;

    return NextResponse.json({
      today: { sum: todayTotal[0]?.sum || 0, count: todayTotal[0]?.count || 0 },
      week: { sum: weekTotal[0]?.sum || 0, count: weekTotal[0]?.count || 0 },
      month: { sum: monthSum, count: monthTotal[0]?.count || 0 },
      lastMonth: { sum: lastMonthSum, count: lastMonthTotal[0]?.count || 0 },
      year: { sum: yearTotal[0]?.sum || 0, count: yearTotal[0]?.count || 0 },
      monthChange,
      projected,
      dailyRevenue: dailyRevenue.map((d) => ({ date: d._id, sum: d.sum, count: d.count })),
      byPlatform: byPlatform.map((p) => ({ platform: p._id || "unknown", sum: p.sum, count: p.count })),
      pipeline: pipelineValue.map((p) => ({ stage: p._id, sum: p.sum, count: p.count })),
      won: { sum: wonValue[0]?.sum || 0, count: wonValue[0]?.count || 0 },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
