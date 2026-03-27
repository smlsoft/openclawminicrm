"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  platform?: string;
}

interface ScoreData {
  score: number;
  stars: number;
  level: "green" | "yellow" | "red";
  reason: string;
}

interface Conversation {
  id: string;
  name: string;
  platform: string;
  messageCount: number;
  lastMessage: string;
  lastActivity: string | null;
  messages?: Message[];
  sentiment?: ScoreData | null;
  customerSentiment?: ScoreData | null;
  staffSentiment?: ScoreData | null;
  purchaseIntent?: ScoreData | null;
  analysisLogsCount?: number;
}

interface ReplyTemplate {
  _id: string;
  title: string;
  content: string;
  category: string;
  usageCount: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { label: string; color: string; badgeBg: string; dot: string }> = {
  line:      { label: "LINE",      color: "text-green-400",  badgeBg: "bg-green-600",  dot: "bg-green-400" },
  facebook:  { label: "Facebook",  color: "text-blue-400",   badgeBg: "bg-blue-600",   dot: "bg-blue-400" },
  instagram: { label: "Instagram", color: "text-pink-400",   badgeBg: "bg-gradient-to-r from-purple-600 to-pink-600", dot: "bg-pink-400" },
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
const CATEGORY_LABELS: Record<string, string> = {
  greeting: "ทักทาย",
  pricing: "ราคา",
  followup: "ติดตาม",
  closing: "ปิดการขาย",
  custom: "กำหนดเอง",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อกี้";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hrs / 24);
  return `${days} วันที่แล้ว`;
}

function platformBadge(platform: string) {
  const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.line;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cfg.badgeBg} text-white leading-none shrink-0`}>
      {cfg.label}
    </span>
  );
}

function getInitials(name: string): string {
  if (!name) return "?";
  const clean = name.replace(/^(fb_|ig_)/, "").toUpperCase();
  return clean.substring(0, 2);
}

function avatarBg(platform: string): string {
  if (platform === "facebook") return "bg-blue-600";
  if (platform === "instagram") return "bg-pink-600";
  return "bg-green-600";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConversationItem({
  conv,
  isSelected,
  onClick,
}: {
  conv: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const platform = conv.platform || "line";
  const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.line;
  const sentimentLevel = conv.customerSentiment?.level || conv.sentiment?.level;
  const sentimentDot =
    sentimentLevel === "red" ? "bg-red-500" :
    sentimentLevel === "yellow" ? "bg-amber-400" :
    "bg-emerald-500";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 flex items-start gap-3 transition border-b theme-border hover:theme-bg-hover ${
        isSelected ? "bg-indigo-950/60 border-l-2 border-l-indigo-500" : ""
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className={`w-10 h-10 rounded-full ${avatarBg(platform)} flex items-center justify-center text-sm font-bold text-white`}>
          {getInitials(conv.name)}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${cfg.dot}`} style={{ borderColor: 'var(--bg-secondary)' }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-sm font-semibold truncate flex-1 ${isSelected ? "text-white" : "theme-text"}`}>
            {conv.name !== conv.id ? conv.name : conv.id.substring(0, 16) + "…"}
          </span>
          {sentimentLevel && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${sentimentDot}`} title={SENTIMENT_LABELS[sentimentLevel]} />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {platformBadge(platform)}
          <span className="text-sm theme-text-muted truncate flex-1">{conv.lastMessage || "—"}</span>
        </div>
        <span className="text-[10px] theme-text-muted mt-0.5 block">{timeAgo(conv.lastActivity)}</span>
      </div>
    </button>
  );
}

function ChatBubble({
  msg,
  onZoom,
}: {
  msg: Message;
  onZoom: (url: string) => void;
}) {
  const isStaff = msg.role === "assistant";
  const showImage = (msg.hasImage || !!msg.imageUrl) && !msg.sticker;
  const isAutoReply = msg.isAutoReply;

  return (
    <div className={`flex ${isStaff ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`relative max-w-[70%] px-3 py-2 text-sm rounded-2xl ${
          isStaff
            ? isAutoReply ? "bg-amber-700/60 text-white rounded-br-sm" : "bg-indigo-600 text-white rounded-br-sm"
            : "theme-bg-card theme-text rounded-bl-sm"
        }`}
      >
        {msg.userName && (
          <p className={`text-[11px] font-semibold mb-1 ${isStaff ? (isAutoReply ? "text-amber-200" : "text-indigo-200") : "text-sky-400"}`}>
            {msg.userName}
          </p>
        )}
        {/* Sticker */}
        {(msg.hasSticker || msg.sticker) && msg.sticker && (
          <img
            src={msg.sticker.stickerUrl || `https://stickershop.line-scdn.net/stickershop/v1/sticker/${msg.sticker.stickerId}/iPhone/sticker@2x.png`}
            alt="sticker"
            className="w-28 h-28 object-contain my-1"
            loading="lazy"
          />
        )}
        {/* Image */}
        {showImage && (msg.imageUrl || msg.hasImage) && (
          <img
            src={msg.imageUrl || ""}
            alt="รูปภาพ"
            loading="lazy"
            className="rounded-lg max-w-full max-h-56 object-cover mb-1 cursor-zoom-in hover:brightness-90 transition"
            onClick={() => msg.imageUrl && onZoom(msg.imageUrl)}
          />
        )}
        {/* Video */}
        {(msg.hasVideo || msg.videoUrl) && msg.videoUrl && !msg.videoUrl.startsWith("line-content") && (
          <video src={msg.videoUrl} controls className="rounded-lg max-w-full max-h-56 mb-1" />
        )}
        {msg.videoUrl?.startsWith("line-content") && (
          <p className="text-xs text-sky-300 my-1">🎥 วิดีโอ (ดูใน LINE)</p>
        )}
        {/* Audio */}
        {(msg.hasAudio || msg.audioUrl) && msg.audioUrl && !msg.audioUrl.startsWith("line-content") && (
          <audio src={msg.audioUrl} controls className="max-w-full my-1" />
        )}
        {msg.audioUrl?.startsWith("line-content") && (
          <p className="text-xs text-sky-300 my-1">🎵 เสียง (ดูใน LINE)</p>
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
        {/* Text (ซ่อนถ้าเป็น sticker) */}
        {msg.content && msg.messageType !== "sticker" && !msg.hasSticker && (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
        )}
        {/* Time + send method */}
        <div className={`flex items-center justify-end gap-1 mt-1 ${isStaff ? "text-indigo-300" : "theme-text-muted"}`}>
          {msg.sendMethod && isStaff && (
            <span className={`text-[9px] ${msg.sendMethod === "reply" ? "text-green-300" : "text-amber-300"}`}>
              {msg.sendMethod === "reply" ? "✓ฟรี" : "push"}
            </span>
          )}
          {msg.createdAt && (
            <span className="text-[10px] text-right">
              {new Date(msg.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px theme-bg-card" />
      <span className="text-xs theme-text-muted px-3 py-1 theme-bg-card rounded-full">
        {new Date(date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "2-digit" })}
      </span>
      <div className="flex-1 h-px theme-bg-card" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InboxPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  // State: conversation list
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // State: messages for selected conversation
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // State: send message
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // State: templates
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // State: zoom image lightbox
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // State: right panel visibility (mobile)
  const [showRightPanel, setShowRightPanel] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastMsgIdRef = useRef<string>("");

  // Auth guard
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/dashboard/login");
    }
  }, [authStatus, router]);

  // ─── Fetch conversation list ──────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/dashboard/api/groups");
      const raw = await res.json();
      const data = Array.isArray(raw) ? raw : raw.groups;
      if (!Array.isArray(data)) return;
      const sorted = [...data].sort((a, b) => {
        const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return tb - ta;
      });
      setConversations(sorted);
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations();
    const iv = setInterval(fetchConversations, 15000);
    return () => clearInterval(iv);
  }, [fetchConversations]);

  // ─── Fetch messages for selected conversation ─────────────────────────────

  const fetchMessages = useCallback(async (sourceId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/dashboard/api/groups/${encodeURIComponent(sourceId)}/messages?limit=100`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        // scroll to bottom only when new messages arrive
        const newLastId = data[data.length - 1]?._id;
        if (newLastId && newLastId !== lastMsgIdRef.current) {
          lastMsgIdRef.current = newLastId;
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);
        }
      }
    } catch {}
    if (!silent) setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setMessages([]);
    lastMsgIdRef.current = "";
    fetchMessages(selectedId);
    const iv = setInterval(() => fetchMessages(selectedId, true), 5000);
    return () => clearInterval(iv);
  }, [selectedId, fetchMessages]);

  // Scroll to bottom on initial load of selected conversation
  useEffect(() => {
    if (messages.length > 0 && loadingMessages === false) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ block: "end" }), 100);
    }
  }, [loadingMessages]);

  // ─── Templates ────────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    if (templates.length > 0) return;
    setLoadingTemplates(true);
    try {
      const res = await fetch("/dashboard/api/templates");
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch {}
    setLoadingTemplates(false);
  }, [templates.length]);

  // ─── Send message ─────────────────────────────────────────────────────────

  const selectedConv = conversations.find((c) => c.id === selectedId);

  const sendMessage = useCallback(async (text: string) => {
    if (!selectedId || !selectedConv || !text.trim()) return;
    setSending(true);
    setSendError(null);

    // Optimistic update
    const tempMsg: Message = {
      _id: `temp-${Date.now()}`,
      role: "assistant",
      userName: (session?.user as any)?.name || "พนักงาน",
      content: text.trim(),
      messageType: "text",
      createdAt: new Date().toISOString(),
      platform: selectedConv.platform,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 60);

    try {
      const res = await fetch("/dashboard/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: selectedId,
          platform: selectedConv.platform || "line",
          text: text.trim(),
          staffName: (session?.user as any)?.name || "พนักงาน",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "ส่งไม่สำเร็จ" }));
        throw new Error(err.error || "ส่งไม่สำเร็จ");
      }
      // Refresh messages after send
      setTimeout(() => fetchMessages(selectedId, true), 300);
    } catch (e: any) {
      setSendError(e.message);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
    }
    setSending(false);
  }, [selectedId, selectedConv, session, fetchMessages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim()) {
        sendMessage(inputText);
        setInputText("");
      }
    }
    if (e.key === "Escape") {
      setShowTemplates(false);
    }
  };

  // ─── Filtered conversations ───────────────────────────────────────────────

  const filtered = conversations.filter((c) => {
    if (platformFilter !== "all" && (c.platform || "line") !== platformFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const platformCounts = {
    all: conversations.length,
    line: conversations.filter((c) => (c.platform || "line") === "line").length,
    facebook: conversations.filter((c) => c.platform === "facebook").length,
    instagram: conversations.filter((c) => c.platform === "instagram").length,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-screen theme-bg theme-text overflow-hidden">

      {/* ── Zoom Lightbox ── */}
      {zoomImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <img src={zoomImage} alt="ขยาย" className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl" />
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-2xl hover:bg-black/80"
            onClick={() => setZoomImage(null)}
          >×</button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          LEFT PANEL — Conversation List
      ══════════════════════════════════════════════════════════════════════ */}
      <aside className={`flex flex-col w-full md:w-80 shrink-0 theme-bg-secondary border-r theme-border ${selectedId ? "hidden md:flex" : "flex"}`}>

        {/* Header */}
        <div className="px-3 md:px-4 pt-4 pb-3 border-b theme-border">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold theme-text">Inbox</h1>
            <span className="text-xs theme-text-muted theme-bg-card px-2 py-0.5 rounded-full">
              {conversations.length} บทสนทนา
            </span>
          </div>
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted text-sm">🔍</span>
            <input
              type="text"
              placeholder="ค้นหาชื่อหรือข้อความ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full theme-input border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Platform Filter Tabs */}
        <div className="px-3 py-2 border-b theme-border flex gap-1 flex-wrap">
          {(["all", "line", "facebook", "instagram"] as const).map((p) => {
            const isActive = platformFilter === p;
            const labels: Record<string, string> = { all: "ทั้งหมด", line: "LINE", facebook: "FB", instagram: "IG" };
            const activeColors: Record<string, string> = {
              all: "bg-white text-black",
              line: "bg-green-600 text-white",
              facebook: "bg-blue-600 text-white",
              instagram: "bg-gradient-to-r from-purple-600 to-pink-600 text-white",
            };
            const inactiveColors: Record<string, string> = {
              all: "theme-bg-card theme-text-secondary",
              line: "bg-green-900/30 text-green-400",
              facebook: "bg-blue-900/30 text-blue-400",
              instagram: "bg-pink-900/30 text-pink-400",
            };
            return (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${isActive ? activeColors[p] : inactiveColors[p]}`}
              >
                {labels[p]}
                <span className={`text-[10px] px-1 rounded-full ${isActive ? "bg-white/20" : "bg-gray-700/60"}`}>
                  {platformCounts[p]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <span className="text-3xl">💬</span>
              <p className="text-sm theme-text-muted">ไม่พบบทสนทนา</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isSelected={selectedId === conv.id}
                onClick={() => {
                  setSelectedId(conv.id);
                  setShowRightPanel(false);
                  setSendError(null);
                }}
              />
            ))
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          CENTER PANEL — Chat Area
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={`flex flex-col flex-1 min-w-0 ${!selectedId ? "hidden md:flex" : "flex"}`}>

        {!selectedId ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-20 h-20 theme-bg-card rounded-3xl flex items-center justify-center text-4xl">
              💬
            </div>
            <div>
              <h2 className="text-lg font-bold theme-text mb-1">เลือกบทสนทนา</h2>
              <p className="text-sm theme-text-muted">คลิกชื่อลูกค้าทางซ้ายเพื่อเปิดแชท</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Chat Header ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b theme-border theme-bg-secondary shrink-0">
              {/* Back button (mobile) */}
              <button
                className="md:hidden theme-text-secondary hover:theme-text text-xl"
                onClick={() => setSelectedId(null)}
              >←</button>

              <div className={`w-9 h-9 rounded-full ${avatarBg(selectedConv?.platform || "line")} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
                {getInitials(selectedConv?.name || "")}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold theme-text truncate">
                    {selectedConv?.name !== selectedConv?.id
                      ? selectedConv?.name
                      : (selectedConv?.id.substring(0, 20) + "…")}
                  </span>
                  {selectedConv?.platform && platformBadge(selectedConv.platform)}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs theme-text-muted">{selectedConv?.messageCount} ข้อความ</span>
                  {selectedConv?.customerSentiment && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      selectedConv.customerSentiment.level === "green" ? "bg-emerald-900/50 text-emerald-400" :
                      selectedConv.customerSentiment.level === "yellow" ? "bg-amber-900/50 text-amber-400" :
                      "bg-red-900/50 text-red-400"
                    }`}>
                      😊 {SENTIMENT_LABELS[selectedConv.customerSentiment.level]}
                    </span>
                  )}
                  {selectedConv?.purchaseIntent && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      selectedConv.purchaseIntent.level === "green" ? "bg-emerald-900/50 text-emerald-400" :
                      selectedConv.purchaseIntent.level === "yellow" ? "bg-amber-900/50 text-amber-400" :
                      "bg-red-900/50 text-red-400"
                    }`}>
                      🛒 {PURCHASE_LABELS[selectedConv.purchaseIntent.level]}
                    </span>
                  )}
                </div>
              </div>

              {/* Right panel toggle */}
              <button
                onClick={() => setShowRightPanel((v) => !v)}
                className={`p-2 rounded-lg transition text-sm ${showRightPanel ? "bg-indigo-900/50 text-indigo-400" : "theme-bg-card theme-text-secondary hover:theme-text"}`}
                title="ข้อมูลลูกค้า"
              >
                👤
              </button>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="theme-text-muted text-sm">ยังไม่มีข้อความ</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const showDate =
                    i === 0 ||
                    (messages[i - 1]?.createdAt &&
                      msg.createdAt &&
                      new Date(messages[i - 1].createdAt!).toDateString() !==
                        new Date(msg.createdAt).toDateString());
                  return (
                    <div key={msg._id}>
                      {showDate && msg.createdAt && <DateSeparator date={msg.createdAt} />}
                      <ChatBubble msg={msg} onZoom={setZoomImage} />
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Send Error ── */}
            {sendError && (
              <div className="mx-4 mb-1 px-3 py-2 bg-red-950/60 border border-red-800 rounded-lg flex items-center justify-between gap-2">
                <span className="text-xs text-red-400">⚠️ {sendError}</span>
                <button onClick={() => setSendError(null)} className="text-red-600 hover:text-red-400 text-xs">✕</button>
              </div>
            )}

            {/* ── Quick Reply Templates ── */}
            {showTemplates && (
              <div className="border-t theme-border theme-bg-secondary max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-2 border-b theme-border">
                  <span className="text-xs font-bold theme-text-secondary">⚡ Quick Reply</span>
                  <button onClick={() => setShowTemplates(false)} className="theme-text-muted hover:theme-text text-sm">✕</button>
                </div>
                {loadingTemplates ? (
                  <p className="text-xs text-center py-4 theme-text-muted">กำลังโหลด...</p>
                ) : templates.length === 0 ? (
                  <p className="text-xs text-center py-4 theme-text-muted">
                    ยังไม่มี template —{" "}
                    <a href="/dashboard/templates" className="text-indigo-400 underline">เพิ่มที่นี่</a>
                  </p>
                ) : (
                  <div className="p-2 space-y-1">
                    {templates.map((t) => (
                      <button
                        key={t._id}
                        onClick={() => {
                          setInputText(t.content);
                          setShowTemplates(false);
                          inputRef.current?.focus();
                          // bump usage count
                          fetch("/dashboard/api/templates", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: t._id }),
                          }).catch(() => {});
                        }}
                        className="w-full text-left theme-bg-card hover:theme-bg-hover rounded-lg px-3 py-2 text-xs transition"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium theme-text">{t.title}</span>
                          <span className="text-[10px] theme-text-muted bg-gray-700/40 px-1.5 rounded">
                            {CATEGORY_LABELS[t.category] || t.category}
                          </span>
                        </div>
                        <p className="theme-text-secondary line-clamp-2">{t.content}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Input Bar ── */}
            <div className="border-t theme-border theme-bg-secondary px-3 py-3 shrink-0">
              <div className="flex items-end gap-2">
                {/* Quick Reply toggle */}
                <button
                  onClick={() => {
                    setShowTemplates((v) => !v);
                    if (!showTemplates) fetchTemplates();
                  }}
                  className={`p-2 rounded-lg transition shrink-0 text-sm ${
                    showTemplates ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "theme-bg-card theme-text-secondary hover:theme-text"
                  }`}
                  title="Quick Reply Templates"
                >⚡</button>

                {/* Text input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      // auto-grow
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="พิมพ์ข้อความ… (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)"
                    disabled={sending}
                    className="w-full theme-input border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 resize-none transition disabled:opacity-50"
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                  />
                </div>

                {/* Send button */}
                <button
                  onClick={() => {
                    if (inputText.trim()) {
                      sendMessage(inputText);
                      setInputText("");
                      if (inputRef.current) inputRef.current.style.height = "40px";
                    }
                  }}
                  disabled={sending || !inputText.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-600 text-white rounded-xl transition shrink-0 flex items-center justify-center"
                  title="ส่ง (Enter)"
                >
                  {sending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] theme-text-muted mt-1.5 px-1">
                Enter = ส่ง · Shift+Enter = ขึ้นบรรทัด · ⚡ = ข้อความสำเร็จรูป
              </p>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT PANEL — Customer Info
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedId && selectedConv && (showRightPanel || typeof window !== "undefined") && (
        <aside
          className={`${
            showRightPanel ? "flex" : "hidden xl:flex"
          } flex-col w-72 shrink-0 theme-bg-secondary border-l theme-border overflow-y-auto`}
        >
          <CustomerInfoPanel
            conv={selectedConv}
            onClose={() => setShowRightPanel(false)}
          />
        </aside>
      )}
    </div>
  );
}

// ─── Customer Info Panel ──────────────────────────────────────────────────────

function CustomerInfoPanel({
  conv,
  onClose,
}: {
  conv: Conversation;
  onClose: () => void;
}) {
  const platform = conv.platform || "line";
  const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.line;
  const sentimentData = conv.customerSentiment || conv.sentiment;
  const purchaseData = conv.purchaseIntent;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b theme-border">
        <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider">ข้อมูลลูกค้า</span>
        <button onClick={onClose} className="xl:hidden theme-text-muted hover:theme-text text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Profile Card */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className={`w-16 h-16 rounded-2xl ${avatarBg(platform)} flex items-center justify-center text-2xl font-bold text-white`}>
            {getInitials(conv.name)}
          </div>
          <div>
            <p className="font-semibold theme-text text-sm">
              {conv.name !== conv.id ? conv.name : conv.id.substring(0, 20)}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              {platformBadge(platform)}
            </div>
            <p className="text-xs theme-text-muted mt-1 font-mono break-all">{conv.id}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="theme-bg-card rounded-xl p-3 text-center">
            <p className="text-xl font-bold theme-text">{conv.messageCount}</p>
            <p className="text-[10px] theme-text-muted mt-0.5">ข้อความ</p>
          </div>
          <div className="theme-bg-card rounded-xl p-3 text-center">
            <p className="text-xl font-bold theme-text">{conv.analysisLogsCount || 0}</p>
            <p className="text-[10px] theme-text-muted mt-0.5">วิเคราะห์</p>
          </div>
        </div>

        {/* Sentiment */}
        {(sentimentData || purchaseData) && (
          <div className="space-y-2">
            <p className="text-xs font-bold theme-text-secondary uppercase tracking-wider">การวิเคราะห์</p>
            {sentimentData && (
              <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                sentimentData.level === "green" ? "bg-emerald-950/60 border border-emerald-800/50" :
                sentimentData.level === "yellow" ? "bg-amber-950/60 border border-amber-800/50" :
                "bg-red-950/60 border border-red-800/50"
              }`}>
                <div>
                  <p className="text-xs font-medium theme-text">ความรู้สึกลูกค้า 😊</p>
                  <p className={`text-[11px] mt-0.5 ${
                    sentimentData.level === "green" ? "text-emerald-400" :
                    sentimentData.level === "yellow" ? "text-amber-400" : "text-red-400"
                  }`}>
                    {SENTIMENT_LABELS[sentimentData.level]}
                  </p>
                </div>
                <span className="text-lg font-bold theme-text">{sentimentData.score}%</span>
              </div>
            )}
            {purchaseData && (
              <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                purchaseData.level === "green" ? "bg-emerald-950/60 border border-emerald-800/50" :
                purchaseData.level === "yellow" ? "bg-amber-950/60 border border-amber-800/50" :
                "bg-red-950/60 border border-red-800/50"
              }`}>
                <div>
                  <p className="text-xs font-medium theme-text">โอกาสซื้อ 🛒</p>
                  <p className={`text-[11px] mt-0.5 ${
                    purchaseData.level === "green" ? "text-emerald-400" :
                    purchaseData.level === "yellow" ? "text-amber-400" : "text-red-400"
                  }`}>
                    {PURCHASE_LABELS[purchaseData.level]}
                  </p>
                </div>
                <span className="text-lg font-bold theme-text">{purchaseData.score}%</span>
              </div>
            )}
            {sentimentData?.reason && (
              <p className="text-xs theme-text-muted leading-relaxed px-1">{sentimentData.reason}</p>
            )}
          </div>
        )}

        {/* Last activity */}
        {conv.lastActivity && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold theme-text-secondary uppercase tracking-wider">กิจกรรมล่าสุด</p>
            <div className="theme-bg-card rounded-xl p-3 space-y-1">
              <p className="text-xs theme-text-secondary">
                {new Date(conv.lastActivity).toLocaleString("th-TH", {
                  day: "numeric", month: "long", year: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
              <p className="text-xs theme-text-secondary line-clamp-2">{conv.lastMessage}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold theme-text-secondary uppercase tracking-wider">Quick Actions</p>
          <div className="space-y-1">
            <a
              href={`/dashboard/crm`}
              className="flex items-center gap-2 w-full px-3 py-2 theme-bg-card hover:theme-bg-hover rounded-xl text-xs theme-text-secondary transition"
            >
              <span>👥</span>
              <span>ดูโปรไฟล์ CRM</span>
            </a>
            <a
              href={`/dashboard/tasks`}
              className="flex items-center gap-2 w-full px-3 py-2 theme-bg-card hover:theme-bg-hover rounded-xl text-xs theme-text-secondary transition"
            >
              <span>📋</span>
              <span>สร้าง Task</span>
            </a>
            <a
              href={`/dashboard`}
              className="flex items-center gap-2 w-full px-3 py-2 theme-bg-card hover:theme-bg-hover rounded-xl text-xs theme-text-secondary transition"
            >
              <span>📊</span>
              <span>ดู Dashboard</span>
            </a>
          </div>
        </div>

        {/* Platform source info */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold theme-text-secondary uppercase tracking-wider">แหล่งที่มา</p>
          <div className="theme-bg-card rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              {platformBadge(platform)}
              <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
            <p className="text-xs theme-text-muted font-mono break-all">{conv.id}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
