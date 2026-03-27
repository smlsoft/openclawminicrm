import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

function isStaffName(name: string | null) {
  return (name || "").toUpperCase().startsWith("SML");
}

export async function POST() {
  const t0 = Date.now();
  try {
    const db = await getDB();
    const results: Record<string, any> = {};

    // === 0. Clean derived data (keep messages + auth + ai_advice + ai_costs) ===
    // Drop problematic indexes first to avoid duplicate key errors
    await Promise.all([
      db.collection("user_skills").dropIndexes().catch(() => {}),
      db.collection("chat_analytics").dropIndexes().catch(() => {}),
    ]);
    const cleaned = await Promise.all([
      db.collection("groups_meta").deleteMany({}),
      db.collection("customers").deleteMany({}),
      db.collection("chat_analytics").deleteMany({}),
      db.collection("user_skills").deleteMany({}),
      db.collection("analysis_logs").deleteMany({}),
    ]);
    results.cleaned = cleaned.map((r) => r.deletedCount);
    console.log("[Rebuild] Cleaned:", results.cleaned);

    // === 1. Rebuild groups_meta ===
    const sourceIds = await db.collection("messages").distinct("sourceId");
    let groupsUpdated = 0;

    for (const sid of sourceIds) {
      if (!sid) continue;
      const lastMsg = await db.collection("messages")
        .findOne({ sourceId: sid }, { sort: { createdAt: -1 }, projection: { embedding: 0 } });
      const allNames = await db.collection("messages").distinct("userName", { sourceId: sid });
      const count = await db.collection("messages").countDocuments({ sourceId: sid });
      const platform = lastMsg?.platform || "line";
      const sourceType = sid.startsWith("U") ? "user" : sid.startsWith("C") ? "group" : "unknown";
      const groupName = allNames.filter(Boolean).join(", ") || sid;

      await db.collection("groups_meta").updateOne(
        { sourceId: sid },
        { $set: { sourceId: sid, groupName, sourceType, platform, messageCount: count, lastMessageAt: lastMsg?.createdAt || null } },
        { upsert: true }
      );
      groupsUpdated++;
    }
    results.groups_meta = groupsUpdated;

    // === 2. Rebuild customers — ทุก sourceId สร้าง customer (ไม่ใช่แค่ U-type) ===
    let customersUpdated = 0;
    for (const sid of sourceIds) {
      if (!sid) continue;
      const existing = await db.collection("customers").findOne({
        $or: [
          { sourceId: sid },
          { rooms: sid },
          { "platformIds.line": sid },
          { "platformIds.facebook": sid },
          { "platformIds.instagram": sid },
        ],
      });
      if (existing) continue;

      const lastMsg = await db.collection("messages")
        .findOne({ sourceId: sid }, { sort: { createdAt: -1 }, projection: { embedding: 0 } });
      const names = await db.collection("messages").distinct("userName", { sourceId: sid });
      // ใช้ชื่อที่ไม่ใช่ staff (SML)
      const customerName = names.find((n: string) => n && !isStaffName(n)) || names[0] || sid;
      const platform = lastMsg?.platform || "line";

      // สร้าง platformIds เป็น object with arrays (รองรับหลาย ID ต่อ platform)
      const platformIds: Record<string, string[]> = { line: [], facebook: [], instagram: [] };
      if (platform === "line") platformIds.line = [sid];
      else if (platform === "facebook") platformIds.facebook = [sid];
      else if (platform === "instagram") platformIds.instagram = [sid];

      await db.collection("customers").insertOne({
        name: customerName,
        firstName: customerName.split(" ")[0] || "",
        lastName: customerName.split(" ").slice(1).join(" ") || "",
        sourceId: sid,
        platformIds,
        rooms: [sid],
        tags: [],
        pipelineStage: "new",
        source: platform,
        assignedTo: null,
        dealValue: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      customersUpdated++;
    }
    results.customers = customersUpdated;

    // === 3. Rebuild chat_analytics — คำนวณจาก messages โดยตรง ===
    let analyticsUpdated = 0;
    for (const sid of sourceIds) {
      if (!sid) continue;
      const msgs = await db.collection("messages")
        .find({ sourceId: sid }, { projection: { role: 1, userName: 1, content: 1, createdAt: 1 } })
        .sort({ createdAt: 1 })
        .toArray();

      if (msgs.length === 0) continue;

      // นับข้อความ customer vs staff
      const customerMsgs = msgs.filter((m) => m.role === "user" && !isStaffName(m.userName));
      const staffMsgs = msgs.filter((m) => m.role === "user" && isStaffName(m.userName));
      const botMsgs = msgs.filter((m) => m.role === "assistant");

      // Simple sentiment — ดูจากจำนวนข้อความและ response pattern
      const hasRecentActivity = msgs.some((m) => {
        const d = new Date(m.createdAt);
        return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000; // 7 วัน
      });

      const lastCustomerMsg = customerMsgs[customerMsgs.length - 1];
      const lastStaffMsg = staffMsgs[staffMsgs.length - 1];

      // Simple purchase intent based on keywords
      const allContent = customerMsgs.map((m) => m.content || "").join(" ").toLowerCase();
      const buyKeywords = ["ราคา", "สั่ง", "ซื้อ", "โอน", "จ่าย", "ผ่อน", "ส่ง", "สนใจ", "เท่าไหร่"];
      const buyScore = buyKeywords.filter((k) => allContent.includes(k)).length;

      const purchaseLevel = buyScore >= 3 ? "red" : buyScore >= 1 ? "yellow" : "green";
      const sentimentLevel = hasRecentActivity ? "green" : "yellow";

      await db.collection("chat_analytics").updateOne(
        { sourceId: sid },
        {
          $set: {
            sourceId: sid,
            sentiment: { score: sentimentLevel === "green" ? 3 : 2, level: sentimentLevel, reason: sentimentLevel === "green" ? "มี activity ล่าสุด" : "ไม่มี activity 7 วัน" },
            overallSentiment: { score: sentimentLevel === "green" ? 3 : 2, level: sentimentLevel, reason: sentimentLevel === "green" ? "ปกติ" : "ควรติดตาม" },
            customerSentiment: { score: 3, level: sentimentLevel, reason: `${customerMsgs.length} ข้อความ` },
            staffSentiment: { score: 3, level: "green", reason: `${staffMsgs.length} ข้อความ` },
            purchaseIntent: { score: buyScore, level: purchaseLevel, reason: buyScore >= 3 ? "สนใจซื้อ!" : buyScore >= 1 ? "เริ่มสนใจ" : "ไม่สนใจ" },
            messageCount: msgs.length,
            customerMessageCount: customerMsgs.length,
            staffMessageCount: staffMsgs.length,
            botMessageCount: botMsgs.length,
            lastActivity: msgs[msgs.length - 1]?.createdAt || null,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
      analyticsUpdated++;
    }
    results.chat_analytics = analyticsUpdated;

    // === 4. Rebuild user_skills (per sourceId + userId — ตรง format กับ Agent) ===
    let skillsUpdated = 0;
    const allUserNames = await db.collection("messages").distinct("userName");
    for (const userName of allUserNames) {
      if (!userName) continue;
      const userMsgs = await db.collection("messages")
        .find({ userName }, { projection: { sourceId: 1, content: 1, createdAt: 1, role: 1 } })
        .sort({ createdAt: -1 })
        .toArray();

      if (userMsgs.length === 0) continue;

      // Group messages by sourceId — สร้าง 1 doc ต่อ (sourceId, userId)
      const bySource: Record<string, any[]> = {};
      for (const m of userMsgs) {
        if (!m.sourceId) continue;
        if (!bySource[m.sourceId]) bySource[m.sourceId] = [];
        bySource[m.sourceId].push(m);
      }

      for (const [sid, msgs] of Object.entries(bySource)) {
        await db.collection("user_skills").updateOne(
          { sourceId: sid, userId: userName },
          {
            $set: {
              sourceId: sid,
              userId: userName,
              userName,
              isStaff: isStaffName(userName),
              messageCount: msgs.length,
              sentiment: null,
              purchaseIntent: null,
              tags: [],
              pipelineStage: "new",
              lastMessage: msgs[0]?.content?.substring(0, 100) || "",
              lastActivity: msgs[0]?.createdAt || null,
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
        skillsUpdated++;
      }
    }
    results.user_skills = skillsUpdated;

    // === Summary ===
    const tEnd = Date.now();
    results.time_ms = tEnd - t0;
    results.total_messages = await db.collection("messages").estimatedDocumentCount();
    results.total_groups = await db.collection("groups_meta").countDocuments();
    results.total_customers = await db.collection("customers").countDocuments();
    results.total_analytics = await db.collection("chat_analytics").countDocuments();
    results.total_user_skills = await db.collection("user_skills").countDocuments();

    console.log(`[Rebuild] Done in ${results.time_ms}ms:`, JSON.stringify(results));
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error("[Rebuild] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
