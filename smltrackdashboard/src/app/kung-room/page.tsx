"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const OfficeScene = dynamic(() => import("@/components/3d/OfficeScene"), { ssr: false });

// ─── น้องกุ้ง 13 ตัว ───
const AGENTS = [
  { id: 1, name: "กุ้งแก้ว", role: "แก้ปัญหาลูกค้า", emoji: "🔍", color: "#f87171", status: "working", quote: "เจอปัญหาแล้ว! รอแป๊บนะ กำลังหาทางออก..." },
  { id: 2, name: "กุ้งทอง", role: "หาโอกาสขาย", emoji: "💰", color: "#fbbf24", status: "excited", quote: "ลูกค้าคนนี้พร้อมซื้อแน่นอน! ปิดการขายเลย!" },
  { id: 3, name: "กุ้งโค้ช", role: "โค้ชทีมงาน", emoji: "👨‍🏫", color: "#a78bfa", status: "working", quote: "ทีมเราเก่งขึ้นทุกวัน แต่ยังตอบช้าอยู่นะ~" },
  { id: 4, name: "กุ้งวางแผน", role: "วางกลยุทธ์สัปดาห์", emoji: "📋", color: "#60a5fa", status: "thinking", quote: "อืม... สัปดาห์หน้าควรเน้นโปรปูนซีเมนต์..." },
  { id: 5, name: "กุ้งใจดี", role: "ตรวจสุขภาพลูกค้า", emoji: "❤️", color: "#f472b6", status: "worried", quote: "ลูกค้า 3 รายยังไม่กลับมาเลย ห่วงจัง 😟" },
  { id: 6, name: "กุ้งเงิน", role: "ตรวจสลิป/เงินเข้า", emoji: "💳", color: "#34d399", status: "working", quote: "สลิปมาแล้ว 5 ใบ! ยังไม่ได้ยืนยัน 2 ใบนะ" },
  { id: 7, name: "กุ้งส่ง", role: "ติดตามจัดส่ง", emoji: "📦", color: "#fb923c", status: "running", quote: "พัสดุ 3 ชิ้นยังไม่ถึง! ต้องรีบตามแล้ว 🏃" },
  { id: 8, name: "กุ้งคิดถึง", role: "ดึงลูกค้ากลับ", emoji: "🔄", color: "#38bdf8", status: "sad", quote: "ลูกค้าหายไป 12 คน... คิดถึงจัง ส่งข้อความไปดีไหม?" },
  { id: 9, name: "กุ้งแนะนำ", role: "แนะนำสินค้าเพิ่ม", emoji: "🎯", color: "#c084fc", status: "excited", quote: "ลูกค้าซื้อปูนไปแล้ว! แนะนำทรายเพิ่มสิ~" },
  { id: 10, name: "กุ้งสรุป", role: "สรุปรายวัน", emoji: "📊", color: "#2dd4bf", status: "working", quote: "วันนี้ข้อความ 523 ลูกค้าใหม่ 12 คะแนน 8/10 !" },
  { id: 11, name: "กุ้งให้แต้ม", role: "ให้คะแนนลูกค้า", emoji: "🏆", color: "#facc15", status: "thinking", quote: "คุณสมชาย 85 แต้ม Hot Lead! ติดต่อด่วน!" },
  { id: 12, name: "กุ้งเตือน", role: "เตือนนัดหมาย", emoji: "📅", color: "#fb7185", status: "alert", quote: "อีก 1 ชม. มีนัดส่งของ! อย่าลืมนะ ⏰" },
  { id: 13, name: "กุ้งเทียบราคา", role: "วิเคราะห์ราคา", emoji: "📈", color: "#4ade80", status: "working", quote: "ลูกค้า 8 คนถามราคาเหล็ก วันนี้ ควรทำโปร!" },
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

export default function KungRoomPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<"3d" | "list">("3d");
  const selectedAgent = AGENTS.find((a) => a.id === selected);

  return (
    <div className="min-h-screen theme-bg theme-text">
      <header className="border-b theme-border px-3 md:px-6 py-4 sticky top-0 theme-bg backdrop-blur z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">🦐 ห้องทำงานน้องกุ้ง</h1>
            <p className="text-xs theme-text-secondary">น้องกุ้ง 13 ตัว ทำงาน 24/7 — กดที่ตัวกุ้งเพื่อดูสถานะ</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView("3d")} className={`px-3 py-1.5 text-xs rounded-lg transition ${view === "3d" ? "bg-indigo-500 text-white" : "theme-bg-secondary theme-text-secondary"}`}>
              🎮 3D
            </button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-xs rounded-lg transition ${view === "list" ? "bg-indigo-500 text-white" : "theme-bg-secondary theme-text-secondary"}`}>
              📋 รายชื่อ
            </button>
          </div>
        </div>
      </header>

      {view === "3d" ? (
        <div className="relative" style={{ height: "calc(100vh - 120px)" }}>
          {/* 3D Scene */}
          <OfficeScene agents={AGENTS} selected={selected} onSelect={setSelected} />

          {/* Agent Info Overlay */}
          {selectedAgent && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-10">
              <div className="theme-bg-secondary border theme-border rounded-2xl p-4 shadow-2xl backdrop-blur">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: selectedAgent.color + "22", border: `2px solid ${selectedAgent.color}` }}>
                    {selectedAgent.emoji}
                  </div>
                  <div>
                    <h3 className="font-bold">{selectedAgent.name}</h3>
                    <p className="text-xs theme-text-secondary">{selectedAgent.role}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="ml-auto text-xs theme-text-muted hover:theme-text">✕</button>
                </div>
                <div className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium mb-2 ${STATUS_INFO[selectedAgent.status]?.bgClass}`}>
                  {STATUS_INFO[selectedAgent.status]?.label}
                </div>
                <div className="theme-bg-card rounded-xl p-3 text-sm italic theme-text-secondary">
                  &ldquo;{selectedAgent.quote}&rdquo;
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="theme-bg-secondary/80 backdrop-blur border theme-border rounded-full px-4 py-1.5 text-[11px] theme-text-muted">
              🖱️ ลากเพื่อหมุน · เลื่อนเพื่อซูม · กดที่กุ้งเพื่อดูข้อมูล
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <main className="max-w-4xl mx-auto p-3 md:p-6 pb-24 md:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AGENTS.map((agent) => {
              const si = STATUS_INFO[agent.status];
              return (
                <div key={agent.id} className="theme-bg-secondary border theme-border rounded-xl p-4 hover:border-indigo-500/30 transition cursor-pointer" onClick={() => setSelected(agent.id)}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: agent.color + "22", border: `2px solid ${agent.color}` }}>
                      <span className={si?.animation}>{agent.emoji}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">{agent.name}</h3>
                      <p className="text-[11px] theme-text-muted">{agent.role}</p>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${si?.bgClass}`}>
                      {si?.label}
                    </div>
                  </div>
                  <p className="text-xs theme-text-secondary italic pl-13">&ldquo;{agent.quote}&rdquo;</p>
                </div>
              );
            })}
          </div>
        </main>
      )}
    </div>
  );
}
