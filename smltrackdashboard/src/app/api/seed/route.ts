import { NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// ─── Thai Demo Data ───

const FIRST_NAMES = [
  "สมชาย", "สมหญิง", "ประเสริฐ", "วิภา", "สุชาติ", "นภา", "ธนากร", "พิมพ์", "อนุชา", "กัลยา",
  "วีระ", "สุดา", "ปิยะ", "จันทร์", "ชัยวัฒน์", "รัตนา", "ภูมิ", "ดวงใจ", "ณัฐ", "ขวัญ",
  "กิตติ", "มาลี", "อภิชาต", "ศิริ", "พงศ์", "ลัดดา", "เกียรติ", "วรรณ", "ธีระ", "พรทิพย์",
  "สุรชัย", "อัญชลี", "ยศ", "นวล", "บุญมี", "สายฝน", "เฉลิม", "ปราณี", "ไพศาล", "จิราภรณ์",
  "วิชัย", "ศรีสุดา", "มนตรี", "กาญจนา", "อำนาจ", "เพ็ญ", "สมบัติ", "ทิพย์", "วัชระ", "นิตยา",
];

const LAST_NAMES = [
  "สุขสมบูรณ์", "จันทร์เพ็ง", "ทองดี", "แก้วมณี", "พลอยงาม", "สว่างจิต", "ใจดี", "บุญมา",
  "ศรีสุข", "รุ่งเรือง", "มั่นคง", "วิไลพร", "พิทักษ์", "ประสิทธิ์", "สมบูรณ์", "ชัยชนะ",
  "บุญเลิศ", "เจริญผล", "สุขใจ", "ทวีป", "อารีย์", "กลิ่นดี", "มีสุข", "เกษม", "ร่มเย็น",
];

const STAFF_NAMES = ["SML-วิภา", "SML-ธนากร", "SML-สุดา", "SML-ชัยวัฒน์", "SML-พิมพ์"];

const PRODUCTS = [
  "ปูนซีเมนต์ ตราเสือ", "ปูนซีเมนต์ ตราช้าง", "ปูนสำเร็จรูป", "ปูนฉาบ",
  "เหล็กเส้น 12mm", "เหล็กเส้น 16mm", "เหล็กเส้น 20mm", "เหล็กข้ออ้อย",
  "อิฐมอญ", "อิฐบล็อก", "อิฐมวลเบา Q-CON", "คอนกรีตบล็อก",
  "ไม้แบบ", "ไม้อัด", "ไม้จริง สัก", "ไม้เทียม Conwood",
  "กระเบื้องหลังคา SCG", "กระเบื้องปูพื้น 60x60", "กระเบื้องห้องน้ำ", "หินแกรนิต",
  "สีทาบ้าน TOA", "สีรองพื้น", "สีกันสนิม", "ทินเนอร์",
  "ท่อ PVC 4 นิ้ว", "ท่อ PE", "ข้อต่อท่อ", "วาล์วน้ำ",
  "สายไฟ THW", "เบรกเกอร์", "ปลั๊กไฟ", "ตู้ MDB",
  "ประตูไม้", "ประตูอลูมิเนียม", "หน้าต่างบานเลื่อน", "มุ้งลวด",
  "ทราย", "หิน 3/4", "หินคลุก", "ดินถม",
];

const CUSTOMER_MESSAGES = [
  // ถามราคา
  "ปูนซีเมนต์ตราเสือ ราคาเท่าไหร่ครับ", "เหล็กเส้น 12mm เท่าไหร่", "ราคาส่งมาหน้างานเท่าไหร่",
  "ซื้อ 100 ถุง ลดได้มั้ย", "ราคาอิฐบล็อก ล็อตใหญ่", "กระเบื้อง SCG ราคาแผ่นละเท่าไหร่",
  "ค่าขนส่งไปอุดรเท่าไหร่", "มีราคาเหมายกล็อตมั้ย", "ราคาทรายหยาบ คิวละเท่าไหร่",
  "สีทาบ้าน TOA ถังละเท่าไหร่", "ท่อ PVC 4 นิ้ว ท่อนละเท่าไหร่",
  // สนใจ
  "สนใจปูนครับ ซื้อเยอะลดได้มั้ย", "มีเหล็กข้ออ้อยมั้ย", "อิฐมวลเบา Q-CON มีพร้อมส่งมั้ย",
  "ขอใบเสนอราคาหน่อยครับ", "รบกวนส่งแคตตาล็อกกระเบื้องให้หน่อย", "จะสร้างบ้านสนใจวัสดุหลายรายการ",
  "ขอรายละเอียดสินค้าเพิ่มเติม", "มีรุ่นไหนแนะนำครับ", "คุณภาพเป็นยังไง",
  "เทียบกับยี่ห้ออื่นอันไหนดีกว่า", "ขอดูตัวอย่างหน้างานได้มั้ย",
  // สั่งซื้อ
  "สั่งปูน 200 ถุง ส่งหน้างานได้มั้ย", "โอนแล้วครับ", "ส่งสลิปให้นะครับ",
  "เพิ่มเหล็กอีก 50 เส้น", "สั่งเพิ่มอีกรอบ ของเดิม", "เมื่อไหร่ส่งครับ สั่งไปเมื่อวาน",
  "ส่งใบกำกับภาษีด้วยนะครับ", "ต้องการใบเสร็จรับเงิน", "จ่ายเงินสดหน้างานได้มั้ย",
  // ขอบคุณ
  "ของมาครบถ้วนครับ ขอบคุณ", "ส่งไว คุณภาพดีครับ", "จะกลับมาสั่งใหม่แน่นอน",
  "ช่างบอกของดีครับ 👍", "ขอบคุณที่ส่งด่วนครับ", "บริการดีมากครับ",
  // ร้องเรียน — ไม่พอใจ
  "ทำไมยังไม่ส่งครับ สั่งไป 3 วันแล้ว", "ของที่ส่งมาแตก 5 ถุง ใครรับผิดชอบ",
  "เหล็กที่ส่งมาไม่ครบ ขาดไป 20 เส้น!", "ปูนที่ส่งมาเป็นรุ่นเก่า จะหมดอายุแล้ว",
  "ติดต่อไปไม่มีใครรับสาย โทรไป 5 ครั้ง", "ส่งของผิดครับ สั่ง 12mm ได้ 10mm",
  "โกงราคาหรือเปล่า ร้านอื่นถูกกว่าเยอะ", "ผมไม่พอใจเลยครับ จะไม่ซื้ออีกแล้ว",
  "บริการแย่มาก รอ 2 ชั่วโมงไม่มีใครตอบ", "ปูนเปียกน้ำหมดเลย ขนส่งไม่คลุมผ้าใบ",
  "คุณภาพไม่ได้มาตรฐานเลย จะรีวิวให้คนอื่นรู้", "ขอคืนเงินครับ ไม่ต้องเอาของแล้ว",
  "เคลมได้มั้ย ของเสียหายจากขนส่ง", "แจ้ง สคบ. ได้เลยนะ ถ้าไม่แก้ให้",
  // ต่อราคา — เปรียบเทียบคู่แข่ง
  "ร้าน xxx ขายถูกกว่า 10 บาท/ถุง ลดได้มั้ย", "ราคานี้แพงไปครับ ลดอีกได้มั้ย",
  "โฮมโปรขาย 120 บาท ทำไมร้านนี้ 135", "ถ้าลดได้ผมซื้อ 500 ถุงเลย",
  "Global House ราคาเดียวกันแต่ส่งฟรี", "ขอราคาพิเศษหน่อยได้มั้ย ซื้อประจำ",
  "เจ้าอื่นให้เครดิต 60 วัน ที่นี่ให้ได้มั้ย", "ราคานี้ยังไม่ใช่ราคาดีที่สุดที่ผมได้มา",
  // ไม่ซื้อ — ปฏิเสธ
  "ขอคิดดูก่อนนะครับ", "ตอนนี้ยังไม่ต้องการครับ งบไม่พอ", "ไม่เอาแล้วครับ ไปซื้อที่อื่นแล้ว",
  "ผู้รับเหมาเปลี่ยนใจ ยกเลิกออเดอร์", "ยกเลิกครับ โปรเจกต์ถูกยกเลิก",
  "เจ้าของบ้านเปลี่ยนแบบ ต้องคำนวณใหม่", "เดี๋ยวคิดดูก่อน ยังไม่แน่ใจ",
  "ราคาสูงเกินงบ ขอผ่านครับ", "ไม่ตรงสเปคที่ต้องการ", "ช่างบอกไม่เหมาะกับงานนี้",
  // ด่วน — เร่งรีบ
  "ด่วนมากครับ งานจะเทพรุ่งนี้เช้า!", "ต้องการภายในวันนี้ ได้มั้ย",
  "ช่างรอของอยู่หน้างาน ส่งได้เลยมั้ย", "ปูนหมดกลางงาน ต้องการด่วน 50 ถุง",
  "เหล็กไม่พอ ต้องเพิ่มอีก 30 เส้น วันนี้", "สถานการณ์ฉุกเฉิน ท่อแตก ต้องการท่อด่วน",
  // ถามเทคนิค
  "ปูนตราเสือกับตราช้างต่างกันยังไง", "เหล็ก SD40 กับ SR24 ใช้ต่างกันยังไง",
  "อิฐมวลเบากับอิฐมอญ อันไหนดีกว่าสำหรับห้องน้ำ", "สีทาภายนอกกับภายใน ใช้รุ่นเดียวกันได้มั้ย",
  "กระเบื้อง 60x60 กับ 80x80 แนะนำรุ่นไหน", "ท่อ PVC ชั้น 5 กับ ชั้น 8.5 ต่างกันตรงไหน",
  "คอนกรีตผสมเสร็จ 1 คิว ใช้ปูนกี่ถุง", "เหล็กเส้น 1 ตัน ได้กี่เส้น",
  // ทั่วไป
  "สวัสดีครับ", "ขอสอบถามวัสดุก่อสร้างครับ", "ร้านเปิดกี่โมง", "อยู่ที่ไหนครับ",
  "รับงานโปรเจกต์ใหญ่มั้ย", "มีวัสดุอะไรบ้าง", "สินค้ามีรับประกันมั้ย",
  "มีช่างแนะนำมั้ยครับ", "เดี๋ยวปรึกษาผู้รับเหมาก่อนนะ", "ไว้โทรกลับนะครับ",
  "จะสร้างบ้านใหม่ ต้องใช้วัสดุอะไรบ้าง", "ต่อเติมห้องครัว ต้องใช้ของอะไร",
];

const STAFF_REPLIES = [
  // ทักทาย + ราคา
  "สวัสดีครับ ยินดีให้บริการครับ 🙏", "ราคา {price} บาทครับ", "มีครับ พร้อมส่งเลย",
  "ส่งรถ 6 ล้อได้เลยครับ ค่าขนส่งคิดตามระยะทาง", "ซื้อ 100 ถุงขึ้นไปลด 5% ครับ",
  "ส่งใบเสนอราคาให้ทาง LINE เลยนะครับ", "รุ่นนี้คุณภาพดีครับ ช่างแนะนำ",
  // สั่งซื้อ
  "ขอบคุณที่สั่งซื้อครับ จัดส่งภายในวันพรุ่งนี้เช้า", "เลขที่ใบส่งของ {tracking} ครับ",
  "รบกวนส่งสลิปมาด้วยนะครับ", "ตอนนี้ซื้อปูน 50 ถุง แถมถุงมือ 2 คู่ครับ",
  "ขอบคุณครับ 🙏 ยินดีเสมอครับ",
  // แก้ปัญหา — รับมือร้องเรียน
  "ขออภัยครับ จะรีบจัดส่งให้ทันที", "ต้องขออภัยจริงๆ ครับ จะส่งชดเชยให้เพิ่ม",
  "เรื่องปูนแตก ผมจะส่งทดแทนให้ภายในวันนี้ครับ", "รับทราบครับ จะตรวจสอบกับทีมขนส่งทันที",
  "ขออภัยที่ตอบช้าครับ วันนี้ออเดอร์เยอะมาก", "จะคืนเงินส่วนต่างให้ครับ ขออภัยด้วยนะครับ",
  "ส่งของผิดจริงครับ จะเก็บของเดิมแล้วส่งใหม่ให้ฟรี", "เคลมได้เลยครับ ส่งรูปของเสียหายมาได้เลย",
  // ต่อราคา
  "ราคานี้ดีที่สุดแล้วครับ แต่ถ้าซื้อ 200+ ลดเพิ่มได้ 3%", "เราให้บริการส่งถึงหน้างาน + ของคุณภาพ มอก. ครับ",
  "ลดเพิ่มไม่ได้แล้วครับ แต่แถมค่าส่งให้ได้", "ถ้ายอดเยอะ เดี๋ยวคุยกับผู้จัดการให้ครับ",
  // เทคนิค
  "ปูนตราเสือเหมาะกับงานโครงสร้าง ตราช้างเหมาะงานฉาบครับ", "เหล็กรุ่นนี้ได้มาตรฐาน มอก. ครับ",
  "กระเบื้องรุ่นนี้ทนแดดทนฝนครับ", "ท่อ PVC ยี่ห้อนี้หนาทนทานครับ",
  "แนะนำ Q-CON สำหรับห้องน้ำครับ กันชื้นดีกว่าอิฐมอญ", "1 คิว ใช้ปูนประมาณ 7-8 ถุงครับ",
  // ด่วน
  "ส่งให้ได้ภายใน 2 ชม.ครับ ค่าด่วน +200", "มีของพร้อม จัดรถออกเลยครับ",
  "ของล็อตใหม่เข้าสัปดาห์หน้าครับ", "เปลี่ยนได้ครับ ส่งกลับมาที่หน้าร้านเลย",
];

const BOT_REPLIES = [
  "สวัสดีครับ น้องกุ้งยินดีให้บริการครับ 🦐", "รอสักครู่นะครับ กำลังตรวจสอบสต็อกให้ครับ",
  "{product} ราคา {price} บาทครับ มีพร้อมส่งเลย",
  "ขอบคุณที่สนใจครับ รบกวนแจ้งจำนวนและที่อยู่ส่งของด้วยนะครับ",
  "ตอนนี้ทีมงานไม่อยู่ครับ จะแจ้งให้ติดต่อกลับโดยเร็วนะครับ 🙏",
  "สินค้าตัวนี้ได้มาตรฐาน มอก. ครับ คุณภาพดีเยี่ยม",
  "ซื้อ {product} 100 ชิ้นขึ้นไป ลดพิเศษครับ",
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randPrice() { return [45, 65, 95, 125, 135, 165, 185, 280, 290, 320, 450, 590, 780, 1200, 1290, 2500, 5000][randInt(0, 16)]; }

function randomDate(daysBack: number) {
  const now = Date.now();
  return new Date(now - Math.random() * daysBack * 86400000);
}

function generateSourceId(platform: string) {
  const chars = "abcdef0123456789";
  const id = Array.from({ length: 16 }, () => chars[randInt(0, 15)]).join("");
  if (platform === "line") return (Math.random() > 0.3 ? "U" : "C") + id;
  if (platform === "facebook") return "fb_" + id;
  return "ig_" + id;
}

export async function POST() {
  const t0 = Date.now();
  try {
    const db = await getDB();

    // ─── 1. Clear ALL data ───
    const collections = [
      "messages", "customers", "groups_meta", "chat_analytics",
      "user_skills", "analysis_logs", "ai_advice", "tasks",
      "kb_articles", "knowledge_base", "payments", "documents", "appointments", "bot_config",
      "follow_up_rules", "follow_up_queue", "reply_templates",
    ];
    for (const col of collections) {
      await db.collection(col).dropIndexes().catch(() => {});
      await db.collection(col).deleteMany({});
    }

    // ─── 2. Generate customers + rooms ───
    const NUM_CUSTOMERS = 200;
    const platforms = ["line", "line", "facebook", "facebook", "instagram", "instagram"]; // balanced
    const pipelineStages = ["new", "new", "interested", "interested", "interested", "quoting", "quoting", "negotiating", "negotiating", "closed_won", "closed_won", "closed_lost", "closed_lost", "closed_lost", "following_up", "following_up"];

    interface RoomDef { sourceId: string; platform: string; customerName: string; staffName: string; isGroup?: boolean; members?: string[]; }
    const rooms: RoomDef[] = [];
    const customerDocs: any[] = [];

    for (let i = 0; i < NUM_CUSTOMERS; i++) {
      const firstName = rand(FIRST_NAMES);
      const lastName = rand(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const platform = rand(platforms);
      const sourceId = generateSourceId(platform);
      const staff = rand(STAFF_NAMES);

      // Many customers have multiple platforms (40% 2 platforms, 15% 3 platforms)
      const extraPlatforms: { platform: string; sourceId: string }[] = [];
      if (Math.random() > 0.5) {
        const p2 = platform === "line" ? (Math.random() > 0.5 ? "facebook" : "instagram")
          : platform === "facebook" ? (Math.random() > 0.5 ? "line" : "instagram")
          : (Math.random() > 0.5 ? "line" : "facebook");
        extraPlatforms.push({ platform: p2, sourceId: generateSourceId(p2) });
      }
      if (Math.random() > 0.75) {
        const existing = [platform, ...extraPlatforms.map(e => e.platform)];
        const p3 = ["line", "facebook", "instagram"].find(p => !existing.includes(p));
        if (p3) extraPlatforms.push({ platform: p3, sourceId: generateSourceId(p3) });
      }

      const allRooms = [sourceId, ...extraPlatforms.map(e => e.sourceId)];
      const platformIds: Record<string, string[]> = { line: [], facebook: [], instagram: [] };
      platformIds[platform].push(sourceId);
      for (const ep of extraPlatforms) platformIds[ep.platform].push(ep.sourceId);

      const stage = rand(pipelineStages);
      const dealValue = ["quoting", "negotiating", "closed_won"].includes(stage) ? randPrice() * randInt(1, 5) : 0;

      customerDocs.push({
        name,
        firstName,
        lastName,
        company: Math.random() > 0.7 ? `${rand(["บจก.", "หจก.", "ร้าน"])} ${rand(LAST_NAMES)}` : "",
        position: "",
        phone: Math.random() > 0.5 ? `08${randInt(0, 9)}${randInt(1000000, 9999999)}` : "",
        email: Math.random() > 0.6 ? `${firstName.toLowerCase()}@${rand(["gmail.com", "hotmail.com", "yahoo.com"])}` : "",
        sourceId,
        platformIds,
        lineId: platformIds.line[0] || "",
        facebookId: platformIds.facebook[0] || "",
        instagramId: platformIds.instagram[0] || "",
        rooms: allRooms,
        tags: [],
        customTags: [],
        pipelineStage: stage,
        dealValue,
        totalMessages: 0,
        assignedTo: [staff.replace("SML-", "")],
        avatarUrl: "",
        notes: "",
        address: "",
        createdAt: randomDate(60),
        updatedAt: new Date(),
      });

      // Main room
      rooms.push({ sourceId, platform, customerName: name, staffName: staff });
      // Extra rooms
      for (const ep of extraPlatforms) {
        rooms.push({ sourceId: ep.sourceId, platform: ep.platform, customerName: name, staffName: staff });
      }
    }

    if (customerDocs.length > 0) {
      await db.collection("customers").insertMany(customerDocs);
    }

    // ─── 2b. Generate GROUP chats (LINE groups, FB group chats) ───
    const GROUP_NAMES = [
      "กลุ่มผู้รับเหมา VIP", "ช่างก่อสร้างภาคกลาง", "ผู้รับเหมา กทม.+ปริมณฑล",
      "กลุ่มสั่งปูนรวม", "ผู้รับเหมาภาคเหนือ", "ผู้รับเหมาภาคอีสาน",
      "ร้านค้าตัวแทน กรุงเทพ", "ผู้รับเหมาภาคใต้", "สั่งเหล็ก ล็อตใหญ่",
      "ตัวแทนจำหน่าย Zone A", "ตัวแทนจำหน่าย Zone B", "ทีมช่างประจำ",
      "กลุ่มรีวิววัสดุ", "หมู่บ้านจัดสรร โปรเจกต์ A", "สร้างบ้าน 2026",
      "ร้านวัสดุพันธมิตร", "กลุ่มโปรวัสดุก่อสร้าง", "ลูกค้าขาประจำ",
      "กลุ่มซื้อของรวมลดค่าส่ง", "สอบถามราคาวัสดุ",
    ];

    const GROUP_MESSAGES = [
      // ทั่วไป
      "สวัสดีครับ ทุกคน", "ปูนล็อตใหม่เข้าแล้วครับ", "เดือนนี้มีโปรปูนมั้ย",
      "สั่งเหล็กเพิ่มอีก 100 เส้น", "ราคาปูน 500 ถุง ลดเท่าไหร่", "+1 ครับ สั่งด้วย",
      "ขอจองกระเบื้องก่อนนะ", "เหล็กเส้นหมดเมื่อไหร่", "รอบหน้าของเข้าเมื่อไหร่",
      // รีวิว/ชม
      "ปูนรุ่นนี้ดีครับ ช่างชอบ", "ของดี ราคาถูกกว่าที่อื่น", "ขอบคุณที่จัดส่งไวครับ 🙏",
      // ถามเทคนิค
      "ใครเคยใช้ Q-CON บ้าง", "อิฐบล็อกกับอิฐมวลเบาอันไหนดีกว่า", "ช่างแนะนำยี่ห้อไหนครับ",
      "งานนี้ต้องใช้ปูนกี่ถุง", "เหล็ก SD40 กับ SR24 ใช้ต่างกันยังไง",
      // ร้องเรียนในกลุ่ม
      "ร้านนี้ส่งช้าบ่อยมาก ใครเจอบ้าง", "ปูนล็อตที่แล้วคุณภาพไม่ค่อยดี",
      "ผมโดนคิดค่าขนส่งแพงมาก ใครเทียบราคาได้บ้าง", "เหล็กที่ส่งมาสนิมเยอะ ใช้ได้มั้ย",
      "ทำไมราคาขึ้นทุกเดือน", "ร้านอื่นถูกกว่าเยอะนะ", "บริการหลังการขายไม่ดีเลย",
      // ธุรกิจ
      "มีเครดิต 30 วันมั้ย", "รับวางบิลมั้ยครับ", "ต้องการใบกำกับภาษีด้วย",
      "ราคานี้รวม VAT มั้ย", "มีบริการจัดส่งหน้างานมั้ย", "ขนส่งรถ 6 ล้อได้มั้ย",
      // เปรียบเทียบ
      "ร้าน xxx ให้เครดิต 60 วัน ที่นี่ให้ได้มั้ย", "Global House ส่งฟรีนะ ที่นี่คิดค่าส่ง",
      "ใครมีร้านวัสดุดีๆ แนะนำหน่อย", "เทียบราคาหลายร้านแล้ว ที่นี่ยังแพงอยู่",
    ];

    const NUM_GROUPS = 25;
    for (let g = 0; g < NUM_GROUPS; g++) {
      const platform = rand(["line", "line", "facebook"]); // groups mostly LINE
      const sourceId = "C" + Array.from({ length: 16 }, () => "abcdef0123456789"[randInt(0, 15)]).join("");
      const staff = rand(STAFF_NAMES);
      const memberCount = randInt(3, 8);
      const members = Array.from({ length: memberCount }, () => `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`);

      rooms.push({
        sourceId,
        platform,
        customerName: members[0], // primary speaker
        staffName: staff,
        isGroup: true,
        members,
      });
    }

    // ─── 3. Generate messages per room ───
    const allMessages: any[] = [];

    for (const room of rooms) {
      const msgCount = room.isGroup ? randInt(15, 80) : randInt(8, 60);
      const startDate = randomDate(30);
      const msgs: any[] = [];

      for (let j = 0; j < msgCount; j++) {
        const elapsed = (j / msgCount) * randInt(1, 7) * 86400000;
        const createdAt = new Date(startDate.getTime() + elapsed);

        const roll = Math.random();
        let role: string, userName: string, content: string;

        if (room.isGroup && room.members) {
          // Group: random member speaks
          if (roll < 0.65) {
            role = "user";
            userName = rand(room.members);
            content = rand([...CUSTOMER_MESSAGES, ...GROUP_MESSAGES]);
          } else if (roll < 0.85) {
            role = "user";
            userName = room.staffName;
            content = rand(STAFF_REPLIES)
              .replace("{price}", String(randPrice()))
              .replace("{tracking}", `TH${randInt(100000000, 999999999)}`);
          } else {
            role = "assistant";
            userName = "น้องกุ้ง";
            content = rand(BOT_REPLIES)
              .replace("{product}", rand(PRODUCTS))
              .replace("{price}", String(randPrice()));
          }
        } else if (roll < 0.55) {
          // 1:1 Customer message
          role = "user";
          userName = room.customerName;
          content = rand(CUSTOMER_MESSAGES);
        } else if (roll < 0.85) {
          // Staff reply
          role = "user";
          userName = room.staffName;
          content = rand(STAFF_REPLIES)
            .replace("{price}", String(randPrice()))
            .replace("{tracking}", `TH${randInt(100000000, 999999999)}`);
        } else {
          // Bot reply
          role = "assistant";
          userName = "น้องกุ้ง";
          content = rand(BOT_REPLIES)
            .replace("{product}", rand(PRODUCTS))
            .replace("{price}", String(randPrice()));
        }

        // Some messages have images
        const hasImage = Math.random() > 0.92;

        msgs.push({
          sourceId: room.sourceId,
          platform: room.platform,
          role,
          userName,
          content,
          messageType: hasImage ? "image" : "text",
          imageUrl: hasImage ? `https://picsum.photos/seed/${randInt(1, 9999)}/400/300` : null,
          createdAt,
        });
      }

      allMessages.push(...msgs);
    }

    // Insert in batches
    const BATCH = 500;
    for (let i = 0; i < allMessages.length; i += BATCH) {
      await db.collection("messages").insertMany(allMessages.slice(i, i + BATCH));
    }

    // ─── 4. Update customer totalMessages ───
    for (const c of customerDocs) {
      const count = allMessages.filter(m => c.rooms.includes(m.sourceId) && m.userName === c.name).length;
      await db.collection("customers").updateOne(
        { sourceId: c.sourceId },
        { $set: { totalMessages: count } }
      );
    }

    // ─── 5. Generate groups_meta ───
    const groupsDocs = rooms.map((r, ri) => {
      const roomMsgs = allMessages.filter(m => m.sourceId === r.sourceId);
      const names = [...new Set(roomMsgs.map(m => m.userName))];
      const isGroup = r.isGroup || r.sourceId.startsWith("C");
      const groupName = isGroup
        ? (GROUP_NAMES[ri % GROUP_NAMES.length] || `กลุ่ม ${ri}`)
        : names.filter(n => !n.startsWith("SML") && n !== "น้องกุ้ง").join(", ") || r.sourceId;
      return {
        sourceId: r.sourceId,
        groupName,
        sourceType: isGroup ? "group" : "user",
        platform: r.platform,
        messageCount: roomMsgs.length,
        lastMessageAt: roomMsgs.length > 0 ? roomMsgs[roomMsgs.length - 1].createdAt : null,
      };
    });
    if (groupsDocs.length > 0) {
      await db.collection("groups_meta").insertMany(groupsDocs);
    }

    // ─── 6. Generate chat_analytics ───
    const buyKeywords = ["ราคา", "สั่ง", "ซื้อ", "โอน", "จ่าย", "ส่ง", "สนใจ", "เท่าไหร่"];
    const analyticsDocs = rooms.map(r => {
      const roomMsgs = allMessages.filter(m => m.sourceId === r.sourceId);
      const customerMsgs = roomMsgs.filter(m => m.role === "user" && !m.userName.startsWith("SML"));
      const staffMsgs = roomMsgs.filter(m => m.role === "user" && m.userName.startsWith("SML"));
      const botMsgs = roomMsgs.filter(m => m.role === "assistant");
      const allContent = customerMsgs.map(m => m.content).join(" ");
      const buyScore = buyKeywords.filter(k => allContent.includes(k)).length;

      const hasRecent = roomMsgs.some(m => Date.now() - new Date(m.createdAt).getTime() < 7 * 86400000);
      const sentimentLevel = hasRecent ? "green" : "yellow";
      const purchaseLevel = buyScore >= 3 ? "red" : buyScore >= 1 ? "yellow" : "green";

      return {
        sourceId: r.sourceId,
        sentiment: { score: sentimentLevel === "green" ? randInt(60, 90) : randInt(30, 55), level: sentimentLevel, reason: sentimentLevel === "green" ? "มี activity ล่าสุด" : "ไม่มี activity 7 วัน" },
        overallSentiment: { score: sentimentLevel === "green" ? randInt(60, 90) : randInt(30, 55), level: sentimentLevel, reason: sentimentLevel === "green" ? "ปกติ" : "ควรติดตาม" },
        customerSentiment: { score: randInt(40, 90), level: sentimentLevel, reason: `${customerMsgs.length} ข้อความ` },
        staffSentiment: { score: randInt(50, 95), level: "green", reason: `${staffMsgs.length} ข้อความ` },
        purchaseIntent: { score: buyScore * 12 + randInt(0, 20), level: purchaseLevel, reason: buyScore >= 3 ? "สนใจซื้อ!" : buyScore >= 1 ? "เริ่มสนใจ" : "ยังไม่สนใจ" },
        messageCount: roomMsgs.length,
        customerMessageCount: customerMsgs.length,
        staffMessageCount: staffMsgs.length,
        botMessageCount: botMsgs.length,
        lastActivity: roomMsgs[roomMsgs.length - 1]?.createdAt || null,
        updatedAt: new Date(),
      };
    });
    if (analyticsDocs.length > 0) {
      await db.collection("chat_analytics").insertMany(analyticsDocs);
    }

    // ─── 7. Generate user_skills ───
    const skillsDocs: any[] = [];
    const allUserNames = [...new Set(allMessages.map(m => m.userName))];
    for (const userName of allUserNames) {
      if (!userName) continue;
      const isStaff = userName.startsWith("SML");
      const isBot = userName === "น้องกุ้ง";
      if (isBot) continue;

      const userMsgs = allMessages.filter(m => m.userName === userName);
      const bySource: Record<string, any[]> = {};
      for (const m of userMsgs) {
        if (!bySource[m.sourceId]) bySource[m.sourceId] = [];
        bySource[m.sourceId].push(m);
      }

      for (const [sourceId, msgs] of Object.entries(bySource)) {
        const sentScore = isStaff ? randInt(60, 95) : randInt(25, 90);
        const purchaseScore = isStaff ? randInt(0, 20) : randInt(10, 85);
        skillsDocs.push({
          sourceId,
          userId: userName,
          userName,
          isStaff,
          sentiment: { score: sentScore, level: sentScore >= 60 ? "green" : sentScore >= 30 ? "yellow" : "red", reason: isStaff ? "พนักงาน" : "ลูกค้า" },
          purchaseIntent: { score: purchaseScore, level: purchaseScore >= 60 ? "red" : purchaseScore >= 30 ? "yellow" : "green", reason: purchaseScore >= 60 ? "สนใจซื้อ" : "ทั่วไป" },
          tags: isStaff ? ["staff"] : [rand(["ถามราคา", "สนใจสินค้า", "สั่งซื้อ", "ติดตาม", "รีวิว", "สอบถาม", "ร้องเรียน", "ลูกค้าเก่า", "VIP"])],
          pipelineStage: isStaff ? "new" : rand(["new", "interested", "quoting", "negotiating", "closed_won", "following_up"]),
          messageCount: msgs.length,
          lastMessage: msgs[msgs.length - 1]?.content?.substring(0, 100) || "",
          lastActivity: msgs[msgs.length - 1]?.createdAt || null,
          updatedAt: new Date(),
          createdAt: msgs[0]?.createdAt || new Date(),
        });
      }
    }
    if (skillsDocs.length > 0) {
      await db.collection("user_skills").insertMany(skillsDocs);
    }

    // ─── 8. Generate tasks ───
    const taskDocs: any[] = [];
    for (let i = 0; i < 40; i++) {
      const c = rand(customerDocs);
      taskDocs.push({
        customerId: c.sourceId,
        customerName: c.name,
        title: rand([
          "ติดตามใบเสนอราคาวัสดุ", "โทรหาผู้รับเหมา", "ส่งโปรปูนราคาพิเศษ",
          "เช็คสถานะจัดส่งหน้างาน", "นัดดูหน้างาน", "ส่ง catalog วัสดุ",
          "Follow up หลังส่งของ", "ถามความพอใจจัดส่ง", "เสนอ package สร้างบ้าน",
          "สั่งปูนเพิ่มจากโรงงาน", "ตรวจสต็อกเหล็ก", "ออกใบกำกับภาษี",
        ]),
        notes: rand(["", "ผู้รับเหมาสนใจล็อตใหญ่", "รอยืนยันยอด", "ด่วน งานเริ่มพรุ่งนี้", "โทรไม่ติด 2 ครั้ง", "ต้องการเครดิต 30 วัน"]),
        dueDate: new Date(Date.now() + randInt(-3, 7) * 86400000),
        priority: rand(["high", "medium", "medium", "low"]),
        status: rand(["pending", "pending", "pending", "done", "done"]),
        createdAt: randomDate(14),
        updatedAt: new Date(),
      });
    }
    if (taskDocs.length > 0) {
      await db.collection("tasks").insertMany(taskDocs);
    }

    // ─── 9. Generate Knowledge Base (KB) ───
    const kbArticles = [
      // สินค้า — ปูน
      { category: "product", title: "ปูนซีเมนต์ ตราเสือ", content: "ปูนซีเมนต์ปอร์ตแลนด์ ตราเสือ ประเภท 1\nน้ำหนัก: 50 กก./ถุง\nราคา: 135 บาท/ถุง | 100 ถุง 128 บาท/ถุง\nเหมาะสำหรับ: งานโครงสร้าง เสา คาน พื้น\nมาตรฐาน: มอก.15-2555\nอายุการใช้งาน: 3 เดือนจากวันผลิต" },
      { category: "product", title: "ปูนซีเมนต์ ตราช้าง", content: "ปูนซีเมนต์ผสม ตราช้าง (เขียว)\nน้ำหนัก: 50 กก./ถุง\nราคา: 125 บาท/ถุง | 100 ถุง 118 บาท/ถุง\nเหมาะสำหรับ: งานฉาบ ก่อ ปูกระเบื้อง\nมาตรฐาน: มอก.80-2550" },
      { category: "product", title: "ปูนสำเร็จรูป ตราเสือ", content: "ปูนสำเร็จรูป ตราเสือ (ฉาบละเอียด)\nน้ำหนัก: 25 กก./ถุง\nราคา: 165 บาท/ถุง\nเหมาะสำหรับ: งานฉาบผิวเรียบ ฉาบบาง\nผสมน้ำพร้อมใช้ ไม่ต้องผสมทราย" },
      // สินค้า — เหล็ก
      { category: "product", title: "เหล็กเส้น ข้ออ้อย SD40", content: "เหล็กข้ออ้อย มาตรฐาน SD40\nขนาด: 10mm 12mm 16mm 20mm 25mm\nความยาว: 10 เมตร/เส้น\nราคา 12mm: 185 บาท/เส้น | 100 เส้น 175 บาท\nราคา 16mm: 320 บาท/เส้น | 100 เส้น 305 บาท\nมาตรฐาน: มอก.24-2559" },
      { category: "product", title: "ลวดผูกเหล็ก", content: "ลวดผูกเหล็ก เบอร์ 18\nน้ำหนัก: 1 กก./ม้วน\nราคา: 45 บาท/ม้วน | 10 ม้วน 40 บาท\nใช้สำหรับผูกเหล็กเสริมคอนกรีต" },
      // สินค้า — อิฐ/บล็อก
      { category: "product", title: "อิฐมวลเบา Q-CON", content: "อิฐมวลเบา Q-CON\nขนาด: 20x60 cm หนา 7.5 / 10 / 12.5 cm\nราคา 7.5cm: 28 บาท/ก้อน | พาเลท 25 บาท\nราคา 10cm: 35 บาท/ก้อน | พาเลท 32 บาท\nน้ำหนักเบา กันความร้อนดี ตัดง่าย\nเหมาะสำหรับ: ผนังบ้าน ห้องน้ำ" },
      { category: "product", title: "อิฐบล็อก คอนกรีต", content: "อิฐบล็อกคอนกรีต (ก้อนใหญ่)\nขนาด: 12x19x39 cm / 9x19x39 cm\nราคา 12cm: 12 บาท/ก้อน | 1,000 ก้อน 10 บาท\nราคา 9cm: 9 บาท/ก้อน | 1,000 ก้อน 7.50 บาท\nแข็งแรง ทนทาน รับน้ำหนักได้ดี" },
      // สินค้า — กระเบื้อง
      { category: "product", title: "กระเบื้องปูพื้น 60x60", content: "กระเบื้องปูพื้น พอร์ซเลน 60x60 cm\nผิว: เคลือบมัน / ด้าน / หินอ่อน / ไม้\nราคา: 290-590 บาท/ตร.ม. (ขึ้นกับลาย)\nจำนวน: 2.78 แผ่น/ตร.ม.\nมาตรฐาน: มอก.2398-2556\nมีมากกว่า 50 ลายให้เลือก" },
      { category: "product", title: "กระเบื้องหลังคา SCG", content: "กระเบื้องหลังคา SCG รุ่น ลอนคู่\nขนาด: 50x120 cm / 50x150 cm\nราคา: 65-95 บาท/แผ่น (ขึ้นกับรุ่น)\nสี: เทา แดง น้ำตาล เขียว\nรับประกัน: 30 ปี ไม่แตกร้าว\nทนแดด ทนฝน กันความร้อน" },
      // สินค้า — สี
      { category: "product", title: "สีทาบ้าน TOA", content: "สีทาบ้าน TOA 4 Seasons\nขนาด: 1 กล. / 5 กล.\nราคา: 290 บาท/กล. | 5 กล. 1,290 บาท\nสี: มากกว่า 1,000 เฉดสี ผสมได้\nปริมาณใช้: 40 ตร.ม./กล. (2 เที่ยว)\nกันเชื้อรา กันน้ำ ทนแดด 8 ปี" },
      // สินค้า — ท่อ/ไฟ
      { category: "product", title: "ท่อ PVC ตราช้าง", content: "ท่อ PVC ตราช้าง ชั้น 8.5\nขนาด: 1\" 1.5\" 2\" 3\" 4\" 6\"\nความยาว: 4 เมตร/ท่อน\nราคา 4\": 280 บาท/ท่อน | 20 ท่อน 260 บาท\nเหมาะสำหรับ: ระบายน้ำ สุขาภิบาล\nมาตรฐาน: มอก.17-2561" },
      { category: "product", title: "สายไฟ THW", content: "สายไฟ THW ตรา Bangkok Cable\nขนาด: 1.5 / 2.5 / 4 / 6 / 10 sq.mm.\nราคา 2.5mm: 8.50 บาท/เมตร | ม้วน 100m 780 บาท\nราคา 4mm: 13 บาท/เมตร | ม้วน 100m 1,200 บาท\nมาตรฐาน: มอก.11-2553 ทนไฟ" },
      // โปรโมชั่น
      { category: "promotion", title: "โปรเดือนมีนาคม 2026", content: "🎉 โปรเดือนมีนา!\n- ปูนตราเสือ ซื้อ 100 ถุง ลด 5% + ส่งฟรี\n- เหล็กเส้น ซื้อ 50 เส้นขึ้นไป ลด 3%\n- กระเบื้อง SCG ซื้อ 500 แผ่น ลด 10%\n- ซื้อครบ 50,000 บาท ส่งฟรีทั่วประเทศ\nระยะเวลา: 1-31 มี.ค. 2026" },
      { category: "promotion", title: "โปรผู้รับเหมา", content: "🏗️ สิทธิพิเศษสำหรับผู้รับเหมา\n- เครดิต 30 วัน (ยอดสะสม 100,000+)\n- ส่วนลดพิเศษ 5-15% ตามยอดสั่ง\n- จัดส่งหน้างาน ฟรีในรัศมี 50 กม.\n- ที่ปรึกษาวัสดุ ฟรี\n- ใบกำกับภาษี/ใบเสร็จ ออกได้ทันที" },
      { category: "promotion", title: "โปรสร้างบ้าน Package", content: "🏠 Package วัสดุสร้างบ้าน\n- บ้านชั้นเดียว 100 ตร.ม. เริ่ม 180,000 บาท\n- บ้าน 2 ชั้น 200 ตร.ม. เริ่ม 350,000 บาท\n- รวม: ปูน เหล็ก อิฐ กระเบื้อง สี ท่อ สายไฟ\n- ส่งฟรี + ที่ปรึกษาช่าง\nสนใจ ส่งแบบบ้านมาประเมินราคาได้" },
      // นโยบาย
      { category: "policy", title: "นโยบายการจัดส่ง", content: "🚛 การจัดส่ง\n- สั่งก่อน 10:00 ส่งวันเดียวกัน (ในรัศมี 30 กม.)\n- สั่งหลัง 10:00 ส่งวันถัดไป\n- รถ 6 ล้อ: ค่าขนส่ง 500-2,000 บาท (ตามระยะทาง)\n- รถ 10 ล้อ: ค่าขนส่ง 1,500-5,000 บาท\n- ซื้อครบ 50,000 บาท ส่งฟรี (รัศมี 50 กม.)\n- ต่างจังหวัด: คิดตามน้ำหนัก+ระยะทาง" },
      { category: "policy", title: "นโยบายคืน/เปลี่ยนสินค้า", content: "🔄 คืน/เปลี่ยนสินค้า\n- เปลี่ยนได้ภายใน 7 วัน (สินค้าไม่เปิดใช้)\n- สินค้าชำรุดจากการขนส่ง เปลี่ยนฟรี\n- ตรวจสอบสินค้าก่อนรับ — ลงชื่อรับแล้วไม่รับคืน\n- ปูนเปียกน้ำ/หมดอายุ ไม่รับคืน\n- ติดต่อ LINE @smlconstruct ภายใน 24 ชม." },
      { category: "policy", title: "วิธีชำระเงิน", content: "💳 ช่องทางชำระเงิน\n- โอนผ่านธนาคาร (กสิกร/กรุงไทย/กรุงเทพ/ไทยพาณิชย์)\n- PromptPay: 0812345678\n- เงินสด ชำระหน้าร้าน\n- เช็ค (ลูกค้าเครดิต)\n- เครดิต 30 วัน (ผู้รับเหมาที่ผ่านการอนุมัติ)\n- วางบิล รอบ 15 / สิ้นเดือน" },
      // FAQ
      { category: "faq", title: "คำถามที่พบบ่อย — วัสดุก่อสร้าง", content: "❓ FAQ วัสดุก่อสร้าง\nQ: ปูนหมดอายุมั้ย?\nA: ปูนมีอายุ 3 เดือนจากวันผลิต เก็บในที่แห้ง\n\nQ: เหล็กเส้นยาวเท่าไหร่?\nA: มาตรฐาน 10 เมตร/เส้น ตัดได้ตามต้องการ\n\nQ: อิฐมวลเบากับอิฐบล็อก ต่างกันยังไง?\nA: อิฐมวลเบาเบากว่า กันร้อนดี แต่แพงกว่า อิฐบล็อกแข็งแรง ราคาถูก\n\nQ: สีทาบ้าน 1 กล. ทาได้กี่ตร.ม.?\nA: ประมาณ 35-40 ตร.ม. ต่อเที่ยว (แนะนำ 2 เที่ยว)" },
      { category: "faq", title: "คำถามที่พบบ่อย — จัดส่ง", content: "❓ FAQ จัดส่ง\nQ: ส่งรถอะไร?\nA: รถ 6 ล้อ (3 ตัน) หรือ 10 ล้อ (15 ตัน) ตามปริมาณ\n\nQ: ส่งวันอาทิตย์ได้มั้ย?\nA: ได้ครับ จ่ายค่าล่วงเวลา +500 บาท\n\nQ: มีเครนยกมั้ย?\nA: รถ 10 ล้อ มีเครนยก เหมาะกับเหล็ก/ปูนจำนวนมาก\n\nQ: ส่งต่างจังหวัดได้มั้ย?\nA: ได้ครับ ส่งทั่วประเทศ คิดค่าขนส่งตามระยะทาง" },
      { category: "faq", title: "คำถามที่พบบ่อย — ร้าน", content: "❓ FAQ ร้าน\nQ: ร้านอยู่ที่ไหน?\nA: 123 ถ.พหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง ปทุมธานี เปิด จ-ส 7:00-17:00\n\nQ: เป็นตัวแทนจำหน่ายได้มั้ย?\nA: ได้ครับ ซื้อเริ่มต้น 50,000 บาท ราคา dealer\n\nQ: มีช่างแนะนำมั้ย?\nA: มีครับ ช่างพันธมิตรหลายทีม แนะนำฟรี\n\nQ: รับวางบิลมั้ย?\nA: รับครับ วางบิล 30 วัน สำหรับลูกค้าที่ผ่านอนุมัติเครดิต" },
    ];

    const kbDocs = kbArticles.map(a => ({
      ...a,
      status: "active",
      createdAt: randomDate(30),
      updatedAt: new Date(),
    }));
    if (kbDocs.length > 0) {
      await db.collection("kb_articles").insertMany(kbDocs);
    }

    // ─── 9b. Insert into knowledge_base (Agent ใช้ collection นี้) — 20 รายการ ร้านวัสดุก่อสร้าง ───
    const kbForAgent = [
      { title: "ปูนซีเมนต์ ตราเสือ ประเภท 1", content: "ปูนซีเมนต์ปอร์ตแลนด์ ตราเสือ ประเภท 1\nน้ำหนัก 50 กก./ถุง\nราคา: 135 บาท/ถุง | 100 ถุง 128 บาท/ถุง | 500 ถุง 122 บาท/ถุง\nเหมาะสำหรับ: งานโครงสร้าง เสา คาน พื้น ฐานราก\nมาตรฐาน: มอก.15-2555\nอายุ: 3 เดือนจากวันผลิต เก็บในที่แห้ง ห้ามโดนน้ำ", category: "product", tags: ["ปูน", "ตราเสือ", "โครงสร้าง"] },
      { title: "ปูนซีเมนต์ผสม ตราช้าง (เขียว)", content: "ปูนซีเมนต์ผสม ตราช้าง (ถุงเขียว)\nน้ำหนัก 50 กก./ถุง\nราคา: 125 บาท/ถุง | 100 ถุง 118 บาท/ถุง\nเหมาะสำหรับ: งานก่อ ฉาบ ปูกระเบื้อง เทพื้น\nมาตรฐาน: มอก.80-2550\nข้อแตกต่าง: ผสมทรายแล้ว ใช้งานง่ายกว่าปูนประเภท 1", category: "product", tags: ["ปูน", "ตราช้าง", "ฉาบ"] },
      { title: "เหล็กเส้น ข้ออ้อย SD40", content: "เหล็กข้ออ้อย มาตรฐาน SD40 (กำลังรับแรง 4,000 กก./ตร.ซม.)\nขนาด: 10mm 12mm 16mm 20mm 25mm\nความยาว: 10 เมตร/เส้น\n\nราคา:\n• 10mm: 120 บาท/เส้น | 100 เส้น 112 บาท\n• 12mm: 185 บาท/เส้น | 100 เส้น 175 บาท\n• 16mm: 320 บาท/เส้น | 100 เส้น 305 บาท\n• 20mm: 500 บาท/เส้น | 100 เส้น 480 บาท\n• 25mm: 780 บาท/เส้น | 100 เส้น 750 บาท\nมาตรฐาน: มอก.24-2559", category: "product", tags: ["เหล็ก", "ข้ออ้อย", "SD40"] },
      { title: "อิฐมวลเบา Q-CON", content: "อิฐมวลเบา Q-CON (SCG)\nขนาด: 20x60 cm\nหนา: 7.5 / 10 / 12.5 cm\n\nราคา:\n• 7.5cm: 28 บาท/ก้อน | พาเลท (200 ก้อน) 25 บาท\n• 10cm: 35 บาท/ก้อน | พาเลท 32 บาท\n• 12.5cm: 42 บาท/ก้อน | พาเลท 38 บาท\n\nข้อดี: น้ำหนักเบา กันร้อนดี ตัดง่าย ติดตั้งเร็ว\nเหมาะ: ผนังบ้าน ห้องน้ำ ผนังชั้นบน", category: "product", tags: ["อิฐ", "Q-CON", "มวลเบา"] },
      { title: "กระเบื้องปูพื้น พอร์ซเลน 60x60", content: "กระเบื้องปูพื้น พอร์ซเลน 60x60 cm\nผิว: เคลือบมัน / ด้าน / ลายหินอ่อน / ลายไม้\n\nราคา:\n• ลายมาตรฐาน: 290 บาท/ตร.ม.\n• ลายหินอ่อน: 390 บาท/ตร.ม.\n• ลายไม้พรีเมียม: 490 บาท/ตร.ม.\n\nจำนวน: 2.78 แผ่น/ตร.ม.\nมาตรฐาน: มอก.2398-2556\nมากกว่า 50 ลายให้เลือก สั่งดูตัวอย่างก่อนได้", category: "product", tags: ["กระเบื้อง", "ปูพื้น", "พอร์ซเลน"] },
      { title: "สีทาบ้าน TOA 4 Seasons", content: "สีทาบ้าน TOA 4 Seasons\nขนาด: 1 แกลลอน / 5 แกลลอน\n\nราคา:\n• 1 กล.: 290 บาท\n• 5 กล.: 1,290 บาท (ประหยัด 160)\n\nสี: มากกว่า 1,000 เฉดสี ผสมได้ที่ร้าน\nปริมาณใช้: 40 ตร.ม./กล. (2 เที่ยว)\nคุณสมบัติ: กันเชื้อรา กันน้ำ ทนแดด 8 ปี\nมีทั้ง: สีภายนอก สีภายใน สีรองพื้น สีกันสนิม", category: "product", tags: ["สี", "TOA", "ทาบ้าน"] },
      { title: "ท่อ PVC ตราช้าง ชั้น 8.5", content: "ท่อ PVC ตราช้าง ชั้นคุณภาพ 8.5\nความยาว: 4 เมตร/ท่อน\n\nราคา:\n• 1 นิ้ว: 85 บาท/ท่อน\n• 1.5 นิ้ว: 120 บาท/ท่อน\n• 2 นิ้ว: 160 บาท/ท่อน\n• 3 นิ้ว: 220 บาท/ท่อน\n• 4 นิ้ว: 280 บาท/ท่อน | 20 ท่อน 260 บาท\n• 6 นิ้ว: 520 บาท/ท่อน\n\nเหมาะ: ระบายน้ำ สุขาภิบาล\nมาตรฐาน: มอก.17-2561", category: "product", tags: ["ท่อ", "PVC", "ตราช้าง"] },
      { title: "สายไฟ THW Bangkok Cable", content: "สายไฟ THW ตรา Bangkok Cable\nมาตรฐาน: มอก.11-2553\n\nราคา:\n• 1.5 sq.mm: 5.50 บาท/ม. | ม้วน 100m 490 บาท\n• 2.5 sq.mm: 8.50 บาท/ม. | ม้วน 100m 780 บาท\n• 4 sq.mm: 13 บาท/ม. | ม้วน 100m 1,200 บาท\n• 6 sq.mm: 19 บาท/ม. | ม้วน 100m 1,750 บาท\n• 10 sq.mm: 32 บาท/ม. | ม้วน 100m 2,950 บาท\n\nสี: แดง ดำ เหลือง น้ำเงิน เขียว", category: "product", tags: ["สายไฟ", "THW", "ไฟฟ้า"] },
      { title: "กระเบื้องหลังคา SCG ลอนคู่", content: "กระเบื้องหลังคา SCG รุ่นลอนคู่\nขนาด: 50x120 cm / 50x150 cm\n\nราคา:\n• ลอนคู่ 120cm: 65 บาท/แผ่น\n• ลอนคู่ 150cm: 80 บาท/แผ่น\n• ครอบหลังคา: 120-180 บาท/ชิ้น\n\nสี: เทา แดง น้ำตาล เขียว\nรับประกัน: 30 ปีไม่แตกร้าว\nทนแดด ทนฝน กันความร้อนดี", category: "product", tags: ["กระเบื้อง", "หลังคา", "SCG"] },
      { title: "ทราย หิน คอนกรีต", content: "วัสดุมวลรวม:\n\n• ทรายหยาบ: 350 บาท/คิว (เหมาะเทพื้น ผสมปูน)\n• ทรายละเอียด: 400 บาท/คิว (เหมาะฉาบ)\n• หิน 3/4: 450 บาท/คิว (เหมาะผสมคอนกรีต)\n• หินคลุก: 250 บาท/คิว (ถมพื้น)\n• ดินถม: 200 บาท/คิว\n\nสั่งขั้นต่ำ 3 คิว ราคารวมค่าขนส่งในรัศมี 20 กม.\nคอนกรีตผสมเสร็จ: 2,200 บาท/คิว (สั่งขั้นต่ำ 3 คิว)", category: "product", tags: ["ทราย", "หิน", "คอนกรีต"] },
      { title: "โปรโมชั่นเดือนนี้", content: "🎉 โปรเดือนนี้!\n\n• ปูนตราเสือ 100 ถุงขึ้นไป ลด 5% + ส่งฟรี\n• เหล็กเส้น 50 เส้นขึ้นไป ลด 3%\n• กระเบื้อง SCG 500 แผ่น ลด 10%\n• สี TOA ซื้อ 5 กล. แถม ลูกกลิ้ง+ถาดสี\n• ซื้อครบ 50,000 บาท ส่งฟรีทั่วประเทศ\n• ซื้อครบ 100,000 บาท ลดเพิ่ม 2% + ส่งฟรี\n\nระยะเวลา: ตลอดเดือนนี้", category: "promotion", tags: ["โปร", "ส่วนลด"] },
      { title: "โปรผู้รับเหมา / ตัวแทนจำหน่าย", content: "🏗️ สิทธิพิเศษสำหรับผู้รับเหมา:\n\n• เครดิต 30 วัน (ยอดสะสม 100,000+)\n• ส่วนลดพิเศษ 5-15% ตามยอดสั่ง\n• จัดส่งหน้างาน ฟรีในรัศมี 50 กม.\n• ที่ปรึกษาวัสดุ ฟรี\n• ใบกำกับภาษี/ใบเสร็จ ออกได้ทันที\n• โทรสั่งด่วนได้ตลอด 081-234-5678\n\nสนใจเป็นตัวแทน: ซื้อเริ่มต้น 50,000 ราคา dealer", category: "promotion", tags: ["ผู้รับเหมา", "ตัวแทน", "เครดิต"] },
      { title: "Package สร้างบ้าน", content: "🏠 Package วัสดุสร้างบ้าน:\n\n• บ้านชั้นเดียว 100 ตร.ม. เริ่ม 180,000 บาท\n• บ้าน 2 ชั้น 200 ตร.ม. เริ่ม 350,000 บาท\n• ต่อเติมห้อง 20 ตร.ม. เริ่ม 45,000 บาท\n\nรวม: ปูน เหล็ก อิฐ กระเบื้อง สี ท่อ สายไฟ\nส่งฟรี + ที่ปรึกษาช่าง\n\nวิธีสั่ง: ส่งแบบบ้าน/แปลน มาประเมินราคา", category: "promotion", tags: ["สร้างบ้าน", "package"] },
      { title: "นโยบายจัดส่ง", content: "🚛 การจัดส่ง:\n\n• สั่งก่อน 10:00 ส่งวันเดียวกัน (รัศมี 30 กม.)\n• สั่งหลัง 10:00 ส่งวันถัดไป\n• รถ 6 ล้อ (3 ตัน): 500-2,000 บาท ตามระยะทาง\n• รถ 10 ล้อ (15 ตัน): 1,500-5,000 บาท\n• รถเครน: +1,500 บาท (เหล็ก/ปูนจำนวนมาก)\n• ซื้อครบ 50,000 บาท ส่งฟรี (รัศมี 50 กม.)\n• ต่างจังหวัด: คิดตามน้ำหนัก+ระยะทาง\n• วันอาทิตย์: +500 บาทค่าล่วงเวลา", category: "policy", tags: ["ส่ง", "ขนส่ง", "จัดส่ง"] },
      { title: "นโยบายคืน/เปลี่ยนสินค้า", content: "🔄 คืน/เปลี่ยนสินค้า:\n\n• เปลี่ยนได้ภายใน 7 วัน (สินค้าไม่เปิดใช้)\n• สินค้าชำรุดจากขนส่ง เปลี่ยนฟรีทันที\n• ตรวจสอบก่อนรับ ลงชื่อรับแล้วไม่รับคืน\n• ปูนเปียกน้ำ/หมดอายุ ไม่รับคืน\n• เหล็กตัดแล้ว ไม่รับคืน\n• ติดต่อ LINE @smlconstruct ภายใน 24 ชม.\n\nเคลม: ส่งรูปสินค้าเสียหาย + ใบส่งของ เราดำเนินการภายใน 1 วัน", category: "policy", tags: ["คืน", "เปลี่ยน", "เคลม"] },
      { title: "วิธีชำระเงิน", content: "💳 ช่องทางชำระเงิน:\n\n• โอนธนาคาร: กสิกร / กรุงไทย / กรุงเทพ / ไทยพาณิชย์\n• PromptPay: 0812345678\n• เงินสด: ชำระหน้าร้าน\n• เช็ค: ลูกค้าเครดิตเท่านั้น\n• เครดิต 30 วัน: ผู้รับเหมาที่ผ่านอนุมัติ\n• วางบิลรอบ 15 / สิ้นเดือน\n\nหลังโอน: ส่งสลิปมาทาง LINE จัดส่งทันที", category: "policy", tags: ["ชำระเงิน", "โอน", "เครดิต"] },
      { title: "คำถามเรื่องปูน", content: "❓ FAQ ปูน:\n\nQ: ปูนตราเสือกับตราช้างต่างกันยังไง?\nA: ตราเสือ = ปูนประเภท 1 เหมาะงานโครงสร้าง (เสา คาน) ตราช้าง = ปูนผสม เหมาะงานก่อ ฉาบ\n\nQ: ปูนหมดอายุมั้ย?\nA: อายุ 3 เดือนจากวันผลิต เก็บที่แห้ง ห้ามโดนน้ำ\n\nQ: 1 คิว ใช้ปูนกี่ถุง?\nA: คอนกรีตผสมเอง 1 คิว ใช้ปูนประมาณ 7-8 ถุง\n\nQ: ปูนสำเร็จรูปกับปูนถุงต่างกันยังไง?\nA: สำเร็จรูปผสมน้ำใช้ได้เลย ปูนถุงต้องผสมทรายเอง", category: "faq", tags: ["ปูน", "FAQ"] },
      { title: "คำถามเรื่องเหล็ก", content: "❓ FAQ เหล็ก:\n\nQ: เหล็ก SD40 กับ SR24 ต่างกันยังไง?\nA: SD40 = ข้ออ้อย กำลังสูง ใช้งานโครงสร้าง SR24 = เหล็กกลม กำลังต่ำกว่า ใช้งานรัดปลอก\n\nQ: เหล็ก 1 ตัน ได้กี่เส้น?\nA: 12mm ≈ 90 เส้น | 16mm ≈ 50 เส้น | 20mm ≈ 32 เส้น\n\nQ: เหล็กสนิมใช้ได้มั้ย?\nA: สนิมผิวเล็กน้อยใช้ได้ (คอนกรีตหุ้ม) แต่ถ้าเป็นร่อง/ผุ ไม่ควรใช้\n\nQ: สั่งตัดเหล็กได้มั้ย?\nA: ได้ครับ คิดค่าตัด 2 บาท/เส้น แจ้งขนาดล่วงหน้า 1 วัน", category: "faq", tags: ["เหล็ก", "FAQ"] },
      { title: "คำถามเรื่องจัดส่ง", content: "❓ FAQ จัดส่ง:\n\nQ: ส่งรถอะไร?\nA: รถ 6 ล้อ (3 ตัน) หรือ 10 ล้อ (15 ตัน) ตามปริมาณ\n\nQ: ส่งวันอาทิตย์ได้มั้ย?\nA: ได้ จ่ายค่าล่วงเวลา +500 บาท\n\nQ: ส่งต่างจังหวัดได้มั้ย?\nA: ได้ ส่งทั่วประเทศ คิดค่าขนส่งตามระยะทาง+น้ำหนัก\n\nQ: มีเครนยกมั้ย?\nA: รถ 10 ล้อ มีเครนยก +1,500 บาท\n\nQ: สั่งด่วนได้มั้ย?\nA: ได้ สั่งก่อน 10:00 ส่งบ่ายวันเดียวกัน ค่าด่วน +200", category: "faq", tags: ["จัดส่ง", "ขนส่ง", "FAQ"] },
      { title: "ข้อมูลร้าน", content: "🏪 ข้อมูลร้าน:\n\nชื่อ: ร้านวัสดุก่อสร้าง SML\nที่อยู่: 123 ถ.พหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง ปทุมธานี 12120\nเปิด: จ-ส 7:00-17:00 (หยุดวันอาทิตย์)\nโทร: 081-234-5678\nLINE: @smlconstruct\nFacebook: SML วัสดุก่อสร้าง\nInstagram: @sml_construct\n\nบริการ: ขายปลีก-ส่ง วัสดุก่อสร้างทุกชนิด\nจัดส่งทั่วประเทศ ผ่อน 0% สำหรับลูกค้าเครดิต\nมีช่างพันธมิตร แนะนำฟรี", category: "faq", tags: ["ร้าน", "ติดต่อ", "ที่อยู่"] },
    ].map(kb => ({
      ...kb,
      active: true,
      createdAt: randomDate(30),
      updatedAt: new Date(),
    }));

    if (kbForAgent.length > 0) {
      await db.collection("knowledge_base").insertMany(kbForAgent);
    }

    // ─── 10. Generate AI Advice (type ต้องตรงกับ advice page tabs) ───
    const adviceDocs = [
      // problem-analysis
      { type: "problem-analysis", priority: "critical", title: "ผู้รับเหมา 12 รายไม่ทักมาเกิน 7 วัน", detail: "พบผู้รับเหมา 12 รายที่ไม่มี activity เกิน 7 วัน ส่วนใหญ่อยู่ stage 'quoting'\nยอดสั่งเฉลี่ย 80,000 บาท/ราย", action: "โทรติดตามใบเสนอราคา + เสนอโปรส่งฟรี", sourceIds: [] },
      { type: "problem-analysis", priority: "warning", title: "SML-ธนากร ตอบแชทช้าเฉลี่ย 45 นาที", detail: "พนักงาน SML-ธนากร ตอบแชทเฉลี่ย 45 นาที (มาตรฐาน 15 นาที)\nห้องที่ช้าที่สุด: ผู้รับเหมา VIP 3 ราย", action: "ตรวจสอบ workload หรือเพิ่มคนช่วยขาย", sourceIds: [] },
      { type: "problem-analysis", priority: "warning", title: "ลูกค้า 3 รายร้องเรียนเรื่องส่งช้า/ของแตก", detail: "มีลูกค้า 3 รายร้องเรียน ปูนส่งช้า และ เหล็กไม่ครบ\nSentiment ลดลง green → red", action: "ติดต่อทันที + ตรวจสอบกับทีมขนส่ง + ชดเชย", sourceIds: [] },
      { type: "problem-analysis", priority: "warning", title: "สต็อกปูนตราเสือเหลือน้อย", detail: "สต็อกปูนตราเสือเหลือ 200 ถุง (ปกติขาย 150 ถุง/สัปดาห์) คาดว่าหมดใน 9 วัน", action: "สั่งเพิ่มจากโรงงานทันที อย่างน้อย 500 ถุง", sourceIds: [] },
      // sales-opportunity
      { type: "sales-opportunity", priority: "opportunity", title: "ผู้รับเหมา 8 รายสนใจซื้อล็อตใหญ่!", detail: "AI วิเคราะห์ผู้รับเหมา 8 รายที่มีโอกาสซื้อสูง (score 70+)\nส่วนใหญ่ถามราคาปูน+เหล็ก ยอดรวมประมาณ 500,000 บาท", action: "ส่งใบเสนอราคา + โปรผู้รับเหมา ปิดการขาย", sourceIds: [] },
      { type: "sales-opportunity", priority: "opportunity", title: "กลุ่มสั่งปูนรวม ยอดเพิ่ม 40%", detail: "กลุ่มผู้รับเหมาสั่งรวม มียอดเพิ่ม 40% จากเดือนก่อน\nสินค้ายอดนิยม: ปูนตราเสือ + เหล็กข้ออ้อย 12mm", action: "เตรียมสต็อก + เสนอเครดิต 30 วัน", sourceIds: [] },
      { type: "sales-opportunity", priority: "info", title: "ลูกค้า Facebook เพิ่มขึ้น 60%", detail: "ลูกค้าจาก Facebook เพิ่มขึ้น 60% สัปดาห์นี้ ส่วนใหญ่มาจากโพสต์โปรปูนราคาพิเศษ", action: "ทำโพสต์โปรเพิ่ม + Boost Post งบ 500 บาท", sourceIds: [] },
      // team-coaching
      { type: "team-coaching", priority: "info", title: "SML-วิภา ตอบเร็วที่สุดในทีม", detail: "SML-วิภา ตอบเฉลี่ย 3 นาที ลูกค้าให้ sentiment 90+\nเป็นตัวอย่างที่ดีสำหรับทีม", action: "ชมเชย + ให้เป็น mentor พนักงานใหม่", sourceIds: [] },
      { type: "team-coaching", priority: "warning", title: "SML-พิมพ์ ปิดการขายน้อยกว่าเพื่อน 50%", detail: "SML-พิมพ์ conversion rate 12% (ทีมเฉลี่ย 25%)\nส่วนใหญ่ลูกค้าค้างที่ stage quoting", action: "อบรมเทคนิคปิดการขาย + ให้ SML-วิภา สอน", sourceIds: [] },
      // weekly-strategy
      { type: "weekly-strategy", priority: "info", title: "สรุปสัปดาห์ที่ผ่านมา", detail: "ข้อความ 1,200+ / ลูกค้าใหม่ 15 / ปิดขาย 8 / ยอดรวม 450,000 บาท\nเทียบสัปดาห์ก่อน: ข้อความ +10% ลูกค้า +20% ยอด +15%", action: "สัปดาห์หน้า: เน้น follow up ลูกค้า quoting 20 ราย", sourceIds: [] },
      { type: "weekly-strategy", priority: "opportunity", title: "โอกาส: เดือนหน้าเป็นฤดูก่อสร้าง", detail: "สถิติปีก่อน เดือนหน้ายอดขายเพิ่ม 30% เป็นฤดูก่อสร้าง\nลูกค้าจะต้องการปูน+เหล็กมากขึ้น", action: "สต็อกปูน/เหล็กเพิ่ม 50% + เตรียมรถส่งเพิ่ม + โปรฤดูก่อสร้าง", sourceIds: [] },
      // health-monitor
      { type: "health-monitor", priority: "info", title: "สุขภาพธุรกิจ: ปกติ", detail: "อัตราปิดขาย 25% (เป้า 20%) ✅\nเวลาตอบเฉลี่ย 8 นาที (เป้า 15) ✅\nSentiment เฉลี่ย 72% (เป้า 60%) ✅\nลูกค้าหลุด 5% (เป้า <10%) ✅", action: "รักษาคุณภาพ ทีมทำได้ดีมาก", sourceIds: [] },
      { type: "health-monitor", priority: "critical", title: "⚠️ ลูกค้า VIP 5 รายหายไป 14+ วัน", detail: "ผู้รับเหมา VIP (ยอดสะสม 100,000+) จำนวน 5 รายไม่สั่ง 14+ วัน\nเคยสั่งประจำทุก 2 สัปดาห์ หายไปพร้อมกัน", action: "โทรหาเป็นการส่วนตัว ทันที + เสนอส่วนลด VIP 10%", sourceIds: [] },
    ];

    const adviceInsert = adviceDocs.map(a => ({
      ...a,
      status: "active",
      createdAt: randomDate(7),
      updatedAt: new Date(),
    }));
    if (adviceInsert.length > 0) {
      await db.collection("ai_advice").insertMany(adviceInsert);
    }

    // ─── 11. Generate Payments (จากข้อความที่มี keyword การชำระเงิน) ───
    const paymentKeywords = /โอนแล้ว|ส่งสลิป|จ่ายแล้ว|ชำระแล้ว|โอนเงิน/;
    const paymentMsgs = allMessages.filter(m =>
      m.role === "user" && !(m.userName || "").startsWith("SML") && paymentKeywords.test(m.content || "")
    );
    const paymentAmounts = [1350, 2700, 3500, 5000, 6750, 8500, 12000, 15000, 25000, 35000, 45000, 67500, 95000, 135000];
    const paymentDocs = paymentMsgs.slice(0, 60).map(m => ({
      messageId: null,
      sourceId: m.sourceId,
      platform: m.platform,
      customerName: m.userName,
      amount: rand(paymentAmounts),
      detectionMethod: Math.random() > 0.4 ? "keyword+image" : "keyword",
      keywords: [paymentKeywords.exec(m.content)?.[0] || "โอนแล้ว"],
      slipImageUrl: Math.random() > 0.3 ? `https://picsum.photos/seed/${randInt(1, 9999)}/400/600` : null,
      status: rand(["pending", "pending", "pending", "confirmed", "confirmed", "confirmed", "confirmed", "rejected"]) as string,
      confirmedBy: Math.random() > 0.4 ? rand(STAFF_NAMES).replace("SML-", "") : null,
      confirmedAt: Math.random() > 0.4 ? randomDate(7) : null,
      rejectedBy: null,
      rejectedAt: null,
      rejectedReason: null,
      notes: rand(["", "", "", "ตรวจสลิปแล้ว", "ยอดตรง", "รอเช็คยอด"]),
      createdAt: m.createdAt,
      updatedAt: new Date(),
    }));
    if (paymentDocs.length > 0) {
      await db.collection("payments").insertMany(paymentDocs);
    }

    // ─── 12. Generate Appointments ───
    const APT_TYPES = ["site_visit", "consultation", "delivery", "installation", "meeting", "follow_up"];
    const APT_TITLES = [
      "นัดดูหน้างาน ต่อเติมบ้าน", "ส่งปูน 200 ถุง หน้างาน", "นัดวัดพื้นที่ปูกระเบื้อง",
      "ติดตั้งประตู-หน้าต่าง", "ประชุมผู้รับเหมา", "ติดตามงานก่อสร้าง",
      "ส่งเหล็ก 100 เส้น", "นัดดูหน้างานท่อประปา", "ให้คำปรึกษาเรื่องวัสดุ",
      "ส่งกระเบื้องหลังคา", "นัดเก็บเงิน", "ส่งสีทาบ้าน + ทินเนอร์",
      "นัดตรวจงาน QC", "ติดตั้งระบบไฟฟ้า", "ส่งทราย + หินคลุก 10 คิว",
      "นัดวัดพื้นที่สร้างรั้ว", "เยี่ยมไซต์ก่อสร้าง Phase 2", "ส่งอิฐมวลเบา Q-CON",
      "นัดช่างซ่อมท่อรั่ว", "ประชุมวางแผนโปรเจกต์ใหม่",
    ];
    const APT_LOCATIONS = [
      "หมู่บ้านพฤกษา ปทุมธานี", "ซอยลาดพร้าว 71", "อ.เมือง นครปฐม",
      "ตลาดไท รังสิต", "หมู่บ้านเดอะแกรนด์ บางนา", "ถ.พหลโยธิน กม.42",
      "นิคมอุตสาหกรรม บางปู", "ถ.เพชรเกษม 69", "อ.บางพลี สมุทรปราการ",
      "หน้าร้าน สาขาใหญ่",
    ];
    const appointmentDocs: any[] = [];
    const now = new Date();
    for (let i = 0; i < 50; i++) {
      const daysOffset = randInt(-7, 14);
      const date = new Date(now.getTime() + daysOffset * 86400000);
      const startHour = randInt(8, 16);
      const duration = rand([30, 60, 60, 90, 120]);
      const endHour = startHour + Math.floor(duration / 60);
      const endMin = duration % 60;
      const staff = rand(STAFF_NAMES);

      appointmentDocs.push({
        title: rand(APT_TITLES),
        description: "",
        customerId: null,
        customerName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
        phone: `08${randInt(0, 9)}${randInt(1000000, 9999999)}`,
        email: "",
        staffName: staff.replace("SML-", ""),
        staffNames: [staff.replace("SML-", "")],
        date,
        startTime: `${String(startHour).padStart(2, "0")}:00`,
        endTime: `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`,
        duration,
        type: rand(APT_TYPES),
        location: rand(APT_LOCATIONS),
        status: daysOffset < -2 ? rand(["completed", "completed", "cancelled", "no_show"])
          : daysOffset < 0 ? rand(["completed", "in_progress", "no_show"])
          : daysOffset === 0 ? rand(["confirmed", "in_progress", "scheduled"])
          : rand(["scheduled", "scheduled", "confirmed"]),
        priority: rand(["high", "medium", "medium", "low"]),
        notes: rand(["", "", "", "ลูกค้าขอเลื่อนเวลา", "เตรียมใบเสนอราคาด้วย", "ต้องใช้รถ 6 ล้อ", "ช่าง 2 คน"]),
        reminder: Math.random() > 0.3,
        reminderMinutes: rand([30, 60, 60, 120, 1440]),
        sourceId: null,
        platform: null,
        recurring: { type: "none" },
        createdBy: staff.replace("SML-", ""),
        createdAt: randomDate(14),
        updatedAt: new Date(),
      });
    }
    if (appointmentDocs.length > 0) {
      await db.collection("appointments").insertMany(appointmentDocs);
    }

    // ─── 13. Generate Documents (AI-classified images) ───
    const DOC_CATEGORIES = [
      // accounting
      { cat: "payment_slip", group: "accounting", hasAmount: true },
      { cat: "purchase_order", group: "accounting", hasAmount: true },
      { cat: "quotation", group: "accounting", hasAmount: true },
      { cat: "invoice", group: "accounting", hasAmount: true },
      { cat: "receipt", group: "accounting", hasAmount: true },
      { cat: "delivery_note", group: "accounting", hasAmount: false },
      // other_doc
      { cat: "id_card", group: "other_doc", hasAmount: false },
      { cat: "business_doc", group: "other_doc", hasAmount: false },
      { cat: "contract", group: "other_doc", hasAmount: true },
      { cat: "product_spec", group: "other_doc", hasAmount: false },
      // photo
      { cat: "product_photo", group: "photo", hasAmount: false },
      { cat: "site_photo", group: "photo", hasAmount: false },
      { cat: "damage_photo", group: "photo", hasAmount: false },
      { cat: "general", group: "photo", hasAmount: false },
    ];
    const docAmounts = [1350, 2700, 5000, 8500, 12000, 25000, 45000, 67500, 95000, 135000, 250000];
    const documentDocs: any[] = [];

    // สร้างเอกสารจากข้อความที่มีรูป + สุ่มเพิ่ม
    const imageMsgs = allMessages.filter(m => m.messageType === "image" && m.role === "user");
    for (let i = 0; i < 80; i++) {
      const msg = imageMsgs[i % imageMsgs.length] || rand(allMessages.filter(m => m.role === "user"));
      const catDef = rand(DOC_CATEGORIES);
      const aiConfidence = Math.random() * 0.4 + 0.6; // 0.6-1.0
      const isCorrect = Math.random() > 0.15; // 85% AI ถูก
      const actualCat = isCorrect ? catDef.cat : rand(DOC_CATEGORIES).cat;

      documentDocs.push({
        sourceId: msg.sourceId,
        platform: msg.platform,
        customerName: msg.userName || "",
        category: actualCat,
        categoryGroup: DOC_CATEGORIES.find(d => d.cat === actualCat)?.group || "photo",
        aiCategory: catDef.cat,
        aiCategoryGroup: catDef.group,
        aiConfidence,
        manualOverride: !isCorrect && Math.random() > 0.5,
        overrideBy: !isCorrect && Math.random() > 0.5 ? rand(STAFF_NAMES).replace("SML-", "") : null,
        overrideAt: !isCorrect ? randomDate(7) : null,
        amount: catDef.hasAmount ? rand(docAmounts) : null,
        imageUrl: `https://picsum.photos/seed/${randInt(1, 99999)}/400/${randInt(300, 600)}`,
        messageContent: msg.content?.substring(0, 100) || "",
        status: rand(["pending", "pending", "confirmed", "confirmed", "confirmed", "rejected"]) as string,
        confirmedBy: Math.random() > 0.4 ? rand(STAFF_NAMES).replace("SML-", "") : null,
        confirmedAt: Math.random() > 0.4 ? randomDate(7) : null,
        rejectedBy: null,
        rejectedAt: null,
        rejectedReason: null,
        notes: rand(["", "", "", "ตรวจแล้ว", "ยอดตรง", "สลิปชัดเจน", "รอเช็คกับบัญชี"]),
        createdAt: msg.createdAt || randomDate(14),
        updatedAt: new Date(),
      });
    }
    if (documentDocs.length > 0) {
      await db.collection("documents").insertMany(documentDocs);
    }

    // ─── 13. Generate Bot Configs (10 ห้อง ตั้งค่า Bot ต่างกัน) ───
    const botConfigs = [
      {
        sourceId: rooms[0]?.sourceId || "U0001",
        sourceType: "user",
        groupName: "ลูกค้า VIP — คุณสมชาย",
        botName: "น้องกุ้ง VIP",
        systemPrompt: "คุณคือผู้ช่วยร้านวัสดุก่อสร้าง ตอบสุภาพมาก ใช้ครับ/ค่ะทุกประโยค ลูกค้าคนนี้เป็น VIP ให้บริการพิเศษ เสนอส่วนลด 10% ได้ทันที",
        aiReplyMode: "auto",
        aiReplyKeywords: [],
      },
      {
        sourceId: rooms[1]?.sourceId || "U0002",
        sourceType: "user",
        groupName: "คุณประเสริฐ — ผู้รับเหมา",
        botName: "น้องกุ้ง",
        systemPrompt: "คุณคือผู้ช่วยร้านวัสดุก่อสร้าง ตอบเรื่องราคาปูน เหล็ก อิฐ กระเบื้อง สี ท่อ สายไฟ มีข้อมูลสต็อกและราคาทั้งหมด ตอบเร็ว กระชับ เป็นมืออาชีพ",
        aiReplyMode: "auto",
        aiReplyKeywords: [],
      },
      {
        sourceId: rooms[5]?.sourceId || "fb_0003",
        sourceType: "user",
        groupName: "คุณวิภา — Facebook",
        botName: "น้องกุ้ง FB",
        systemPrompt: "ตอบเฉพาะเรื่องสินค้าและราคา ถ้าถามเรื่องอื่นให้บอกว่า รอพนักงานตอบนะครับ ห้ามตอบเรื่องการเมือง ศาสนา",
        aiReplyMode: "keyword",
        aiReplyKeywords: ["ราคา", "เท่าไหร่", "สต็อก", "มีของ", "สั่ง"],
      },
      {
        sourceId: rooms[10]?.sourceId || "ig_0004",
        sourceType: "user",
        groupName: "คุณณัฐ — Instagram",
        botName: "น้องกุ้ง IG",
        systemPrompt: "ตอบสั้น กระชับ ใช้ emoji เยอะ เหมาะกับ Instagram ถ้าลูกค้าสนใจให้ส่งลิงก์ catalog",
        aiReplyMode: "mention",
        aiReplyKeywords: [],
      },
      {
        sourceId: rooms.find(r => r.isGroup)?.sourceId || "C0005",
        sourceType: "group",
        groupName: "กลุ่มผู้รับเหมา VIP",
        botName: "น้องกุ้ง กลุ่ม",
        systemPrompt: "ตอบเมื่อถูกเรียกชื่อเท่านั้น กลุ่มนี้เป็นผู้รับเหมารายใหญ่ ให้ราคาพิเศษ มีเครดิต 30 วัน",
        aiReplyMode: "mention",
        aiReplyKeywords: [],
      },
      {
        sourceId: rooms[15]?.sourceId || "U0006",
        sourceType: "user",
        groupName: "คุณกาญจนา — ลูกค้าใหม่",
        botName: "น้องกุ้ง",
        systemPrompt: "ลูกค้าใหม่ ต้องแนะนำร้าน บริการ โปรโมชั่น ให้ข้อมูลเต็มที่ ชวนสมัครสมาชิก",
        aiReplyMode: "auto",
        aiReplyKeywords: [],
      },
      {
        sourceId: rooms[20]?.sourceId || "fb_0007",
        sourceType: "user",
        groupName: "คุณเฉลิม — ต่อเติมบ้าน",
        botName: "ที่ปรึกษาก่อสร้าง",
        systemPrompt: "คุณคือที่ปรึกษาการก่อสร้าง ช่วยคำนวณวัสดุ แนะนำยี่ห้อ เปรียบเทียบคุณภาพ ให้คำปรึกษาเรื่องการต่อเติมบ้าน",
        aiReplyMode: "auto",
        aiReplyKeywords: [],
      },
      {
        sourceId: rooms[25]?.sourceId || "U0008",
        sourceType: "user",
        groupName: "คุณสุดา — ร้องเรียน",
        botName: "น้องกุ้ง",
        systemPrompt: "ลูกค้าเคยร้องเรียน ตอบด้วยความระวัง ขออภัยก่อนเสมอ ห้ามเถียง ถ้าเรื่องซับซ้อนให้ส่งต่อพนักงาน",
        aiReplyMode: "off",
        aiReplyKeywords: [],
      },
      {
        sourceId: rooms.filter(r => r.isGroup)[1]?.sourceId || "C0009",
        sourceType: "group",
        groupName: "กลุ่มสั่งปูนรวม",
        botName: "บอทราคาปูน",
        systemPrompt: "ตอบเฉพาะเรื่องราคาปูน จำนวนสต็อก โปรโมชั่นปูน ค่าขนส่ง กลุ่มนี้สั่งรวมเป็นประจำ",
        aiReplyMode: "keyword",
        aiReplyKeywords: ["ราคา", "ปูน", "สต็อก", "เท่าไหร่", "กี่ถุง", "โปร", "ส่ง"],
      },
      {
        sourceId: rooms[30]?.sourceId || "ig_0010",
        sourceType: "user",
        groupName: "คุณมาลี — Instagram DM",
        botName: "น้องกุ้ง",
        systemPrompt: "ตอบทุกข้อความ แต่ถ้าลูกค้าถามเรื่องราคาส่งหรือเครดิต ให้บอกว่าต้องคุยกับฝ่ายขายโดยตรง พร้อมส่งเบอร์โทร 081-234-5678",
        aiReplyMode: "auto",
        aiReplyKeywords: [],
      },
    ].map(c => ({
      ...c,
      aiAutoReply: c.aiReplyMode === "auto",
      model: "",
      createdAt: new Date(Date.now() - randInt(1, 14) * 86400000),
      updatedAt: new Date(),
    }));

    if (botConfigs.length > 0) {
      await db.collection("bot_config").insertMany(botConfigs);
    }

    // ─── 14. Generate Reply Templates (25 แม่แบบข้อความ) ───
    const replyTemplates = [
      // ทักทาย (greeting)
      { title: "ทักทายลูกค้าใหม่", content: "สวัสดีครับ ยินดีให้บริการครับ 🙏 สนใจวัสดุก่อสร้างตัวไหนบอกได้เลยนะครับ", category: "greeting", usageCount: randInt(10, 50) },
      { title: "ทักทายลูกค้าเก่า", content: "สวัสดีครับ กลับมาอีกแล้ว 😊 มีอะไรให้ช่วยครับ? สินค้าใหม่เข้าเยอะเลยครับ", category: "greeting", usageCount: randInt(5, 30) },
      { title: "ทักทาย VIP", content: "สวัสดีครับ ยินดีต้อนรับลูกค้า VIP ครับ 🌟 มีสิทธิพิเศษส่วนลด 10% ทุกรายการ วันนี้สนใจอะไรครับ?", category: "greeting", usageCount: randInt(3, 20) },
      { title: "ทักทาย IG/FB", content: "สวัสดีค่ะ ขอบคุณที่ทักมานะคะ 💕 สนใจสินค้าตัวไหนส่งรายละเอียดให้เลยค่ะ", category: "greeting", usageCount: randInt(5, 25) },
      { title: "ตอบนอกเวลา", content: "สวัสดีครับ ขณะนี้อยู่นอกเวลาทำการ (จ-ส 7:00-17:00) จะตอบกลับโดยเร็วที่สุดครับ 🙏", category: "greeting", usageCount: randInt(10, 40) },
      // ราคา (pricing)
      { title: "ราคาปูนตราเสือ", content: "ปูนซีเมนต์ตราเสือ ประเภท 1\n• 1-99 ถุง: 135 บาท/ถุง\n• 100+ ถุง: 128 บาท/ถุง\n• 500+ ถุง: 122 บาท/ถุง\nสนใจจำนวนเท่าไหร่ครับ?", category: "pricing", usageCount: randInt(20, 80) },
      { title: "ราคาเหล็ก", content: "เหล็กข้ออ้อย SD40:\n• 10mm: 120 บาท/เส้น\n• 12mm: 185 บาท/เส้น\n• 16mm: 320 บาท/เส้น\n• 20mm: 500 บาท/เส้น\nซื้อ 100 เส้น ลด 5% ครับ", category: "pricing", usageCount: randInt(15, 60) },
      { title: "ราคาอิฐ Q-CON", content: "อิฐมวลเบา Q-CON:\n• หนา 7.5cm: 28 บาท/ก้อน\n• หนา 10cm: 35 บาท/ก้อน\n• หนา 12.5cm: 42 บาท/ก้อน\nสั่งเป็นพาเลทลดเพิ่ม 10% ครับ", category: "pricing", usageCount: randInt(10, 40) },
      { title: "ค่าขนส่ง", content: "ค่าขนส่ง:\n• รัศมี 30 กม.: 500-1,000 บาท (รถ 6 ล้อ)\n• รัศมี 50 กม.: 1,000-2,000 บาท\n• ซื้อครบ 50,000 บาท ส่งฟรี! 🚛\nจัดส่งหน้างานได้เลยครับ", category: "pricing", usageCount: randInt(20, 70) },
      { title: "ส่งใบเสนอราคา", content: "ส่งใบเสนอราคาให้ทาง LINE เลยนะครับ 📄\nราคารวม VAT 7% แล้ว\nใบเสนอราคามีอายุ 15 วัน\nสนใจกดยืนยันได้เลยครับ", category: "pricing", usageCount: randInt(15, 45) },
      // ติดตาม (followup)
      { title: "ติดตามใบเสนอราคา", content: "สวัสดีครับ ไม่ทราบว่าใบเสนอราคาที่ส่งไป พอจะตัดสินใจได้หรือยังครับ? ถ้ามีข้อสงสัยยินดีตอบทุกคำถามครับ 🙏", category: "followup", usageCount: randInt(10, 50) },
      { title: "ติดตามหลังส่งของ", content: "สวัสดีครับ ของที่จัดส่งไป ได้รับเรียบร้อยมั้ยครับ? ตรวจสอบแล้วครบถ้วนมั้ยครับ? มีปัญหาบอกได้เลยนะครับ 😊", category: "followup", usageCount: randInt(10, 40) },
      { title: "ติดตามลูกค้าเงียบ", content: "สวัสดีครับ ไม่ได้ทักมาเลย สบายดีมั้ยครับ? 😊 มีวัสดุก่อสร้างอะไรต้องการ บอกได้ตลอดนะครับ ตอนนี้มีโปรดีๆ ด้วยครับ", category: "followup", usageCount: randInt(5, 30) },
      { title: "ติดตามสลิป", content: "สวัสดีครับ ขอรบกวนส่งสลิปโอนเงินมาด้วยนะครับ เพื่อจะได้จัดส่งสินค้าให้ครับ 🙏", category: "followup", usageCount: randInt(15, 55) },
      { title: "แจ้ง tracking", content: "สินค้าจัดส่งแล้วครับ 🚛\nเลขที่ใบส่งของ: ______\nคาดว่าถึงหน้างาน: วันพรุ่งนี้ช่วงเช้า\nรบกวนตรวจสอบก่อนรับด้วยนะครับ", category: "followup", usageCount: randInt(20, 60) },
      // ปิดการขาย (closing)
      { title: "ปิดการขาย — ยืนยัน", content: "ขอบคุณมากครับ ยืนยันออเดอร์เรียบร้อย 🎉\nจะจัดส่งภายในวันพรุ่งนี้เช้าครับ\nมีอะไรเพิ่มเติมบอกได้เลยนะครับ 🙏", category: "closing", usageCount: randInt(10, 40) },
      { title: "ปิดการขาย — ขอบคุณ", content: "ขอบคุณที่ไว้วางใจครับ 🙏❤️\nหวังว่าจะได้ให้บริการอีกนะครับ\nมีปัญหาหรือต้องการเพิ่ม ทักมาได้ตลอดครับ", category: "closing", usageCount: randInt(10, 35) },
      { title: "ปิด — เสนอส่วนลดสุดท้าย", content: "ตอนนี้เป็นราคาดีที่สุดแล้วครับ แต่ถ้าตัดสินใจวันนี้ ผมแถมค่าส่งฟรีให้เลยครับ! 🎁 สนใจมั้ยครับ?", category: "closing", usageCount: randInt(5, 25) },
      { title: "ปิด — ใกล้หมดสต็อก", content: "แจ้งให้ทราบครับ สินค้าตัวนี้เหลือไม่มากแล้ว ถ้าสนใจรีบตัดสินใจนะครับ ล็อตหน้าราคาอาจปรับขึ้นครับ 📈", category: "closing", usageCount: randInt(3, 20) },
      // กำหนดเอง (custom)
      { title: "ขออภัย — ส่งช้า", content: "ต้องขออภัยจริงๆ ครับ ที่ส่งช้ากว่ากำหนด 😞 จะเร่งจัดส่งให้ทันทีครับ ชดเชยค่าส่งครั้งหน้าให้ครับ", category: "custom", usageCount: randInt(5, 20) },
      { title: "ขออภัย — ของแตก/เสีย", content: "ขออภัยจริงๆ ครับ 😔 จะจัดส่งทดแทนให้ภายในวันนี้โดยไม่คิดค่าใช้จ่ายเพิ่มครับ รบกวนส่งรูปสินค้าที่เสียหายมาด้วยนะครับ", category: "custom", usageCount: randInt(3, 15) },
      { title: "แนะนำวัสดุ", content: "สำหรับงานนี้ แนะนำใช้:\n• ปูนตราเสือ ประเภท 1 (งานโครงสร้าง)\n• เหล็กข้ออ้อย SD40\n• อิฐมวลเบา Q-CON (ผนัง)\nต้องการคำนวณปริมาณ ส่งแบบมาได้เลยครับ", category: "custom", usageCount: randInt(5, 25) },
      { title: "เชิญเป็นตัวแทน", content: "สนใจเป็นตัวแทนจำหน่ายมั้ยครับ? 🤝\nเงื่อนไข: ซื้อเริ่มต้น 50,000 บาท\nได้ราคา dealer + เครดิต 30 วัน\nสนใจนัดคุยรายละเอียดได้ครับ", category: "custom", usageCount: randInt(2, 10) },
      { title: "ปิดร้านวันหยุด", content: "แจ้งวันหยุด: ร้านปิดวันที่ ___\nเปิดให้บริการปกติวันที่ ___\nสั่งสินค้าล่วงหน้าได้ทาง LINE ครับ 🙏\nขออภัยในความไม่สะดวกครับ", category: "custom", usageCount: randInt(1, 8) },
    ].map(t => ({ ...t, createdAt: randomDate(30) }));

    if (replyTemplates.length > 0) {
      await db.collection("reply_templates").insertMany(replyTemplates);
    }

    // ─── 15. Generate Auto-closer Rules + Queue ───
    const followUpRules = [
      {
        name: "ลูกค้าไม่ตอบ 3 วัน — ทักทาย",
        trigger: "no_reply_days",
        triggerDays: 3,
        triggerStage: "",
        messages: [
          { dayOffset: 0, template: "สวัสดีครับ {{name}} ไม่ทราบว่ายังสนใจสินค้าอยู่มั้ยครับ? มีอะไรให้ช่วยบอกได้เลยนะครับ 🙏" },
          { dayOffset: 3, template: "{{name}} ครับ ตอนนี้มีโปรพิเศษ ซื้อครบ 50,000 ส่งฟรีครับ สนใจมั้ยครับ?" },
        ],
        aiGenerate: false, platform: "all",
        status: "active",
        stats: { triggered: 45, replied: 18, converted: 7 },
      },
      {
        name: "ลูกค้าเสนอราคาค้าง 5 วัน",
        trigger: "stage_stuck",
        triggerDays: 5,
        triggerStage: "quoting",
        messages: [
          { dayOffset: 0, template: "สวัสดีครับ {{name}} ใบเสนอราคาที่ส่งไป สะดวกตอนไหนครับ? ถ้ามีข้อสงสัยยินดีตอบครับ" },
          { dayOffset: 2, template: "{{name}} ครับ เดือนนี้มีส่วนลดพิเศษเพิ่มอีก 3% ถ้าตัดสินใจภายในสัปดาห์นี้ครับ" },
          { dayOffset: 5, template: "{{name}} ครับ ไม่ทราบว่าตัดสินใจยังไงครับ? ถ้าต้องการปรับใบเสนอราคา บอกได้เลยนะครับ" },
        ],
        aiGenerate: false, platform: "all",
        status: "active",
        stats: { triggered: 28, replied: 12, converted: 5 },
      },
      {
        name: "ลูกค้า Intent สูง — ปิดการขาย",
        trigger: "high_intent",
        triggerDays: 1,
        triggerStage: "",
        messages: [
          { dayOffset: 0, template: "สวัสดีครับ {{name}} เห็นว่าสนใจสินค้าเราอยู่ ถ้าสั่งวันนี้ส่งได้เลยพรุ่งนี้เช้าครับ 🚛" },
        ],
        aiGenerate: true, platform: "all",
        status: "active",
        stats: { triggered: 15, replied: 10, converted: 6 },
      },
      {
        name: "ลูกค้า VIP หาย 7 วัน",
        trigger: "no_reply_days",
        triggerDays: 7,
        triggerStage: "",
        messages: [
          { dayOffset: 0, template: "สวัสดีครับ {{name}} ไม่ได้ทักมานาน สบายดีมั้ยครับ? มีสินค้าใหม่เข้ามาอยากแนะนำครับ" },
          { dayOffset: 3, template: "{{name}} ครับ ในฐานะลูกค้า VIP มีส่วนลดพิเศษ 10% สำหรับออเดอร์ถัดไปครับ" },
        ],
        aiGenerate: false, platform: "line",
        status: "active",
        stats: { triggered: 12, replied: 8, converted: 3 },
      },
      {
        name: "ต่อรองราคาค้าง 3 วัน",
        trigger: "stage_stuck",
        triggerDays: 3,
        triggerStage: "negotiating",
        messages: [
          { dayOffset: 0, template: "{{name}} ครับ เรื่องราคาที่คุยกันไว้ ผมปรึกษาผู้จัดการแล้ว ลดเพิ่มได้อีก 2% ครับ สนใจมั้ยครับ?" },
        ],
        aiGenerate: true, platform: "all",
        status: "active",
        stats: { triggered: 20, replied: 14, converted: 8 },
      },
      {
        name: "AI สร้างข้อความ Follow-up อัตโนมัติ",
        trigger: "no_reply_days",
        triggerDays: 5,
        triggerStage: "",
        messages: [
          { dayOffset: 0, template: "{{ai_generated}}" },
        ],
        aiGenerate: true, platform: "all",
        status: "active",
        stats: { triggered: 35, replied: 15, converted: 4 },
      },
      {
        name: "ลูกค้า Facebook ไม่ตอบ 2 วัน",
        trigger: "no_reply_days",
        triggerDays: 2,
        triggerStage: "",
        messages: [
          { dayOffset: 0, template: "สวัสดีค่ะ {{name}} 😊 สนใจสินค้าตัวไหนบอกได้เลยนะคะ ตอบทุกคำถามค่ะ" },
        ],
        aiGenerate: false, platform: "facebook",
        status: "active",
        stats: { triggered: 30, replied: 12, converted: 3 },
      },
      {
        name: "ลูกค้าใหม่ไม่ก้าวไป interested",
        trigger: "stage_stuck",
        triggerDays: 7,
        triggerStage: "new",
        messages: [
          { dayOffset: 0, template: "สวัสดีครับ {{name}} ไม่ทราบว่ากำลังมองหาวัสดุก่อสร้างอะไรอยู่ครับ? ส่งแคตตาล็อกให้ดูได้ครับ 📋" },
          { dayOffset: 5, template: "{{name}} ครับ ขอแนะนำ Package สร้างบ้าน ราคาพิเศษเดือนนี้ครับ สนใจมั้ยครับ? 🏠" },
        ],
        aiGenerate: false, platform: "all",
        status: "active",
        stats: { triggered: 50, replied: 20, converted: 5 },
      },
    ];

    const ruleDocs = followUpRules.map(r => ({
      ...r,
      createdAt: randomDate(14),
      updatedAt: new Date(),
    }));
    const ruleResults = await db.collection("follow_up_rules").insertMany(ruleDocs);
    const ruleIdList = Object.values(ruleResults.insertedIds).map(id => id.toString());

    // สร้าง queue items จากลูกค้าจริง
    const queueDocs: any[] = [];
    const queueStatuses = ["pending", "pending", "pending", "sent", "sent", "replied", "converted", "skipped"];
    for (let i = 0; i < 25; i++) {
      const c = rand(customerDocs);
      const ruleId = rand(ruleIdList);
      const st = rand(queueStatuses);
      queueDocs.push({
        ruleId,
        customerId: c.sourceId,
        customerName: c.name,
        sourceId: c.rooms?.[0] || c.sourceId,
        platform: c.rooms?.[0]?.startsWith("fb_") ? "facebook" : c.rooms?.[0]?.startsWith("ig_") ? "instagram" : "line",
        currentStep: st === "pending" ? 0 : 1,
        totalSteps: 2,
        status: st,
        nextSendAt: new Date(Date.now() + randInt(-3, 7) * 86400000),
        lastSentAt: st !== "pending" ? randomDate(7) : null,
        lastMessage: st !== "pending" ? "สวัสดีครับ สนใจสินค้าอยู่มั้ยครับ?" : null,
        repliedAt: st === "replied" || st === "converted" ? randomDate(3) : null,
        convertedAt: st === "converted" ? randomDate(1) : null,
        createdAt: randomDate(14),
        updatedAt: new Date(),
      });
    }
    if (queueDocs.length > 0) {
      await db.collection("follow_up_queue").insertMany(queueDocs);
    }

    // ─── Summary ───
    const tEnd = Date.now();
    const summary = {
      customers: customerDocs.length,
      rooms: rooms.length,
      messages: allMessages.length,
      groups_meta: groupsDocs.length,
      chat_analytics: analyticsDocs.length,
      user_skills: skillsDocs.length,
      tasks: taskDocs.length,
      kb_articles: kbDocs.length,
      ai_advice: adviceInsert.length,
      payments: paymentDocs.length,
      appointments: appointmentDocs.length,
      documents: documentDocs.length,
      bot_configs: botConfigs.length,
      follow_up_rules: ruleDocs.length,
      follow_up_queue: queueDocs.length,
      time_ms: tEnd - t0,
    };

    console.log(`[Seed] Done in ${summary.time_ms}ms:`, JSON.stringify(summary));
    return NextResponse.json({ ok: true, summary });
  } catch (err: any) {
    console.error("[Seed] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
