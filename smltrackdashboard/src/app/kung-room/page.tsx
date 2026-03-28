"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const OfficeScene = dynamic(() => import("@/components/3d/OfficeScene"), { ssr: false });

// ─── น้องกุ้ง 13 ตัว (กำหนดเพศ: ชาย/หญิง) ───
const AGENTS = [
  { id: 1, name: "น้องกุ้งแก้ว", role: "แก้ปัญหาลูกค้า", emoji: "🔍", color: "#f87171", status: "working", quote: "เจอปัญหาแล้ว! รอแป๊บนะ พี่แก้วกำลังหาทางออกให้...", gender: "F" },
  { id: 2, name: "น้องกุ้งทองคำ", role: "หาโอกาสขาย", emoji: "💰", color: "#fbbf24", status: "excited", quote: "เย้! ลูกค้าคนนี้พร้อมซื้อแน่นอน ปิดการขายเลยค่า!", gender: "M" },
  { id: 3, name: "น้องกุ้งครูโค้ช", role: "โค้ชทีมงาน", emoji: "👨‍🏫", color: "#a78bfa", status: "working", quote: "ทีมเราเก่งขึ้นทุกวันเลย แต่คุณนิดยังตอบช้าอยู่นะ~", gender: "M" },
  { id: 4, name: "น้องกุ้งอาร์ม", role: "วางกลยุทธ์สัปดาห์", emoji: "📋", color: "#60a5fa", status: "thinking", quote: "อืม... สัปดาห์หน้าควรเน้นโปรปูนซีเมนต์ดีกว่า...", gender: "M" },
  { id: 5, name: "น้องกุ้งหมอใจ", role: "ตรวจสุขภาพลูกค้า", emoji: "❤️", color: "#f472b6", status: "worried", quote: "ลูกค้า 3 รายยังไม่กลับมาเลย หมอใจห่วงจัง 😟", gender: "F" },
  { id: 6, name: "น้องกุ้งแบงค์", role: "ตรวจสลิป/เงินเข้า", emoji: "💳", color: "#34d399", status: "working", quote: "สลิปมาแล้ว 5 ใบ! ยังไม่ได้ยืนยัน 2 ใบ แบงค์ตรวจให้เดี๋ยวนะ", gender: "M" },
  { id: 7, name: "น้องกุ้งเมฆ", role: "ติดตามจัดส่ง", emoji: "📦", color: "#fb923c", status: "running", quote: "พัสดุ 3 ชิ้นยังไม่ถึง! เมฆต้องรีบตามแล้ว 🏃", gender: "M" },
  { id: 8, name: "น้องกุ้งขนุน", role: "ดึงลูกค้ากลับ", emoji: "🔄", color: "#38bdf8", status: "sad", quote: "ลูกค้าหายไป 12 คน... ขนุนคิดถึงจัง ส่งข้อความทักไปดีไหม?", gender: "F" },
  { id: 9, name: "น้องกุ้งแนน", role: "แนะนำสินค้าเพิ่ม", emoji: "🎯", color: "#c084fc", status: "excited", quote: "ลูกค้าซื้อปูนไปแล้ว! แนนว่าแนะนำทรายเพิ่มได้เลยค่า~", gender: "F" },
  { id: 10, name: "น้องกุ้งบุ๋ม", role: "สรุปรายวัน", emoji: "📊", color: "#2dd4bf", status: "working", quote: "บุ๋มสรุปแล้วค่า! วันนี้ข้อความ 523 ลูกค้าใหม่ 12 คะแนน 8/10!", gender: "F" },
  { id: 11, name: "น้องกุ้งแต้ม", role: "ให้คะแนนลูกค้า", emoji: "🏆", color: "#facc15", status: "thinking", quote: "คุณสมชาย 85 แต้ม Hot Lead เลย! แต้มว่าต้องติดต่อด่วน!", gender: "M" },
  { id: 12, name: "น้องกุ้งนาฬิกา", role: "เตือนนัดหมาย", emoji: "📅", color: "#fb7185", status: "alert", quote: "อีก 1 ชม. มีนัดส่งของ! อย่าลืมนะคะ นาฬิกาเตือนแล้ว ⏰", gender: "F" },
  { id: 13, name: "น้องกุ้งเปรียบ", role: "วิเคราะห์ราคา", emoji: "📈", color: "#4ade80", status: "working", quote: "ลูกค้า 8 คนถามราคาเหล็กวันนี้ เปรียบว่าควรทำโปรด่วน!", gender: "M" },
];

// ─── Activity Log Messages ───
const LOG_MESSAGES = [
  { agent: "🔍 แก้ว", msg: "พบปัญหาลูกค้า \"สมชาย\" — สินค้าไม่ตรงออเดอร์ กำลังหาทางแก้...", color: "#f87171" },
  { agent: "💰 ทองคำ", msg: "ลูกค้ารายใหม่ \"ร้านทวีโชค\" สนใจปูน 50 ตัน — Hot Lead!", color: "#fbbf24" },
  { agent: "👨‍🏫 ครูโค้ช", msg: "คุณนิดตอบแชทช้ากว่าเกณฑ์ 15 นาที — ส่งคำแนะนำแล้ว", color: "#a78bfa" },
  { agent: "📋 อาร์ม", msg: "วางแผนสัปดาห์หน้า: โปรปูนซีเมนต์ + เหล็กรูปพรรณ", color: "#60a5fa" },
  { agent: "❤️ หมอใจ", msg: "ลูกค้า 3 ราย ไม่กลับมาซื้อ 30 วัน — ส่งแจ้งเตือนทีม", color: "#f472b6" },
  { agent: "💳 แบงค์", msg: "ตรวจสลิปเข้า 5 ใบ ยืนยันแล้ว 3 รอ 2 — ยอดรวม ฿128,500", color: "#34d399" },
  { agent: "📦 เมฆ", msg: "พัสดุ 3 ชิ้นยังไม่ถึง — ติดตามขนส่ง Kerry + Flash", color: "#fb923c" },
  { agent: "🔄 ขนุน", msg: "ส่งข้อความทัก 12 ลูกค้าที่หายไป — ได้ตอบกลับแล้ว 4!", color: "#38bdf8" },
  { agent: "🎯 แนน", msg: "ลูกค้าซื้อปูน → แนะนำทรายล้าง + อิฐมวลเบาเพิ่ม", color: "#c084fc" },
  { agent: "📊 บุ๋ม", msg: "สรุปวันนี้: ข้อความ 523 | ลูกค้าใหม่ 12 | คะแนน 8.2/10", color: "#2dd4bf" },
  { agent: "🏆 แต้ม", msg: "คุณสมชาย 85 แต้ม → อัพเป็น Hot Lead | คุณวิชัย 40 แต้ม → Warm", color: "#facc15" },
  { agent: "📅 นาฬิกา", msg: "อีก 1 ชม. นัดส่งของคุณสุดา — เตือนทีมจัดส่งแล้ว!", color: "#fb7185" },
  { agent: "📈 เปรียบ", msg: "ราคาเหล็กตลาดขึ้น 3% — แนะนำปรับโปรด่วนก่อนคู่แข่ง", color: "#4ade80" },
  { agent: "🔍 แก้ว", msg: "ลูกค้า \"ร้านเจริญกิจ\" ถามเรื่องรับประกัน — ส่งข้อมูลแล้ว", color: "#f87171" },
  { agent: "💰 ทองคำ", msg: "ปิดดีล! ร้านทวีโชค สั่งปูน 50 ตัน ฿475,000 🎉", color: "#fbbf24" },
  { agent: "📦 เมฆ", msg: "Kerry ยืนยันส่ง 2 ชิ้นพรุ่งนี้เช้า — เหลือ 1 ชิ้นรอ Flash", color: "#fb923c" },
  { agent: "💳 แบงค์", msg: "สลิปใบที่ 4 ยืนยันแล้ว — คงเหลือรอ 1 ใบ ฿32,000", color: "#34d399" },
  { agent: "🔄 ขนุน", msg: "ลูกค้า \"คุณประยุทธ์\" ตอบกลับมา สนใจสั่งรอบใหม่!", color: "#38bdf8" },
  { agent: "📊 บุ๋ม", msg: "เทียบเมื่อวาน: ข้อความ +12% ลูกค้าใหม่ +25% ยอดขาย +18%", color: "#2dd4bf" },
  { agent: "👨‍🏫 ครูโค้ช", msg: "คุณนิดปรับตัวดีขึ้นแล้ว! ตอบเร็วขึ้น 40% 👏", color: "#a78bfa" },
];

const STATUS_INFO: Record<string, { label: string; animation: string; bgClass: string }> = {
  working: { label: "กำลังทำงาน 💪", animation: "animate-pulse", bgClass: "bg-green-500/20 text-green-400" },
  sleeping: { label: "นอนหลับ 😴", animation: "", bgClass: "bg-gray-500/20 text-gray-400" },
  thinking: { label: "กำลังคิด 🤔", animation: "animate-bounce", bgClass: "bg-blue-500/20 text-blue-400" },
  excited: { label: "ตื่นเต้น! 🎉", animation: "animate-bounce", bgClass: "bg-yellow-500/20 text-yellow-400" },
  worried: { label: "ห่วงใย 😟", animation: "animate-pulse", bgClass: "bg-pink-500/20 text-pink-400" },
  sad: { label: "คิดถึง 🥺", animation: "animate-pulse", bgClass: "bg-cyan-500/20 text-cyan-400" },
  running: { label: "วิ่งตาม! 🏃", animation: "animate-bounce", bgClass: "bg-orange-500/20 text-orange-400" },
  alert: { label: "แจ้งเตือน! ⏰", animation: "animate-ping-slow", bgClass: "bg-red-500/20 text-red-400" },
};

// ─── Activity Log (ข้อมูลจริงจาก API) ───
interface LogEntry { agent: string; color: string; msg: string; time: string; durationMs?: number; }

function ActivityLog({ inline = false }: { inline?: boolean } = {}) {
  const [logs, setLogs] = useState<LogEntry[]>(LOG_MESSAGES.map((m) => ({ ...m, time: "", durationMs: 0 })));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fade, setFade] = useState(true);

  // Fetch real data
  useEffect(() => {
    fetch("/dashboard/api/kung-log")
      .then((r) => r.json())
      .then((data: LogEntry[]) => { if (data.length > 0) setLogs(data); })
      .catch(() => {});
    // Refresh every 60 seconds
    const timer = setInterval(() => {
      fetch("/dashboard/api/kung-log")
        .then((r) => r.json())
        .then((data: LogEntry[]) => { if (data.length > 0) setLogs(data); })
        .catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % logs.length);
        setFade(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, [logs.length]);

  const count = 16;
  const visibleLogs = Array.from({ length: Math.min(count, logs.length) }, (_, i) => {
    const idx = (currentIdx - i + logs.length) % logs.length;
    return { ...logs[idx], opacity: i === 0 ? 1 : Math.max(0.15, 1 - i * 0.055) };
  }).reverse();

  return (
    <div className={inline ? "" : "absolute bottom-0 left-0 right-0 z-10"}>
      <div className={inline ? "bg-black/80 py-3 px-3 md:px-6" : "bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-8 pb-3 px-3 md:px-6"}>
        <div className="max-w-5xl mx-auto space-y-0.5">
          {visibleLogs.map((log, i) => (
            <div
              key={`${currentIdx}-${i}`}
              className={`flex items-start gap-2 transition-all duration-300 ${i === visibleLogs.length - 1 && fade ? "opacity-100 translate-y-0" : i === visibleLogs.length - 1 && !fade ? "opacity-0 translate-y-2" : ""}`}
              style={{ opacity: i === visibleLogs.length - 1 ? undefined : log.opacity }}
            >
              <span className="text-[10px] text-gray-500 whitespace-nowrap font-mono" style={{ minWidth: 95 }}>
                {log.time}
              </span>
              <span className="text-xs font-bold whitespace-nowrap" style={{ color: log.color, minWidth: 80 }}>
                {log.agent}
              </span>
              <span className="text-xs text-gray-300 truncate">{log.msg}</span>
              {log.durationMs ? (
                <span className="text-[10px] text-gray-500 whitespace-nowrap ml-auto">
                  {(log.durationMs / 1000).toFixed(1)}s
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function KungRoomPage() {
  const [view, setView] = useState<"3d" | "list">("3d");
  const [tts, setTts] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const el = document.getElementById("kung-3d-container");
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // ฟัง event fullscreenchange
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div className="min-h-screen theme-bg theme-text">
      <header className={`border-b theme-border px-3 md:px-6 py-4 sticky top-0 theme-bg backdrop-blur z-20 ${isFullscreen ? "hidden" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">🦐 ห้องทำงานน้องกุ้ง</h1>
            <p className="text-xs theme-text-secondary">น้องกุ้ง 13 ตัว ทำงาน 24/7 — ดู log ด้านล่าง</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView("3d")} className={`px-3 py-1.5 text-xs rounded-lg transition ${view === "3d" ? "bg-indigo-500 text-white" : "theme-bg-secondary theme-text-secondary"}`}>
              🎮 3D
            </button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-xs rounded-lg transition ${view === "list" ? "bg-indigo-500 text-white" : "theme-bg-secondary theme-text-secondary"}`}>
              📋 รายชื่อ
            </button>
            <button onClick={() => setTts(!tts)} className={`px-3 py-1.5 text-xs rounded-lg transition ${tts ? "bg-amber-500 text-white" : "theme-bg-secondary theme-text-secondary"}`} title={tts ? "ปิดเสียง CEO" : "เปิดเสียง CEO"}>
              {tts ? "🔊" : "🔇"}
            </button>
            {view === "3d" && (
              <button onClick={toggleFullscreen} className="px-3 py-1.5 text-xs rounded-lg transition theme-bg-secondary theme-text-secondary hover:bg-indigo-500 hover:text-white" title="เต็มจอ">
                {isFullscreen ? "⬜" : "⛶"}
              </button>
            )}
          </div>
        </div>
      </header>

      {view === "3d" ? (
        <div id="kung-3d-container" className="relative" style={{ height: isFullscreen ? "100vh" : "calc(100vh - 120px)", background: "#0a0e1a" }}>
          {/* 3D Scene */}
          <OfficeScene agents={AGENTS} ttsEnabled={tts} />

          {/* Fullscreen controls overlay */}
          {isFullscreen && (
            <div className="absolute top-4 right-4 z-20 flex gap-2">
              <button onClick={() => setTts(!tts)} className={`px-3 py-1.5 text-xs rounded-lg transition backdrop-blur ${tts ? "bg-amber-500/80 text-white" : "bg-black/50 text-gray-300"}`}>
                {tts ? "🔊" : "🔇"}
              </button>
              <button onClick={toggleFullscreen} className="px-3 py-1.5 text-xs rounded-lg transition bg-black/50 text-gray-300 backdrop-blur hover:bg-red-500/80 hover:text-white">
                ✕ ออกเต็มจอ
              </button>
            </div>
          )}

          {/* Instructions */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="theme-bg-secondary/80 backdrop-blur border theme-border rounded-2xl px-4 py-2 text-[11px] theme-text-muted leading-relaxed text-center">
              <div>🖱️ ลากเพื่อหมุน · เลื่อนเพื่อซูม{!isFullscreen ? "" : " · กด ESC ออกเต็มจอ"}</div>
              <div className="mt-1 text-[10px] opacity-70">🦐 กระโดด = กำลังทำงาน · 🎈 มีลูกโป่ง = มีงานรายงาน · 🪑 นั่งนิ่ง = รอคิว</div>
            </div>
          </div>

          {/* Activity Log — scrolling at bottom */}
          <ActivityLog />
        </div>
      ) : (
        /* List View + Activity Log */
        <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
          <main className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full p-3 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AGENTS.map((agent) => {
                const si = STATUS_INFO[agent.status];
                const isActive = agent.status === "working" || agent.status === "excited" || agent.status === "running" || agent.status === "alert";
                return (
                  <div key={agent.id} className={`theme-bg-secondary border rounded-xl p-4 transition cursor-default`}
                    style={{ borderColor: isActive ? agent.color + "50" : "var(--border)", boxShadow: isActive ? `0 0 12px ${agent.color}20` : "none" }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${isActive ? "animate-bounce" : ""}`} style={{ backgroundColor: agent.color + "22", border: `2px solid ${agent.color}` }}>
                        {agent.emoji}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold">{agent.name}</h3>
                        <p className="text-[11px] theme-text-muted">{agent.role}</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${si?.bgClass}`}>
                        {isActive && <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse mr-1"></span>}
                        {si?.label}
                      </div>
                    </div>
                    <p className="text-xs theme-text-secondary italic pl-13">&ldquo;{agent.quote}&rdquo;</p>
                  </div>
                );
              })}
            </div>
          </main>
          {/* Activity Log ด้านล่าง */}
          <div className="shrink-0">
            <ActivityLog inline />
          </div>
        </div>
      )}
    </div>
  );
}
