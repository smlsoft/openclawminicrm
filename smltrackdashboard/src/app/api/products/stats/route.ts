import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDB();
    const [total, active, inactive, byCategory] = await Promise.all([
      db.collection("products").countDocuments(),
      db.collection("products").countDocuments({ status: "active" }),
      db.collection("products").countDocuments({ status: "inactive" }),
      db.collection("products").aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]).toArray(),
    ]);

    return NextResponse.json({
      total,
      active,
      inactive,
      byCategory: Object.fromEntries(byCategory.map((c) => [c._id, c.count])),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
