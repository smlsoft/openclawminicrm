<div align="center">

# OpenClaw Mini CRM 🦐

### AI Chat Intelligence — LINE · Facebook · Instagram

**ระบบ CRM อัจฉริยะ Open Source เพื่อการศึกษา**
**รวมทุกแชทในจอเดียว — AI ช่วยตอบ ช่วยขาย ช่วยจำลูกค้า**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](docker-compose.prod.yml)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](#tech-stack)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](#tech-stack)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](#tech-stack)
[![LINE](https://img.shields.io/badge/LINE-Messaging_API-00C300?logo=line&logoColor=white)](#multi-platform)
[![Facebook](https://img.shields.io/badge/Facebook-Graph_API-1877F2?logo=facebook&logoColor=white)](#multi-platform)
[![Instagram](https://img.shields.io/badge/Instagram-Graph_API-E4405F?logo=instagram&logoColor=white)](#multi-platform)

[Demo](https://crm.satistang.com/dashboard) · [Documentation](docs/INSTALL.md) · [Deploy Guide](docs/DEPLOY-HETZNER.md) · [Report Bug](https://github.com/smlsoft/openclawminicrm/issues)

</div>

---

> **English:** OpenClaw Mini CRM is a free, open-source AI-powered CRM for Thai SMEs. It unifies LINE, Facebook, and Instagram conversations in a single dashboard, provides AI-driven chat analysis (sentiment, purchase intent, auto-tagging), automated replies with RAG-powered knowledge base, customer memory & learning, churn prediction, and a 24/7 AI advisor ("น้องกุ้ง 🦐"). Fully self-hosted on Docker Compose + Hetzner VPS. Zero monthly cost.

---

## สารบัญ (Table of Contents)

- [ปัญหาที่แก้ได้](#ปัญหาที่คุณเจอทุกวัน)
- [OpenClaw แก้ยังไง](#openclaw-แก้ยังไง)
- [ตัวอย่างการใช้งาน](#ตัวอย่างการใช้งานจริง)
- [สิ่งที่ได้ — ภาพรวม](#สิ่งที่ได้--ภาพรวม)
- [คุณสมบัติทั้งหมด](#คุณสมบัติทั้งหมด-รายละเอียด)
  - [Multi-Panel Chat](#1--multi-panel-chat--เปิดหลายแชทพร้อมกัน)
  - [AI วิเคราะห์ทุกข้อความ](#2--ai-วิเคราะห์ทุกข้อความ--อัตโนมัติ-100)
  - [น้องกุ้ง AI Advisor](#3--น้องกุ้ง--ai-advisor-5-บทบาท)
  - [AI แนะนำ + ตอบแทน](#4--ai-แนะนำคำตอบ--ตอบแทนอัตโนมัติ)
  - [Knowledge Base](#5--knowledge-base--ฐานความรู้ร้าน)
  - [AI Learning](#6--ai-learning--ยิ่งใช้ยิ่งฉลาด)
  - [PDPA + Security](#61--ปกป้องข้อมูลลูกค้า-pdpa--security)
  - [Human Handoff](#62--human-handoff--ส่งต่อให้คนจริง)
  - [Churn Prediction](#63--churn-prediction--ทำนายลูกค้าที่กำลังจะหาย)
  - [Smart Routing](#64--smart-routing--แยก-topic-อัตโนมัติ)
  - [A/B Testing AI](#65--ab-testing-ai--ทดสอบสไตล์-ai-อัตโนมัติ)
  - [Telegram Bot](#7--คุยกับน้องกุ้งผ่าน-telegram)
  - [Cross-Platform Merge](#71--รวมลูกค้าข้าม-platform)
  - [CRM อัตโนมัติ](#8--crm-อัตโนมัติ--ไม่ต้องกรอกข้อมูลเอง)
  - [KPI พนักงาน](#9--kpi-พนักงาน)
  - [เงินเข้า & สลิป](#10--เงินเข้า--ตรวจสลิปอัตโนมัติ)
  - [AI จำแนกเอกสาร](#11--ai-จำแนกเอกสาร--document-intelligence)
  - [แจ้งเตือน Real-time](#12--แจ้งเตือน-real-time)
  - [Responsive Design](#13--responsive-design)
- [หน้าจอทั้งหมด (30+ หน้า)](#หน้าจอทั้งหมด-30-หน้า)
- [เพื่อการศึกษา](#เพื่อการศึกษา)
- [Use Cases](#use-cases--ตัวอย่างการใช้จริง)
- [ข้อดี](#ข้อดี)
- [ข้อกังวล — ตอบตรงๆ](#ข้อกังวล--ตอบตรงๆ)
- [สำหรับ Developer](#สำหรับ-developer)
  - [Architecture](#architecture)
  - [Tech Stack](#tech-stack)
  - [Services](#services)
  - [Quick Start](#quick-start)
  - [API Endpoints](#key-api-endpoints-agent)
  - [MongoDB Collections](#mongodb-collections)
- [เอกสาร](#เอกสาร)
- [Contributing](#contributing)
- [License](#license)
- [ติดต่อ](#ติดต่อ)

---

## สำหรับเจ้าของกิจการ — อ่านตรงนี้ก่อน

### ปัญหาที่คุณเจอทุกวัน

- ลูกค้าทักมา LINE, Facebook, Instagram **พร้อมกัน** → สลับแอปไม่ทัน
- พนักงานตอบช้า → **ลูกค้าไปร้านอื่น**
- ลูกค้าถามราคา พนักงาน 3 คน **ตอบไม่เหมือนกัน**
- ไม่รู้ว่าลูกค้าคนไหน **พร้อมซื้อ** คนไหน **กำลังจะหนี**
- เจ้าของ **ไม่รู้ว่าเกิดอะไรขึ้น** จนลูกค้าหายไปแล้ว

### OpenClaw แก้ยังไง?

```
ลูกค้าทักมา (LINE / Facebook / Instagram)
     ↓
  OpenClaw รวมทุกแชทในจอเดียว
     ↓
  ┌──────────────────────────────────────────────┐
  │  AI วิเคราะห์ทุกข้อความอัตโนมัติ:            │
  │  • ลูกค้าคนนี้พอใจไหม?                       │
  │  • สนใจซื้อหรือยัง?                           │
  │  • ต้องรีบตอบไหม?                             │
  │                                              │
  │  AI แนะนำว่าควรตอบอะไร พร้อมเหตุผล           │
  │  ไม่มีคนตอบ 5 นาที? AI ตอบให้!               │
  │  ดึงข้อมูลจากฐานความรู้ร้านตอบแม่นๆ          │
  │  จำลูกค้าแต่ละคน ยิ่งใช้ยิ่งเก่ง              │
  └──────────────────────────────────────────────┘
     ↓
  เจ้าของเห็นทุกอย่าง: KPI พนักงาน, ลูกค้าเสี่ยง, โอกาสขาย
```

### ตัวอย่างการใช้งานจริง

**ร้านขายเครื่องกรองน้ำ:**
1. ลูกค้าทักมา LINE ถาม "รุ่น A ราคาเท่าไหร่"
2. AI ไฮไลท์ทันที: "สนใจซื้อ!"
3. พนักงานเปิดแชท → กด AI แนะนำ:
   - "รุ่น A ราคา 12,900 ผ่อน 0% 10 เดือน" (เหตุผล: ลูกค้าถามราคาตรงๆ ควรบอกชัด)
4. พนักงานกด "ใช้เลย" → แก้นิดหน่อย → ส่ง
5. ลูกค้าซื้อ → AI เรียนรู้: "ตอบราคาชัด + บอกผ่อน → ปิดการขายได้"
6. ลูกค้าคนต่อไปถามคล้ายๆ กัน → AI แนะนำดีขึ้นเรื่อยๆ

**ค่าใช้จ่าย: ฿0 / เดือน** (ทุกอย่างใช้ฟรี)

---

## สิ่งที่ได้ — ภาพรวม

| สิ่งที่ได้ | รายละเอียด |
|-----------|-----------|
| **รวมแชท 3 ช่องทาง** | LINE + Facebook + Instagram ในจอเดียว ไม่ต้องสลับแอป |
| **เปิดหลายแชทพร้อมกัน** | เปิดได้ 4 จอ ตอบลูกค้าหลายคนพร้อมกัน |
| **AI ตอบแทนอัตโนมัติ** | ไม่มีคนตอบ 5 นาที AI ช่วยตอบ (ดึงข้อมูลจากฐานความรู้ร้าน) |
| **AI แนะนำคำตอบ** | กดปุ่มเดียว AI บอกว่าควรตอบอะไร ทำไม |
| **จำลูกค้าทุกคน** | AI จำว่าลูกค้าคนนี้ชอบอะไร เคยซื้ออะไร ควรตอบแบบไหน |
| **เรียนรู้ตลอด** | ลูกค้าซื้อ/ชม/ร้องเรียน AI จำไว้ ปรับการแนะนำให้ดีขึ้นเรื่อยๆ |
| **ฐานความรู้ร้าน** | ใส่ราคา โปรโมชั่น เงื่อนไข → AI ดึงไปตอบลูกค้าให้ถูกต้อง |
| **ประหยัดค่า LINE** | ตอบเร็ว = ใช้ Reply API ฟรี! ทุกข้อความบอกว่า "ฟรี" หรือ "เสียเงิน" |
| **รู้ว่าใครจะซื้อ** | AI ให้คะแนนลูกค้า: สนใจซื้อ / ไม่สนใจ / กำลังจะหนี |
| **KPI พนักงาน** | รู้ว่าใครตอบเร็ว ใครตอบช้า ใครปิดการขายได้ |
| **AI ที่ปรึกษา 24/7** | น้องกุ้ง 🦐 วิเคราะห์ธุรกิจให้ทุกชั่วโมง ส่ง Telegram แจ้งเตือน |
| **ปกป้องข้อมูล PDPA** | PII Masking + Audit Log + Privacy Notice + Opt-out + Right to Delete |
| **ทำนายลูกค้าหาย** | Churn Prediction เตือนก่อนลูกค้าหายไป |
| **ฟรี 100%** | ไม่มีค่าใช้จ่ายรายเดือน ข้อมูลเป็นของคุณ |

---

## คุณสมบัติทั้งหมด (รายละเอียด)

### 1. Multi-Panel Chat — เปิดหลายแชทพร้อมกัน

**เปิดได้สูงสุด 4 สนทนาพร้อมกัน** — LINE, Facebook, Instagram เรียงข้างกัน ไม่ต้องสลับแอป

| ช่องทาง | สี | รับ | ตอบ | ส่งได้ |
|---------|-----|-----|-----|--------|
| LINE OA | เขียว | ✅ | ✅ | ข้อความ · รูป · สติกเกอร์ · วิดีโอ · เสียง · ตำแหน่ง · Flex |
| Facebook | น้ำเงิน | ✅ | ✅ | ข้อความ · รูป (เร็วๆ นี้) |
| Instagram | ม่วง-ชมพู | ✅ | ✅ | ข้อความ · รูป (เร็วๆ นี้) |

- **แยกสีตาม platform** — เห็นปุ๊บรู้เลยว่าคุยกับลูกค้าช่องทางไหน
- **Reply-first** — ตอบ LINE ภายใน 25 วิ = **Reply API ฟรี!** หมดเวลา = fallback Push อัตโนมัติ
- **แสดง ✓ฟรี / push** ทุกข้อความ — รู้ค่าใช้จ่ายทันที
- **สติกเกอร์ LINE ฟรี** 6 ชุด + **อัพโหลดรูป** + **แชร์ตำแหน่ง GPS**
- **ข้อความใหม่กะพริบ** — จุดแดง ไม่พลาดลูกค้า
- **Badge "สนใจซื้อ!"** — เห็นปุ๊บรู้ว่าลูกค้าคนไหนพร้อมซื้อ
- **Inbox เดิม** ยังใช้ได้ปกติ (จอเดียว + Customer Info sidebar)

---

### 2. AI วิเคราะห์ทุกข้อความ — อัตโนมัติ 100%

ทุกข้อความที่ลูกค้าส่งเข้ามา AI วิเคราะห์ให้ทันที:

| วิเคราะห์ | ผลลัพธ์ | ตัวอย่าง |
|-----------|---------|---------|
| ความพอใจลูกค้า | ปกติ / ติดตาม / ไม่พอใจ | "ลูกค้าเริ่มไม่พอใจเรื่องจัดส่งช้า" |
| โอกาสซื้อ | ไม่สนใจ / เริ่มสนใจ / สนใจมาก! | "ลูกค้าถามราคาและขอใบเสนอราคา" |
| แท็กอัตโนมัติ | tags | ถามราคา, สนใจสินค้า, ร้องเรียน |
| Sales Pipeline | stages | ใหม่ → สนใจ → เสนอราคา → ปิดการขาย |

**ไม่ต้องทำอะไรเลย — AI ทำให้หมด**

---

### 3. น้องกุ้ง — AI Advisor 5 บทบาท

น้องกุ้งทำงาน **24/7 อัตโนมัติ** ไม่ต้องสั่ง:

| บทบาท | ทำงาน | หน้าที่ |
|-------|-------|---------|
| **Problem Solver** | ทุก 1 ชม. | วิเคราะห์ปัญหาลูกค้า → หาต้นเหตุ → 5 ทางออก → เลือกดีสุด |
| **Sales Hunter** | ทุก 1 ชม. | หาลูกค้าที่อยากซื้อ → กลยุทธ์ปิดการขาย |
| **Team Coach** | ทุก 6 ชม. | วิเคราะห์ทีม → แผนพัฒนารายบุคคล |
| **Weekly Strategist** | จันทร์ 08:00 | สรุปสัปดาห์ → กลยุทธ์สัปดาห์หน้า |
| **Health Monitor** | ทุก 3 ชม. | Health Score 0-100 → ตรวจจับลูกค้าเสี่ยงก่อนหาย |

ถ้าพบ CRITICAL → **ส่ง Telegram แจ้งเตือนทันที!**

---

### 4. AI แนะนำคำตอบ + ตอบแทนอัตโนมัติ

**น้องกุ้งตอบแทน (4 โหมด):**

| Mode | พฤติกรรม |
|------|---------|
| **ปิด** | ฟังอย่างเดียว ไม่ตอบ (default) |
| **อัตโนมัติ** | ตอบทุกข้อความ |
| **เรียกชื่อ** | ตอบเมื่อลูกค้าเรียก "น้องกุ้ง" |
| **Keyword** | ตอบเมื่อมี keyword เช่น "ราคา", "สั่ง" |

**AI ตอบแทน 5 นาที:**
- ไม่มีใครตอบ 5 นาที → AI ตอบให้อัตโนมัติ
- **เฉพาะ 1-on-1** ไม่ตอบในกลุ่ม (ประหยัดค่า Push)
- ขึ้น "🤖 ตอบอัตโนมัติ" ชัดเจน ลูกค้าไม่สับสน
- ใช้ข้อมูลจาก **Knowledge Base + Memory** ตอบแม่นยำ

**AI แนะนำคำตอบ (ปุ่ม 💡):**
- กดปุ่มเดียว → AI แนะนำ 2-3 คำตอบ พร้อม**เหตุผล**
- Tone: เป็นมิตร / มืออาชีพ / เร่งด่วน / เห็นอกเห็นใจ
- ปุ่ม "ใช้เลย" + "📋 Copy" → แก้นิดหน่อยแล้วส่ง

---

### 5. Knowledge Base — ฐานความรู้ร้าน

> **สำหรับเจ้าของกิจการ:** ใส่ข้อมูลร้านของคุณ → AI จะดึงไปตอบลูกค้าให้ถูกต้อง

| ใส่อะไร | ตัวอย่าง | AI ใช้ยังไง |
|---------|---------|-----------|
| สินค้า | รุ่น A ราคา 12,900 กรอง 4 ขั้นตอน | ลูกค้าถามราคา → AI ตอบถูก |
| โปรโมชั่น | มี.ค. ลด 20% เฉพาะรุ่น B | AI บอกโปรที่ยังไม่หมด |
| นโยบาย | เปลี่ยนคืนภายใน 7 วัน ต้องมีกล่อง | ลูกค้าถามเรื่องคืน → AI ตอบถูก |
| คำถามบ่อย | ใช้กับน้ำประปาได้ไหม? → ได้ | ลดภาระตอบซ้ำๆ |
| จัดส่ง | ส่งฟรีทั่วประเทศ Kerry 2-3 วัน | ลูกค้าถามจัดส่ง → AI ตอบได้เลย |
| ชำระเงิน | โอน/PromptPay/ผ่อน 0% | ลูกค้าถาม "ผ่อนได้ไหม" → AI ตอบได้ |

- **เปิด/ปิด** ได้ตลอด — โปรหมดกดปิด AI ไม่เอาไปใช้
- **ยิ่งใส่ละเอียด AI ยิ่งตอบแม่น** — ราคา เงื่อนไข วันหมดอายุ ใส่ให้ครบ

---

### 6. AI Learning — ยิ่งใช้ยิ่งฉลาด

> **สำหรับเจ้าของกิจการ:** AI จำลูกค้าทุกคน เรียนรู้จากทุกครั้งที่ลูกค้าซื้อ/ชม/ร้องเรียน แล้วปรับวิธีแนะนำให้ดีขึ้นเรื่อยๆ

**จำลูกค้ารายคน:**
- AI สรุปทุก 10 ข้อความ → จำว่าลูกค้าคนนี้ชอบอะไร สไตล์ยังไง
- ลูกค้าคนเดิมกลับมา → AI รู้ทันทีว่าเคยคุยอะไร สนใจอะไร

**เรียนรู้จากผลลัพธ์:**

| เหตุการณ์ | AI เรียนรู้ | ใช้กับคนอื่นด้วย |
|-----------|-----------|----------------|
| ลูกค้าซื้อ | "ตอบราคาชัด + บอกผ่อน → ปิดได้" | ✅ |
| ลูกค้าชม | "ตอบเร็ว + ใส่ใจ → ประทับใจ" | ✅ |
| ลูกค้าร้องเรียน | "ตอบช้า + ไม่ขอโทษ → ไม่พอใจ" | ✅ |

**ปุ่ม 🧠 ในหน้าแชท** — ดู Memory + Skills ของลูกค้าแต่ละคน

---

### 6.1 ปกป้องข้อมูลลูกค้า (PDPA + Security)

> **สำหรับเจ้าของกิจการ:** ข้อมูลลูกค้าถูกปกป้องตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA) อัตโนมัติ

| ระบบป้องกัน | ทำอะไร |
|------------|--------|
| **PII Masking** | เบอร์โทร เลขบัตร email ถูก mask ก่อนส่ง AI — AI ไม่เห็นข้อมูลจริง |
| **Prompt Injection** | ป้องกันลูกค้าหลอก AI ให้เปิดเผยข้อมูล (8 patterns) |
| **Audit Log** | บันทึกทุก action ของพนักงาน — ใครทำอะไร เมื่อไหร่ |
| **Privacy Notice** | แจ้ง PDPA อัตโนมัติเมื่อลูกค้าทักมาครั้งแรก |
| **Opt-out** | ลูกค้าพิมพ์ "หยุด" → หยุดส่ง AI อัตโนมัติทันที |
| **Right to Delete** | ลูกค้าพิมพ์ "ลบข้อมูล" → ระบบรับคำขอ ดำเนินการภายใน 30 วัน |
| **Rate Limit** | จำกัดจำนวน request ป้องกัน spam (AI 10/นาที, ส่ง 30/นาที) |
| **File Validation** | ตรวจ magic bytes ของรูปก่อนรับ — ป้องกันไฟล์อันตราย |

---

### 6.2 Human Handoff — ส่งต่อให้คนจริง

> **สำหรับเจ้าของกิจการ:** ลูกค้าบอก "ขอคุยกับพนักงาน" → AI หยุดตอบ แจ้ง alert ให้ทีมงานทันที

- ลูกค้าพิมพ์ "ขอคุยกับพนักงาน" / "ไม่ใช่ bot" → AI ส่งต่อทันที
- แจ้ง alert ใน Dashboard ให้พนักงาน
- AI ตอบ "ส่งต่อให้ทีมงานแล้วค่ะ กรุณารอสักครู่"

---

### 6.3 Churn Prediction — ทำนายลูกค้าที่กำลังจะหาย

> **สำหรับเจ้าของกิจการ:** ระบบเตือนอัตโนมัติว่าลูกค้าคนไหนเสี่ยงหาย

| ระดับ | เงื่อนไข | ความหมาย |
|-------|---------|----------|
| ควรติดตาม | ไม่มีข้อความ 3-7 วัน | เริ่มเงียบ ควรทักไปก่อน |
| เสี่ยงหลุด | ไม่มีข้อความ 7-30 วัน | ใกล้หายแล้ว ต้องรีบตาม |
| อาจหายไปแล้ว | ไม่มีข้อความ 30+ วัน | ต้องหาทางดึงกลับ |

---

### 6.4 Smart Routing — แยก topic อัตโนมัติ

ข้อความลูกค้าถูกแยก topic อัตโนมัติ:
- **sales** — ถามราคา/โปร/สนใจซื้อ
- **shipping** — ถามจัดส่ง/ติดตามพัสดุ
- **support** — แจ้งปัญหา/สินค้าเสีย
- **returns** — ขอคืน/เปลี่ยน
- **orders** — สั่งซื้อ/ชำระเงิน
- **complaint** — ร้องเรียน

ช่วยให้ admin จัดลำดับความสำคัญได้ง่ายขึ้น

---

### 6.5 A/B Testing AI — ทดสอบสไตล์ AI อัตโนมัติ

ระบบทดสอบ 2 สไตล์ AI ตอบลูกค้า:
- **สไตล์ A:** ตอบสั้นกระชับ ไม่เกิน 2 ประโยค
- **สไตล์ B:** ตอบเป็นมิตร ใส่ emoji อบอุ่น ไม่เกิน 3 ประโยค

ลูกค้าแต่ละคนได้สไตล์ต่างกัน → ระบบเก็บผลลัพธ์ → รู้ว่าสไตล์ไหนลูกค้าชอบมากกว่า

---

### 7. คุยกับน้องกุ้งผ่าน Telegram

> **สำหรับเจ้าของกิจการ:** ถาม AI ผ่าน Telegram ได้ตลอดเวลา ไม่ต้องเปิดคอม

```
คุณ: "สรุปแชทวันนี้"
🦐: "วันนี้มี 45 ข้อความ จาก 8 ห้อง
     ลูกค้า 2 รายถามราคา → โอกาสขาย
     ⚠️ ห้อง A ตอบช้า 45 นาที ควรติดตาม"

คุณ: "ลูกค้าไหนต้องติดตาม?"
🦐: "1. คุณนิดา — ถามราคา 3 ครั้ง ยังไม่ได้เสนอราคา
     2. คุณสมชาย — ไม่พอใจเรื่องจัดส่ง ควรโทรขอโทษ"
```

---

### 7.1 รวมลูกค้าข้าม Platform

> **สำหรับเจ้าของกิจการ:** ลูกค้าคนเดียวกันทักมา LINE + Facebook + Instagram = 3 records → ระบบช่วยหาแล้วรวมเป็นคนเดียว

**สแกนอัตโนมัติ:** ระบบหาลูกค้าซ้ำจาก ชื่อเหมือน / เบอร์เดียวกัน / email เดียวกัน / ชื่อคล้ายกัน

**รวมเอง (Manual):** admin เลือกลูกค้า 2 คนมารวมได้เอง กรณีระบบหาไม่เจอ
- ค้นหาด้วยชื่อ / เบอร์ / email
- เลือกตัวหลัก (เก็บไว้) + ตัวที่จะรวมเข้า (ลบ)
- ประวัติสนทนาไม่หาย — rooms + platformIds + tags รวมกัน

---

### 8. CRM อัตโนมัติ — ไม่ต้องกรอกข้อมูลเอง

- ลูกค้าทักมา → ระบบสร้างข้อมูลลูกค้าอัตโนมัติ
- ดึงรูป + ชื่อจาก LINE/Facebook/Instagram อัตโนมัติ
- Pipeline: ใหม่ → สนใจ → เสนอราคา → ต่อรอง → ปิดการขาย
- มูลค่า Deal + วันที่คาดว่าจะปิด

### 9. KPI พนักงาน

| KPI | วัดอะไร |
|-----|---------|
| เวลาตอบเฉลี่ย | พนักงานตอบเร็วแค่ไหน |
| อัตราปิดการขาย | ปิดได้กี่ % |
| ลูกค้าหลุด | เคยคุยแล้วหายไป > 7 วัน |
| เสี่ยงหลุด | ไม่มีข้อความ 3-7 วัน (เตือนก่อนหลุด!) |

### 10. 💸 เงินเข้า — ตรวจสลิปอัตโนมัติ

- ลูกค้าส่งสลิป/พิมพ์ "โอนแล้ว" → **AI ตรวจจับทันที** → สร้าง Payment record
- Staff **ยืนยัน/ปฏิเสธ** พร้อมเหตุผล
- สถิติ: รอตรวจ, ยืนยันแล้ว, ยอดวันนี้, ยอดเดือน
- Detection: keyword (โอนแล้ว, ส่งสลิป, จ่ายแล้ว) + image analysis

### 11. 📑 AI จำแนกเอกสาร — Document Intelligence

ภาพทุกภาพที่ลูกค้าส่ง AI จำแนกอัตโนมัติ:

| กลุ่ม | หมวดหมู่ |
|-------|---------|
| **💰 เอกสารบัญชี** | สลิปโอนเงิน, ใบสั่งซื้อ (PO), ใบเสนอราคา, ใบแจ้งหนี้/ใบกำกับภาษี, ใบเสร็จ, ใบส่งของ |
| **📄 เอกสารอื่น** | บัตรประชาชน, เอกสารบริษัท, สัญญา, สเปค/แบบก่อสร้าง |
| **🖼️ ภาพทั่วไป** | รูปสินค้า, รูปหน้างาน, รูปเคลม, ภาพทั่วไป |

- AI แยก + confidence score + Admin **ย้ายหมวดหมู่ได้** (ถ้า AI ผิด)
- Filter ตามกลุ่ม/หมวดหมู่/status
- ยืนยัน/ปฏิเสธ เอกสารบัญชี + ยอดเงินรวม

### 12. 🔔 แจ้งเตือน Real-time

- **SSE (Server-Sent Events)** stream ทุก 3 วินาที
- แจ้งเตือน **เฉพาะ staff ที่ถูก assign** ดูแลลูกค้า
- Toast popup + เสียงแจ้งเตือน + Badge ตัวเลขสีแดง
- Mark as seen เมื่อเปิดอ่าน

### 14. 📅 ระบบนัดหมาย (Appointment System)

- ปฏิทินนัดหมายสำหรับธุรกิจบริการ
- **7 ประเภท:** เยี่ยมหน้างาน, ให้คำปรึกษา, ส่งสินค้า, ติดตั้ง, ประชุม, ติดตาม, อื่นๆ
- **6 สถานะ:** นัดแล้ว → ยืนยัน → กำลังดำเนินการ → เสร็จ / ยกเลิก / ไม่มา
- **2 มุมมอง:** รายการ (List) + ปฏิทิน (Calendar แยกตามวัน)
- **แจ้งเตือน** ก่อนนัด 30 นาที / 1 ชม. / 2 ชม. / 1 วัน
- สถิติ: วันนี้ / สัปดาห์ / เลยกำหนด
- Filter ตามประเภท + สถานะ + staff
- เชื่อมกับข้อมูลลูกค้า (customerName, phone)

### 15. 💰 Revenue Dashboard — รายงานรายได้
- ยอดขายรายวัน/รายเดือน + กราฟเทรนด์
- เปรียบเทียบช่วงเวลา

### 16. 🏪 Catalog สินค้า/บริการ
- จัดการสินค้า ราคา สต็อก รูปภาพ หมวดหมู่
- ค้นหา + filter

### 17. 📢 Broadcast ส่งข้อความ
- ส่งข้อความหาลูกค้าหลายคนพร้อมกัน
- แยก segment กลุ่มเป้าหมาย

### 18. 🏆 Lead Scoring คะแนนลูกค้า
- จัดอันดับลูกค้าตามโอกาสซื้อ ความสนใจ ความถี่
- AI ให้คะแนนอัตโนมัติ

### 19. 🤝 Auto-closer ติดตามปิดการขาย
- ติดตามลูกค้าอัตโนมัติ
- แนะนำเวลาและวิธีปิดการขาย

### 20. 📊 Analytics Dashboard (Recharts)

- หน้า `/analytics` รวมกราฟทั้งหมด **6 tabs**:
  - **ภาพรวม:** ข้อความรายวัน (Line), Platform mix (Pie), Sentiment (Donut)
  - **การขาย:** Pipeline funnel (Bar), Deal value, Win/Loss (Pie)
  - **ทีมงาน:** Message volume, Response time, Rooms per staff
  - **การเงิน:** Payment status (Donut), AI Cost (Pie), Daily tokens (Line)
  - **ลูกค้า:** Health donut, Sentiment bar, Purchase intent, Platform mix
  - **เอกสาร:** Category distribution, Payment status
- **Mini-charts** ฝังในหน้า KPI, CRM, Costs, Payments, Documents
- ใช้ **Recharts** (React-native, responsive, dark/light theme)
- Shared components: `MiniPieChart`, `MiniBarChart`, `MiniLineChart`, `ChartCard`

### 15. 📱 Responsive Design

- **Mobile:** Bottom Tab Bar 5 ปุ่ม + More drawer
- **Tablet:** Responsive grid 2 คอลัมน์
- **Desktop:** Full sidebar + 3-4 คอลัมน์
- Safe area สำหรับ iPhone notch/home bar
- ทุก 25 หน้า responsive ครบ

---

## หน้าจอทั้งหมด (30+ หน้า)

| หน้า | สำหรับ | หน้าที่ |
|------|--------|---------|
| **แชท** | พนักงาน | เปิด 4 จอพร้อมกัน LINE/FB/IG + สติกเกอร์ + AI แนะนำ + Memory |
| **Inbox** | พนักงาน | แชทจอเดียว + ข้อมูลลูกค้าด้านขวา |
| **Dashboard** | เจ้าของ | ภาพรวมทุกแชท + filter platform |
| **CRM** | เจ้าของ/พนักงาน | ลูกค้า + pipeline + มอบหมาย staff + filter "ลูกค้าของฉัน" |
| **สนทนารวม** | เจ้าของ/พนักงาน | ดูสนทนาทุก platform ของลูกค้า 1 คน ในจอเดียว |
| **รวมลูกค้า** | Admin | หาลูกค้าซ้ำข้าม platform + รวมเอง (Manual) |
| **KPI** | เจ้าของ | พนักงาน + ปิดการขาย + รายได้ |
| **น้องกุ้ง** | เจ้าของ | AI Advice 5 บทบาท |
| **Knowledge Base** | เจ้าของ | ฐานความรู้ — เพิ่ม/แก้/ลบ/เปิด-ปิด |
| **ตั้งค่า Bot** | Admin | แก้ชื่อ/prompt/mode/keywords แต่ละห้อง |
| **AI Cost** | เจ้าของ | ค่าใช้จ่าย AI แบบละเอียด |
| **เงินเข้า** | เจ้าของ/พนักงาน | ตรวจสลิป ยืนยัน/ปฏิเสธ สถิติยอดเงิน |
| **เอกสาร** | Admin | AI จำแนกเอกสาร/ภาพ ย้ายหมวดได้ |
| **Analytics** | เจ้าของ | กราฟ 6 หมวด: ภาพรวม ขาย ทีม เงิน ลูกค้า เอกสาร |
| **นัดหมาย** | พนักงาน | ปฏิทินนัด เยี่ยมงาน ส่งของ ติดตั้ง ประชุม แจ้งเตือน |
| **รายได้** | เจ้าของ | Revenue Dashboard ยอดขายรายวัน/เดือน กราฟเทรนด์ |
| **สินค้า** | เจ้าของ/พนักงาน | แค็ตตาล็อกสินค้า/บริการ ราคา สต็อก รูปภาพ |
| **Broadcast** | เจ้าของ | ส่งข้อความหาลูกค้าหลายคน แยก segment |
| **คะแนนลูกค้า** | เจ้าของ | Lead Scoring จัดอันดับโอกาสซื้อ |
| **ติดตามปิดขาย** | พนักงาน | Auto-closer แนะนำเวลาและวิธีปิดการขาย |
| **งานติดตาม** | พนักงาน | task + priority + deadline |
| **Templates** | พนักงาน | ข้อความสำเร็จรูป |
| **เชื่อมต่อ** | Admin | LINE/FB/IG/Telegram สถานะ |
| **ตั้งค่า** | Admin | MongoDB, AI keys |
| **ทีมงาน** | Admin | เชิญคน + กำหนด role |
| **คู่มือ** | ทุกคน | step-by-step |
| **Login** | ทุกคน | Google OAuth |
| **Onboarding** | ครั้งแรก | Setup wizard |

---

## ราคา — ฟรี 100%

| รายการ | ราคา |
|--------|------|
| OpenClaw Mini CRM | **ฟรี** |
| MongoDB Atlas (ฐานข้อมูล) | **ฟรี** (M0 512MB) |
| AI (OpenRouter free models) | **ฟรี** |
| Qdrant Cloud (ฐานความรู้) | **ฟรี** (1GB) |
| LINE OA / Facebook / Instagram / Telegram | **ฟรี** |
| **รวม** | **฿0 / เดือน** |

> **ข้อมูลเป็นของคุณ 100%** — เก็บใน MongoDB Atlas ของคุณเอง ไม่โดน lock-in

---

## Use Cases — ตัวอย่างการใช้จริง

### ร้านขายเครื่องกรองน้ำ (LINE OA + Facebook)

```
08:00  ลูกค้า A ทักมา LINE: "รุ่นไหนดี ใช้บ้าน 3 คน"
       → AI ไฮไลท์: "เริ่มสนใจ" + ดึง KB: "รุ่น A เหมาะบ้าน 2-5 คน"
       → กด AI แนะนำ: "รุ่น A เหมาะเลยค่ะ กรอง 4 ขั้นตอน ราคา 12,900"
       → พนักงานกด "ใช้เลย" → ส่ง (Reply API ฟรี!)

08:15  ลูกค้า B ทักมา Facebook พร้อมกัน
       → เปิดอีกจอ ตอบ B ไปด้วย ไม่ต้องสลับ

08:30  ลูกค้า C ทักมา LINE แต่ไม่มีใครว่าง
       → 5 นาที AI ตอบให้: "สวัสดีค่ะ 🤖 ตอนนี้เรามีรุ่น A-C ค่ะ
          ทีมงานจะตอบรายละเอียดเร็วๆ นี้ค่ะ"

12:00  น้องกุ้งส่ง Telegram แจ้งเจ้าของ:
       "⚠️ ลูกค้า A ถามราคา 3 ครั้ง ยังไม่ปิดการขาย — ควรติดตาม"

15:00  ลูกค้า A กลับมาซื้อ → AI เรียนรู้:
       "ตอบราคาชัด + บอกจำนวนคน → ปิดได้"
       → ลูกค้าคนต่อไปถามคล้ายกัน AI แนะนำดีขึ้น
```

### ร้านอาหาร / คาเฟ่ (LINE OA + Instagram)

```
ลูกค้าส่ง DM Instagram ถาม "เปิดกี่โมง"
  → KB มีข้อมูล: "เปิด 10:00-21:00 ทุกวัน ปิดวันจันทร์"
  → AI ตอบแทนได้เลย ไม่ต้องรอพนักงาน

ลูกค้าประจำทักมา LINE
  → AI จำได้: "คนนี้ชอบกาแฟลาเต้ เคยสั่งไอศกรีม 3 ครั้ง"
  → แนะนำ: "ตอบเป็นกันเอง เสนอเมนูใหม่ที่คล้ายๆ กัน"
```

### ร้านเสื้อผ้า / แฟชั่น (LINE + Facebook + Instagram)

```
ลูกค้า 10 คนทักมาพร้อมกัน (ช่วงโปรโมชั่น)
  → เปิด 4 จอพร้อมกัน ตอบ 4 คน
  → อีก 6 คน AI ตอบแทน 5 นาที ด้วยข้อมูลโปรจาก KB
  → ไม่มีลูกค้าหลุดเลย

ลูกค้าถาม "มีสี L ไหม"
  → AI เชื่อม ERP (MCP) เช็คสต็อกให้เลย
```

---

## ข้อดี

| ข้อดี | รายละเอียด |
|-------|-----------|
| **ฟรี 100%** | ไม่มีค่าใช้จ่ายรายเดือน ไม่มีค่าแรกเข้า ใช้ได้ไม่จำกัด |
| **ง่าย** | เปิดเว็บ Login ด้วย Google เชื่อม LINE/FB/IG แล้วใช้ได้เลย |
| **ข้อมูลเป็นของคุณ** | เก็บใน MongoDB Atlas ของคุณเอง ย้ายที่ไหนก็ได้ |
| **AI ทำงานแทน** | วิเคราะห์แชท ตอบแทน แนะนำ จำลูกค้า — อัตโนมัติ |
| **ไม่พลาดลูกค้า** | AI ตอบแทน 5 นาที + แจ้ง Telegram + Health Score |
| **ประหยัด LINE** | Reply-first ใช้ Reply API ฟรี ไม่ต้องเสียค่า Push |
| **ปรับตัวได้** | Open Source แก้ไขได้ตามต้องการ ไม่ต้องรอ vendor |
| **ภาษาไทย** | UI ภาษาไทย 100% AI ตอบเป็นภาษาไทย |

---

## ข้อกังวล — ตอบตรงๆ

| ข้อกังวล | คำตอบ |
|----------|-------|
| **"ฟรีจริงหรือเปล่า?"** | ซอฟต์แวร์ฟรี — ใช้ AI provider ฟรี (OpenRouter, Groq) + MongoDB local (ไม่จำกัด) + Qdrant ฟรี (1GB) ค่าใช้จ่ายมีแค่ VPS ~$24/เดือน |
| **"ข้อมูลลูกค้าปลอดภัยไหม?"** | ข้อมูลเก็บใน MongoDB Atlas ของคุณเอง ไม่ผ่านเซิร์ฟเวอร์คนอื่น Login ด้วย Google OAuth มี RBAC (admin/responder/viewer) |
| **"ต้องมี dev ไหม?"** | ติดตั้งครั้งแรกต้องมีคนช่วย setup (Docker + env vars) หลังจากนั้นใช้งานผ่านเว็บได้เลย ไม่ต้องเขียน code |
| **"AI ตอบผิดล่ะ?"** | AI ตอบจาก Knowledge Base ที่คุณใส่เอง ถ้าข้อมูลถูก AI ตอบถูก + มี "🤖 ตอบอัตโนมัติ" ชัดเจน + ถ้าไม่แน่ใจ AI จะบอก "รอทีมงานตอบนะคะ" |
| **"รองรับลูกค้ากี่คน?"** | ไม่จำกัด ขึ้นอยู่กับ MongoDB plan (ฟรี 512MB = ข้อความ 500,000+) |
| **"LINE Push เสียเงินไหม?"** | ระบบใช้ Reply API ก่อน (ฟรี!) ถ้าเกิน 25 วินาทีจึง fallback เป็น Push ทุกข้อความบอกว่า "ฟรี" หรือ "push" |
| **"ถ้าเลิกใช้ล่ะ?"** | ข้อมูลอยู่ใน MongoDB ของคุณ export ได้เลย ไม่โดน lock-in |
| **"Scale ได้ไหม?"** | Docker-based ย้ายไป VPS ใหญ่ขึ้นได้ หรือเพิ่ม MongoDB plan สำหรับธุรกิจที่โตขึ้น |

---

## สำหรับ Developer

### Architecture

```
LINE / Facebook / Instagram
  ↓ webhook
Caddy (Auto HTTPS + reverse proxy)
  ↓
Agent (Docker) → AI + RAG + MCP → reply
  ↓
MongoDB (Docker, local) ← images → Cloudflare R2 CDN
  ↓
OpenClaw (cron ทุก 1 ชม.) → วิเคราะห์ → เก็บ advice
  ↓
Dashboard (Docker) → Google Login → แสดงข้อมูล + CRM + KPI
  ↓
Qdrant Cloud (Knowledge Base vector search)
```

### Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| Agent | Node.js + Express + Multer |
| Dashboard | Next.js 16 + Tailwind CSS |
| Database | MongoDB 7 (Docker, local — ไม่ใช่ Atlas) |
| Vector Search | Qdrant Cloud + Gemini Embedding (768 dims) |
| AI Advisor | OpenClaw + OpenRouter (Qwen3-235B) |
| AI Bot | น้องกุ้ง 🦐 (5 บทบาท + Deep Loop Analysis) |
| AI Learning | Memory + Skill Lessons (Auto Compact ทุก 10 ข้อความ) |
| AI Suggest | แนะนำคำตอบ + เหตุผล + tone + priority |
| AI Safety | PII Masking + Prompt Injection Protection + A/B Testing |
| PDPA | Privacy Notice + Opt-out + Right to Delete + Audit Log |
| Churn | ทำนายลูกค้าเสี่ยงหาย (3/7/30 วัน) |
| Smart Routing | แยก topic อัตโนมัติ (sales/shipping/support/returns) |
| Security | Rate Limit + File Validation + Webhook Signature |
| Auth | Google OAuth (NextAuth) |
| Deploy | Docker Compose + DigitalOcean VPS (Singapore) |
| Reverse Proxy | Caddy (Auto HTTPS) |
| Image Storage | Cloudflare R2 CDN |
| AI Providers | OpenRouter / SambaNova / Groq / Cerebras / Gemini (ฟรี) |
| Channels | LINE Messaging API / Meta Graph API / Telegram Bot API |
| ERP | MCP Protocol (61 commands) |

### Services

| Service | Role | Port | Folder |
|---------|------|------|--------|
| Caddy | Auto HTTPS + reverse proxy | 80/443 | `Caddyfile` |
| MongoDB | Database (local Docker) | 27017 | `/opt/mongodb-data` |
| OpenClaw | AI Advisor (แกนหลัก) | 18789 | `openclaw/` |
| Agent | LINE/FB/IG + RAG + MCP | 3000 | `proxy/` |
| Dashboard | Web UI + Auth | 3001 | `smltrackdashboard/` |
| Watchtower | Auto-update OpenClaw image | — | — |

### Quick Start

```bash
# 1. Clone
git clone https://github.com/smlsoft/openclawminicrm.git
cd openclawminicrm

# 2. Setup environment
cp .env.example .env
# แก้ไขค่าใน .env (MongoDB URI, AI keys, LINE/FB tokens)

# 3. Run with Docker
docker compose up -d --build

# 4. Open browser
# http://localhost:3002/dashboard
```

### Env Variables

```env
# Database
MONGODB_URI=mongodb+srv://...

# AI Providers (ฟรีทั้งหมด)
OPENROUTER_API_KEY=...
GROQ_API_KEY=...
SAMBANOVA_API_KEY=...
GOOGLE_API_KEY=...         # Gemini (embedding + vision)

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...

# Meta (Facebook + Instagram)
FB_PAGE_ACCESS_TOKEN=...
FB_APP_SECRET=...
FB_VERIFY_TOKEN=...

# Knowledge Base (Qdrant)
QDRANT_URL=https://xxx.cloud.qdrant.io:6333
QDRANT_API_KEY=...

# Auth (Google OAuth)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
```

### Key API Endpoints (Agent)

| Endpoint | Method | หน้าที่ |
|----------|--------|--------|
| `/webhook` | POST | LINE webhook |
| `/webhook/meta` | POST | Facebook/Instagram webhook |
| `/api/inbox/send` | POST | ส่งข้อความ (Reply-first → Push-fallback) |
| `/api/inbox/suggest` | POST | AI แนะนำคำตอบ |
| `/api/inbox/upload` | POST | อัพโหลดรูปภาพ |
| `/api/km` | GET/POST | Knowledge Base CRUD |
| `/api/km/:id` | PATCH/DELETE | แก้ไข/ลบ KB |
| `/api/memory/:sourceId` | GET | ดู Memory + Skill Lessons |
| `/api/advisor/sources-changed` | GET | sourceId ที่มีข้อความใหม่ |
| `/api/advisor/source-detail/:id` | GET | ข้อความ + analytics + skills |
| `/api/advisor/advice` | POST | บันทึกคำแนะนำ |
| `/api/advisor/cost` | POST | บันทึกค่าใช้จ่าย AI |
| `/api/costs` | GET | สรุปค่าใช้จ่าย AI (dashboard) |

### MongoDB Collections

| Collection | หน้าที่ |
|-----------|--------|
| `messages` | ข้อความทั้งหมด (text/image/sticker/video/audio/location/file) + embedding |
| `customers` | ข้อมูลลูกค้า + platformIds + pipeline + deal |
| `knowledge_base` | ฐานความรู้ร้าน (metadata) |
| `ai_memory` | Memory ลูกค้า/กลุ่ม (compact summary) |
| `ai_skill_lessons` | บทเรียน AI (สำเร็จ/ล้มเหลว → กฎ) |
| `user_skills` | AI analysis per user (sentiment, tags) |
| `chat_analytics` | Sentiment + Purchase Intent per source |
| `ai_advice` | คำแนะนำจาก OpenClaw (5 บทบาท) |
| `ai_costs` | ค่าใช้จ่าย AI ทุก call |
| `tasks` | งานติดตาม |
| `reply_templates` | ข้อความสำเร็จรูป |
| `users` / `teams` / `team_members` | Multi-tenant |
| `alerts` | แจ้งเตือน (ตอบช้า, sentiment red) |
| `groups_meta` | metadata ห้องแชท |
| `platform_tokens` | LINE/FB/IG access tokens per team |
| `audit_logs` | Audit trail (PDPA compliance) |

### Project Structure

```
openclawminicrm/
├── nginx/                  # Reverse proxy + SSL config
├── openclaw/               # AI Advisor (แกนหลัก)
│   ├── cron/               # Scheduled jobs (5 บทบาท)
│   └── ...
├── proxy/                  # Agent — webhook + AI + RAG + MCP
│   ├── routes/             # API routes
│   ├── services/           # AI, LINE, Meta, Knowledge Base
│   └── ...
├── smltrackdashboard/      # Dashboard — Next.js 16
│   ├── app/                # App Router pages
│   ├── components/         # React components
│   └── ...
├── docs/                   # Documentation
├── docker-compose.yml      # Dev compose
├── docker-compose.prod.yml # Production compose
└── .env.example            # Environment template
```

---

## เอกสาร

| เอกสาร | เนื้อหา |
|--------|---------|
| [คู่มือติดตั้ง](docs/INSTALL.md) | ติดตั้งทั้งระบบบน Docker Desktop |
| [Deploy Hetzner](docs/DEPLOY-HETZNER.md) | Deploy production บน Hetzner VPS |
| [MongoDB Atlas](docs/setup-mongodb.md) | สมัคร MongoDB Atlas (ฟรี) |
| [LINE Messaging API](docs/setup-line.md) | สร้าง LINE Channel |
| [AI Providers](docs/setup-ai-providers.md) | สมัคร AI Providers (ฟรีทั้งหมด) |
| [Cloudflare Tunnel](docs/setup-cloudflare-tunnel.md) | ตั้งค่า Cloudflare Tunnel |

---

## Contributing

ยินดีรับ Pull Request! โปรดอ่านแนวทาง:

1. Fork repo
2. สร้าง branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m "feat: add my feature"`
4. Push: `git push origin feature/my-feature`
5. เปิด Pull Request

**Commit Convention:** `feat:` / `fix:` / `docs:` / `refactor:` / `chore:`

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## ติดต่อ

- **Web:** [crm.satistang.com](https://crm.satistang.com)
- **GitHub:** [github.com/smlsoft/openclawminicrm](https://github.com/smlsoft/openclawminicrm)

---

<div align="center">

**OpenClaw Mini CRM 🦐**

ฟรี 100% · ไม่จำกัด · ข้อมูลเป็นของคุณ · AI ทำงานแทนคุณ 24/7

Made with ❤️ for Thai SMEs

</div>
