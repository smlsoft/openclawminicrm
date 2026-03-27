import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const sp = request.nextUrl.searchParams;

    const now = new Date();

    // ─── Custom date range ───
    const fromParam = sp.get("from");
    const toParam = sp.get("to");
    const from = fromParam ? new Date(fromParam) : null;
    const to = toParam ? new Date(toParam + "T23:59:59.999Z") : null;

    // ─── Standard ranges ───
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Custom range filter
    const customFilter = from && to
      ? { status: "confirmed", createdAt: { $gte: from, $lte: to } }
      : null;

    // ─── ยอดรวมแต่ละช่วง ───
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

    // ─── Custom range total ───
    let customTotal = { sum: 0, count: 0 };
    if (customFilter) {
      const ct = await db.collection("payments").aggregate([
        { $match: customFilter },
        { $group: { _id: null, sum: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]).toArray();
      customTotal = { sum: ct[0]?.sum || 0, count: ct[0]?.count || 0 };
    }

    // ─── Previous period comparison (for custom range) ───
    let prevPeriod = { sum: 0, count: 0 };
    if (from && to) {
      const diffMs = to.getTime() - from.getTime();
      const prevFrom = new Date(from.getTime() - diffMs);
      const prevTo = new Date(from.getTime() - 1);
      const pp = await db.collection("payments").aggregate([
        { $match: { status: "confirmed", createdAt: { $gte: prevFrom, $lte: prevTo } } },
        { $group: { _id: null, sum: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]).toArray();
      prevPeriod = { sum: pp[0]?.sum || 0, count: pp[0]?.count || 0 };
    }

    // ─── รายได้รายวัน (dynamic range) ───
    const chartFrom = from || (() => { const d = new Date(todayStart); d.setDate(d.getDate() - 30); return d; })();
    const chartTo = to || now;
    const dailyRevenue = await db.collection("payments").aggregate([
      { $match: { status: "confirmed", createdAt: { $gte: chartFrom, $lte: chartTo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sum: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    // ─── แยกตาม platform (ใช้ช่วงที่เลือก) ───
    const platformFilter = customFilter || { status: "confirmed", createdAt: { $gte: monthStart } };
    const byPlatform = await db.collection("payments").aggregate([
      { $match: platformFilter },
      { $group: { _id: "$platform", sum: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]).toArray();

    // ─── รายได้ตามวันในสัปดาห์ ───
    const byDayOfWeek = await db.collection("payments").aggregate([
      { $match: customFilter || { status: "confirmed", createdAt: { $gte: monthStart } } },
      { $group: { _id: { $dayOfWeek: "$createdAt" }, sum: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();

    // ─── Top customers ───
    const topCustomers = await db.collection("payments").aggregate([
      { $match: customFilter || { status: "confirmed", createdAt: { $gte: monthStart } } },
      { $group: { _id: "$sourceId", sum: { $sum: "$amount" }, count: { $sum: 1 }, platform: { $first: "$platform" } } },
      { $sort: { sum: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "groups_meta",
          localField: "_id",
          foreignField: "sourceId",
          as: "meta",
        },
      },
      {
        $project: {
          sourceId: "$_id",
          sum: 1,
          count: 1,
          platform: 1,
          name: { $ifNull: [{ $arrayElemAt: ["$meta.groupName", 0] }, "$_id"] },
        },
      },
    ]).toArray();

    // ─── Pipeline value (มูลค่ารอปิด) ───
    const activeStages = ["interested", "quoting", "negotiating", "following_up"];
    const pipelineValue = await db.collection("customers").aggregate([
      { $match: { pipelineStage: { $in: activeStages } } },
      { $group: { _id: "$pipelineStage", sum: { $sum: "$dealValue" }, count: { $sum: 1 } } },
    ]).toArray();

    const wonValue = await db.collection("customers").aggregate([
      { $match: { pipelineStage: "closed_won" } },
      { $group: { _id: null, sum: { $sum: "$dealValue" }, count: { $sum: 1 } } },
    ]).toArray();

    // ─── ทำนายยอดสิ้นเดือน ───
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const monthSoFar = monthTotal[0]?.sum || 0;
    const projected = dayOfMonth > 0 ? Math.round((monthSoFar / dayOfMonth) * daysInMonth) : 0;

    // ─── เปรียบเทียบเดือนก่อน ───
    const lastMonthSum = lastMonthTotal[0]?.sum || 0;
    const monthSum = monthTotal[0]?.sum || 0;
    const monthChange = lastMonthSum > 0 ? Math.round(((monthSum - lastMonthSum) / lastMonthSum) * 100) : 0;

    // ─── Average order value ───
    const avgOrderValue = customFilter
      ? (customTotal.count > 0 ? Math.round(customTotal.sum / customTotal.count) : 0)
      : (monthTotal[0]?.count > 0 ? Math.round(monthSum / monthTotal[0].count) : 0);

    return NextResponse.json({
      today: { sum: todayTotal[0]?.sum || 0, count: todayTotal[0]?.count || 0 },
      week: { sum: weekTotal[0]?.sum || 0, count: weekTotal[0]?.count || 0 },
      month: { sum: monthSum, count: monthTotal[0]?.count || 0 },
      lastMonth: { sum: lastMonthSum, count: lastMonthTotal[0]?.count || 0 },
      year: { sum: yearTotal[0]?.sum || 0, count: yearTotal[0]?.count || 0 },
      custom: customTotal,
      prevPeriod,
      monthChange,
      projected,
      avgOrderValue,
      dailyRevenue: dailyRevenue.map((d) => ({ date: d._id, sum: d.sum, count: d.count })),
      byPlatform: byPlatform.map((p) => ({ platform: p._id || "unknown", sum: p.sum, count: p.count })),
      byDayOfWeek: byDayOfWeek.map((d) => ({ day: d._id, sum: d.sum, count: d.count })),
      topCustomers: topCustomers.map((c) => ({ name: c.name, sum: c.sum, count: c.count, platform: c.platform })),
      pipeline: pipelineValue.map((p) => ({ stage: p._id, sum: p.sum, count: p.count })),
      won: { sum: wonValue[0]?.sum || 0, count: wonValue[0]?.count || 0 },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
