import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();
    const body = await request.json();
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-me-in-production" });
    const staffName = (token?.name as string) || "staff";

    const updates: any = { updatedAt: new Date() };

    if (body.status === "confirmed") {
      updates.status = "confirmed";
      updates.confirmedBy = staffName;
      updates.confirmedAt = new Date();
    } else if (body.status === "rejected") {
      updates.status = "rejected";
      updates.rejectedBy = staffName;
      updates.rejectedAt = new Date();
      updates.rejectedReason = body.rejectedReason || "";
    }
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.amount !== undefined) updates.amount = body.amount;

    await db.collection("payments").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();
    await db.collection("payments").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
