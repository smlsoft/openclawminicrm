import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = await getDB();
    const customer = await db.collection("customers").findOne({ _id: new ObjectId(id) });
    if (!customer) return NextResponse.json({ error: "ไม่พบลูกค้า" }, { status: 404 });

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "200");
    const messages = await db.collection("messages")
      .find({ sourceId: { $in: customer.rooms || [] } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({ embedding: 0 })
      .toArray();

    return NextResponse.json({
      customer: { ...customer, _id: customer._id.toString() },
      messages: messages.reverse(),
      roomCount: (customer.rooms || []).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
