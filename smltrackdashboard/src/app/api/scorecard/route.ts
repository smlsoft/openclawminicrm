import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const tier = request.nextUrl.searchParams.get("tier") || "";
    const sort = request.nextUrl.searchParams.get("sort") || "overall";

    const filter: any = {};
    if (tier) filter.tier = tier;

    const sortField = `scores.${sort}`;
    const sortDir = sort === "churnRisk" ? 1 : -1;

    const scores = await db.collection("customer_scores")
      .find(filter)
      .sort({ [sortField]: sortDir })
      .limit(200)
      .toArray();

    // นับแต่ละ tier
    const tierCounts = await db.collection("customer_scores").aggregate([
      { $group: { _id: "$tier", count: { $sum: 1 }, avgOverall: { $avg: "$scores.overall" } } },
    ]).toArray();

    const total = await db.collection("customer_scores").countDocuments();

    return NextResponse.json({
      scores: scores.map((s) => ({ ...s, _id: s._id.toString() })),
      tierCounts: Object.fromEntries(tierCounts.map((t) => [t._id, { count: t.count, avg: Math.round(t.avgOverall || 0) }])),
      total,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
