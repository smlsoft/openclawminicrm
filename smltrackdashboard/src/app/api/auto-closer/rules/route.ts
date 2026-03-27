import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const VALID_TRIGGERS = ["no_reply_days", "stage_stuck", "high_intent", "custom"];

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const status = request.nextUrl.searchParams.get("status") || "";
    const filter: any = {};
    if (status) filter.status = status;

    const rules = await db.collection("follow_up_rules").find(filter).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({
      rules: rules.map((r) => ({ ...r, _id: r._id.toString() })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDB();
    const body = await request.json();

    const doc = {
      name: (body.name || "").trim(),
      trigger: VALID_TRIGGERS.includes(body.trigger) ? body.trigger : "no_reply_days",
      triggerDays: Math.max(1, parseInt(body.triggerDays) || 3),
      triggerStage: body.triggerStage || "",
      messages: Array.isArray(body.messages) ? body.messages.map((m: any, i: number) => ({
        dayOffset: parseInt(m.dayOffset) || i * 3,
        template: (m.template || "").trim(),
      })) : [{ dayOffset: 0, template: "สวัสดีครับ {{name}} สนใจสินค้าอยู่ไหมครับ?" }],
      aiGenerate: !!body.aiGenerate,
      platform: body.platform || "all",
      status: "active",
      stats: { triggered: 0, replied: 0, converted: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!doc.name) return NextResponse.json({ error: "กรุณาระบุชื่อกฎ" }, { status: 400 });

    const result = await db.collection("follow_up_rules").insertOne(doc);
    return NextResponse.json({ ok: true, _id: result.insertedId.toString(), ...doc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
