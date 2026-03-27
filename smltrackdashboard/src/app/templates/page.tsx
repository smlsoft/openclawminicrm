"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Template {
  _id: string;
  title: string;
  content: string;
  category: string;
  usageCount: number;
  createdAt: string;
}

const CATEGORIES = [
  { value: "greeting",  label: "ทักทาย",        color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "pricing",   label: "ราคา",           color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { value: "followup",  label: "ติดตาม",         color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "closing",   label: "ปิดการขาย",      color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { value: "custom",    label: "กำหนดเอง",       color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/20" },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

const EMPTY_FORM = { title: "", content: "", category: "greeting" };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState("all");

  const fetchTemplates = useCallback(async () => {
    try {
      const r = await fetch("/dashboard/api/templates");
      const d = await r.json();
      if (Array.isArray(d)) setTemplates(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      await fetch("/dashboard/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      await fetchTemplates();
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/dashboard/api/templates?id=${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t._id !== id));
    } catch {}
    setDeletingId(null);
  };

  const handleCopy = async (t: Template) => {
    try {
      await navigator.clipboard.writeText(t.content);
      setCopiedId(t._id);
      fetch("/dashboard/api/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t._id }),
      }).catch(() => {});
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  const filtered = catFilter === "all" ? templates : templates.filter((t) => t.category === catFilter);

  if (loading) return (
    <div className="min-h-screen theme-bg flex items-center justify-center">
      <div className="theme-text-muted animate-pulse">กำลังโหลดข้อความสำเร็จรูป...</div>
    </div>
  );

  return (
    <div className="min-h-screen theme-bg theme-text">
      {/* Add Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border theme-border p-6 space-y-4" style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">⚡ เพิ่มข้อความสำเร็จรูปใหม่</h2>
              <button onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }} className="theme-text-muted hover:theme-text text-xl">&times;</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] theme-text-muted mb-1">ชื่อข้อความสำเร็จรูป *</label>
                <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="ทักทายลูกค้าใหม่"
                  className="w-full px-3 py-2 rounded-lg theme-bg-secondary border theme-border text-sm theme-text" />
              </div>
              <div>
                <label className="block text-[11px] theme-text-muted mb-1">หมวดหมู่</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button key={c.value} onClick={() => setForm((p) => ({ ...p, category: c.value }))}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${form.category === c.value ? `${c.bg} ${c.color}` : "theme-border theme-text-muted hover:theme-border"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] theme-text-muted mb-1">ข้อความ *</label>
                <textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={5}
                  placeholder="สวัสดีค่ะ ขอบคุณที่สนใจสินค้าของเรา มีอะไรให้ช่วยเหลือคะ?"
                  className="w-full px-3 py-2 rounded-lg theme-bg-secondary border theme-border text-sm theme-text resize-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }}
                className="flex-1 px-4 py-2 rounded-lg border theme-border text-sm theme-text-muted hover:theme-text transition">
                ยกเลิก
              </button>
              <button onClick={handleCreate} disabled={saving || !form.title.trim() || !form.content.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition">
                {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b theme-border px-3 md:px-6 py-4 sticky top-0 z-10" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="theme-text-muted hover:theme-text text-xl">&larr;</Link>
            <div>
              <h1 className="text-xl font-bold">⚡ ข้อความสำเร็จรูป</h1>
              <p className="text-xs theme-text-muted">ข้อความสำเร็จรูป &middot; {templates.length} รายการ</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition">
            ➕ เพิ่มข้อความสำเร็จรูป
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-3 md:p-6 pb-24 md:pb-6 space-y-6">
        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setCatFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${catFilter === "all" ? "bg-white text-black" : "theme-bg-card border theme-border theme-text-secondary hover:opacity-80"}`}>
            ทั้งหมด ({templates.length})
          </button>
          {CATEGORIES.map((c) => {
            const count = templates.filter((t) => t.category === c.value).length;
            return (
              <button key={c.value} onClick={() => setCatFilter(catFilter === c.value ? "all" : c.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${catFilter === c.value ? `${c.bg} ${c.color}` : "theme-bg-card theme-border theme-text-secondary hover:opacity-80"}`}>
                {c.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Template Grid */}
        {filtered.length === 0 ? (
          <div className="text-center theme-text-muted py-16 rounded-xl border theme-border theme-bg-card">
            <div className="space-y-2">
              <p className="text-2xl">⚡</p>
              <p>{templates.length === 0 ? "ยังไม่มีข้อความสำเร็จรูป" : "ไม่มีข้อความสำเร็จรูปในหมวดนี้"}</p>
              {templates.length === 0 && (
                <button onClick={() => setShowForm(true)} className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
                  ➕ เพิ่มข้อความสำเร็จรูปแรก
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((t) => {
              const catCfg = CATEGORY_MAP[t.category] || CATEGORY_MAP.custom;
              return (
                <div key={t._id} className="rounded-xl border theme-border p-4 space-y-3" style={{ background: "var(--bg-card)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{t.title}</p>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border mt-1 font-medium ${catCfg.bg} ${catCfg.color}`}>
                        {catCfg.label}
                      </span>
                    </div>
                    {t.usageCount > 0 && (
                      <span className="text-[10px] theme-text-muted shrink-0">ใช้ {t.usageCount}x</span>
                    )}
                  </div>

                  <p className="text-sm theme-text-secondary leading-relaxed whitespace-pre-wrap">{t.content}</p>

                  <div className="flex items-center gap-2 pt-1 border-t theme-border">
                    <button onClick={() => handleCopy(t)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${copiedId === t._id ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30" : "theme-bg border theme-border theme-text-secondary hover:opacity-80"}`}>
                      {copiedId === t._id ? "✓ คัดลอกแล้ว" : "📋 คัดลอก"}
                    </button>
                    <button onClick={() => handleDelete(t._id)} disabled={deletingId === t._id}
                      className="px-3 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 transition disabled:opacity-50">
                      {deletingId === t._id ? "ลบ..." : "🗑️"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Usage tip */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
          <p className="text-amber-400 font-medium mb-1">💡 วิธีใช้งาน</p>
          <p className="text-xs theme-text-muted leading-relaxed">
            กด <span className="text-amber-300 font-medium">⚡ Quick Reply</span> ที่ด้านล่างของแต่ละการ์ดแชทบนแดชบอร์ด
            เพื่อเลือกข้อความสำเร็จรูป แล้วคัดลอกไปวางในช่องแชท LINE / Facebook / Instagram
          </p>
        </div>
      </main>
    </div>
  );
}
