"use client";

import { useState, useEffect, useCallback } from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import { MiniBarChart, MiniPieChart } from "@/components/charts";

interface Rule {
  _id: string;
  name: string;
  trigger: string;
  triggerDays: number;
  triggerStage: string;
  messages: { dayOffset: number; template: string }[];
  aiGenerate: boolean;
  platform: string;
  status: "active" | "paused";
  stats: { triggered: number; replied: number; converted: number };
  createdAt: string;
}

interface QueueItem {
  _id: string;
  ruleId: string;
  ruleName: string;
  sourceId: string;
  customerName: string;
  status: "pending" | "sent" | "replied" | "converted" | "expired";
  currentStep: number;
  nextSendAt: string;
  history: { step: number; sentAt: string; message: string; replied: boolean }[];
  createdAt: string;
}

interface CloserStats {
  totalRules: number;
  totalTriggered: number;
  totalReplied: number;
  totalConverted: number;
  replyRate: number;
  conversionRate: number;
  queueByStatus: Record<string, number>;
}

const TRIGGERS: Record<string, { label: string; icon: string }> = {
  no_reply_days: { label: "ไม่ตอบ X วัน", icon: "⏰" },
  stage_stuck: { label: "ค้างใน Stage", icon: "📊" },
  high_intent: { label: "โอกาสซื้อสูง", icon: "🔥" },
  custom: { label: "กำหนดเอง", icon: "⚙️" },
};

const QUEUE_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "รอส่ง", color: "text-amber-400" },
  sent: { label: "ส่งแล้ว", color: "text-blue-400" },
  replied: { label: "ตอบแล้ว", color: "text-emerald-400" },
  converted: { label: "ปิดการขาย", color: "text-indigo-400" },
  expired: { label: "หมดเวลา", color: "text-gray-400" },
};

const STAGES: Record<string, string> = {
  interested: "สนใจ", quoting: "เสนอราคา", negotiating: "ต่อรอง", following_up: "ติดตาม",
};

const initForm = {
  name: "", trigger: "no_reply_days", triggerDays: "3", triggerStage: "",
  messages: [{ dayOffset: 0, template: "สวัสดีครับ {{name}} ยังสนใจสินค้าอยู่ไหมครับ?" }],
  aiGenerate: false, platform: "all",
};

type Tab = "rules" | "queue" | "stats";

export default function AutoCloserPage() {
  const [tab, setTab] = useState<Tab>("rules");
  const [rules, setRules] = useState<Rule[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [closerStats, setCloserStats] = useState<CloserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (tab === "rules") {
        const res = await fetch("/dashboard/api/auto-closer/rules");
        const data = await res.json();
        setRules(data.rules || []);
      } else if (tab === "queue") {
        const res = await fetch("/dashboard/api/auto-closer/queue");
        const data = await res.json();
        setQueue(data.queue || []);
      } else {
        const res = await fetch("/dashboard/api/auto-closer/stats");
        const data = await res.json();
        setCloserStats(data);
      }
    } catch {}
    setLoading(false);
  }, [tab]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const openCreate = () => { setEditId(null); setForm(initForm); setShowForm(true); };
  const openEdit = (r: Rule) => {
    setEditId(r._id);
    setForm({
      name: r.name, trigger: r.trigger, triggerDays: String(r.triggerDays), triggerStage: r.triggerStage,
      messages: r.messages.length > 0 ? r.messages : initForm.messages,
      aiGenerate: r.aiGenerate, platform: r.platform,
    });
    setShowForm(true);
  };

  const saveRule = async () => {
    setSaving(true);
    const payload = { ...form, triggerDays: parseInt(form.triggerDays) || 3 };
    if (editId) {
      await fetch(`/dashboard/api/auto-closer/rules/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/dashboard/api/auto-closer/rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setSaving(false); setShowForm(false); fetchData();
  };

  const toggleStatus = async (r: Rule) => {
    const newStatus = r.status === "active" ? "paused" : "active";
    await fetch(`/dashboard/api/auto-closer/rules/${r._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    fetchData();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("ลบกฎนี้? คิวที่เกี่ยวข้องจะถูกลบด้วย")) return;
    await fetch(`/dashboard/api/auto-closer/rules/${id}`, { method: "DELETE" });
    fetchData();
  };

  const addMessage = () => {
    const lastOffset = form.messages.length > 0 ? form.messages[form.messages.length - 1].dayOffset + 3 : 0;
    setForm({ ...form, messages: [...form.messages, { dayOffset: lastOffset, template: "" }] });
  };

  const updateMessage = (idx: number, field: string, value: any) => {
    const msgs = [...form.messages];
    (msgs[idx] as any)[field] = field === "dayOffset" ? parseInt(value) || 0 : value;
    setForm({ ...form, messages: msgs });
  };

  const removeMessage = (idx: number) => {
    if (form.messages.length <= 1) return;
    setForm({ ...form, messages: form.messages.filter((_, i) => i !== idx) });
  };

  return (
    <div className="page-container">
      {/* Modal สร้าง/แก้ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-5 animate-scale-in"
            style={{ background: "var(--bg-elevated)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              {editId ? "แก้ไขกฎติดตาม" : "สร้างกฎติดตามใหม่"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>ชื่อกฎ *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น ติดตามลูกค้าถามราคา"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>เงื่อนไข</label>
                  <select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                    {form.trigger === "no_reply_days" ? "จำนวนวัน" : form.trigger === "stage_stuck" ? "จำนวนวัน" : "จำนวนวัน"}
                  </label>
                  <input type="number" value={form.triggerDays} onChange={(e) => setForm({ ...form, triggerDays: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
              </div>
              {form.trigger === "stage_stuck" && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Stage ที่ค้าง</label>
                  <select value={form.triggerStage} onChange={(e) => setForm({ ...form, triggerStage: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    <option value="">เลือก Stage</option>
                    {Object.entries(STAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>ช่องทาง</label>
                <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                  <option value="all">ทุกช่องทาง</option>
                  <option value="line">LINE</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>

              {/* ข้อความ follow-up */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>ข้อความติดตาม (ทีละขั้น)</label>
                  <button onClick={addMessage} className="text-[10px] px-2 py-1 rounded-lg gradient-bg text-white">+ เพิ่มขั้น</button>
                </div>
                <div className="space-y-2">
                  {form.messages.map((m, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="shrink-0">
                        <label className="block text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>วันที่</label>
                        <input type="number" value={m.dayOffset} onChange={(e) => updateMessage(i, "dayOffset", e.target.value)}
                          className="w-14 px-2 py-1.5 rounded-lg border text-xs text-center" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>ข้อความขั้นที่ {i + 1}</label>
                        <textarea value={m.template} onChange={(e) => updateMessage(i, "template", e.target.value)} rows={2}
                          placeholder="สวัสดีครับ {{name}} ..."
                          className="w-full px-2 py-1.5 rounded-lg border text-xs resize-none" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                      </div>
                      {form.messages.length > 1 && (
                        <button onClick={() => removeMessage(i)} className="shrink-0 mt-4 text-red-400 text-xs hover:bg-red-950/30 rounded p-1">ลบ</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={form.aiGenerate} onChange={(e) => setForm({ ...form, aiGenerate: e.target.checked })} />
                ให้ AI สร้างข้อความเฉพาะบุคคล (อ้างอิงบทสนทนาเดิม)
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>ยกเลิก</button>
              <button onClick={saveRule} disabled={saving || !form.name}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium gradient-bg text-white transition hover:opacity-90 disabled:opacity-50">
                {saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "สร้างกฎ"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>ติดตามปิดการขาย</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>AI ติดตามลูกค้าอัตโนมัติ ส่งข้อความ follow-up</p>
          </div>
          {tab === "rules" && (
            <button onClick={openCreate} className="px-4 py-2 rounded-xl text-sm font-medium gradient-bg text-white hover:opacity-90">
              + สร้างกฎใหม่
            </button>
          )}
        </div>
      </header>

      <div className="page-content">
        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {([
            { value: "rules" as Tab, label: "กฎติดตาม", icon: "📋" },
            { value: "queue" as Tab, label: "คิวรอส่ง", icon: "📨" },
            { value: "stats" as Tab, label: "ผลลัพธ์", icon: "📊" },
          ]).map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${tab === t.value ? "gradient-bg text-white border-transparent" : ""}`}
              style={tab !== t.value ? { borderColor: "var(--border)", color: "var(--text-secondary)" } : {}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === "rules" ? (
          /* ── Tab: กฎติดตาม ── */
          rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-5xl">🤝</span>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีกฎติดตาม สร้างกฎแรกเลย!</p>
              <button onClick={openCreate} className="px-4 py-2 rounded-xl text-sm font-medium gradient-bg text-white hover:opacity-90">
                + สร้างกฎใหม่
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((r) => {
                const tr = TRIGGERS[r.trigger] || TRIGGERS.custom;
                return (
                  <div key={r._id} className="card p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-lg shrink-0">{tr.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{r.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                            r.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-amber-500/15 text-amber-400 border-amber-500/20"
                          }`}>
                            {r.status === "active" ? "ทำงานอยู่" : "หยุดชั่วคราว"}
                          </span>
                        </div>
                        <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                          {tr.label} ({r.triggerDays} วัน)
                          {r.triggerStage ? ` — Stage: ${STAGES[r.triggerStage] || r.triggerStage}` : ""}
                          {r.aiGenerate ? " — AI สร้างข้อความ" : ""}
                        </p>
                        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                          {r.messages.length} ขั้นตอน | ช่องทาง: {r.platform === "all" ? "ทุกช่องทาง" : r.platform}
                        </p>
                        {/* Mini stats */}
                        <div className="flex gap-4 text-[10px]" style={{ color: "var(--text-muted)" }}>
                          <span>ใช้งาน {r.stats.triggered} ครั้ง</span>
                          <span className="text-emerald-400">ตอบ {r.stats.replied}</span>
                          <span className="text-indigo-400">ปิดขาย {r.stats.converted}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={() => openEdit(r)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>แก้ไข</button>
                        <button onClick={() => toggleStatus(r)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            r.status === "active" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"
                          }`}>
                          {r.status === "active" ? "หยุด" : "เปิด"}
                        </button>
                        <button onClick={() => deleteRule(r._id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/30">ลบ</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : tab === "queue" ? (
          /* ── Tab: คิวรอส่ง ── */
          queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-5xl">📨</span>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีรายการในคิว</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((q) => {
                const qs = QUEUE_STATUS[q.status] || QUEUE_STATUS.pending;
                return (
                  <div key={q._id} className="card p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{q.customerName}</span>
                          <span className={`text-[10px] font-medium ${qs.color}`}>{qs.label}</span>
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          กฎ: {q.ruleName} | ขั้นที่ {q.currentStep + 1}
                          {q.nextSendAt ? ` | ส่งถัดไป: ${new Date(q.nextSendAt).toLocaleString("th-TH")}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── Tab: ผลลัพธ์ ── */
          !closerStats ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-5xl">📊</span>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีข้อมูลสถิติ</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="stat-card text-center">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>กฎทั้งหมด</p>
                  <p className="text-2xl font-bold gradient-text">{closerStats.totalRules}</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>ส่งแล้ว</p>
                  <p className="text-2xl font-bold text-blue-400">{closerStats.totalTriggered}</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>อัตราตอบกลับ</p>
                  <p className="text-2xl font-bold text-emerald-400">{closerStats.replyRate}%</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>อัตราปิดการขาย</p>
                  <p className="text-2xl font-bold text-indigo-400">{closerStats.conversionRate}%</p>
                </div>
              </div>

              {/* Funnel chart */}
              {closerStats.totalTriggered > 0 && (
                <ChartCard title="Funnel — ส่ง → ตอบ → ปิดขาย">
                  <MiniBarChart
                    data={[
                      { name: "ส่งข้อความ", value: closerStats.totalTriggered },
                      { name: "ตอบกลับ", value: closerStats.totalReplied },
                      { name: "ปิดการขาย", value: closerStats.totalConverted },
                    ]}
                    color="#818cf8" height={200} layout="vertical" />
                </ChartCard>
              )}

              {/* Queue status */}
              {Object.keys(closerStats.queueByStatus).length > 0 && (
                <div className="mt-4">
                  <ChartCard title="สถานะคิว">
                    <MiniPieChart
                      data={Object.entries(closerStats.queueByStatus).map(([k, v]) => ({
                        name: QUEUE_STATUS[k]?.label || k, value: v,
                      }))}
                      colors={["#fbbf24", "#60a5fa", "#34d399", "#818cf8", "#9ca3af"]}
                      size={180} />
                  </ChartCard>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
