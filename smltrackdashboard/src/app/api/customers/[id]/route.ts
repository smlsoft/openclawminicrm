import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();
    const customer = await db.collection("customers").findOne({ _id: new ObjectId(id) });
    if (!customer) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ...customer, _id: customer._id.toString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();
    const body = await request.json();

    // อนุญาตให้แก้ไขเฉพาะ fields ที่กำหนด
    const allowed = [
      "firstName", "lastName", "company", "position", "phone", "email",
      "address", "notes", "customTags", "avatarUrl", "platformIds",
      "dealValue", "expectedCloseDate", "winLossReason", "assignedTo",
    ];
    const updates: any = { updatedAt: new Date() };
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    // Sync legacy fields from platformIds (backward compat)
    if (body.platformIds) {
      const pids = body.platformIds;
      updates.lineId = Array.isArray(pids.line) ? pids.line[0] || "" : pids.line || "";
      updates.facebookId = Array.isArray(pids.facebook) ? pids.facebook[0] || "" : pids.facebook || "";
      updates.instagramId = Array.isArray(pids.instagram) ? pids.instagram[0] || "" : pids.instagram || "";
    }

    await db.collection("customers").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
