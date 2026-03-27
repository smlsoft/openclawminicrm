"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import IPhoneChat from "@/components/IPhoneChat";

interface Message {
  _id: string;
  role: "user" | "assistant";
  userName?: string;
  content: string;
  messageType: string;
  imageUrl?: string | null;
  createdAt?: string;
}

interface ScoreData {
  score: number;
  stars: number;
  level: "green" | "yellow" | "red";
  reason: string;
}

interface Group {
  id: string;
  name: string;
  messageCount: number;
  lastMessage: string;
  lastActivity: string | null;
  messages?: Message[];
  sentiment?: ScoreData | null;
  customerSentiment?: ScoreData | null;
  staffSentiment?: ScoreData | null;
  overallSentiment?: ScoreData | null;
  purchaseIntent?: ScoreData | null;
  analysisLogsCount?: number;
  platform?: string;
}

type FilterKey = "sentiment-green" | "sentiment-yellow" | "sentiment-red" | "purchase-green" | "purchase-yellow" | "purchase-red";

interface AlertData {
  _id: string;
  type: string;
  staffName: string;
  customerName: string;
  responseMinutes: number;
  level: "green" | "yellow" | "red";
  message: string;
  read: boolean;
  createdAt: string;
}

export default function Home() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [autoSort, setAutoSort] = useState(true);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set());
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [platformCounts, setPlatformCounts] = useState<Record<string, number>>({});
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [showAlerts, setShowAlerts] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Redirect ถ้ายังไม่ login หรือยังไม่ setup
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/dashboard/login");
    } else if (authStatus === "authenticated" && (session?.user as any)?.setupComplete === false) {
      router.replace("/dashboard/onboarding");
    }
  }, [authStatus, session, router]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchGroups = useCallback(async (pageNum: number, append = false) => {
    try {
      if (append) setLoadingMore(true);
      const pfParam = platformFilter !== "all" ? `&platform=${platformFilter}` : "";
      const res = await fetch(`/dashboard/api/groups?page=${pageNum}&limit=20${pfParam}`);
      const raw = await res.json();
      const data = Array.isArray(raw) ? raw : raw.groups;
      if (!Array.isArray(data)) return;

      const withMessages = data;

      if (append) {
        // เลื่อนดูเพิ่ม — ต่อท้าย
        setGroups((prev) => {
          const existingIds = new Set(prev.map((g) => g.id));
          const newGroups = withMessages.filter((g: Group) => !existingIds.has(g.id));
          return [...prev, ...newGroups];
        });
        setOrder((prev) => {
          const newIds = withMessages.map((g: Group) => g.id).filter((id: string) => !prev.includes(id));
          return [...prev, ...newIds];
        });
      } else {
        // โหลดครั้งแรก / refresh
        if (autoSort) {
          withMessages.sort((a: Group, b: Group) => {
            const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
            const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
            return tb - ta;
          });
          setOrder(withMessages.map((g: Group) => g.id));
        } else if (order.length === 0) {
          setOrder(withMessages.map((g: Group) => g.id));
        }
        setGroups(withMessages);
      }

      setHasMore(raw.pagination?.hasMore ?? false);

      // Store platform counts from API
      if (raw.platformCounts && Array.isArray(raw.platformCounts)) {
        const counts: Record<string, number> = {};
        let total = 0;
        for (const pc of raw.platformCounts) { counts[pc._id] = pc.count; total += pc.count; }
        counts["all"] = total;
        setPlatformCounts(counts);
      }
    } catch {} finally {
      setLoadingMore(false);
    }
  }, [autoSort, order.length, platformFilter]);

  const fetchAll = useCallback(async () => {
    await fetchGroups(0, false);
  }, [fetchGroups]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/dashboard/api/alerts?limit=10");
      const data = await res.json();
      if (data.alerts) setAlerts(data.alerts);
    } catch {}
  }, []);

  useEffect(() => { fetchAll(); fetchAlerts(); }, []);
  // Refetch when platform filter changes
  useEffect(() => { setPage(0); fetchGroups(0, false); }, [platformFilter]);
  useEffect(() => {
    const interval = setInterval(() => { fetchGroups(0, false); fetchAlerts(); }, 10000);
    return () => clearInterval(interval);
  }, [fetchGroups, fetchAlerts]);

  // Infinite scroll — เลื่อนถึงล่างสุดแล้วดึงเพิ่ม
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchGroups(nextPage, true);
  }, [hasMore, loadingMore, page, fetchGroups]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setAutoSort(false);
  };

  // Filter groups
  // Filter: AND logic — ต้องตรงทุกตัวที่เลือก
  const filteredGroups = groups.filter((g) => {
    // Platform filter now handled by API — only sentiment/purchase client-side
    if (filters.size === 0) return true;
    for (const f of filters) {
      if (f.startsWith("sentiment-") && g.sentiment?.level !== f.replace("sentiment-", "")) return false;
      if (f.startsWith("purchase-") && g.purchaseIntent?.level !== f.replace("purchase-", "")) return false;
    }
    return true;
  });

  const sortedGroups = order
    .map((id) => filteredGroups.find((g) => g.id === id))
    .filter(Boolean) as Group[];

  return (
    <div className="min-h-screen theme-bg theme-text">
      {/* Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <img src={zoomImage} alt="Zoomed" className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl" />
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-12 h-12 flex items-center justify-center text-3xl hover:bg-black/80 backdrop-blur"
            onClick={() => setZoomImage(null)}
          >&times;</button>
        </div>
      )}

      {/* Alert Banner — ตอบช้า */}
      {showAlerts && alerts.length > 0 && (
        <div className="bg-red-950/80 border-b border-red-800 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 overflow-x-auto">
              <span className="text-red-400 text-sm font-bold shrink-0">⚠️ ตอบช้า</span>
              <div className="flex gap-2">
                {alerts.filter(a => a.type === "slow_response").slice(0, 5).map((a) => (
                  <span key={a._id} className={`shrink-0 text-[11px] px-2 py-1 rounded-lg border ${a.level === "red" ? "bg-red-900/50 border-red-700 text-red-300" : "bg-amber-900/50 border-amber-700 text-amber-300"}`}>
                    {a.staffName.replace(/^SML\s*-?\s*/i, "")} ตอบช้า {a.responseMinutes} นาที ({a.customerName})
                  </span>
                ))}
              </div>
            </div>
            <button onClick={() => setShowAlerts(false)} className="text-red-400 hover:text-white ml-2 text-xs shrink-0">✕</button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b theme-border px-3 md:px-6 py-3 sticky top-0 theme-bg backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-bold">หน้าหลัก</h1>
            <p className="text-xs theme-text-muted">LINE · Facebook · Instagram</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Filters — Traffic Light with Labels */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFilters(new Set())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filters.size === 0 ? "bg-white text-black" : "theme-bg-card theme-text-secondary hover:theme-bg-hover"}`}
              >ทั้งหมด</button>

              {/* ความพอใจลูกค้า */}
              <div className="flex items-center gap-1 theme-bg-secondary rounded-lg px-2 py-1 border theme-border">
                <span className="text-[10px] theme-text-muted mr-1">ลูกค้า</span>
                {([
                  { color: "green" as const, label: "ปกติ", emoji: "😊" },
                  { color: "yellow" as const, label: "ติดตาม", emoji: "😐" },
                  { color: "red" as const, label: "ไม่พอใจ", emoji: "😤" },
                ]).map(({ color, label, emoji }) => {
                  const key = `sentiment-${color}` as FilterKey;
                  const isActive = filters.has(key);
                  const activeBg = color === "green" ? "bg-emerald-600 text-white" : color === "yellow" ? "bg-amber-500 text-black" : "bg-red-600 text-white";
                  const inactiveBg = color === "green" ? "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/40" : color === "yellow" ? "bg-amber-900/30 text-amber-400 hover:bg-amber-800/40" : "bg-red-900/30 text-red-400 hover:bg-red-800/40";
                  return (
                    <button key={key}
                      onClick={() => setFilters((prev) => {
                        const next = new Set(prev);
                        for (const k of prev) { if (k.startsWith("sentiment-")) next.delete(k); }
                        if (!prev.has(key)) next.add(key);
                        return next;
                      })}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${isActive ? activeBg : inactiveBg}`}
                    >{emoji} {label}</button>
                  );
                })}
              </div>

              {/* โอกาสซื้อ */}
              <div className="flex items-center gap-1 theme-bg-secondary rounded-lg px-2 py-1 border theme-border">
                <span className="text-[10px] theme-text-muted mr-1">ซื้อ</span>
                {([
                  { color: "green" as const, label: "ไม่สนใจ", emoji: "🟢" },
                  { color: "yellow" as const, label: "สนใจ", emoji: "🟡" },
                  { color: "red" as const, label: "ซื้อ!", emoji: "🔴" },
                ]).map(({ color, label, emoji }) => {
                  const key = `purchase-${color}` as FilterKey;
                  const isActive = filters.has(key);
                  const activeBg = color === "green" ? "bg-emerald-600 text-white" : color === "yellow" ? "bg-amber-500 text-black" : "bg-red-600 text-white";
                  const inactiveBg = color === "green" ? "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/40" : color === "yellow" ? "bg-amber-900/30 text-amber-400 hover:bg-amber-800/40" : "bg-red-900/30 text-red-400 hover:bg-red-800/40";
                  return (
                    <button key={key}
                      onClick={() => setFilters((prev) => {
                        const next = new Set(prev);
                        for (const k of prev) { if (k.startsWith("purchase-")) next.delete(k); }
                        if (!prev.has(key)) next.add(key);
                        return next;
                      })}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${isActive ? activeBg : inactiveBg}`}
                    >{emoji} {label}</button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSort}
                onChange={(e) => setAutoSort(e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded"
              />
              <span className="text-xs theme-text-secondary">เรียงอัตโนมัติ</span>
            </label>
            <Link href="/chat" className="px-3 py-1.5 bg-indigo-900/50 hover:bg-indigo-800/50 border border-indigo-700/50 rounded-lg text-xs text-indigo-300 hover:text-white transition">🗨️ แชท</Link>
            <Link href="/crm" className="px-3 py-1.5 bg-cyan-900/50 hover:bg-cyan-800/50 border border-cyan-700/50 rounded-lg text-xs text-cyan-300 hover:text-white transition">👥 CRM</Link>
            <Link href="/tasks" className="px-3 py-1.5 bg-blue-900/50 hover:bg-blue-800/50 border border-blue-700/50 rounded-lg text-xs text-blue-300 hover:text-white transition">📋 งาน</Link>
            <Link href="/kpi" className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/50 border border-purple-700/50 rounded-lg text-xs text-purple-300 hover:text-white transition">📊 KPI</Link>
            <Link href="/templates" className="px-3 py-1.5 bg-amber-900/50 hover:bg-amber-800/50 border border-amber-700/50 rounded-lg text-xs text-amber-300 hover:text-white transition">⚡ เทมเพลต</Link>
            <Link href="/advice" className="px-3 py-1.5 bg-orange-900/50 hover:bg-orange-800/50 border border-orange-700/50 rounded-lg text-xs text-orange-300 hover:text-white transition">🦐 น้องกุ้ง</Link>
            <Link href="/costs" className="px-3 py-1.5 bg-emerald-900/50 hover:bg-emerald-800/50 border border-emerald-700/50 rounded-lg text-xs text-emerald-300 hover:text-white transition">💰 ค่าใช้จ่าย AI</Link>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-green-400">{groups.length} ห้อง &middot; สด</span>
            </div>
          </div>
        </div>
      </header>

      {/* Platform Filter Tabs */}
      <div className="border-b theme-border px-3 md:px-6 py-2 flex items-center gap-2">
        <span className="text-[11px] theme-text-muted mr-1 shrink-0">ช่องทาง:</span>
        {([
          { value: "all", label: "ทั้งหมด", badgeClass: "theme-bg-card theme-text-secondary hover:theme-bg-hover", activeClass: "bg-white text-black" },
          { value: "line", label: "LINE", badgeClass: "bg-green-900/40 text-green-400 hover:bg-green-800/50 border border-green-800/50", activeClass: "bg-green-600 text-white border border-green-500" },
          { value: "facebook", label: "Facebook", badgeClass: "bg-blue-900/40 text-blue-400 hover:bg-blue-800/50 border border-blue-800/50", activeClass: "bg-blue-600 text-white border border-blue-500" },
          { value: "instagram", label: "Instagram", badgeClass: "bg-pink-900/40 text-pink-400 hover:bg-pink-800/50 border border-pink-800/50", activeClass: "bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-pink-500" },
        ]).map(({ value, label, badgeClass, activeClass }) => {
          const isActive = platformFilter === value;
          // Count per platform (from API, not client-side)
          const count = platformCounts[value] || 0;
          return (
            <button
              key={value}
              onClick={() => setPlatformFilter(value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${isActive ? activeClass : badgeClass}`}
            >
              {label}
              <span className={`text-[10px] px-1 rounded-full ${isActive ? "bg-white/20" : "theme-bg-card"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* iPhone Grid */}
      <main className="p-3 md:p-6 pb-24 md:pb-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-4 justify-center">
              {sortedGroups.map((group) => (
                <SortableIPhone key={group.id} group={group} onZoom={(url) => setZoomImage(url)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center py-6">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 theme-bg-card border theme-border rounded-xl text-sm theme-text-secondary hover:theme-bg-hover transition disabled:opacity-50"
            >
              {loadingMore ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  กำลังโหลด...
                </span>
              ) : (
                "โหลดเพิ่ม"
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function SortableIPhone({ group, onZoom }: { group: Group; onZoom: (url: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as any,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <IPhoneChat group={group} onZoom={onZoom} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}
