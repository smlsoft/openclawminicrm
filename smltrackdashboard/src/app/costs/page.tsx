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
  // Agent features
  "chat-reply": "💬 ตอบแชท",
  "chat-tools": "🔧 เรียก MCP",
  "light-ai": "⚡ AI เบา",
  "light-ai-json": "⚡ AI เบา (JSON)",
  "sentiment": "😊 วิเคราะห์ sentiment",
  "embedding": "🔍 Embedding",
  "vision": "👁️ Vision",
  "advisor-sentiment": "🦐 กุ้ง: Sentiment",
  "advisor-pipeline": "🦐 กุ้ง: Pipeline",
  "advisor-summary": "🦐 กุ้ง: สรุป",
  // น้องกุ้ง 13 บทบาท
  "problem-solver": "🔍 กุ้ง: Problem Solver",
  "sales-hunter": "💰 กุ้ง: Sales Hunter",
  "team-coaching": "👨‍🏫 กุ้ง: Team Coach",
  "weekly-strategy": "📋 กุ้ง: Weekly Strategist",
  "health-monitor": "❤️ กุ้ง: Health Monitor",
  "payment-guardian": "💳 กุ้ง: Payment Guardian",
  "order-tracker": "📦 กุ้ง: Order Tracker",
  "re-engagement": "🔄 กุ้ง: Re-engagement",
  "upsell-crosssell": "🎯 กุ้ง: Upsell/Cross-sell",
  "daily-report": "📊 กุ้ง: Daily Report",
  "lead-scorer": "🏆 กุ้ง: Lead Scorer",
  "appointment-reminder": "📅 กุ้ง: Appointment",
  "price-watcher": "📈 กุ้ง: Price Watcher",
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
  if (thb === 0) return "";
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

  if (loading) return <div className="min-h-screen theme-bg flex items-center justify-center"><div className="theme-text-secondary animate-pulse">Loading...</div></div>;

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
          <h1 className="text-base font-bold">💰 AI Cost Tracker</h1>
          <p className="text-xs theme-text-secondary">ค่าใช้จ่าย AI แบบละเอียด</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 md:p-6 pb-24 md:pb-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "วันนี้ (Tokens)", value: formatTokens(today.totalTokens), icon: "📊", sub: `${today.calls} calls` },
            { label: "วันนี้ (Cost)", value: formatCost(today.totalCost), icon: "💵", sub: formatThb(today.totalCost) },
            { label: "Input", value: formatTokens(today.inputTokens || 0), icon: "📥", sub: "tokens วันนี้" },
            { label: "Output", value: formatTokens(today.outputTokens || 0), icon: "📤", sub: "tokens วันนี้" },
            { label: "เดือนนี้ (Cost)", value: formatCost(month.totalCost), icon: "📅", sub: formatThb(month.totalCost) },
            { label: "เดือนนี้ (Calls)", value: month.calls.toLocaleString(), icon: "🔢", sub: formatTokens(month.totalTokens) + " tokens" },
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
          <ChartCard title="📈 Token รายวัน" subtitle={`${daily.length} วันล่าสุด`}>
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
            <h2 className="text-sm font-bold mb-3 theme-text-secondary">📈 Token ใช้ต่อวัน (7 วัน)</h2>
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
            <h2 className="text-sm font-bold mb-3 theme-text-secondary">🏷️ ค่าใช้จ่ายตามฟีเจอร์</h2>
            {byFeature.length === 0 ? (
              <p className="theme-text-muted text-sm py-8 text-center">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-2">
                {byFeature.map((f) => (
                  <div key={f._id} className="flex items-center justify-between p-2 rounded-lg theme-bg-card">
                    <div>
                      <p className="text-sm font-medium">{FEATURE_LABELS[f._id] || f._id}</p>
                      <p className="text-[10px] theme-text-muted">{f.calls} calls &middot; avg {formatTokens(Math.round(f.avgTokens))} tokens/call</p>
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
            <h2 className="text-sm font-bold mb-3 theme-text-secondary">🤖 ค่าใช้จ่ายตาม AI Provider</h2>
            {byProvider.length === 0 ? (
              <p className="theme-text-muted text-sm py-8 text-center">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] theme-text-muted border-b theme-border">
                      <th className="pb-2">Provider</th>
                      <th className="pb-2 text-right">Calls</th>
                      <th className="pb-2 text-right">Tokens</th>
                      <th className="pb-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="theme-divide divide-y">
                    {byProvider.map((p) => (
                      <tr key={p._id} className="hover:theme-bg-hover">
                        <td className="py-2 font-medium">{p._id}</td>
                        <td className="py-2 text-right theme-text-secondary">{p.calls}</td>
                        <td className="py-2 text-right">{formatTokens(p.totalTokens)}</td>
                        <td className="py-2 text-right">
                          <span className={p.totalCost > 0 ? "text-amber-400 font-bold" : "text-emerald-400"}>
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
            <h2 className="text-sm font-bold mb-3 theme-text-secondary">🕐 AI Calls ล่าสุด</h2>
            {recent.length === 0 ? (
              <p className="theme-text-muted text-sm py-8 text-center">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {recent.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] p-1.5 rounded theme-bg-card">
                    <div className="flex items-center gap-2">
                      <span className="theme-text-muted w-12 shrink-0">{formatDate(r.createdAt)}</span>
                      <span className="font-medium truncate max-w-[120px]">{FEATURE_LABELS[r.feature] || r.feature}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="theme-text-secondary">{formatTokens(r.totalTokens)}</span>
                      <span className={r.costUsd > 0 ? "text-amber-400" : "text-emerald-400"}>{formatCost(r.costUsd)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
