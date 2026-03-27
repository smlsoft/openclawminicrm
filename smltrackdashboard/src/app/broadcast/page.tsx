"use client";

import { useState, useEffect, useCallback } from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import { MiniPieChart } from "@/components/charts";

interface Broadcast {
  _id: string;
  name: string;
  message: string;
  type: string;
  imageUrl: string;
  targetType: string;
  targetTags: string[];
  targetTier: string;
  targetPlatform: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  scheduledAt: string | null;
  sentAt: string | null;
  stats: { total: number; sent: number; failed: number };
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "แบบร่าง", color: "text-gray-400", bg: "bg-gray-500/15 border-gray-500/20" },
  scheduled: { label: "ตั้งเวลา", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/20" },
  sending: { label: "กำลังส่ง", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/20" },
  sent: { label: "ส่งแล้ว", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
  cancelled: { label: "ยกเลิก", color: "text-red-400", bg: "bg-red-500/15 border-red-500/20" },
};

const TARGET_LABELS: Record<string, string> = {
  all: "ทุกคน", tag: "ตามแท็ก", tier: "ตามคะแนน", platform: "ตามช่องทาง",
};

const TIER_LABELS: Record<string, string> = {
  vip: "🏆 VIP", hot_lead: "🔥 ลูกค้าเป้าหมาย", active: "⭐ ใช้งานปกติ", at_risk: "⚠️ เสี่ยงหาย", dormant: "💤 ไม่เคลื่อนไหว",
};

const initForm = {
  name: "", message: "", type: "text", imageUrl: "",
  targetType: "all", targetTags: "", targetTier: "", targetPlatform: "all",
  scheduledAt: "",
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
  return `${Math.floor(hrs / 24)} วันที่แล้ว`;
}

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (tab) params.set("status", tab);
      const res = await fetch(`/dashboard/api/broadcasts${params.size ? `?${params}` : ""}`);
      const data = await res.json();
      setBroadcasts(data.broadcasts || []);
    } catch {}
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditId(null); setForm(initForm); setShowForm(true); };
  const openEdit = (b: Broadcast) => {
    setEditId(b._id);
    setForm({
      name: b.name, message: b.message, type: b.type, imageUrl: b.imageUrl,
      targetType: b.targetType, targetTags: b.targetTags.join(", "), targetTier: b.targetTier,
      targetPlatform: b.targetPlatform, scheduledAt: b.scheduledAt || "",
    });
    setShowForm(true);
  };

  const saveBroadcast = async () => {
    setSaving(true);
    const payload = {
      ...form,
      targetTags: form.targetTags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (editId) {
      await fetch(`/dashboard/api/broadcasts/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/dashboard/api/broadcasts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setSaving(false); setShowForm(false); fetchData();
  };

  const sendNow = async (id: string) => {
    if (!confirm("ส่งข้อความนี้ทันที?")) return;
    setSending(id);
    await fetch(`/dashboard/api/broadcasts/${id}/send`, { method: "POST" });
    setSending(null); fetchData();
  };

  const cancelBroadcast = async (id: string) => {
    await fetch(`/dashboard/api/broadcasts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
    fetchData();
  };

  const deleteBroadcast = async (id: string) => {
    if (!confirm("ลบแคมเปญนี้?")) return;
    await fetch(`/dashboard/api/broadcasts/${id}`, { method: "DELETE" });
    fetchData();
  };

  const statusCounts = broadcasts.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="page-container">
      {/* Modal สร้าง/แก้ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-5 animate-scale-in"
            style={{ background: "var(--bg-elevated)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              {editId ? "แก้ไขแคมเปญ" : "สร้างแคมเปญใหม่"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>ชื่อแคมเปญ *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น โปรโมชันมีนาคม"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>ข้อความ *</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4}
                  placeholder="สวัสดีครับ {{name}} ..."
                  className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>ใช้ {"{{name}}"} แทนชื่อลูกค้า</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>กลุ่มเป้าหมาย</label>
                  <select value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    <option value="all">ทุกคน</option>
                    <option value="tag">ตามแท็ก</option>
                    <option value="tier">ตามคะแนนลูกค้า</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>ช่องทาง</label>
                  <select value={form.targetPlatform} onChange={(e) => setForm({ ...form, targetPlatform: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    <option value="all">ทุกช่องทาง</option>
                    <option value="line">LINE</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>
              </div>
              {form.targetType === "tag" && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>แท็ก (คั่นด้วยคอมม่า)</label>
                  <input value={form.targetTags} onChange={(e) => setForm({ ...form, targetTags: e.target.value })} placeholder="VIP, กทม"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
              )}
              {form.targetType === "tier" && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>กลุ่มคะแนน</label>
                  <select value={form.targetTier} onChange={(e) => setForm({ ...form, targetTier: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    <option value="">เลือกกลุ่ม</option>
                    {Object.entries(TIER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>ตั้งเวลาส่ง (ไม่ระบุ = ส่งทันที)</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>ยกเลิก</button>
              <button onClick={saveBroadcast} disabled={saving || !form.name || !form.message}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium gradient-bg text-white transition hover:opacity-90 disabled:opacity-50">
                {saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "สร้างแคมเปญ"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>ส่งข้อความ (Broadcast)</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>ส่งโปรโมชัน ข่าวสาร ถึงลูกค้าเป็นกลุ่ม</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 rounded-xl text-sm font-medium gradient-bg text-white hover:opacity-90">
            + สร้างแคมเปญ
          </button>
        </div>
      </header>

      <div className="page-content">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="stat-card text-center">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>แบบร่าง</p>
            <p className="text-2xl font-bold text-gray-400">{statusCounts.draft || 0}</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>ตั้งเวลา</p>
            <p className="text-2xl font-bold text-blue-400">{statusCounts.scheduled || 0}</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>ส่งแล้ว</p>
            <p className="text-2xl font-bold text-emerald-400">{statusCounts.sent || 0}</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยกเลิก</p>
            <p className="text-2xl font-bold text-red-400">{statusCounts.cancelled || 0}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { value: "", label: "ทั้งหมด" },
            { value: "draft", label: "แบบร่าง" },
            { value: "scheduled", label: "ตั้งเวลา" },
            { value: "sent", label: "ส่งแล้ว" },
            { value: "cancelled", label: "ยกเลิก" },
          ].map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${tab === t.value ? "gradient-bg text-white border-transparent" : ""}`}
              style={tab !== t.value ? { borderColor: "var(--border)", color: "var(--text-secondary)" } : {}}>{t.label}</button>
          ))}
        </div>

        {/* รายการ */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">📢</span>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีแคมเปญ สร้างแคมเปญแรกเลย!</p>
            <button onClick={openCreate} className="px-4 py-2 rounded-xl text-sm font-medium gradient-bg text-white hover:opacity-90">
              + สร้างแคมเปญ
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b) => {
              const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.draft;
              return (
                <div key={b._id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-lg shrink-0">📢</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{b.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${sc.bg}`}>{sc.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                          {TARGET_LABELS[b.targetType]}
                          {b.targetType === "tier" && b.targetTier ? ` (${TIER_LABELS[b.targetTier] || b.targetTier})` : ""}
                          {b.targetType === "tag" && b.targetTags.length ? ` (${b.targetTags.join(", ")})` : ""}
                        </span>
                      </div>
                      <p className="text-xs line-clamp-2 mb-2" style={{ color: "var(--text-secondary)" }}>{b.message}</p>
                      {b.status === "sent" && (
                        <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                          ส่งถึง {b.stats.sent} คน {b.stats.failed > 0 ? `(ล้มเหลว ${b.stats.failed})` : ""}
                          {b.sentAt ? ` — ${timeAgo(b.sentAt)}` : ""}
                        </p>
                      )}
                      {b.scheduledAt && b.status === "scheduled" && (
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          ตั้งเวลา: {new Date(b.scheduledAt).toLocaleString("th-TH")}
                        </p>
                      )}
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(b.createdAt)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {(b.status === "draft" || b.status === "scheduled") && (
                        <>
                          <button onClick={() => sendNow(b._id)} disabled={sending === b._id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium gradient-bg text-white hover:opacity-90 disabled:opacity-50">
                            {sending === b._id ? "กำลังส่ง..." : "ส่งเลย"}
                          </button>
                          <button onClick={() => openEdit(b)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>แก้ไข</button>
                          <button onClick={() => cancelBroadcast(b._id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-950/30">
                            ยกเลิก
                          </button>
                        </>
                      )}
                      <button onClick={() => deleteBroadcast(b._id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/30">
                        ลบ
                      </button>
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
