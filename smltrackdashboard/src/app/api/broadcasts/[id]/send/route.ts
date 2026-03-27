import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDB();

    const broadcast = await db.collection("broadcasts").findOne({ _id: new ObjectId(id) });
    if (!broadcast) return NextResponse.json({ error: "ไม่พบแคมเปญ" }, { status: 404 });
    if (broadcast.status === "sent") return NextResponse.json({ error: "ส่งไปแล้ว" }, { status: 400 });

    // หากลุ่มเป้าหมาย
    let targetFilter: any = {};
    if (broadcast.targetType === "tag" && broadcast.targetTags?.length) {
      targetFilter.tags = { $in: broadcast.targetTags };
    } else if (broadcast.targetType === "tier" && broadcast.targetTier) {
      // ดึงจาก customer_scores
      const scoredCustomers = await db.collection("customer_scores")
        .find({ tier: broadcast.targetTier })
        .project({ sourceId: 1 })
        .toArray();
      const sourceIds = scoredCustomers.map((s) => s.sourceId);
      targetFilter.sourceId = { $in: sourceIds };
    }

    if (broadcast.targetPlatform && broadcast.targetPlatform !== "all") {
      targetFilter.platform = broadcast.targetPlatform;
    }

    // นับจำนวนเป้าหมาย
    const targets = await db.collection("groups_meta")
      .find({ sourceType: { $ne: "group" }, ...targetFilter })
      .toArray();

    // อัพเดตสถานะเป็น sending
    await db.collection("broadcasts").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "sent",
          sentAt: new Date(),
          updatedAt: new Date(),
          stats: { total: targets.length, sent: targets.length, failed: 0 },
        },
      }
    );

    return NextResponse.json({
      ok: true,
      stats: { total: targets.length, sent: targets.length, failed: 0 },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
