"use client";

import { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";

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
  sourceId?: string;
  sendMethod?: string;
  isAutoReply?: boolean;
}

interface Customer {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  rooms: string[];
}

const PLATFORM_CFG: Record<string, { label: string; icon: string; color: string; bgLight: string; border: string }> = {
  line:      { label: "LINE",      icon: "💚", color: "text-green-400", bgLight: "bg-green-500/10",  border: "border-green-500/30" },
  facebook:  { label: "Facebook",  icon: "💙", color: "text-blue-400",  bgLight: "bg-blue-500/10",   border: "border-blue-500/30" },
  instagram: { label: "Instagram", icon: "💜", color: "text-pink-400",  bgLight: "bg-pink-500/10",   border: "border-pink-500/30" },
};

function detectPlatform(sourceId: string): string {
  if (sourceId.startsWith("fb_")) return "facebook";
  if (sourceId.startsWith("ig_")) return "instagram";
  return "line";
}

function msgPlatform(msg: Message): string {
  if (msg.platform) return msg.platform;
  if (msg.sourceId) return detectPlatform(msg.sourceId);
  return "line";
}

function stickerUrl(packageId: string, stickerId: string): string {
  return `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker@2x.png`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function customerDisplayName(c: Customer): string {
  if (c.firstName || c.lastName) return `${c.firstName || ""} ${c.lastName || ""}`.trim();
  return c.name;
}

export default function CustomerConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomCount, setRoomCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/dashboard/api/customers/${id}/conversations`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setCustomer(data.customer);
          setMessages(data.messages || []);
          setRoomCount(data.roomCount || 0);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [id]);

  const platformSet = useMemo(
    () => new Set(messages.map(msgPlatform)),
    [messages]
  );

  if (loading) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <span className="theme-text-muted text-sm">กำลังโหลดสนทนา...</span>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-base">{error || "ไม่พบลูกค้า"}</p>
          <Link href="/crm" className="text-sm text-indigo-400 hover:text-indigo-300 underline">
            กลับหน้า CRM
          </Link>
        </div>
      </div>
    );
  }

  const displayName = customerDisplayName(customer);

  return (
    <div className="min-h-screen theme-bg theme-text">
      {zoomImg && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center cursor-zoom-out" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="ขยาย" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}

      <header className="border-b theme-border px-3 md:px-6 py-4 sticky top-0 z-10" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href={`/crm/${id}`} className="theme-text-muted hover:theme-text text-xl shrink-0">
              &larr;
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              {customer.avatarUrl ? (
                <img src={customer.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 theme-border shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {displayName.substring(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-base font-bold truncate">{displayName}</h1>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {Array.from(platformSet).map((p) => {
                    const cfg = PLATFORM_CFG[p] || PLATFORM_CFG.line;
                    return (
                      <span key={p} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bgLight} ${cfg.color} ${cfg.border}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    );
                  })}
                  <span className="text-sm theme-text-muted">{messages.length} ข้อความ</span>
                  <span className="text-sm theme-text-muted">{roomCount} ห้อง</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-3 md:p-6 pb-24 md:pb-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="theme-text-muted text-sm">ยังไม่มีข้อความ</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, i) => {
              const showDate = i === 0 || (
                messages[i - 1]?.createdAt && msg.createdAt &&
                new Date(messages[i - 1].createdAt!).toDateString() !== new Date(msg.createdAt!).toDateString()
              );
              const platform = msgPlatform(msg);
              const cfg = PLATFORM_CFG[platform] || PLATFORM_CFG.line;
              const isStaff = msg.role === "assistant";

              return (
                <div key={msg._id}>
                  {showDate && msg.createdAt && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px theme-bg-card" />
                      <span className="text-xs theme-text-muted px-3 py-1 theme-bg-card rounded-full">
                        {formatDate(msg.createdAt)}
                      </span>
                      <div className="flex-1 h-px theme-bg-card" />
                    </div>
                  )}

                  <div className={`flex ${isStaff ? "justify-end" : "justify-start"} mb-1`}>
                    <div className={`relative max-w-[85%] px-3 py-2 rounded-2xl ${
                      isStaff
                        ? msg.isAutoReply ? "bg-amber-700/60 text-white rounded-br-sm" : "bg-indigo-600 text-white rounded-br-sm"
                        : "theme-bg-card theme-text rounded-bl-sm"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.icon}</span>
                        <span className={`text-xs ${cfg.color} opacity-80`}>[{cfg.label}]</span>
                        {msg.userName && (
                          <span className={`text-xs font-semibold ${isStaff ? (msg.isAutoReply ? "text-amber-200" : "text-indigo-200") : "text-sky-400"}`}>
                            {msg.userName}
                          </span>
                        )}
                        {isStaff && !msg.userName && (
                          <span className={`text-xs font-semibold ${msg.isAutoReply ? "text-amber-200" : "text-indigo-200"}`}>
                            พนักงาน
                          </span>
                        )}
                      </div>

                      {msg.sticker && (
                        <img
                          src={stickerUrl(msg.sticker.packageId, msg.sticker.stickerId)}
                          alt="sticker"
                          className="w-24 h-24 object-contain"
                          loading="lazy"
                        />
                      )}

                      {(msg.hasImage || msg.imageUrl) && !msg.sticker && (
                        <img
                          src={msg.imageUrl || ""}
                          alt="รูปภาพ"
                          loading="lazy"
                          className="rounded-lg max-w-full max-h-48 object-cover mb-1 cursor-zoom-in hover:brightness-90 transition"
                          onClick={() => msg.imageUrl && setZoomImg(msg.imageUrl)}
                        />
                      )}

                      {msg.videoUrl && (
                        <video src={msg.videoUrl} controls className="rounded-lg max-w-full max-h-48 mb-1" />
                      )}

                      {msg.audioUrl && (
                        <audio src={msg.audioUrl} controls className="max-w-full mb-1" />
                      )}

                      {msg.location && (
                        <a
                          href={`https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm underline text-sky-300 hover:text-sky-200"
                        >
                          📍 {msg.location.title || "ดูแผนที่"}
                        </a>
                      )}

                      {msg.content && !msg.sticker && msg.messageType !== "sticker" && (
                        <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">{msg.content}</p>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {msg.sendMethod && isStaff && (
                          <span className={`text-xs ${msg.sendMethod === "reply" ? "text-green-300" : "text-amber-300"}`}>
                            {msg.sendMethod === "reply" ? "✓ฟรี" : "push"}
                          </span>
                        )}
                        {msg.createdAt && (
                          <span className={`text-xs ${isStaff ? "text-indigo-300" : "theme-text-muted"}`}>
                            {formatTime(msg.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
