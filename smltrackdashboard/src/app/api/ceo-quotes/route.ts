import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENT_URL = process.env.AGENT_URL || "http://agent:3000";

// Cache quotes — สร้างใหม่ทุก 1 ชม. (ประหยัด token)
let cachedQuotes: { ceo: string[]; employee: string[]; updatedAt: number } = { ceo: [], employee: [], updatedAt: 0 };
const CACHE_TTL = 3600000; // 1 ชม.

// Fallback pairs (จับคู่ถาม-ตอบ) — ใช้เฉพาะถ้า AI สร้างไม่ได้
const FALLBACK_PAIRS: [string, string][] = [
  ["ยอดขายวันนี้เป็นไงบ้าง?", "ปิดได้ 3 ดีลแล้วค่ะบอส!"],
  ["ใครยังไม่ตอบแชทลูกค้า?", "ตอบหมดแล้วค่า ไม่ต้องห่วง!"],
  ["ทำงานเร็วกว่านี้ได้ไหม?", "ก็ทำเร็วสุดแล้วนะบอส!"],
  ["KPI เดือนนี้โอเคมั้ย?", "เกินเป้า 120% แล้วค่ะ!"],
  ["ทำไมยอดตกลง?", "วันจันทร์ ลูกค้ายังไม่ตื่นค่ะ!"],
  ["กาแฟหมดแล้ว ใครซื้อ?", "ให้แมวไปซื้อดีกว่า!"],
  ["ขยันดีนะ ชอบๆ!", "ขอบคุณค่ะ ขอขึ้นเงินเดือนด้วย!"],
  ["ประชุมอีก 5 นาที!", "ขอกินโดนัทก่อน!"],
  ["ลูกค้า VIP โทรมา!", "รับสายแล้วค่ะ กำลังจัดการ!"],
  ["สต็อกเช็คหรือยัง?", "เหลือน้อย ต้องสั่งเพิ่มค่ะ!"],
  ["ใครอยากได้โบนัส?", "หนูๆ! ยกทั้งสองมือเลย!"],
  ["คู่แข่งมาตัดราคา!", "เตรียมโปรไว้แล้วค่ะ!"],
  ["วันนี้ใครมาสาย?", "ไม่มีค่ะ มาก่อนบอสอีก!"],
  ["แมวนอนบนโต๊ะอีกแล้ว!", "ไล่ไม่ไป มันไม่กลัวหนู!"],
  ["ตอบแชทให้เร็วนะ!", "ตอบอยู่ค่ะ มือไม่ว่างเลย!"],
  ["ใครทำยอดสูงสุด?", "หนูเองค่ะ ปิดไป 5 ราย!"],
  ["สู้ๆ นะทีม!", "สู้ๆ ค่ะบอส ไม่ถอย!"],
  ["ลดราคาอีกได้ไหม?", "ลดอีกไม่ได้แล้ว ขาดทุนค่ะ!"],
  ["ออฟฟิศรกจัง จัดหน่อย!", "ก็แมวมันรื้อไง!"],
  ["บอสภูมิใจในทีม!", "ภูมิใจที่มีบอสดีๆ ค่ะ!"],
  ["พรุ่งนี้มีนัดส่งของ!", "จดไว้แล้วค่ะ พร้อมส่ง!"],
  ["เงินเดือนออกแล้วนะ!", "เย้! ขอบคุณบอส!"],
  ["ทำไมพิมพ์ช้าจัง?", "ก็แมวมานอนบนคีย์บอร์ดไง!"],
  ["วันนี้เลี้ยงข้าว!", "จริงเหรอ! เอาบุฟเฟ่ต์เลยนะ!"],
  ["หนูจะลาออก!", "เดี๋ยว ขอคิดก่อน... ไม่ละ!"],
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

  // Fallback: สุ่มลำดับจาก pairs
  const shuffled = [...FALLBACK_PAIRS].sort(() => Math.random() - 0.5);
  cachedQuotes = { ceo: shuffled.map(p => p[0]), employee: shuffled.map(p => p[1]), updatedAt: now };
  return NextResponse.json(cachedQuotes);
}
