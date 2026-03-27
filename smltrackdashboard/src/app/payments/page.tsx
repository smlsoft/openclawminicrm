"use client";

import { useEffect, useState, useCallback } from "react";
import { MiniPieChart } from "@/components/charts";
import { ChartCard } from "@/components/charts/ChartCard";

interface Payment {
  _id: string;
  sourceId: string;
  platform: string;
  customerName: string;
  roomName: string;
  amount: number | null;
  detectionMethod: string;
  keywords: string[];
  slipImageUrl: string | null;
  status: "pending" | "confirmed" | "rejected";
  confirmedBy: string | null;
  confirmedAt: string | null;
  rejectedBy: string | null;
  rejectedReason: string | null;
  notes: string;
  createdAt: string;
}

interface Stats {
  pending: number;
  confirmed: number;
  rejected: number;
  todayCount: number;
  todayAmount: number;
  monthCount: number;
  monthAmount: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "รอตรวจสอบ", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/20" },
  confirmed: { label: "ยืนยันแล้ว", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
  rejected: { label: "ปฏิเสธ", color: "text-red-400", bg: "bg-red-500/15 border-red-500/20" },
};

const PLATFORM_BADGE: Record<string, { label: string; color: string }> = {
  line: { label: "LINE", color: "bg-green-600" },
  facebook: { label: "FB", color: "bg-blue-600" },
  instagram: { label: "IG", color: "bg-pink-600" },
};

function formatTHB(v: number) {
  return `฿${v.toLocaleString("th-TH")}`;
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "เมื่อกี้";
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชม.ที่แล้ว`;
  const day = Math.floor(hr / 24);
  return `${day} วันที่แล้ว`;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"" | "pending" | "confirmed" | "rejected">("");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const statusParam = tab ? `?status=${tab}` : "";
      const [pRes, sRes] = await Promise.all([
        fetch(`/dashboard/api/payments${statusParam}`),
        fetch("/dashboard/api/payments/stats"),
      ]);
      const pData = await pRes.json();
      const sData = await sRes.json();
      setPayments(pData.payments || []);
      setStats(sData);
    } catch {}
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const iv = setInterval(fetchData, 10000); return () => clearInterval(iv); }, [fetchData]);

  const updateStatus = async (id: string, status: "confirmed" | "rejected", reason?: string) => {
    setUpdating(id);
    await fetch(`/dashboard/api/payments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectedReason: reason }),
    });
    setUpdating(null);
    fetchData();
  };

  const deletePayment = async (id: string) => {
    if (!confirm("ลบรายการนี้?")) return;
    await fetch(`/dashboard/api/payments/${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div className="page-container">
      {/* Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center cursor-zoom-out" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} alt="Slip" className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" />
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-2xl" onClick={() => setZoomImage(null)}>&times;</button>
        </div>
      )}

      {/* Header */}
      <header className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>💸 เงินเข้า</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>ติดตามการชำระเงินจากลูกค้า — ตรวจสลิป ยืนยัน/ปฏิเสธ</p>
          </div>
        </div>
      </header>

      <div className="page-content">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="stat-card">
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>รอตรวจสอบ</p>
              <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>ยืนยันแล้ว</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.confirmed}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>วันนี้</p>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{formatTHB(stats.todayAmount)}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{stats.todayCount} รายการ</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>เดือนนี้</p>
              <p className="text-lg font-bold gradient-text">{formatTHB(stats.monthAmount)}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{stats.monthCount} รายการ</p>
            </div>
          </div>
        )}

        {/* Status Donut Chart */}
        {stats && (stats.pending + stats.confirmed + stats.rejected) > 0 && (
          <div className="mb-5">
            <ChartCard title="📊 สถานะการชำระเงิน">
              <MiniPieChart
                data={[
                  { name: "รอตรวจ", value: stats.pending },
                  { name: "ยืนยัน", value: stats.confirmed },
                  { name: "ปฏิเสธ", value: stats.rejected },
                ]}
                colors={["#fbbf24", "#34d399", "#f87171"]}
                size={160}
              />
            </ChartCard>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {([
            { value: "", label: "ทั้งหมด" },
            { value: "pending", label: "🟡 รอตรวจสอบ" },
            { value: "confirmed", label: "🟢 ยืนยันแล้ว" },
            { value: "rejected", label: "🔴 ปฏิเสธ" },
          ] as const).map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                tab === t.value
                  ? "gradient-bg text-white border-transparent"
                  : "border-[var(--border)] hover:bg-[var(--bg-hover)]"
              }`}
              style={tab !== t.value ? { color: "var(--text-secondary)" } : {}}
            >
              {t.label}
              {t.value === "pending" && stats?.pending ? ` (${stats.pending})` : ""}
            </button>
          ))}
        </div>

        {/* Payment List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">💸</span>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>ไม่พบรายการชำระเงิน</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map(p => {
              const sc = STATUS_CONFIG[p.status];
              const pb = PLATFORM_BADGE[p.platform] || PLATFORM_BADGE.line;
              return (
                <div key={p._id} className={`card p-4 ${p.status === "pending" ? "ring-1 ring-amber-500/20" : ""}`}>
                  <div className="flex gap-3">
                    {/* Slip Image */}
                    {p.slipImageUrl && (
                      <div
                        className="w-16 h-20 md:w-20 md:h-24 rounded-lg overflow-hidden shrink-0 cursor-zoom-in border"
                        style={{ borderColor: "var(--border)" }}
                        onClick={() => setZoomImage(p.slipImageUrl!)}
                      >
                        <img src={p.slipImageUrl} alt="slip" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                          {p.customerName}
                        </span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded text-white ${pb.color}`}>{pb.label}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                        {p.detectionMethod && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>
                            {p.detectionMethod === "keyword+image" ? "คำ+รูป" : p.detectionMethod === "image" ? "รูปสลิป" : "คำสั่งซื้อ"}
                          </span>
                        )}
                      </div>

                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {p.roomName}
                      </p>

                      {p.amount != null && p.amount > 0 && (
                        <p className="text-lg font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                          {formatTHB(p.amount)}
                        </p>
                      )}

                      <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                        {timeAgo(p.createdAt)}
                        {p.confirmedBy && ` · ยืนยันโดย ${p.confirmedBy}`}
                        {p.rejectedBy && ` · ปฏิเสธโดย ${p.rejectedBy}`}
                        {p.rejectedReason && ` (${p.rejectedReason})`}
                      </p>

                      {p.notes && (
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>📝 {p.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    {p.status === "pending" && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => updateStatus(p._id, "confirmed")}
                          disabled={updating === p._id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                        >
                          ✓ ยืนยัน
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt("เหตุผลที่ปฏิเสธ:");
                            if (reason !== null) updateStatus(p._id, "rejected", reason);
                          }}
                          disabled={updating === p._id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg transition"
                          style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                        >
                          ✕ ปฏิเสธ
                        </button>
                        <button
                          onClick={() => deletePayment(p._id)}
                          className="px-3 py-1.5 text-[10px] rounded-lg text-red-400 hover:bg-red-950/30 transition"
                        >
                          ลบ
                        </button>
                      </div>
                    )}
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
