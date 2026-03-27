import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDB();
    const body = await request.json();

    const allowed = ["name", "message", "type", "imageUrl", "targetType", "targetTags", "targetTier", "targetPlatform", "status", "scheduledAt"];
    const updates: any = { updatedAt: new Date() };

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === "scheduledAt") updates[key] = body[key] ? new Date(body[key]) : null;
        else updates[key] = body[key];
      }
    }

    await db.collection("broadcasts").updateOne({ _id: new ObjectId(id) }, { $set: updates });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDB();
    await db.collection("broadcasts").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
