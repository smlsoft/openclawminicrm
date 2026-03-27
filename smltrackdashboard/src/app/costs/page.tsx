"use client";

import { useEffect, useState, useCallback } from "react";
import { MiniLineChart } from "@/components/charts";
import { ChartCard } from "@/components/charts/ChartCard";

interface DailyCost { _id: string; totalTokens: number; totalCost: number; calls: number; }
interface FeatureCost { _id: string; totalTokens: number; totalCost: number; calls: number; avgTokens: number; }
interface ProviderCost { _id: string; totalTokens: number; totalCost: number; calls: number; }
interface RecentCost { provider: string; model: string; feature: string; totalTokens: number; costUsd: number; createdAt: string; service?: string; }

interface CostData {
  today: { totalTokens: number; totalCost: number; calls: number; inputTokens: number; outputTokens: number };
  month: { totalTokens: number; totalCost: number; calls: number };
  daily: DailyCost[];
  byFeature: FeatureCost[];
  byProvider: ProviderCost[];
  recent: RecentCost[];
}

const FEATURE_LABELS: Record<string, string> = {
  // ระบบแชท (พนักงาน AI ประจำ)
  "chat-reply": "💬 กุ้งตอบ — ตอบแชทลูกค้า",
  "chat-tools": "🔧 กุ้งช่าง — เรียกเครื่องมือ AI",
  "light-ai": "⚡ กุ้งไว — จัดแท็ก/แยกประเภท",
  "light-ai-json": "⚡ กุ้งไว — วิเคราะห์ข้อความ (อัตโนมัติ)",
  "sentiment": "😊 กุ้งอ่านใจ — วิเคราะห์อารมณ์ลูกค้า",
  "embedding": "🔍 กุ้งค้นหา — ค้นหาจากฐานความรู้",
  "vision": "👁️ กุ้งตาดี — อ่านรูปภาพ/เอกสาร",
  "crm-analysis": "📋 กุ้งจัดการ — วิเคราะห์ CRM อัตโนมัติ",
  "advisor-sentiment": "🦐 กุ้งรู้ใจ — วิเคราะห์ความรู้สึก",
  "advisor-pipeline": "🦐 กุ้งเรียงลำดับ — จัดลำดับการขาย",
  "advisor-summary": "🦐 กุ้งจด — สรุปสนทนา",
  // น้องกุ้ง 13 ตัว (พนักงาน AI)
  "problem-solver": "🔍 กุ้งแก้ว — แก้ปัญหาลูกค้า",
  "sales-hunter": "💰 กุ้งทอง — หาโอกาสขาย",
  "team-coaching": "👨‍🏫 กุ้งโค้ช — โค้ชทีมงาน",
  "weekly-strategy": "📋 กุ้งวางแผน — วางกลยุทธ์สัปดาห์",
  "health-monitor": "❤️ กุ้งใจดี — ตรวจสุขภาพลูกค้า",
  "payment-guardian": "💳 กุ้งเงิน — ตรวจสลิป/เงินเข้า",
  "order-tracker": "📦 กุ้งส่ง — ติดตามจัดส่ง",
  "re-engagement": "🔄 กุ้งคิดถึง — ดึงลูกค้ากลับ",
  "upsell-crosssell": "🎯 กุ้งแนะนำ — แนะนำสินค้าเพิ่ม",
  "daily-report": "📊 กุ้งสรุป — สรุปรายวัน",
  "lead-scorer": "🏆 กุ้งให้แต้ม — ให้คะแนนลูกค้า",
  "appointment-reminder": "📅 กุ้งเตือน — เตือนนัดหมาย",
  "price-watcher": "📈 กุ้งเทียบราคา — วิเคราะห์ราคา",
};

const PROVIDER_LABELS: Record<string, string> = {
  "openrouter": "OpenRouter (ฟรี)",
  "sambanova": "SambaNova (ฟรี)",
  "groq": "Groq (ฟรี)",
  "cerebras": "Cerebras (ฟรี)",
  "gemini": "Google Gemini (ฟรี)",
  "google": "Google Gemini (ฟรี)",
};

function formatTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatCost(usd: number) {
  if (usd === 0) return "ฟรี";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function formatThb(usd: number) {
  const thb = usd * 34;
  if (thb === 0) return "฿0";
  if (thb < 1) return `≈ ฿${thb.toFixed(2)}`;
  return `≈ ฿${thb.toFixed(0)}`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export default function CostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch("/dashboard/api/costs");
      const d = await r.json();
      setData(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, [fetchData]);

  if (loading) return <div className="min-h-screen theme-bg flex items-center justify-center"><div className="theme-text-secondary animate-pulse">กำลังโหลด...</div></div>;

  const today = data?.today || { totalTokens: 0, totalCost: 0, calls: 0, inputTokens: 0, outputTokens: 0 };
  const month = data?.month || { totalTokens: 0, totalCost: 0, calls: 0 };
  const daily = data?.daily || [];
  const byFeature = data?.byFeature || [];
  const byProvider = data?.byProvider || [];
  const recent = data?.recent || [];

  const maxDailyTokens = Math.max(...daily.map((d) => d.totalTokens), 1);

  return (
    <div className="min-h-screen theme-bg theme-text">
      <header className="border-b theme-border px-3 md:px-6 py-4 sticky top-0 theme-bg backdrop-blur z-10">
        <div>
          <h1 className="text-base font-bold">💰 ค่าใช้จ่าย AI</h1>
          <p className="text-xs theme-text-secondary">ดูว่า AI ใช้ไปเท่าไหร่ — ทั้งหมดฟรี ไม่มีค่าใช้จ่าย</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 md:p-6 pb-24 md:pb-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "ใช้ไปวันนี้", value: formatTokens(today.totalTokens), icon: "📊", sub: `${today.calls} ครั้ง` },
            { label: "ค่าใช้จ่ายวันนี้", value: formatCost(today.totalCost), icon: "💵", sub: formatThb(today.totalCost) },
            { label: "ข้อมูลเข้า", value: formatTokens(today.inputTokens || 0), icon: "📥", sub: "คำที่ส่งให้ AI" },
            { label: "ข้อมูลออก", value: formatTokens(today.outputTokens || 0), icon: "📤", sub: "คำที่ AI ตอบกลับ" },
            { label: "ค่าใช้จ่ายเดือนนี้", value: formatCost(month.totalCost), icon: "📅", sub: formatThb(month.totalCost) },
            { label: "เรียกใช้เดือนนี้", value: month.calls.toLocaleString(), icon: "🔢", sub: formatTokens(month.totalTokens) + " คำ" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border theme-border theme-bg-secondary p-3">
              <div className="flex items-center justify-between">
                <span className="text-xl">{c.icon}</span>
                <span className="text-lg font-bold">{c.value}</span>
              </div>
              <p className="text-[11px] theme-text-secondary mt-1">{c.label}</p>
              {c.sub && <p className="text-[10px] theme-text-muted">{c.sub}</p>}
            </div>
          ))}
        </div>

        {/* Daily Cost Line Chart */}
        {daily.length > 0 && (
          <ChartCard title="📈 การใช้งานรายวัน" subtitle={`${daily.length} วันล่าสุด`}>
            <MiniLineChart
              data={daily.map(d => ({ name: d._id.substring(5), value: d.totalTokens }))}
              height={180}
              area={true}
            />
          </ChartCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Chart */}
          <section className="theme-bg-secondary border theme-border rounded-xl p-4">
            <h2 className="text-sm font-bold mb-3 theme-text-secondary">📈 ใช้ AI ไปเท่าไหร่ (7 วัน)</h2>
            {daily.length === 0 ? (
              <p className="theme-text-muted text-sm py-8 text-center">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-2">
                {daily.map((d) => (
                  <div key={d._id} className="flex items-center gap-2">
                    <span className="text-[11px] theme-text-secondary w-16 shrink-0">{d._id.substring(5)}</span>
                    <div className="flex-1 theme-bg-card rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-blue-500 h-6 rounded-full flex items-center px-2 text-[10px] font-bold text-white"
                        style={{ width: `${(d.totalTokens / maxDailyTokens) * 100}%`, minWidth: d.totalTokens > 0 ? 40 : 0 }}
                      >
                        {formatTokens(d.totalTokens)}
                      </div>
                    </div>
                    <span className="text-[10px] theme-text-muted w-14 text-right">{formatCost(d.totalCost)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* By Feature */}
          <section className="theme-bg-secondary border theme-border rounded-xl p-4">
            <h2 className="text-sm font-bold mb-3 theme-text-secondary">🏷️ แยกตามงานที่ทำ</h2>
            {byFeature.length === 0 ? (
              <p className="theme-text-muted text-sm py-8 text-center">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-2">
                {byFeature.map((f) => (
                  <div key={f._id} className="flex items-center justify-between p-2 rounded-lg theme-bg-card">
                    <div>
                      <p className="text-sm font-medium">{FEATURE_LABELS[f._id] || f._id}</p>
                      <p className="text-[10px] theme-text-muted">เรียก {f.calls} ครั้ง &middot; เฉลี่ย {formatTokens(Math.round(f.avgTokens))} คำ/ครั้ง</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatTokens(f.totalTokens)}</p>
                      <p className="text-[10px] theme-text-muted">{formatCost(f.totalCost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Provider */}
          <section className="theme-bg-secondary border theme-border rounded-xl p-4">
            <h2 className="text-sm font-bold mb-3 theme-text-secondary">🤖 แยกตามผู้ให้บริการ AI</h2>
            {byProvider.length === 0 ? (
              <p className="theme-text-muted text-sm py-8 text-center">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] theme-text-muted border-b theme-border">
                      <th className="pb-2">ผู้ให้บริการ</th>
                      <th className="pb-2 text-right">เรียกใช้</th>
                      <th className="pb-2 text-right">จำนวนคำ</th>
                      <th className="pb-2 text-right">ค่าใช้จ่าย</th>
                    </tr>
                  </thead>
                  <tbody className="theme-divide divide-y">
                    {byProvider.map((p) => (
                      <tr key={p._id} className="hover:theme-bg-hover">
                        <td className="py-2 font-medium">{PROVIDER_LABELS[p._id] || p._id}</td>
                        <td className="py-2 text-right theme-text-secondary">{p.calls} ครั้ง</td>
                        <td className="py-2 text-right">{formatTokens(p.totalTokens)}</td>
                        <td className="py-2 text-right">
                          <span className={p.totalCost > 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                            {formatCost(p.totalCost)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent Calls */}
          <section className="theme-bg-secondary border theme-border rounded-xl p-4">
            <h2 className="text-sm font-bold mb-3 theme-text-secondary">🕐 การเรียกใช้ล่าสุด</h2>
            {recent.length === 0 ? (
              <p className="theme-text-muted text-sm py-8 text-center">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {recent.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] p-1.5 rounded theme-bg-card">
                    <div className="flex items-center gap-2">
                      <span className="theme-text-muted w-12 shrink-0">{formatDate(r.createdAt)}</span>
                      <span className="font-medium truncate max-w-[140px]">{FEATURE_LABELS[r.feature] || r.feature}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="theme-text-secondary">{formatTokens(r.totalTokens)} คำ</span>
                      <span className={r.costUsd > 0 ? "text-amber-400" : "text-emerald-400"}>{formatCost(r.costUsd)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* คำอธิบาย */}
        <section className="theme-bg-secondary border theme-border rounded-xl p-4">
          <h2 className="text-sm font-bold mb-3 theme-text-secondary">💡 อธิบายง่ายๆ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs theme-text-secondary">
            <div className="space-y-2">
              <p><strong className="theme-text">คำ (Tokens) คืออะไร?</strong><br/>ทุกครั้งที่ AI อ่านหรือตอบ จะนับเป็น "คำ" เช่น "สวัสดีครับ" ≈ 3-5 คำ</p>
              <p><strong className="theme-text">ข้อมูลเข้า vs ออก?</strong><br/>เข้า = สิ่งที่เราส่งให้ AI อ่าน, ออก = สิ่งที่ AI ตอบกลับมา</p>
            </div>
            <div className="space-y-2">
              <p><strong className="theme-text">ทำไมค่าใช้จ่ายเป็น "ฟรี"?</strong><br/>ระบบใช้ AI จาก 5 ผู้ให้บริการที่มีโควต้าฟรี ถ้าตัวหนึ่งเต็ม จะสลับไปตัวถัดไปอัตโนมัติ</p>
              <p><strong className="theme-text">น้องกุ้งใช้ AI เยอะไหม?</strong><br/>น้องกุ้ง 13 ตัว ทำงานตาม schedule ใช้ AI เฉพาะตอน cron ไม่ได้รันตลอด จึงประหยัดมาก</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
