import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["text", "image"];
const VALID_TARGETS = ["all", "tag", "tier", "platform"];
const VALID_STATUSES = ["draft", "scheduled", "sending", "sent", "cancelled"];

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const status = request.nextUrl.searchParams.get("status") || "";
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");

    const filter: any = {};
    if (status) filter.status = status;

    const broadcasts = await db.collection("broadcasts")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      broadcasts: broadcasts.map((b) => ({ ...b, _id: b._id.toString() })),
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
      message: (body.message || "").trim(),
      type: VALID_TYPES.includes(body.type) ? body.type : "text",
      imageUrl: body.imageUrl || "",
      targetType: VALID_TARGETS.includes(body.targetType) ? body.targetType : "all",
      targetTags: Array.isArray(body.targetTags) ? body.targetTags : [],
      targetTier: body.targetTier || "",
      targetPlatform: body.targetPlatform || "all",
      status: "draft",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      sentAt: null,
      stats: { total: 0, sent: 0, failed: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!doc.name) return NextResponse.json({ error: "กรุณาระบุชื่อแคมเปญ" }, { status: 400 });
    if (!doc.message) return NextResponse.json({ error: "กรุณาระบุข้อความ" }, { status: 400 });

    const result = await db.collection("broadcasts").insertOne(doc);
    return NextResponse.json({ ok: true, _id: result.insertedId.toString(), ...doc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
