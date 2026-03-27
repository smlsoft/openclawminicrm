"use client";

import { useState, useEffect, useCallback } from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import { MiniLineChart, MiniPieChart, MiniBarChart } from "@/components/charts";

interface RevenueData {
  today: { sum: number; count: number };
  week: { sum: number; count: number };
  month: { sum: number; count: number };
  lastMonth: { sum: number; count: number };
  year: { sum: number; count: number };
  monthChange: number;
  projected: number;
  dailyRevenue: { date: string; sum: number; count: number }[];
  byPlatform: { platform: string; sum: number; count: number }[];
  pipeline: { stage: string; sum: number; count: number }[];
  won: { sum: number; count: number };
}

const PLATFORM_NAMES: Record<string, string> = { line: "LINE", facebook: "Facebook", instagram: "Instagram", unknown: "อื่นๆ" };
const PLATFORM_COLORS: Record<string, string> = { LINE: "#06c755", Facebook: "#1877f2", Instagram: "#e1306c", "อื่นๆ": "#8b5cf6" };
const STAGE_NAMES: Record<string, string> = { interested: "สนใจ", quoting: "เสนอราคา", negotiating: "ต่อรอง", following_up: "ติดตาม" };

function formatTHB(v: number) {
  if (v >= 1000000) return `฿${(v / 1000000).toFixed(1)}ล้าน`;
  if (v >= 1000) return `฿${(v / 1000).toFixed(0)}K`;
  return `฿${v.toLocaleString("th-TH")}`;
}

function formatTHBFull(v: number) {
  return `฿${v.toLocaleString("th-TH")}`;
}

type Tab = "today" | "week" | "month" | "year";

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("month");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/dashboard/api/revenue?period=${tab}`);
      const d = await res.json();
      setData(d);
    } catch {}
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const iv = setInterval(fetchData, 30000); return () => clearInterval(iv); }, [fetchData]);

  const current = data ? data[tab] : { sum: 0, count: 0 };

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>รายได้</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>ภาพรวมรายได้ ยอดขาย เปรียบเทียบ</p>
          </div>
        </div>
      </header>

      <div className="page-content">
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
            {/* Tab เลือกช่วงเวลา */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {([
                { value: "today" as Tab, label: "วันนี้" },
                { value: "week" as Tab, label: "สัปดาห์" },
                { value: "month" as Tab, label: "เดือนนี้" },
                { value: "year" as Tab, label: "ปีนี้" },
              ]).map((t) => (
                <button key={t.value} onClick={() => setTab(t.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${tab === t.value ? "gradient-bg text-white border-transparent" : ""}`}
                  style={tab !== t.value ? { borderColor: "var(--border)", color: "var(--text-secondary)" } : {}}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ยอดรวมใหญ่ */}
            <div className="card p-6 mb-5 text-center">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                ยอดรายได้{tab === "today" ? "วันนี้" : tab === "week" ? "สัปดาห์นี้" : tab === "month" ? "เดือนนี้" : "ปีนี้"}
              </p>
              <p className="text-4xl font-bold gradient-text mb-2">{formatTHBFull(current.sum)}</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{current.count} รายการ</p>
              {tab === "month" && data.monthChange !== 0 && (
                <p className={`text-sm mt-2 font-medium ${data.monthChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {data.monthChange > 0 ? "+" : ""}{data.monthChange}% จากเดือนก่อน
                </p>
              )}
            </div>

            {/* 4 Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="stat-card text-center">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>วันนี้</p>
                <p className="text-xl font-bold text-emerald-400">{formatTHB(data.today.sum)}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{data.today.count} รายการ</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>สัปดาห์นี้</p>
                <p className="text-xl font-bold text-cyan-400">{formatTHB(data.week.sum)}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{data.week.count} รายการ</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>เดือนก่อน</p>
                <p className="text-xl font-bold text-amber-400">{formatTHB(data.lastMonth.sum)}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{data.lastMonth.count} รายการ</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>คาดการณ์สิ้นเดือน</p>
                <p className="text-xl font-bold text-indigo-400">{formatTHB(data.projected)}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>AI ทำนาย</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {/* รายได้ 30 วัน */}
              {data.dailyRevenue.length > 0 && (
                <ChartCard title="รายได้ 30 วัน" className="md:col-span-2">
                  <MiniLineChart
                    data={data.dailyRevenue.map((d) => ({ name: d.date.substring(5), value: d.sum }))}
                    area height={220} />
                </ChartCard>
              )}

              {/* แยกตาม Platform */}
              {data.byPlatform.length > 0 && (
                <ChartCard title="แยกตามช่องทาง">
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
          </>
        )}
      </div>
    </div>
  );
}
