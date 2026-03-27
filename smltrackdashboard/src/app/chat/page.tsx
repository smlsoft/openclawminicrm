"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useNotificationContext } from "@/components/NotificationProvider";

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
  sticker?: { packageId: string; stickerId: string } | null;
  hasImage?: boolean;
  createdAt?: string;
  platform?: string;
  sendMethod?: string;
  isAutoReply?: boolean;
}

interface Conversation {
  id: string;
  name: string;
  platform: string;
  messageCount: number;
  lastMessage: string;
  lastActivity: string | null;
  sentiment?: { level: string } | null;
  customerSentiment?: { level: string } | null;
  purchaseIntent?: { level: string } | null;
}

interface ReplyTemplate {
  _id: string;
  title: string;
  content: string;
  category: string;
}

// ─── LINE Sticker Packages (ฟรี) ──────────────────────────────────────────────

const LINE_STICKER_PACKAGES = [
  {
    id: "446", name: "Moon",
    stickers: ["1988","1989","1990","1991","1992","1993","1994","1995","1996","1997","1998","1999","2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024","2025","2026","2027"],
  },
  {
    id: "789", name: "Sally",
    stickers: ["10855","10856","10857","10858","10859","10860","10861","10862","10863","10864","10865","10866","10867","10868","10869","10870","10871","10872","10873","10874","10875","10876","10877","10878","10879","10880","10881","10882","10883","10884","10885","10886","10887","10888","10889","10890","10891","10892","10893","10894"],
  },
  {
    id: "6359", name: "Brown & Cony",
    stickers: ["11069850","11069851","11069852","11069853","11069854","11069855","11069856","11069857","11069858","11069859","11069860","11069861","11069862","11069863","11069864","11069865","11069866","11069867","11069868","11069869","11069870","11069871","11069872","11069873"],
  },
  {
    id: "11537", name: "Brown & Cony Animated",
    stickers: ["52002734","52002735","52002736","52002737","52002738","52002739","52002740","52002741","52002742","52002743","52002744","52002745","52002746","52002747","52002748","52002749","52002750","52002751","52002752","52002753","52002754","52002755","52002756","52002757","52002758","52002759"],
  },
  {
    id: "11538", name: "CHOCO & Friends",
    stickers: ["51626494","51626495","51626496","51626497","51626498","51626499","51626500","51626501","51626502","51626503","51626504","51626505","51626506","51626507","51626508","51626509","51626510","51626511","51626512","51626513","51626514","51626515","51626516","51626517"],
  },
  {
    id: "11539", name: "UNIVERSTAR BT21",
    stickers: ["52114110","52114111","52114112","52114113","52114114","52114115","52114116","52114117","52114118","52114119","52114120","52114121","52114122","52114123","52114124","52114125","52114126","52114127","52114128","52114129","52114130","52114131","52114132","52114133"],
  },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, {
  label: string; icon: string; color: string; badgeBg: string; dot: string;
  borderColor: string; headerBg: string; sendBg: string; sendHover: string;
  placeholder: string; capabilities: string;
}> = {
  line: {
    label: "LINE", icon: "💚", color: "text-green-400", badgeBg: "bg-green-600", dot: "bg-green-400",
    borderColor: "border-green-500", headerBg: "bg-green-950/60", sendBg: "bg-green-600", sendHover: "hover:bg-green-500",
    placeholder: "พิมพ์ข้อความ LINE…",
    capabilities: "ข้อความ · รูป · สติกเกอร์ · วิดีโอ · เสียง · ตำแหน่ง · Flex",
  },
  facebook: {
    label: "Facebook", icon: "💙", color: "text-blue-400", badgeBg: "bg-blue-600", dot: "bg-blue-400",
    borderColor: "border-blue-500", headerBg: "bg-blue-950/60", sendBg: "bg-blue-600", sendHover: "hover:bg-blue-500",
    placeholder: "พิมพ์ข้อความ Messenger…",
    capabilities: "ข้อความ · รูป (เร็วๆ นี้)",
  },
  instagram: {
    label: "Instagram", icon: "💜", color: "text-pink-400", badgeBg: "bg-gradient-to-r from-purple-600 to-pink-600", dot: "bg-pink-400",
    borderColor: "border-pink-500", headerBg: "bg-pink-950/40", sendBg: "bg-gradient-to-r from-purple-600 to-pink-600", sendHover: "hover:brightness-110",
    placeholder: "พิมพ์ข้อความ Instagram DM…",
    capabilities: "ข้อความ · รูป (เร็วๆ นี้)",
  },
};

const MAX_PANELS = 4;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อกี้";
  if (mins < 60) return `${mins}น.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ชม.`;
  return `${Math.floor(hrs / 24)}ว.`;
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name.replace(/^(fb_|ig_)/, "").toUpperCase().substring(0, 2);
}

function avatarBg(platform: string): string {
  if (platform === "facebook") return "bg-blue-600";
  if (platform === "instagram") return "bg-pink-600";
  return "bg-green-600";
}

function stickerUrl(packageId: string, stickerId: string): string {
  return `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker@2x.png`;
}

// ─── ChatPanel Component (แต่ละจอสนทนา) ─────────────────────────────────────

function ChatPanel({
  conv,
  session,
  onClose,
}: {
  conv: Conversation;
  session: any;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastMethod, setLastMethod] = useState<string | null>(null);

  // Panels
  const [showStickers, setShowStickers] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [stickerPkg, setStickerPkg] = useState(LINE_STICKER_PACKAGES[0]);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);

  // AI Suggestions
  const [suggestions, setSuggestions] = useState<{ text: string; reason: string; tone: string; priority: string }[]>([]);
  const [suggestAnalysis, setSuggestAnalysis] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Memory / Skills
  const [showMemory, setShowMemory] = useState(false);
  const [memoryData, setMemoryData] = useState<any>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastMsgIdRef = useRef("");

  // ── Fetch messages ──
  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/dashboard/api/groups/${encodeURIComponent(conv.id)}/messages?limit=30`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        const newLast = data[data.length - 1]?._id;
        if (newLast && newLast !== lastMsgIdRef.current) {
          lastMsgIdRef.current = newLast;
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);
        }
      }
    } catch {}
    if (!silent) setLoading(false);
  }, [conv.id]);

  useEffect(() => {
    fetchMessages();
    const iv = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(iv);
  }, [fetchMessages]);

  // Initial scroll
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ block: "end" }), 100);
    }
  }, [loading]);

  // ── Fetch templates ──
  const fetchTemplates = useCallback(async () => {
    if (templates.length > 0) return;
    try {
      const res = await fetch("/dashboard/api/templates");
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch {}
  }, [templates.length]);

  // ── Memory / Skills ──
  const fetchMemory = useCallback(async () => {
    setMemoryLoading(true);
    try {
      const res = await fetch(`/dashboard/api/memory/${encodeURIComponent(conv.id)}`);
      const data = await res.json();
      setMemoryData(data);
    } catch {}
    setMemoryLoading(false);
  }, [conv.id]);

  // ── AI Suggest ──
  const fetchSuggestions = useCallback(async () => {
    setSuggestLoading(true);
    setSuggestions([]);
    setSuggestAnalysis("");
    try {
      const res = await fetch("/dashboard/api/inbox/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: conv.id }),
      });
      const data = await res.json();
      if (data.suggestions) setSuggestions(data.suggestions);
      if (data.analysis) setSuggestAnalysis(data.analysis);
    } catch {}
    setSuggestLoading(false);
  }, [conv.id]);

  // ── Send message ──
  const sendMessage = useCallback(async (payload: Record<string, any>) => {
    setSending(true);
    setSendError(null);
    setLastMethod(null);

    // Optimistic update for text
    if (payload.text) {
      const tempMsg: Message = {
        _id: `temp-${Date.now()}`,
        role: "assistant",
        userName: session?.user?.name || "พนักงาน",
        content: payload.text,
        messageType: "text",
        createdAt: new Date().toISOString(),
        platform: conv.platform,
      };
      setMessages((prev) => [...prev, tempMsg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 60);
    }

    try {
      const res = await fetch("/dashboard/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: conv.id,
          platform: conv.platform || "line",
          staffName: session?.user?.name || "พนักงาน",
          ...payload,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "ส่งไม่สำเร็จ");
      setLastMethod(result.method || null);
      setTimeout(() => fetchMessages(true), 300);
    } catch (e: any) {
      setSendError(e.message);
      if (payload.text) {
        setMessages((prev) => prev.filter((m) => !m._id.startsWith("temp-")));
      }
    }
    setSending(false);
  }, [conv.id, conv.platform, session, fetchMessages]);

  const handleSendText = () => {
    if (!inputText.trim()) return;
    sendMessage({ text: inputText.trim() });
    setInputText("");
    if (inputRef.current) inputRef.current.style.height = "36px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
    if (e.key === "Escape") {
      setShowStickers(false);
      setShowTemplates(false);
      setShowAttach(false);
    }
  };

  // ── Send sticker ──
  const handleSendSticker = (packageId: string, stickerId: string) => {
    sendMessage({ sticker: { packageId, stickerId } });
    setShowStickers(false);
  };

  // ── Upload image ──
  const handleImageUpload = async (file: File) => {
    setSending(true);
    setSendError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const agentUrl = "/dashboard/api/inbox/upload";
      // Try direct to agent first
      const uploadRes = await fetch(agentUrl, { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("อัพโหลดรูปไม่สำเร็จ");
      const { imageUrl } = await uploadRes.json();
      await sendMessage({ imageUrl });
    } catch (e: any) {
      setSendError(e.message);
    }
    setSending(false);
    setShowAttach(false);
  };

  // ── Send location ──
  const handleSendLocation = () => {
    if (!navigator.geolocation) {
      setSendError("เบราว์เซอร์ไม่รองรับ GPS");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendMessage({
          location: {
            title: "ตำแหน่งของฉัน",
            address: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
        });
        setShowAttach(false);
      },
      () => setSendError("ไม่สามารถเข้าถึง GPS")
    );
  };

  const platform = conv.platform || "line";
  const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.line;

  return (
    <div className={`flex flex-col h-full min-w-0 border-t-3 theme-bg ${cfg.borderColor}`}>
      {/* ── Header — สีตาม platform ── */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b theme-border shrink-0 ${cfg.headerBg}`}>
        <div className={`w-8 h-8 rounded-full ${avatarBg(platform)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
          {getInitials(conv.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold theme-text truncate">
              {conv.name !== conv.id ? conv.name : conv.id.substring(0, 12) + "…"}
            </span>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${cfg.badgeBg} text-white leading-none`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] theme-text-muted">{conv.messageCount} ข้อความ</span>
            {lastMethod && (
              <span className={`text-[9px] px-1 py-0.5 rounded ${
                lastMethod === "reply" ? "bg-green-900/50 text-green-400" : "bg-amber-900/50 text-amber-400"
              }`}>
                {lastMethod === "reply" ? "✓ Reply (ฟรี)" : "Push"}
              </span>
            )}
          </div>
          {/* Platform capabilities */}
          <p className={`text-[9px] mt-0.5 ${cfg.color} opacity-60`}>{cfg.capabilities}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-red-900/40 text-red-400 hover:text-red-300 transition text-sm shrink-0"
          title="ปิด"
        >✕</button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 min-h-0">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="theme-text-muted text-xs">ยังไม่มีข้อความ</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const showDate = i === 0 || (
              messages[i-1]?.createdAt && msg.createdAt &&
              new Date(messages[i-1].createdAt!).toDateString() !== new Date(msg.createdAt).toDateString()
            );
            return (
              <div key={msg._id}>
                {showDate && msg.createdAt && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px theme-bg-card" />
                    <span className="text-[10px] theme-text-muted px-2 py-0.5 theme-bg-card rounded-full">
                      {new Date(msg.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                    </span>
                    <div className="flex-1 h-px theme-bg-card" />
                  </div>
                )}
                <ChatBubble msg={msg} />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Send Error ── */}
      {sendError && (
        <div className="mx-2 mb-1 px-2 py-1 bg-red-950/60 border border-red-800 rounded text-[10px] text-red-400 flex items-center justify-between">
          <span>⚠️ {sendError}</span>
          <button onClick={() => setSendError(null)} className="text-red-600 hover:text-red-400 ml-2">✕</button>
        </div>
      )}

      {/* ── Sticker Picker ── */}
      {showStickers && (
        <div className="border-t theme-border theme-bg-secondary max-h-52 overflow-hidden flex flex-col">
          {/* Package tabs */}
          <div className="flex gap-1 px-2 py-1.5 border-b theme-border overflow-x-auto shrink-0">
            {LINE_STICKER_PACKAGES.map(pkg => (
              <button
                key={pkg.id}
                onClick={() => setStickerPkg(pkg)}
                className={`text-[10px] px-2 py-1 rounded whitespace-nowrap transition ${
                  stickerPkg.id === pkg.id ? "bg-indigo-600 text-white" : "theme-bg-card theme-text-secondary hover:theme-text"
                }`}
              >
                {pkg.name}
              </button>
            ))}
          </div>
          {/* Sticker grid */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-5 gap-1">
              {stickerPkg.stickers.slice(0, 20).map(sid => (
                <button
                  key={sid}
                  onClick={() => handleSendSticker(stickerPkg.id, sid)}
                  className="aspect-square rounded-lg hover:bg-indigo-900/30 transition p-1 flex items-center justify-center"
                  title={`Sticker ${sid}`}
                >
                  <img
                    src={stickerUrl(stickerPkg.id, sid)}
                    alt="sticker"
                    className="w-full h-full object-contain"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Templates Panel ── */}
      {showTemplates && (
        <div className="border-t theme-border theme-bg-secondary max-h-44 overflow-y-auto">
          <div className="p-2 space-y-1">
            {templates.length === 0 ? (
              <p className="text-[10px] text-center py-3 theme-text-muted">ยังไม่มี template</p>
            ) : templates.map(t => (
              <button
                key={t._id}
                onClick={() => {
                  setInputText(t.content);
                  setShowTemplates(false);
                  inputRef.current?.focus();
                }}
                className="w-full text-left theme-bg-card hover:theme-bg-hover rounded px-2 py-1.5 text-[11px] transition"
              >
                <span className="font-medium theme-text">{t.title}</span>
                <p className="theme-text-secondary line-clamp-1 mt-0.5">{t.content}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Memory & Skills Panel ── */}
      {showMemory && (
        <div className="border-t theme-border theme-bg-secondary max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-1.5 border-b theme-border">
            <span className="text-[11px] font-bold text-purple-400">🧠 Memory + Skills</span>
            <div className="flex items-center gap-2">
              <button onClick={fetchMemory} disabled={memoryLoading} className="text-[10px] text-purple-400 hover:text-purple-300 disabled:opacity-50">
                {memoryLoading ? "โหลด..." : "🔄 รีเฟรช"}
              </button>
              <button onClick={() => setShowMemory(false)} className="theme-text-muted hover:theme-text text-sm">✕</button>
            </div>
          </div>

          {memoryLoading ? (
            <div className="flex items-center justify-center py-6">
              <span className="text-[11px] theme-text-muted">กำลังโหลด Memory...</span>
            </div>
          ) : !memoryData ? (
            <p className="text-[11px] text-center py-4 theme-text-muted">ไม่มีข้อมูล</p>
          ) : (
            <div className="p-2 space-y-2">
              {/* Customer Memory */}
              {memoryData.memory?.compactSummary && (
                <div className="theme-bg-card rounded-lg px-3 py-2 border theme-border">
                  <p className="text-[10px] font-bold text-purple-400 mb-1">👤 จำลูกค้า</p>
                  <p className="text-[11px] theme-text leading-relaxed">{memoryData.memory.compactSummary}</p>
                  {memoryData.memory.personality && (
                    <p className="text-[10px] theme-text-muted mt-1">สไตล์: <span className="text-purple-300">{memoryData.memory.personality}</span></p>
                  )}
                  {memoryData.memory.bestApproach && (
                    <p className="text-[10px] theme-text-muted">วิธีตอบ: <span className="text-cyan-300">{memoryData.memory.bestApproach}</span></p>
                  )}
                  {memoryData.memory.interests?.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {memoryData.memory.interests.map((i: string, idx: number) => (
                        <span key={idx} className="text-[9px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded">
                          {i}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 mt-1.5 text-[9px] theme-text-muted">
                    <span>💬 {memoryData.memory.messageCount || 0} ข้อความ</span>
                    {memoryData.memory.purchaseCount > 0 && <span className="text-green-400">🛒 ซื้อ {memoryData.memory.purchaseCount} ครั้ง</span>}
                    {memoryData.memory.positiveCount > 0 && <span className="text-emerald-400">👍 ชม {memoryData.memory.positiveCount}</span>}
                    {memoryData.memory.negativeCount > 0 && <span className="text-red-400">👎 ร้องเรียน {memoryData.memory.negativeCount}</span>}
                  </div>
                </div>
              )}

              {!memoryData.memory?.compactSummary && (
                <div className="theme-bg-card rounded-lg px-3 py-2 border theme-border">
                  <p className="text-[10px] theme-text-muted text-center">
                    ยังไม่มี Memory — AI จะสร้างอัตโนมัติหลังคุยครบ 10 ข้อความ
                  </p>
                  {memoryData.memory?.messageCount > 0 && (
                    <p className="text-[9px] theme-text-muted text-center mt-1">
                      ตอนนี้ {memoryData.memory.messageCount}/10 ข้อความ
                    </p>
                  )}
                </div>
              )}

              {/* Skill Lessons สำหรับลูกค้าคนนี้ */}
              {memoryData.lessons?.length > 0 && (
                <div className="theme-bg-card rounded-lg px-3 py-2 border theme-border">
                  <p className="text-[10px] font-bold text-amber-400 mb-1">📝 บทเรียน AI เฉพาะลูกค้าคนนี้</p>
                  {memoryData.lessons.slice(0, 5).map((l: any, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 mb-1">
                      <span className="text-[9px] shrink-0">
                        {l.outcomeType === "purchase" ? "🛒" : l.outcomeType === "positive" ? "👍" : l.outcomeType === "negative" ? "👎" : "📝"}
                      </span>
                      <div>
                        {l.rule && <p className="text-[10px] theme-text">{l.rule}</p>}
                        {l.whatWorked && <p className="text-[9px] text-green-400">✓ {l.whatWorked}</p>}
                        {l.whatFailed && <p className="text-[9px] text-red-400">✗ {l.whatFailed}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Global Skills */}
              {memoryData.globalLessons?.length > 0 && (
                <div className="theme-bg-card rounded-lg px-3 py-2 border theme-border">
                  <p className="text-[10px] font-bold text-cyan-400 mb-1">🌐 บทเรียน AI ภาพรวม (จากลูกค้าทุกคน)</p>
                  {memoryData.globalLessons.slice(0, 5).map((l: any, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 mb-1">
                      <span className="text-[9px] shrink-0">
                        {l.outcomeType === "purchase" ? "🛒" : l.outcomeType === "positive" ? "👍" : l.outcomeType === "negative" ? "👎" : "📝"}
                      </span>
                      <p className="text-[10px] theme-text-secondary">{l.rule}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── AI Suggestion Panel ── */}
      {showSuggest && (
        <div className="border-t theme-border theme-bg-secondary max-h-52 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-1.5 border-b theme-border">
            <span className="text-[11px] font-bold text-indigo-400">💡 AI แนะนำคำตอบ</span>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchSuggestions}
                disabled={suggestLoading}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
              >
                {suggestLoading ? "กำลังวิเคราะห์..." : "🔄 วิเคราะห์ใหม่"}
              </button>
              <button onClick={() => setShowSuggest(false)} className="theme-text-muted hover:theme-text text-sm">✕</button>
            </div>
          </div>

          {suggestLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />
                ))}
              </div>
              <span className="text-[11px] theme-text-muted ml-3">AI กำลังวิเคราะห์บทสนทนา...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-[11px] text-center py-4 theme-text-muted">กดปุ่ม "วิเคราะห์ใหม่" เพื่อรับคำแนะนำ</p>
          ) : (
            <div className="p-2 space-y-1.5">
              {/* Analysis summary */}
              {suggestAnalysis && (
                <div className="px-2 py-1.5 bg-indigo-950/40 border border-indigo-800/30 rounded-lg">
                  <p className="text-[10px] text-indigo-300">📊 {suggestAnalysis}</p>
                </div>
              )}
              {/* Suggestions */}
              {suggestions.map((s, i) => {
                const toneColors: Record<string, string> = {
                  friendly: "bg-green-900/40 text-green-400",
                  professional: "bg-blue-900/40 text-blue-400",
                  urgent: "bg-red-900/40 text-red-400",
                  empathetic: "bg-purple-900/40 text-purple-400",
                };
                const toneLabels: Record<string, string> = {
                  friendly: "เป็นมิตร", professional: "มืออาชีพ",
                  urgent: "เร่งด่วน", empathetic: "เห็นอกเห็นใจ",
                };
                const priorityIcons: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };
                return (
                  <div key={i} className="theme-bg-card rounded-lg px-3 py-2 border theme-border">
                    {/* Header: tone + priority */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px]">{priorityIcons[s.priority] || "🟡"}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${toneColors[s.tone] || toneColors.friendly}`}>
                        {toneLabels[s.tone] || s.tone}
                      </span>
                      <span className="text-[9px] theme-text-muted">ตัวเลือก {i + 1}</span>
                    </div>

                    {/* ข้อความแนะนำ */}
                    <p className="text-[12px] theme-text leading-relaxed mb-1.5 whitespace-pre-wrap">{s.text}</p>

                    {/* เหตุผล */}
                    <p className="text-[10px] theme-text-muted mb-2">💡 <em>{s.reason}</em></p>

                    {/* ปุ่ม: ใช้เลย + Copy */}
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setInputText(s.text);
                          setShowSuggest(false);
                          inputRef.current?.focus();
                        }}
                        className={`flex-1 text-center text-[11px] py-1.5 rounded-lg ${cfg.sendBg} text-white ${cfg.sendHover} transition font-medium`}
                      >
                        ใช้เลย →
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(s.text);
                          // flash feedback
                          const el = document.getElementById(`copy-${conv.id}-${i}`);
                          if (el) { el.textContent = "✓ copied!"; setTimeout(() => { el.textContent = "📋 Copy"; }, 1500); }
                        }}
                        id={`copy-${conv.id}-${i}`}
                        className="px-3 py-1.5 text-[11px] rounded-lg theme-bg-hover theme-text-secondary hover:theme-text transition"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Attach Menu ── */}
      {showAttach && (
        <div className="border-t theme-border theme-bg-secondary px-3 py-2">
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:theme-bg-hover transition"
            >
              <span className="text-xl">🖼️</span>
              <span className="text-[10px] theme-text-secondary">รูปภาพ</span>
            </button>
            <button
              onClick={handleSendLocation}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:theme-bg-hover transition"
            >
              <span className="text-xl">📍</span>
              <span className="text-[10px] theme-text-secondary">ตำแหน่ง</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Input Bar (2 แถว: toolbar + input เต็มจอ) ── */}
      <div className="border-t theme-border theme-bg-secondary px-2 py-1.5 shrink-0">
        {/* แถว 1: Toolbar */}
        <div className="flex items-center gap-1 mb-1">
          <button
            onClick={() => { setShowAttach(v => !v); setShowStickers(false); setShowTemplates(false); setShowSuggest(false); }}
            className={`p-1 rounded transition text-sm ${showAttach ? "bg-indigo-900/50 text-indigo-400" : "theme-text-secondary hover:theme-text"}`}
            title="แนบไฟล์"
          >📎</button>
          {platform === "line" && (
            <button
              onClick={() => { setShowStickers(v => !v); setShowTemplates(false); setShowAttach(false); setShowSuggest(false); }}
              className={`p-1 rounded transition text-sm ${showStickers ? "bg-indigo-900/50 text-indigo-400" : "theme-text-secondary hover:theme-text"}`}
              title="สติกเกอร์"
            >😀</button>
          )}
          <button
            onClick={() => { setShowTemplates(v => !v); setShowStickers(false); setShowAttach(false); setShowSuggest(false); if (!showTemplates) fetchTemplates(); }}
            className={`p-1 rounded transition text-sm ${showTemplates ? "bg-amber-500/20 text-amber-400" : "theme-text-secondary hover:theme-text"}`}
            title="ข้อความสำเร็จรูป"
          >⚡</button>
          <button
            onClick={() => { setShowSuggest(v => !v); setShowStickers(false); setShowTemplates(false); setShowAttach(false); if (!showSuggest) fetchSuggestions(); }}
            className={`p-1 rounded transition text-sm ${showSuggest ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30" : "theme-text-secondary hover:theme-text"}`}
            title="AI แนะนำคำตอบ"
          >💡</button>
          {/* Memory toggle */}
          <button
            onClick={() => { setShowMemory(v => !v); setShowStickers(false); setShowTemplates(false); setShowAttach(false); setShowSuggest(false); if (!showMemory) fetchMemory(); }}
            className={`p-1 rounded transition text-sm ${showMemory ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30" : "theme-text-secondary hover:theme-text"}`}
            title="🧠 Memory + Skills ของลูกค้า"
          >🧠</button>
          <span className={`ml-auto text-[9px] ${cfg.color} opacity-50`}>{cfg.label}</span>
        </div>
        {/* แถว 2: Input เต็มความกว้าง + ปุ่มส่ง */}
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder={cfg.placeholder}
            disabled={sending}
            className="w-full theme-input border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none transition disabled:opacity-50"
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
          <button
            onClick={handleSendText}
            disabled={sending || !inputText.trim()}
            className={`p-2.5 ${cfg.sendBg} ${cfg.sendHover} disabled:bg-gray-700 disabled:text-gray-600 text-white rounded-lg transition shrink-0`}
            title={`ส่งผ่าน ${cfg.label}`}
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── ChatBubble ──────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: Message }) {
  const isStaff = msg.role === "assistant";
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  return (
    <>
      {zoomImg && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center cursor-zoom-out" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="ขยาย" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
      <div className={`flex ${isStaff ? "justify-end" : "justify-start"} mb-0.5`}>
        <div className={`relative max-w-[80%] px-2.5 py-1.5 text-sm rounded-2xl ${
          isStaff
            ? msg.isAutoReply ? "bg-amber-700/60 text-white rounded-br-sm" : "bg-indigo-600 text-white rounded-br-sm"
            : "theme-bg-card theme-text rounded-bl-sm"
        }`}>
          {/* User name */}
          {msg.userName && (
            <p className={`text-[10px] font-semibold mb-0.5 ${
              isStaff ? (msg.isAutoReply ? "text-amber-200" : "text-indigo-200") : "text-sky-400"
            }`}>
              {msg.userName}
            </p>
          )}
          {/* Sticker */}
          {msg.sticker && (
            <img
              src={stickerUrl(msg.sticker.packageId, msg.sticker.stickerId)}
              alt="sticker"
              className="w-24 h-24 object-contain"
              loading="lazy"
            />
          )}
          {/* Image */}
          {(msg.hasImage || msg.imageUrl) && !msg.sticker && (
            <img
              src={msg.imageUrl || ""}
              alt="รูปภาพ"
              loading="lazy"
              className="rounded-lg max-w-full max-h-44 object-cover mb-1 cursor-zoom-in hover:brightness-90 transition"
              onClick={() => msg.imageUrl && setZoomImg(msg.imageUrl)}
            />
          )}
          {/* Video */}
          {msg.videoUrl && (
            <video src={msg.videoUrl} controls className="rounded-lg max-w-full max-h-44 mb-1" />
          )}
          {/* Location */}
          {msg.location && (
            <a
              href={`https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs underline text-sky-300 hover:text-sky-200"
            >
              📍 {msg.location.title || "ดูแผนที่"}
            </a>
          )}
          {/* Text */}
          {msg.content && !msg.sticker && msg.messageType !== "sticker" && (
            <p className="whitespace-pre-wrap break-words leading-relaxed text-[13px]">{msg.content}</p>
          )}
          {/* Time + send method */}
          <div className="flex items-center justify-end gap-1 mt-0.5">
            {msg.sendMethod && isStaff && (
              <span className={`text-[8px] ${msg.sendMethod === "reply" ? "text-green-300" : "text-amber-300"}`}>
                {msg.sendMethod === "reply" ? "✓ฟรี" : "push"}
              </span>
            )}
            {msg.createdAt && (
              <span className={`text-[9px] ${isStaff ? "text-indigo-300" : "theme-text-muted"}`}>
                {new Date(msg.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [openPanels, setOpenPanels] = useState<string[]>([]);
  // platformFilter removed — now uses chatPlatform (API-level filter)
  const [searchQuery, setSearchQuery] = useState("");

  // Auth guard
  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/dashboard/login");
  }, [authStatus, router]);

  // Fetch ALL conversations — fast API (1 query, ไม่ดึง messages array)
  const [chatPlatform, setChatPlatform] = useState("");
  const [totalPlatformCounts, setTotalPlatformCounts] = useState<Record<string, number>>({});

  const fetchConversations = useCallback(async (_p = 0, _a = false, platform = "") => {
    try {
      const pfParam = platform ? `?platform=${platform}` : "";
      const res = await fetch(`/dashboard/api/chat-list${pfParam}`);
      const raw = await res.json();
      const data = raw.conversations || raw.groups || (Array.isArray(raw) ? raw : []);
      setConversations(data);

      // ดึง counts รวมครั้งเดียว (ตอนไม่มี filter)
      if (!platform) {
        const counts: Record<string, number> = { all: data.length };
        for (const c of data) {
          const p = c.platform || "line";
          counts[p] = (counts[p] || 0) + 1;
        }
        setTotalPlatformCounts(counts);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations(0, false, chatPlatform);
    const iv = setInterval(() => fetchConversations(0, false, chatPlatform), 15000);
    return () => clearInterval(iv);
  }, [fetchConversations, chatPlatform]);

  const { markSeen } = useNotificationContext();

  // Open panel + mark as seen
  const openChat = (id: string) => {
    if (openPanels.includes(id)) return;
    setOpenPanels((prev) => {
      const next = [...prev, id];
      if (next.length > MAX_PANELS) next.shift();
      return next;
    });
    markSeen(id); // แจ้งว่าอ่านแล้ว
  };

  const closeChat = (id: string) => {
    setOpenPanels((prev) => prev.filter((p) => p !== id));
  };

  // Filter — platform handled by API, search client-side only
  const filtered = conversations.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    }
    return true;
  });

  // ใช้ counts จากตอนโหลดครั้งแรก (ไม่เปลี่ยนตาม filter)
  const platformCounts = {
    all: totalPlatformCounts.all || conversations.length,
    line: totalPlatformCounts.line || 0,
    facebook: totalPlatformCounts.facebook || 0,
    instagram: totalPlatformCounts.instagram || 0,
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-screen theme-bg theme-text overflow-hidden">
      {/* ═══ LEFT — Conversation List ═══ */}
      <aside className={`flex flex-col w-full md:w-64 shrink-0 theme-bg-secondary border-r theme-border ${openPanels.length > 0 ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-b theme-border">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-bold theme-text flex items-center gap-1.5">
              💬 แชท
              <span className="text-[10px] theme-text-muted font-normal">Multi-Panel</span>
            </h1>
            <span className="text-[10px] theme-text-muted theme-bg-card px-1.5 py-0.5 rounded-full">
              เปิด {openPanels.length}/{MAX_PANELS}
            </span>
          </div>
          {/* Search */}
          <input
            type="text"
            placeholder="🔍 ค้นหา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full theme-input border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Platform filter */}
        <div className="px-2 py-1.5 border-b theme-border flex gap-1 flex-wrap">
          {(["","line","facebook","instagram"] as const).map(p => {
            const isActive = chatPlatform === p;
            const labels: Record<string, string> = { "": "ทั้งหมด", line: "LINE", facebook: "FB", instagram: "IG" };
            const activeColors: Record<string, string> = {
              "": "bg-white text-black", line: "bg-green-600 text-white",
              facebook: "bg-blue-600 text-white", instagram: "bg-gradient-to-r from-purple-600 to-pink-600 text-white",
            };
            return (
              <button
                key={p}
                onClick={() => setChatPlatform(p)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition flex items-center gap-0.5 ${
                  isActive ? activeColors[p] : "theme-bg-card theme-text-secondary"
                }`}
              >
                {labels[p]}
                <span className="text-[9px] px-0.5 rounded-full bg-black/20">{p === "" ? conversations.length : platformCounts[p as "line"|"facebook"|"instagram"]}</span>
              </button>
            );
          })}
        </div>

        {/* Conversation list — แยกสีตาม platform */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-1">
              <span className="text-2xl">💬</span>
              <p className="text-[11px] theme-text-muted">ไม่พบบทสนทนา</p>
            </div>
          ) : filtered.map(conv => {
            const isOpen = openPanels.includes(conv.id);
            const platform = conv.platform || "line";
            const pcfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.line;
            const sentimentLevel = conv.customerSentiment?.level || conv.sentiment?.level;

            // แถบสีซ้ายตาม platform
            const leftBorderColor = platform === "line" ? "border-l-green-500"
              : platform === "facebook" ? "border-l-blue-500"
              : "border-l-pink-500";

            // ไฮไลท์ถ้าเพิ่งมีข้อความ (<2 นาที)
            const isRecent = conv.lastActivity && (Date.now() - new Date(conv.lastActivity).getTime()) < 120000;

            return (
              <button
                key={conv.id}
                onClick={() => openChat(conv.id)}
                className={`w-full text-left px-2.5 py-2 flex items-start gap-2 transition border-b theme-border border-l-2 hover:theme-bg-hover ${
                  isOpen ? `${leftBorderColor} bg-opacity-20 ${platform === "line" ? "bg-green-950/40" : platform === "facebook" ? "bg-blue-950/40" : "bg-pink-950/40"}`
                    : `${leftBorderColor} border-l-opacity-30`
                } ${isRecent && !isOpen ? "animate-pulse-subtle" : ""}`}
              >
                <div className="relative shrink-0">
                  <div className={`w-8 h-8 rounded-full ${avatarBg(platform)} flex items-center justify-center text-[10px] font-bold text-white`}>
                    {getInitials(conv.name)}
                  </div>
                  {sentimentLevel && (
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                      sentimentLevel === "red" ? "bg-red-500" : sentimentLevel === "yellow" ? "bg-amber-400" : "bg-emerald-500"
                    }`} style={{ borderColor: 'var(--bg-secondary)' }} />
                  )}
                  {/* ข้อความใหม่ indicator */}
                  {isRecent && !isOpen && (
                    <span className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-semibold truncate flex-1 ${isOpen ? pcfg.color : isRecent ? "theme-text font-bold" : "theme-text"}`}>
                      {conv.name !== conv.id ? conv.name : conv.id.substring(0, 12) + "…"}
                    </span>
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${pcfg.badgeBg} text-white leading-none`}>
                      {pcfg.icon} {pcfg.label}
                    </span>
                  </div>
                  <p className={`text-[10px] truncate mt-0.5 ${isRecent ? "theme-text-secondary font-medium" : "theme-text-muted"}`}>
                    {conv.lastMessage || "—"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] theme-text-muted">{timeAgo(conv.lastActivity)}</span>
                    {conv.purchaseIntent?.level === "red" && (
                      <span className="text-[8px] bg-red-900/50 text-red-400 px-1 rounded">สนใจซื้อ!</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {/* All loaded automatically */}
        </div>
      </aside>

      {/* ═══ RIGHT — Chat Panels (side by side) ═══ */}
      <div className={`flex-1 min-w-0 gap-[2px] bg-black/40 ${openPanels.length > 0 ? "flex" : "hidden md:flex"}`}>
        {openPanels.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-16 h-16 theme-bg-card rounded-2xl flex items-center justify-center text-3xl">💬</div>
            <div>
              <h2 className="text-base font-bold theme-text mb-1">เลือกบทสนทนา</h2>
              <p className="text-xs theme-text-muted">คลิกชื่อลูกค้าทางซ้ายเพื่อเปิดแชท — สูงสุด {MAX_PANELS} จอพร้อมกัน</p>
            </div>

            {/* Platform Summary */}
            <div className="flex gap-3 mt-2">
              <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-green-950/30 border border-green-800/30">
                <span className="text-2xl">💚</span>
                <span className="text-lg font-bold text-green-400">{platformCounts.line}</span>
                <span className="text-[10px] text-green-400/70">LINE</span>
              </div>
              <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-blue-950/30 border border-blue-800/30">
                <span className="text-2xl">💙</span>
                <span className="text-lg font-bold text-blue-400">{platformCounts.facebook}</span>
                <span className="text-[10px] text-blue-400/70">Facebook</span>
              </div>
              <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-pink-950/30 border border-pink-800/30">
                <span className="text-2xl">💜</span>
                <span className="text-lg font-bold text-pink-400">{platformCounts.instagram}</span>
                <span className="text-[10px] text-pink-400/70">Instagram</span>
              </div>
            </div>

            {/* Features */}
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] theme-text-muted text-left">
              <p>📱 <strong className="text-green-400">Reply API</strong> — ตอบ LINE ฟรี!</p>
              <p>🤖 <strong className="text-amber-400">AI อัตโนมัติ</strong> — 5 นาที ไม่ตอบ</p>
              <p>💡 <strong className="text-indigo-400">AI แนะนำ</strong> — คำตอบ + เหตุผล</p>
              <p>😀 <strong className="text-green-400">Sticker</strong> — LINE สติกเกอร์ฟรี</p>
              <p>🖼️ <strong className="theme-text">รูปภาพ</strong> — อัพโหลดและส่ง</p>
              <p>📍 <strong className="theme-text">ตำแหน่ง</strong> — แชร์ GPS</p>
            </div>

            {/* Platform capabilities */}
            <div className="mt-3 text-[10px] theme-text-muted space-y-1">
              <p><span className="text-green-400">LINE:</span> ข้อความ · รูป · สติกเกอร์ · วิดีโอ · เสียง · ตำแหน่ง · Flex</p>
              <p><span className="text-blue-400">Facebook:</span> ข้อความ · รูป (เร็วๆ นี้)</p>
              <p><span className="text-pink-400">Instagram:</span> ข้อความ · รูป (เร็วๆ นี้)</p>
            </div>
          </div>
        ) : (
          openPanels.map((panelId) => {
            const conv = conversations.find(c => c.id === panelId);
            if (!conv) return null;
            return (
              <div key={panelId} className="flex-1 min-w-0">
                <ChatPanel
                  conv={conv}
                  session={session}
                  onClose={() => closeChat(panelId)}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
