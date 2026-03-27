import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function POST() {
  const t0 = Date.now();
  try {
    const db = await getDB();
    const results: Record<string, any> = {};

    // 1. Rebuild groups_meta จาก messages
    const sourceIds = await db.collection("messages").distinct("sourceId");
    let groupsUpdated = 0;

    for (const sid of sourceIds) {
      if (!sid) continue;
      const msgs = await db.collection("messages")
        .find({ sourceId: sid })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();

      const allNames = await db.collection("messages").distinct("userName", { sourceId: sid });
      const count = await db.collection("messages").countDocuments({ sourceId: sid });
      const lastMsg = msgs[0];
      const platform = lastMsg?.platform || "line";
      const sourceType = sid.startsWith("U") ? "user" : sid.startsWith("C") ? "group" : "unknown";

      // สร้างชื่อกลุ่มจากชื่อสมาชิก
      const groupName = allNames.filter(Boolean).join(", ") || sid;

      await db.collection("groups_meta").updateOne(
        { sourceId: sid },
        {
          $set: {
            sourceId: sid,
            groupName,
            sourceType,
            platform,
            messageCount: count,
            lastMessageAt: lastMsg?.createdAt || null,
          },
        },
        { upsert: true }
      );
      groupsUpdated++;
    }
    results.groups_meta = groupsUpdated;

    // 2. Rebuild customers จาก user sourceIds
    const userSourceIds = sourceIds.filter((s: string) => s?.startsWith("U"));
    let customersUpdated = 0;

    for (const sid of userSourceIds) {
      const lastMsg = await db.collection("messages")
        .findOne({ sourceId: sid }, { sort: { createdAt: -1 } });

      const names = await db.collection("messages").distinct("userName", { sourceId: sid });
      const name = names.find((n: string) => n && !n.startsWith("SML")) || names[0] || sid;

      const existing = await db.collection("customers").findOne({ $or: [{ sourceId: sid }, { "rooms": sid }] });
      if (!existing) {
        await db.collection("customers").insertOne({
          name,
          firstName: name.split(" ")[0] || "",
          lastName: name.split(" ").slice(1).join(" ") || "",
          platformIds: [{ platform: lastMsg?.platform || "line", id: sid }],
          rooms: [sid],
          tags: [],
          pipeline: "new",
          source: lastMsg?.platform || "line",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        customersUpdated++;
      }
    }
    results.customers = customersUpdated;

    // 3. Rebuild chat_analytics — sentiment + purchase intent per sourceId
    let analyticsUpdated = 0;
    const userSkills = await db.collection("user_skills").find().toArray();

    for (const skill of userSkills) {
      if (!skill.sourceId) continue;
      await db.collection("chat_analytics").updateOne(
        { sourceId: skill.sourceId },
        {
          $set: {
            sourceId: skill.sourceId,
            sentiment: skill.sentiment || null,
            customerSentiment: skill.customerSentiment || null,
            staffSentiment: skill.staffSentiment || null,
            overallSentiment: skill.overallSentiment || skill.sentiment || null,
            purchaseIntent: skill.purchaseIntent || null,
            tags: skill.tags || [],
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
      analyticsUpdated++;
    }
    results.chat_analytics = analyticsUpdated;

    // 4. Summary
    const tEnd = Date.now();
    results.time_ms = tEnd - t0;
    results.total_messages = await db.collection("messages").estimatedDocumentCount();
    results.total_groups = await db.collection("groups_meta").countDocuments();
    results.total_customers = await db.collection("customers").countDocuments();
    results.total_analytics = await db.collection("chat_analytics").countDocuments();

    console.log(`[Rebuild] Done in ${results.time_ms}ms:`, JSON.stringify(results));

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error("[Rebuild] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
