import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// ─── Quick Reply Templates (ร้านวัสดุก่อสร้าง) ───
const TEMPLATES = [
  // ทักทาย
  { title: "ทักทายลูกค้าใหม่", content: "สวัสดีครับ 🙏 ยินดีต้อนรับสู่ร้านวัสดุก่อสร้างของเราครับ\nมีอะไรให้ช่วยเหลือ สอบถามได้เลยครับ", category: "ทักทาย" },
  { title: "ทักทาย + โปรโมชั่น", content: "สวัสดีครับ ตอนนี้มีโปรโมชั่นปูนซีเมนต์ ซื้อ 100 ถุงขึ้นไป ลด 5% ครับ\nสนใจสินค้าอะไรครับ?", category: "ทักทาย" },
  { title: "ลูกค้าเก่ากลับมา", content: "สวัสดีครับ ดีใจที่กลับมาครับ 😊\nวันนี้ต้องการสินค้าอะไรครับ?", category: "ทักทาย" },
  { title: "ตอบนอกเวลา", content: "ขอบคุณที่ติดต่อมาครับ ขณะนี้อยู่นอกเวลาทำการ (08:00-17:00)\nเราจะติดต่อกลับทันทีในวันทำการถัดไปครับ 🙏", category: "ทักทาย" },
  // ราคา
  { title: "ส่งใบเสนอราคา", content: "ส่งใบเสนอราคาให้เรียบร้อยครับ\nราคานี้มีอายุ 7 วัน หากต้องการสั่งซื้อแจ้งมาได้เลยครับ", category: "ราคา" },
  { title: "ราคาส่ง vs เหมา", content: "ราคาปลีก: {price} บาท\nราคาส่ง (100+): ลด 5%\nราคาเหมา (500+): ลด 8%\nค่าขนส่งคิดตามระยะทางครับ", category: "ราคา" },
  { title: "ค่าขนส่ง", content: "ค่าขนส่ง:\n- ในเขตเมือง: ฟรี (สั่ง 3,000+ บาท)\n- ต่างอำเภอ: 500-1,500 บาท (ตามระยะทาง)\n- ต่างจังหวัด: คิดตามน้ำหนัก+ระยะทาง\nแจ้งพิกัดหน้างานได้เลยครับ จะคำนวณให้ทันที", category: "ราคา" },
  { title: "เปรียบเทียบราคา", content: "เราเข้าใจครับว่าราคาเป็นสิ่งสำคัญ\nสินค้าของเราเป็นของแท้ มีใบรับรอง มอก. ทุกตัว\nซื้อเยอะ สามารถเจรจาราคาพิเศษได้ครับ แจ้งจำนวนมาเลยครับ", category: "ราคา" },
  { title: "ยืนยันราคา", content: "ราคาที่แจ้งไปเป็นราคาล่าสุดแล้วครับ\nรวม VAT 7% เรียบร้อย\nหากต้องการใบกำกับภาษีแจ้งข้อมูลบริษัทมาได้เลยครับ", category: "ราคา" },
  // ติดตาม
  { title: "ติดตามหลังเสนอราคา", content: "สวัสดีครับ เมื่อวานส่งใบเสนอราคาไป ไม่ทราบว่าพิจารณาเป็นยังไงบ้างครับ?\nหากมีข้อสงสัยเพิ่มเติม ยินดีตอบครับ", category: "ติดตาม" },
  { title: "ติดตามหลังสั่งซื้อ", content: "สินค้าที่สั่งจัดส่งเรียบร้อยแล้วครับ\nรบกวนตรวจรับของด้วยนะครับ หากมีปัญหาแจ้งได้ทันทีครับ 🙏", category: "ติดตาม" },
  { title: "ลูกค้าหายไป 7 วัน", content: "สวัสดีครับ 🙏 ไม่ทราบว่างานก่อสร้างเป็นยังไงบ้างครับ?\nหากต้องการวัสดุเพิ่มเติม แจ้งมาได้เลยครับ ยินดีให้บริการครับ", category: "ติดตาม" },
  { title: "ลูกค้าหายไป 14 วัน", content: "สวัสดีครับ ไม่ได้ติดต่อมานาน เลยมาทักทายครับ\nตอนนี้มีโปรพิเศษ ลด 10% สำหรับลูกค้าเก่า\nสนใจสินค้าอะไรแจ้งได้เลยนะครับ 😊", category: "ติดตาม" },
  { title: "ถามความพึงพอใจ", content: "สวัสดีครับ ขอสอบถามความพึงพอใจสินค้าที่ซื้อไปครับ\nพอใจ = 👍\nไม่พอใจ = 👎\nหากมีข้อเสนอแนะเพิ่มเติม แจ้งมาได้เลยครับ", category: "ติดตาม" },
  // ปิดการขาย
  { title: "ปิดการขาย — ด่วน", content: "โปรโมชั่นนี้หมดวันนี้เท่านั้นนะครับ!\nซื้อวันนี้ ลดพิเศษ + ส่งฟรีในเขตเมือง\nต้องการสั่งเลยมั้ยครับ?", category: "ปิดการขาย" },
  { title: "ปิดการขาย — ของมีจำกัด", content: "สินค้าล็อตนี้เหลืออีกไม่มากครับ\nหากสนใจแนะนำสั่งจองไว้ก่อนเลยครับ จะได้ไม่พลาด", category: "ปิดการขาย" },
  { title: "ปิดการขาย — เครดิต", content: "สำหรับลูกค้าประจำ เรามีเงื่อนไขเครดิต 30 วันครับ\nจ่ายปลายเดือนได้ สะดวกกว่า\nสนใจสั่งเลยมั้ยครับ?", category: "ปิดการขาย" },
  { title: "ยืนยันออเดอร์", content: "ขอสรุปออเดอร์ครับ:\n- สินค้า: {product}\n- จำนวน: {qty}\n- ราคารวม: {total} บาท\n- จัดส่ง: {date}\n\nยืนยันสั่งซื้อเลยนะครับ 🙏", category: "ปิดการขาย" },
  { title: "ขอบคุณหลังซื้อ", content: "ขอบคุณที่ไว้วางใจสั่งซื้อกับเราครับ 🙏\nสินค้าจะจัดส่งตามกำหนดครับ\nหากต้องการวัสดุเพิ่มเติม แจ้งมาได้เลยครับ ลูกค้าประจำราคาพิเศษ!", category: "ปิดการขาย" },
  // กำหนดเอง
  { title: "แนะนำช่าง", content: "เรามีช่างพาร์ทเนอร์ที่ไว้ใจได้ครับ:\n- ช่างปูน/โครงสร้าง\n- ช่างไฟฟ้า\n- ช่างประปา\nแจ้งรายละเอียดงาน จะประสานให้ครับ", category: "กำหนดเอง" },
  { title: "ให้คำปรึกษาเทคนิค", content: "เรามีทีมช่างที่ปรึกษาพร้อมให้คำแนะนำครับ\nแจ้งรายละเอียดงาน หรือส่งแบบมา จะคำนวณวัสดุให้ครับ\nบริการนี้ฟรีครับ ไม่มีค่าใช้จ่าย", category: "กำหนดเอง" },
  { title: "วิธีชำระเงิน", content: "ช่องทางชำระเงิน:\n💳 โอนผ่านธนาคาร\n💵 เงินสด (รับหน้าร้าน/หน้างาน)\n📱 พร้อมเพย์\n🏦 เครดิต 30 วัน (ลูกค้าประจำ)\n\nโอนแล้วส่งสลิปมาได้เลยครับ", category: "กำหนดเอง" },
  { title: "เวลาทำการ", content: "เวลาทำการ:\n🕗 จันทร์-เสาร์: 07:30 - 17:00 น.\n🕗 อาทิตย์: 08:00 - 12:00 น.\n📍 ที่อยู่: [แจ้งที่อยู่ร้าน]\n📞 โทร: [เบอร์โทร]", category: "กำหนดเอง" },
  { title: "รับมือร้องเรียน", content: "ต้องขออภัยจริงๆ ครับ 🙏\nเราจะรีบตรวจสอบและแก้ไขให้ทันทีครับ\nรบกวนแจ้ง:\n- เลขที่ใบส่งของ\n- รายละเอียดปัญหา\n- ภาพถ่าย (ถ้ามี)\nจะดำเนินการให้เร็วที่สุดครับ", category: "กำหนดเอง" },
  { title: "การรับประกัน", content: "สินค้าทุกชิ้นมีการรับประกันตามเงื่อนไขผู้ผลิตครับ:\n- ปูนซีเมนต์: ตรวจสอบวันหมดอายุ\n- เหล็ก: มอก. รับประกันคุณภาพ\n- กระเบื้อง: เปลี่ยนได้หากแตกจากขนส่ง\n\nเก็บใบเสร็จไว้เป็นหลักฐานด้วยนะครับ", category: "กำหนดเอง" },
];

// ─── Broadcast Campaigns ───
const BROADCASTS = [
  {
    name: "โปรปูนซีเมนต์ ลด 10%",
    message: "🔥 โปรสุดคุ้ม! ปูนซีเมนต์ทุกยี่ห้อ ลด 10% ตั้งแต่วันนี้ - สิ้นเดือน\nสั่งเลยวันนี้ ส่งฟรีในเขตเมือง!\n📞 สอบถาม: ทักแชทได้เลยครับ",
    type: "text", status: "sent", targetType: "all",
    stats: { total: 156, sent: 148, failed: 8 },
  },
  {
    name: "แจ้งหยุดสงกรานต์",
    message: "📢 แจ้งวันหยุดสงกรานต์\nร้านหยุด 13-16 เมษายน\nเปิดปกติ 17 เมษายน เป็นต้นไป\nสั่งของล่วงหน้าได้นะครับ 🙏",
    type: "text", status: "sent", targetType: "all",
    stats: { total: 203, sent: 197, failed: 6 },
  },
  {
    name: "โปรเหล็กเส้น — ผู้รับเหมา",
    message: "🏗️ เหล็กเส้นราคาพิเศษสำหรับผู้รับเหมา!\nDB12: ฿{price}/เส้น\nDB16: ฿{price}/เส้น\nสั่ง 1 ตัน+ ลดเพิ่ม 3%\n📦 ส่งฟรีหน้างาน",
    type: "text", status: "sent", targetType: "tag", targetTags: ["ผู้รับเหมา"],
    stats: { total: 45, sent: 42, failed: 3 },
  },
  {
    name: "สินค้าใหม่ — กระเบื้อง COTTO",
    message: "✨ สินค้าใหม่เข้าร้าน!\nกระเบื้องพื้น COTTO คอลเลคชั่นใหม่\nขนาด 60x60, 80x80 ซม.\nดีไซน์สวย ทนทาน ราคาเริ่มต้น ฿89/แผ่น\nมาดูของจริงที่ร้านได้เลยครับ",
    type: "text", status: "sent", targetType: "all",
    stats: { total: 203, sent: 195, failed: 8 },
  },
  {
    name: "โปรสีทาบ้าน TOA ซื้อ 1 แถม 1",
    message: "🎨 โปรจัดหนัก! สีทาบ้าน TOA\nซื้อ 5 กล. แถม 1 กล.!\nทั้งสีภายในและภายนอก\nเฉพาะเดือนนี้เท่านั้น\nสนใจทักมาเลยครับ 🙏",
    type: "text", status: "scheduled", targetType: "all",
    scheduledAt: new Date(Date.now() + 3 * 86400000),
    stats: { total: 0, sent: 0, failed: 0 },
  },
  {
    name: "ลูกค้า VIP — ลดพิเศษ 15%",
    message: "🌟 สิทธิพิเศษสำหรับลูกค้า VIP!\nลด 15% ทุกรายการ ตลอดเดือนนี้\nเฉพาะลูกค้าที่ได้รับข้อความนี้เท่านั้น\nแจ้งรหัส VIP2026 ตอนสั่งซื้อครับ",
    type: "text", status: "draft", targetType: "tier", targetTier: "vip",
    stats: { total: 0, sent: 0, failed: 0 },
  },
  {
    name: "แนะนำบริการส่งด่วน",
    message: "🚚 บริการใหม่! ส่งด่วน 2 ชั่วโมง\nสั่งวัสดุก่อสร้างด่วน ส่งภายใน 2 ชม. ในเขตเมือง\nค่าบริการเพิ่ม 200 บาท\nเหมาะกับงานที่ต้องการของด่วน\nทักแชทสั่งเลยครับ!",
    type: "text", status: "sent", targetType: "platform", targetPlatform: "line",
    stats: { total: 120, sent: 115, failed: 5 },
  },
  {
    name: "Happy New Year 2026",
    message: "🎉 สวัสดีปีใหม่ 2026!\nขอบคุณที่ไว้วางใจเลือกซื้อสินค้ากับเรามาตลอดปีครับ\nปีใหม่นี้ขอให้ทุกโปรเจกต์สำเร็จลุล่วง\nพบกันใหม่ปีหน้า พร้อมโปรดีๆ อีกเพียบ 🙏✨",
    type: "text", status: "sent", targetType: "all",
    stats: { total: 312, sent: 298, failed: 14 },
  },
  {
    name: "เตือนหมดอายุใบเสนอราคา",
    message: "📋 แจ้งเตือน: ใบเสนอราคาของท่านจะหมดอายุใน 3 วัน\nหากต้องการสั่งซื้อ กรุณายืนยันก่อนวันที่ {date}\nราคาอาจเปลี่ยนแปลงหลังหมดอายุครับ",
    type: "text", status: "draft", targetType: "tag", targetTags: ["รอยืนยัน"],
    stats: { total: 0, sent: 0, failed: 0 },
  },
  {
    name: "โปรวัสดุสร้างบ้าน ครบชุด",
    message: "🏠 แพ็กเกจวัสดุสร้างบ้าน ครบชุด!\nปูน + เหล็ก + อิฐ + กระเบื้อง + สี\nประหยัดกว่าซื้อแยก 12%\nส่งแบบบ้านมา คำนวณให้ฟรี!\nทักแชทเลยครับ",
    type: "text", status: "draft", targetType: "all",
    stats: { total: 0, sent: 0, failed: 0 },
  },
];

// ─── Customer Scores ───
const TIERS = ["vip", "hot_lead", "active", "at_risk", "dormant"] as const;
const PLATFORMS = ["line", "facebook", "instagram"] as const;
const NAMES = [
  "สมชาย สุขสมบูรณ์", "วิภา จันทร์เพ็ง", "ธนากร ทองดี", "สุดา แก้วมณี", "ชัยวัฒน์ พลอยงาม",
  "นภา สว่างจิต", "ประเสริฐ ใจดี", "กัลยา บุญมา", "พิมพ์ ศรีสุข", "อนุชา รุ่งเรือง",
  "ณัฐ มั่นคง", "ขวัญ วิไลพร", "กิตติ พิทักษ์", "มาลี ประสิทธิ์", "อภิชาต สมบูรณ์",
  "ศิริ ชัยชนะ", "พงศ์ บุญเลิศ", "ลัดดา เจริญผล", "เกียรติ สุขใจ", "วรรณ ทวีป",
  "สุรชัย อารีย์", "อัญชลี กลิ่นดี", "ยศ มีสุข", "นวล เกษม", "บุญมี ร่มเย็น",
  "สายฝน ทองดี", "เฉลิม แก้วมณี", "ปราณี สุขสมบูรณ์", "ไพศาล จันทร์เพ็ง", "จิราภรณ์ พลอยงาม",
];

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

export async function POST() {
  try {
    const db = await getDB();
    const r = rng(123);
    const now = Date.now();
    const results: Record<string, number> = {};

    // ═══ 1. Reply Templates ═══
    await db.collection("reply_templates").deleteMany({});
    const templates = TEMPLATES.map((t, i) => ({
      ...t,
      usageCount: Math.floor(r() * 50),
      createdAt: new Date(now - (TEMPLATES.length - i) * 86400000),
    }));
    await db.collection("reply_templates").insertMany(templates);
    results["reply_templates"] = templates.length;

    // ═══ 2. Broadcasts ═══
    await db.collection("broadcasts").deleteMany({});
    const broadcasts = BROADCASTS.map((b, i) => ({
      ...b,
      targetTags: b.targetTags || [],
      targetTier: b.targetTier || "",
      targetPlatform: b.targetPlatform || "",
      scheduledAt: b.scheduledAt || null,
      sentAt: b.status === "sent" ? new Date(now - Math.floor(r() * 60) * 86400000) : null,
      createdAt: new Date(now - (BROADCASTS.length - i) * 3 * 86400000),
      updatedAt: new Date(now - Math.floor(r() * 7) * 86400000),
    }));
    await db.collection("broadcasts").insertMany(broadcasts);
    results["broadcasts"] = broadcasts.length;

    // ═══ 3. Customer Scores ═══
    await db.collection("customer_scores").deleteMany({});
    const scores = NAMES.map((name, i) => {
      const tier = TIERS[Math.floor(r() * TIERS.length)];
      const platform = PLATFORMS[i % PLATFORMS.length];
      const engagement = Math.round(20 + r() * 80);
      const purchaseIntent = Math.round(10 + r() * 90);
      const lifetimeValue = Math.round(r() * 100);
      const churnRisk = Math.round(r() * 80);
      const overall = Math.round((engagement + purchaseIntent + lifetimeValue + (100 - churnRisk)) / 4);
      const prefix = platform === "line" ? (r() > 0.5 ? "C" : "U") : platform === "facebook" ? "fb_" : "ig_";
      const sourceId = `${prefix}${String(1000 + i).padStart(6, "0")}`;

      return {
        sourceId,
        customerName: name,
        platform,
        scores: { engagement, purchaseIntent, lifetimeValue, churnRisk, overall },
        tier,
        lastCalculated: new Date(now - Math.floor(r() * 3) * 86400000),
        createdAt: new Date(now - Math.floor(r() * 90) * 86400000),
        updatedAt: new Date(now - Math.floor(r() * 3) * 86400000),
        history: Array.from({ length: 5 }, (_, j) => ({
          date: new Date(now - (5 - j) * 7 * 86400000),
          overall: Math.round(overall + (r() - 0.5) * 20),
        })),
      };
    });
    await db.collection("customer_scores").insertMany(scores);
    results["customer_scores"] = scores.length;

    // ═══ 4. Follow-up Rules ═══
    await db.collection("follow_up_rules").deleteMany({});
    const rules = [
      {
        name: "ลูกค้าไม่ตอบ 3 วัน",
        trigger: "no_reply_days", triggerDays: 3, triggerStage: "",
        messages: [
          { dayOffset: 0, template: "สวัสดีครับ ไม่ทราบว่าสนใจสินค้าที่สอบถามมาอยู่มั้ยครับ?" },
          { dayOffset: 3, template: "แจ้งให้ทราบครับ ราคาที่เสนอไปจะมีผลถึงสิ้นสัปดาห์นี้ครับ" },
        ],
        aiGenerate: false, platform: "all", status: "active",
        stats: { triggered: 45, replied: 18, converted: 7 },
      },
      {
        name: "ลูกค้าหายไป 7 วัน",
        trigger: "no_reply_days", triggerDays: 7, triggerStage: "",
        messages: [
          { dayOffset: 0, template: "สวัสดีครับ 🙏 ไม่ได้ติดต่อมาหลายวัน งานก่อสร้างเป็นยังไงบ้างครับ?" },
          { dayOffset: 5, template: "มีโปรโมชั่นพิเศษสำหรับลูกค้าเก่า ลด 10% ครับ สนใจมั้ยครับ?" },
        ],
        aiGenerate: true, platform: "all", status: "active",
        stats: { triggered: 28, replied: 12, converted: 5 },
      },
      {
        name: "ค้างที่เสนอราคา 5 วัน",
        trigger: "stage_stuck", triggerDays: 5, triggerStage: "quoting",
        messages: [
          { dayOffset: 0, template: "ใบเสนอราคาที่ส่งไป ไม่ทราบว่าพิจารณาเป็นยังไงบ้างครับ?" },
          { dayOffset: 3, template: "หากมีข้อสงสัยเรื่องราคาหรือรายละเอียด ปรึกษาได้เลยครับ" },
        ],
        aiGenerate: false, platform: "all", status: "active",
        stats: { triggered: 33, replied: 15, converted: 9 },
      },
      {
        name: "ลูกค้าสนใจสูง — ปิดการขาย",
        trigger: "high_intent", triggerDays: 1, triggerStage: "",
        messages: [
          { dayOffset: 0, template: "สินค้าที่สนใจมีพร้อมส่งครับ ต้องการสั่งเลยมั้ยครับ?" },
        ],
        aiGenerate: true, platform: "all", status: "active",
        stats: { triggered: 15, replied: 10, converted: 6 },
      },
    ];
    const rulesWithDates = rules.map((rule) => ({
      ...rule,
      createdAt: new Date(now - Math.floor(r() * 30) * 86400000),
      updatedAt: new Date(),
    }));
    await db.collection("follow_up_rules").insertMany(rulesWithDates);
    results["follow_up_rules"] = rules.length;

    // ═══ 5. Follow-up Queue ═══
    await db.collection("follow_up_queue").deleteMany({});
    const queue = [];
    const statuses = ["pending", "sent", "replied", "converted", "skipped"] as const;
    for (let i = 0; i < 20; i++) {
      const name = NAMES[i % NAMES.length];
      const platform = PLATFORMS[i % PLATFORMS.length];
      const prefix = platform === "line" ? "U" : platform === "facebook" ? "fb_" : "ig_";
      const status = statuses[Math.floor(r() * statuses.length)];
      queue.push({
        ruleId: `rule_${(i % rules.length) + 1}`,
        customerId: `cust_${i + 1}`,
        customerName: name,
        sourceId: `${prefix}${String(2000 + i)}`,
        platform,
        currentStep: status === "pending" ? 1 : 2,
        totalSteps: 2,
        status,
        nextSendAt: new Date(now + Math.floor(r() * 7) * 86400000),
        lastSentAt: status !== "pending" ? new Date(now - Math.floor(r() * 5) * 86400000) : null,
        lastMessage: status !== "pending" ? "สวัสดีครับ ไม่ทราบว่าสนใจสินค้าอยู่มั้ยครับ?" : null,
        repliedAt: status === "replied" || status === "converted" ? new Date(now - Math.floor(r() * 2) * 86400000) : null,
        convertedAt: status === "converted" ? new Date(now - Math.floor(r() * 1) * 86400000) : null,
        createdAt: new Date(now - Math.floor(r() * 14) * 86400000),
        updatedAt: new Date(),
      });
    }
    await db.collection("follow_up_queue").insertMany(queue);
    results["follow_up_queue"] = queue.length;

    // ═══ 6. Alerts ═══
    await db.collection("alerts").deleteMany({});
    const alertTypes = [
      { type: "sentiment_drop", title: "ลูกค้าไม่พอใจ", message: "{name} ส่งข้อความไม่พอใจเรื่องการจัดส่ง", severity: "high" },
      { type: "high_intent", title: "ลูกค้าสนใจซื้อ!", message: "{name} สนใจสั่งปูนซีเมนต์ 200 ถุง", severity: "medium" },
      { type: "inactive", title: "ลูกค้าหายไป", message: "{name} ไม่ตอบมา 7 วันแล้ว", severity: "low" },
      { type: "large_order", title: "ออเดอร์ใหญ่!", message: "{name} สั่งเหล็กเส้น 2 ตัน มูลค่า ฿85,000", severity: "high" },
      { type: "payment_received", title: "ได้รับชำระเงิน", message: "{name} โอนเงิน ฿{amount}", severity: "low" },
      { type: "complaint", title: "ร้องเรียน", message: "{name} แจ้งสินค้าเสียหายจากการขนส่ง", severity: "high" },
    ];
    const alerts = [];
    for (let i = 0; i < 25; i++) {
      const at = alertTypes[i % alertTypes.length];
      const name = NAMES[i % NAMES.length];
      alerts.push({
        type: at.type,
        title: at.title,
        message: at.message.replace("{name}", name).replace("{amount}", String(Math.round(r() * 50000 + 5000))),
        severity: at.severity,
        sourceId: `src_${1000 + i}`,
        customerName: name,
        read: r() > 0.4,
        createdAt: new Date(now - Math.floor(r() * 14) * 86400000),
      });
    }
    await db.collection("alerts").insertMany(alerts);
    results["alerts"] = alerts.length;

    // ═══ 7. AI Costs (น้องกุ้ง 13 บทบาท + Agent features) ═══
    await db.collection("ai_costs").deleteMany({});
    const costFeatures = [
      // Agent features
      { feature: "chat-reply", provider: "openrouter", model: "qwen/qwen3-235b-a22b", minIn: 800, maxIn: 3000, minOut: 200, maxOut: 1500, dailyCalls: 25 },
      { feature: "light-ai-json", provider: "groq", model: "llama-3.3-70b-versatile", minIn: 500, maxIn: 2000, minOut: 100, maxOut: 800, dailyCalls: 30 },
      { feature: "light-ai", provider: "groq", model: "llama-3.3-70b-versatile", minIn: 300, maxIn: 1500, minOut: 50, maxOut: 500, dailyCalls: 15 },
      { feature: "sentiment", provider: "sambanova", model: "Meta-Llama-3.1-8B-Instruct", minIn: 200, maxIn: 1000, minOut: 50, maxOut: 300, dailyCalls: 12 },
      { feature: "crm-analysis", provider: "sambanova", model: "Meta-Llama-3.1-8B-Instruct", minIn: 500, maxIn: 2000, minOut: 200, maxOut: 800, dailyCalls: 10 },
      { feature: "advisor-sentiment", provider: "openrouter", model: "qwen/qwen3-235b-a22b", minIn: 300, maxIn: 1200, minOut: 100, maxOut: 500, dailyCalls: 12 },
      { feature: "advisor-pipeline", provider: "openrouter", model: "qwen/qwen3-235b-a22b", minIn: 400, maxIn: 1500, minOut: 100, maxOut: 600, dailyCalls: 12 },
      { feature: "advisor-summary", provider: "openrouter", model: "qwen/qwen3-235b-a22b", minIn: 500, maxIn: 2000, minOut: 200, maxOut: 1000, dailyCalls: 12 },
      { feature: "embedding", provider: "gemini", model: "gemini-embedding-001", minIn: 50, maxIn: 200, minOut: 0, maxOut: 0, dailyCalls: 8 },
      { feature: "vision", provider: "gemini", model: "gemini-2.0-flash", minIn: 1000, maxIn: 5000, minOut: 200, maxOut: 800, dailyCalls: 3 },
      // น้องกุ้ง 13 บทบาท
      { feature: "problem-solver", provider: "openrouter", model: "qwen/qwen3-235b-a22b", minIn: 2000, maxIn: 8000, minOut: 500, maxOut: 3000, dailyCalls: 4 },
      { feature: "sales-hunter", provider: "openrouter", model: "qwen/qwen3-235b-a22b", minIn: 2000, maxIn: 8000, minOut: 500, maxOut: 3000, dailyCalls: 4 },
      { feature: "team-coaching", provider: "openrouter", model: "qwen/qwen3-235b-a22b", minIn: 3000, maxIn: 10000, minOut: 800, maxOut: 4000, dailyCalls: 2 },
      { feature: "weekly-strategy", provider: "openrouter", model: "qwen/qwen3-235b-a22b", minIn: 5000, maxIn: 15000, minOut: 1000, maxOut: 5000, dailyCalls: 1 },
      { feature: "health-monitor", provider: "openrouter", model: "qwen/qwen3-235b-a22b", minIn: 2000, maxIn: 8000, minOut: 500, maxOut: 2000, dailyCalls: 3 },
      { feature: "payment-guardian", provider: "groq", model: "llama-3.3-70b-versatile", minIn: 1000, maxIn: 4000, minOut: 300, maxOut: 1500, dailyCalls: 4 },
      { feature: "order-tracker", provider: "groq", model: "llama-3.3-70b-versatile", minIn: 1000, maxIn: 4000, minOut: 300, maxOut: 1500, dailyCalls: 3 },
      { feature: "re-engagement", provider: "sambanova", model: "Meta-Llama-3.1-8B-Instruct", minIn: 1500, maxIn: 6000, minOut: 400, maxOut: 2000, dailyCalls: 2 },
      { feature: "upsell-crosssell", provider: "sambanova", model: "Meta-Llama-3.1-8B-Instruct", minIn: 1500, maxIn: 6000, minOut: 400, maxOut: 2000, dailyCalls: 3 },
      { feature: "daily-report", provider: "openrouter", model: "qwen/qwen3-235b-a22b", minIn: 5000, maxIn: 15000, minOut: 1000, maxOut: 5000, dailyCalls: 1 },
      { feature: "lead-scorer", provider: "groq", model: "llama-3.3-70b-versatile", minIn: 1500, maxIn: 5000, minOut: 300, maxOut: 1500, dailyCalls: 3 },
      { feature: "appointment-reminder", provider: "cerebras", model: "llama-3.3-70b", minIn: 500, maxIn: 2000, minOut: 100, maxOut: 500, dailyCalls: 4 },
      { feature: "price-watcher", provider: "sambanova", model: "Meta-Llama-3.1-8B-Instruct", minIn: 2000, maxIn: 8000, minOut: 500, maxOut: 2000, dailyCalls: 1 },
    ];
    const aiPricing: Record<string, { input: number; output: number }> = {
      openrouter: { input: 0.01, output: 0.03 },
      groq: { input: 0, output: 0 },
      sambanova: { input: 0, output: 0 },
      cerebras: { input: 0, output: 0 },
      gemini: { input: 0, output: 0 },
    };
    const costRecords = [];
    for (let day = 0; day < 14; day++) {
      const dayDate = new Date(now - day * 86400000);
      for (const cf of costFeatures) {
        const calls = Math.max(1, Math.floor(cf.dailyCalls * (0.5 + r())));
        for (let c = 0; c < calls; c++) {
          const inputTokens = Math.floor(cf.minIn + r() * (cf.maxIn - cf.minIn));
          const outputTokens = Math.floor(cf.minOut + r() * (cf.maxOut - cf.minOut));
          const totalTokens = inputTokens + outputTokens;
          const pricing = aiPricing[cf.provider] || { input: 0, output: 0 };
          const costUsd = Math.round(((inputTokens * pricing.input + outputTokens * pricing.output) / 1000000) * 1000000) / 1000000;
          costRecords.push({
            provider: cf.provider,
            model: cf.model,
            feature: cf.feature,
            inputTokens,
            outputTokens,
            totalTokens,
            costUsd,
            sourceId: null,
            success: true,
            service: cf.feature.startsWith("problem") || cf.feature.startsWith("sales") || cf.feature.startsWith("team") || cf.feature.startsWith("weekly") || cf.feature.startsWith("health") || cf.feature.startsWith("payment") || cf.feature.startsWith("order") || cf.feature.startsWith("re-") || cf.feature.startsWith("upsell") || cf.feature.startsWith("daily") || cf.feature.startsWith("lead") || cf.feature.startsWith("appointment") || cf.feature.startsWith("price") ? "openclaw" : "agent",
            createdAt: new Date(dayDate.getTime() - Math.floor(r() * 86400000)),
          });
        }
      }
    }
    await db.collection("ai_costs").insertMany(costRecords);
    results["ai_costs"] = costRecords.length;

    return NextResponse.json({
      ok: true,
      message: "สร้างข้อมูลตัวอย่างเพิ่มเติมสำเร็จ",
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
