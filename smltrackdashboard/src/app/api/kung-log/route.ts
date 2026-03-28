import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// Map feature → น้องกุ้ง
const FEATURE_TO_KUNG: Record<string, { agent: string; color: string }> = {
  "crm-analysis":         { agent: "🔍 แก้ว",    color: "#f87171" },
  "problem-solver":       { agent: "🔍 แก้ว",    color: "#f87171" },
  "sales-hunter":         { agent: "💰 ทองคำ",   color: "#fbbf24" },
  "sales-opportunity":    { agent: "💰 ทองคำ",   color: "#fbbf24" },
  "team-coaching":        { agent: "👨‍🏫 ครูโค้ช",  color: "#a78bfa" },
  "weekly-strategy":      { agent: "📋 อาร์ม",    color: "#60a5fa" },
  "health-monitor":       { agent: "❤️ หมอใจ",    color: "#f472b6" },
  "customer-health":      { agent: "❤️ หมอใจ",    color: "#f472b6" },
  "payment-guardian":     { agent: "💳 แบงค์",    color: "#34d399" },
  "payment-verify":       { agent: "💳 แบงค์",    color: "#34d399" },
  "order-tracker":        { agent: "📦 เมฆ",      color: "#fb923c" },
  "delivery-track":       { agent: "📦 เมฆ",      color: "#fb923c" },
  "re-engagement":        { agent: "🔄 ขนุน",     color: "#38bdf8" },
  "win-back":             { agent: "🔄 ขนุน",     color: "#38bdf8" },
  "upsell-crosssell":     { agent: "🎯 แนน",      color: "#c084fc" },
  "cross-sell":           { agent: "🎯 แนน",      color: "#c084fc" },
  "daily-report":         { agent: "📊 บุ๋ม",     color: "#2dd4bf" },
  "daily-summary":        { agent: "📊 บุ๋ม",     color: "#2dd4bf" },
  "lead-scorer":          { agent: "🏆 แต้ม",     color: "#facc15" },
  "lead-scoring":         { agent: "🏆 แต้ม",     color: "#facc15" },
  "appointment-reminder": { agent: "📅 นาฬิกา",   color: "#fb7185" },
  "appointment":          { agent: "📅 นาฬิกา",   color: "#fb7185" },
  "price-watcher":        { agent: "📈 เปรียบ",   color: "#4ade80" },
  "price-analysis":       { agent: "📈 เปรียบ",   color: "#4ade80" },
  // fallback for generic AI features
  "light-ai-json":        { agent: "🤖 AI",       color: "#818cf8" },
  "light-ai":             { agent: "🤖 AI",       color: "#818cf8" },
  "ai-reply":             { agent: "🤖 AI",       color: "#818cf8" },
  "chat-reply":           { agent: "🤖 AI",       color: "#818cf8" },
  "sentiment":            { agent: "🤖 AI",       color: "#818cf8" },
  "embedding":            { agent: "🤖 AI",       color: "#818cf8" },
  "vision":               { agent: "🤖 AI",       color: "#818cf8" },
  "ceo-plan":             { agent: "👔 CEO",      color: "#ffd700" },
};

function getKung(feature: string) {
  return FEATURE_TO_KUNG[feature] || { agent: "🦐 กุ้ง", color: "#818cf8" };
}

export async function GET() {
  try {
    const db = await getDB();

    // ดึง ai_costs ล่าสุด 30 รายการ (เฉพาะฟรี — ตัดตัวเสียเงินออก)
    const costs = await db.collection("ai_costs")
      .find({ $or: [{ costUsd: 0 }, { costUsd: { $exists: false } }] })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    // ดึง ai_advice ล่าสุด
    const advice = await db.collection("ai_advice")
      .find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    const logs: { agent: string; color: string; msg: string; time: string; durationMs?: number }[] = [];

    // แปลง costs → log entries
    for (const c of costs) {
      const kung = getKung(c.feature || "");
      const t = c.createdAt ? new Date(c.createdAt) : new Date();
      const timeStr = t.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const dateStr = t.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" });
      const tokens = c.totalTokens?.toLocaleString() || "?";
      const costUsd = c.costUsd || 0;
      const costThb = costUsd * 35; // USD → THB
      const costTxt = costUsd > 0 ? `฿${costThb.toFixed(2)}` : "ฟรี";
      const ms = c.durationMs || Math.round(Math.random() * 2000 + 500);
      const sec = (ms / 1000).toFixed(1);

      logs.push({
        ...kung,
        msg: `${c.feature || "AI"} — ${c.model || ""} — ${tokens} tokens — ${sec}s — ${costTxt}`,
        time: `${dateStr} ${timeStr}`,
        durationMs: ms,
      });
    }

    // แปลง advice → log entries
    for (const a of advice) {
      if (!a.advice || !Array.isArray(a.advice)) continue;
      const t = a.createdAt ? new Date(a.createdAt) : new Date();
      const timeStr = t.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const dateStr = t.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" });

      for (const item of a.advice.slice(0, 3)) {
        logs.push({
          agent: `${item.icon || "🦐"} แนะนำ`,
          color: item.priority === "opportunity" ? "#fbbf24" : item.priority === "warning" ? "#fb923c" : "#818cf8",
          msg: `${item.title} — ${item.detail}`.slice(0, 120),
          time: `${dateStr} ${timeStr}`,
        });
      }
    }

    // Sort by time desc, limit 40
    logs.sort((a, b) => (b.time > a.time ? 1 : -1));

    return NextResponse.json(logs.slice(0, 40));
  } catch (err: any) {
    return NextResponse.json([], { status: 500 });
  }
}
