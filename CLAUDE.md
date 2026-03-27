# OpenClaw Mini CRM — Project Rules

## Architecture
```
LINE / Facebook / Instagram
  ↓ webhook
Nginx (SSL + rate limit)
  ↓
Agent (Docker) → AI + RAG + MCP → reply
  ↓
MongoDB Atlas (messages + users + teams)
  ↓
OpenClaw (แกนหลัก) ← cron ทุก 1 ชม. → วิเคราะห์ → เก็บ advice
  ↓
Dashboard (Docker) → Google Login → แสดงสนทนา + CRM + KPI + Advice + Costs
```

## Brand
- **ชื่อ:** OpenClaw Mini CRM
- **Tagline:** AI Chat Intelligence — LINE · Facebook · Instagram
- **Domain:** crm.satistang.com (production) / smlclaw.satistang.com (legacy)
- **Deploy:** Hetzner VPS + Docker Compose

## Core Principle — OpenClaw เป็นแกนหลัก
- **OpenClaw** = สมองกลาง (AI Advisor) — gateway + cron + multi-channel
- **Agent** = หูและปาก (LINE/FB/IG webhook + RAG + AI reply + MCP)
- **Dashboard** = ตา (แสดงข้อมูลจาก MongoDB + Google Login + multi-tenant)

## Services
| Service | Role | Port | Folder |
|---------|------|------|--------|
| **Nginx** | Reverse proxy + SSL | 80/443 | `nginx/` |
| **OpenClaw** | AI Advisor (แกนหลัก) | 18789 | `openclaw/` |
| **Agent** | LINE/FB/IG + RAG + MCP | 3000 | `proxy/` |
| **Dashboard** | Web UI + Auth | 3001 | `smltrackdashboard/` |

## URLs
- **Production:** `https://crm.satistang.com/dashboard`
- **LINE webhook:** `https://crm.satistang.com/webhook`
- **Meta webhook:** `https://crm.satistang.com/webhook/meta`
- **OpenClaw:** `http://localhost:18789` (internal)

## Multi-Platform (LINE + Facebook + Instagram)
- **messages.platform:** `"line"` | `"facebook"` | `"instagram"`
- **sourceId format:** LINE=`Cxxx`/`Uxxx`, Facebook=`fb_xxx`, Instagram=`ig_xxx`
- **Dashboard:** tab filter แยกแต่ละ platform
- **Webhook:** `/webhook` (LINE), `/webhook/meta` (FB+IG — shared Meta API)

## Authentication (Google OAuth)
- **NextAuth** + Google Provider
- **Login page:** `/dashboard/login`
- **Dev mode:** ไม่มี GOOGLE_CLIENT_ID → ข้ามไป ไม่ต้อง login

## Multi-Tenant Database Schema
```
users           { _id: GUID, name, image, plan }
user_emails     { email, userId, isPrimary }
teams           { _id: GUID, name, ownerId }
team_members    { teamId, userId, role: admin|responder|reviewer|viewer }
platform_tokens { teamId, platform, pageId, accessToken, active }
messages        { sourceId, platform, teamId, text, ... }
groups_meta     { sourceId, groupName, platform, teamId }
```

## Advisor API (Agent ให้บริการ)
| Endpoint | Method | หน้าที่ |
|----------|--------|---------|
| `/api/advisor/sources-changed?since=ISO` | GET | ดู sourceId ที่มีข้อความใหม่ |
| `/api/advisor/source-detail/:sourceId?since=ISO` | GET | ข้อความ + analytics + skills + alerts |
| `/api/advisor/advice` | POST | บันทึกคำแนะนำ |
| `/api/advisor/update-pulled` | POST | อัพเดต lastPulledAt |
| `/api/advisor/cost` | POST | บันทึกค่าใช้จ่าย AI |
| `/api/costs` | GET | ดูสรุปค่าใช้จ่าย (dashboard) |

## AI Providers (ฟรีทั้งหมด)
1. OpenRouter (free) → 2. SambaNova → 3. Groq → 4. Cerebras → 5. Gemini

## Database
- **MongoDB Atlas M0** (free)
- **แยกคน/กลุ่ม:** ใช้ `sourceId` field
- **แยก platform:** ใช้ `platform` field
- **แยก tenant:** ใช้ `teamId` field
- **อย่าแยก collection ตามคน/กลุ่ม** — ใช้ collection เดียวเสมอ

## Env vars (.env)
- `MONGODB_URI` — MongoDB Atlas
- `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`
- `FB_PAGE_ACCESS_TOKEN`, `FB_APP_SECRET`, `FB_VERIFY_TOKEN`
- `SAMBANOVA_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_API_KEY`
- `MCP_ERP_API_KEY` — bc-erp MCP auth
- `OPENCLAW_GATEWAY_TOKEN` — OpenClaw gateway
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — NextAuth

## Deploy
- **Production:** `docker compose -f docker-compose.prod.yml up -d`
- **Dev:** `docker compose up -d --build`
- **CI/CD:** GitHub Actions → SSH → Hetzner
- **คู่มือ:** `docs/DEPLOY-HETZNER.md`

## สิ่งที่ห้ามทำ
- ห้ามลบ folder/service โดยไม่ถามบอสก่อน
- ห้ามเปลี่ยน deploy strategy โดยไม่แจ้ง
- ห้ามแยก MongoDB collection ตามคน/กลุ่ม
- ห้ามลบ OpenClaw — เป็นแกนหลักของระบบ
- ห้าม hardcode สี Tailwind ในหน้าใหม่ — ใช้ theme-* classes

## Skills
| Skill | File | หน้าที่ |
|-------|------|--------|
| theming | `skills/theming/SKILL.md` | มาตรฐานสี Dark/Light theme ทุกจอ |
| thai-language | `skills/thai-language/SKILL.md` | ภาษาไทยที่เข้าใจง่าย — แปลศัพท์เทคนิค, labels, สถานะ, บทบาท |
