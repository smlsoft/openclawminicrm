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
  "เสื้อยืด Oversize", "กางเกงขาสั้น", "รองเท้าผ้าใบ", "กระเป๋าสะพาย", "หมวกแก๊ป",
  "แว่นกันแดด", "นาฬิกาข้อมือ", "สร้อยคอ", "ต่างหู", "กำไลข้อมือ",
  "ครีมกันแดด SPF50", "เซรั่มวิตามินซี", "แชมพูสมุนไพร", "สบู่น้ำผึ้ง", "ลิปสติก",
  "ชาไทยพรีเมียม", "กาแฟดริป", "คุกกี้เนยสด", "ขนมปังโฮลวีต", "น้ำผลไม้สด",
  "เคสมือถือ", "สายชาร์จ USB-C", "หูฟังบลูทูธ", "พาวเวอร์แบงค์", "ฟิล์มกระจก",
];

const CUSTOMER_MESSAGES = [
  // ถามราคา
  "สินค้าตัวนี้ราคาเท่าไหร่คะ", "ราคาส่งยังไงคะ", "มีส่วนลดมั้ยคะ", "ซื้อ 3 ลดเท่าไหร่",
  "ราคาเดียวกับในเพจมั้ยคะ", "ค่าส่งเท่าไหร่คะ", "ส่ง EMS ได้มั้ย", "มีเก็บเงินปลายทางมั้ย",
  // สนใจ
  "สนใจสินค้าตัวนี้ค่ะ", "มีสีอื่นมั้ยคะ", "ไซส์ XL มีมั้ย", "มีของพร้อมส่งมั้ยคะ",
  "รบกวนส่งรายละเอียดเพิ่มได้มั้ยคะ", "เห็นในไลฟ์สนใจมากค่ะ", "DM มาสอบถามค่ะ",
  "ขอรูปเพิ่มได้มั้ยคะ", "มีรีวิวจากลูกค้ามั้ย", "ของแท้มั้ยคะ",
  // สั่งซื้อ
  "สั่ง 2 ชิ้นค่ะ", "โอนแล้วค่ะ", "ส่งสลิปให้นะคะ", "จะสั่งเพิ่มอีก 1",
  "ขอเปลี่ยนไซส์ได้มั้ยคะ", "สั่งไว้เมื่อวาน ส่งแล้วยังคะ", "ได้เลขพัสดุยังคะ",
  // ขอบคุณ
  "ได้รับของแล้วค่ะ สวยมาก", "ของมาเร็วมาก ขอบคุณค่ะ", "ชอบมากเลยค่ะ จะกลับมาซื้อใหม่",
  "ส่งไว ของดี 👍", "10/10 ค่ะ", "รีวิวให้แล้วนะคะ",
  // ร้องเรียน
  "ทำไมยังไม่ส่งคะ สั่งไป 3 วันแล้ว", "ของที่ได้ไม่ตรงกับรูปเลย", "ขอเปลี่ยนได้มั้ยคะ สีผิด",
  "ติดต่อไปไม่มีใครตอบเลย", "ขอคืนเงินได้มั้ยคะ",
  // ทั่วไป
  "สวัสดีค่ะ", "ขอสอบถามหน่อยค่ะ", "เปิดร้านกี่โมงคะ", "มีหน้าร้านมั้ยคะ",
  "รับทำตามออเดอร์มั้ยคะ", "สินค้าใหม่มีอะไรบ้างคะ", "เดือนหน้ามีของใหม่มั้ย",
  "กลับมาทักอีกทีนะคะ", "เดี๋ยวปรึกษาแฟนก่อนนะคะ", "ไว้ค่อยทักมาใหม่ค่ะ",
];

const STAFF_REPLIES = [
  "สวัสดีค่ะ ยินดีให้บริการค่ะ 🙏", "ราคา {price} บาทค่ะ", "มีค่ะ พร้อมส่งเลย",
  "ส่ง Kerry / Flash / EMS ได้หมดค่ะ", "ค่าส่ง 50 บาท ซื้อ 500+ ส่งฟรีค่ะ",
  "มีส่วนลด 10% สำหรับลูกค้าใหม่ค่ะ", "ไซส์ S M L XL มีหมดค่ะ",
  "ขอบคุณที่สั่งซื้อค่ะ จะจัดส่งภายในวันนี้", "เลขพัสดุ {tracking} ค่ะ",
  "ขออภัยค่ะ จะรีบดำเนินการให้ทันที", "สินค้ารุ่นใหม่เข้าสัปดาห์หน้าค่ะ",
  "รบกวนส่งรูปสลิปมาด้วยนะคะ", "ตอนนี้มีโปรซื้อ 2 แถม 1 ค่ะ",
  "ขอบคุณรีวิวค่ะ 🙏❤️", "เปลี่ยนได้ค่ะ ส่งกลับมาเลยนะคะ",
];

const BOT_REPLIES = [
  "สวัสดีค่ะ น้องกุ้งยินดีให้บริการค่ะ 🦐", "รอสักครู่นะคะ กำลังตรวจสอบให้ค่ะ",
  "สินค้า {product} ราคา {price} บาทค่ะ มีพร้อมส่งเลย",
  "ขอบคุณที่สนใจค่ะ รบกวนแจ้งไซส์/สีที่ต้องการด้วยนะคะ",
  "ตอนนี้ทีมงานไม่อยู่ค่ะ จะแจ้งให้ติดต่อกลับโดยเร็วนะคะ 🙏",
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randPrice() { return [99, 149, 199, 250, 299, 350, 399, 450, 499, 590, 690, 790, 890, 990, 1290, 1490, 1990][randInt(0, 16)]; }

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
    ];
    for (const col of collections) {
      await db.collection(col).dropIndexes().catch(() => {});
      await db.collection(col).deleteMany({});
    }

    // ─── 2. Generate customers + rooms ───
    const NUM_CUSTOMERS = 80;
    const platforms = ["line", "line", "line", "facebook", "facebook", "instagram"]; // weighted
    const pipelineStages = ["new", "new", "interested", "interested", "quoting", "negotiating", "closed_won", "closed_lost", "following_up"];

    interface RoomDef { sourceId: string; platform: string; customerName: string; staffName: string; }
    const rooms: RoomDef[] = [];
    const customerDocs: any[] = [];

    for (let i = 0; i < NUM_CUSTOMERS; i++) {
      const firstName = rand(FIRST_NAMES);
      const lastName = rand(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const platform = rand(platforms);
      const sourceId = generateSourceId(platform);
      const staff = rand(STAFF_NAMES);

      // Some customers have multiple platforms
      const extraPlatforms: { platform: string; sourceId: string }[] = [];
      if (Math.random() > 0.7) {
        const p2 = platform === "line" ? "facebook" : "line";
        extraPlatforms.push({ platform: p2, sourceId: generateSourceId(p2) });
      }
      if (Math.random() > 0.9) {
        extraPlatforms.push({ platform: "instagram", sourceId: generateSourceId("instagram") });
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

    // ─── 3. Generate messages per room ───
    const allMessages: any[] = [];

    for (const room of rooms) {
      const msgCount = randInt(5, 40);
      const startDate = randomDate(30);
      const msgs: any[] = [];

      for (let j = 0; j < msgCount; j++) {
        const elapsed = (j / msgCount) * randInt(1, 7) * 86400000;
        const createdAt = new Date(startDate.getTime() + elapsed);

        // Alternate customer / staff / bot
        const roll = Math.random();
        let role: string, userName: string, content: string;

        if (roll < 0.55) {
          // Customer message
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
    const groupsDocs = rooms.map(r => {
      const roomMsgs = allMessages.filter(m => m.sourceId === r.sourceId);
      const names = [...new Set(roomMsgs.map(m => m.userName))];
      return {
        sourceId: r.sourceId,
        groupName: names.filter(n => !n.startsWith("SML") && n !== "น้องกุ้ง").join(", ") || r.sourceId,
        sourceType: r.sourceId.startsWith("U") ? "user" : r.sourceId.startsWith("C") ? "group" : "unknown",
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
    for (let i = 0; i < 15; i++) {
      const c = rand(customerDocs);
      taskDocs.push({
        customerId: c.sourceId,
        customerName: c.name,
        title: rand([
          "ติดตามใบเสนอราคา", "โทรหาลูกค้า", "ส่งโปรโมชั่นใหม่",
          "เช็คสถานะพัสดุ", "นัดสาธิตสินค้า", "ส่ง catalog",
          "Follow up หลังส่งของ", "ถามความพอใจ", "เสนอแพ็คเกจใหม่",
        ]),
        notes: rand(["", "ลูกค้าสนใจมาก", "รอยืนยัน", "ด่วน", "โทรไม่ติด 2 ครั้ง"]),
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
      time_ms: tEnd - t0,
    };

    console.log(`[Seed] Done in ${summary.time_ms}ms:`, JSON.stringify(summary));
    return NextResponse.json({ ok: true, summary });
  } catch (err: any) {
    console.error("[Seed] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
