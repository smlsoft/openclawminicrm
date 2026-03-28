import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const COLLECTION = "visitor_counts";
const DOC_ID = "landing_page";

export async function GET() {
  try {
    const db = await getDB();
    const doc = await db.collection(COLLECTION).findOne({ _id: DOC_ID as any });
    return NextResponse.json({ count: doc?.count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDB();
    const body = await request.json().catch(() => ({}));
    const fingerprint = body.fingerprint || "unknown";

    // Check if this fingerprint already visited
    const existing = await db.collection(COLLECTION).findOne({
      _id: DOC_ID as any,
      visitors: fingerprint,
    });

    if (existing) {
      // Already counted — just return current count
      return NextResponse.json({ count: existing.count, new: false });
    }

    // Increment count and add fingerprint to visitors array
    const result = await db.collection(COLLECTION).findOneAndUpdate(
      { _id: DOC_ID as any },
      {
        $inc: { count: 1 },
        $push: { visitors: fingerprint as never },
        $set: { updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json({ count: result?.count ?? 1, new: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
