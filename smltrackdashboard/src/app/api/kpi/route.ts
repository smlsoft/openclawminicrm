import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

function isStaffName(name: string | null) {
  return (name || "").toUpperCase().startsWith("SML");
}
function isBotName(name: string | null) {
  return (name || "").includes("น้องกุ้ง");
}

interface ResponseTimeResult {
  avgMinutes: number;
  level: "green" | "yellow" | "red";
  totalResponses: number;
  fastCount: number;
  mediumCount: number;
  slowCount: number;
}

function calcResponseTime(messages: any[], staffName?: string): ResponseTimeResult {
  const responseTimes: number[] = [];

  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (!prev.createdAt || !curr.createdAt) continue;

    const prevIsCustomer = !isStaffName(prev.userName) && !isBotName(prev.userName);
    const currIsStaff = isStaffName(curr.userName);
    if (staffName && curr.userName !== staffName) continue;

    if (prevIsCustomer && currIsStaff) {
      const diffMs = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
      if (diffMs > 0 && diffMs < 86400000) {
        responseTimes.push(diffMs / 60000);
      }
    }
  }

  const total = responseTimes.length;
  if (total === 0) return { avgMinutes: 0, level: "green", totalResponses: 0, fastCount: 0, mediumCount: 0, slowCount: 0 };

  const avg = Math.round(responseTimes.reduce((a, b) => a + b, 0) / total);
  const fast = responseTimes.filter((t) => t < 5).length;
  const medium = responseTimes.filter((t) => t >= 5 && t < 30).length;
  const slow = responseTimes.filter((t) => t >= 30).length;

  return {
    avgMinutes: avg,
    level: avg < 5 ? "green" : avg < 30 ? "yellow" : "red",
    totalResponses: total,
    fastCount: fast,
    mediumCount: medium,
    slowCount: slow,
  };
}

export async function GET() {
  try {
    const db = await getDB();

    // จำกัดแค่ 30 วันล่าสุด เพื่อไม่ดึง messages ทั้งหมด
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [allSkills, allAnalytics, allMeta, totalMessages, allCustomers, msgCountsByUser, recentMessages] = await Promise.all([
      db.collection("user_skills").find().toArray(),
      db.collection("chat_analytics").find().toArray(),
      db.collection("groups_meta").find().toArray(),
      db.collection("messages").countDocuments(),
      db.collection("customers").find({}, { projection: { pipelineStage: 1, dealValue: 1 } }).toArray(),
      // นับข้อความต่อ userName ด้วย aggregation แทน N+1 queries
      db.collection("messages").aggregate([
        { $group: { _id: "$userName", count: { $sum: 1 } } },
      ]).toArray(),
      // ดึงเฉพาะ 30 วันล่าสุด + เฉพาะ field ที่ต้องใช้
      db.collection("messages")
        .find(
          { createdAt: { $gte: thirtyDaysAgo } },
          { projection: { sourceId: 1, userName: 1, createdAt: 1 } }
        )
        .sort({ createdAt: 1 })
        .toArray(),
    ]);

    // สร้าง lookup map สำหรับ message counts
    const msgCountMap: Record<string, number> = {};
    for (const m of msgCountsByUser) {
      if (m._id) msgCountMap[m._id] = m.count;
    }

    // แยกข้อความตามห้อง
    const messagesByRoom: Record<string, any[]> = {};
    for (const m of recentMessages) {
      if (!m.sourceId) continue;
      if (!messagesByRoom[m.sourceId]) messagesByRoom[m.sourceId] = [];
      messagesByRoom[m.sourceId].push(m);
    }

    // Staff KPI
    const staffSkills = allSkills.filter((s) => s.isStaff);
    const customerSkills = allSkills.filter((s) => !s.isStaff);
    const staffNames = [...new Set(staffSkills.map((s) => s.userName))];

    const staffKpi = staffNames.map((name) => {
      const msgCount = msgCountMap[name] || 0;

      const rooms = staffSkills
        .filter((s) => s.userName === name && s.sourceId)
        .map((s) => {
          const meta = allMeta.find((m) => m.sourceId === s.sourceId);
          return {
            sourceId: s.sourceId,
            roomName: meta?.groupName || (s.sourceId || "unknown").substring(0, 12),
            sentiment: s.sentiment || null,
            purchaseIntent: s.purchaseIntent || null,
          };
        });

      const staffRoomIds = rooms.map((r) => r.sourceId);
      const staffMessages = staffRoomIds.flatMap((id) => messagesByRoom[id] || []);
      const responseTime = calcResponseTime(staffMessages, name);

      const relatedCustomers = customerSkills.filter((s) => staffRoomIds.includes(s.sourceId));
      const avgCustomerScore = relatedCustomers.length > 0
        ? Math.round(relatedCustomers.reduce((sum, s) => sum + (s.sentiment?.score || 50), 0) / relatedCustomers.length)
        : 50;

      return {
        name,
        messageCount: msgCount,
        roomCount: rooms.length,
        rooms,
        responseTime,
        customerSatisfaction: {
          score: avgCustomerScore,
          level: avgCustomerScore >= 60 ? "green" as const : avgCustomerScore >= 30 ? "yellow" as const : "red" as const,
        },
        sentiment: staffSkills.find((s) => s.userName === name)?.sentiment || null,
      };
    });

    // Customer KPI — ใช้ msgCountMap แทน countDocuments ทีละคน
    const customerNames = [...new Set(customerSkills.map((s) => s.userId || s.userName).filter(Boolean))];
    const customerKpi = customerNames.slice(0, 50).map((name) => {
      const msgCount = msgCountMap[name] || 0;
      const skills = customerSkills.filter((s) => (s.userId || s.userName) === name);
      const roomCount = skills.length;

      const avgSentiment = skills.length > 0
        ? Math.round(skills.reduce((sum, s) => sum + (s.sentiment?.score || 50), 0) / skills.length)
        : 50;

      const avgPurchase = skills.length > 0
        ? Math.round(skills.reduce((sum, s) => sum + (s.purchaseIntent?.score || 10), 0) / skills.length)
        : 10;

      return {
        name,
        messageCount: msgCount,
        roomCount,
        sentiment: {
          score: avgSentiment,
          level: avgSentiment >= 60 ? "green" as const : avgSentiment >= 30 ? "yellow" as const : "red" as const,
        },
        purchaseIntent: {
          score: avgPurchase,
          level: avgPurchase >= 60 ? "red" as const : avgPurchase >= 30 ? "yellow" as const : "green" as const,
        },
      };
    });

    // Room overview + response time ต่อห้อง
    const rooms = allAnalytics.map((a) => {
      const meta = allMeta.find((m) => m.sourceId === a.sourceId);
      const roomSkills = allSkills.filter((s) => s.sourceId === a.sourceId);
      const roomMsgs = messagesByRoom[a.sourceId] || [];
      const responseTime = calcResponseTime(roomMsgs);

      return {
        sourceId: a.sourceId,
        name: meta?.groupName || a.sourceId.substring(0, 12),
        customerSentiment: a.customerSentiment,
        staffSentiment: a.staffSentiment,
        overallSentiment: a.overallSentiment || a.sentiment,
        purchaseIntent: a.purchaseIntent,
        responseTime,
        userCount: roomSkills.length,
        customerCount: roomSkills.filter((s: any) => !s.isStaff).length,
        staffCount: roomSkills.filter((s: any) => s.isStaff).length,
        messageCount: roomMsgs.length,
        updatedAt: a.updatedAt,
      };
    });

    // Summary
    const alertRooms = rooms.filter(
      (r) => r.customerSentiment?.level === "red" || r.purchaseIntent?.level === "red"
    );
    const overallResponseTime = calcResponseTime(recentMessages);

    // === Pipeline Conversion ===
    const pipelineStages = ["new", "interested", "quoting", "negotiating", "closed_won", "closed_lost", "following_up"];
    const pipelineCounts: Record<string, number> = {};
    for (const stage of pipelineStages) pipelineCounts[stage] = 0;
    for (const s of customerSkills) {
      const stage = (s.pipelineStage || "new") as string;
      if (pipelineCounts[stage] !== undefined) {
        pipelineCounts[stage]++;
      } else {
        pipelineCounts["new"]++;
      }
    }

    const totalPipeline = customerSkills.length || 1;
    const closedWon = pipelineCounts["closed_won"] || 0;
    const closedLost = pipelineCounts["closed_lost"] || 0;
    const closedTotal = closedWon + closedLost;
    const conversionRate = closedTotal > 0 ? Math.round((closedWon / closedTotal) * 100) : 0;

    const staffConversion = staffKpi.map((staff) => {
      const staffRoomIds = staff.rooms.map((r: any) => r.sourceId);
      const staffCustomers = customerSkills.filter((s) => staffRoomIds.includes(s.sourceId));
      const won = staffCustomers.filter((s) => s.pipelineStage === "closed_won").length;
      const lost = staffCustomers.filter((s) => s.pipelineStage === "closed_lost").length;
      const total = won + lost;
      return {
        name: staff.name,
        totalCustomers: staffCustomers.length,
        closedWon: won,
        closedLost: lost,
        conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
        pipeline: {
          interested: staffCustomers.filter((s) => s.pipelineStage === "interested").length,
          quoting: staffCustomers.filter((s) => s.pipelineStage === "quoting").length,
          negotiating: staffCustomers.filter((s) => s.pipelineStage === "negotiating").length,
        },
      };
    });

    // === ลูกค้าหลุด (Inactive > 7 วัน) ===
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);

    const customerLastMsg: Record<string, { userName: string; lastAt: Date; sourceId: string; roomName: string; pipelineStage: string }> = {};
    for (const s of customerSkills) {
      if (!s.sourceId || !s.userName) continue;
      const roomMsgs = messagesByRoom[s.sourceId] || [];
      const userMsgs = roomMsgs.filter((m: any) => m.userName === s.userName);
      if (userMsgs.length === 0) continue;
      const lastMsg = userMsgs[userMsgs.length - 1];
      const lastAt = new Date(lastMsg.createdAt);
      const existing = customerLastMsg[s.userName];
      if (!existing || lastAt > existing.lastAt) {
        const meta = allMeta.find((m) => m.sourceId === s.sourceId);
        customerLastMsg[s.userName] = {
          userName: s.userName,
          lastAt,
          sourceId: s.sourceId,
          roomName: meta?.groupName || (s.sourceId || "unknown").substring(0, 12),
          pipelineStage: s.pipelineStage || "new",
        };
      }
    }

    const inactiveCustomers = Object.values(customerLastMsg)
      .filter((c) => c.lastAt < sevenDaysAgo)
      .map((c) => ({
        ...c,
        daysSinceLastMsg: Math.round((now.getTime() - c.lastAt.getTime()) / 86400000),
        level: c.lastAt < new Date(now.getTime() - 14 * 86400000) ? "red" as const : "yellow" as const,
      }))
      .sort((a, b) => b.daysSinceLastMsg - a.daysSinceLastMsg);

    const atRiskCustomers = Object.values(customerLastMsg)
      .filter((c) => c.lastAt >= sevenDaysAgo && c.lastAt < threeDaysAgo)
      .map((c) => ({
        ...c,
        daysSinceLastMsg: Math.round((now.getTime() - c.lastAt.getTime()) / 86400000),
        level: "yellow" as const,
      }))
      .sort((a, b) => b.daysSinceLastMsg - a.daysSinceLastMsg);

    // === Revenue ===
    const activePipelineStages = ["interested", "quoting", "negotiating", "following_up"];
    const totalPipelineValue = allCustomers
      .filter((c) => activePipelineStages.includes(c.pipelineStage || "new"))
      .reduce((sum, c) => sum + (c.dealValue || 0), 0);
    const wonRevenue = allCustomers
      .filter((c) => c.pipelineStage === "closed_won")
      .reduce((sum, c) => sum + (c.dealValue || 0), 0);
    const lostRevenue = allCustomers
      .filter((c) => c.pipelineStage === "closed_lost")
      .reduce((sum, c) => sum + (c.dealValue || 0), 0);

    return NextResponse.json({
      summary: {
        totalRooms: allAnalytics.length,
        totalMessages,
        totalStaff: staffNames.length,
        totalCustomers: customerNames.length,
        alertCount: alertRooms.length,
        avgResponseMinutes: overallResponseTime.avgMinutes,
        responseTimeLevel: overallResponseTime.level,
        conversionRate,
        inactiveCount: inactiveCustomers.length,
        atRiskCount: atRiskCustomers.length,
      },
      staffKpi: staffKpi.sort((a, b) => b.messageCount - a.messageCount),
      staffConversion: staffConversion.sort((a, b) => b.totalCustomers - a.totalCustomers),
      customerKpi: customerKpi
        .sort((a, b) => b.messageCount - a.messageCount)
        .filter((c) => c.messageCount > 0),
      rooms: rooms.sort((a, b) => {
        const aUrgent = (a.customerSentiment?.level === "red" ? 2 : 0) + (a.purchaseIntent?.level === "red" ? 1 : 0);
        const bUrgent = (b.customerSentiment?.level === "red" ? 2 : 0) + (b.purchaseIntent?.level === "red" ? 1 : 0);
        return bUrgent - aUrgent;
      }),
      pipeline: {
        counts: pipelineCounts,
        conversionRate,
        closedWon,
        closedLost,
        totalInPipeline: totalPipeline - closedWon - closedLost,
      },
      inactiveCustomers: inactiveCustomers.slice(0, 30),
      atRiskCustomers: atRiskCustomers.slice(0, 20),
      revenue: {
        totalPipeline: totalPipelineValue,
        wonRevenue,
        lostRevenue,
        pipelineCount: allCustomers.filter((c) => activePipelineStages.includes(c.pipelineStage || "new") && (c.dealValue || 0) > 0).length,
        wonCount: allCustomers.filter((c) => c.pipelineStage === "closed_won" && (c.dealValue || 0) > 0).length,
        lostCount: allCustomers.filter((c) => c.pipelineStage === "closed_lost" && (c.dealValue || 0) > 0).length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
