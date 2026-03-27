"use client";

import { useState } from "react";
import Link from "next/link";

interface Step {
  number: number;
  title: string;
  icon: string;
  summary: string;
  details: string[];
  link?: { label: string; href: string };
}

const STEPS: Step[] = [
  {
    number: 1,
    icon: "🗄️",
    title: "เชื่อม MongoDB Atlas",
    summary: "ตั้งค่าฐานข้อมูลเก็บแชทและ analytics ทุกอย่าง",
    details: [
      "สมัคร MongoDB Atlas ฟรีที่ mongodb.com/cloud/atlas",
      "สร้าง Cluster ชนิด M0 (Free) เลือก Region ใกล้ที่สุด",
      "ไปที่ Database Access → สร้าง user + password",
      "ไปที่ Network Access → เพิ่ม 0.0.0.0/0 (Allow from anywhere)",
      "คัดลอก Connection String วาง Connection String ใน .env ที่ MONGODB_URI=",
      "รีสตาร์ท Docker: docker compose up -d --build",
    ],
    link: { label: "ไปตั้งค่า", href: "/settings" },
  },
  {
    number: 2,
    icon: "🤖",
    title: "ตั้งค่า AI API Key",
    summary: "ใส่ API Key เพื่อให้ AI วิเคราะห์แชทและตอบอัตโนมัติ",
    details: [
      "สมัคร OpenRouter ที่ openrouter.ai → รับ API Key ฟรี",
      "สมัคร SambaNova ที่ cloud.sambanova.ai → ฟรี 100K tokens/วัน",
      "สมัคร Groq ที่ console.groq.com → ฟรี มี rate limit",
      "สมัคร Cerebras ที่ cloud.cerebras.ai → ฟรี เร็วมาก",
      "สมัคร Google AI Studio → ฟรี Gemini",
      "ระบบจะ fallback อัตโนมัติ: OpenRouter → SambaNova → Groq → Cerebras → Gemini",
    ],
    link: { label: "ไปตั้งค่า", href: "/settings" },
  },
  {
    number: 3,
    icon: "📱",
    title: "เชื่อม LINE / Facebook / Instagram",
    summary: "ต่อ webhook เพื่อให้ระบบรับ-ส่งข้อความในแชทได้",
    details: [
      "LINE OA: สร้าง Messaging API channel → ใส่ Token + Secret",
      "LINE: ตั้ง Webhook URL เป็น https://crm.satistang.com/webhook",
      "Facebook: สร้าง App → เพิ่ม Messenger → ตั้ง Webhook",
      "Instagram: เชื่อมกับ Facebook Page → เปิด Instagram Messaging",
      "ทดสอบส่งข้อความ → ดูใน Dashboard → ถ้าขึ้น Live แสดงว่าเชื่อมสำเร็จ",
    ],
    link: { label: "ไปเชื่อมต่อ", href: "/connections" },
  },
  {
    number: 4,
    icon: "🦐",
    title: "เชื่อม Telegram กับน้องกุ้ง",
    summary: "รับ advice วิเคราะห์ธุรกิจส่วนตัวผ่าน Telegram",
    details: [
      "ไปหา @BotFather ใน Telegram → พิมพ์ /newbot",
      "ตั้งชื่อ bot เช่น 'SML น้องกุ้ง' → รับ Bot Token",
      "ใส่ Token ใน .env ที่ TELEGRAM_BOT_TOKEN=",
      "รีสตาร์ท Docker → เปิด /setup-telegram-webhook",
      "เปิด Telegram bot ส่ง /start → น้องกุ้งจะตอบทันที",
    ],
    link: { label: "ไปตั้งค่า", href: "/settings" },
  },
  {
    number: 5,
    icon: "📊",
    title: "เริ่มใช้งาน Dashboard",
    summary: "ดูข้อมูล, วิเคราะห์, จัดการลูกค้า, แจ้งเตือน real-time",
    details: [
      "Dashboard: ดูแชท Real-time กรองตาม platform/sentiment/purchase intent",
      "Chat: เปิดพร้อม 4 จอ LINE/FB/IG รวมที่เดียว ค้นหาได้",
      "CRM: ดูประวัติลูกค้า Pipeline ครบ, รวมลูกค้าซ้ำข้าม platform",
      "KPI: performance พนักงาน, อัตราปิดการขาย, ลูกค้าหลุด, revenue",
      "แจ้งเตือน: Real-time SSE เฉพาะคนที่ดูแล Toast + เสียง + badge",
      "น้องกุ้ง: AI Advice วิเคราะห์ทุก 1 ชั่วโมง เรียงตาม priority",
      "Knowledge Base: จัดการ KB สินค้า โปรโมชั่น นโยบาย FAQ",
      "Responsive: ใช้ได้ทุกอุปกรณ์ มือถือ/Tablet/Desktop",
    ],
    link: { label: "ไป Dashboard", href: "/" },
  },
];

const FEATURES = [
  { icon: "💬", title: "Multi-Channel Chat", desc: "LINE · Facebook · Instagram รวมที่เดียว เปิดได้ 4 จอพร้อมกัน" },
  { icon: "🧠", title: "AI วิเคราะห์", desc: "Sentiment · Purchase Intent · Auto Tags อัตโนมัติ" },
  { icon: "📈", title: "KPI & Analytics", desc: "Response time · Conversion · Pipeline · Revenue" },
  { icon: "🦐", title: "น้องกุ้ง Advisor", desc: "AI วิเคราะห์ธุรกิจ แจ้งเตือน Telegram" },
  { icon: "👥", title: "CRM อัตโนมัติ", desc: "จัดการลูกค้า Pipeline รวมข้าม platform" },
  { icon: "📚", title: "Knowledge Base", desc: "สอน AI ตอบจาก KB ของร้าน" },
  { icon: "🔔", title: "แจ้งเตือน Real-time", desc: "SSE stream · Toast · เสียง · Badge เฉพาะคนที่ดูแล" },
  { icon: "🔀", title: "Merge ลูกค้าซ้ำ", desc: "หาลูกค้าซ้ำอัตโนมัติ รวมข้าม LINE/FB/IG" },
  { icon: "💸", title: "เงินเข้า", desc: "ตรวจสลิป ยืนยัน/ปฏิเสธ ติดตามยอด" },
  { icon: "📑", title: "AI จำแนกเอกสาร", desc: "สลิป PO ใบเสนอราคา — AI แยก Admin ย้ายได้" },
  { icon: "📱", title: "Responsive", desc: "มือถือ Tablet Desktop ใช้ได้ทุกจอ" },
];

function StepCard({ step, defaultOpen }: { step: Step; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || false);

  return (
    <div className={`card overflow-hidden transition-all duration-200 ${open ? "ring-1 ring-indigo-500/20" : ""}`}>
      <button
        className="w-full flex items-start gap-3 md:gap-4 px-4 md:px-5 py-4 text-left hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Number badge */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-2xl gradient-bg flex items-center justify-center text-xl shadow-md"
            style={{ boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}>
            {step.icon}
          </div>
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-bg text-white text-[10px] font-bold flex items-center justify-center ring-2"
            style={{ outlineColor: "var(--bg-card)" }}>
            {step.number}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--primary)" }}>
            ขั้นตอนที่ {step.number}
          </p>
          <p className="text-sm md:text-base font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
            {step.title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {step.summary}
          </p>
        </div>

        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1 transition-all ${
          open ? "bg-indigo-600/20 text-indigo-400 rotate-180" : ""
        }`} style={{ color: open ? undefined : "var(--text-muted)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 5l4 4 4-4" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t px-4 md:px-5 py-4 animate-fade-in" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
          <ol className="space-y-2.5">
            {step.details.map((detail, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {detail}
                </span>
              </li>
            ))}
          </ol>

          {step.link && (
            <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <Link href={step.link.href}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition gradient-bg text-white hover:opacity-90 shadow-md"
                style={{ boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}>
                {step.link.label}
                <span className="text-xs">→</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg md:text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            📖 คู่มือการใช้งาน
          </h1>
          <p className="text-xs md:text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            OpenClaw Mini CRM — เริ่มต้นใช้งาน 5 ขั้นตอน
          </p>
        </div>
      </header>

      <main className="page-content">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="card p-5 md:p-6 mb-6 overflow-hidden relative">
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ background: "linear-gradient(135deg, var(--gradient-from), var(--gradient-to))" }} />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 gradient-bg rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                  style={{ boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>
                  💬
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold gradient-text">OpenClaw Mini CRM</h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>AI Chat Intelligence Platform</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                ระบบ CRM อัจฉริยะ วิเคราะห์สนทนาจาก LINE, Facebook, Instagram อัตโนมัติ
                พร้อม AI Advisor ช่วยวิเคราะห์ธุรกิจ แจ้งเตือนลูกค้าหลุด และให้คำแนะนำเชิงรุก
              </p>
            </div>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-3 gap-2.5 md:gap-3 mb-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="stat-card text-center">
                <span className="text-2xl md:text-3xl block mb-1.5">{f.icon}</span>
                <p className="text-xs md:text-sm font-bold" style={{ color: "var(--text-primary)" }}>{f.title}</p>
                <p className="text-[10px] md:text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Steps heading */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: "var(--border)" }} />
            <span className="text-xs font-bold uppercase tracking-widest px-2" style={{ color: "var(--text-muted)" }}>
              เริ่มต้นใช้งาน
            </span>
            <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {STEPS.map((step) => (
              <StepCard key={step.number} step={step} defaultOpen={step.number === 1} />
            ))}
          </div>

          {/* Footer */}
          <div className="card p-4 md:p-5 mt-6 text-center">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              ต้องการความช่วยเหลือ?
            </p>
            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
              ติดต่อ LINE: @smlclaw
            </p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <Link href="/connections"
                className="px-4 py-2 rounded-xl text-xs font-medium transition"
                style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>
                🔗 เชื่อมต่อช่องทาง
              </Link>
              <Link href="/"
                className="px-4 py-2 rounded-xl text-xs font-medium gradient-bg text-white hover:opacity-90 transition">
                📊 ไป Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
