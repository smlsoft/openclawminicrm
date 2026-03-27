import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDB();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [byCategory, byGroup, byStatus, todayDocs, pendingPayments] = await Promise.all([
      db.collection("documents").aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]).toArray(),
      db.collection("documents").aggregate([
        { $group: { _id: "$categoryGroup", count: { $sum: 1 } } },
      ]).toArray(),
      db.collection("documents").aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).toArray(),
      db.collection("documents").countDocuments({ createdAt: { $gte: today } }),
      db.collection("documents").countDocuments({ categoryGroup: "accounting", status: "pending" }),
    ]);

    // คำนวณยอดเงินจากเอกสารบัญชีที่ confirmed
    const confirmedAccounting = await db.collection("documents")
      .find({ categoryGroup: "accounting", status: "confirmed" })
      .toArray();
    const totalConfirmedAmount = confirmedAccounting.reduce((s, d) => s + (d.amount || 0), 0);

    return NextResponse.json({
      byCategory: Object.fromEntries(byCategory.map(r => [r._id, r.count])),
      byGroup: Object.fromEntries(byGroup.map(r => [r._id, r.count])),
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      todayCount: todayDocs,
      pendingAccounting: pendingPayments,
      totalConfirmedAmount,
      total: byCategory.reduce((s, r) => s + r.count, 0),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
