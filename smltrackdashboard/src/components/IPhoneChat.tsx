"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Message {
  _id: string;
  role: "user" | "assistant";
  userName?: string;
  content: string;
  messageType: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  location?: { title?: string; address?: string; latitude: number; longitude: number } | null;
  sticker?: { packageId?: string; stickerId?: string; stickerUrl?: string } | null;
  hasImage?: boolean;
  hasVideo?: boolean;
  hasAudio?: boolean;
  hasSticker?: boolean;
  hasLocation?: boolean;
  sendMethod?: string;
  isAutoReply?: boolean;
  createdAt?: string;
}

interface ScoreData {
  score: number;
  stars: number;
  level: "green" | "yellow" | "red";
  reason: string;
}

interface AnalysisLog {
  _id: string;
  sentiment: ScoreData;
  purchaseIntent: ScoreData;
  messageCount: number;
  analyzedAt: string;
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

interface ReplyTemplate {
  _id: string;
  title: string;
  content: string;
  category: string;
  usageCount: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  greeting: "ทักทาย",
  pricing: "ราคา",
  followup: "ติดตาม",
  closing: "ปิดการขาย",
  custom: "กำหนดเอง",
};
const CATEGORY_COLORS: Record<string, string> = {
  greeting: "text-blue-400",
  pricing: "text-emerald-400",
  followup: "text-amber-400",
  closing: "text-purple-400",
  custom: "theme-text-secondary",
};

const SENTIMENT_LABELS: Record<string, string> = {
  green: "ปกติ",
  yellow: "ติดตาม",
  red: "ไม่พอใจ",
};
const PURCHASE_LABELS: Record<string, string> = {
  green: "ยังไม่สนใจ",
  yellow: "เริ่มสนใจ",
  red: "สนใจซื้อ!",
};

function ScoreBadge({ label, data, type }: { label: string; data?: ScoreData | null; type: "sentiment" | "purchase" }) {
  if (!data) return null;
  const bgColor = data.level === "green" ? "bg-green-600" : data.level === "yellow" ? "bg-yellow-600" : "bg-red-600";
  const levelLabel = type === "sentiment" ? SENTIMENT_LABELS[data.level] : PURCHASE_LABELS[data.level];
  return (
    <div className={`${bgColor} rounded px-1.5 py-0.5 text-[9px] leading-tight`} title={`${data.reason}\n${levelLabel} (${data.score}%)`}>
      <span className="opacity-70">{label}</span> <span className="font-bold">{levelLabel}</span>
    </div>
  );
}

export default function IPhoneChat({
  group,
  onZoom,
  dragHandleProps,
}: {
  group: Group;
  onZoom: (url: string) => void;
  dragHandleProps?: any;
}) {
  const msgs = group.messages || [];
  const now = new Date();
  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const displayName = group.name && group.name !== group.id ? group.name : group.id.substring(0, 12) + "...";

  const bottomRef = useRef<HTMLDivElement>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [logs, setLogs] = useState<AnalysisLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/dashboard/api/analytics/${group.id}/logs?limit=10`);
      const data = await res.json();
      if (Array.isArray(data)) setLogs(data);
    } catch {}
    setLoadingLogs(false);
  };

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/dashboard/api/templates");
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch {}
    setLoadingTemplates(false);
  }, []);

  const handleCopyTemplate = async (template: ReplyTemplate) => {
    try {
      await navigator.clipboard.writeText(template.content);
      setCopiedId(template._id);
      // bump usage count
      fetch("/dashboard/api/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: template._id }),
      }).catch(() => {});
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  const lastMsgId = msgs.length > 0 ? msgs[msgs.length - 1]._id : "";
  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }, 100);
    return () => clearTimeout(timer);
  }, [lastMsgId]);

  return (
    <div className="flex flex-col" style={{ width: "375px", height: "812px" }}>
      {/* iPhone Frame — ใช้ CSS class แทน inline style */}
      <div
        className="iphone-frame relative rounded-[50px] overflow-hidden flex flex-col border-[3px] shadow-2xl"
        style={{ width: "375px", height: "812px" }}
      >
        {/* Dynamic Island */}
        <div className="iphone-island absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[35px] rounded-full z-30 flex items-center justify-center">
          <div className="iphone-island-dot w-3 h-3 rounded-full border"></div>
        </div>

        {/* Status Bar */}
        <div className="iphone-header pt-[50px] pb-0 px-6 flex items-center justify-between text-white text-xs z-20 shrink-0">
          <span className="font-semibold">{timeStr}</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
            <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
          </div>
        </div>

        {/* LINE-style Header */}
        <div
          {...dragHandleProps}
          className="iphone-header px-4 py-2.5 flex items-center gap-3 shrink-0 cursor-grab active:cursor-grabbing select-none"
        >
          <span className="text-white text-lg">&larr;</span>
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
            {group.id.substring(5, 7).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{displayName}</p>
              {group.platform === "facebook" && (
                <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600/80 text-white leading-none">FB</span>
              )}
              {group.platform === "instagram" && (
                <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-600/80 text-white leading-none">IG</span>
              )}
              {(!group.platform || group.platform === "line") && (
                <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-600/80 text-white leading-none">LINE</span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <ScoreBadge label="😊" data={group.customerSentiment || group.sentiment} type="sentiment" />
              <ScoreBadge label="👔" data={group.staffSentiment} type="sentiment" />
              <ScoreBadge label="🛒" data={group.purchaseIntent} type="purchase" />
              {!group.sentiment && !group.customerSentiment && <span className="text-green-200 text-[10px]">{group.messageCount} msgs</span>}
              {(group.analysisLogsCount || 0) > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory); if (!showHistory) fetchLogs(); }}
                  className="theme-bg-card hover:theme-bg-hover rounded px-1.5 py-0.5 text-[9px] theme-text-secondary transition"
                  title="ดูประวัติการวิเคราะห์"
                >📊 {group.analysisLogsCount}</button>
              )}
            </div>
          </div>
        </div>

        {/* Scoring History Panel */}
        {showHistory && (
          <div className="iphone-history border-b theme-border px-3 py-2 max-h-[200px] overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold theme-text-secondary">📊 ประวัติการวิเคราะห์</span>
              <button onClick={() => setShowHistory(false)} className="text-xs theme-text-muted">&times;</button>
            </div>
            {loadingLogs ? (
              <p className="text-[10px] text-center py-2 theme-text-muted">Loading...</p>
            ) : logs.length === 0 ? (
              <p className="text-[10px] text-center py-2 theme-text-muted">ยังไม่มีประวัติ</p>
            ) : (
              <div className="space-y-1.5">
                {logs.map((log) => {
                  const sColor = log.sentiment?.level === "green" ? "text-green-400" : log.sentiment?.level === "yellow" ? "text-yellow-400" : "text-red-400";
                  const pColor = log.purchaseIntent?.level === "green" ? "text-green-400" : log.purchaseIntent?.level === "yellow" ? "text-yellow-400" : "text-red-400";
                  return (
                    <div key={log._id} className="iphone-history-card rounded px-2 py-1.5 text-[10px]">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="theme-text-muted">
                          {new Date(log.analyzedAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="theme-text-muted">{log.messageCount} msgs</span>
                      </div>
                      <div className="flex gap-3">
                        <span>😊 <span className={sColor}>{SENTIMENT_LABELS[log.sentiment?.level] || "-"}</span> <span className="theme-text-muted">{log.sentiment?.score}%</span></span>
                        <span>🛒 <span className={pColor}>{PURCHASE_LABELS[log.purchaseIntent?.level] || "-"}</span> <span className="theme-text-muted">{log.purchaseIntent?.score}%</span></span>
                      </div>
                      {log.sentiment?.reason && (
                        <p className="theme-text-muted mt-0.5 truncate" title={`${log.sentiment.reason} / ${log.purchaseIntent?.reason}`}>
                          {log.sentiment.reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Chat Background — ใช้ CSS class (ไม่ hardcode สี) */}
        <div className="iphone-chat-area flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {msgs.length === 0 ? (
            <p className="text-center text-xs py-16 theme-text-muted">No messages yet</p>
          ) : (
            msgs.map((msg, i) => {
              const showDate = i === 0 || (
                msgs[i - 1]?.createdAt &&
                msg.createdAt &&
                new Date(msgs[i - 1].createdAt!).toDateString() !== new Date(msg.createdAt).toDateString()
              );

              return (
                <div key={msg._id}>
                  {showDate && msg.createdAt && (
                    <div className="flex justify-center my-2">
                      <span className="iphone-date-badge text-[10px] px-3 py-1 rounded-full">
                        {new Date(msg.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                      </span>
                    </div>
                  )}

                  <div className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"} mb-0.5`}>
                    <div
                      className={`relative max-w-[75%] px-2.5 py-1.5 text-[13px] ${
                        msg.role === "assistant"
                          ? "iphone-msg-incoming rounded-lg rounded-tl-none"
                          : "iphone-msg-outgoing rounded-lg rounded-tr-none"
                      }`}
                    >
                      {msg.userName && (
                        <p className={`text-[11px] font-medium mb-0.5 ${msg.role === "assistant" ? "text-sky-400" : "text-emerald-400"}`}>{msg.userName}</p>
                      )}

                      {/* Sticker */}
                      {(msg.hasSticker || msg.sticker) && msg.sticker && (
                        <img
                          src={msg.sticker.stickerUrl || `https://stickershop.line-scdn.net/stickershop/v1/sticker/${msg.sticker.stickerId}/iPhone/sticker@2x.png`}
                          alt="sticker"
                          className="w-24 h-24 object-contain my-1"
                          loading="lazy"
                        />
                      )}

                      {/* Image */}
                      {(msg.hasImage || msg.imageUrl) && !msg.sticker && (
                        <img
                          src={msg.imageUrl || `/api/image/${group.id}/${msg._id}`}
                          alt=""
                          loading="lazy"
                          className="rounded-md max-w-full max-h-48 object-cover my-1 cursor-zoom-in hover:brightness-90 transition"
                          onClick={() => onZoom(msg.imageUrl || `/api/image/${group.id}/${msg._id}`)}
                        />
                      )}

                      {/* Video */}
                      {(msg.hasVideo || msg.videoUrl) && msg.videoUrl && !msg.videoUrl.startsWith("line-content") && (
                        <video src={msg.videoUrl} controls className="rounded-md max-w-full max-h-48 my-1" />
                      )}
                      {msg.videoUrl?.startsWith("line-content") && (
                        <div className="flex items-center gap-1.5 my-1 text-xs text-sky-400">🎥 วิดีโอ (ดูใน LINE)</div>
                      )}

                      {/* Audio */}
                      {(msg.hasAudio || msg.audioUrl) && msg.audioUrl && !msg.audioUrl.startsWith("line-content") && (
                        <audio src={msg.audioUrl} controls className="max-w-full my-1 h-8" />
                      )}
                      {msg.audioUrl?.startsWith("line-content") && (
                        <div className="flex items-center gap-1.5 my-1 text-xs text-sky-400">🎵 เสียง (ดูใน LINE)</div>
                      )}

                      {/* Location */}
                      {(msg.hasLocation || msg.location) && msg.location && (
                        <a
                          href={`https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 my-1 text-xs text-sky-300 hover:text-sky-200 underline"
                        >
                          📍 {msg.location.title || "ดูแผนที่"}
                        </a>
                      )}

                      <div className="flex items-end gap-2">
                        {/* ซ่อน content ถ้าเป็น sticker */}
                        {msg.content && msg.messageType !== "sticker" && !msg.hasSticker && (
                          <p className="whitespace-pre-wrap break-words flex-1 leading-[18px]">{msg.content}</p>
                        )}
                        {(msg.messageType === "sticker" || msg.hasSticker) && (
                          <p className="flex-1" />
                        )}
                        {msg.createdAt && (
                          <span className="iphone-time text-[10px] shrink-0 translate-y-0.5">
                            {new Date(msg.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick Reply Templates Panel */}
        {showTemplates && (
          <div className="iphone-history border-t theme-border px-3 py-2 max-h-[240px] overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold theme-text-secondary">⚡ Quick Reply</span>
              <button onClick={() => setShowTemplates(false)} className="text-xs theme-text-muted hover:theme-text">&times;</button>
            </div>
            {loadingTemplates ? (
              <p className="text-[10px] text-center py-2 theme-text-muted">Loading...</p>
            ) : templates.length === 0 ? (
              <p className="text-[10px] text-center py-3 theme-text-muted">
                ยังไม่มี template —{" "}
                <a href="/dashboard/templates" className="text-blue-400 underline">เพิ่มที่นี่</a>
              </p>
            ) : (
              <div className="space-y-1.5">
                {templates.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => handleCopyTemplate(t)}
                    className="w-full text-left rounded-lg px-2.5 py-2 text-[11px] transition iphone-history-card hover:opacity-80 active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium theme-text">{t.title}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] ${CATEGORY_COLORS[t.category] || "theme-text-secondary"}`}>
                          {CATEGORY_LABELS[t.category] || t.category}
                        </span>
                        {copiedId === t._id ? (
                          <span className="text-[9px] text-emerald-400 font-bold">✓ คัดลอก</span>
                        ) : (
                          <span className="text-[9px] theme-text-muted">📋</span>
                        )}
                      </div>
                    </div>
                    <p className="theme-text-muted leading-relaxed line-clamp-2">{t.content}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Reply Button Bar */}
        <div className="iphone-home px-4 py-1.5 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              setShowTemplates((prev) => !prev);
              if (!showTemplates) fetchTemplates();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${
              showTemplates
                ? "bg-amber-500/30 text-amber-300 border border-amber-500/30"
                : "theme-bg-card theme-text-secondary hover:theme-bg-hover hover:theme-text"
            }`}
            title="Quick Reply Templates"
          >
            ⚡ Quick Reply
          </button>
          <div className="iphone-home-bar w-24 h-1 rounded-full" />
          <div className="w-[80px]" />
        </div>
      </div>
    </div>
  );
}
