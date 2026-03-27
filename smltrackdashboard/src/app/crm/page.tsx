"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MiniBarChart } from "@/components/charts";
import { ChartCard } from "@/components/charts/ChartCard";
import { PIPELINE_COLORS } from "@/components/charts/theme";

interface Customer {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags: string[];
  customTags?: string[];
  rooms: string[];
  totalMessages: number;
  pipelineStage: string;
  lastSentiment: { score: number; level: string; reason?: string } | null;
  lastPurchaseIntent: { score: number; level: string; reason?: string } | null;
  dealValue?: number;
  expectedCloseDate?: string;
  assignedTo?: string[];
  createdAt: string;
  updatedAt: string;
}

function formatTHB(v: number) {
  if (v >= 1000000) return `฿${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `฿${(v / 1000).toFixed(0)}K`;
  return `฿${v.toLocaleString("th-TH")}`;
}

const STAGES: Record<string, { label: string; color: string; icon: string }> = {
  new: { label: "ใหม่", color: "bg-gray-500", icon: "🆕" },
  interested: { label: "สนใจ", color: "bg-blue-500", icon: "👀" },
  quoting: { label: "เสนอราคา", color: "bg-purple-500", icon: "💰" },
  negotiating: { label: "ต่อรอง", color: "bg-amber-500", icon: "🤝" },
  closed_won: { label: "ปิดการขาย", color: "bg-emerald-500", icon: "✅" },
  closed_lost: { label: "ไม่ซื้อ", color: "bg-red-500", icon: "❌" },
  following_up: { label: "ติดตาม", color: "bg-cyan-500", icon: "📞" },
};

const SL: Record<string, string> = { green: "ปกติ", yellow: "ติดตาม", red: "ไม่พอใจ" };
const PL: Record<string, string> = { green: "ไม่สนใจ", yellow: "เริ่มสนใจ", red: "สนใจซื้อ!" };

function Badge({ level, label }: { level: string; label: string }) {
  const colors: Record<string, string> = {
    green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    yellow: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${colors[level] || colors.green}`}>{label}</span>;
}

type FilterStage = string;

export default function CrmPage() {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<FilterStage>("all");
  const [search, setSearch] = useState("");
  const [showMyOnly, setShowMyOnly] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch("/dashboard/api/customers");
      const d = await r.json();
      if (Array.isArray(d)) setCustomers(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, [fetchData]);

  const filtered = customers.filter((c) => {
    if (stageFilter !== "all" && c.pipelineStage !== stageFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.tags.some((t) => t.includes(search))) return false;
    if (showMyOnly && session?.user) {
      const myIds = [session.user.name, session.user.email].filter(Boolean).map((s) => s!.toLowerCase());
      const assigned = (c.assignedTo || []).map((s) => s.toLowerCase());
      if (!assigned.some((a) => myIds.includes(a))) return false;
    }
    return true;
  });

  // Pipeline summary
  const stageCounts = Object.keys(STAGES).map((key) => ({
    key,
    ...STAGES[key],
    count: customers.filter((c) => c.pipelineStage === key).length,
  }));

  const activePipelineStages = ["interested", "quoting", "negotiating", "following_up"];
  const totalPipelineValue = customers
    .filter((c) => activePipelineStages.includes(c.pipelineStage))
    .reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const wonValue = customers
    .filter((c) => c.pipelineStage === "closed_won")
    .reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const lostValue = customers
    .filter((c) => c.pipelineStage === "closed_lost")
    .reduce((sum, c) => sum + (c.dealValue || 0), 0);

  if (loading) return <div className="min-h-screen theme-bg flex items-center justify-center"><div className="theme-text-muted animate-pulse">กำลังโหลดข้อมูลลูกค้า...</div></div>;

  return (
    <div className="min-h-screen theme-bg theme-text">
      <header className="border-b theme-border px-3 md:px-6 py-4 sticky top-0 z-10 theme-bg backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">👥 CRM</h1>
            <p className="text-xs theme-text-muted">ลูกค้าเพิ่มอัตโนมัติ &middot; {customers.length} ราย</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tasks" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-900/50 border border-cyan-700/50 text-cyan-300 hover:text-white hover:bg-cyan-800/50 transition">📋 งาน</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 md:p-6 pb-24 md:pb-6 space-y-6">
        {/* Pipeline Value Banner */}
        {(totalPipelineValue > 0 || wonValue > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-[11px] text-blue-400 mb-1">💼 Pipeline รวม</p>
              <p className="text-xl font-bold text-blue-300">{totalPipelineValue > 0 ? formatTHB(totalPipelineValue) : "-"}</p>
              <p className="text-[10px] theme-text-muted mt-1">สนใจ, เสนอราคา, ต่อรอง, ติดตาม</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-[11px] text-emerald-400 mb-1">✅ ปิดการขายได้</p>
              <p className="text-xl font-bold text-emerald-300">{wonValue > 0 ? formatTHB(wonValue) : "-"}</p>
              <p className="text-[10px] theme-text-muted mt-1">{customers.filter((c) => c.pipelineStage === "closed_won").length} ราย</p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-[11px] text-red-400 mb-1">❌ ปิดไม่ได้</p>
              <p className="text-xl font-bold text-red-300">{lostValue > 0 ? formatTHB(lostValue) : "-"}</p>
              <p className="text-[10px] theme-text-muted mt-1">{customers.filter((c) => c.pipelineStage === "closed_lost").length} ราย</p>
            </div>
          </div>
        )}

        {/* Pipeline Kanban Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {stageCounts.map((s) => (
            <button key={s.key}
              onClick={() => setStageFilter(stageFilter === s.key ? "all" : s.key)}
              className={`rounded-xl p-3 border transition text-left ${stageFilter === s.key ? "ring-2 ring-white/30 border-white/20" : "theme-border"}`}
              style={{ background: "var(--bg-card)" }}>
              <div className="flex items-center justify-between">
                <span className="text-lg">{s.icon}</span>
                <span className="text-xl font-bold">{s.count}</span>
              </div>
              <p className="text-[10px] theme-text-muted mt-1">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Pipeline Bar Chart */}
        {stageCounts.some(s => s.count > 0) && (
          <ChartCard title="📊 Pipeline">
            <MiniBarChart
              data={stageCounts.map(s => ({ name: s.label, value: s.count }))}
              colors={Object.fromEntries(stageCounts.map(s => [s.label, PIPELINE_COLORS[s.key] || "#6b7280"]))}
              height={180}
              layout="vertical"
            />
          </ChartCard>
        )}

        {/* Search + Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text" placeholder="🔍 ค้นหาชื่อ หรือ tag..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 rounded-lg text-sm border theme-border theme-bg-card theme-text w-64"
          />
          <button
            onClick={() => setShowMyOnly((v) => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              showMyOnly ? "bg-indigo-600 text-white" : "theme-bg-card theme-text-secondary hover:theme-bg-hover"
            }`}
          >
            {showMyOnly ? "👤 ลูกค้าของฉัน" : "👥 ทั้งหมด"}
          </button>
          <button onClick={() => { setStageFilter("all"); setSearch(""); setShowMyOnly(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${stageFilter === "all" && !search ? "bg-white text-black" : "theme-bg-card theme-text-secondary"}`}>
            ทั้งหมด ({customers.length})
          </button>
          {["interested", "quoting", "negotiating", "closed_won"].map((s) => (
            <button key={s} onClick={() => setStageFilter(stageFilter === s ? "all" : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${stageFilter === s ? "bg-white text-black" : "theme-bg-card theme-text-secondary"}`}>
              {STAGES[s].icon} {STAGES[s].label}
            </button>
          ))}
        </div>

        {/* Customer Table */}
        {filtered.length === 0 ? (
          <div className="text-center theme-text-muted py-12 theme-bg-card rounded-xl border theme-border">
            {customers.length === 0 ? "ยังไม่มีลูกค้า — จะเพิ่มอัตโนมัติเมื่อมีสนทนาใหม่" : "ไม่พบลูกค้าที่ตรงเงื่อนไข"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] theme-text-muted border-b theme-border">
                  <th className="pb-3 pr-4">ลูกค้า</th>
                  <th className="pb-3 px-2 text-center">สถานะ</th>
                  <th className="pb-3 px-2 text-center">💰 มูลค่า</th>
                  <th className="pb-3 px-2 text-center">😊 ความรู้สึก</th>
                  <th className="pb-3 px-2 text-center">🛒 โอกาสซื้อ</th>
                  <th className="pb-3 px-2 text-center">📨 ข้อความ</th>
                  <th className="pb-3 px-2">Tags</th>
                  <th className="pb-3 px-2 text-center">ห้อง</th>
                  <th className="pb-3 pl-2">อัปเดต</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {filtered.map((c) => {
                  const stage = STAGES[c.pipelineStage] || STAGES.new;
                  return (
                    <tr key={c._id} className="hover:opacity-80 transition">
                      <td className="py-3 pr-4">
                        <Link href={`/crm/${c._id}`} className="flex items-center gap-2 hover:opacity-70 transition">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${stage.color}`}>
                            {c.name.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-sm hover:underline">{c.name}</p>
                            {c.phone && <p className="text-[10px] theme-text-muted">{c.phone}</p>}
                            {c.company && <p className="text-[10px] theme-text-muted">{c.company}</p>}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${stage.color}`}>
                          {stage.icon} {stage.label}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {c.dealValue && c.dealValue > 0 ? (
                          <span className="text-xs font-medium text-emerald-400">{formatTHB(c.dealValue)}</span>
                        ) : (
                          <span className="theme-text-muted text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {c.lastSentiment ? <Badge level={c.lastSentiment.level} label={SL[c.lastSentiment.level]} /> : "-"}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {c.lastPurchaseIntent ? <Badge level={c.lastPurchaseIntent.level} label={PL[c.lastPurchaseIntent.level]} /> : "-"}
                      </td>
                      <td className="py-3 px-2 text-center text-xs theme-text-secondary">{c.totalMessages || 0}</td>
                      <td className="py-3 px-2">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(c.tags || []).slice(0, 5).map((t) => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded theme-bg-card border theme-border theme-text-secondary">{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-xs theme-text-muted">{(c.rooms || []).length}</td>
                      <td className="py-3 pl-2 text-[11px] theme-text-muted">
                        {c.updatedAt ? new Date(c.updatedAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
