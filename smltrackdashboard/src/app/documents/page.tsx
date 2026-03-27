"use client";

import { useEffect, useState, useCallback } from "react";
import { MiniPieChart } from "@/components/charts";
import { ChartCard } from "@/components/charts/ChartCard";

// ─── Category Config ───
const CATEGORIES: Record<string, { label: string; icon: string; group: string }> = {
  payment_slip: { label: "สลิปโอนเงิน", icon: "💳", group: "accounting" },
  purchase_order: { label: "ใบสั่งซื้อ (PO)", icon: "📋", group: "accounting" },
  quotation: { label: "ใบเสนอราคา", icon: "📄", group: "accounting" },
  invoice: { label: "ใบแจ้งหนี้/ใบกำกับภาษี", icon: "🧾", group: "accounting" },
  receipt: { label: "ใบเสร็จรับเงิน", icon: "🧾", group: "accounting" },
  delivery_note: { label: "ใบส่งของ/ใบรับของ", icon: "📦", group: "accounting" },
  id_card: { label: "บัตรประชาชน/Passport", icon: "🪪", group: "other_doc" },
  business_doc: { label: "เอกสารบริษัท", icon: "🏢", group: "other_doc" },
  contract: { label: "สัญญา/ข้อตกลง", icon: "📝", group: "other_doc" },
  product_spec: { label: "สเปค/แบบก่อสร้าง", icon: "📐", group: "other_doc" },
  product_photo: { label: "รูปสินค้า", icon: "📸", group: "photo" },
  site_photo: { label: "รูปหน้างาน", icon: "🏗️", group: "photo" },
  damage_photo: { label: "รูปเคลม/เสียหาย", icon: "💥", group: "photo" },
  general: { label: "ภาพทั่วไป", icon: "🖼️", group: "photo" },
};

const GROUPS: Record<string, { label: string; icon: string; color: string }> = {
  accounting: { label: "เอกสารบัญชี", icon: "💰", color: "text-emerald-400" },
  other_doc: { label: "เอกสารอื่น", icon: "📄", color: "text-blue-400" },
  photo: { label: "ภาพทั่วไป", icon: "🖼️", color: "text-purple-400" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "รอตรวจ", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/20" },
  confirmed: { label: "ยืนยัน", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
  rejected: { label: "ปฏิเสธ", color: "text-red-400", bg: "bg-red-500/15 border-red-500/20" },
};

const PLATFORM_BADGE: Record<string, { label: string; color: string }> = {
  line: { label: "LINE", color: "bg-green-600" },
  facebook: { label: "FB", color: "bg-blue-600" },
  instagram: { label: "IG", color: "bg-pink-600" },
};

interface Doc {
  _id: string;
  sourceId: string;
  platform: string;
  customerName: string;
  roomName: string;
  category: string;
  categoryGroup: string;
  aiCategory: string;
  aiConfidence: number;
  amount: number | null;
  imageUrl: string | null;
  status: string;
  manualOverride: boolean;
  overrideBy: string | null;
  confirmedBy: string | null;
  rejectedReason: string | null;
  notes: string;
  createdAt: string;
}

interface Stats {
  byCategory: Record<string, number>;
  byGroup: Record<string, number>;
  byStatus: Record<string, number>;
  todayCount: number;
  pendingAccounting: number;
  totalConfirmedAmount: number;
  total: number;
}

function formatTHB(v: number) { return `฿${v.toLocaleString("th-TH")}`; }
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "เมื่อกี้";
  if (min < 60) return `${min} นาที`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชม.`;
  return `${Math.floor(hr / 24)} วัน`;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (groupFilter) params.set("group", groupFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      const q = params.toString();
      const [dRes, sRes] = await Promise.all([
        fetch(`/dashboard/api/documents${q ? `?${q}` : ""}`),
        fetch("/dashboard/api/documents/stats"),
      ]);
      setDocs((await dRes.json()).documents || []);
      setStats(await sRes.json());
    } catch {}
    setLoading(false);
  }, [groupFilter, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const iv = setInterval(fetchData, 10000); return () => clearInterval(iv); }, [fetchData]);

  const updateDoc = async (id: string, body: any) => {
    await fetch(`/dashboard/api/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    fetchData();
  };

  const moveCategory = async (id: string, newCategory: string) => {
    setMovingId(null);
    await updateDoc(id, { category: newCategory });
  };

  return (
    <div className="page-container">
      {/* Zoom */}
      {zoomImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center cursor-zoom-out" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} alt="" className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl" />
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 text-2xl" onClick={() => setZoomImage(null)}>&times;</button>
        </div>
      )}

      {/* Move Category Modal */}
      {movingId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setMovingId(null)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-scale-in" style={{ background: "var(--bg-elevated)" }} onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>ย้ายหมวดหมู่</h3>
            {Object.entries(GROUPS).map(([gKey, g]) => (
              <div key={gKey} className="mb-3">
                <p className={`text-[11px] font-bold mb-1.5 ${g.color}`}>{g.icon} {g.label}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(CATEGORIES).filter(([, c]) => c.group === gKey).map(([cKey, c]) => (
                    <button
                      key={cKey}
                      onClick={() => moveCategory(movingId, cKey)}
                      className="text-left px-3 py-2 rounded-lg text-xs transition hover:bg-[var(--bg-hover)] border"
                      style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                    >
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => setMovingId(null)} className="mt-2 w-full py-2 text-xs rounded-lg" style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="page-header">
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>📑 เอกสาร & ภาพ</h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>AI จำแนกอัตโนมัติ — Admin ย้ายหมวดหมู่ได้</p>
      </header>

      <div className="page-content">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <div className="stat-card">
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>ทั้งหมด</p>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats.total}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>💰 เอกสารบัญชี</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.byGroup?.accounting || 0}</p>
              <p className="text-[10px] text-amber-400">{stats.pendingAccounting} รอตรวจ</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>📄 เอกสารอื่น</p>
              <p className="text-2xl font-bold text-blue-400">{stats.byGroup?.other_doc || 0}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>🖼️ ภาพทั่วไป</p>
              <p className="text-2xl font-bold text-purple-400">{stats.byGroup?.photo || 0}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>ยอดยืนยัน</p>
              <p className="text-lg font-bold gradient-text">{formatTHB(stats.totalConfirmedAmount)}</p>
            </div>
          </div>
        )}

        {/* Group Donut Chart */}
        {stats && stats.total > 0 && (
          <div className="mb-5">
            <ChartCard title="📊 สัดส่วนเอกสาร">
              <MiniPieChart
                data={Object.entries(GROUPS).map(([key, g]) => ({
                  name: g.label,
                  value: stats.byGroup?.[key] || 0,
                }))}
                colors={["#34d399", "#60a5fa", "#a78bfa"]}
                size={160}
              />
            </ChartCard>
          </div>
        )}

        {/* Group Filter */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {[
            { value: "", label: "ทั้งหมด", icon: "📑" },
            { value: "accounting", label: "เอกสารบัญชี", icon: "💰" },
            { value: "other_doc", label: "เอกสารอื่น", icon: "📄" },
            { value: "photo", label: "ภาพทั่วไป", icon: "🖼️" },
          ].map(g => (
            <button
              key={g.value}
              onClick={() => { setGroupFilter(g.value); setCategoryFilter(""); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                groupFilter === g.value ? "gradient-bg text-white border-transparent" : ""
              }`}
              style={groupFilter !== g.value ? { borderColor: "var(--border)", color: "var(--text-secondary)" } : {}}
            >
              {g.icon} {g.label}
              {stats?.byGroup?.[g.value] != null && ` (${stats.byGroup[g.value]})`}
            </button>
          ))}
        </div>

        {/* Category Sub-filter */}
        {groupFilter && (
          <div className="flex gap-1.5 mb-4 flex-wrap">
            <button
              onClick={() => setCategoryFilter("")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${!categoryFilter ? "bg-indigo-600/20 text-indigo-400" : ""}`}
              style={categoryFilter ? { color: "var(--text-muted)" } : {}}
            >ทั้งหมด</button>
            {Object.entries(CATEGORIES).filter(([, c]) => c.group === groupFilter).map(([key, c]) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${categoryFilter === key ? "bg-indigo-600/20 text-indigo-400" : ""}`}
                style={categoryFilter !== key ? { color: "var(--text-muted)" } : {}}
              >
                {c.icon} {c.label} {stats?.byCategory?.[key] ? `(${stats.byCategory[key]})` : ""}
              </button>
            ))}
          </div>
        )}

        {/* Document List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">📑</span>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>ไม่พบเอกสาร</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {docs.map(doc => {
              const cat = CATEGORIES[doc.category] || CATEGORIES.general;
              const sc = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
              const pb = PLATFORM_BADGE[doc.platform] || PLATFORM_BADGE.line;
              return (
                <div key={doc._id} className={`card overflow-hidden ${doc.status === "pending" && doc.categoryGroup === "accounting" ? "ring-1 ring-amber-500/20" : ""}`}>
                  {/* Image */}
                  {doc.imageUrl && (
                    <div className="h-40 overflow-hidden cursor-zoom-in" onClick={() => setZoomImage(doc.imageUrl!)}>
                      <img src={doc.imageUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}

                  <div className="p-3">
                    {/* Category + Status */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-lg" style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>
                        {cat.icon} {cat.label}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded text-white ${pb.color}`}>{pb.label}</span>
                      {doc.manualOverride && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">Admin แก้ไข</span>
                      )}
                    </div>

                    {/* Customer + Room */}
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{doc.customerName}</p>
                    <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{doc.roomName}</p>

                    {/* Amount */}
                    {doc.amount != null && doc.amount > 0 && (
                      <p className="text-base font-bold mt-1" style={{ color: "var(--text-primary)" }}>{formatTHB(doc.amount)}</p>
                    )}

                    {/* AI Confidence */}
                    {doc.aiConfidence > 0 && (
                      <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                        AI ความมั่นใจ {Math.round(doc.aiConfidence * 100)}%
                        {doc.aiCategory !== doc.category && ` (AI: ${CATEGORIES[doc.aiCategory]?.label || doc.aiCategory})`}
                      </p>
                    )}

                    <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                      {timeAgo(doc.createdAt)} ที่แล้ว
                      {doc.confirmedBy && ` · ${doc.confirmedBy}`}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      <button
                        onClick={() => setMovingId(doc._id)}
                        className="px-2.5 py-1 text-[10px] rounded-lg transition font-medium"
                        style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                      >
                        🔀 ย้ายหมวด
                      </button>
                      {doc.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateDoc(doc._id, { status: "confirmed" })}
                            className="px-2.5 py-1 text-[10px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition"
                          >
                            ✓ ยืนยัน
                          </button>
                          <button
                            onClick={() => updateDoc(doc._id, { status: "rejected", rejectedReason: prompt("เหตุผล:") || "" })}
                            className="px-2.5 py-1 text-[10px] rounded-lg text-red-400 hover:bg-red-950/30 font-medium transition"
                          >
                            ✕ ปฏิเสธ
                          </button>
                        </>
                      )}
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
