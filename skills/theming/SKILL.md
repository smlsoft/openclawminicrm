# OpenClaw Mini CRM — Theming Skill

## Color System (CSS Variables)

ใช้ CSS variables ใน `globals.css` เป็นหลัก — **ห้าม hardcode สี Tailwind ตรงๆ**

### Dark Mode (Default)
| Variable | Value | ใช้กับ |
|----------|-------|-------|
| `--bg-primary` | `#0a0e1a` | พื้นหลังหลัก |
| `--bg-secondary` | `#111827` | พื้นหลังรอง |
| `--bg-card` | `#161d2f` | การ์ด, Panel |
| `--bg-hover` | `#1e2740` | Hover state |
| `--border` | `#252f45` | เส้นขอบทั้งหมด |
| `--text-primary` | `#e8ecf4` | ข้อความหลัก |
| `--text-secondary` | `#8b95a8` | ข้อความรอง |
| `--text-muted` | `#5a6478` | ข้อความจาง |
| `--primary` | `#818cf8` | Indigo — สีแบรนด์ |
| `--primary-bg` | `rgba(99,102,241,0.15)` | พื้นหลัง Indigo |
| `--accent` | `#22d3ee` | Cyan — สีเน้น |
| `--accent-bg` | `rgba(6,182,212,0.15)` | พื้นหลัง Cyan |

### Light Mode
| Variable | Value |
|----------|-------|
| `--bg-primary` | `#f8f9fc` |
| `--bg-secondary` | `#ffffff` |
| `--bg-card` | `#ffffff` |
| `--bg-hover` | `#f1f3f8` |
| `--border` | `#e2e5ef` |
| `--text-primary` | `#111827` |
| `--text-secondary` | `#4b5563` |
| `--text-muted` | `#9ca3af` |
| `--primary` | `#6366f1` |
| `--accent` | `#0891b2` |

## Theme Classes (ใช้แทน Tailwind hardcode)

| Class | CSS Variable | ใช้แทน |
|-------|-------------|--------|
| `theme-bg` | `--bg-primary` | `bg-gray-950` |
| `theme-bg-secondary` | `--bg-secondary` | `bg-gray-900` |
| `theme-bg-card` | `--bg-card` | `bg-gray-800` |
| `theme-border` | `--border` | `border-gray-700` |
| `theme-text` | `--text-primary` | `text-white` |
| `theme-text-secondary` | `--text-secondary` | `text-gray-400` |
| `theme-text-muted` | `--text-muted` | `text-gray-500` |

## Brand Colors

| ความหมาย | สี | Class | ใช้ที่ |
|---------|---|-------|------|
| **Primary** | Indigo | `bg-indigo-600` | ปุ่มหลัก, Active nav |
| **Accent** | Cyan | `text-cyan-400` | CRM, Highlights |
| **Success** | Emerald | `text-emerald-500` | Status OK, Positive |
| **Warning** | Amber | `text-amber-500` | Status caution |
| **Danger** | Red | `text-red-400` | Status bad, Delete |
| **Info** | Blue | `text-blue-400` | Tasks, Facebook |
| **Secondary** | Purple | `text-purple-400` | KPI, Pipeline |
| **Tertiary** | Orange | `text-orange-400` | Advice |
| **Instagram** | Pink | `text-pink-400` | IG platform |

## Status Color Scheme (ทุกจอใช้เหมือนกัน)

```
Sentiment (ลูกค้า):
  🟢 ปกติ     → emerald-500
  🟡 ติดตาม   → amber-500
  🔴 ไม่พอใจ  → red-500

Purchase Intent (ซื้อ):
  🟢 ไม่สนใจ  → emerald-500
  🟡 สนใจ     → amber-500
  🔴 ซื้อ!    → red-500

Response Time:
  🟢 < 5 นาที   → emerald-500
  🟡 5-30 นาที  → amber-500
  🔴 > 30 นาที  → red-500
```

## Pipeline Stages

| Stage | สี | Tailwind |
|-------|---|---------|
| new | Gray | `bg-gray-500` |
| interested | Blue | `bg-blue-500` |
| quoting | Purple | `bg-purple-500` |
| negotiating | Amber | `bg-amber-500` |
| closed-won | Emerald | `bg-emerald-500` |
| closed-lost | Red | `bg-red-500` |

## Platform Colors

| Platform | สี | Badge |
|----------|---|-------|
| LINE | Green | `bg-green-600 text-white` |
| Facebook | Blue | `bg-blue-600 text-white` |
| Instagram | Pink gradient | `bg-gradient-to-r from-purple-500 to-pink-500 text-white` |

## Rules

### ต้องทำ
- ใช้ `theme-*` classes สำหรับ background, text, border ทั่วไป
- ใช้ CSS variables (`var(--primary)`) สำหรับ dynamic colors
- ทุกหน้าต้องรองรับ Dark + Light mode
- ใช้ `ThemeToggle` component ที่มีอยู่ — อย่าสร้างใหม่
- Sidebar ใช้สีเดียวกันทุกจอ — ดูจาก `Sidebar.tsx`

### ห้ามทำ
- ห้าม hardcode `bg-gray-950`, `bg-gray-900` ในหน้าใหม่ — ใช้ `theme-bg`, `theme-bg-secondary`
- ห้าม hardcode `text-white`, `text-gray-400` — ใช้ `theme-text`, `theme-text-secondary`
- ห้ามสร้าง ThemeProvider ใหม่ — ใช้ `useTheme()` hook ที่มี
- ห้ามใช้ `dark:` prefix — ระบบใช้ CSS variables ไม่ใช่ Tailwind dark mode

### Template สำหรับหน้าใหม่

```tsx
export default function NewPage() {
  return (
    <div className="theme-bg min-h-screen theme-text">
      {/* Header */}
      <div className="theme-bg-secondary theme-border border-b px-6 py-4">
        <h1 className="text-lg font-bold theme-text">ชื่อหน้า</h1>
        <p className="text-sm theme-text-secondary">คำอธิบาย</p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Card */}
        <div className="theme-bg-card theme-border border rounded-xl p-4">
          <h2 className="font-medium theme-text">หัวข้อ</h2>
          <p className="text-sm theme-text-muted">รายละเอียด</p>
        </div>

        {/* Primary Button */}
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg">
          ปุ่มหลัก
        </button>

        {/* Secondary Button */}
        <button className="theme-bg-card theme-border border hover:opacity-80 theme-text px-4 py-2 rounded-lg">
          ปุ่มรอง
        </button>
      </div>
    </div>
  );
}
```

### iPhone Chat Preview (เฉพาะ)
ใช้ CSS variables แยกสำหรับ chat preview:
```
--chat-bg: Dark=#0B141A, Light=#ffffff
--chat-outgoing: Dark=#005C4B, Light=#d9fdd3
--chat-incoming: Dark=#1F2C34, Light=#ffffff
```

## File Locations

| ไฟล์ | หน้าที่ |
|------|--------|
| `src/app/globals.css` | CSS variables + theme classes + Tailwind overrides |
| `src/components/ThemeProvider.tsx` | `useTheme()` hook + toggle logic |
| `src/components/Sidebar.tsx` | Sidebar navigation (ใช้เป็น reference) |
