import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();
    const body = await request.json();

    const allowed = [
      "title", "description", "customerName", "phone", "email",
      "staffName", "staffNames", "date", "startTime", "endTime", "duration",
      "type", "location", "status", "priority", "notes",
      "reminder", "reminderMinutes", "recurring",
    ];

    const updates: any = { updatedAt: new Date() };
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = key === "date" ? new Date(body[key]) : body[key];
      }
    }

    await db.collection("appointments").updateOne(
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
    await db.collection("appointments").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
