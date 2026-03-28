import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENT_URL = process.env.AGENT_URL || "http://agent:3000";

// Cache quotes — สร้างใหม่ทุก 1 ชม. (ประหยัด token)
let cachedQuotes: { ceo: string[]; employee: string[]; updatedAt: number } = { ceo: [], employee: [], updatedAt: 0 };
const CACHE_TTL = 3600000; // 1 ชม.

const FALLBACK_CEO = [
  "ทำงานได้ดีมาก! 👏", "เร็วกว่านี้ได้ไหม?", "ลูกค้ารอนะ!", "ยอดขายเป็นไงบ้าง?",
  "ใครยังไม่ตอบแชท?", "กาแฟหมดแล้วนะ", "ดีใจที่มีทีมแบบนี้", "อย่าลืม follow up!",
  "สู้ๆ น้องกุ้ง!", "ประชุม 5 นาทีนะ", "KPI เดือนนี้โอเคมั้ย?", "ขยันดี ชอบๆ",
  "วันนี้ปิดดีลได้กี่รายแล้ว?", "ลูกค้า VIP อย่าลืมดูแล", "เงินเดือนจะขึ้นนะ ถ้าทำดี",
  "ระวังคู่แข่งนะ", "สต็อกเช็คหรือยัง?", "ใครจะไปส่งของบ้าง?", "พรุ่งนี้มีประชุมใหญ่",
  "ตั้งใจทำนะลูก", "บอสภูมิใจในทีมมาก", "ใครอยากได้โบนัสยกมือ!", "น้องกุ้งเก่งทุกตัวเลย",
];

const FALLBACK_EMPLOYEE = [
  "ก็ทำอยู่ไง บอส!", "โอ๊ย ไม่ต้องเร่งก็ได้!", "รู้แล้วค่า~", "เดี๋ยวก่อนนน!",
  "ขอกาแฟแก้วนึงก่อน!", "บอสเอง ก็ไม่เห็นทำ!", "ทำแล้ว ทำอยู่ ทำเสร็จแล้ว!",
  "อย่ามาเคาะหัวหนู!", "ขยันอยู่นะ!", "เงินเดือนน้อย ทำแค่นี้ก็เก่งแล้ว!",
  "CEO ไปนั่งเล่นเถอะ!", "มีโดนัทไหมบอส?", "หนูจะลาออก! แค่พูดเล่น",
  "หนูทำงานมากกว่า CEO อีก!", "กดน้ำก่อนได้ไหม?", "ลูกค้าก็ไม่ได้เร่งนะ",
  "ขอพักหน่อย ตาลาย!", "บอสเลี้ยงข้าวได้ไหม?", "วันนี้วันศุกร์แล้ว!",
  "แมวมานอนบนคีย์บอร์ดอีกแล้ว!", "ส่งโดนัทมาด้วยค่า~",
];

export async function GET() {
  const now = Date.now();

  // ถ้า cache ยังไม่หมดอายุ → ใช้ cache
  if (cachedQuotes.updatedAt > 0 && now - cachedQuotes.updatedAt < CACHE_TTL && cachedQuotes.ceo.length > 0) {
    return NextResponse.json(cachedQuotes);
  }

  // ลองให้ AI สร้างใหม่
  try {
    const res = await fetch(`${AGENT_URL}/api/ceo-quotes`, { signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const data = await res.json();
      if (data.ceo?.length > 0) {
        cachedQuotes = { ...data, updatedAt: now };
        return NextResponse.json(cachedQuotes);
      }
    }
  } catch { /* fallback */ }

  // Fallback: ใช้ hardcoded
  cachedQuotes = { ceo: FALLBACK_CEO, employee: FALLBACK_EMPLOYEE, updatedAt: now };
  return NextResponse.json(cachedQuotes);
}
