import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDB();
    const [byStatus, totalSent, totalFailed] = await Promise.all([
      db.collection("broadcasts").aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
      db.collection("broadcasts").aggregate([
        { $match: { status: "sent" } },
        { $group: { _id: null, totalSent: { $sum: "$stats.sent" }, totalFailed: { $sum: "$stats.failed" } } },
      ]).toArray(),
      db.collection("broadcasts").countDocuments(),
    ]);

    return NextResponse.json({
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
      totalCampaigns: totalFailed,
      totalSent: totalSent[0]?.totalSent || 0,
      totalFailed: totalSent[0]?.totalFailed || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
