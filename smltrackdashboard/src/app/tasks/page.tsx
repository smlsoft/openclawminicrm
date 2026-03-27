"use client";

import { useEffect, useState, useCallback } from "react";

interface Task {
  _id: string;
  customerId: string;
  customerName: string;
  title: string;
  notes: string;
  dueDate: string | null;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assignee: string;
  createdAt: string;
  completedAt: string | null;
}

const PRIORITY_CONFIG = {
  high:   { label: "ด่วน",   color: "bg-red-500/20 text-red-400 border-red-500/30",    dot: "bg-red-500" },
  medium: { label: "ปกติ",   color: "bg-amber-500/20 text-amber-400 border-amber-500/30", dot: "bg-amber-500" },
  low:    { label: "ต่ำ",    color: "bg-green-500/20 text-green-400 border-green-500/30", dot: "bg-green-500" },
};

const STATUS_CONFIG = {
  pending:     { label: "รอดำเนินการ", color: "bg-gray-700 text-gray-300" },
  in_progress: { label: "กำลังทำ",    color: "bg-blue-600/30 text-blue-300" },
  completed:   { label: "เสร็จแล้ว",  color: "bg-emerald-600/30 text-emerald-300" },
  cancelled:   { label: "ยกเลิก",     color: "bg-gray-700/50 text-gray-500" },
};

type FilterTab = "all" | "today" | "overdue" | "completed";

function isToday(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isOverdue(dateStr: string | null, status: string) {
  if (!dateStr || status === "completed" || status === "cancelled") return false;
  return new Date(dateStr) < new Date();
}

function formatDueDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  const base = d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  if (diffDays === 0) return `วันนี้`;
  if (diffDays === 1) return `พรุ่งนี้`;
  if (diffDays === -1) return `เมื่อวาน`;
  if (diffDays < 0) return `${base} (เลย ${Math.abs(diffDays)} วัน)`;
  return `${base} (อีก ${diffDays} วัน)`;
}

const EMPTY_FORM = {
  customerName: "", title: "", notes: "", dueDate: "", priority: "medium" as const,
  assignee: "", customerId: "",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const r = await fetch("/dashboard/api/tasks");
      const d = await r.json();
      if (Array.isArray(d)) setTasks(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filtered = tasks.filter((t) => {
    if (tab === "today") return isToday(t.dueDate) && t.status !== "completed" && t.status !== "cancelled";
    if (tab === "overdue") return isOverdue(t.dueDate, t.status);
    if (tab === "completed") return t.status === "completed";
    return true;
  });

  const counts = {
    all: tasks.length,
    today: tasks.filter((t) => isToday(t.dueDate) && t.status !== "completed" && t.status !== "cancelled").length,
    overdue: tasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await fetch("/dashboard/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      await fetchTasks();
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
    } catch {}
    setSaving(false);
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    await fetch(`/dashboard/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTasks((prev) => prev.map((t) => t._id === id ? { ...t, status: status as Task["status"] } : t));
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/dashboard/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t._id !== id));
    setDeletingId(null);
    if (expandedId === id) setExpandedId(null);
  };

  if (loading) return (
    <div className="min-h-screen theme-bg flex items-center justify-center">
      <div className="theme-text-muted animate-pulse">กำลังโหลดงาน...</div>
    </div>
  );

  return (
    <div className="min-h-screen theme-bg theme-text">
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border theme-border p-6 space-y-4" style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">➕ สร้างงานใหม่</h2>
              <button onClick={() => { setShowModal(false); setForm({ ...EMPTY_FORM }); }} className="theme-text-muted hover:theme-text text-xl">&times;</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] theme-text-muted mb-1">ชื่องาน *</label>
                <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="ติดตามใบเสนอราคา..."
                  className="w-full px-3 py-2 rounded-lg theme-bg-secondary border theme-border text-sm theme-text" />
              </div>
              <div>
                <label className="block text-[11px] theme-text-muted mb-1">ชื่อลูกค้า</label>
                <input type="text" value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                  placeholder="สมชาย..."
                  className="w-full px-3 py-2 rounded-lg theme-bg-secondary border theme-border text-sm theme-text" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] theme-text-muted mb-1">ความสำคัญ</label>
                  <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-lg theme-bg-secondary border theme-border text-sm theme-text">
                    <option value="high">🔴 ด่วน</option>
                    <option value="medium">🟡 ปกติ</option>
                    <option value="low">🟢 ต่ำ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] theme-text-muted mb-1">กำหนดส่ง</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg theme-bg-secondary border theme-border text-sm theme-text" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] theme-text-muted mb-1">ผู้รับผิดชอบ</label>
                <input type="text" value={form.assignee} onChange={(e) => setForm((p) => ({ ...p, assignee: e.target.value }))}
                  placeholder="พนักงาน A..."
                  className="w-full px-3 py-2 rounded-lg theme-bg-secondary border theme-border text-sm theme-text" />
              </div>
              <div>
                <label className="block text-[11px] theme-text-muted mb-1">หมายเหตุ</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  className="w-full px-3 py-2 rounded-lg theme-bg-secondary border theme-border text-sm theme-text resize-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowModal(false); setForm({ ...EMPTY_FORM }); }}
                className="flex-1 px-4 py-2 rounded-lg border theme-border text-sm theme-text-muted hover:theme-text transition">
                ยกเลิก
              </button>
              <button onClick={handleCreate} disabled={saving || !form.title.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition">
                {saving ? "กำลังบันทึก..." : "💾 สร้างงาน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b theme-border px-3 md:px-6 py-4 sticky top-0 z-10" style={{ background: "var(--bg-primary)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">📋 งานและติดตาม</h1>
            <p className="text-xs theme-text-muted">จัดการงาน &middot; {tasks.length} งาน</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition">
              ➕ สร้างงาน
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-3 md:p-6 pb-24 md:pb-6 space-y-6">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: "all",       label: `ทั้งหมด (${counts.all})` },
            { key: "today",     label: `วันนี้ (${counts.today})` },
            { key: "overdue",   label: `เลยกำหนด (${counts.overdue})` },
            { key: "completed", label: `เสร็จแล้ว (${counts.completed})` },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === key ? "bg-white text-black" : "theme-bg-card border theme-border theme-text-secondary hover:opacity-80"
              } ${key === "overdue" && counts.overdue > 0 ? "!border-red-500/50 !text-red-400" : ""}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Task List */}
        {filtered.length === 0 ? (
          <div className="text-center theme-text-muted py-16 rounded-xl border theme-border theme-bg-card">
            {tasks.length === 0 ? (
              <div className="space-y-2">
                <p className="text-2xl">📋</p>
                <p>ยังไม่มีงาน</p>
                <button onClick={() => setShowModal(true)} className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
                  ➕ สร้างงานแรก
                </button>
              </div>
            ) : "ไม่มีงานในหมวดนี้"}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((task) => {
              const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
              const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
              const overdue = isOverdue(task.dueDate, task.status);
              const isExpanded = expandedId === task._id;
              const isCompleted = task.status === "completed";
              const isCancelled = task.status === "cancelled";

              return (
                <div key={task._id}
                  className={`rounded-xl border transition ${
                    overdue ? "border-red-500/40 bg-red-950/20" :
                    isCompleted ? "theme-border opacity-60" :
                    "theme-border"
                  }`}
                  style={{ background: overdue ? undefined : "var(--bg-card)" }}>

                  {/* Card Header */}
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : task._id)}>

                    {/* Priority dot */}
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${priority.dot}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className={`font-medium text-sm ${isCompleted || isCancelled ? "line-through theme-text-muted" : ""}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${priority.color}`}>
                            {priority.label}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {task.customerName && (
                          <span className="text-[11px] theme-text-muted">👤 {task.customerName}</span>
                        )}
                        {task.dueDate && (
                          <span className={`text-[11px] ${overdue ? "text-red-400 font-medium" : "theme-text-muted"}`}>
                            📅 {formatDueDate(task.dueDate)}
                          </span>
                        )}
                        {task.assignee && (
                          <span className="text-[11px] theme-text-muted">👔 {task.assignee}</span>
                        )}
                      </div>
                    </div>

                    <span className={`theme-text-muted text-xs mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t theme-border space-y-4 pt-3">
                      {task.notes && (
                        <p className="text-sm theme-text-secondary leading-relaxed whitespace-pre-wrap">{task.notes}</p>
                      )}

                      {/* Status Actions */}
                      <div>
                        <p className="text-[11px] theme-text-muted mb-2">เปลี่ยนสถานะ:</p>
                        <div className="flex flex-wrap gap-2">
                          {(["pending", "in_progress", "completed", "cancelled"] as const).map((s) => {
                            const cfg = STATUS_CONFIG[s];
                            return (
                              <button key={s}
                                onClick={() => handleStatusUpdate(task._id, s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                                  task.status === s
                                    ? `${cfg.color} border-current ring-1 ring-current`
                                    : "theme-bg theme-border theme-text-muted hover:theme-border"
                                }`}>
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-[10px] theme-text-muted">
                          สร้าง {new Date(task.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                          {task.completedAt && ` · เสร็จ ${new Date(task.completedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`}
                        </p>
                        <button
                          onClick={() => handleDelete(task._id)}
                          disabled={deletingId === task._id}
                          className="text-[11px] text-red-400 hover:text-red-300 transition disabled:opacity-50">
                          {deletingId === task._id ? "กำลังลบ..." : "🗑️ ลบ"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
