"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface KBItem {
  _id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "product", label: "สินค้า", icon: "📦", color: "bg-blue-900/40 text-blue-400" },
  { value: "promotion", label: "โปรโมชั่น", icon: "🏷️", color: "bg-pink-900/40 text-pink-400" },
  { value: "policy", label: "นโยบาย", icon: "📋", color: "bg-amber-900/40 text-amber-400" },
  { value: "faq", label: "คำถามบ่อย", icon: "❓", color: "bg-purple-900/40 text-purple-400" },
  { value: "shipping", label: "จัดส่ง", icon: "🚚", color: "bg-green-900/40 text-green-400" },
  { value: "payment", label: "ชำระเงิน", icon: "💳", color: "bg-cyan-900/40 text-cyan-400" },
  { value: "general", label: "ทั่วไป", icon: "📝", color: "bg-gray-700/40 text-gray-400" },
];

function getCategoryConfig(cat: string) {
  return CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];
}

export default function KMPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formTags, setFormTags] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/dashboard/login");
  }, [authStatus, router]);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/dashboard/api/km");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Filter + search
  const filtered = items.filter(item => {
    if (filter !== "all" && item.category !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q) || item.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const activeCount = items.filter(i => i.active).length;

  // Save (create or update)
  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await fetch(`/dashboard/api/km/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle, content: formContent, category: formCategory, tags: formTags }),
        });
      } else {
        await fetch("/dashboard/api/km", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle, content: formContent, category: formCategory, tags: formTags }),
        });
      }
      resetForm();
      fetchItems();
    } catch {}
    setSaving(false);
  };

  // Toggle active
  const handleToggle = async (id: string, current: boolean) => {
    await fetch(`/dashboard/api/km/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    fetchItems();
  };

  // Delete
  const handleDelete = async (id: string) => {
    await fetch(`/dashboard/api/km/${id}`, { method: "DELETE" });
    setDeleteId(null);
    fetchItems();
  };

  // Edit
  const startEdit = (item: KBItem) => {
    setEditId(item._id);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormCategory(item.category);
    setFormTags(item.tags.join(", "));
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormTitle("");
    setFormContent("");
    setFormCategory("general");
    setFormTags("");
  };

  return (
    <div className="min-h-screen theme-bg theme-text">
      {/* Header */}
      <header className="border-b theme-border px-3 md:px-6 py-3 sticky top-0 theme-bg z-10" style={{ background: "var(--bg-primary)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-base font-bold flex items-center gap-2">
              📚 ฐานความรู้
              <span className="text-xs font-normal theme-text-muted">ฐานความรู้สำหรับ AI</span>
            </h1>
            <p className="text-xs theme-text-muted mt-0.5">
              {items.length} รายการ · {activeCount} เปิดใช้งาน · AI จะดึงข้อมูลนี้ไปตอบลูกค้า + แนะนำ admin
            </p>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition font-medium"
            >
              + เพิ่มความรู้
            </button>
          </div>
        </div>
      </header>

      <div className="p-3 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto">
        {/* Filter + Search */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <input
            type="text"
            placeholder="🔍 ค้นหาความรู้..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="theme-input border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs transition ${filter === "all" ? "bg-white text-black" : "theme-bg-card theme-text-secondary hover:theme-bg-hover"}`}
            >ทั้งหมด ({items.length})</button>
            {CATEGORIES.map(cat => {
              const count = items.filter(i => i.category === cat.value).length;
              if (count === 0 && filter !== cat.value) return null;
              return (
                <button
                  key={cat.value}
                  onClick={() => setFilter(cat.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition flex items-center gap-1 ${
                    filter === cat.value ? cat.color + " ring-1 ring-white/20" : "theme-bg-card theme-text-secondary hover:theme-bg-hover"
                  }`}
                >
                  {cat.icon} {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="mb-6 theme-bg-secondary border theme-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold theme-text">{editId ? "✏️ แก้ไขความรู้" : "📝 เพิ่มความรู้ใหม่"}</h2>
              <button onClick={resetForm} className="theme-text-muted hover:theme-text text-sm">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs theme-text-secondary block mb-1">ชื่อเรื่อง *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="เช่น ราคาเครื่องกรองน้ำรุ่น A"
                  className="w-full theme-input border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs theme-text-secondary block mb-1">หมวดหมู่</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full theme-input border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs theme-text-secondary block mb-1">แท็ก (คั่นด้วย ,)</label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={e => setFormTags(e.target.value)}
                    placeholder="ราคา, รุ่นA, กรองน้ำ"
                    className="w-full theme-input border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs theme-text-secondary block mb-1">เนื้อหา * (ยิ่งละเอียด AI ตอบยิ่งแม่น)</label>
              <textarea
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                rows={6}
                placeholder={"เช่น:\nเครื่องกรองน้ำรุ่น A ราคา 12,900 บาท\n- กรอง 4 ขั้นตอน\n- รับประกัน 2 ปี\n- ส่งฟรีทั่วประเทศ\n- ผ่อน 0% 10 เดือน"}
                className="w-full theme-input border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-y"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !formTitle.trim() || !formContent.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition font-medium"
              >
                {saving ? "กำลังบันทึก..." : editId ? "💾 บันทึก" : "✅ เพิ่มความรู้"}
              </button>
              <button onClick={resetForm} className="px-4 py-2 theme-bg-card theme-text-secondary text-sm rounded-lg hover:theme-bg-hover transition">
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* KB List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">📚</span>
            <p className="theme-text-muted text-sm">
              {items.length === 0 ? "ยังไม่มีความรู้ — กด \"+ เพิ่มความรู้\" เพื่อเริ่มต้น" : "ไม่พบความรู้ที่ค้นหา"}
            </p>
            <p className="theme-text-muted text-xs max-w-md text-center">
              เพิ่มข้อมูลสินค้า ราคา โปรโมชั่น เงื่อนไข คำถามบ่อย ฯลฯ
              แล้ว AI จะดึงไปใช้ตอบลูกค้าอัตโนมัติ + แนะนำคำตอบให้ admin
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const catCfg = getCategoryConfig(item.category);
              return (
                <div
                  key={item._id}
                  className={`theme-bg-secondary border theme-border rounded-xl p-4 transition ${
                    !item.active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Left: content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-bold theme-text">{item.title}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${catCfg.color}`}>
                          {catCfg.icon} {catCfg.label}
                        </span>
                        {!item.active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-400">ปิดใช้งาน</span>
                        )}
                      </div>
                      <p className="text-xs theme-text-secondary whitespace-pre-wrap line-clamp-3 leading-relaxed mb-2">
                        {item.content}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.tags.map(tag => (
                          <span key={tag} className="text-[10px] theme-bg-card px-1.5 py-0.5 rounded theme-text-muted">
                            #{tag}
                          </span>
                        ))}
                        <span className="text-[10px] theme-text-muted ml-auto">
                          {new Date(item.updatedAt || item.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => handleToggle(item._id, item.active)}
                        className={`px-3 py-1.5 text-[11px] rounded-lg transition font-medium ${
                          item.active
                            ? "bg-green-900/40 text-green-400 hover:bg-green-800/50"
                            : "bg-gray-700/40 text-gray-400 hover:bg-gray-600/50"
                        }`}
                      >
                        {item.active ? "🟢 เปิด" : "⚫ ปิด"}
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="px-3 py-1.5 text-[11px] rounded-lg theme-bg-card theme-text-secondary hover:theme-bg-hover transition"
                      >
                        ✏️ แก้ไข
                      </button>
                      <button
                        onClick={() => setDeleteId(item._id)}
                        className="px-3 py-1.5 text-[11px] rounded-lg bg-red-950/30 text-red-400 hover:bg-red-900/40 transition"
                      >
                        🗑️ ลบ
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="theme-bg-secondary border theme-border rounded-xl p-6 max-w-sm mx-4">
            <h3 className="text-sm font-bold theme-text mb-2">🗑️ ยืนยันการลบ</h3>
            <p className="text-xs theme-text-muted mb-4">ลบความรู้นี้จะลบออกจากทั้ง MongoDB และ Qdrant ไม่สามารถกู้คืนได้</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 theme-bg-card text-sm rounded-lg hover:theme-bg-hover transition">ยกเลิก</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition">ลบเลย</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
