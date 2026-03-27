"use client";

import { useState, useEffect, useCallback } from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import { MiniPieChart, MiniBarChart } from "@/components/charts";

interface CustomerScore {
  _id: string;
  sourceId: string;
  customerName: string;
  platform: string;
  scores: {
    engagement: number;
    purchaseIntent: number;
    lifetimeValue: number;
    churnRisk: number;
    overall: number;
  };
  tier: string;
  lastCalculated: string;
}

const TIERS: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  vip: { label: "VIP", icon: "🏆", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/20" },
  hot_lead: { label: "ลูกค้าเป้าหมาย", icon: "🔥", color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/20" },
  active: { label: "ใช้งานปกติ", icon: "⭐", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
  at_risk: { label: "เสี่ยงหาย", icon: "⚠️", color: "text-red-400", bg: "bg-red-500/15 border-red-500/20" },
  dormant: { label: "ไม่เคลื่อนไหว", icon: "💤", color: "text-gray-400", bg: "bg-gray-500/15 border-gray-500/20" },
};

const SCORE_LABELS: Record<string, string> = {
  engagement: "การมีส่วนร่วม",
  purchaseIntent: "โอกาสซื้อ",
  lifetimeValue: "มูลค่าสะสม",
  churnRisk: "ความเสี่ยงหาย",
  overall: "คะแนนรวม",
};

function ScoreBar({ value, label, reverse }: { value: number; label: string; reverse?: boolean }) {
  const color = reverse
    ? (value >= 60 ? "bg-red-500" : value >= 30 ? "bg-amber-500" : "bg-emerald-500")
    : (value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-red-500");
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-24 shrink-0" style={{ color: "var(--text-muted)" }}>{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: "var(--bg-hover)" }}>
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export default function ScoreCardPage() {
  const [scores, setScores] = useState<CustomerScore[]>([]);
  const [tierCounts, setTierCounts] = useState<Record<string, { count: number; avg: number }>>({});
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState("");
  const [sortBy, setSortBy] = useState("overall");
  const [calculating, setCalculating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (tierFilter) params.set("tier", tierFilter);
      if (sortBy) params.set("sort", sortBy);
      const q = params.size ? `?${params}` : "";
      const res = await fetch(`/dashboard/api/scorecard${q}`);
      const data = await res.json();
      setScores(data.scores || []);
      setTierCounts(data.tierCounts || {});
    } catch {}
    setLoading(false);
  }, [tierFilter, sortBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const recalculate = async () => {
    setCalculating(true);
    await fetch("/dashboard/api/scorecard/calculate", { method: "POST" });
    setCalculating(false);
    fetchData();
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>คะแนนลูกค้า</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>AI ให้คะแนนลูกค้าอัตโนมัติ วิเคราะห์พฤติกรรม</p>
          </div>
          <button onClick={recalculate} disabled={calculating}
            className="px-4 py-2 rounded-xl text-sm font-medium transition border disabled:opacity-50"
            style={{ background: "rgba(99,102,241,0.1)", color: "rgb(129,140,248)", borderColor: "rgba(99,102,241,0.2)" }}>
            {calculating ? "กำลังคำนวณ..." : "คำนวณใหม่"}
          </button>
        </div>
      </header>

      <div className="page-content">
        {/* Tier summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {Object.entries(TIERS).map(([key, t]) => {
            const tc = tierCounts[key];
            return (
              <button key={key} onClick={() => setTierFilter(tierFilter === key ? "" : key)}
                className={`stat-card text-center transition ${tierFilter === key ? "ring-2 ring-indigo-500/50" : ""}`}>
                <span className="text-2xl">{t.icon}</span>
                <p className="text-xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{tc?.count || 0}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t.label}</p>
                {tc?.avg ? <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>เฉลี่ย {tc.avg} คะแนน</p> : null}
              </button>
            );
          })}
        </div>

        {/* Chart */}
        {Object.keys(tierCounts).length > 0 && (
          <div className="mb-5">
            <ChartCard title="สัดส่วนลูกค้าแต่ละกลุ่ม">
              <MiniPieChart
                data={Object.entries(TIERS).map(([key, t]) => ({ name: t.label, value: tierCounts[key]?.count || 0 }))}
                colors={["#fbbf24", "#fb923c", "#34d399", "#f87171", "#9ca3af"]}
                size={180} />
            </ChartCard>
          </div>
        )}

        {/* Sort */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>เรียงตาม:</span>
          {(["overall", "engagement", "purchaseIntent", "lifetimeValue", "churnRisk"] as const).map((s) => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition border ${sortBy === s ? "gradient-bg text-white border-transparent" : ""}`}
              style={sortBy !== s ? { borderColor: "var(--border)", color: "var(--text-secondary)" } : {}}>
              {SCORE_LABELS[s]}
            </button>
          ))}
        </div>

        {/* รายการลูกค้า */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : scores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">🏆</span>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีข้อมูล กดปุ่ม "คำนวณใหม่" เพื่อเริ่มวิเคราะห์</p>
            <button onClick={recalculate} disabled={calculating}
              className="px-4 py-2 rounded-xl text-sm font-medium gradient-bg text-white hover:opacity-90 disabled:opacity-50">
              {calculating ? "กำลังคำนวณ..." : "คำนวณใหม่"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {scores.map((s) => {
              const t = TIERS[s.tier] || TIERS.dormant;
              return (
                <div key={s._id} className="card p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-xl shrink-0">
                      {t.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{s.customerName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${t.bg}`}>
                          {t.icon} {t.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          s.platform === "line" ? "bg-green-600/20 text-green-400" :
                          s.platform === "facebook" ? "bg-blue-600/20 text-blue-400" : "bg-pink-600/20 text-pink-400"
                        }`}>
                          {s.platform === "line" ? "LINE" : s.platform === "facebook" ? "FB" : "IG"}
                        </span>
                      </div>

                      {/* Overall score */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold gradient-text">{s.scores.overall}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>คะแนนรวม</span>
                      </div>

                      {/* Score bars */}
                      <div className="space-y-1.5">
                        <ScoreBar value={s.scores.engagement} label={SCORE_LABELS.engagement} />
                        <ScoreBar value={s.scores.purchaseIntent} label={SCORE_LABELS.purchaseIntent} />
                        <ScoreBar value={s.scores.lifetimeValue} label={SCORE_LABELS.lifetimeValue} />
                        <ScoreBar value={s.scores.churnRisk} label={SCORE_LABELS.churnRisk} reverse />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
