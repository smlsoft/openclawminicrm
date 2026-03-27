"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ───
interface Section {
  id: string;
  icon: string;
  title: string;
  desc: string;
  items: { title: string; content: string }[];
  link?: { label: string; href: string };
}

// ─── Data ───
const SECTIONS: Section[] = [
  {
    id: "setup",
    icon: "🚀",
    title: "เริ่มต้นใช้งาน",
    desc: "ตั้งค่าระบบ 5 ขั้นตอน",
    items: [
      {
        title: "1. เชื่อม MongoDB",
        content: `สมัคร MongoDB Atlas ฟรีที่ mongodb.com/cloud/atlas
• สร้าง Cluster ชนิด M0 (Free) เลือก Region: Singapore หรือ Hong Kong
• ไปที่ Database Access → สร้าง user + password (จดไว้)
• ไปที่ Network Access → เพิ่ม 0.0.0.0/0 (Allow from anywhere)
• คัดลอก Connection String: mongodb+srv://user:pass@cluster.mongodb.net/smltrack
• วางใน .env ที่ MONGODB_URI= แล้ว docker compose up -d --build
• หรือใช้ MongoDB Docker บน server เดียวกัน (เร็วกว่า Atlas 100x)`,
      },
      {
        title: "2. ตั้งค่า AI API Key",
        content: `ระบบใช้ AI หลาย provider — fallback อัตโนมัติ ถ้า provider แรกล่มจะใช้ตัวถัดไป

ลำดับ fallback:
1. OpenRouter (openrouter.ai) — รวม model จากหลายค่าย ฟรี
2. SambaNova (cloud.sambanova.ai) — ฟรี 100K tokens/วัน เร็วมาก
3. Groq (console.groq.com) — ฟรี มี rate limit ต่อนาที
4. Cerebras (cloud.cerebras.ai) — ฟรี เร็วที่สุด
5. Google Gemini (aistudio.google.com) — ฟรี 1M tokens/วัน

ใส่ API Key ทั้งหมดใน .env แล้ว restart Docker
ไม่ต้องใส่ทุกตัว — ใส่ตัวไหนก็ได้ ระบบเลือกเอง`,
      },
      {
        title: "3. เชื่อม LINE OA",
        content: `ไปที่ developers.line.biz → สร้าง Messaging API channel

ขั้นตอน:
1. สร้าง Provider → สร้าง Channel (Messaging API)
2. ไปที่ tab "Messaging API" → คัดลอก Channel Access Token (Long-lived)
3. ไปที่ tab "Basic settings" → คัดลอก Channel Secret
4. ใส่ใน .env: LINE_CHANNEL_ACCESS_TOKEN= และ LINE_CHANNEL_SECRET=
5. กลับไปที่ LINE Developer → Messaging API tab
6. ตั้ง Webhook URL: https://crm.satistang.com/webhook
7. เปิด "Use webhook" = Enabled
8. ปิด "Auto-reply messages" (ให้ AI ตอบแทน)
9. ทดสอบ: ส่งข้อความใน LINE OA → ดูใน Dashboard ถ้าขึ้นแสดงว่าสำเร็จ`,
      },
      {
        title: "4. เชื่อม Facebook + Instagram",
        content: `Facebook:
1. ไปที่ developers.facebook.com → สร้าง App (Business type)
2. เพิ่ม Product "Messenger" → ตั้งค่า Webhook
3. Webhook URL: https://crm.satistang.com/webhook/meta
4. Verify Token: ใส่ค่าเดียวกับ FB_VERIFY_TOKEN ใน .env
5. Subscribe: messages, messaging_postbacks
6. คัดลอก Page Access Token → ใส่ใน .env ที่ FB_PAGE_ACCESS_TOKEN=

Instagram:
1. Facebook Page ต้องเชื่อมกับ Instagram Business/Creator Account
2. ไปที่ Facebook Page Settings → Instagram → Connect Account
3. ไปที่ App Dashboard → Messenger → Instagram
4. Subscribe: messages
5. Instagram จะใช้ Webhook เดียวกับ Facebook (/webhook/meta)

ทดสอบ: ส่งข้อความใน Facebook Messenger หรือ Instagram DM → ดูใน Dashboard`,
      },
      {
        title: "5. เชื่อม Telegram",
        content: `สำหรับรับ AI Advice ส่วนตัวจาก "น้องกุ้ง":

1. เปิด Telegram → ค้นหา @BotFather → พิมพ์ /newbot
2. ตั้งชื่อ bot เช่น "SML น้องกุ้ง" → ตั้ง username เช่น sml_kung_bot
3. BotFather จะส่ง Bot Token มา (รูปแบบ 123456:ABC-DEF...)
4. ใส่ใน .env ที่ TELEGRAM_BOT_TOKEN=
5. Restart Docker → เปิดเบราว์เซอร์ไปที่: https://crm.satistang.com/setup-telegram-webhook
6. ถ้าขึ้น {"ok":true} = สำเร็จ
7. เปิด Telegram bot → ส่ง /start → น้องกุ้งตอบทันที
8. ลอง: "สรุปแชทวันนี้" → น้องกุ้งวิเคราะห์ให้`,
      },
    ],
    link: { label: "ไปตั้งค่า", href: "/settings" },
  },
  {
    id: "chat",
    icon: "💬",
    title: "แชท Multi-Panel",
    desc: "เปิดได้ 4 จอพร้อมกัน LINE/FB/IG",
    items: [
      {
        title: "วิธีใช้งานแชท",
        content: `หน้าแชทเปิดสนทนาได้พร้อมกันสูงสุด 4 จอ:

• คลิกชื่อลูกค้าทางซ้าย → เปิดแชทด้านขวา
• กดเพิ่มได้ถึง 4 จอ → เปรียบเทียบสนทนาข้างกัน
• กด X ปิดแต่ละจอได้
• มีแถบ platform filter: LINE / FB / IG กรองเฉพาะช่องทาง
• ค้นหาชื่อลูกค้า หรือข้อความได้
• Auto-refresh ทุก 15 วินาที`,
      },
      {
        title: "ฟีเจอร์ในหน้าแชท",
        content: `แต่ละจอแชทมี:
• ส่งข้อความ — พิมพ์แล้วกด Enter หรือกดปุ่มส่ง
• AI แนะนำคำตอบ — กดปุ่ม "AI" → ได้คำตอบ 2-3 แบบ
• AI สรุปสนทนา — กดปุ่ม "สรุป" → สรุปประเด็นสำคัญ
• ดู Memory — AI จำอะไรเกี่ยวกับลูกค้าคนนี้
• Quick Reply — เลือก template คำตอบสำเร็จรูป
• ส่งรูป/ไฟล์ — แนบไฟล์ได้
• แสดง sentiment badge (ปกติ/ติดตาม/ไม่พอใจ)
• แสดง purchase intent (ไม่สนใจ/เริ่มสนใจ/สนใจซื้อ!)`,
      },
    ],
    link: { label: "ไปแชท", href: "/chat" },
  },
  {
    id: "crm",
    icon: "👥",
    title: "CRM ลูกค้า",
    desc: "จัดการ Pipeline, รวมลูกค้าซ้ำ, มอบหมาย staff",
    items: [
      {
        title: "Pipeline การขาย",
        content: `ลูกค้าทุกคนมี Pipeline Stage:
🆕 ใหม่ — เพิ่งทักมาครั้งแรก
👀 สนใจ — ถามราคา/สินค้า
💰 เสนอราคา — ส่งใบเสนอราคาแล้ว
🤝 ต่อรอง — กำลังต่อราคา
✅ ปิดการขาย — ซื้อแล้ว!
❌ ไม่ซื้อ — ปฏิเสธ/ยกเลิก
📞 ติดตาม — ต้อง follow up

AI ย้าย stage ให้อัตโนมัติจากเนื้อหาสนทนา
หรือ staff ย้ายเองได้ในหน้า CRM รายละเอียด`,
      },
      {
        title: "ข้อมูลลูกค้า",
        content: `แต่ละลูกค้ามี:
• ชื่อ-นามสกุล, บริษัท, ตำแหน่ง
• เบอร์โทร, อีเมล, ที่อยู่
• Platform IDs — LINE, Facebook, Instagram (หลายตัวได้)
• ห้องสนทนาที่เชื่อม (rooms)
• Tags อัตโนมัติจาก AI (ถามราคา, สนใจสินค้า, VIP, ร้องเรียน ฯลฯ)
• Tags กำหนดเอง
• มูลค่าดีล + วันที่คาดปิด
• ผู้ดูแล (assignedTo) — มอบหมาย staff ได้
• Sentiment + Purchase Intent (AI วิเคราะห์)
• จำนวนข้อความทั้งหมด`,
      },
      {
        title: "รวมลูกค้าซ้ำ (Merge)",
        content: `ลูกค้าคนเดียว อาจทักมาทั้ง LINE, Facebook, Instagram:

ระบบค้นหาซ้ำอัตโนมัติ:
• ชื่อเหมือนกัน 100%
• เบอร์โทร/Email เดียวกัน
• ชื่อคล้ายกัน (4 ตัวอักษรแรกเหมือน)

วิธีรวม:
1. ไปหน้า "🔀 รวมลูกค้า"
2. ระบบแสดงคู่ที่ซ้ำ → กด "รวม → ตัวหลัก"
3. หรือกด "✋ รวมเอง" → ค้นหา 2 คนมารวม
4. หลังรวม: ห้องสนทนา + tags + notes + platformIds รวมกัน
5. ประวัติแชทไม่หาย — รวมทั้งหมดเป็นลูกค้าเดียว`,
      },
    ],
    link: { label: "ไป CRM", href: "/crm" },
  },
  {
    id: "kpi",
    icon: "📈",
    title: "KPI & Performance",
    desc: "ดู KPI พนักงาน, ปิดการขาย, ลูกค้าหลุด",
    items: [
      {
        title: "KPI ที่วัดได้",
        content: `Dashboard KPI แสดง:
• จำนวนห้องสนทนา / ข้อความทั้งหมด
• จำนวนพนักงาน / ลูกค้า
• เวลาตอบเฉลี่ย (เร็ว < 5 นาที / กลาง 5-30 / ช้า > 30)
• อัตราปิดการขาย (Conversion Rate)
• จำนวนลูกค้าหลุด (> 7 วัน)
• จำนวนลูกค้าเสี่ยงหลุด (3-7 วัน)

Tab ย่อย:
• ทั้งหมด — ภาพรวม
• ⚠️ แจ้งเตือน — ห้องที่มีปัญหา (sentiment แดง, purchase intent สูง)
• 👔 พนักงาน — KPI แต่ละคน
• 👥 ลูกค้า — sentiment + purchase intent
• 🏠 ห้อง — วิเคราะห์ต่อห้อง
• 📊 Pipeline — อัตราปิด + funnel
• 💀 ลูกค้าหลุด — รายชื่อ + วันที่หาย
• 💰 รายได้ — deal value + won/lost`,
      },
    ],
    link: { label: "ไป KPI", href: "/kpi" },
  },
  {
    id: "analytics",
    icon: "📊",
    title: "Analytics Dashboard",
    desc: "กราฟวิเคราะห์ 6 หมวด ด้วย Recharts",
    items: [
      {
        title: "6 Tabs กราฟ",
        content: `📊 ภาพรวม:
• ข้อความรายวัน (Line Chart) — แนวโน้ม 7 วัน
• สัดส่วน Platform (Pie) — LINE / Facebook / Instagram
• Sentiment (Donut) — ดี / ปานกลาง / แย่
• Purchase Intent (Donut) — ไม่สนใจ / เริ่มสนใจ / สนใจซื้อ

💰 การขาย:
• Pipeline Funnel (Bar) — จำนวนลูกค้าแยก stage
• มูลค่า Pipeline (Bar) — ยอดเงินแยก stage
• Win/Loss (Pie) — สัดส่วนปิดได้ vs ปิดไม่ได้

👔 ทีมงาน:
• ข้อความต่อพนักงาน (Bar) — workload
• ห้องที่ดูแล (Bar) — coverage
• เวลาตอบเฉลี่ย (Bar) — เปรียบเทียบ staff

💸 การเงิน:
• สถานะชำระเงิน (Donut) — รอ/ยืนยัน/ปฏิเสธ
• AI Cost by Provider (Pie)
• Token รายวัน (Area Chart)

👥 ลูกค้า:
• สุขภาพลูกค้า (Donut) — ใช้งาน / เสี่ยง / หลุด
• Sentiment (Bar) — กระจายตัว
• Purchase Intent (Bar)
• แยก Platform (Pie)

📑 เอกสาร:
• สัดส่วนกลุ่ม (Pie) — บัญชี / เอกสาร / ภาพ
• สถานะชำระ (Donut)`,
      },
      {
        title: "Mini-Charts ในหน้าอื่น",
        content: `นอกจากหน้า Analytics แล้ว ยังมี mini-chart ฝังในหน้าเดิม:
• KPI → Pipeline bar + Response time bar
• CRM → Pipeline stage bar chart
• Costs → Daily token line chart
• Payments → Status donut chart
• Documents → Group distribution donut

กราฟทั้งหมดรองรับ Dark/Light theme อัตโนมัติ`,
      },
    ],
    link: { label: "ไป Analytics", href: "/analytics" },
  },
  {
    id: "payments",
    icon: "💸",
    title: "เงินเข้า & สลิป",
    desc: "ตรวจสลิปอัตโนมัติ ยืนยัน/ปฏิเสธ",
    items: [
      {
        title: "ระบบตรวจจับสลิป",
        content: `เมื่อลูกค้าส่งข้อความเกี่ยวกับการชำระเงิน ระบบตรวจจับอัตโนมัติ:

Keyword ที่ตรวจจับ:
"โอนแล้ว", "ส่งสลิป", "จ่ายแล้ว", "ชำระแล้ว", "โอนเงิน", "โอนให้แล้ว"

วิธีการตรวจจับ:
• keyword — เจอคำสำคัญในข้อความ
• keyword+image — เจอคำ + มีรูปแนบ (น่าจะเป็นสลิป)
• image — AI วิเคราะห์รูปว่าเป็นสลิป (Vision AI)

เมื่อตรวจจับได้:
1. สร้าง Payment record สถานะ "รอตรวจสอบ"
2. แจ้งเตือน staff ที่ดูแล (badge สีแดง)
3. Staff เข้ามาดูสลิป → กด "ยืนยัน" หรือ "ปฏิเสธ"
4. ปรับยอด parse จากข้อความ เช่น "โอนแล้ว 5,000 บาท" → amount: 5000`,
      },
      {
        title: "หน้าเงินเข้า",
        content: `สถิติด้านบน:
• รอตรวจสอบ (สีเหลือง) — จำนวนรอ staff ยืนยัน
• ยืนยันแล้ว (สีเขียว) — ผ่านการตรวจ
• ยอดวันนี้ — จำนวนเงินที่ยืนยันวันนี้
• ยอดเดือนนี้ — รวมทั้งเดือน

Filter: ทั้งหมด / รอตรวจ / ยืนยันแล้ว / ปฏิเสธ

แต่ละรายการแสดง:
• ชื่อลูกค้า + platform badge
• รูปสลิป (กดขยายได้)
• จำนวนเงิน
• วิธีตรวจจับ (keyword / keyword+image / image)
• เวลา + ใครยืนยัน`,
      },
    ],
    link: { label: "ไปเงินเข้า", href: "/payments" },
  },
  {
    id: "appointments",
    icon: "📅",
    title: "ระบบนัดหมาย",
    desc: "ปฏิทินนัดหมายสำหรับธุรกิจบริการ",
    items: [
      {
        title: "ประเภทนัดหมาย",
        content: `รองรับ 7 ประเภท:
🏗️ เยี่ยมหน้างาน — ไปดูสถานที่ก่อสร้าง ประเมินราคา วัดพื้นที่
💬 ให้คำปรึกษา — แนะนำวัสดุ คำนวณปริมาณ ออกแบบ
🚛 ส่งสินค้า — จัดส่งวัสดุก่อสร้างหน้างาน
🔧 ติดตั้ง — ติดตั้งประตู หน้าต่าง ระบบไฟฟ้า ประปา
🤝 ประชุม — ประชุมผู้รับเหมา วางแผนโปรเจกต์
📞 ติดตามงาน — ตรวจงาน QC เก็บเงิน follow up
📋 อื่นๆ — นัดหมายทั่วไป`,
      },
      {
        title: "ฟีเจอร์ครบถ้วน",
        content: `• สร้างนัดหมาย — ระบุวัน เวลา สถานที่ ลูกค้า ผู้รับผิดชอบ
• 2 มุมมอง — รายการ (List) หรือ ปฏิทิน (Calendar แยกตามวัน)
• 6 สถานะ — นัดแล้ว → ยืนยัน → กำลังดำเนินการ → เสร็จ / ยกเลิก / ไม่มา
• 3 ระดับความสำคัญ — ด่วน (แดง) / ปกติ (เหลือง) / ต่ำ (เทา)
• แจ้งเตือนก่อนนัด — 30 นาที / 1 ชม. / 2 ชม. / 1 วัน
• Filter — กรองตามประเภท + สถานะ
• เลยกำหนด — badge แดง "เลยกำหนด!" สำหรับนัดที่ยังไม่เสร็จ
• สถิติ — วันนี้ / สัปดาห์นี้ / รอดำเนินการ / เลยกำหนด`,
      },
      {
        title: "วิธีสร้างนัดหมาย",
        content: `1. ไปหน้า "📅 นัดหมาย" จาก sidebar
2. กดปุ่ม "+ สร้างนัดหมาย"
3. กรอกข้อมูล:
   - หัวข้อ (เช่น นัดดูหน้างาน ต่อเติมบ้าน)
   - ลูกค้า + เบอร์โทร
   - ผู้รับผิดชอบ (พนักงาน)
   - ประเภท (เยี่ยมงาน/ส่งของ/ติดตั้ง ฯลฯ)
   - วันที่ + เวลาเริ่ม-สิ้นสุด
   - สถานที่
   - ความสำคัญ + แจ้งเตือน
4. กด "สร้างนัดหมาย"

จัดการ:
• กด "✓ ยืนยัน" เมื่อลูกค้ายืนยัน
• กด "▶ เริ่มงาน" เมื่อออกเดินทาง
• กด "✓ เสร็จแล้ว" เมื่องานเสร็จ
• กด "✕ ยกเลิก" หรือ "👻 ไม่มา" ตามสถานการณ์`,
      },
    ],
    link: { label: "ไปนัดหมาย", href: "/appointments" },
  },
  {
    id: "documents",
    icon: "📑",
    title: "AI จำแนกเอกสาร",
    desc: "14 หมวดหมู่ AI แยกให้ Admin ย้ายได้",
    items: [
      {
        title: "หมวดหมู่เอกสาร",
        content: `ภาพทุกภาพที่ลูกค้าส่งเข้ามา AI จำแนกอัตโนมัติ:

💰 เอกสารบัญชี (6 ประเภท):
• 💳 สลิปโอนเงิน — หลักฐานการชำระ
• 📋 ใบสั่งซื้อ (PO) — Purchase Order
• 📄 ใบเสนอราคา — Quotation
• 🧾 ใบแจ้งหนี้/ใบกำกับภาษี — Invoice
• 🧾 ใบเสร็จรับเงิน — Receipt
• 📦 ใบส่งของ/ใบรับของ — Delivery Note

📄 เอกสารอื่น (4 ประเภท):
• 🪪 บัตรประชาชน/Passport
• 🏢 เอกสารบริษัท (หนังสือรับรอง, ใบอนุญาต)
• 📝 สัญญา/ข้อตกลง
• 📐 สเปคสินค้า/แบบก่อสร้าง/แปลน

🖼️ ภาพทั่วไป (4 ประเภท):
• 📸 รูปสินค้า
• 🏗️ รูปหน้างาน/ไซต์ก่อสร้าง
• 💥 รูปความเสียหาย/เคลม
• 🖼️ ภาพทั่วไป/อื่นๆ`,
      },
      {
        title: "Admin จัดการ",
        content: `AI จำแนกด้วย confidence score (60-100%):
• ถ้า AI มั่นใจ → จัดหมวดอัตโนมัติ
• ถ้า AI ไม่แน่ใจ → สถานะ "รอตรวจ"

Admin ทำได้:
• ย้ายหมวดหมู่ — กด "🔀 ย้ายหมวด" → เลือก category ใหม่
• ยืนยัน — กด "✓ ยืนยัน" (สำหรับเอกสารบัญชี)
• ปฏิเสธ — กด "✕ ปฏิเสธ" + ใส่เหตุผล
• Filter — กรองตามกลุ่ม / หมวดหมู่ / สถานะ
• ดูสถิติ — จำนวนแยกกลุ่ม + ยอดเงินยืนยัน`,
      },
    ],
    link: { label: "ไปเอกสาร", href: "/documents" },
  },
  {
    id: "notifications",
    icon: "🔔",
    title: "แจ้งเตือน Real-time",
    desc: "SSE stream เฉพาะคนที่ดูแล Toast + เสียง + badge",
    items: [
      {
        title: "วิธีทำงาน",
        content: `ระบบแจ้งเตือนใช้ Server-Sent Events (SSE):

• เชื่อมต่อ stream ค้าง → server ส่งข้อมูลทุก 3 วินาที
• ตรวจข้อความใหม่ → เทียบกับ "อ่านถึงไหน" ของ user
• แจ้งเฉพาะ staff ที่ถูก assign ดูแลลูกค้ารายนั้น
• ถ้าไม่มี assignment → แจ้งทุกคน (admin/demo mode)

เมื่อมีข้อความใหม่:
1. Toast popup มุมขวาบน — ชื่อลูกค้า + ข้อความ + platform
2. เสียงแจ้งเตือน (beep สั้น)
3. Badge ตัวเลขสีแดง — ที่ Sidebar (แชท/Inbox) + Bottom Tab

เมื่อเปิดอ่านห้อง → badge ลดลง (mark as seen)
Toast หายเองหลัง 8 วินาที หรือกด X ปิด`,
      },
    ],
  },
  {
    id: "advice",
    icon: "🦐",
    title: "น้องกุ้ง Multi AI Agent",
    desc: "13 บทบาท คุมทั้งระบบ 24/7 — Admin แค่ตอบลูกค้า",
    items: [
      {
        title: "น้องกุ้งคือใคร?",
        content: `น้องกุ้ง 🦐 เป็นสมองกลางคุมระบบทั้งหมด ทำงานอัตโนมัติ 24/7 ไม่ต้องสั่ง

น้องกุ้ง 13 ตัว ทำงานพร้อมกัน แบ่งหน้าที่ชัดเจน:
• Admin เป็นแค่คนตอบลูกค้า
• น้องกุ้งจัดการที่เหลือทั้งหมด — วิเคราะห์ ติดตาม แจ้งเตือน สรุป
• ถ้าพบ CRITICAL → ส่ง Telegram แจ้งเจ้าของทันที`,
      },
      {
        title: "5 บทบาทหลัก (เดิม)",
        content: `🔍 Problem Solver — ทุก 1 ชม.
• วิเคราะห์ปัญหาลูกค้า หาต้นเหตุ เสนอ 5 ทางออก เลือกดีสุด
• ลูกค้าหลุด > 7 วัน → เตือนทันที
• ร้องเรียน → แจ้งด่วนพร้อมวิธีแก้

💰 Sales Hunter — ทุก 1 ชม.
• หาลูกค้าที่พร้อมซื้อ วางกลยุทธ์ปิดการขาย
• ตรวจจับคำว่า "ราคา", "สั่งได้ไหม", "จะซื้อ"
• จัดอันดับ Hot Lead ให้ทีมขาย

👨‍🏫 Team Coach — ทุก 6 ชม.
• วิเคราะห์ทีม ใครตอบช้า ใครเก่ง
• แผนพัฒนารายบุคคล

📋 Weekly Strategist — จันทร์ 08:00
• สรุปสัปดาห์ วิเคราะห์ trend กลยุทธ์สัปดาห์หน้า
• ส่ง Telegram สรุปให้เจ้าของ

❤️ Health Monitor — ทุก 3 ชม.
• Health Score 0-100 ตรวจจับลูกค้าเสี่ยง
• Healthy (70-100) / At Risk (40-69) / Critical (0-39)`,
      },
      {
        title: "8 บทบาทใหม่",
        content: `💳 Payment Guardian — ทุก 1 ชม.
• ตรวจสลิปค้าง pending แจ้ง Admin ยอดรวมที่รอยืนยัน
• ค้าง > 24 ชม. → URGENT alert

📦 Order Tracker — ทุก 2 ชม.
• ติดตามจัดส่ง ลูกค้ารอนาน ร้องเรียนจัดส่งช้า
• จัดลำดับว่าควรติดตามใครก่อน

🔄 Re-engagement Bot — ทุก 4 ชม.
• ดึงลูกค้าที่หายกลับ แบ่ง segment 3/7/30 วัน
• แนะนำข้อความ re-engage ภาษาไทยเป็นมิตร

🎯 Upsell & Cross-sell AI — ทุก 2 ชม.
• แนะนำสินค้าเพิ่มจากประวัติซื้อ + ความสนใจ
• ข้อความไม่ aggressive จังหวะเหมาะสม

📊 Daily Report — ทุกวัน 20:00
• สรุปวัน: ข้อความ ลูกค้าใหม่ ยอดขาย คะแนน 1-10
• ส่ง Telegram ให้เจ้าของ

🏆 Lead Scorer — ทุก 3 ชม.
• ให้คะแนน 0-100 จัดอันดับ Hot/Warm/Cold
• บอกว่าควรติดต่อใครก่อน

📅 Appointment Reminder — ทุก 1 ชม.
• เตือนนัดหมาย เยี่ยมหน้างาน ส่งสินค้า ติดตั้ง
• แจ้งล่วงหน้า 1 ชม.

📈 Price Watcher — ทุกวัน 06:00
• วิเคราะห์คำถามราคา สินค้ายอดนิยม ลูกค้าบอกแพง
• แนะนำกลยุทธ์ราคาและโปรโมชั่น`,
      },
    ],
    link: { label: "ไปน้องกุ้ง", href: "/advice" },
  },
  {
    id: "kb",
    icon: "📚",
    title: "Knowledge Base",
    desc: "สอน AI ตอบคำถามจากฐานความรู้ร้าน",
    items: [
      {
        title: "วิธีใช้ Knowledge Base",
        content: `KB = ฐานความรู้ที่ AI ใช้ตอบลูกค้า

หมวดหมู่:
• product — ข้อมูลสินค้า ราคา สเปค
• promotion — โปรโมชั่น ส่วนลด แคมเปญ
• policy — นโยบายส่ง/คืน/เปลี่ยน ชำระเงิน
• faq — คำถามที่พบบ่อย

วิธีเพิ่ม:
1. ไปหน้า "📚 Knowledge Base"
2. กด "เพิ่มบทความ"
3. เลือกหมวด + ใส่ชื่อ + เนื้อหาละเอียด
4. บันทึก → AI ใช้ข้อมูลนี้ตอบลูกค้าทันที

Tips:
• ใส่ราคาให้ครบทุกสินค้า
• ใส่ขั้นตอนการสั่งซื้อ วิธีชำระ
• ใส่ FAQ ที่ลูกค้าถามบ่อย
• อัพเดตเมื่อเปลี่ยนราคา/โปร`,
      },
    ],
    link: { label: "ไป Knowledge Base", href: "/km" },
  },
  {
    id: "responsive",
    icon: "📱",
    title: "ใช้งานทุกอุปกรณ์",
    desc: "มือถือ Tablet Desktop — auto-hide header",
    items: [
      {
        title: "Responsive Design",
        content: `ระบบออกแบบให้ใช้งานได้ทุกอุปกรณ์:

📱 มือถือ:
• Bottom Tab Bar 5 ปุ่ม: หน้าหลัก, แชท, CRM, KPI, เพิ่มเติม
• กด "เพิ่มเติม" → เมนูทั้งหมดแบบ drawer
• เลื่อนขึ้น → header + bottom nav ซ่อน (เต็มจอ)
• เลื่อนลง → กลับมาแสดง
• Safe area สำหรับ iPhone notch/home bar

📲 Tablet:
• Grid 2 คอลัมน์
• Sidebar + เนื้อหาแบ่งจอ

🖥️ Desktop:
• Full Sidebar 240px
• Grid 3-4 คอลัมน์
• Multi-panel chat 4 จอ`,
      },
    ],
  },
  {
    id: "revenue",
    icon: "💰",
    title: "รายงานรายได้ (Revenue)",
    desc: "ยอดขายรายวัน/เดือน กราฟเทรนด์ เปรียบเทียบ",
    items: [
      {
        title: "Revenue Dashboard",
        content: `หน้า Revenue แสดงภาพรวมรายได้ทั้งหมด:

สถิติหลัก:
• ยอดขายวันนี้ / สัปดาห์นี้ / เดือนนี้
• เปรียบเทียบกับช่วงก่อนหน้า (%)
• ยอดขายเฉลี่ยต่อวัน
• จำนวนออเดอร์

กราฟ:
• เทรนด์ยอดขายรายวัน (Line/Bar Chart)
• ยอดขายแยก platform (LINE/FB/IG)
• ยอดขายแยกพนักงาน
• Top สินค้าขายดี

วิธีใช้:
1. ไปหน้า "💰 รายได้" จาก sidebar
2. เลือกช่วงเวลา (วัน/สัปดาห์/เดือน)
3. ดูกราฟ + ตาราง + สถิติ`,
      },
    ],
    link: { label: "ไปรายได้", href: "/revenue" },
  },
  {
    id: "catalog",
    icon: "🏪",
    title: "แค็ตตาล็อกสินค้า/บริการ",
    desc: "จัดการสินค้า ราคา สต็อก รูปภาพ หมวดหมู่",
    items: [
      {
        title: "จัดการสินค้า",
        content: `ระบบจัดการสินค้า/บริการครบวงจร:

ข้อมูลสินค้าแต่ละตัว:
• ชื่อสินค้า + รหัส (SKU)
• หมวดหมู่ (ปูน, เหล็ก, กระเบื้อง, สี ฯลฯ)
• ราคาขาย + ราคาทุน + ราคาส่ง
• หน่วยนับ (ถุง, เส้น, ก้อน, แผ่น, ตร.ม.)
• จำนวนสต็อก + จุดสั่งซื้อ (reorder point)
• รูปสินค้า (อัพโหลดได้หลายรูป)
• สถานะ (ขายอยู่ / หมด / ยกเลิก)
• รายละเอียด + สเปค

ฟีเจอร์:
• ค้นหา + กรองตามหมวดหมู่/สถานะ
• เรียงตามชื่อ/ราคา/สต็อก
• แก้ไขราคา + สต็อกได้ทันที
• AI ดึงข้อมูลสินค้าไปตอบลูกค้าอัตโนมัติ
• แสดงสินค้าใกล้หมด (สต็อกต่ำ)`,
      },
    ],
    link: { label: "ไปสินค้า", href: "/catalog" },
  },
  {
    id: "broadcast",
    icon: "📢",
    title: "Broadcast ส่งข้อความ",
    desc: "ส่งข้อความหาลูกค้าหลายคนพร้อมกัน แยก segment",
    items: [
      {
        title: "วิธีส่ง Broadcast",
        content: `ส่งข้อความหาลูกค้าหลายคนพร้อมกัน:

ขั้นตอน:
1. ไปหน้า "📢 ส่งข้อความ"
2. เลือกกลุ่มเป้าหมาย:
   • ทั้งหมด — ส่งทุกคน
   • ตาม Platform — LINE / Facebook / Instagram
   • ตาม Pipeline — สนใจ / เสนอราคา / ต่อรอง
   • ตาม Tag — VIP, ลูกค้าเก่า, ผู้รับเหมา ฯลฯ
   • กำหนดเอง — เลือกลูกค้ารายคน
3. พิมพ์ข้อความ (รองรับ text + รูป)
4. ดูตัวอย่าง + จำนวนคนที่จะได้รับ
5. กด "ส่ง" → ระบบส่งทีละคน

ใช้เมื่อไหร่:
• ประกาศโปรโมชั่นใหม่
• แจ้งสินค้าเข้าใหม่
• ส่ง Flash Sale
• Follow up ลูกค้าที่เงียบ
• อวยพรวันเกิด/เทศกาล`,
      },
    ],
    link: { label: "ไป Broadcast", href: "/broadcast" },
  },
  {
    id: "scorecard",
    icon: "🏆",
    title: "คะแนนลูกค้า (Lead Scoring)",
    desc: "จัดอันดับลูกค้าตามโอกาสซื้อ ความสนใจ ความถี่",
    items: [
      {
        title: "ระบบ Lead Scoring",
        content: `AI ให้คะแนนลูกค้าอัตโนมัติจาก:

เกณฑ์การให้คะแนน:
• ความถี่สนทนา — ทักมาบ่อย = คะแนนสูง
• Purchase Intent — AI วิเคราะห์โอกาสซื้อ
• Pipeline Stage — ยิ่งใกล้ปิดการขาย ยิ่งคะแนนสูง
• มูลค่า Deal — deal ใหญ่ = คะแนนสูง
• Response Rate — ลูกค้าตอบกลับเร็ว
• Engagement — ถามรายละเอียดสินค้า, ขอใบเสนอราคา

ระดับ:
🔥 Hot (80-100) — พร้อมซื้อ ปิดได้เลย
🟡 Warm (50-79) — สนใจ ต้อง follow up
🔵 Cool (20-49) — เริ่มสนใจ ยังไม่แน่ใจ
⚪ Cold (0-19) — ยังไม่สนใจ เก็บไว้ nurture

ใช้ประโยชน์:
• จัดลำดับลูกค้าที่ต้อง follow up ก่อน
• มอบลูกค้า Hot ให้ staff ที่ปิดเก่ง
• ส่ง Broadcast เฉพาะกลุ่ม Hot/Warm`,
      },
    ],
    link: { label: "ไป Scorecard", href: "/scorecard" },
  },
  {
    id: "auto-closer",
    icon: "🤝",
    title: "ติดตามปิดการขาย (Auto-closer)",
    desc: "ติดตามลูกค้าอัตโนมัติ แนะนำเวลาและวิธีปิดการขาย",
    items: [
      {
        title: "วิธีทำงาน",
        content: `Auto-closer ช่วยติดตามลูกค้าที่กำลังจะซื้อ:

AI วิเคราะห์:
• ลูกค้าที่อยู่ stage "เสนอราคา" หรือ "ต่อรอง" > 3 วัน
• ลูกค้าที่ purchase intent สูงแต่ยังไม่สั่ง
• ลูกค้าที่เคยถามราคาแล้วเงียบ
• ลูกค้า VIP ที่ไม่ทักมานาน

แนะนำ:
• ⏰ เวลาที่ดีที่สุดในการติดต่อ (วิเคราะห์จาก pattern)
• 💬 ข้อความ template สำหรับ follow up
• 🎁 เสนอส่วนลด/โปรโมชั่นเฉพาะคน
• 📞 แนะนำโทร/แชท/เยี่ยม ตามสถานการณ์

สถานะติดตาม:
🔴 ต้องติดต่อวันนี้ — เลยกำหนด
🟡 ติดต่อภายใน 3 วัน
🟢 ยังไม่ถึงเวลา
✅ ปิดแล้ว — สำเร็จ
❌ ยกเลิก — ลูกค้าไม่สนใจ`,
      },
    ],
    link: { label: "ไป Auto-closer", href: "/auto-closer" },
  },
  {
    id: "inbox",
    icon: "📥",
    title: "กล่องข้อความ (Inbox)",
    desc: "แชทจอเดียว + ข้อมูลลูกค้าด้านขวา",
    items: [
      {
        title: "วิธีใช้ Inbox",
        content: `Inbox = แชทแบบจอเดียว (ต่างจากหน้า Chat ที่เปิดได้ 4 จอ):

• รายชื่อสนทนาทางซ้าย — ค้นหาได้
• แชทตรงกลาง — ส่งข้อความ/รูป
• ข้อมูลลูกค้าทางขวา — sentiment, pipeline, tags
• AI แนะนำคำตอบ — กดปุ่มได้
• ส่งรูป + Media ได้
• Batch send — ส่งข้อความหลายคนพร้อมกัน

เหมาะสำหรับ:
• มือถือ/Tablet — จอเล็กเปิดจอเดียวสะดวกกว่า
• Staff ที่ดูแลลูกค้าทีละคน
• ต้องการดูข้อมูลลูกค้าพร้อมกัน`,
      },
    ],
    link: { label: "ไป Inbox", href: "/inbox" },
  },
  {
    id: "templates",
    icon: "📝",
    title: "แม่แบบข้อความ (Templates)",
    desc: "Quick Reply สำเร็จรูป แยกหมวดหมู่",
    items: [
      {
        title: "วิธีใช้ Templates",
        content: `สร้างข้อความสำเร็จรูปเพื่อตอบเร็วขึ้น:

หมวดหมู่:
• 👋 ทักทาย — สวัสดี ยินดีให้บริการ
• 💰 ราคา — ราคาสินค้า โปรโมชั่น
• 📞 ติดตาม — follow up หลังส่งใบเสนอราคา
• ✅ ปิดการขาย — ขอบคุณ ยืนยันออเดอร์
• 📝 กำหนดเอง — template อื่นๆ

วิธีใช้:
1. สร้าง template ที่ "📝 แม่แบบข้อความ"
2. ในหน้าแชท กดปุ่ม "Quick Reply"
3. เลือก template → แก้ไขก่อนส่งได้
4. กด Enter ส่ง

Tips: ใส่ตัวแปร เช่น {ชื่อลูกค้า} ระบบแทนค่าให้อัตโนมัติ`,
      },
    ],
    link: { label: "ไป Templates", href: "/templates" },
  },
  {
    id: "team",
    icon: "👔",
    title: "ทีมงาน & งานติดตาม",
    desc: "จัดการทีม + สร้างงานติดตามลูกค้า",
    items: [
      {
        title: "จัดการทีมงาน",
        content: `เชิญสมาชิกเข้าทีม กำหนด role:

Role ที่มี:
• Admin — เข้าถึงทุกอย่าง ตั้งค่าได้
• Responder — ตอบแชท ดูลูกค้าที่ assign ให้
• Reviewer — ดูข้อมูลได้ แต่แก้ไขไม่ได้
• Viewer — ดูอย่างเดียว

วิธีเชิญ:
1. ไปหน้า "👔 ทีมงาน"
2. กรอก email → เลือก role → กด "เชิญ"
3. สมาชิกจะเข้าระบบด้วย Google Login`,
      },
      {
        title: "งานติดตาม (Tasks)",
        content: `สร้างงานติดตามลูกค้า:

ข้อมูลงาน:
• หัวข้อ (เช่น โทรหาลูกค้า, ส่งใบเสนอราคา)
• เชื่อมกับลูกค้า (เลือกจาก CRM)
• กำหนดวันส่ง (due date)
• ความสำคัญ (ด่วน / ปกติ / ต่ำ)
• หมายเหตุ
• สถานะ (ค้างอยู่ / เสร็จแล้ว)

สร้างได้จาก:
1. หน้า "📋 งาน" — สร้างงานทั่วไป
2. หน้า CRM รายละเอียดลูกค้า — กดปุ่ม "➕ งานติดตาม"`,
      },
    ],
    link: { label: "ไปทีมงาน", href: "/team" },
  },
  {
    id: "connections",
    icon: "🔗",
    title: "เชื่อมต่อช่องทาง & ตั้งค่าบอท",
    desc: "ทดสอบเชื่อมต่อ LINE/FB/IG + ตั้งค่า prompt/mode ต่อห้อง",
    items: [
      {
        title: "ตรวจสอบช่องทาง",
        content: `หน้า "🔗 ช่องทาง" แสดงสถานะเชื่อมต่อทุก platform:

• LINE OA — ✅ เชื่อมแล้ว / ❌ ยังไม่เชื่อม
• Facebook — ✅ / ❌
• Instagram — ✅ / ❌
• Telegram — ✅ / ❌

กดปุ่ม "ทดสอบ" เพื่อเช็คว่าเชื่อมต่อถูกต้อง
แสดงชื่อ bot, รูปโปรไฟล์ ถ้าเชื่อมสำเร็จ`,
      },
      {
        title: "ตั้งค่าบอท",
        content: `หน้า "🤖 บอท" ตั้งค่า AI ได้ต่อห้อง:

• ชื่อบอท — ตั้งชื่อที่แสดงในแชท
• System Prompt — กำหนดบุคลิก/สไตล์การตอบ
• โหมดตอบ:
  - Auto — AI ตอบทุกข้อความ
  - Mention — AI ตอบเมื่อเรียกชื่อ
  - Keyword — AI ตอบเมื่อเจอ keyword
  - Off — ปิด AI (ตอบเอง)
• Keywords — คำที่ trigger AI ตอบ
• ตั้งค่าแยกต่อห้อง — ห้อง VIP อาจใช้ prompt ต่างจากห้องทั่วไป`,
      },
    ],
    link: { label: "ไปช่องทาง", href: "/connections" },
  },
  {
    id: "settings",
    icon: "⚙️",
    title: "ตั้งค่าระบบ",
    desc: "บัญชี, API Keys, MongoDB, ช่องทาง",
    items: [
      {
        title: "ตั้งค่าทั้งหมด",
        content: `หน้า "⚙️ ตั้งค่า" จัดการ:

👤 บัญชี:
• ชื่อ-อีเมล ผู้ใช้
• เปลี่ยน password (ถ้าใช้ credentials)

🗄️ MongoDB:
• Connection String
• ทดสอบเชื่อมต่อ
• ดู collection + จำนวน document

🤖 AI API Keys:
• OpenRouter, SambaNova, Groq, Cerebras, Google
• ทดสอบ API Key ได้ทันที

📱 LINE Config:
• Channel Access Token
• Channel Secret
• ทดสอบเชื่อมต่อ + ดูข้อมูล bot

📘 Facebook Config:
• Page Access Token
• App Secret
• Verify Token

📱 Telegram:
• Bot Token
• Chat ID`,
      },
    ],
    link: { label: "ไปตั้งค่า", href: "/settings" },
  },
  {
    id: "costs",
    icon: "💰",
    title: "ค่าใช้จ่าย AI (AI Cost)",
    desc: "Token usage แยก provider/feature/วัน",
    items: [
      {
        title: "ดูค่าใช้จ่าย AI",
        content: `ติดตามการใช้ AI tokens ละเอียด:

สถิติ:
• ยอดวันนี้ — tokens + ค่าใช้จ่าย + จำนวน calls
• ยอดเดือนนี้
• Input vs Output tokens

แยกตาม Feature:
• Chat Reply — AI ตอบแชท
• Sentiment Analysis — วิเคราะห์ความรู้สึก
• Vision AI — วิเคราะห์รูป
• Embedding — สร้าง vector
• MCP Tools — เครื่องมือ AI

แยกตาม Provider:
• OpenRouter / SambaNova / Groq / Cerebras / Gemini
• จำนวน calls + tokens + cost per provider

รายการล่าสุด:
• 50 รายการ — provider, model, feature, tokens, cost, เวลา`,
      },
    ],
    link: { label: "ไป AI Cost", href: "/costs" },
  },
  {
    id: "deploy",
    icon: "🐳",
    title: "Deploy & Technical",
    desc: "Docker Compose, Caddy, Architecture",
    items: [
      {
        title: "Architecture",
        content: `LINE / Facebook / Instagram
  ↓ webhook
Caddy (Auto HTTPS + Reverse Proxy)
  ↓
Agent (Node.js) → AI + RAG + MCP → reply
  ↓
MongoDB (messages + users + teams)
  ↓
OpenClaw (แกนหลัก) ← cron ทุก 1 ชม. → วิเคราะห์ → advice
  ↓
Dashboard (Next.js 16) → Auth → CRM + KPI + Analytics`,
      },
      {
        title: "Tech Stack",
        content: `• Next.js 16 — React Framework, App Router, Server Actions
• MongoDB — NoSQL Database (Atlas หรือ Docker)
• Recharts — กราฟ/chart React-native
• Tailwind CSS v4 — Utility-first CSS, Dark/Light Theme
• NextAuth.js — Authentication (Google OAuth + JWT)
• Caddy Server — Reverse Proxy, Auto HTTPS (Let's Encrypt)
• Docker Compose — Container Orchestration
• AI Multi-Provider — OpenRouter, Groq, SambaNova, Cerebras, Gemini
• LINE/Meta API — Webhook + Messaging
• SSE (Server-Sent Events) — Real-time Notifications`,
      },
      {
        title: "Deploy ด้วย Docker",
        content: `1. Clone repo: git clone https://github.com/smlsoft/openclawminicrm.git
2. Copy .env.example → .env แล้วใส่ค่าทั้งหมด
3. Run: docker compose -f docker-compose.caddy.yml up -d
4. เปิด https://your-domain.com/dashboard

Commands:
• Seed data: curl -X POST https://domain/dashboard/api/seed
• Rebuild: curl -X POST https://domain/dashboard/api/rebuild
• View logs: docker compose logs -f dashboard`,
      },
    ],
  },
];

// ─── Components ───
function SectionCard({ section }: { section: Section }) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div id={section.id} className="scroll-mt-16">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center text-xl shadow-md shrink-0"
          style={{ boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}>
          {section.icon}
        </div>
        <div>
          <h2 className="text-base md:text-lg font-bold" style={{ color: "var(--text-primary)" }}>{section.title}</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{section.desc}</p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 ml-0 md:ml-13">
        {section.items.map((item, i) => (
          <div key={i} className={`card overflow-hidden ${openItems.has(i) ? "ring-1 ring-indigo-500/15" : ""}`}>
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
            >
              <span className="w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0"
                style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.title}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
                className={`transition-transform ${openItems.has(i) ? "rotate-180" : ""}`}
                style={{ color: "var(--text-muted)" }}>
                <path d="M2 4l4 4 4-4" strokeLinecap="round" />
              </svg>
            </button>
            {openItems.has(i) && (
              <div className="px-4 pb-4 animate-fade-in">
                <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans"
                  style={{ color: "var(--text-secondary)" }}>
                  {item.content}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Link */}
      {section.link && (
        <div className="mt-3 ml-0 md:ml-13">
          <Link href={section.link.href}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition gradient-bg text-white hover:opacity-90 shadow-md">
            {section.link.label} →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Page ───
export default function GuidePage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg md:text-xl font-bold" style={{ color: "var(--text-primary)" }}>📖 คู่มือการใช้งาน</h1>
          <p className="text-xs md:text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>OpenClaw Mini CRM — คู่มือละเอียดทุกฟีเจอร์</p>
        </div>
      </header>

      <main className="page-content">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="card p-5 md:p-6 mb-8 overflow-hidden relative">
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ background: "linear-gradient(135deg, var(--gradient-from), var(--gradient-to))" }} />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 gradient-bg rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                  style={{ boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>💬</div>
                <div>
                  <h2 className="text-base md:text-lg font-bold gradient-text">OpenClaw Mini CRM</h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>AI Chat Intelligence — Open Source เพื่อการศึกษา</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                ระบบ CRM อัจฉริยะรวม LINE, Facebook, Instagram ในจอเดียว AI วิเคราะห์ทุกข้อความ แนะนำคำตอบ จำลูกค้าทุกคน
                พร้อม Analytics Dashboard, Payment Tracking, Document Intelligence, Real-time Notifications
              </p>
            </div>
          </div>

          {/* Quick nav */}
          <div className="flex flex-wrap gap-1.5 mb-8">
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`}
                className="px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-medium transition border hover:bg-[var(--bg-hover)]"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                {s.icon} {s.title}
              </a>
            ))}
          </div>

          {/* Sections */}
          <div className="space-y-10">
            {SECTIONS.map(section => (
              <SectionCard key={section.id} section={section} />
            ))}
          </div>

          {/* Footer */}
          <div className="card p-5 mt-10 text-center">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Open Source เพื่อการศึกษา</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Fork ไปพัฒนาต่อยอดได้เลย</p>
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
              <Link href="/" className="px-4 py-2 rounded-xl text-xs font-medium gradient-bg text-white hover:opacity-90 transition">📊 ไป Dashboard</Link>
              <Link href="/analytics" className="px-4 py-2 rounded-xl text-xs font-medium transition" style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>📊 Analytics</Link>
              <a href="https://github.com/smlsoft/openclawminicrm" target="_blank" className="px-4 py-2 rounded-xl text-xs font-medium transition" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>GitHub</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
