"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ───
interface Appointment {
  _id: string;
  title: string;
  description: string;
  customerName: string;
  phone: string;
  staffName: string;
  staffNames: string[];
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: string;
  location: string;
  status: string;
  priority: string;
  notes: string;
  reminder: boolean;
  reminderMinutes: number;
}

interface Stats {
  today: number;
  thisWeek: number;
  upcoming: number;
  overdue: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

// ─── Config ───
const TYPES: Record<string, { label: string; icon: string; color: string }> = {
  site_visit: { label: "เยี่ยมหน้างาน", icon: "🏗️", color: "bg-amber-500" },
  consultation: { label: "ให้คำปรึกษา", icon: "💬", color: "bg-blue-500" },
  delivery: { label: "ส่งสินค้า", icon: "🚛", color: "bg-emerald-500" },
  installation: { label: "ติดตั้ง", icon: "🔧", color: "bg-purple-500" },
  meeting: { label: "ประชุม", icon: "🤝", color: "bg-indigo-500" },
  follow_up: { label: "ติดตามงาน", icon: "📞", color: "bg-cyan-500" },
  other: { label: "อื่นๆ", icon: "📋", color: "bg-gray-500" },
};

const STATUSES: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "นัดแล้ว", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/20" },
  confirmed: { label: "ยืนยัน", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
  in_progress: { label: "กำลังดำเนินการ", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/20" },
  completed: { label: "เสร็จแล้ว", color: "text-gray-400", bg: "bg-gray-500/15 border-gray-500/20" },
  cancelled: { label: "ยกเลิก", color: "text-red-400", bg: "bg-red-500/15 border-red-500/20" },
  no_show: { label: "ไม่มา", color: "text-red-400", bg: "bg-red-500/15 border-red-500/20" },
};

const PRIORITIES: Record<string, { label: string; dot: string }> = {
  high: { label: "ด่วน", dot: "bg-red-500" },
  medium: { label: "ปกติ", dot: "bg-amber-500" },
  low: { label: "ต่ำ", dot: "bg-gray-400" },
};

function formatDate(d: string) {
  const date = new Date(d);
  const days = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  return `${days[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}

function formatDateFull(d: string) {
  return new Date(d).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function isToday(d: string) {
  const date = new Date(d);
  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function isPast(d: string) {
  return new Date(d) < new Date(new Date().toDateString());
}

// ─── Page ───
export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "", customerName: "", phone: "", staffName: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00", endTime: "10:00", duration: 60,
    type: "consultation", location: "", priority: "medium",
    notes: "", reminder: true, reminderMinutes: 60,
  });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      const q = params.toString();
      const res = await fetch(`/dashboard/api/appointments${q ? `?${q}` : ""}`);
      const data = await res.json();
      setAppointments(data.appointments || []);
      setStats(data.stats || null);
    } catch {}
    setLoading(false);
  }, [typeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createAppointment = async () => {
    setSaving(true);
    await fetch("/dashboard/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ ...form, title: "", customerName: "", phone: "", notes: "", location: "" });
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/dashboard/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm("ลบนัดหมายนี้?")) return;
    await fetch(`/dashboard/api/appointments/${id}`, { method: "DELETE" });
    fetchData();
  };

  // Group by date for calendar view
  const groupedByDate: Record<string, Appointment[]> = {};
  for (const apt of appointments) {
    const dateKey = new Date(apt.date).toISOString().split("T")[0];
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(apt);
  }

  return (
    <div className="page-container">
      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-5 animate-scale-in"
            style={{ background: "var(--bg-elevated)" }} onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>📅 สร้างนัดหมายใหม่</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>หัวข้อ *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="เช่น นัดดูหน้างาน, ส่งสินค้า..."
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>ลูกค้า</label>
                  <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}
                    placeholder="ชื่อลูกค้า"
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>เบอร์โทร</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="08x-xxx-xxxx"
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>ผู้รับผิดชอบ</label>
                  <input value={form.staffName} onChange={e => setForm({ ...form, staffName: e.target.value })}
                    placeholder="ชื่อพนักงาน"
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>ประเภท</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>วันที่ *</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>เวลาเริ่ม</label>
                  <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>เวลาสิ้นสุด</label>
                  <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>สถานที่</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="ที่อยู่ / สถานที่นัด"
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>ความสำคัญ</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    <option value="high">🔴 ด่วน</option>
                    <option value="medium">🟡 ปกติ</option>
                    <option value="low">🟢 ต่ำ</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>หมายเหตุ</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                  <input type="checkbox" checked={form.reminder} onChange={e => setForm({ ...form, reminder: e.target.checked })} />
                  แจ้งเตือนก่อนนัด
                </label>
                {form.reminder && (
                  <select value={form.reminderMinutes} onChange={e => setForm({ ...form, reminderMinutes: parseInt(e.target.value) })}
                    className="px-2 py-1 rounded-lg border text-xs" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    <option value={30}>30 นาที</option>
                    <option value={60}>1 ชม.</option>
                    <option value={120}>2 ชม.</option>
                    <option value={1440}>1 วัน</option>
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>ยกเลิก</button>
              <button onClick={createAppointment} disabled={saving || !form.title || !form.date}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium gradient-bg text-white transition hover:opacity-90 disabled:opacity-50">
                {saving ? "กำลังบันทึก..." : "📅 สร้างนัดหมาย"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>📅 นัดหมาย</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>ปฏิทินนัดหมาย — เยี่ยมหน้างาน, ส่งสินค้า, ประชุม, ติดตั้ง</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium gradient-bg text-white hover:opacity-90 transition">
            + สร้างนัดหมาย
          </button>
        </div>
      </header>

      <div className="page-content">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="stat-card">
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>วันนี้</p>
              <p className="text-2xl font-bold text-indigo-400">{stats.today}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>สัปดาห์นี้</p>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats.thisWeek}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>รอดำเนินการ</p>
              <p className="text-2xl font-bold text-amber-400">{stats.upcoming}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>เลยกำหนด</p>
              <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
            </div>
          </div>
        )}

        {/* View toggle + Filters */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs font-medium transition ${view === "list" ? "gradient-bg text-white" : ""}`}
              style={view !== "list" ? { color: "var(--text-secondary)" } : {}}>📋 รายการ</button>
            <button onClick={() => setView("calendar")}
              className={`px-3 py-1.5 text-xs font-medium transition ${view === "calendar" ? "gradient-bg text-white" : ""}`}
              style={view !== "calendar" ? { color: "var(--text-secondary)" } : {}}>📅 ปฏิทิน</button>
          </div>

          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            <option value="">ทุกประเภท</option>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            <option value="">ทุกสถานะ</option>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">📅</span>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>ไม่มีนัดหมาย</p>
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-xl text-sm gradient-bg text-white">+ สร้างนัดหมายแรก</button>
          </div>
        ) : view === "calendar" ? (
          /* ── Calendar View ── */
          <div className="space-y-4">
            {Object.entries(groupedByDate).map(([dateKey, apts]) => (
              <div key={dateKey}>
                <div className={`flex items-center gap-2 mb-2 px-1 ${isToday(dateKey) ? "text-indigo-400" : ""}`}
                  style={!isToday(dateKey) ? { color: isPast(dateKey) ? "var(--text-muted)" : "var(--text-secondary)" } : {}}>
                  <span className={`text-xs font-bold ${isToday(dateKey) ? "px-2 py-0.5 rounded-lg gradient-bg text-white" : ""}`}>
                    {isToday(dateKey) ? "วันนี้" : formatDate(dateKey)}
                  </span>
                  <span className="text-[10px]">{formatDateFull(dateKey)}</span>
                  <span className="text-[10px] px-1.5 rounded-full" style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>{apts.length}</span>
                </div>
                <div className="space-y-2 ml-4 border-l-2 pl-4" style={{ borderColor: isToday(dateKey) ? "var(--primary)" : "var(--border)" }}>
                  {apts.map(apt => <AppointmentCard key={apt._id} apt={apt} onStatus={updateStatus} onDelete={deleteAppointment} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── List View ── */
          <div className="space-y-2">
            {appointments.map(apt => <AppointmentCard key={apt._id} apt={apt} onStatus={updateStatus} onDelete={deleteAppointment} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Appointment Card ───
function AppointmentCard({ apt, onStatus, onDelete }: {
  apt: Appointment;
  onStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const type = TYPES[apt.type] || TYPES.other;
  const status = STATUSES[apt.status] || STATUSES.scheduled;
  const priority = PRIORITIES[apt.priority] || PRIORITIES.medium;
  const past = isPast(apt.date) && !["completed", "cancelled"].includes(apt.status);

  return (
    <div className={`card p-3 md:p-4 ${past ? "ring-1 ring-red-500/20" : ""}`}>
      <div className="flex gap-3">
        {/* Time + Type icon */}
        <div className="shrink-0 text-center w-14">
          <div className={`w-10 h-10 mx-auto rounded-xl ${type.color} flex items-center justify-center text-lg text-white`}>
            {type.icon}
          </div>
          <p className="text-[10px] font-bold mt-1" style={{ color: "var(--text-primary)" }}>{apt.startTime}</p>
          <p className="text-[8px]" style={{ color: "var(--text-muted)" }}>{apt.endTime}</p>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`w-2 h-2 rounded-full ${priority.dot}`} />
            <span className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{apt.title}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${status.bg} ${status.color}`}>{status.label}</span>
            {past && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">เลยกำหนด!</span>}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
            {apt.customerName && <span>👤 {apt.customerName}</span>}
            {apt.phone && <span>📱 {apt.phone}</span>}
            {apt.staffName && <span>👔 {apt.staffName}</span>}
            {apt.location && <span>📍 {apt.location}</span>}
            <span>{type.label}</span>
            {apt.reminder && <span>🔔 {apt.reminderMinutes < 60 ? `${apt.reminderMinutes}น.` : `${apt.reminderMinutes / 60}ชม.`}</span>}
          </div>

          {apt.notes && <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>📝 {apt.notes}</p>}

          {/* Actions */}
          {!["completed", "cancelled"].includes(apt.status) && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {apt.status === "scheduled" && (
                <button onClick={() => onStatus(apt._id, "confirmed")}
                  className="px-2.5 py-1 text-[10px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition">✓ ยืนยัน</button>
              )}
              {(apt.status === "confirmed" || apt.status === "scheduled") && (
                <button onClick={() => onStatus(apt._id, "in_progress")}
                  className="px-2.5 py-1 text-[10px] rounded-lg font-medium transition"
                  style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>▶ เริ่มงาน</button>
              )}
              {apt.status === "in_progress" && (
                <button onClick={() => onStatus(apt._id, "completed")}
                  className="px-2.5 py-1 text-[10px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition">✓ เสร็จแล้ว</button>
              )}
              <button onClick={() => onStatus(apt._id, "cancelled")}
                className="px-2.5 py-1 text-[10px] rounded-lg text-red-400 hover:bg-red-950/30 font-medium transition">✕ ยกเลิก</button>
              <button onClick={() => onStatus(apt._id, "no_show")}
                className="px-2.5 py-1 text-[10px] rounded-lg font-medium transition"
                style={{ color: "var(--text-muted)" }}>👻 ไม่มา</button>
              <button onClick={() => onDelete(apt._id)}
                className="px-2.5 py-1 text-[10px] rounded-lg text-red-400 hover:bg-red-950/30 transition">🗑️</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
