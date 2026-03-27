"use client";

import { useEffect, useState, useCallback } from "react";
import { MiniPieChart, MiniBarChart, MiniLineChart, ChartLegend } from "@/components/charts";
import { ChartCard } from "@/components/charts/ChartCard";
import { PIPELINE_COLORS, PLATFORM_COLORS, SENTIMENT_COLORS, CHART_COLORS } from "@/components/charts/theme";

type Tab = "overview" | "sales" | "staff" | "finance" | "customers" | "documents";

const TABS: { value: Tab; label: string; icon: string }[] = [
  { value: "overview", label: "ภาพรวม", icon: "📊" },
  { value: "sales", label: "การขาย", icon: "💰" },
  { value: "staff", label: "ทีมงาน", icon: "👔" },
  { value: "finance", label: "การเงิน", icon: "💸" },
  { value: "customers", label: "ลูกค้า", icon: "👥" },
  { value: "documents", label: "เอกสาร", icon: "📑" },
];

const PIPELINE_LABELS: Record<string, string> = {
  new: "ใหม่", interested: "สนใจ", quoting: "เสนอราคา", negotiating: "ต่อรอง",
  closed_won: "ปิดได้", closed_lost: "ปิดไม่ได้", following_up: "ติดตาม",
};

const SENTIMENT_LABELS: Record<string, string> = { green: "ดี", yellow: "ปานกลาง", red: "แย่" };
const PURCHASE_LABELS: Record<string, string> = { green: "ไม่สนใจ", yellow: "เริ่มสนใจ", red: "สนใจซื้อ" };
const DOC_GROUP_LABELS: Record<string, string> = { accounting: "เอกสารบัญชี", other_doc: "เอกสารอื่น", photo: "ภาพทั่วไป" };
const DOC_GROUP_COLORS: Record<string, string> = { accounting: "#34d399", other_doc: "#60a5fa", photo: "#a78bfa" };

function formatTHB(v: number) { return `฿${v.toLocaleString("th-TH")}`; }

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<any>(null);
  const [kpiData, setKpiData] = useState<any>(null);
  const [costsData, setCostsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [overview, kpi, costs] = await Promise.all([
        fetch("/dashboard/api/analytics/overview").then(r => r.json()),
        fetch("/dashboard/api/kpi").then(r => r.json()).catch(() => null),
        fetch("/dashboard/api/costs").then(r => r.json()).catch(() => null),
      ]);
      setData(overview);
      if (kpi?.summary) setKpiData(kpi);
      if (costs) setCostsData(costs);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="page-container flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="page-container flex items-center justify-center">
      <p style={{ color: "var(--text-muted)" }}>ไม่สามารถโหลดข้อมูลได้</p>
    </div>
  );

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>📊 วิเคราะห์</h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>กราฟวิเคราะห์ธุรกิจ — สำหรับบริหารและปรับปรุงบริการ</p>
      </header>

      <div className="page-content">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto no-scrollbar pb-1">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap border ${
                tab === t.value ? "gradient-bg text-white border-transparent" : ""
              }`}
              style={tab !== t.value ? { borderColor: "var(--border)", color: "var(--text-secondary)" } : {}}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ─── ภาพรวม ─── */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="stat-card text-center">
                <p className="text-2xl font-bold gradient-text">{data.summary.totalMessages.toLocaleString()}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>ข้อความทั้งหมด</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{data.summary.totalCustomers}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>ลูกค้า</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{data.summary.totalGroups}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>ห้องสนทนา</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChartCard title="📈 ข้อความรายวัน" subtitle="7 วันล่าสุด">
                <MiniLineChart data={data.dailyMessages} area height={180} />
              </ChartCard>

              <ChartCard title="📱 ช่องทาง" subtitle="สัดส่วนข้อความแยกช่องทาง">
                <MiniPieChart data={data.platform} colors={data.platform.map((p: any) => PLATFORM_COLORS[p.name] || CHART_COLORS[0])} size={180} />
                <ChartLegend items={data.platform.map((p: any) => ({ label: p.name.toUpperCase(), color: PLATFORM_COLORS[p.name] || "#999", value: p.value }))} />
              </ChartCard>

              <ChartCard title="😊 ความรู้สึก" subtitle="ความรู้สึกลูกค้า">
                <MiniPieChart data={data.sentiment} colors={data.sentiment.map((s: any) => SENTIMENT_COLORS[s.name] || "#999")} size={180} />
                <ChartLegend items={data.sentiment.map((s: any) => ({ label: SENTIMENT_LABELS[s.name] || s.name, color: SENTIMENT_COLORS[s.name] || "#999", value: s.value }))} />
              </ChartCard>

              <ChartCard title="🛒 โอกาสซื้อ" subtitle="ระดับความสนใจซื้อ">
                <MiniPieChart data={data.purchaseIntent} colors={data.purchaseIntent.map((p: any) => SENTIMENT_COLORS[p.name] || "#999")} size={180} />
                <ChartLegend items={data.purchaseIntent.map((p: any) => ({ label: PURCHASE_LABELS[p.name] || p.name, color: SENTIMENT_COLORS[p.name] || "#999", value: p.value }))} />
              </ChartCard>
            </div>
          </div>
        )}

        {/* ─── การขาย ─── */}
        {tab === "sales" && (
          <div className="space-y-4">
            <ChartCard title="📊 สถานะการขาย" subtitle="จำนวนลูกค้าแยกตามขั้นตอน">
              <MiniBarChart
                data={data.pipeline.map((p: any) => ({ name: PIPELINE_LABELS[p.name] || p.name, value: p.count || p.value }))}
                colors={Object.fromEntries(data.pipeline.map((p: any) => [PIPELINE_LABELS[p.name] || p.name, PIPELINE_COLORS[p.name] || "#999"]))}
                height={250}
                layout="horizontal"
              />
            </ChartCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChartCard title="💰 มูลค่าสถานะการขาย" subtitle="มูลค่ารวมแยกตามขั้นตอน">
                <MiniBarChart
                  data={data.pipeline.filter((p: any) => (p.amount || 0) > 0).map((p: any) => ({ name: PIPELINE_LABELS[p.name] || p.name, value: p.amount || 0 }))}
                  colors={Object.fromEntries(data.pipeline.map((p: any) => [PIPELINE_LABELS[p.name] || p.name, PIPELINE_COLORS[p.name] || "#999"]))}
                  height={200}
                  layout="horizontal"
                />
              </ChartCard>

              <ChartCard title="🏆 ปิดได้ / เสีย" subtitle="ปิดได้ vs ปิดไม่ได้">
                {(() => {
                  const won = data.pipeline.find((p: any) => p.name === "closed_won");
                  const lost = data.pipeline.find((p: any) => p.name === "closed_lost");
                  const winLoss = [
                    { name: "ปิดได้", value: won?.count || won?.value || 0 },
                    { name: "ปิดไม่ได้", value: lost?.count || lost?.value || 0 },
                  ];
                  return (
                    <>
                      <MiniPieChart data={winLoss} colors={["#34d399", "#f87171"]} size={180} />
                      <ChartLegend items={winLoss.map((w, i) => ({ label: w.name, color: i === 0 ? "#34d399" : "#f87171", value: w.value }))} />
                    </>
                  );
                })()}
              </ChartCard>
            </div>
          </div>
        )}

        {/* ─── ทีมงาน ─── */}
        {tab === "staff" && (
          <div className="space-y-4">
            <ChartCard title="💬 ข้อความต่อพนักงาน" subtitle="จำนวนข้อความที่ดูแล">
              <MiniBarChart data={data.staff} dataKey="messages" nameKey="name" color="#818cf8" height={250} layout="vertical" />
            </ChartCard>

            <ChartCard title="🏠 ห้องที่ดูแล" subtitle="จำนวนห้องสนทนาต่อพนักงาน">
              <MiniBarChart data={data.staff} dataKey="rooms" nameKey="name" color="#22d3ee" height={250} layout="vertical" />
            </ChartCard>

            {kpiData?.staffKpi && kpiData.staffKpi.length > 0 && (
              <ChartCard title="⏱️ เวลาตอบกลับ" subtitle="เวลาตอบเฉลี่ย (นาที)">
                <MiniBarChart
                  data={kpiData.staffKpi.map((s: any) => ({ name: s.name.replace("SML-", ""), value: s.responseTime?.avgMinutes || 0 }))}
                  color="#fbbf24"
                  height={250}
                  layout="vertical"
                />
              </ChartCard>
            )}
          </div>
        )}

        {/* ─── การเงิน ─── */}
        {tab === "finance" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChartCard title="💳 สถานะการชำระเงิน">
                <MiniPieChart
                  data={data.payments.map((p: any) => ({
                    name: p.name === "pending" ? "รอตรวจ" : p.name === "confirmed" ? "ยืนยัน" : "ปฏิเสธ",
                    value: p.value,
                  }))}
                  colors={["#fbbf24", "#34d399", "#f87171"]}
                  size={180}
                />
                <ChartLegend items={data.payments.map((p: any, i: number) => ({
                  label: p.name === "pending" ? "รอตรวจ" : p.name === "confirmed" ? "ยืนยัน" : "ปฏิเสธ",
                  color: ["#fbbf24", "#34d399", "#f87171"][i] || "#999",
                  value: `${p.value} (${formatTHB(p.amount)})`,
                }))} />
              </ChartCard>

              {costsData?.byProvider && (
                <ChartCard title="🤖 ค่าใช้จ่าย AI แยกผู้ให้บริการ">
                  <MiniPieChart
                    data={(costsData.byProvider || []).map((p: any) => ({ name: p._id || "unknown", value: p.calls || 0 }))}
                    size={180}
                  />
                  <ChartLegend items={(costsData.byProvider || []).map((p: any, i: number) => ({
                    label: p._id || "unknown",
                    color: CHART_COLORS[i % CHART_COLORS.length],
                    value: p.calls,
                  }))} />
                </ChartCard>
              )}
            </div>

            {costsData?.daily && costsData.daily.length > 0 && (
              <ChartCard title="📈 ค่าใช้จ่าย AI รายวัน" subtitle="จำนวนคำที่ใช้ 7 วันล่าสุด">
                <MiniLineChart
                  data={costsData.daily.map((d: any) => ({ name: (d._id || "").substring(5), value: d.totalTokens || 0 }))}
                  area
                  height={200}
                />
              </ChartCard>
            )}
          </div>
        )}

        {/* ─── ลูกค้า ─── */}
        {tab === "customers" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChartCard title="❤️ สุขภาพลูกค้า" subtitle="ใช้งาน / เสี่ยง / ไม่ใช้งาน">
                <MiniPieChart data={data.customerHealth} colors={["#34d399", "#fbbf24", "#f87171"]} size={180} />
                <ChartLegend items={data.customerHealth.map((h: any, i: number) => ({
                  label: h.name, color: ["#34d399", "#fbbf24", "#f87171"][i], value: h.value,
                }))} />
              </ChartCard>

              <ChartCard title="😊 ความรู้สึกลูกค้า" subtitle="ความรู้สึกโดยรวม">
                <MiniBarChart
                  data={data.sentiment.map((s: any) => ({ name: SENTIMENT_LABELS[s.name] || s.name, value: s.value }))}
                  colors={{ "ดี": "#34d399", "ปานกลาง": "#fbbf24", "แย่": "#f87171" }}
                  height={180}
                  layout="horizontal"
                />
              </ChartCard>

              <ChartCard title="🛒 โอกาสซื้อ" subtitle="ระดับความสนใจซื้อ">
                <MiniBarChart
                  data={data.purchaseIntent.map((p: any) => ({ name: PURCHASE_LABELS[p.name] || p.name, value: p.value }))}
                  colors={{ "ไม่สนใจ": "#34d399", "เริ่มสนใจ": "#fbbf24", "สนใจซื้อ": "#f87171" }}
                  height={180}
                  layout="horizontal"
                />
              </ChartCard>

              <ChartCard title="📱 ลูกค้าแยกช่องทาง">
                <MiniPieChart data={data.platform} colors={data.platform.map((p: any) => PLATFORM_COLORS[p.name] || "#999")} size={180} />
                <ChartLegend items={data.platform.map((p: any) => ({ label: p.name.toUpperCase(), color: PLATFORM_COLORS[p.name] || "#999", value: p.value }))} />
              </ChartCard>
            </div>
          </div>
        )}

        {/* ─── เอกสาร ─── */}
        {tab === "documents" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChartCard title="📑 เอกสารแยกกลุ่ม">
                <MiniPieChart
                  data={data.documents.map((d: any) => ({ name: DOC_GROUP_LABELS[d.name] || d.name, value: d.value }))}
                  colors={data.documents.map((d: any) => DOC_GROUP_COLORS[d.name] || "#999")}
                  size={180}
                />
                <ChartLegend items={data.documents.map((d: any) => ({
                  label: DOC_GROUP_LABELS[d.name] || d.name,
                  color: DOC_GROUP_COLORS[d.name] || "#999",
                  value: d.value,
                }))} />
              </ChartCard>

              <ChartCard title="💳 สถานะชำระเงิน">
                <MiniPieChart
                  data={data.payments.map((p: any) => ({
                    name: p.name === "pending" ? "รอตรวจ" : p.name === "confirmed" ? "ยืนยัน" : "ปฏิเสธ",
                    value: p.value,
                  }))}
                  colors={["#fbbf24", "#34d399", "#f87171"]}
                  size={180}
                />
              </ChartCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
