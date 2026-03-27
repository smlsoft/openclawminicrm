import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDB();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, confirmed, rejected, todayPayments, monthPayments] = await Promise.all([
      db.collection("payments").countDocuments({ status: "pending" }),
      db.collection("payments").countDocuments({ status: "confirmed" }),
      db.collection("payments").countDocuments({ status: "rejected" }),
      db.collection("payments").find({ status: "confirmed", confirmedAt: { $gte: today } }).toArray(),
      db.collection("payments").find({
        status: "confirmed",
        confirmedAt: { $gte: new Date(today.getFullYear(), today.getMonth(), 1) },
      }).toArray(),
    ]);

    const todayAmount = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const monthAmount = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);

    return NextResponse.json({
      pending,
      confirmed,
      rejected,
      todayCount: todayPayments.length,
      todayAmount,
      monthCount: monthPayments.length,
      monthAmount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
