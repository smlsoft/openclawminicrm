"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/ThemeProvider";
import { useNotificationContext } from "@/components/NotificationProvider";
import { useScrollHidden } from "@/components/ScrollHideProvider";

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

interface NavGroup {
  groupLabel?: string;
  items: NavItem[];
}

// Bottom tab bar items (mobile — 5 items max)
const BOTTOM_TABS: NavItem[] = [
  { href: "/", icon: "📊", label: "หน้าหลัก" },
  { href: "/chat", icon: "💬", label: "แชท" },
  { href: "/crm", icon: "👥", label: "ลูกค้า" },
  { href: "/catalog", icon: "🏪", label: "สินค้า" },
];

// Full navigation groups — จัดเป็นหมวดงาน
const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: "น้องกุ้ง",
    items: [
      { href: "/kung-room", icon: "🦐", label: "ห้องทำงานน้องกุ้ง" },
    ],
  },
  {
    groupLabel: "ภาพรวม",
    items: [
      { href: "/", icon: "📊", label: "แดชบอร์ด" },
      { href: "/revenue", icon: "💰", label: "รายได้" },
      { href: "/analytics", icon: "📈", label: "วิเคราะห์" },
    ],
  },
  {
    groupLabel: "สื่อสาร",
    items: [
      { href: "/chat", icon: "💬", label: "แชท" },
      { href: "/inbox", icon: "📥", label: "กล่องข้อความ" },
      { href: "/broadcast", icon: "📢", label: "ส่งข้อความ" },
      { href: "/templates", icon: "📝", label: "แม่แบบข้อความ" },
    ],
  },
  {
    groupLabel: "ลูกค้า",
    items: [
      { href: "/crm", icon: "👥", label: "CRM" },
      { href: "/scorecard", icon: "🏆", label: "คะแนนลูกค้า" },
      { href: "/merge", icon: "🔀", label: "รวมลูกค้า" },
      { href: "/auto-closer", icon: "🤝", label: "ติดตามปิดการขาย" },
    ],
  },
  {
    groupLabel: "ขายของ",
    items: [
      { href: "/catalog", icon: "🏪", label: "สินค้า/บริการ" },
      { href: "/payments", icon: "💸", label: "เงินเข้า" },
      { href: "/documents", icon: "📑", label: "เอกสาร" },
      { href: "/appointments", icon: "📅", label: "นัดหมาย" },
    ],
  },
  {
    groupLabel: "รายงาน",
    items: [
      { href: "/kpi", icon: "📈", label: "KPI พนักงาน" },
      { href: "/costs", icon: "💰", label: "ค่าใช้จ่าย AI" },
      { href: "/advice", icon: "🦐", label: "น้องกุ้ง" },
    ],
  },
  {
    groupLabel: "ตั้งค่า",
    items: [
      { href: "/connections", icon: "🔗", label: "ช่องทาง" },
      { href: "/bot-config", icon: "🤖", label: "บอท" },
      { href: "/km", icon: "📚", label: "คลังความรู้" },
      { href: "/team", icon: "👔", label: "ทีมงาน" },
      { href: "/tasks", icon: "📋", label: "งาน" },
      { href: "/settings", icon: "⚙️", label: "ตั้งค่า" },
    ],
  },
  {
    groupLabel: "ช่วยเหลือ",
    items: [
      { href: "/guide", icon: "📖", label: "คู่มือ" },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/* ──────────────────────────────────────────
   Desktop Sidebar Nav Link
   ────────────────────────────────────────── */
function SidebarNavLink({ href, icon, label, onClick, badge }: NavItem & { onClick?: () => void; badge?: number }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 py-1.5 px-3 rounded-lg text-[12px] transition-all duration-150 ${
        active
          ? "bg-gradient-to-r from-indigo-600/20 to-cyan-600/10 text-indigo-400 font-semibold shadow-sm"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      <span className="text-base leading-none w-5 text-center">{icon}</span>
      <span className="truncate">{label}</span>
      {badge && badge > 0 ? (
        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] text-center animate-pulse">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : active ? (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
      ) : null}
    </Link>
  );
}

/* ──────────────────────────────────────────
   User Section
   ────────────────────────────────────────── */
function UserSection({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === "loading") {
    return <div className="w-full h-10 rounded-xl animate-pulse" style={{ background: "var(--bg-hover)" }} />;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="w-full px-4 py-2.5 gradient-bg text-white text-sm rounded-xl transition font-medium text-center hover:opacity-90"
      >
        เข้าสู่ระบบ
      </button>
    );
  }

  const user = session.user;
  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "??";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition"
        style={{ background: open ? "var(--bg-hover)" : "transparent" }}
      >
        {user?.image ? (
          <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20 shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
        )}
        {!compact && (
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{user?.name || user?.email}</p>
            <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
          </div>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border overflow-hidden z-50 animate-scale-in"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{user?.name || "ผู้ใช้"}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{user?.email}</p>
              <span className="inline-block mt-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-medium gradient-bg text-white">
                {(user as any)?.plan === "pro" ? "Pro" : "Free"}
              </span>
            </div>
            <Link href="/settings" onClick={() => setOpen(false)}
              className="block w-full text-left px-4 py-2.5 text-sm transition hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-secondary)" }}>
              ⚙️ ตั้งค่า
            </Link>
            <button
              onClick={() => { setOpen(false); signOut({ callbackUrl: "/login" }); }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 transition"
            >
              ออกจากระบบ
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   Rebuild Button
   ────────────────────────────────────────── */
function RebuildButton() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleRebuild = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setLogs(["เริ่มโหลดข้อมูลใหม่..."]);
    try {
      const res = await fetch("/dashboard/api/rebuild", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        const r = data.results;
        setLogs([
          `ห้องแชท: ${r.groups_meta}`,
          `ลูกค้า: ${r.customers}`,
          `วิเคราะห์: ${r.chat_analytics}`,
          `ทักษะ: ${r.user_skills}`,
          `${r.time_ms}มิลลิวิ — โหลดหน้าใหม่...`,
        ]);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setLogs([`ผิดพลาด: ${data.error}`]);
      }
    } catch {
      setLogs(["ผิดพลาด"]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return (
    <div>
      <button
        onClick={handleRebuild}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl transition disabled:opacity-50"
        style={{
          background: "rgba(245,158,11,0.1)",
          color: "rgb(245,158,11)",
          border: "1px solid rgba(245,158,11,0.15)",
        }}
      >
        {loading ? (
          <>
            <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            กำลังโหลด...
          </>
        ) : (
          "🔄 โหลดข้อมูลใหม่"
        )}
      </button>
      {logs.length > 0 && (
        <div className="mt-1.5 px-2.5 py-2 rounded-lg text-[10px] font-mono space-y-0.5 max-h-32 overflow-y-auto"
          style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}>
          {logs.map((l, i) => <p key={i}>{l}</p>)}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   Mobile Bottom Tab Bar
   ────────────────────────────────────────── */
/* ── Nav with unread badges ── */
function NavWithBadges() {
  const { totalUnread, pendingPayments } = useNotificationContext();
  const chatBadge = totalUnread;
  const pathname = usePathname();
  // Auto-collapse groups ที่ไม่ active — เปิดแค่ group ที่มีหน้าปัจจุบัน
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleGroup = (label: string) => setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 no-scrollbar">
      {NAV_GROUPS.map((group, gi) => {
        const label = group.groupLabel || "";
        const hasActive = group.items.some(item => isActivePath(pathname, item.href));
        const isCollapsed = collapsed[label] !== undefined ? collapsed[label] : (!hasActive && gi > 2); // collapse non-active groups below index 2
        return (
        <div key={gi} className={gi > 0 ? "mt-2" : ""}>
          {label && (
            <button onClick={() => toggleGroup(label)}
              className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 rounded-lg cursor-pointer transition hover:bg-[var(--bg-hover)] active:scale-[0.98]"
              style={{ color: "var(--text-muted)" }}>
              <span className="text-[10px] uppercase tracking-widest font-semibold">{label}</span>
              <span className="text-[10px] transition-transform" style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
            </button>
          )}
          {!isCollapsed && group.items.map((item) => (
            <SidebarNavLink
              key={item.href}
              {...item}
              badge={
                item.href === "/chat" || item.href === "/inbox" ? chatBadge
                : item.href === "/payments" || item.href === "/documents" ? pendingPayments
                : undefined
              }
            />
          ))}
        </div>
        );
      })}
    </nav>
  );
}

function BottomTabBar({ onMorePress }: { onMorePress: () => void }) {
  const pathname = usePathname();
  const { totalUnread } = useNotificationContext();
  const scrollHidden = useScrollHidden();

  return (
    <nav className={`bottom-nav md:hidden ${scrollHidden ? "nav-hidden" : ""}`}>
      <div className="h-16 flex items-center justify-around px-2">
        {BOTTOM_TABS.map((tab) => {
          const active = isActivePath(pathname, tab.href);
          const badge = tab.href === "/chat" ? totalUnread : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 w-16 py-1 rounded-xl transition-all ${
                active ? "text-indigo-400" : "text-[var(--text-muted)]"
              }`}
            >
              <span className={`text-xl leading-none transition-transform ${active ? "scale-110" : ""}`}>{tab.icon}</span>
              <span className={`text-[10px] leading-tight ${active ? "font-semibold" : ""}`}>{tab.label}</span>
              {active && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
              {badge > 0 && (
                <span className="absolute top-0 right-1 px-1 py-0.5 text-[8px] font-bold bg-red-500 text-white rounded-full min-w-[14px] text-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
        {/* More button */}
        <button
          onClick={onMorePress}
          className="flex flex-col items-center justify-center gap-0.5 w-16 py-1 rounded-xl text-[var(--text-muted)]"
        >
          <span className="text-xl leading-none">☰</span>
          <span className="text-[10px] leading-tight">เพิ่มเติม</span>
        </button>
      </div>
    </nav>
  );
}

/* ──────────────────────────────────────────
   Mobile "More" Drawer (slides up from bottom)
   ────────────────────────────────────────── */
function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] md:hidden animate-slide-up"
        style={{ maxHeight: "85dvh" }}>
        <div className="rounded-t-2xl overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--border-strong)" }} />
          </div>

          {/* Nav items */}
          <nav className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: "65dvh" }}>
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className={gi > 0 ? "mt-3 pt-3 border-t" : ""} style={{ borderColor: "var(--border)" }}>
                {group.groupLabel && (
                  <p className="text-[11px] uppercase tracking-wider px-2 mb-2 font-medium"
                    style={{ color: "var(--text-muted)" }}>
                    {group.groupLabel}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-1.5">
                  {group.items.map((item) => (
                    <MoreDrawerItem key={item.href} {...item} onClick={onClose} />
                  ))}
                </div>
              </div>
            ))}

            {/* Rebuild + Theme + User */}
            <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
              <RebuildButton />
              <div className="flex items-center justify-between px-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>ธีม</span>
                <ThemeToggle />
              </div>
              <UserSection />
            </div>
          </nav>

          {/* Safe area */}
          <div style={{ height: "var(--sai-bottom, 0px)" }} />
        </div>
      </div>
    </>
  );
}

function MoreDrawerItem({ href, icon, label, onClick }: NavItem & { onClick: () => void }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition ${
        active
          ? "bg-indigo-600/15 text-indigo-400"
          : "hover:bg-[var(--bg-hover)]"
      }`}
      style={{ color: active ? undefined : "var(--text-secondary)" }}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className={`text-[11px] ${active ? "font-semibold" : ""}`}>{label}</span>
    </Link>
  );
}

/* ── AI Cost Widget + Free Models (realtime) ── */
interface CostData { thb: number; calls: number; tokens?: number; }
interface CostSummary { today: CostData; yesterday: CostData; week: CostData; month: CostData; }
interface FreeModel { id: string; name: string; context_length: number; }
interface Cooldown { until: string; remainSec: number; }
interface FreeModelsData { count: number; lastDiscovery: string | null; models: FreeModel[]; cooldowns: Record<string, Cooldown>; paidAI: boolean; dedicated: string[]; }

function AICostMini() {
  const [data, setData] = useState<CostSummary | null>(null);
  const [modelCount, setModelCount] = useState(0);

  useEffect(() => {
    const loadCost = () => fetch("/dashboard/api/ai-cost-summary").then(r => r.json()).then(setData).catch(() => {});
    const loadFree = () => fetch("/dashboard/api/free-models").then(r => r.json()).then((m: FreeModelsData) => setModelCount(m.count + (m.dedicated?.length || 0))).catch(() => {});
    loadCost();
    loadFree();
    const t = setInterval(loadCost, 60000);
    return () => clearInterval(t);
  }, []);

  if (!data) return null;
  const fmt = (v: number) => v === 0 ? "฿0" : `฿${v.toFixed(2)}`;

  return (
    <Link href="/costs" className="flex items-center justify-between px-4 py-2 border-b transition hover:bg-[var(--bg-hover)]" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <span className="text-xs">🤖</span>
        <span className="text-[11px] font-bold" style={{ color: data.month.thb === 0 ? "#4ade80" : "#fbbf24" }}>{fmt(data.month.thb)}</span>
        <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>เดือนนี้</span>
      </div>
      {modelCount > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: "#4ade80", background: "rgba(74,222,128,0.08)" }}>{modelCount} AI ฟรี</span>}
    </Link>
  );
}

/* ──────────────────────────────────────────
   Main Sidebar Export
   ────────────────────────────────────────── */
export default function Sidebar() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 overflow-hidden border-r"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center text-lg shadow-lg shrink-0"
                style={{ boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
                💬
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-tight" style={{ color: "var(--text-primary)" }}>OpenClaw</h1>
                <p className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>Mini CRM</p>
              </div>
            </div>
          </div>

          {/* AI Cost — mini, กดไปหน้า costs */}
          <AICostMini />

          {/* Navigation */}
          <NavWithBadges />


          {/* Bottom */}
          <div className="px-3 pb-3 pt-2 border-t space-y-2.5" style={{ borderColor: "var(--border)" }}>
            <RebuildButton />
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>ธีม</span>
              <ThemeToggle />
            </div>
            <UserSection />
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Tab Bar ── */}
      <BottomTabBar onMorePress={() => setMoreOpen(true)} />

      {/* ── Mobile More Drawer ── */}
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
