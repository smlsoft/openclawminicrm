import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const status = request.nextUrl.searchParams.get("status") || "";
    const filter: any = {};
    if (status) filter.status = status;

    const queue = await db.collection("follow_up_queue")
      .find(filter)
      .sort({ nextSendAt: 1 })
      .limit(100)
      .toArray();

    // เพิ่มชื่อกฎ
    const ruleIds = [...new Set(queue.map((q) => q.ruleId))];
    const rules = ruleIds.length > 0
      ? await db.collection("follow_up_rules")
          .find({ _id: { $in: ruleIds.map((id) => { try { return new (require("mongodb").ObjectId)(id); } catch { return id; } }) } })
          .project({ name: 1 })
          .toArray()
      : [];
    const ruleMap = new Map(rules.map((r) => [r._id.toString(), r.name]));

    return NextResponse.json({
      queue: queue.map((q) => ({
        ...q,
        _id: q._id.toString(),
        ruleName: ruleMap.get(q.ruleId) || "ไม่ทราบชื่อกฎ",
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
