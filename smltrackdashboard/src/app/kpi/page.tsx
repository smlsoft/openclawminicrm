"use client";

import { useEffect, useState, useCallback } from "react";
import { MiniBarChart } from "@/components/charts";
import { ChartCard } from "@/components/charts/ChartCard";
import { PIPELINE_COLORS as PIPELINE_HEX } from "@/components/charts/theme";

interface ScoreData { score: number; level: "green" | "yellow" | "red"; reason?: string; }
interface ResponseTime { avgMinutes: number; level: "green" | "yellow" | "red"; totalResponses: number; fastCount: number; mediumCount: number; slowCount: number; }
interface StaffRoom { sourceId: string; roomName: string; sentiment: ScoreData | null; purchaseIntent: ScoreData | null; }

interface StaffKpi {
  name: string; messageCount: number; roomCount: number; rooms: StaffRoom[];
  responseTime: ResponseTime; customerSatisfaction: ScoreData; sentiment: ScoreData | null;
}

interface CustomerKpi {
  name: string; messageCount: number; roomCount: number;
  sentiment: ScoreData; purchaseIntent: ScoreData;
}

interface RoomData {
  sourceId: string; name: string; messageCount: number;
  customerSentiment: ScoreData | null; staffSentiment: ScoreData | null;
  overallSentiment: ScoreData | null; purchaseIntent: ScoreData | null;
  responseTime: ResponseTime;
  userCount: number; customerCount: number; staffCount: number; updatedAt: string | null;
}

interface StaffConversion {
  name: string; totalCustomers: number; closedWon: number; closedLost: number; conversionRate: number;
  pipeline: { interested: number; quoting: number; negotiating: number };
}

interface InactiveCustomer {
  userName: string; lastAt: string; sourceId: string; roomName: string;
  pipelineStage: string; daysSinceLastMsg: number; level: "yellow" | "red";
}

interface PipelineData {
  counts: Record<string, number>; conversionRate: number; closedWon: number; closedLost: number; totalInPipeline: number;
}

interface RevenueData {
  totalPipeline: number;
  wonRevenue: number;
  lostRevenue: number;
  pipelineCount: number;
  wonCount: number;
  lostCount: number;
}

interface KpiData {
  summary: {
    totalRooms: number; totalMessages: number; totalStaff: number;
    totalCustomers: number; alertCount: number; avgResponseMinutes: number; responseTimeLevel: string;
    conversionRate: number; inactiveCount: number; atRiskCount: number;
  };
  staffKpi: StaffKpi[]; staffConversion: StaffConversion[]; customerKpi: CustomerKpi[]; rooms: RoomData[];
  pipeline: PipelineData; inactiveCustomers: InactiveCustomer[]; atRiskCustomers: InactiveCustomer[];
  revenue?: RevenueData;
}

const LC = {
  green: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  yellow: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-500", bar: "bg-amber-500" },
  red: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-500", bar: "bg-red-500" },
};

const SL: Record<string, string> = { green: "ปกติ", yellow: "ติดตาม", red: "ไม่พอใจ" };
const PL: Record<string, string> = { green: "ไม่สนใจ", yellow: "เริ่มสนใจ", red: "สนใจซื้อ!" };
const RL: Record<string, string> = { green: "เร็ว", yellow: "ปานกลาง", red: "ช้า" };
const PIPELINE_LABELS: Record<string, string> = {
  new: "ใหม่", interested: "สนใจ", quoting: "เสนอราคา", negotiating: "ต่อรอง",
  closed_won: "ปิดได้", closed_lost: "ปิดไม่ได้", following_up: "ติดตาม",
};
const PIPELINE_COLORS: Record<string, string> = {
  new: "bg-gray-500", interested: "bg-blue-500", quoting: "bg-cyan-500", negotiating: "bg-amber-500",
  closed_won: "bg-emerald-500", closed_lost: "bg-red-500", following_up: "bg-purple-500",
};

function Badge({ level, label }: { level: string; label: string }) {
  const c = LC[level as keyof typeof LC] || LC.green;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${c.bg} ${c.text} border ${c.border}`}><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{label}</span>;
}

function Bar({ score, level, w = 80 }: { score: number; level: string; w?: number }) {
  const c = LC[level as keyof typeof LC] || LC.green;
  return (
    <div className="flex items-center gap-1.5">
      <div className="theme-bg-card rounded-full h-1.5 flex-1" style={{ maxWidth: w }}>
        <div className={`${c.bar} h-1.5 rounded-full`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-[10px] theme-text-muted w-7 text-right">{score}%</span>
    </div>
  );
}

function formatTime(min: number) {
  if (min === 0) return "-";
  if (min < 1) return "<1 นาที";
  if (min < 60) return `${min} นาที`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} ชม. ${m} น.` : `${h} ชม.`;
}

function ResponseTimeBadge({ rt }: { rt: ResponseTime }) {
  if (rt.totalResponses === 0) return <span className="theme-text-muted text-[11px]">-</span>;
  return (
    <div className="flex items-center gap-1.5">
      <Badge level={rt.level} label={formatTime(rt.avgMinutes)} />
      <span className="text-[10px] theme-text-muted">({rt.totalResponses})</span>
    </div>
  );
}

function ResponseTimeDetail({ rt }: { rt: ResponseTime }) {
  if (rt.totalResponses === 0) return null;
  const total = rt.totalResponses;
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-emerald-400">{rt.fastCount} เร็ว</span>
      <span className="text-amber-400">{rt.mediumCount} กลาง</span>
      <span className="text-red-400">{rt.slowCount} ช้า</span>
      <div className="flex-1 theme-bg-card rounded-full h-1.5 overflow-hidden flex">
        {rt.fastCount > 0 && <div className="bg-emerald-500 h-1.5" style={{ width: `${(rt.fastCount / total) * 100}%` }} />}
        {rt.mediumCount > 0 && <div className="bg-amber-500 h-1.5" style={{ width: `${(rt.mediumCount / total) * 100}%` }} />}
        {rt.slowCount > 0 && <div className="bg-red-500 h-1.5" style={{ width: `${(rt.slowCount / total) * 100}%` }} />}
      </div>
    </div>
  );
}

type Tab = "all" | "alert" | "staff" | "customers" | "rooms" | "pipeline" | "inactive" | "revenue";

function formatTHB(v: number) {
  if (v >= 1000000) return `฿${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `฿${(v / 1000).toFixed(0)}K`;
  return `฿${v.toLocaleString("th-TH")}`;
}

export default function KpiPage() {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [staffFilter, setStaffFilter] = useState("");

  const fetchData = useCallback(async () => {
    try { const r = await fetch("/dashboard/api/kpi"); const d = await r.json(); if (d.summary) setData(d); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, [fetchData]);

  if (loading) return <div className="min-h-screen theme-bg flex items-center justify-center"><div className="theme-text-secondary animate-pulse">กำลังโหลด...</div></div>;
  if (!data) return <div className="min-h-screen theme-bg flex items-center justify-center"><div className="text-red-400">โหลดข้อมูลไม่สำเร็จ</div></div>;

  const { summary: s, staffKpi, staffConversion, customerKpi, rooms, pipeline, inactiveCustomers, atRiskCustomers, revenue } = data;
  const filteredRooms = tab === "alert" ? rooms.filter((r) => r.customerSentiment?.level === "red" || r.purchaseIntent?.level === "red")
    : staffFilter ? rooms.filter((r) => staffKpi.find((s) => s.name === staffFilter)?.rooms.some((sr) => sr.sourceId === r.sourceId)) : rooms;
  const filteredStaff = staffFilter ? staffKpi.filter((st) => st.name === staffFilter) : staffKpi;

  return (
    <div className="min-h-screen theme-bg theme-text">
      <header className="border-b theme-border px-3 md:px-6 py-4 sticky top-0 theme-bg backdrop-blur z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">📊 แดชบอร์ด KPI</h1>
            <p className="text-xs theme-text-secondary">OpenClaw Mini CRM &middot; อัปเดตอัตโนมัติ</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">สด</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 md:p-6 pb-24 md:pb-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-3">
          {[
            { label: "ห้อง", value: s.totalRooms, icon: "💬", color: "border-blue-500/30" },
            { label: "ข้อความ", value: s.totalMessages.toLocaleString(), icon: "📨", color: "theme-border" },
            { label: "พนักงาน", value: s.totalStaff, icon: "👔", color: "border-purple-500/30" },
            { label: "ลูกค้า", value: s.totalCustomers, icon: "👥", color: "border-cyan-500/30" },
            { label: "ต้องดูแล", value: s.alertCount, icon: "🚨", color: s.alertCount > 0 ? "border-red-500/50 bg-red-500/5" : "theme-border" },
            { label: "ตอบเฉลี่ย", value: formatTime(s.avgResponseMinutes), icon: "⏱️", color: s.responseTimeLevel === "red" ? "border-red-500/50 bg-red-500/5" : s.responseTimeLevel === "yellow" ? "border-amber-500/30" : "border-emerald-500/30" },
            { label: "ปิดการขาย", value: `${s.conversionRate || 0}%`, icon: "🎯", color: (s.conversionRate || 0) >= 50 ? "border-emerald-500/30" : (s.conversionRate || 0) >= 20 ? "border-amber-500/30" : "theme-border" },
            { label: "ลูกค้าหลุด", value: s.inactiveCount || 0, icon: "😴", color: (s.inactiveCount || 0) > 0 ? "border-red-500/50 bg-red-500/5" : "theme-border" },
            { label: "เสี่ยงหลุด", value: s.atRiskCount || 0, icon: "⚠️", color: (s.atRiskCount || 0) > 0 ? "border-amber-500/30" : "theme-border" },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border ${c.color} theme-bg-secondary p-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xl">{c.icon}</span>
                <span className="text-xl font-bold">{c.value}</span>
              </div>
              <p className="text-[11px] theme-text-secondary mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Mini Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ChartCard title="ไปป์ไลน์ลูกค้า" subtitle="จำนวนลูกค้าแต่ละสถานะ">
            <MiniBarChart
              data={Object.entries(pipeline.counts)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => ({ name: PIPELINE_LABELS[k] || k, value: v, key: k }))}
              nameKey="name"
              dataKey="value"
              colors={Object.fromEntries(
                Object.entries(PIPELINE_HEX).map(([k, hex]) => [PIPELINE_LABELS[k] || k, hex])
              )}
              height={220}
              layout="vertical"
            />
          </ChartCard>
          <ChartCard title="เวลาตอบกลับพนักงาน" subtitle="เวลาตอบกลับเฉลี่ย (นาที)">
            <MiniBarChart
              data={staffKpi
                .filter((st) => st.responseTime.totalResponses > 0)
                .sort((a, b) => b.responseTime.avgMinutes - a.responseTime.avgMinutes)
                .map((st) => ({
                  name: st.name.replace(/^SML\s*-?\s*/i, ""),
                  value: Math.round(st.responseTime.avgMinutes),
                  level: st.responseTime.level,
                }))}
              nameKey="name"
              dataKey="value"
              colors={Object.fromEntries(
                staffKpi
                  .filter((st) => st.responseTime.totalResponses > 0)
                  .map((st) => [
                    st.name.replace(/^SML\s*-?\s*/i, ""),
                    st.responseTime.level === "red" ? "#f87171" : st.responseTime.level === "yellow" ? "#fbbf24" : "#34d399",
                  ])
              )}
              height={200}
              layout="vertical"
            />
          </ChartCard>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: "all", label: "ทั้งหมด" }, { key: "alert", label: `ต้องดูแล (${s.alertCount})` },
            { key: "staff", label: "👔 พนักงาน" }, { key: "pipeline", label: "🎯 ปิดการขาย" },
            { key: "inactive", label: `😴 ลูกค้าหลุด (${(s.inactiveCount || 0) + (s.atRiskCount || 0)})` },
            { key: "revenue", label: "💰 รายได้" },
            { key: "customers", label: "👥 ลูกค้า" }, { key: "rooms", label: "💬 ห้อง" },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => { setTab(key); setStaffFilter(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === key ? "bg-white text-black" : "theme-bg-card theme-text-secondary hover:theme-bg-hover"}`}>{label}</button>
          ))}
          {staffKpi.length > 0 && (
            <select value={staffFilter} onChange={(e) => { setStaffFilter(e.target.value); if (e.target.value) setTab("all"); }}
              className="theme-bg-card theme-text-secondary text-xs rounded-lg px-3 py-1.5 border theme-border">
              <option value="">-- เลือกพนักงาน --</option>
              {staffKpi.map((st) => <option key={st.name} value={st.name}>{st.name}</option>)}
            </select>
          )}
        </div>

        {/* Staff KPI */}
        {(tab === "all" || tab === "staff") && (
          <section>
            <h2 className="text-lg font-bold mb-3">👔 KPI พนักงาน <span className="text-xs theme-text-muted font-normal">({filteredStaff.length} คน)</span></h2>
            {filteredStaff.length === 0 ? (
              <div className="text-center theme-text-muted py-6 theme-bg-secondary rounded-xl border theme-border">ยังไม่มีข้อมูลพนักงาน (ชื่อขึ้นต้นด้วย SML)</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStaff.map((st) => (
                  <div key={st.name} className="theme-bg-secondary border theme-border rounded-xl p-4 hover:border-gray-600 transition">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-purple-600/30 rounded-full flex items-center justify-center text-xs font-bold text-purple-300 border border-purple-500/30">
                          {st.name.replace(/^SML\s*-?\s*/i, "").substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{st.name}</p>
                          <p className="text-[10px] theme-text-muted">{st.messageCount} ข้อความ &middot; {st.roomCount} ห้อง</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      {/* Response Time */}
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="theme-text-secondary">⏱️ เวลาตอบ</span>
                          <ResponseTimeBadge rt={st.responseTime} />
                        </div>
                        <ResponseTimeDetail rt={st.responseTime} />
                      </div>

                      {/* ลูกค้าพอใจ */}
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="theme-text-secondary">😊 ลูกค้าพอใจ</span>
                          <Badge level={st.customerSatisfaction.level} label={SL[st.customerSatisfaction.level]} />
                        </div>
                        <Bar score={st.customerSatisfaction.score} level={st.customerSatisfaction.level} />
                      </div>

                      {/* พนักงานรู้สึก */}
                      {st.sentiment && (
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="theme-text-secondary">👔 ความรู้สึก</span>
                            <Badge level={st.sentiment.level} label={SL[st.sentiment.level]} />
                          </div>
                          <Bar score={st.sentiment.score} level={st.sentiment.level} />
                        </div>
                      )}
                    </div>

                    {st.rooms.length > 0 && (
                      <div className="mt-3 pt-2 border-t theme-border">
                        <div className="flex flex-wrap gap-1">
                          {st.rooms.map((r) => {
                            const c = LC[r.sentiment?.level as keyof typeof LC] || LC.green;
                            return <span key={r.sourceId} className={`text-[9px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`} title={r.roomName}>{r.roomName.substring(0, 12)}</span>;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Customer KPI */}
        {(tab === "all" || tab === "customers") && customerKpi.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3">👥 ลูกค้า <span className="text-xs theme-text-muted font-normal">({customerKpi.length} คน)</span></h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs theme-text-muted border-b theme-border">
                    <th className="pb-2 pr-4">ชื่อ</th>
                    <th className="pb-2 px-2 text-center">ข้อความ</th>
                    <th className="pb-2 px-2 text-center">ห้อง</th>
                    <th className="pb-2 px-2 text-center">😊 ความพอใจ</th>
                    <th className="pb-2 px-2 text-center">🛒 โอกาสซื้อ</th>
                  </tr>
                </thead>
                <tbody className="theme-divide divide-y">
                  {customerKpi.map((c) => (
                    <tr key={c.name} className="hover:theme-bg-hover">
                      <td className="py-2 pr-4 font-medium text-sm">{c.name}</td>
                      <td className="py-2 px-2 text-center text-sm theme-text-secondary">{c.messageCount}</td>
                      <td className="py-2 px-2 text-center text-sm theme-text-secondary">{c.roomCount}</td>
                      <td className="py-2 px-2 text-center"><Badge level={c.sentiment.level} label={SL[c.sentiment.level]} /></td>
                      <td className="py-2 px-2 text-center"><Badge level={c.purchaseIntent.level} label={PL[c.purchaseIntent.level]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Rooms */}
        {(tab === "all" || tab === "rooms" || tab === "alert") && (
          <section>
            <h2 className="text-lg font-bold mb-3">{tab === "alert" ? "🚨 ห้องที่ต้องดูแล" : "💬 ภาพรวมห้อง"} <span className="text-xs theme-text-muted font-normal">({filteredRooms.length})</span></h2>
            {filteredRooms.length === 0 ? (
              <div className="text-center theme-text-muted py-6 theme-bg-secondary rounded-xl border theme-border">{tab === "alert" ? "ไม่มีห้องที่ต้องดูแล 🎉" : "ยังไม่มีข้อมูล"}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs theme-text-muted border-b theme-border">
                      <th className="pb-2 pr-4">ห้อง</th>
                      <th className="pb-2 px-2 text-center">📨</th>
                      <th className="pb-2 px-2 text-center">😊 ลูกค้า</th>
                      <th className="pb-2 px-2 text-center">👔 พนง.</th>
                      <th className="pb-2 px-2 text-center">🛒 ซื้อ</th>
                      <th className="pb-2 px-2 text-center">⏱️ ตอบ</th>
                      <th className="pb-2 px-2 text-center">👥</th>
                    </tr>
                  </thead>
                  <tbody className="theme-divide divide-y">
                    {filteredRooms.map((r) => (
                      <tr key={r.sourceId} className="hover:theme-bg-hover">
                        <td className="py-2.5 pr-4"><p className="font-medium truncate max-w-[200px]" title={r.name}>{r.name}</p></td>
                        <td className="py-2.5 px-2 text-center text-sm theme-text-secondary">{r.messageCount}</td>
                        <td className="py-2.5 px-2 text-center">{r.customerSentiment ? <Badge level={r.customerSentiment.level} label={SL[r.customerSentiment.level]} /> : <span className="theme-text-muted">-</span>}</td>
                        <td className="py-2.5 px-2 text-center">{r.staffSentiment ? <Badge level={r.staffSentiment.level} label={SL[r.staffSentiment.level]} /> : <span className="theme-text-muted">-</span>}</td>
                        <td className="py-2.5 px-2 text-center">{r.purchaseIntent ? <Badge level={r.purchaseIntent.level} label={PL[r.purchaseIntent.level]} /> : <span className="theme-text-muted">-</span>}</td>
                        <td className="py-2.5 px-2 text-center"><ResponseTimeBadge rt={r.responseTime} /></td>
                        <td className="py-2.5 px-2 text-center text-sm theme-text-secondary">{r.customerCount}+{r.staffCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Pipeline / อัตราปิดการขาย */}
        {(tab === "all" || tab === "pipeline") && pipeline && (
          <section>
            <h2 className="text-lg font-bold mb-3">🎯 ไปป์ไลน์ &amp; อัตราปิดการขาย</h2>

            {/* Pipeline funnel */}
            <div className="theme-bg-secondary border theme-border rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-bold">{pipeline.conversionRate}%</span>
                <span className="text-sm theme-text-secondary">อัตราปิดการขาย</span>
                <span className="text-xs theme-text-muted">({pipeline.closedWon} ปิดได้ / {pipeline.closedWon + pipeline.closedLost} ปิดทั้งหมด)</span>
              </div>
              <div className="flex gap-1 h-8 rounded-lg overflow-hidden mb-3">
                {Object.entries(pipeline.counts).map(([stage, count]) => {
                  const total = Object.values(pipeline.counts).reduce((a, b) => a + b, 0) || 1;
                  const pct = (count / total) * 100;
                  if (count === 0) return null;
                  return (
                    <div key={stage} className={`${PIPELINE_COLORS[stage] || "bg-gray-500"} flex items-center justify-center text-[10px] font-bold text-white`}
                      style={{ width: `${pct}%`, minWidth: 28 }} title={`${PIPELINE_LABELS[stage] || stage}: ${count}`}>
                      {count}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 text-[11px]">
                {Object.entries(pipeline.counts).map(([stage, count]) => (
                  <div key={stage} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-sm ${PIPELINE_COLORS[stage] || "bg-gray-500"}`} />
                    <span className="theme-text-secondary">{PIPELINE_LABELS[stage] || stage}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Staff conversion table */}
            {staffConversion && staffConversion.length > 0 && (
              <div>
                <h3 className="text-sm font-bold mb-2 theme-text-secondary">👔 อัตราปิดต่อพนักงาน</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs theme-text-muted border-b theme-border">
                        <th className="pb-2 pr-4">พนักงาน</th>
                        <th className="pb-2 px-2 text-center">ลูกค้า</th>
                        <th className="pb-2 px-2 text-center">สนใจ</th>
                        <th className="pb-2 px-2 text-center">เสนอราคา</th>
                        <th className="pb-2 px-2 text-center">ต่อรอง</th>
                        <th className="pb-2 px-2 text-center">ปิดได้</th>
                        <th className="pb-2 px-2 text-center">ปิดไม่ได้</th>
                        <th className="pb-2 px-2 text-center">อัตราปิด</th>
                      </tr>
                    </thead>
                    <tbody className="theme-divide divide-y">
                      {staffConversion.map((sc) => (
                        <tr key={sc.name} className="hover:theme-bg-hover">
                          <td className="py-2 pr-4 font-medium">{sc.name}</td>
                          <td className="py-2 px-2 text-center theme-text-secondary">{sc.totalCustomers}</td>
                          <td className="py-2 px-2 text-center text-blue-400">{sc.pipeline.interested || "-"}</td>
                          <td className="py-2 px-2 text-center text-cyan-400">{sc.pipeline.quoting || "-"}</td>
                          <td className="py-2 px-2 text-center text-amber-400">{sc.pipeline.negotiating || "-"}</td>
                          <td className="py-2 px-2 text-center text-emerald-400 font-bold">{sc.closedWon || "-"}</td>
                          <td className="py-2 px-2 text-center text-red-400">{sc.closedLost || "-"}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={`font-bold ${sc.conversionRate >= 50 ? "text-emerald-400" : sc.conversionRate >= 20 ? "text-amber-400" : "theme-text-muted"}`}>
                              {sc.closedWon + sc.closedLost > 0 ? `${sc.conversionRate}%` : "-"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ลูกค้าหลุด / เสี่ยงหลุด */}
        {(tab === "all" || tab === "inactive") && (inactiveCustomers?.length > 0 || atRiskCustomers?.length > 0) && (
          <section>
            <h2 className="text-lg font-bold mb-3">😴 ลูกค้าหลุด &amp; เสี่ยงหลุด</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* ลูกค้าหลุด (>7 วัน) */}
              {inactiveCustomers?.length > 0 && (
                <div className="theme-bg-secondary border border-red-500/20 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-red-400 mb-3">🔴 ลูกค้าหลุด ({inactiveCustomers.length} คน) <span className="text-[10px] theme-text-muted font-normal">ไม่มีข้อความ &gt; 7 วัน</span></h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {inactiveCustomers.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg theme-bg-card">
                        <div>
                          <p className="font-medium">{c.userName}</p>
                          <p className="text-[10px] theme-text-muted">{c.roomName} &middot; {PIPELINE_LABELS[c.pipelineStage] || c.pipelineStage}</p>
                        </div>
                        <div className="text-right">
                          <Badge level={c.level} label={`${c.daysSinceLastMsg} วัน`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* เสี่ยงหลุด (3-7 วัน) */}
              {atRiskCustomers?.length > 0 && (
                <div className="theme-bg-secondary border border-amber-500/20 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-amber-400 mb-3">🟡 เสี่ยงหลุด ({atRiskCustomers.length} คน) <span className="text-[10px] theme-text-muted font-normal">ไม่มีข้อความ 3-7 วัน</span></h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {atRiskCustomers.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg theme-bg-card">
                        <div>
                          <p className="font-medium">{c.userName}</p>
                          <p className="text-[10px] theme-text-muted">{c.roomName} &middot; {PIPELINE_LABELS[c.pipelineStage] || c.pipelineStage}</p>
                        </div>
                        <div className="text-right">
                          <Badge level="yellow" label={`${c.daysSinceLastMsg} วัน`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Revenue Section */}
        {(tab === "all" || tab === "revenue") && revenue && (revenue.totalPipeline > 0 || revenue.wonRevenue > 0) && (
          <section>
            <h2 className="text-lg font-bold mb-3">💰 มูลค่า Deal &amp; รายได้</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <p className="text-[11px] text-blue-400 mb-1">💼 ไปป์ไลน์รวม</p>
                <p className="text-2xl font-bold text-blue-300">{revenue.totalPipeline > 0 ? formatTHB(revenue.totalPipeline) : "-"}</p>
                <p className="text-[11px] theme-text-muted mt-1">{revenue.pipelineCount} ดีลที่กำลังดำเนินการ</p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-[11px] text-emerald-400 mb-1">✅ ปิดการขายได้</p>
                <p className="text-2xl font-bold text-emerald-300">{revenue.wonRevenue > 0 ? formatTHB(revenue.wonRevenue) : "-"}</p>
                <p className="text-[11px] theme-text-muted mt-1">{revenue.wonCount} ดีล</p>
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <p className="text-[11px] text-red-400 mb-1">❌ ปิดไม่ได้</p>
                <p className="text-2xl font-bold text-red-300">{revenue.lostRevenue > 0 ? formatTHB(revenue.lostRevenue) : "-"}</p>
                <p className="text-[11px] theme-text-muted mt-1">{revenue.lostCount} ดีล</p>
              </div>
            </div>

            {/* Win Rate by Value */}
            {(revenue.wonRevenue > 0 || revenue.lostRevenue > 0) && (
              <div className="theme-bg-secondary border theme-border rounded-xl p-4">
                <p className="text-sm font-medium mb-3">อัตราปิดตามมูลค่า</p>
                <div className="flex h-6 rounded-lg overflow-hidden mb-2">
                  {revenue.wonRevenue > 0 && (
                    <div className="bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ width: `${(revenue.wonRevenue / (revenue.wonRevenue + revenue.lostRevenue)) * 100}%`, minWidth: 40 }}>
                      {Math.round((revenue.wonRevenue / (revenue.wonRevenue + revenue.lostRevenue)) * 100)}%
                    </div>
                  )}
                  {revenue.lostRevenue > 0 && (
                    <div className="bg-red-500/70 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ width: `${(revenue.lostRevenue / (revenue.wonRevenue + revenue.lostRevenue)) * 100}%`, minWidth: 40 }}>
                      {Math.round((revenue.lostRevenue / (revenue.wonRevenue + revenue.lostRevenue)) * 100)}%
                    </div>
                  )}
                </div>
                <div className="flex gap-4 text-[11px]">
                  <span className="text-emerald-400">✅ ปิดได้ {formatTHB(revenue.wonRevenue)}</span>
                  <span className="text-red-400">❌ ปิดไม่ได้ {formatTHB(revenue.lostRevenue)}</span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Charts */}
        {(tab === "all" || tab === "rooms") && rooms.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3">📈 สัดส่วน</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "😊 ความพอใจลูกค้า", field: "customerSentiment" as const, labels: SL },
                { title: "🛒 โอกาสซื้อ", field: "purchaseIntent" as const, labels: PL },
                { title: "⏱️ ความเร็วตอบ", field: "responseTime" as const, labels: RL },
              ].map(({ title, field, labels }) => {
                let green = 0, yellow = 0, red = 0;
                if (field === "responseTime") {
                  green = rooms.filter((r) => r.responseTime.level === "green" && r.responseTime.totalResponses > 0).length;
                  yellow = rooms.filter((r) => r.responseTime.level === "yellow").length;
                  red = rooms.filter((r) => r.responseTime.level === "red").length;
                } else {
                  green = rooms.filter((r) => (r[field] as ScoreData | null)?.level === "green").length;
                  yellow = rooms.filter((r) => (r[field] as ScoreData | null)?.level === "yellow").length;
                  red = rooms.filter((r) => (r[field] as ScoreData | null)?.level === "red").length;
                }
                const total = green + yellow + red || 1;
                return (
                  <div key={field} className="theme-bg-secondary border theme-border rounded-xl p-4">
                    <p className="text-sm theme-text-secondary mb-3">{title}</p>
                    <div className="space-y-2">
                      {[
                        { count: green, color: "bg-emerald-500", label: labels.green },
                        { count: yellow, color: "bg-amber-500", label: labels.yellow },
                        { count: red, color: "bg-red-500", label: labels.red },
                      ].map(({ count, color, label }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-[11px] theme-text-secondary w-16">{label}</span>
                          <div className="flex-1 theme-bg-card rounded-full h-5 overflow-hidden">
                            <div className={`${color} h-5 rounded-full flex items-center px-2 text-[10px] font-bold`} style={{ width: `${(count / total) * 100}%`, minWidth: count > 0 ? 24 : 0 }}>{count}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
