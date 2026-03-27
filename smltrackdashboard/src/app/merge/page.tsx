"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Customer {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  rooms?: string[];
  platformIds?: { line?: string | string[]; facebook?: string | string[]; instagram?: string | string[] };
  totalMessages?: number;
  avatarUrl?: string;
  updatedAt?: string;
  pipelineStage?: string;
}

interface DuplicateGroup {
  primary: Customer;
  duplicates: { customer: Customer; reasons: string[] }[];
}

function hasIds(val: string | string[] | undefined): boolean {
  if (!val) return false;
  if (Array.isArray(val)) return val.filter(Boolean).length > 0;
  return !!val;
}

function platformBadges(c: Customer) {
  const pids = c.platformIds || {};
  const rooms = c.rooms || [];
  const badges = [];
  if (hasIds(pids.line) || rooms.some(r => !r.startsWith("fb_") && !r.startsWith("ig_")))
    badges.push({ label: "LINE", color: "bg-green-600" });
  if (hasIds(pids.facebook) || rooms.some(r => r.startsWith("fb_")))
    badges.push({ label: "FB", color: "bg-blue-600" });
  if (hasIds(pids.instagram) || rooms.some(r => r.startsWith("ig_")))
    badges.push({ label: "IG", color: "bg-pink-600" });
  return badges;
}

function CustomerCard({ c, size = "normal" }: { c: Customer; size?: "normal" | "small" }) {
  const badges = platformBadges(c);
  const displayName = c.firstName ? `${c.firstName} ${c.lastName || ""}`.trim() : c.name;
  const isSmall = size === "small";

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`${isSmall ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"} rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white shrink-0`}>
        {displayName.substring(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`${isSmall ? "text-xs" : "text-sm"} font-semibold theme-text truncate`}>{displayName}</span>
          {badges.map(b => (
            <span key={b.label} className={`text-[8px] font-bold px-1 py-0.5 rounded ${b.color} text-white`}>{b.label}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px] theme-text-muted mt-0.5">
          {c.phone && <span>📱 {c.phone}</span>}
          {c.email && <span>📧 {c.email}</span>}
          <span>💬 {c.totalMessages || 0}</span>
          <span>🏠 {(c.rooms || []).length} ห้อง</span>
        </div>
      </div>
    </div>
  );
}

export default function MergePage() {
  const { status: authStatus } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [singlePlatform, setSinglePlatform] = useState(0);
  const [merging, setMerging] = useState<string | null>(null);
  const [mergedCount, setMergedCount] = useState(0);

  // Manual merge
  const [showManual, setShowManual] = useState(false);
  const [manualSearchA, setManualSearchA] = useState("");
  const [manualSearchB, setManualSearchB] = useState("");
  const [resultsA, setResultsA] = useState<Customer[]>([]);
  const [resultsB, setResultsB] = useState<Customer[]>([]);
  const [selectedA, setSelectedA] = useState<Customer | null>(null);
  const [selectedB, setSelectedB] = useState<Customer | null>(null);
  const [searchedA, setSearchedA] = useState(false);
  const [searchedB, setSearchedB] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/dashboard/login");
  }, [authStatus, router]);

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/dashboard/api/customers/duplicates");
      const data = await res.json();
      setGroups(data.groups || []);
      setTotalCustomers(data.totalCustomers || 0);
      setSinglePlatform(data.singlePlatform || 0);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchDuplicates(); }, [fetchDuplicates]);

  // Manual search
  const searchCustomers = async (q: string, side: "A" | "B") => {
    if (side === "A") { setManualSearchA(q); setSearchedA(false); } else { setManualSearchB(q); setSearchedB(false); }
    if (q.length < 2) { side === "A" ? setResultsA([]) : setResultsB([]); return; }
    try {
      const res = await fetch(`/dashboard/api/customers?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const exclude = side === "A" ? selectedB?._id : selectedA?._id;
      const filtered = (data || []).filter((c: Customer) => c._id !== exclude).slice(0, 8);
      side === "A" ? setResultsA(filtered) : setResultsB(filtered);
      side === "A" ? setSearchedA(true) : setSearchedB(true);
    } catch {}
  };

  const handleManualMerge = async (primaryId: string, secondaryId: string) => {
    setMerging(secondaryId);
    try {
      const res = await fetch("/dashboard/api/customers/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId, secondaryId }),
      });
      if (res.ok) {
        setMergedCount(prev => prev + 1);
        setSelectedA(null);
        setSelectedB(null);
        setManualSearchA("");
        setManualSearchB("");
        setResultsA([]);
        setResultsB([]);
        fetchDuplicates();
      }
    } catch {}
    setMerging(null);
  };

  // Merge
  const handleMerge = async (primaryId: string, secondaryId: string) => {
    setMerging(secondaryId);
    try {
      const res = await fetch("/dashboard/api/customers/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId, secondaryId }),
      });
      if (res.ok) {
        setMergedCount(prev => prev + 1);
        fetchDuplicates(); // รีเฟรช
      }
    } catch {}
    setMerging(null);
  };

  // Dismiss group (ซ่อนจากรายการ — ไม่ merge)
  const dismissGroup = (primaryId: string) => {
    setGroups(prev => prev.filter(g => g.primary._id !== primaryId));
  };

  return (
    <div className="min-h-screen theme-bg theme-text">
      {/* Header */}
      <header className="border-b theme-border px-3 md:px-6 py-3 sticky top-0 theme-bg z-10" style={{ background: "var(--bg-primary)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-base font-bold flex items-center gap-2">
              🔀 รวมลูกค้า
              <span className="text-xs font-normal theme-text-muted">ค้นหาและรวมลูกค้าที่ซ้ำข้าม platform</span>
            </h1>
            <p className="text-xs theme-text-muted mt-0.5">
              ลูกค้าทั้งหมด {totalCustomers} คน · พบซ้ำ {groups.length} กลุ่ม · รวมแล้ว {mergedCount} คู่
              {singlePlatform > 0 && ` · ใช้แค่ 1 platform ${singlePlatform} คน`}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setShowManual(v => !v)}
              className={`px-4 py-2 text-sm rounded-lg transition font-medium ${
                showManual ? "bg-amber-600 text-white" : "bg-amber-900/40 text-amber-400 border border-amber-700/30 hover:bg-amber-800/40"
              }`}
            >
              ✋ รวมเอง
            </button>
            <button
              onClick={fetchDuplicates}
              disabled={loading}
              className="px-4 py-2 theme-bg-card border theme-border text-sm rounded-lg hover:theme-bg-hover transition disabled:opacity-50"
            >
              🔄 สแกนใหม่
            </button>
          </div>
        </div>
      </header>

      <div className="p-3 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto">
        {/* How it works */}
        <div className="mb-4 p-3 bg-indigo-950/30 border border-indigo-800/30 rounded-xl text-xs theme-text-muted space-y-1">
          <p className="font-medium text-indigo-400">ระบบค้นหาลูกค้าซ้ำอัตโนมัติ:</p>
          <p>• <strong className="theme-text">ชื่อเหมือนกัน</strong> — ชื่อตรงกัน 100% (เช่น LINE ชื่อ "สมชาย" + FB ชื่อ "สมชาย")</p>
          <p>• <strong className="theme-text">เบอร์โทร/Email เดียวกัน</strong> — ข้อมูลติดต่อตรงกัน</p>
          <p>• <strong className="theme-text">ชื่อคล้ายกัน</strong> — 4 ตัวอักษรแรกเหมือนกัน (เช่น "สมชาย" กับ "สมชายดี")</p>
          <p className="text-amber-400 mt-1">⚠️ ตรวจสอบให้ดีก่อนกด "รวม" — รวมแล้วย้อนกลับไม่ได้ ประวัติสนทนาจะรวมเป็นลูกค้าเดียว</p>
          <p className="text-cyan-400">💡 ระบบหาไม่เจอ? กดปุ่ม <strong>"✋ รวมเอง"</strong> ด้านบน เลือกลูกค้า 2 คนมารวมได้เลย</p>
        </div>

        {/* ── Manual Merge ── */}
        {showManual && (
          <div className="mb-6 theme-bg-secondary border-2 border-amber-700/40 rounded-xl p-4">
            <h2 className="text-sm font-bold text-amber-400 mb-3">✋ รวมลูกค้าแบบ Manual — เลือก 2 คนมารวม</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ── ลูกค้า A (ตัวหลัก) ── */}
              <div>
                <label className="text-[11px] font-bold text-indigo-400 block mb-1">ลูกค้าตัวหลัก (เก็บไว้)</label>
                <input
                  type="text"
                  value={manualSearchA}
                  onChange={(e) => searchCustomers(e.target.value, "A")}
                  placeholder="🔍 พิมพ์ชื่อ / เบอร์ / email..."
                  className="w-full theme-input border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 mb-1"
                />
                {/* Selected */}
                {selectedA && (
                  <div className="p-2 bg-indigo-950/40 border border-indigo-700/30 rounded-lg mb-1 flex items-center gap-2">
                    <div className="flex-1 min-w-0"><CustomerCard c={selectedA} size="small" /></div>
                    <button onClick={() => { setSelectedA(null); setManualSearchA(""); }} className="text-red-400 text-xs shrink-0">✕</button>
                  </div>
                )}
                {/* Results */}
                {!selectedA && resultsA.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-0.5 theme-bg-card rounded-lg border theme-border">
                    {resultsA.map(c => (
                      <button
                        key={c._id}
                        onClick={() => { setSelectedA(c); setResultsA([]); setSearchedA(false); }}
                        className="w-full text-left p-2 hover:theme-bg-hover transition"
                      >
                        <CustomerCard c={c} size="small" />
                      </button>
                    ))}
                  </div>
                )}
                {!selectedA && searchedA && resultsA.length === 0 && manualSearchA.length >= 2 && (
                  <p className="text-[11px] text-red-400 px-2 py-2 theme-bg-card rounded-lg border border-red-800/30">
                    ไม่พบลูกค้าที่ชื่อ "{manualSearchA}" — ลองค้นหาด้วยชื่อ เบอร์โทร หรือ email
                  </p>
                )}
              </div>

              {/* ── ลูกค้า B (จะลบ) ── */}
              <div>
                <label className="text-[11px] font-bold text-red-400 block mb-1">ลูกค้าที่จะรวมเข้า (จะถูกลบ)</label>
                <input
                  type="text"
                  value={manualSearchB}
                  onChange={(e) => searchCustomers(e.target.value, "B")}
                  placeholder="🔍 พิมพ์ชื่อ / เบอร์ / email..."
                  className="w-full theme-input border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 mb-1"
                />
                {selectedB && (
                  <div className="p-2 bg-red-950/30 border border-red-700/30 rounded-lg mb-1 flex items-center gap-2">
                    <div className="flex-1 min-w-0"><CustomerCard c={selectedB} size="small" /></div>
                    <button onClick={() => { setSelectedB(null); setManualSearchB(""); }} className="text-red-400 text-xs shrink-0">✕</button>
                  </div>
                )}
                {!selectedB && resultsB.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-0.5 theme-bg-card rounded-lg border theme-border">
                    {resultsB.map(c => (
                      <button
                        key={c._id}
                        onClick={() => { setSelectedB(c); setResultsB([]); setSearchedB(false); }}
                        className="w-full text-left p-2 hover:theme-bg-hover transition"
                      >
                        <CustomerCard c={c} size="small" />
                      </button>
                    ))}
                  </div>
                )}
                {!selectedB && searchedB && resultsB.length === 0 && manualSearchB.length >= 2 && (
                  <p className="text-[11px] text-red-400 px-2 py-2 theme-bg-card rounded-lg border border-red-800/30">
                    ไม่พบลูกค้าที่ชื่อ "{manualSearchB}" — ลองค้นหาด้วยชื่อ เบอร์โทร หรือ email
                  </p>
                )}
              </div>
            </div>

            {/* Merge preview + button */}
            {selectedA && selectedB && (
              <div className="mt-4 p-3 bg-amber-950/30 border border-amber-700/30 rounded-lg">
                <p className="text-xs theme-text mb-2">
                  <strong className="text-indigo-400">{selectedA.firstName || selectedA.name}</strong>
                  {" ← รวมข้อมูลจาก ← "}
                  <strong className="text-red-400">{selectedB.firstName || selectedB.name}</strong>
                  <span className="text-red-400"> (จะถูกลบ)</span>
                </p>
                <div className="text-[10px] theme-text-muted mb-3 space-y-0.5">
                  <p>✓ rooms (ห้องสนทนา) จะรวมกัน — ประวัติแชทไม่หาย</p>
                  <p>✓ platformIds (LINE/FB/IG) จะรวมกัน</p>
                  <p>✓ tags, notes, totalMessages จะรวมกัน</p>
                  <p>✓ ข้อมูลที่ตัวหลักไม่มี จะดึงจากตัวที่ลบ (เบอร์, email, ที่อยู่)</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (confirm(`รวม "${selectedB.firstName || selectedB.name}" เข้ากับ "${selectedA.firstName || selectedA.name}"?\n\n"${selectedB.firstName || selectedB.name}" จะถูกลบ ย้อนกลับไม่ได้`)) {
                        handleManualMerge(selectedA._id, selectedB._id);
                      }
                    }}
                    disabled={!!merging}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition font-medium"
                  >
                    {merging ? "กำลังรวม..." : "🔀 ยืนยันรวมลูกค้า"}
                  </button>
                  <button
                    onClick={() => { setSelectedA(null); setSelectedB(null); setManualSearchA(""); setManualSearchB(""); }}
                    className="px-4 py-2 theme-bg-card text-sm rounded-lg hover:theme-bg-hover transition"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
            </div>
            <span className="text-sm theme-text-muted ml-3">กำลังสแกนหาลูกค้าซ้ำ...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">✅</span>
            <p className="text-sm theme-text">ไม่พบลูกค้าซ้ำ!</p>
            <p className="text-xs theme-text-muted">ลูกค้าทั้งหมด {totalCustomers} คน ไม่มีข้อมูลที่ตรงกัน</p>
            {singlePlatform > 0 && (
              <p className="text-xs theme-text-muted">
                💡 มีลูกค้า {singlePlatform} คนที่ใช้แค่ 1 platform — อาจมี account อื่นที่ยังไม่ได้รวม
                สามารถไปรวมเองได้ที่หน้า CRM → ข้อมูลลูกค้า → กด "🔀 รวมลูกค้า"
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.primary._id} className="theme-bg-secondary border theme-border rounded-xl overflow-hidden">
                {/* Group header */}
                <div className="px-4 py-2 border-b theme-border flex items-center justify-between bg-amber-950/20">
                  <span className="text-xs font-bold text-amber-400">
                    🔀 อาจเป็นคนเดียวกัน ({1 + group.duplicates.length} records)
                  </span>
                  <button
                    onClick={() => dismissGroup(group.primary._id)}
                    className="text-[10px] theme-text-muted hover:theme-text"
                  >ข้าม ✕</button>
                </div>

                {/* Primary customer */}
                <div className="px-4 py-3 border-b theme-border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-400">ตัวหลัก</span>
                  </div>
                  <CustomerCard c={group.primary} />
                </div>

                {/* Duplicates */}
                {group.duplicates.map((dup) => (
                  <div key={dup.customer._id} className="px-4 py-3 border-b theme-border last:border-b-0 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400">ซ้ำ</span>
                        {dup.reasons.map((r, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">{r}</span>
                        ))}
                      </div>
                      <CustomerCard c={dup.customer} size="small" />
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => handleMerge(group.primary._id, dup.customer._id)}
                        disabled={merging === dup.customer._id}
                        className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white rounded-lg transition font-medium"
                      >
                        {merging === dup.customer._id ? "กำลังรวม..." : "🔀 รวม → ตัวหลัก"}
                      </button>
                      <button
                        onClick={() => handleMerge(dup.customer._id, group.primary._id)}
                        disabled={merging === group.primary._id}
                        className="px-3 py-1.5 text-xs theme-bg-card theme-text-secondary rounded-lg hover:theme-bg-hover transition"
                      >
                        🔀 รวม → ตัวนี้
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
