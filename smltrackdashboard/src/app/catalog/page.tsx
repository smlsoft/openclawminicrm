"use client";

import { useState, useEffect, useCallback } from "react";

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  price: number;
  unit: string;
  images: string[];
  status: "active" | "inactive";
  stock: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  byCategory: Record<string, number>;
}

const CATEGORIES = [
  { value: "สินค้า", icon: "📦" },
  { value: "บริการ", icon: "🔧" },
  { value: "อุปกรณ์", icon: "🛠️" },
  { value: "วัสดุ", icon: "🧱" },
  { value: "อะไหล่", icon: "⚙️" },
  { value: "อื่นๆ", icon: "📋" },
];

const UNITS = ["ชิ้น", "ต้น", "งาน", "เมตร", "ตร.ม.", "ชุด", "กล่อง", "ถุง", "กก.", "ลิตร", "คัน", "หลัง", "ห้อง", "รายการ"];

function formatTHB(v: number) {
  return `฿${v.toLocaleString("th-TH")}`;
}

const initForm = {
  name: "", sku: "", category: "สินค้า", description: "", price: "", unit: "ชิ้น",
  status: "active" as "active" | "inactive", stock: "", tags: "",
};

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (catFilter) params.set("category", catFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const q = params.size ? `?${params}` : "";
      const [pRes, sRes] = await Promise.all([
        fetch(`/dashboard/api/products${q}`),
        fetch("/dashboard/api/products/stats"),
      ]);
      const pData = await pRes.json();
      const sData = await sRes.json();
      setProducts(pData.products || []);
      setStats(sData);
    } catch {}
    setLoading(false);
  }, [catFilter, statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditId(null); setForm(initForm); setShowForm(true); };
  const openEdit = (p: Product) => {
    setEditId(p._id);
    setForm({
      name: p.name, sku: p.sku, category: p.category, description: p.description,
      price: String(p.price), unit: p.unit, status: p.status,
      stock: p.stock !== null ? String(p.stock) : "", tags: p.tags.join(", "),
    });
    setShowForm(true);
  };

  const saveProduct = async () => {
    setSaving(true);
    const payload = {
      ...form, price: parseFloat(form.price) || 0,
      stock: form.stock !== "" ? parseInt(form.stock) : null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (editId) {
      await fetch(`/dashboard/api/products/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/dashboard/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setSaving(false); setShowForm(false); fetchData();
  };

  const toggleStatus = async (p: Product) => {
    const newStatus = p.status === "active" ? "inactive" : "active";
    await fetch(`/dashboard/api/products/${p._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    fetchData();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("ลบสินค้านี้?")) return;
    await fetch(`/dashboard/api/products/${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div className="page-container">
      {/* Modal สร้าง/แก้ไขสินค้า */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-5 animate-scale-in"
            style={{ background: "var(--bg-elevated)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              {editId ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>ชื่อสินค้า/บริการ *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น เสาเข็มเจาะ 30 ซม."
                  className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>รหัสสินค้า (SKU)</label>
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>หมวดหมู่</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.value}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>รายละเอียด</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="คำอธิบายสินค้า..."
                  className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>ราคา (บาท)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>หน่วย</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>สต็อก</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="ไม่จำกัด"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>แท็ก (คั่นด้วยคอมม่า)</label>
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="เสาเข็ม, 30ซม, ฐานราก"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>ยกเลิก</button>
              <button onClick={saveProduct} disabled={saving || !form.name}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium gradient-bg text-white transition hover:opacity-90 disabled:opacity-50">
                {saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "เพิ่มสินค้า"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>สินค้าและบริการ</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>จัดการแค็ตตาล็อกสินค้า ราคา สต็อก</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 rounded-xl text-sm font-medium gradient-bg text-white hover:opacity-90">
            + เพิ่มสินค้า
          </button>
        </div>
      </header>

      <div className="page-content">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="stat-card text-center">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>ทั้งหมด</p>
              <p className="text-2xl font-bold gradient-text">{stats.total}</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>พร้อมขาย</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>หยุดขาย</p>
              <p className="text-2xl font-bold text-amber-400">{stats.inactive}</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>หมวดหมู่</p>
              <p className="text-2xl font-bold text-cyan-400">{Object.keys(stats.byCategory).length}</p>
            </div>
          </div>
        )}

        {/* ค้นหา */}
        <div className="mb-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาสินค้า ชื่อ SKU แท็ก..."
            className="w-full px-4 py-2.5 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
        </div>

        {/* Filter: หมวดหมู่ */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <button onClick={() => setCatFilter("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${!catFilter ? "gradient-bg text-white border-transparent" : ""}`}
            style={catFilter ? { borderColor: "var(--border)", color: "var(--text-secondary)" } : {}}>ทั้งหมด</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCatFilter(catFilter === c.value ? "" : c.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${catFilter === c.value ? "gradient-bg text-white border-transparent" : ""}`}
              style={catFilter !== c.value ? { borderColor: "var(--border)", color: "var(--text-secondary)" } : {}}>
              {c.icon} {c.value}
              {stats?.byCategory[c.value] ? ` (${stats.byCategory[c.value]})` : ""}
            </button>
          ))}
        </div>

        {/* Filter: สถานะ */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { value: "", label: "ทุกสถานะ" },
            { value: "active", label: "พร้อมขาย" },
            { value: "inactive", label: "หยุดขาย" },
          ].map((s) => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${statusFilter === s.value ? "gradient-bg text-white border-transparent" : ""}`}
              style={statusFilter !== s.value ? { borderColor: "var(--border)", color: "var(--text-secondary)" } : {}}>{s.label}</button>
          ))}
        </div>

        {/* รายการสินค้า */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">🏪</span>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีสินค้า เพิ่มสินค้าแรกเลย!</p>
            <button onClick={openCreate} className="px-4 py-2 rounded-xl text-sm font-medium gradient-bg text-white hover:opacity-90">
              + เพิ่มสินค้า
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p) => (
              <div key={p._id} className="card overflow-hidden">
                <div className="p-4">
                  {/* ชื่อ + สถานะ */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{p.name}</h3>
                      {p.sku && <p className="text-xs" style={{ color: "var(--text-muted)" }}>SKU: {p.sku}</p>}
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium border ${
                      p.status === "active"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/20"
                    }`}>
                      {p.status === "active" ? "พร้อมขาย" : "หยุดขาย"}
                    </span>
                  </div>

                  {/* หมวดหมู่ */}
                  <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                    {CATEGORIES.find((c) => c.value === p.category)?.icon} {p.category}
                  </p>

                  {/* ราคา */}
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-xl font-bold gradient-text">{formatTHB(p.price)}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>/{p.unit}</span>
                  </div>

                  {/* สต็อก */}
                  {p.stock !== null && (
                    <p className="text-xs mb-2" style={{ color: p.stock <= 5 ? "rgb(248,113,113)" : "var(--text-secondary)" }}>
                      คงเหลือ: {p.stock} {p.unit} {p.stock <= 5 ? "⚠️ ใกล้หมด" : ""}
                    </p>
                  )}

                  {/* คำอธิบาย */}
                  {p.description && (
                    <p className="text-xs line-clamp-2 mb-2" style={{ color: "var(--text-muted)" }}>{p.description}</p>
                  )}

                  {/* แท็ก */}
                  {p.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      {p.tags.slice(0, 4).map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>{t}</span>
                      ))}
                    </div>
                  )}

                  {/* ปุ่มกระทำ */}
                  <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                    <button onClick={() => openEdit(p)} className="flex-1 py-1.5 rounded-lg text-xs font-medium transition"
                      style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>แก้ไข</button>
                    <button onClick={() => toggleStatus(p)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                        p.status === "active" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"
                      }`}>
                      {p.status === "active" ? "หยุดขาย" : "เปิดขาย"}
                    </button>
                    <button onClick={() => deleteProduct(p._id)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition text-red-400 hover:bg-red-950/30">
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
