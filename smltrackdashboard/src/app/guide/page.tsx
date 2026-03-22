"use client";

import { useState } from "react";

interface Step {
  number: number;
  title: string;
  icon: string;
  summary: string;
  details: string[];
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
      "คัดลอก Connection String รูปแบบ: mongodb+srv://user:pass@cluster.mongodb.net/smltrack",
      "วาง Connection String ใน .env ที่ MONGODB_URI=",
      "รีสตาร์ท Docker: docker compose up -d --build",
    ],
  },
  {
    number: 2,
    icon: "🤖",
    title: "ตั้งค่า AI API Key",
    summary: "ใส่ API Key เพื่อให้น้องกุ้งและน้องกุ้งทำงานได้",
    details: [
      "สมัคร OpenRouter ที่ openrouter.ai → รับ API Key ฟรี",
      "สมัคร SambaNova ที่ cloud.sambanova.ai → ฟรี 100K tokens/วัน",
      "สมัคร Groq ที่ console.groq.com → ฟรี มี rate limit",
      "สมัคร Cerebras ที่ cloud.cerebras.ai → ฟรี เร็วมาก",
      "สมัคร Google AI Studio ที่ aistudio.google.com → ฟรี Gemini",
      "ใส่ API Keys ทั้งหมดใน .env แล้ว docker compose up -d --build",
      "ระบบจะ fallback อัตโนมัติ: OpenRouter → SambaNova → Groq → Cerebras → Gemini",
    ],
  },
  {
    number: 3,
    icon: "📱",
    title: "เชื่อม LINE OA / Facebook / Instagram",
    summary: "ต่อ webhook เพื่อให้น้องกุ้งรับ-ส่งข้อความในแชทได้",
    details: [
      "LINE OA: ไปที่ developers.line.biz → สร้าง Messaging API channel",
      "LINE: คัดลอก Channel Access Token และ Channel Secret ใส่ .env",
      "LINE: ตั้ง Webhook URL เป็น https://crm.satistang.com/webhook",
      "Facebook: ไปที่ developers.facebook.com → สร้าง App → เพิ่ม Messenger",
      "Facebook: ตั้ง Webhook URL: https://crm.satistang.com/webhook/facebook",
      "Instagram: เชื่อมกับ Facebook Page แล้วเปิด Instagram Messaging",
      "ทดสอบส่งข้อความ → ดูใน Dashboard → ถ้าขึ้น Live แสดงว่าเชื่อมสำเร็จ",
    ],
  },
  {
    number: 4,
    icon: "🦐",
    title: "เชื่อม Telegram กับน้องกุ้ง",
    summary: "รับ advice วิเคราะห์ธุรกิจส่วนตัวผ่าน Telegram",
    details: [
      "ไปหา @BotFather ใน Telegram → พิมพ์ /newbot",
      "ตั้งชื่อ bot เช่น 'SML น้องกุ้ง' และ username เช่น sml_nong_kung_bot",
      "BotFather จะให้ Bot Token ยาว รูปแบบ 123456:ABC-DEF...",
      "ใส่ Token ใน .env ที่ TELEGRAM_BOT_TOKEN=",
      "รีสตาร์ท Docker แล้วเปิดเบราว์เซอร์ไปที่: https://crm.satistang.com/setup-telegram-webhook",
      "ถ้าขึ้น ok: true แสดงว่า webhook ตั้งสำเร็จ",
      "เปิด Telegram bot ของคุณแล้วส่ง /start — น้องกุ้งจะตอบทันที",
      "ทดสอบ: พิมพ์ 'สรุปแชทวันนี้' → น้องกุ้งวิเคราะห์ให้เลย",
    ],
  },
  {
    number: 5,
    icon: "📊",
    title: "เริ่มดูข้อมูลใน Dashboard",
    summary: "ใช้งาน features ต่าง ๆ ของ OpenClaw Mini CRM",
    details: [
      "Dashboard: ดูแชทแบบ Real-time ทุก 5 วินาที จัด drag-drop ได้",
      "Filter: กรองตาม sentiment ลูกค้า (ปกติ/ติดตาม/ไม่พอใจ) และโอกาสซื้อ",
      "CRM: ดูประวัติลูกค้าทั้งหมด ค้นหา กรองตาม stage",
      "KPI: ดู KPI ปิดการขาย, ลูกค้าหลุด, ยอดขาย รายวัน/สัปดาห์/เดือน",
      "น้องกุ้ง: ดู AI Advice ที่วิเคราะห์ทุก 1 ชั่วโมง เรียงตาม priority",
      "AI Cost: ดูค่าใช้จ่าย AI tokens แยกตาม provider และ feature",
      "Config: ตั้ง personality น้องกุ้งแยกต่อห้อง, ตั้งเตือนตอบช้า",
    ],
  },
];

function StepCard({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="theme-bg-secondary border theme-border rounded-xl overflow-hidden transition-all">
      <button
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:theme-bg-hover transition"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-900/40 border border-indigo-700/40 flex items-center justify-center text-xl shrink-0 mt-0.5">
          {step.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-indigo-400 font-semibold">ขั้นตอนที่ {step.number}</span>
          </div>
          <p className="text-sm font-semibold theme-text mt-0.5">{step.title}</p>
          <p className="text-xs theme-text-secondary mt-0.5">{step.summary}</p>
        </div>
        <span className="theme-text-muted text-xs mt-1 shrink-0 pt-1">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t theme-border px-5 py-4">
          <ol className="space-y-2">
            {step.details.map((detail, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-900/60 border border-indigo-700/50 text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm theme-text-secondary leading-relaxed">{detail}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="min-h-screen theme-bg theme-text">
      <header className="border-b theme-border px-4 py-3 sticky top-0 theme-bg backdrop-blur z-10" style={{ background: "var(--bg-primary)" }}>
        <div className="flex items-center gap-3 pl-10 md:pl-0">
          <div>
            <h1 className="text-base font-bold">คู่มือการใช้งาน</h1>
            <p className="text-xs theme-text-muted">OpenClaw Mini CRM — เริ่มต้นใช้งาน 5 ขั้นตอน</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6 p-4 bg-indigo-900/20 border border-indigo-700/30 rounded-xl">
          <p className="text-sm text-indigo-300 leading-relaxed">
            ยินดีต้อนรับสู่ <strong>OpenClaw Mini CRM</strong> ระบบ AI Chat Intelligence สำหรับธุรกิจ<br />
            ทำตาม 5 ขั้นตอนด้านล่างเพื่อเริ่มใช้งานได้เลย คลิกแต่ละขั้นตอนเพื่อดูรายละเอียด
          </p>
        </div>

        <div className="space-y-3">
          {STEPS.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </div>

        <div className="mt-6 p-4 theme-bg-secondary border theme-border rounded-xl">
          <p className="text-xs theme-text-muted text-center leading-relaxed">
            มีปัญหา? ติดต่อ Line: @smlclaw หรือดูโค้ดที่ GitHub<br />
            <span className="text-indigo-400">https://github.com/smltrack</span>
          </p>
        </div>
      </main>
    </div>
  );
}
