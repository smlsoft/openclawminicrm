"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import { MiniLineChart, MiniPieChart, MiniBarChart } from "@/components/charts";

interface RevenueData {
  today: { sum: number; count: number };
  week: { sum: number; count: number };
  month: { sum: number; count: number };
  lastMonth: { sum: number; count: number };
  year: { sum: number; count: number };
  custom: { sum: number; count: number };
  prevPeriod: { sum: number; count: number };
  monthChange: number;
  projected: number;
  avgOrderValue: number;
  dailyRevenue: { date: string; sum: number; count: number }[];
  byPlatform: { platform: string; sum: number; count: number }[];
  byDayOfWeek: { day: number; sum: number; count: number }[];
  topCustomers: { name: string; sum: number; count: number; platform: string }[];
  pipeline: { stage: string; sum: number; count: number }[];
  won: { sum: number; count: number };
}

const PLATFORM_NAMES: Record<string, string> = { line: "LINE", facebook: "Facebook", instagram: "Instagram", unknown: "อื่นๆ" };
const PLATFORM_COLORS: Record<string, string> = { LINE: "#06c755", Facebook: "#1877f2", Instagram: "#e1306c", "อื่นๆ": "#8b5cf6" };
const STAGE_NAMES: Record<string, string> = { interested: "สนใจ", quoting: "เสนอราคา", negotiating: "ต่อรอง", following_up: "ติดตาม" };
const DAY_NAMES = ["", "อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function formatTHB(v: number) {
  if (v >= 1000000) return `฿${(v / 1000000).toFixed(1)}ล้าน`;
  if (v >= 1000) return `฿${(v / 1000).toFixed(0)}K`;
  return `฿${v.toLocaleString("th-TH")}`;
}

function formatTHBFull(v: number) {
  return `฿${v.toLocaleString("th-TH")}`;
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function getPresetRange(preset: string): { from: string; to: string; label: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = toDateStr(today);

  switch (preset) {
    case "7d": {
      const f = new Date(today); f.setDate(f.getDate() - 6);
      return { from: toDateStr(f), to, label: "7 วัน" };
    }
    case "14d": {
      const f = new Date(today); f.setDate(f.getDate() - 13);
      return { from: toDateStr(f), to, label: "14 วัน" };
    }
    case "30d": {
      const f = new Date(today); f.setDate(f.getDate() - 29);
      return { from: toDateStr(f), to, label: "30 วัน" };
    }
    case "90d": {
      const f = new Date(today); f.setDate(f.getDate() - 89);
      return { from: toDateStr(f), to, label: "90 วัน" };
    }
    case "thisMonth": {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toDateStr(f), to, label: "เดือนนี้" };
    }
    case "lastMonth": {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toDateStr(f), to: toDateStr(t), label: "เดือนก่อน" };
    }
    case "thisQuarter": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      const f = new Date(now.getFullYear(), q, 1);
      return { from: toDateStr(f), to, label: "ไตรมาสนี้" };
    }
    case "thisYear": {
      const f = new Date(now.getFullYear(), 0, 1);
      return { from: toDateStr(f), to, label: "ปีนี้" };
    }
    case "today": {
      return { from: to, to, label: "วันนี้" };
    }
    case "yesterday": {
      const f = new Date(today); f.setDate(f.getDate() - 1);
      return { from: toDateStr(f), to: toDateStr(f), label: "เมื่อวาน" };
    }
    case "thisWeek": {
      const f = new Date(today); f.setDate(f.getDate() - f.getDay());
      return { from: toDateStr(f), to, label: "สัปดาห์นี้" };
    }
    default:
      return { from: to, to, label: "" };
  }
}

type ViewMode = "overview" | "detail";

const PRESETS = [
  { group: "วัน", items: [{ value: "today", label: "วันนี้" }, { value: "yesterday", label: "เมื่อวาน" }] },
  { group: "สัปดาห์/เดือน", items: [{ value: "thisWeek", label: "สัปดาห์นี้" }, { value: "7d", label: "7 วัน" }, { value: "14d", label: "14 วัน" }, { value: "thisMonth", label: "เดือนนี้" }, { value: "lastMonth", label: "เดือนก่อน" }] },
  { group: "ไตรมาส/ปี", items: [{ value: "30d", label: "30 วัน" }, { value: "90d", label: "90 วัน" }, { value: "thisQuarter", label: "ไตรมาสนี้" }, { value: "thisYear", label: "ปีนี้" }] },
];

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [compare, setCompare] = useState(false);

  const currentRange = useMemo(() => {
    if (showCustom && customFrom && customTo) {
      return { from: customFrom, to: customTo, label: `${customFrom} — ${customTo}` };
    }
    return getPresetRange(activePreset);
  }, [activePreset, showCustom, customFrom, customTo]);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("from", currentRange.from);
      params.set("to", currentRange.to);
      const res = await fetch(`/dashboard/api/revenue?${params}`);
      const d = await res.json();
      setData(d);
    } catch {}
    setLoading(false);
  }, [currentRange]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);
  useEffect(() => { const iv = setInterval(fetchData, 30000); return () => clearInterval(iv); }, [fetchData]);

  const handlePreset = (preset: string) => {
    setShowCustom(false);
    setActivePreset(preset);
    setShowPresets(false);
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      setShowCustom(true);
      setActivePreset("");
      setShowPresets(false);
    }
  };

  // Comparison calculations
  const customChange = useMemo(() => {
    if (!data) return 0;
    const prev = data.prevPeriod.sum;
    const curr = data.custom.sum;
    return prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
  }, [data]);

  const countChange = useMemo(() => {
    if (!data) return 0;
    const prev = data.prevPeriod.count;
    const curr = data.custom.count;
    return prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
  }, [data]);

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>รายได้</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>ภาพรวมรายได้ ยอดขาย เปรียบเทียบ วิเคราะห์</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => setViewMode("overview")}
                className={`px-3 py-1.5 text-xs font-medium transition ${viewMode === "overview" ? "gradient-bg text-white" : ""}`}
                style={viewMode !== "overview" ? { color: "var(--text-secondary)", background: "var(--bg-card)" } : {}}>
                ภาพรวม
              </button>
              <button onClick={() => setViewMode("detail")}
                className={`px-3 py-1.5 text-xs font-medium transition ${viewMode === "detail" ? "gradient-bg text-white" : ""}`}
                style={viewMode !== "detail" ? { color: "var(--text-secondary)", background: "var(--bg-card)" } : {}}>
                วิเคราะห์
              </button>
            </div>
            {/* Compare toggle */}
            <button onClick={() => setCompare(!compare)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${compare ? "gradient-bg text-white border-transparent" : ""}`}
              style={!compare ? { borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-card)" } : {}}>
              ⚖️ เทียบ
            </button>
          </div>
        </div>
      </header>

      <div className="page-content">
        {/* ─── Date Range Selector ─── */}
        <div className="card p-3 mb-5">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Quick presets row */}
            <div className="flex gap-1.5 flex-wrap flex-1">
              {[
                { value: "today", label: "วันนี้" },
                { value: "thisWeek", label: "สัปดาห์" },
                { value: "thisMonth", label: "เดือนนี้" },
                { value: "30d", label: "30 วัน" },
                { value: "90d", label: "90 วัน" },
                { value: "thisYear", label: "ปีนี้" },
              ].map((p) => (
                <button key={p.value} onClick={() => handlePreset(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${activePreset === p.value && !showCustom ? "gradient-bg text-white border-transparent" : ""}`}
                  style={activePreset !== p.value || showCustom ? { borderColor: "var(--border)", color: "var(--text-secondary)" } : {}}>
                  {p.label}
                </button>
              ))}

              {/* More presets dropdown */}
              <div className="relative">
                <button onClick={() => setShowPresets(!showPresets)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  เพิ่มเติม ▾
                </button>
                {showPresets && (
                  <div className="absolute top-full left-0 mt-1 z-50 card p-3 min-w-[240px] shadow-lg" style={{ background: "var(--bg-elevated)" }}>
                    {PRESETS.map((g) => (
                      <div key={g.group} className="mb-2 last:mb-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{g.group}</p>
                        <div className="flex flex-wrap gap-1">
                          {g.items.map((p) => (
                            <button key={p.value} onClick={() => handlePreset(p.value)}
                              className={`px-2.5 py-1 rounded text-xs transition ${activePreset === p.value ? "gradient-bg text-white" : ""}`}
                              style={activePreset !== p.value ? { color: "var(--text-secondary)" } : {}}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Separator */}
            <div className="h-6 w-px" style={{ background: "var(--border)" }} />

            {/* Custom date range */}
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-xs border bg-transparent"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>ถึง</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-xs border bg-transparent"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} />
              <button onClick={handleCustomApply}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${showCustom ? "gradient-bg text-white" : ""}`}
                style={!showCustom ? { color: "var(--text-secondary)", border: "1px solid var(--border)" } : {}}>
                ใช้ช่วงนี้
              </button>
            </div>
          </div>

          {/* Active range label */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>📅 ช่วงที่แสดง:</span>
            <span className="text-xs font-medium gradient-text">{currentRange.label}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">💰</span>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีข้อมูลรายได้</p>
          </div>
        ) : (
          <>
            {/* ─── Hero Revenue Card ─── */}
            <div className="card p-6 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-1 text-center md:text-left">
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>ยอดรายได้ {currentRange.label}</p>
                  <p className="text-4xl font-bold gradient-text mb-1">{formatTHBFull(data.custom.sum)}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{data.custom.count} รายการ</p>
                  {compare && data.prevPeriod.sum > 0 && (
                    <div className="mt-2 flex items-center gap-2 justify-center md:justify-start">
                      <span className={`text-sm font-bold ${customChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {customChange >= 0 ? "▲" : "▼"} {Math.abs(customChange)}%
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        vs ช่วงก่อนหน้า ({formatTHB(data.prevPeriod.sum)})
                      </span>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatMini label="วันนี้" value={data.today.sum} count={data.today.count} color="text-emerald-400" />
                  <StatMini label="สัปดาห์นี้" value={data.week.sum} count={data.week.count} color="text-cyan-400" />
                  <StatMini label="เดือนนี้" value={data.month.sum} count={data.month.count} color="text-amber-400"
                    badge={data.monthChange !== 0 ? { value: data.monthChange, label: "vs เดือนก่อน" } : undefined} />
                  <StatMini label="คาดการณ์สิ้นเดือน" value={data.projected} sub="AI ทำนาย" color="text-indigo-400" />
                </div>
              </div>
            </div>

            {/* ─── KPI Cards Row ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="stat-card text-center">
                <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>ยอดเฉลี่ย/ออเดอร์</p>
                <p className="text-lg font-bold text-purple-400">{formatTHB(data.avgOrderValue)}</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>จำนวนออเดอร์</p>
                <p className="text-lg font-bold text-cyan-400">{data.custom.count}</p>
                {compare && countChange !== 0 && (
                  <p className={`text-[10px] ${countChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {countChange >= 0 ? "+" : ""}{countChange}%
                  </p>
                )}
              </div>
              <div className="stat-card text-center">
                <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>ปิดได้แล้ว</p>
                <p className="text-lg font-bold text-emerald-400">{formatTHB(data.won.sum)}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{data.won.count} ราย</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>ปีนี้</p>
                <p className="text-lg font-bold text-amber-400">{formatTHB(data.year.sum)}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{data.year.count} รายการ</p>
              </div>
            </div>

            {/* ─── Chart: Daily Revenue Trend ─── */}
            {data.dailyRevenue.length > 0 && (
              <ChartCard title="รายได้รายวัน" subtitle={currentRange.label} className="mb-5">
                <MiniLineChart
                  data={data.dailyRevenue.map((d) => ({ name: d.date.substring(5), value: d.sum }))}
                  area height={240} />
              </ChartCard>
            )}

            {/* ─── Overview Mode Charts ─── */}
            {viewMode === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Platform breakdown */}
                {data.byPlatform.length > 0 && (
                  <ChartCard title="แยกตามช่องทาง" subtitle={currentRange.label}>
                    <MiniPieChart
                      data={data.byPlatform.map((p) => ({ name: PLATFORM_NAMES[p.platform] || p.platform, value: p.sum }))}
                      colors={data.byPlatform.map((p) => PLATFORM_COLORS[PLATFORM_NAMES[p.platform] || "อื่นๆ"] || "#8b5cf6")}
                      size={180} />
                    <div className="flex justify-center gap-4 mt-2">
                      {data.byPlatform.map((p) => (
                        <div key={p.platform} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLATFORM_COLORS[PLATFORM_NAMES[p.platform] || "อื่นๆ"] }} />
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {PLATFORM_NAMES[p.platform] || p.platform} {formatTHB(p.sum)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                )}

                {/* Pipeline value */}
                {data.pipeline.length > 0 && (
                  <ChartCard title="มูลค่ารอปิดการขาย">
                    <MiniBarChart
                      data={data.pipeline.map((p) => ({ name: STAGE_NAMES[p.stage] || p.stage, value: p.sum }))}
                      color="#818cf8" height={180} layout="vertical" />
                    <div className="mt-2 text-center">
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        ปิดได้แล้ว: <span className="text-emerald-400 font-bold">{formatTHBFull(data.won.sum)}</span> ({data.won.count} ราย)
                      </p>
                    </div>
                  </ChartCard>
                )}
              </div>
            )}

            {/* ─── Detail/Analysis Mode ─── */}
            {viewMode === "detail" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  {/* Revenue by day of week */}
                  {data.byDayOfWeek.length > 0 && (
                    <ChartCard title="รายได้ตามวันในสัปดาห์" subtitle="วันไหนขายดีที่สุด?">
                      <MiniBarChart
                        data={data.byDayOfWeek.map((d) => ({ name: DAY_NAMES[d.day] || `${d.day}`, value: d.sum }))}
                        color="#06b6d4" height={180} layout="horizontal" />
                    </ChartCard>
                  )}

                  {/* Platform breakdown */}
                  {data.byPlatform.length > 0 && (
                    <ChartCard title="รายได้ตามช่องทาง" subtitle="ช่องไหนทำเงินมากสุด?">
                      <MiniBarChart
                        data={data.byPlatform.map((p) => ({
                          name: PLATFORM_NAMES[p.platform] || p.platform,
                          value: p.sum,
                        }))}
                        colors={Object.fromEntries(
                          data.byPlatform.map((p) => [PLATFORM_NAMES[p.platform] || p.platform, PLATFORM_COLORS[PLATFORM_NAMES[p.platform] || "อื่นๆ"] || "#8b5cf6"])
                        )}
                        height={180} layout="horizontal" />
                    </ChartCard>
                  )}
                </div>

                {/* Top Customers */}
                {data.topCustomers.length > 0 && (
                  <ChartCard title="ลูกค้ารายได้สูงสุด" subtitle={`Top ${data.topCustomers.length} — ${currentRange.label}`} className="mb-5">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ color: "var(--text-muted)" }}>
                            <th className="text-left py-2 px-2">#</th>
                            <th className="text-left py-2 px-2">ลูกค้า</th>
                            <th className="text-left py-2 px-2">ช่องทาง</th>
                            <th className="text-right py-2 px-2">จำนวน</th>
                            <th className="text-right py-2 px-2">ยอดรวม</th>
                            <th className="text-left py-2 px-2" style={{ width: "30%" }}>สัดส่วน</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topCustomers.map((c, i) => {
                            const maxSum = data.topCustomers[0]?.sum || 1;
                            const pct = Math.round((c.sum / (data.custom.sum || 1)) * 100);
                            return (
                              <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                                <td className="py-2 px-2 font-bold" style={{ color: i < 3 ? "var(--color-gold, #f59e0b)" : "var(--text-muted)" }}>
                                  {i + 1}
                                </td>
                                <td className="py-2 px-2 font-medium" style={{ color: "var(--text-primary)" }}>
                                  {c.name.length > 20 ? c.name.substring(0, 20) + "…" : c.name}
                                </td>
                                <td className="py-2 px-2">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                    style={{ background: PLATFORM_COLORS[PLATFORM_NAMES[c.platform] || "อื่นๆ"] + "22", color: PLATFORM_COLORS[PLATFORM_NAMES[c.platform] || "อื่นๆ"] }}>
                                    {PLATFORM_NAMES[c.platform] || c.platform}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-right" style={{ color: "var(--text-secondary)" }}>{c.count}</td>
                                <td className="py-2 px-2 text-right font-bold text-emerald-400">{formatTHB(c.sum)}</td>
                                <td className="py-2 px-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                                      <div className="h-full rounded-full transition-all" style={{ width: `${(c.sum / maxSum) * 100}%`, background: "var(--gradient-start, #6366f1)" }} />
                                    </div>
                                    <span className="text-[10px] w-8 text-right" style={{ color: "var(--text-muted)" }}>{pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>
                )}

                {/* Pipeline + Platform Pie side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  {data.byPlatform.length > 0 && (
                    <ChartCard title="สัดส่วนช่องทาง">
                      <MiniPieChart
                        data={data.byPlatform.map((p) => ({ name: PLATFORM_NAMES[p.platform] || p.platform, value: p.sum }))}
                        colors={data.byPlatform.map((p) => PLATFORM_COLORS[PLATFORM_NAMES[p.platform] || "อื่นๆ"] || "#8b5cf6")}
                        size={180} />
                      <div className="flex justify-center gap-4 mt-2">
                        {data.byPlatform.map((p) => (
                          <div key={p.platform} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLATFORM_COLORS[PLATFORM_NAMES[p.platform] || "อื่นๆ"] }} />
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {PLATFORM_NAMES[p.platform] || p.platform} {formatTHB(p.sum)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ChartCard>
                  )}

                  {data.pipeline.length > 0 && (
                    <ChartCard title="มูลค่ารอปิดการขาย">
                      <MiniBarChart
                        data={data.pipeline.map((p) => ({ name: STAGE_NAMES[p.stage] || p.stage, value: p.sum }))}
                        color="#818cf8" height={180} layout="vertical" />
                      <div className="mt-2 text-center">
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          ปิดได้แล้ว: <span className="text-emerald-400 font-bold">{formatTHBFull(data.won.sum)}</span> ({data.won.count} ราย)
                        </p>
                      </div>
                    </ChartCard>
                  )}
                </div>
              </>
            )}

            {/* ─── Comparison Panel ─── */}
            {compare && data.prevPeriod.sum > 0 && (
              <ChartCard title="เปรียบเทียบกับช่วงก่อนหน้า" subtitle="ช่วงเวลาเท่ากัน ก่อนหน้าช่วงที่เลือก" className="mb-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
                  <CompareItem label="รายได้" current={data.custom.sum} previous={data.prevPeriod.sum} format={formatTHB} />
                  <CompareItem label="ออเดอร์" current={data.custom.count} previous={data.prevPeriod.count} format={(v) => `${v}`} />
                  <CompareItem label="เฉลี่ย/ออเดอร์"
                    current={data.custom.count > 0 ? Math.round(data.custom.sum / data.custom.count) : 0}
                    previous={data.prevPeriod.count > 0 ? Math.round(data.prevPeriod.sum / data.prevPeriod.count) : 0}
                    format={formatTHB} />
                  <div className="text-center">
                    <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>การเปลี่ยนแปลง</p>
                    <p className={`text-2xl font-bold ${customChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {customChange >= 0 ? "+" : ""}{customChange}%
                    </p>
                  </div>
                </div>
              </ChartCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───

function StatMini({ label, value, count, sub, color, badge }: {
  label: string;
  value: number;
  count?: number;
  sub?: string;
  color: string;
  badge?: { value: number; label: string };
}) {
  return (
    <div className="stat-card text-center">
      <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className={`text-lg font-bold ${color}`}>{formatTHB(value)}</p>
      {count !== undefined && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{count} รายการ</p>}
      {sub && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{sub}</p>}
      {badge && (
        <p className={`text-[10px] font-medium ${badge.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {badge.value >= 0 ? "+" : ""}{badge.value}% {badge.label}
        </p>
      )}
    </div>
  );
}

function CompareItem({ label, current, previous, format }: {
  label: string;
  current: number;
  previous: number;
  format: (v: number) => string;
}) {
  const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
  return (
    <div className="text-center">
      <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{format(current)}</p>
      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>ก่อนหน้า: {format(previous)}</p>
      {change !== 0 && (
        <p className={`text-[10px] font-bold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {change >= 0 ? "▲+" : "▼"}{Math.abs(change)}%
        </p>
      )}
    </div>
  );
}
