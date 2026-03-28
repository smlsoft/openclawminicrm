"use client";

import { useEffect, useState, useCallback } from "react";

// ---- Types ----

interface AnalysisData {
  problem?: string;
  rootCause?: string;
  solutions?: string[];
  bestSolution?: string;
  actionSteps?: string[];
  opportunity?: string;
  intentLevel?: string;
  strategies?: string[];
  bestStrategy?: string;
  situation?: string;
  weakPoints?: string[];
  improvements?: string[];
  priority?: string;
  actionPlan?: string[];
  weekSummary?: string;
  mainProblems?: string[];
  opportunities?: string[];
  nextWeekStrategies?: string[];
  mondayActions?: string[];
  healthScore?: number;
  status?: string;
  reasons?: string[];
  reEngageOptions?: string[];
  bestOption?: string;
  immediateAction?: string;
}

interface AdviceItem {
  type?: string;
  priority: "critical" | "warning" | "opportunity" | "info";
  icon: string;
  title: string;
  detail: string;
  action: string;
  analysis?: AnalysisData;
  relatedRoom?: string;
  sourceId?: string;
  timestamp?: string;
}

interface AdviceBatch {
  _id?: string;
  type?: string;
  generatedAt: string;
  items: AdviceItem[];
}

// ---- Constants ----

const PRIORITY_STYLES: Record<
  string,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  critical: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/30",
    dot: "bg-red-500",
    label: "วิกฤต",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    label: "เตือน",
  },
  opportunity: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    label: "โอกาส",
  },
  info: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
    label: "ข้อมูล",
  },
};

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  all: { label: "ทั้งหมด", icon: "🦐", color: "var(--primary)" },
  "problem-analysis": { label: "ปัญหาลูกค้า", icon: "🚨", color: "#ef4444" },
  "sales-opportunity": { label: "โอกาสขาย", icon: "💰", color: "#10b981" },
  "team-coaching": { label: "โค้ชทีม", icon: "👥", color: "#8b5cf6" },
  "weekly-strategy": { label: "สรุปสัปดาห์", icon: "📊", color: "#3b82f6" },
  "health-monitor": { label: "สุขภาพลูกค้า", icon: "❤️", color: "#f59e0b" },
  general: { label: "ทั่วไป", icon: "📋", color: "#6b7280" },
};

const TAB_ORDER = [
  "all",
  "problem-analysis",
  "sales-opportunity",
  "team-coaching",
  "weekly-strategy",
  "health-monitor",
];

// ---- Helpers ----

function formatTimestamp(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function leftBorderColor(priority: string) {
  if (priority === "critical") return "#ef4444";
  if (priority === "warning") return "#f59e0b";
  if (priority === "opportunity") return "#10b981";
  return "#3b82f6";
}

function healthStatusLabel(score: number) {
  if (score >= 70) return { label: "สุขภาพดี", color: "#10b981" };
  if (score >= 40) return { label: "ต้องติดตาม", color: "#f59e0b" };
  return { label: "เสี่ยงหาย", color: "#ef4444" };
}

// ---- Sub-components ----

function PriorityBadge({ priority }: { priority: string }) {
  const s = PRIORITY_STYLES[priority] || PRIORITY_STYLES.info;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text} border ${s.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function TypeBadge({ type }: { type?: string }) {
  const cfg = TYPE_CONFIG[type || "general"] || TYPE_CONFIG.general;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{
        background: `${cfg.color}18`,
        color: cfg.color,
        border: `1px solid ${cfg.color}40`,
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function AnalysisLoop({ type, analysis }: { type?: string; analysis: AnalysisData }) {
  if (!analysis) return null;

  if (type === "problem-analysis") {
    return (
      <div className="mt-3 rounded-lg overflow-hidden border theme-border text-xs">
        <div className="px-3 py-1.5 font-semibold theme-text-muted" style={{ background: "var(--bg-secondary)" }}>
          วิเคราะห์เชิงลึก
        </div>
        <div className="divide-y theme-border">
          {analysis.problem && (
            <LoopStep step="A" label="ปัญหา" value={analysis.problem} />
          )}
          {analysis.rootCause && (
            <LoopStep step="B" label="ต้นเหตุ" value={analysis.rootCause} />
          )}
          {analysis.solutions && analysis.solutions.length > 0 && (
            <LoopStep step="C" label="ทางออก" list={analysis.solutions} />
          )}
          {analysis.bestSolution && (
            <LoopStep step="D" label="วิธีที่ดีที่สุด" value={analysis.bestSolution} highlight />
          )}
          {analysis.actionSteps && analysis.actionSteps.length > 0 && (
            <LoopStep step="E" label="ขั้นตอน" list={analysis.actionSteps} numbered />
          )}
        </div>
      </div>
    );
  }

  if (type === "sales-opportunity") {
    return (
      <div className="mt-3 rounded-lg overflow-hidden border theme-border text-xs">
        <div className="px-3 py-1.5 font-semibold theme-text-muted" style={{ background: "var(--bg-secondary)" }}>
          วิเคราะห์การขาย
        </div>
        <div className="divide-y theme-border">
          {analysis.opportunity && (
            <LoopStep step="A" label="โอกาส" value={analysis.opportunity} />
          )}
          {analysis.intentLevel && (
            <LoopStep step="B" label="ระดับความสนใจ" value={analysis.intentLevel} />
          )}
          {analysis.strategies && analysis.strategies.length > 0 && (
            <LoopStep step="C" label="กลยุทธ์" list={analysis.strategies} />
          )}
          {analysis.bestStrategy && (
            <LoopStep step="D" label="กลยุทธ์ที่ดีที่สุด" value={analysis.bestStrategy} highlight />
          )}
          {analysis.actionSteps && analysis.actionSteps.length > 0 && (
            <LoopStep step="E" label="ขั้นตอนปิดการขาย" list={analysis.actionSteps} numbered />
          )}
        </div>
      </div>
    );
  }

  if (type === "health-monitor") {
    const score = analysis.healthScore ?? null;
    const statusInfo = score !== null ? healthStatusLabel(score) : null;
    return (
      <div className="mt-3 rounded-lg overflow-hidden border theme-border text-xs">
        {score !== null && statusInfo && (
          <div
            className="px-3 py-2 flex items-center justify-between font-semibold"
            style={{ background: "var(--bg-secondary)" }}
          >
            <span className="theme-text-muted">คะแนนสุขภาพ</span>
            <span className="font-bold text-sm" style={{ color: statusInfo.color }}>
              {score}/100 — {statusInfo.label}
            </span>
          </div>
        )}
        <div className="divide-y theme-border">
          {analysis.reasons && analysis.reasons.length > 0 && (
            <LoopStep step="B" label="สัญญาณเตือน" list={analysis.reasons} />
          )}
          {analysis.reEngageOptions && analysis.reEngageOptions.length > 0 && (
            <LoopStep step="C" label="วิธีดึงกลับ" list={analysis.reEngageOptions} />
          )}
          {analysis.bestOption && (
            <LoopStep step="D" label="วิธีที่ดีที่สุด" value={analysis.bestOption} highlight />
          )}
          {analysis.immediateAction && (
            <LoopStep step="E" label="ทำทันที" value={analysis.immediateAction} numbered />
          )}
        </div>
      </div>
    );
  }

  if (type === "weekly-strategy") {
    return (
      <div className="mt-3 rounded-lg overflow-hidden border theme-border text-xs">
        <div className="px-3 py-1.5 font-semibold theme-text-muted" style={{ background: "var(--bg-secondary)" }}>
          วิเคราะห์กลยุทธ์ประจำสัปดาห์
        </div>
        <div className="divide-y theme-border">
          {analysis.weekSummary && (
            <LoopStep step="A" label="สรุปสัปดาห์" value={analysis.weekSummary} />
          )}
          {analysis.mainProblems && analysis.mainProblems.length > 0 && (
            <LoopStep step="B" label="ปัญหาหลัก" list={analysis.mainProblems} />
          )}
          {analysis.opportunities && analysis.opportunities.length > 0 && (
            <LoopStep step="C" label="โอกาส" list={analysis.opportunities} />
          )}
          {analysis.nextWeekStrategies && analysis.nextWeekStrategies.length > 0 && (
            <LoopStep step="D" label="กลยุทธ์สัปดาห์หน้า" list={analysis.nextWeekStrategies} highlight />
          )}
          {analysis.mondayActions && analysis.mondayActions.length > 0 && (
            <LoopStep step="E" label="ทำวันจันทร์นี้" list={analysis.mondayActions} numbered />
          )}
        </div>
      </div>
    );
  }

  if (type === "team-coaching") {
    return (
      <div className="mt-3 rounded-lg overflow-hidden border theme-border text-xs">
        <div className="px-3 py-1.5 font-semibold theme-text-muted" style={{ background: "var(--bg-secondary)" }}>
          วิเคราะห์การโค้ชทีม
        </div>
        <div className="divide-y theme-border">
          {analysis.situation && (
            <LoopStep step="A" label="สถานการณ์" value={analysis.situation} />
          )}
          {analysis.weakPoints && analysis.weakPoints.length > 0 && (
            <LoopStep step="B" label="จุดอ่อน" list={analysis.weakPoints} />
          )}
          {analysis.improvements && analysis.improvements.length > 0 && (
            <LoopStep step="C" label="วิธีพัฒนา" list={analysis.improvements} />
          )}
          {analysis.priority && (
            <LoopStep step="D" label="ลำดับความสำคัญ" value={analysis.priority} highlight />
          )}
          {analysis.actionPlan && analysis.actionPlan.length > 0 && (
            <LoopStep step="E" label="แผนพัฒนา" list={analysis.actionPlan} numbered />
          )}
        </div>
      </div>
    );
  }

  return null;
}

function LoopStep({
  step,
  label,
  value,
  list,
  highlight,
  numbered,
}: {
  step: string;
  label: string;
  value?: string;
  list?: string[];
  highlight?: boolean;
  numbered?: boolean;
}) {
  return (
    <div className={`px-3 py-2 flex gap-2 ${highlight ? "bg-emerald-500/5" : ""}`}>
      <span
        className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
        style={{
          background: highlight ? "#10b98120" : "var(--bg-secondary)",
          color: highlight ? "#10b981" : "var(--text-muted)",
        }}
      >
        {step}
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-semibold theme-text-muted mr-1">{label}:</span>
        {value && (
          <span className={highlight ? "theme-text font-medium" : "theme-text-secondary"}>
            {value}
          </span>
        )}
        {list && list.length > 0 && (
          <ul className="mt-0.5 space-y-0.5">
            {list.map((item, i) => (
              <li key={i} className="theme-text-secondary flex gap-1">
                <span className="flex-shrink-0 theme-text-muted">
                  {numbered ? `${i + 1}.` : "•"}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

// ---- Main Page ----

export default function AdvicePage() {
  const [batches, setBatches] = useState<AdviceBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchAdvice = useCallback(async (tab: string) => {
    try {
      setLoading(true);
      const url =
        tab === "all"
          ? "/dashboard/api/advice?limit=20"
          : `/dashboard/api/advice?type=${tab}&limit=10`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped: AdviceBatch[] = data.map((doc: any) => ({
          _id: doc._id?.toString(),
          type: doc.type || "general",
          generatedAt: doc.createdAt || new Date().toISOString(),
          items: (doc.advice || []).map((a: any) => ({
            ...a,
            type: a.type || doc.type || "general",
            priority: a.priority || "info",
          })),
        }));
        setBatches(mapped);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch counts per type for tab badges
  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/dashboard/api/advice?limit=100");
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const c: Record<string, number> = { all: 0 };
      for (const doc of data) {
        const t = doc.type || "general";
        c[t] = (c[t] || 0) + (doc.advice?.length || 0);
        c.all = (c.all || 0) + (doc.advice?.length || 0);
      }
      setCounts(c);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchAdvice(activeTab);
  }, [fetchAdvice, activeTab]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAdvice(activeTab);
      fetchCounts();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAdvice, fetchCounts, activeTab]);

  const totalItems = batches.reduce((sum, b) => sum + b.items.length, 0);

  return (
    <div className="min-h-screen theme-bg">
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md border-b theme-border theme-bg"
      >
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold theme-text">น้องกุ้ง — ที่ปรึกษา AI</h1>
            <button
              onClick={() => { fetchAdvice(activeTab); fetchCounts(); }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {loading
                ? <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
                : <RefreshIcon className="w-3.5 h-3.5" />
              }
              {loading ? "กำลังโหลด..." : "รีเฟรช"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-3 md:px-6 pb-0">
          <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
            {TAB_ORDER.map((tab) => {
              const cfg = TYPE_CONFIG[tab];
              const count = counts[tab];
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap"
                  style={{
                    borderBottomColor: isActive ? cfg.color : "transparent",
                    color: isActive ? cfg.color : "var(--text-muted)",
                  }}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                  {count != null && count > 0 && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={{
                        background: isActive ? `${cfg.color}20` : "var(--bg-card)",
                        color: isActive ? cfg.color : "var(--text-muted)",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 md:p-6 pb-24 md:pb-6 space-y-6">
        {/* Summary bar */}
        <p className="text-xs theme-text-muted">
          {loading
            ? "กำลังโหลด..."
            : `${totalItems} คำแนะนำจาก ${batches.length} รอบ`}
        </p>

        {/* Loading state */}
        {loading && batches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <SpinnerIcon
              className="w-8 h-8 animate-spin"
              // @ts-ignore inline style on svg
              style={{ color: "var(--primary)" }}
            />
            <p className="text-sm theme-text-muted">กำลังโหลดคำแนะนำ...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && batches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: "var(--primary-bg)" }}
            >
              {TYPE_CONFIG[activeTab]?.icon || "🦐"}
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium theme-text">
                ยังไม่มีคำแนะนำ{activeTab !== "all" ? `ประเภท "${TYPE_CONFIG[activeTab]?.label}"` : ""}
              </p>
              <p className="text-xs theme-text-muted">
                น้องกุ้งจะวิเคราะห์และสร้างคำแนะนำอัตโนมัติทุกชั่วโมง
              </p>
            </div>
          </div>
        )}

        {/* Advice batches */}
        {batches.map((batch, batchIdx) => (
          <section key={batch._id || batchIdx} className="space-y-3">
            {/* Batch header with timestamp + type */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1" style={{ background: "var(--border)" }} />
              <div className="flex items-center gap-2">
                {batch.type && batch.type !== "general" && (
                  <TypeBadge type={batch.type} />
                )}
                <span className="text-xs font-medium theme-text-muted px-1">
                  {formatTimestamp(batch.generatedAt)}
                </span>
              </div>
              <div className="h-px flex-1" style={{ background: "var(--border)" }} />
            </div>

            {/* Advice cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {batch.items.map((item, itemIdx) => (
                <AdviceCard
                  key={itemIdx}
                  item={item}
                  batchType={batch.type}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function AdviceCard({
  item,
  batchType,
}: {
  item: AdviceItem;
  batchType?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const effectiveType = item.type || batchType || "general";
  const hasAnalysis = !!item.analysis && Object.keys(item.analysis).length > 0;

  return (
    <div
      className="rounded-xl border p-4 space-y-3 transition-colors theme-bg-card theme-border"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: leftBorderColor(item.priority),
      }}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{item.icon}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold theme-text leading-tight">
              {item.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <TypeBadge type={effectiveType} />
              <PriorityBadge priority={item.priority} />
            </div>
          </div>
        </div>
      </div>

      {/* Detail */}
      <p className="text-xs theme-text-secondary leading-relaxed">{item.detail}</p>

      {/* Action */}
      {item.action && (
        <div
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: "var(--primary-bg)", color: "var(--primary)" }}
        >
          <span className="font-medium">แนะนำ:</span> {item.action}
        </div>
      )}

      {/* Deep analysis toggle */}
      {hasAnalysis && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[11px] theme-text-muted hover:theme-text transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {expanded ? "ซ่อนการวิเคราะห์เชิงลึก" : "ดูการวิเคราะห์เชิงลึก"}
          </button>
          {expanded && item.analysis && (
            <AnalysisLoop type={effectiveType} analysis={item.analysis} />
          )}
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        {item.relatedRoom && (
          <span className="text-[11px] theme-text-muted">ห้อง: {item.relatedRoom}</span>
        )}
        {item.timestamp && (
          <span className="text-[11px] theme-text-muted ml-auto">
            {formatTimestamp(item.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}
