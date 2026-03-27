import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDB();
    const body = await request.json();

    const allowed = ["name", "trigger", "triggerDays", "triggerStage", "messages", "aiGenerate", "platform", "status"];
    const updates: any = { updatedAt: new Date() };

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === "triggerDays") updates[key] = Math.max(1, parseInt(body[key]) || 3);
        else if (key === "messages" && Array.isArray(body[key])) {
          updates[key] = body[key].map((m: any, i: number) => ({
            dayOffset: parseInt(m.dayOffset) || i * 3,
            template: (m.template || "").trim(),
          }));
        } else updates[key] = body[key];
      }
    }

    await db.collection("follow_up_rules").updateOne({ _id: new ObjectId(id) }, { $set: updates });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDB();
    // ลบกฎ + คิวที่เกี่ยวข้อง
    await Promise.all([
      db.collection("follow_up_rules").deleteOne({ _id: new ObjectId(id) }),
      db.collection("follow_up_queue").deleteMany({ ruleId: id }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
