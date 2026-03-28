/**
 * OpenClaw Mini CRM — AI Agent
 * LINE/Facebook/Instagram webhook → เก็บ MongoDB → RAG → AI → ตอบ
 * All-in-One: Multi-channel + RAG + AI Agent + MCP + Analytics
 */
const express = require("express");
const http = require("http");
const { MongoClient } = require("mongodb");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const app = express();

// === Rate Limiters (Security) ===
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "คำขอมากเกินไป กรุณารอสักครู่" },
  standardHeaders: true,
  legacyHeaders: false,
});

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "ส่งข้อความเร็วเกินไป กรุณารอสักครู่" },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "อัพโหลดมากเกินไป กรุณารอสักครู่" },
  standardHeaders: true,
  legacyHeaders: false,
});

// === [Security] PII Masking — ซ่อนข้อมูลส่วนบุคคลก่อนส่ง AI ===
function maskPII(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/\b\d{1}[\s-]?\d{4}[\s-]?\d{5}[\s-]?\d{2}[\s-]?\d{1}\b/g, "[เลขบัตรประชาชน]")
    .replace(/\b0[689]\d[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g, "[เบอร์โทร]")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[อีเมล]")
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[เลขบัตร]")
    .replace(/\b\d{10,15}\b/g, "[เลขบัญชี]");
}

// === [Security] Prompt Injection Protection — กรอง pattern อันตรายก่อนส่ง AI ===
function sanitizeForAI(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/ignore\s+(all\s+)?previous\s+instructions?/gi, "[filtered]")
    .replace(/forget\s+(all\s+)?previous\s+(instructions?|context)/gi, "[filtered]")
    .replace(/you\s+are\s+now\s+/gi, "[filtered]")
    .replace(/system\s*:\s*/gi, "[filtered]")
    .replace(/\bact\s+as\s+/gi, "[filtered]")
    .replace(/pretend\s+(you\s+are|to\s+be)\s+/gi, "[filtered]")
    .replace(/reveal\s+(your|the)\s+(system|initial)\s+prompt/gi, "[filtered]")
    .replace(/what\s+(is|are)\s+your\s+(system|initial)\s+(prompt|instructions)/gi, "[filtered]");
}

// === [Security] Helper — sanitize + mask ก่อนส่ง AI ===
function cleanForAI(text) {
  return maskPII(sanitizeForAI(text));
}

// === Reply Token Cache (LINE Reply API ฟรี → ใช้ก่อน Push) ===
// replyToken มีอายุ ~30 วินาที เก็บไว้ใช้ตอน admin ตอบ
const replyTokenCache = new Map(); // sourceId → { token, expiresAt }
const REPLY_TOKEN_TTL_MS = 25000; // 25 วินาที (LINE ให้ 30s แต่เผื่อ latency)

function cacheReplyToken(sourceId, replyToken) {
  if (!replyToken || !sourceId) return;
  replyTokenCache.set(sourceId, {
    token: replyToken,
    expiresAt: Date.now() + REPLY_TOKEN_TTL_MS,
  });
}

function getReplyToken(sourceId) {
  const entry = replyTokenCache.get(sourceId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    replyTokenCache.delete(sourceId);
    return null;
  }
  replyTokenCache.delete(sourceId); // ใช้ได้ครั้งเดียว
  return entry.token;
}

// ลบ token หมดอายุทุก 60 วินาที
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of replyTokenCache) {
    if (now > v.expiresAt) replyTokenCache.delete(k);
  }
}, 60000);

// === 5-Minute Auto-Reply Timer (เฉพาะ 1-on-1 LINE OA) ===
// ถ้า admin ไม่ตอบภายใน 5 นาที → AI ตอบแทน (บอกว่าเป็น AI)
const pendingAutoReply = new Map(); // sourceId → { timer, text, userName }
const AUTO_REPLY_DELAY_MS = 5 * 60 * 1000; // 5 นาที

function scheduleAutoReply(sourceId, userName, messageText, sourceType) {
  // ตอบเฉพาะ 1-on-1 (sourceType === "user") ไม่ตอบในกลุ่ม
  if (sourceType !== "user") return;
  // Check opt-out before scheduling
  getDB().then(db => {
    if (!db) return;
    db.collection("privacy_consent").findOne({ sourceId }).then(doc => {
      if (doc?.optedOut) return; // Don't auto-reply if opted out
      // ลบ timer เก่าถ้ามี (ลูกค้าส่งข้อความใหม่ → reset timer)
      cancelAutoReply(sourceId);
      const timer = setTimeout(async () => {
        pendingAutoReply.delete(sourceId);
        try {
          await doAutoReply(sourceId, userName, messageText);
        } catch (e) {
          console.error("[Auto-Reply] Error:", e.message);
        }
      }, AUTO_REPLY_DELAY_MS);
      pendingAutoReply.set(sourceId, { timer, text: messageText, userName });
    });
  }).catch(() => {});
}

function cancelAutoReply(sourceId) {
  const pending = pendingAutoReply.get(sourceId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingAutoReply.delete(sourceId);
  }
}

// === Privacy / Opt-out / Handoff Helpers ===
const OPT_OUT_KEYWORDS = ["หยุด", "stop", "ยกเลิก", "unsubscribe"];
const OPT_IN_KEYWORDS = ["เปิด", "start", "subscribe"];
const DELETE_KEYWORDS = ["ลบข้อมูล", "delete my data", "ลบ"];
const HANDOFF_REGEX = /คุยกับคน|ขอคุยกับพนักงาน|ต้องการคนจริง|ไม่ใช่ bot|talk to human|real person|agent/;

async function checkOptedOut(sourceId) {
  const database = await getDB();
  if (!database) return false;
  const doc = await database.collection("privacy_consent").findOne({ sourceId });
  return doc?.optedOut === true;
}

async function setOptOut(sourceId, optedOut) {
  const database = await getDB();
  if (!database) return;
  const update = optedOut
    ? { $set: { optedOut: true, optedOutAt: new Date() } }
    : { $set: { optedOut: false, optedInAt: new Date() } };
  await database.collection("privacy_consent").updateOne({ sourceId }, update, { upsert: true });
}

async function createHandoffAlert(sourceId, customerName, text) {
  const database = await getDB();
  if (!database) return;
  await database.collection("alerts").insertOne({
    type: "human_handoff",
    sourceId,
    customerName,
    message: `ลูกค้าขอคุยกับพนักงาน: "${(text || "").substring(0, 100)}"`,
    level: "red",
    read: false,
    createdAt: new Date(),
  });
}

async function createAiHandoffAlert(sourceId, customerName, text, platform) {
  const database = await getDB();
  if (!database) return;
  await database.collection("alerts").insertOne({
    type: "human_handoff",
    sourceId,
    customerName,
    message: `AI ไม่แน่ใจ ส่งต่อทีมงาน: "${(text || "").substring(0, 100)}"`,
    level: "yellow",
    read: false,
    createdAt: new Date(),
  });
  const label = platform ? `${platform} ${sourceId.substring(0, 12)}` : sourceId.substring(0, 8);
  console.log(`[Handoff] AI ส่งต่อทีมงาน → ${label}`);
}

async function logDeletionRequest(sourceId, platform) {
  const database = await getDB();
  if (!database) return;
  await database.collection("data_deletion_requests").insertOne({
    sourceId, platform, requestedAt: new Date(), status: "pending",
  });
}

async function doAutoReply(sourceId, userName, customerMessage) {
  // ตรวจสอบว่า admin ตอบไปแล้วหรือยัง (เช็คจาก DB)
  const db = await getDB();
  const lastMsg = await db.collection("messages")
    .findOne({ sourceId }, { sort: { createdAt: -1 } });
  // ถ้าข้อความล่าสุดเป็นของ staff/assistant → admin ตอบแล้ว ไม่ต้องตอบ
  if (lastMsg && lastMsg.role === "assistant") {
    console.log(`[Auto-Reply] Admin ตอบแล้ว → skip ${sourceId.substring(0, 8)}`);
    return;
  }

  console.log(`[Auto-Reply] 5 นาทีไม่มีคนตอบ → AI ตอบแทน ${sourceId.substring(0, 8)}`);

  // ดึง rooms ทั้งหมดของลูกค้า (merged customer)
  const customer = await db.collection("customers").findOne({ rooms: sourceId }).catch(() => null);
  const allSourceIds = customer?.rooms || [sourceId];

  // ดึง memory + KB + skill lessons
  const aiContext = await buildAIContext(sourceId, customerMessage, allSourceIds);

  // [A/B] Append A/B variant instruction
  const variant = getABVariant(sourceId);
  const abInstruction = AB_PROMPTS[variant];

  // เรียก AI
  const messages = [
    {
      role: "system",
      content: `คุณเป็นผู้ช่วยอัตโนมัติของร้าน ตอบสั้นๆ สุภาพ เป็นภาษาไทย
ตอนนี้ทีมงานไม่ว่างชั่วคราว คุณช่วยตอบไปก่อน
ใช้ข้อมูลจากฐานความรู้และ memory ในการตอบ
ปรับวิธีตอบตามสไตล์ลูกค้า (ถ้ารู้)
ห้ามสัญญาเรื่องราคา/โปรโมชั่นที่ไม่ได้อยู่ในฐานความรู้
ถ้าไม่แน่ใจให้บอกว่า "รอทีมงานตอบนะคะ"
ตอบไม่เกิน 2 ประโยค
สไตล์การตอบ: ${abInstruction}${aiContext}`
    },
    { role: "user", content: cleanForAI(customerMessage) },
  ];

  const reply = await callLightAI(messages, { maxTokens: 200, timeout: 15000 }).catch(() => null);
  if (!reply) return;

  // เพิ่มข้อความบอกว่าเป็น AI
  const fullReply = `🤖 ตอบอัตโนมัติ:\n${reply}\n\n💬 ทีมงานจะตอบกลับเร็วๆ นี้ค่ะ`;

  // ส่ง Push (replyToken หมดอายุไปแล้วแน่นอน หลัง 5 นาที)
  const lineMessages = [{ type: "text", text: fullReply }];
  const sent = await sendLinePush(sourceId, lineMessages);

  if (sent) {
    await saveMsg(sourceId, {
      role: "assistant",
      userName: "🤖 AI อัตโนมัติ",
      content: fullReply,
      messageType: "text",
      isAutoReply: true,
      abVariant: variant,
    }, "line");
    console.log(`[Auto-Reply] ✅ AI ตอบแทนสำเร็จ → ${sourceId.substring(0, 8)}`);
  }
}

// === Image Upload Directory ===
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/;
    cb(null, allowed.test(file.mimetype));
  },
});

// === [Security] Image Signature Validation ===
function validateImageSignature(filePath) {
  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(filePath, "r");
  try { fs.readSync(fd, buffer, 0, 12, 0); } finally { fs.closeSync(fd); }
  const hex = buffer.toString("hex");
  if (hex.startsWith("ffd8ff")) return true;       // JPEG
  if (hex.startsWith("89504e47")) return true;      // PNG
  if (hex.startsWith("474946")) return true;         // GIF
  if (hex.startsWith("52494646") && hex.includes("57454250")) return true; // WebP
  return false;
}

// === Reverse Proxy: /dashboard* → dashboard container ===
const DASHBOARD_HOST = process.env.DASHBOARD_HOST || "dashboard";
const DASHBOARD_PORT = parseInt(process.env.DASHBOARD_PORT || "3001", 10);

app.use("/dashboard", (req, res) => {
  // app.use strips "/dashboard" prefix → restore มัน
  const targetPath = "/dashboard" + (req.url === "/" ? "" : req.url);
  const options = {
    hostname: DASHBOARD_HOST,
    port: DASHBOARD_PORT,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `${DASHBOARD_HOST}:${DASHBOARD_PORT}` },
  };
  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxy.on("error", () => {
    if (!res.headersSent) res.status(502).send("Dashboard unavailable");
  });
  req.pipe(proxy);
});

// === MongoDB ===
let db = null;
async function getDB() {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    db = client.db(process.env.MONGODB_DB || "smltrack");
    console.log("[DB] MongoDB connected");
    return db;
  } catch (e) {
    console.error("[DB] Failed:", e.message);
    return null;
  }
}


// === Collection เดียว: messages (แยกด้วย sourceId field) ===
const MESSAGES_COLL = "messages";

// === [Audit] Audit Log — บันทึกทุก action ของ staff ===
const AUDIT_LOG_COLL = "audit_logs";

async function auditLog(action, details = {}) {
  const db = await getDB();
  if (!db) return;
  try {
    await db.collection(AUDIT_LOG_COLL).insertOne({
      action,
      ...details,
      createdAt: new Date(),
    });
  } catch {}
}

// === [Privacy] PDPA Notice — แจ้งลูกค้าครั้งแรก ===
const PRIVACY_TEXT = `🔒 แจ้งเตือน: ระบบนี้ใช้ AI ในการวิเคราะห์และตอบกลับข้อความ ข้อมูลของคุณจะถูกเก็บรักษาตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)\n\nพิมพ์ "หยุด" เพื่อหยุดรับข้อความอัตโนมัติ\nพิมพ์ "ลบข้อมูล" เพื่อขอลบข้อมูลของคุณ`;
const privacyNoticeSent = new Set(); // in-memory cache เพื่อไม่ต้อง query DB ทุกข้อความ

async function sendPrivacyNoticeIfNeeded(sourceId, platform, sendFn) {
  if (privacyNoticeSent.has(sourceId)) return;
  const database = await getDB();
  if (!database) return;
  const consent = await database.collection("privacy_consent").findOne({ sourceId }).catch(() => null);
  if (consent) {
    privacyNoticeSent.add(sourceId);
    return;
  }
  await sendFn().catch(() => {});
  await database.collection("privacy_consent").insertOne({
    sourceId,
    platform,
    noticeSentAt: new Date(),
    optedOut: false,
  }).catch(() => {});
  privacyNoticeSent.add(sourceId);
  console.log(`[Privacy] ส่งแจ้งเตือน PDPA → ${platform}:${sourceId.substring(0, 12)}`);
}

// === AI Cost Tracking ===
// ราคาโดยประมาณต่อ 1M tokens (USD)
const AI_PRICING = {
  "OR-Nemotron": { input: 0, output: 0 },
  "OR-DeepSeek": { input: 0, output: 0 },
  "OR-Llama": { input: 0, output: 0 },
  "OR-Trinity": { input: 0, output: 0 },
  "OR-StepFlash": { input: 0, output: 0 },
  "SambaNova": { input: 0, output: 0 },
  "Groq": { input: 0.059, output: 0.079 },
  "Cerebras": { input: 0.01, output: 0.01 },
  "Gemini": { input: 0, output: 0 },
  "Gemini-Embed": { input: 0, output: 0 },
  "openrouter": { input: 0.18, output: 0.18 }, // qwen3-235b paid
  "OR-Vision": { input: 0, output: 0 },
  "Groq-Vision": { input: 0.059, output: 0.079 },
  "Gemini-Vision": { input: 0, output: 0 },
};

async function trackAICost({ provider, model, feature, inputTokens = 0, outputTokens = 0, sourceId = null, success = true }) {
  try {
    const database = await getDB();
    if (!database) return;

    const pricing = AI_PRICING[provider] || { input: 0, output: 0 };
    const totalTokens = inputTokens + outputTokens;
    const costUsd = (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;

    await database.collection("ai_costs").insertOne({
      provider,
      model: model || provider,
      feature, // chat-reply, sentiment, advice, embedding, vision, light-ai
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd: Math.round(costUsd * 1000000) / 1000000, // 6 decimal
      sourceId,
      success,
      createdAt: new Date(),
    });
  } catch (e) {
    // silent — ไม่ให้ cost tracking พัง main flow
  }
}

// === Bot Config ต่อ group/คน — personality แยกเด็ดขาด ===
const botConfigCache = {}; // cache ไม่ต้อง query ทุกครั้ง

const DEFAULT_PROMPT = `คุณชื่อ "น้องกุ้ง" 🦐 เป็นเลขาส่วนตัว

บทบาท:
- เป็นเลขาที่คอยช่วยเหลือ แนะนำ ดูแลทุกเรื่อง
- ช่วยตอบคำถาม จัดการนัดหมาย หาข้อมูล สรุปงาน
- จดจำสิ่งที่เคยคุย เพื่อทำงานต่อเนื่อง

บุคลิก:
- ตอบเป็นภาษาไทย สุภาพ เป็นกันเอง อบอุ่น แต่มีมุขตลกแทรกบ้าง
- ใช้ emoji พอประมาณ 😊✨
- ตอบ 2-4 ประโยค กระชับ ได้ใจความ เหมือนเลขาตัวจริง
- ถ้าไม่รู้คำตอบ ให้บอกตรงๆ เช่น "ตรงนี้กุ้งขอเช็คข้อมูลก่อนนะคะ 📋"
- ห้ามบอกว่าเป็น AI หรือ chatbot ให้บอกว่าเป็น "น้องกุ้ง" เท่านั้น`;

async function getBotConfig(sourceId, sourceMeta) {
  // ลอง cache ก่อน (expire 60 วินาที)
  const cached = botConfigCache[sourceId];
  if (cached && Date.now() - cached._ts < 60000) return cached;

  const database = await getDB();
  if (!database) return { systemPrompt: DEFAULT_PROMPT, botName: "น้องกุ้ง" };
  try {
    let config = await database.collection("bot_config").findOne({ sourceId });

    // ถ้ายังไม่มี config → สร้างอัตโนมัติ
    if (!config) {
      config = {
        sourceId,
        sourceType: sourceMeta?.type || "unknown",
        groupName: sourceMeta?.groupName || null,
        botName: "น้องกุ้ง",
        systemPrompt: DEFAULT_PROMPT,
        aiAutoReply: false,         // น้องกุ้งตอบแทนอัตโนมัติ (ใช้ Reply API ฟรี)
        aiReplyMode: "off",        // off | auto | mention | keyword
        aiReplyKeywords: [],        // keywords ที่ trigger ให้น้องกุ้งตอบ
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await database.collection("bot_config").insertOne(config);
      console.log(`[Config] Auto-created config for ${sourceId} (${sourceMeta?.groupName || "unknown"})`);
    }

    config._ts = Date.now();
    botConfigCache[sourceId] = config;
    return config;
  } catch (e) {
    return { systemPrompt: DEFAULT_PROMPT, botName: "น้องกุ้ง" };
  }
}

async function setBotConfig(sourceId, updates) {
  const database = await getDB();
  if (!database) return;
  await database.collection("bot_config").updateOne(
    { sourceId },
    { $set: { ...updates, sourceId, updatedAt: new Date() } },
    { upsert: true }
  );
  delete botConfigCache[sourceId]; // clear cache
}

// === Download image จาก LINE ===
async function downloadLineImage(messageId) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return null;
  }
}


// === Get user profile ===
async function getUserName(source) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return "User";
  try {
    let url;
    if (source.type === "group" && source.userId) {
      url = `https://api.line.me/v2/bot/group/${source.groupId}/member/${source.userId}`;
    } else if (source.userId) {
      url = `https://api.line.me/v2/bot/profile/${source.userId}`;
    }
    if (!url) return "User";
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return "User";
    const data = await res.json();
    return data.displayName || "User";
  } catch (e) {
    return "User";
  }
}

// === Lightweight AI Call — วน providers ทั้งหมด ตัวไหน fail ข้ามทันที ===
const lightAICooldown = {}; // provider → cooldown until timestamp
const PAID_AI = process.env.PAID_AI_ENABLED === "true"; // ถ้าไม่ตั้ง = ปิดตัวเสียเงิน

// === Auto-discover OpenRouter free models (ทุก 1 ชม.) ===
let discoveredFreeModels = []; // [{ id, name, context_length }]
let lastDiscovery = 0;

async function discoverFreeModels() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await res.json();
    if (!data.data) return;

    // Filter: ฟรี, context >= 8K, support chat, ไม่ใช่ vision-only
    const free = data.data.filter((m) => {
      const p = m.pricing || {};
      const isFree = parseFloat(p.prompt || "1") === 0 && parseFloat(p.completion || "1") === 0;
      const bigEnough = (m.context_length || 0) >= 8000;
      const isChat = m.id && !m.id.includes("embed") && !m.id.includes("tts") && !m.id.includes("image");
      return isFree && bigEnough && isChat;
    });

    // Sort by context_length desc, take top 10
    free.sort((a, b) => (b.context_length || 0) - (a.context_length || 0));
    discoveredFreeModels = free.slice(0, 10).map((m) => ({
      id: m.id,
      name: m.name || m.id,
      context_length: m.context_length || 0,
    }));

    lastDiscovery = Date.now();
    console.log(`[FreeAI] ค้นพบ ${discoveredFreeModels.length} models ฟรี:`, discoveredFreeModels.map((m) => m.id.split("/").pop()).join(", "));
  } catch (e) {
    console.log("[FreeAI] discover error:", e.message);
  }
}

// เริ่มค้นหาทันที + ทุก 1 ชม.
discoverFreeModels();
setInterval(discoverFreeModels, 3600000);

function getOpenRouterFreeProviders() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || discoveredFreeModels.length === 0) {
    // Fallback: hardcoded models
    return [
      { name: "OR-Nemotron", url: "https://openrouter.ai/api/v1/chat/completions", key, model: "nvidia/nemotron-3-super-120b-a12b:free" },
      { name: "OR-DeepSeek", url: "https://openrouter.ai/api/v1/chat/completions", key, model: "deepseek/deepseek-chat-v3-0324:free" },
      { name: "OR-Llama", url: "https://openrouter.ai/api/v1/chat/completions", key, model: "meta-llama/llama-3.3-70b-instruct:free" },
      { name: "OR-StepFlash", url: "https://openrouter.ai/api/v1/chat/completions", key, model: "stepfun/step-3.5-flash:free" },
    ];
  }
  // ใช้ discovered models
  return discoveredFreeModels.map((m) => ({
    name: "OR-" + m.id.split("/").pop().substring(0, 15),
    url: "https://openrouter.ai/api/v1/chat/completions",
    key,
    model: m.id,
  }));
}

async function callLightAI(messages, { json = false, maxTokens = 500, timeout = 15000 } = {}) {
  // OpenAI-compatible providers (ฟรี auto-discover + dedicated + paid)
  const providers = [
    // ─── ฟรี (auto-discover จาก OpenRouter ทุก 1 ชม.) ───
    ...getOpenRouterFreeProviders(),
    // ─── ฟรี (dedicated providers) ───
    { name: "SambaNova", url: "https://api.sambanova.ai/v1/chat/completions", key: process.env.SAMBANOVA_API_KEY, model: "Qwen3-235B" },
    // ─── เสียเงิน (ต้องเปิด PAID_AI_ENABLED=true) ───
    ...(PAID_AI ? [
      { name: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", key: process.env.GROQ_API_KEY, model: "llama-3.3-70b-versatile" },
      { name: "Cerebras", url: "https://api.cerebras.ai/v1/chat/completions", key: process.env.CEREBRAS_API_KEY, model: "qwen-3-235b-a22b-instruct-2507" },
    ] : []),
  ].filter((p) => p.key);

  for (const p of providers) {
    // ข้ามถ้ายังอยู่ใน cooldown
    if (lightAICooldown[p.name] && Date.now() < lightAICooldown[p.name]) continue;

    try {
      const body = { model: p.model, messages, max_tokens: maxTokens };
      if (json) body.response_format = { type: "json_object" };
      const res = await fetch(p.url, {
        method: "POST",
        signal: AbortSignal.timeout(timeout),
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        trackAICost({
          provider: p.name, model: p.model, feature: json ? "light-ai-json" : "light-ai",
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        });
        // ถ้าเป็นตัวเสียเงิน → cooldown 5 นาที เพื่อให้รอบถัดไปลองตัวฟรีก่อน
        const pricing = AI_PRICING[p.name];
        if (pricing && (pricing.input > 0 || pricing.output > 0)) {
          lightAICooldown[p.name] = Date.now() + 300000; // 5 min
          console.log(`[LightAI] ${p.name} ใช้ได้แต่เสียเงิน → cooldown 5m ให้ตัวฟรีลองก่อน`);
        }
        return data.choices[0].message.content;
      }
      // Error → cooldown อัตโนมัติตามประเภท
      if (data.error) {
        const errMsg = data.error.message || JSON.stringify(data.error).substring(0, 100);
        if (errMsg.includes("rate") || errMsg.includes("limit") || errMsg.includes("429") || data.error.code === 429) {
          lightAICooldown[p.name] = Date.now() + 1800000; // 30m
          console.log(`[LightAI] ${p.name} rate limited → cooldown 30m`);
        } else if (errMsg.includes("not found") || errMsg.includes("not available") || errMsg.includes("invalid model")) {
          lightAICooldown[p.name] = Date.now() + 3600000; // 1 ชม. (model ไม่มี)
          console.log(`[LightAI] ${p.name} model ไม่มี → cooldown 1h`);
        } else {
          lightAICooldown[p.name] = Date.now() + 300000; // 5m (error อื่นๆ)
          console.log(`[LightAI] ${p.name} error → cooldown 5m: ${errMsg.substring(0, 60)}`);
        }
      }
    } catch (e) {
      // Timeout → cooldown 10 นาที
      lightAICooldown[p.name] = Date.now() + 600000;
      console.log(`[LightAI] ${p.name} timeout → cooldown 10m`);
    }
  }

  // Last resort: Gemini (API ต่างจาก OpenAI format)
  const googleKey = process.env.GOOGLE_API_KEY;
  if (googleKey && (!lightAICooldown["Gemini"] || Date.now() >= lightAICooldown["Gemini"])) {
    try {
      const systemMsg = messages.find((m) => m.role === "system");
      const userMsg = messages.find((m) => m.role === "user");
      const text = (systemMsg ? systemMsg.content + "\n\n" : "") + (userMsg?.content || "");
      const genConfig = json ? { responseMimeType: "application/json" } : {};
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(timeout),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: genConfig }),
        }
      );
      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        trackAICost({
          provider: "Gemini", model: "gemini-2.0-flash", feature: json ? "light-ai-json" : "light-ai",
          inputTokens: data.usageMetadata?.promptTokenCount || 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
        });
        return data.candidates[0].content.parts[0].text;
      }
      if (data.error) {
        lightAICooldown["Gemini"] = Date.now() + 1800000;
        console.log("[LightAI] Gemini rate limited → cooldown 30m");
      }
    } catch (e) {
      lightAICooldown["Gemini"] = Date.now() + 600000;
    }
  }

  console.log("[LightAI] ❌ ทุก provider ไม่ว่าง");
  return null;
}

// === Gemini Embedding API ===
async function getEmbedding(text) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || !text) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text: text.substring(0, 2000) }] },
        }),
      }
    );
    const data = await res.json();
    if (data.embedding?.values) {
      trackAICost({ provider: "Gemini-Embed", model: "gemini-embedding-001", feature: "embedding", inputTokens: Math.ceil(text.length / 4) });
      return data.embedding.values;
    }
    return null;
  } catch (e) {
    console.error("[Embed] Error:", e.message);
    return null;
  }
}

// === Save message to MongoDB (collection เดียว + embedding non-blocking) ===
async function saveMsg(sourceId, msg, platform = "line") {
  const database = await getDB();
  if (!database) return;
  try {
    const doc = { ...msg, sourceId, platform, createdAt: new Date() };
    const result = await database.collection(MESSAGES_COLL).insertOne(doc);

    // Embed แบบ non-blocking
    const text = msg.content || "";
    if (text.length > 2) {
      getEmbedding(text).then(async (embedding) => {
        if (embedding) {
          await database.collection(MESSAGES_COLL).updateOne(
            { _id: result.insertedId },
            { $set: { embedding } }
          );
        }
      }).catch(() => {});
    }
    // ตรวจจับการชำระเงิน (non-blocking)
    detectPayment(sourceId, msg, platform, result.insertedId).catch(() => {});
  } catch (e) {
    console.error("[DB] Save error:", e.message);
  }
}

// === Payment Detection — ตรวจจับสลิป/การโอนเงิน ===
const PAYMENT_KEYWORDS = [
  /โอนแล้ว/, /ส่งสลิป/, /จ่ายแล้ว/, /ชำระแล้ว/, /โอนเงิน/,
  /ยอดโอน/, /โอนให้แล้ว/, /จ่ายเงินแล้ว/, /แนบสลิป/, /โอนเรียบร้อย/,
];

async function detectPayment(sourceId, msg, platform, messageId) {
  // ข้ามข้อความ staff/bot
  if ((msg.userName || "").toUpperCase().startsWith("SML")) return;
  if (msg.role === "assistant") return;

  const text = (msg.content || "").toLowerCase();
  const matchedKeywords = PAYMENT_KEYWORDS.filter(re => re.test(text)).map(re => re.source);
  const hasImage = msg.messageType === "image" || !!msg.imageUrl;
  const imgDesc = (msg.imageDescription || "").toLowerCase();
  const imgIsSlip = /สลิป|slip|โอน|transfer|bank|ธนาคาร|receipt|ใบเสร็จ/.test(imgDesc);

  // ต้องมี keyword หรือ image ที่เป็นสลิป
  if (matchedKeywords.length === 0 && !imgIsSlip) return;

  const detectionMethod = (matchedKeywords.length > 0 && (hasImage || imgIsSlip))
    ? "keyword+image" : matchedKeywords.length > 0 ? "keyword" : "image";

  // Parse amount
  const amountMatch = text.match(/(\d[\d,]*\.?\d*)\s*บาท/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : null;

  const database = await getDB();
  if (!database) return;

  await database.collection("payments").insertOne({
    messageId,
    sourceId,
    platform,
    customerName: msg.userName || "",
    amount,
    detectionMethod,
    keywords: matchedKeywords,
    slipImageUrl: msg.imageUrl || null,
    status: "pending",
    confirmedBy: null, confirmedAt: null,
    rejectedBy: null, rejectedAt: null, rejectedReason: null,
    notes: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`[Payment] Detected from ${msg.userName} in ${sourceId} (${detectionMethod}) amount=${amount}`);
}

// === สร้าง compound index (เรียกครั้งเดียวตอน startup) ===
async function ensureIndexes() {
  const database = await getDB();
  if (!database) return;
  try {
    // ── Messages (collection ใหญ่สุด — ต้องมี index ดี) ──
    const msgColl = database.collection(MESSAGES_COLL);
    await msgColl.createIndex({ sourceId: 1, createdAt: -1 });  // ดึงข้อความตาม source เรียงเวลา
    await msgColl.createIndex({ sourceId: 1, content: "text" }); // keyword search
    await msgColl.createIndex({ sourceId: 1, role: 1, createdAt: -1 }); // กรองเฉพาะ user/assistant
    await msgColl.createIndex({ platform: 1, createdAt: -1 });  // กรองตาม platform
    await msgColl.createIndex({ createdAt: -1 });               // เรียงตามเวลา (global)

    // ── Customers (ค้นหาบ่อย) ──
    const custColl = database.collection("customers");
    await custColl.createIndex({ name: 1 });                     // upsert by name
    await custColl.createIndex({ rooms: 1 });                    // ค้นหาจาก sourceId
    await custColl.createIndex({ "platformIds.line": 1 }, { sparse: true });
    await custColl.createIndex({ "platformIds.facebook": 1 }, { sparse: true });
    await custColl.createIndex({ "platformIds.instagram": 1 }, { sparse: true });
    await custColl.createIndex({ phone: 1 }, { sparse: true }); // ค้นหาเบอร์โทร
    await custColl.createIndex({ email: 1 }, { sparse: true }); // ค้นหา email
    await custColl.createIndex({ pipelineStage: 1, updatedAt: -1 }); // CRM pipeline
    await custColl.createIndex({ updatedAt: -1 });               // เรียงตามอัพเดทล่าสุด
    await custColl.createIndex({ totalMessages: -1 });           // เรียงตามจำนวนข้อความ

    // ── Groups Meta (รายชื่อสนทนา) ──
    const groupsColl = database.collection("groups_meta");
    await groupsColl.createIndex({ sourceId: 1 }, { unique: true });
    await groupsColl.createIndex({ platform: 1, updatedAt: -1 });

    // ── Chat Analytics ──
    await database.collection("chat_analytics").createIndex({ sourceId: 1 }, { unique: true });

    // ── Knowledge Base ──
    const kbColl = database.collection(KB_COLL);
    await kbColl.createIndex({ active: 1, category: 1 });       // กรองตามหมวด + เปิด/ปิด
    await kbColl.createIndex({ updatedAt: -1 });
    await kbColl.createIndex({ tags: 1 });                      // ค้นหาตาม tag

    // ── AI Memory (จำลูกค้า) ──
    const memColl = database.collection(MEMORY_COLL);
    await memColl.createIndex({ sourceId: 1 }, { unique: true });
    await memColl.createIndex({ updatedAt: -1 });

    // ── AI Skill Lessons ──
    const skillColl = database.collection(SKILL_LESSONS_COLL);
    await skillColl.createIndex({ sourceId: 1, createdAt: -1 }); // lessons per customer
    await skillColl.createIndex({ createdAt: -1 });               // global lessons
    await skillColl.createIndex({ outcomeType: 1, createdAt: -1 }); // filter by outcome

    // ── Tasks ──
    const tasksColl = database.collection("tasks");
    await tasksColl.createIndex({ customerId: 1, status: 1 });
    await tasksColl.createIndex({ dueDate: 1, status: 1 });
    await tasksColl.createIndex({ assignee: 1, status: 1 });

    // ── Reply Templates ──
    await database.collection("reply_templates").createIndex({ usageCount: -1 });
    await database.collection("reply_templates").createIndex({ category: 1 });

    // ── Payments ──
    await database.collection("payments").createIndex({ status: 1, createdAt: -1 });
    await database.collection("payments").createIndex({ sourceId: 1, createdAt: -1 });

    // ── เดิม (user_skills, analysis_logs, alerts, advisor, costs) ──
    await database.collection("user_skills").createIndex({ sourceId: 1, userId: 1 }, { unique: true });
    await database.collection("analysis_logs").createIndex({ sourceId: 1, analyzedAt: -1 });
    await database.collection("alerts").createIndex({ createdAt: -1 });
    await database.collection("alerts").createIndex({ read: 1, createdAt: -1 });
    await database.collection("advisor_pull_log").createIndex({ sourceId: 1 }, { unique: true });
    await database.collection("ai_costs").createIndex({ createdAt: -1 });
    await database.collection("ai_costs").createIndex({ feature: 1, createdAt: -1 });

    // ── [Audit] Audit Logs ──
    await database.collection(AUDIT_LOG_COLL).createIndex({ createdAt: -1 });
    await database.collection(AUDIT_LOG_COLL).createIndex({ action: 1, createdAt: -1 });

    // ── [Privacy] Privacy Consent ──
    await database.collection("privacy_consent").createIndex({ sourceId: 1 }, { unique: true });

    console.log("[Index] ✅ All indexes ready (messages, customers, groups, KB, memory, skills, tasks, templates, analytics, audit, privacy)");
  } catch (e) {
    if (!e.message?.includes("already exists")) {
      console.error("[Index] Error:", e.message);
    }
  }
}

// === RAG: Vector Search → Keyword Search → Recent (3-tier fallback) ===
async function searchMessages(sourceId, queryText, limit = 10) {
  const database = await getDB();
  if (!database) return [];
  const coll = database.collection(MESSAGES_COLL);

  // 1. ลอง Vector Search (ถ้ามี embedding)
  const queryEmbedding = await getEmbedding(queryText).catch(() => null);
  if (queryEmbedding) {
    try {
      const results = await coll.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: queryEmbedding,
            filter: { sourceId },
            numCandidates: 50,
            limit,
          },
        },
        { $project: { role: 1, userName: 1, content: 1, createdAt: 1, sourceId: 1, score: { $meta: "vectorSearchScore" } } },
      ]).toArray();
      if (results.length > 0) return results;
    } catch (e) { /* fallback */ }
  }

  // 2. Keyword Search (text index)
  try {
    const keywords = queryText.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s]/g, "").trim();
    if (keywords.length > 1) {
      const docs = await coll
        .find({ sourceId, content: { $regex: keywords.substring(0, 30), $options: "i" } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .project({ role: 1, userName: 1, content: 1, createdAt: 1, sourceId: 1 })
        .toArray();
      if (docs.length > 0) return docs.reverse();
    }
  } catch (e) { /* fallback */ }

  // 3. Recent messages (เร็วสุด)
  return getRecentMessages(sourceId, limit);
}

// === ดึงข้อความล่าสุด ===
async function getRecentMessages(sourceId, limit = 10) {
  const database = await getDB();
  if (!database) return [];
  try {
    const docs = await database.collection(MESSAGES_COLL)
      .find({ sourceId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({ role: 1, userName: 1, content: 1, createdAt: 1, sourceId: 1 })
      .toArray();
    return docs.reverse();
  } catch (e) {
    return [];
  }
}


// === Get group name from LINE API ===
async function getGroupName(groupId) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !groupId) return null;
  try {
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.groupName || null;
  } catch (e) {
    return null;
  }
}

// === Save/update group metadata ===
async function saveGroupMeta(sourceId, groupName, source, platform = "line") {
  const database = await getDB();
  if (!database) return;
  try {
    await database.collection("groups_meta").updateOne(
      { sourceId },
      {
        $set: {
          sourceId,
          groupName: groupName || sourceId,
          sourceType: source.type,
          platform,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  } catch (e) {}
}

// === [Route] Smart Routing — detect message topic ===
function detectMessageTopic(text) {
  if (!text) return "general";
  const lower = text.toLowerCase();
  if (/ราคา|เท่าไหร่|กี่บาท|cost|price|โปร|ลด/.test(lower)) return "sales";
  if (/ส่ง|จัดส่ง|delivery|shipping|track|ติดตาม|พัสดุ/.test(lower)) return "shipping";
  if (/เสีย|พัง|ซ่อม|ไม่ทำงาน|broken|fix|repair/.test(lower)) return "support";
  if (/คืน|เปลี่ยน|refund|return|ยกเลิก|cancel/.test(lower)) return "returns";
  if (/สั่ง|ซื้อ|order|จ่าย|โอน|ชำระ|สลิป/.test(lower)) return "orders";
  if (/ขอบคุณ|ดีมาก|สุดยอด|ประทับใจ/.test(lower)) return "feedback";
  if (/ร้องเรียน|ไม่พอใจ|แย่|ผิดหวัง|complaint/.test(lower)) return "complaint";
  return "general";
}

// === [A/B] A/B Testing AI Response Styles ===
const AB_PROMPTS = {
  A: "ตอบสั้นๆ กระชับ ไม่เกิน 2 ประโยค",
  B: "ตอบอย่างเป็นมิตร ใส่ emoji ให้รู้สึกอบอุ่น ไม่เกิน 3 ประโยค",
};

function getABVariant(sourceId) {
  // Deterministic hash based on sourceId → consistent for same customer
  const hash = sourceId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return hash % 2 === 0 ? "A" : "B";
}

// === Process LINE event → save to MongoDB ===
// เก็บทุก message type: text, image, video, audio, sticker, location, file
async function processEvent(event) {
  if (event.type !== "message") return;

  const source = event.source;
  const sourceId = source.groupId || source.roomId || source.userId;
  const msg = event.message;

  // Get user name + group name พร้อมกัน
  const [userName, groupName] = await Promise.all([
    getUserName(source),
    source.groupId ? getGroupName(source.groupId) : Promise.resolve(null),
  ]);

  // Save group metadata — ใช้ชื่อ group สำหรับ group, ชื่อ user สำหรับ DM
  const displayName = groupName || (source.type === "user" ? userName : null);
  saveGroupMeta(sourceId, displayName, source, "line").catch(() => {});

  // === เตรียม fields สำหรับเก็บ ===
  let imageData = null;
  let imageDescription = null;
  let videoUrl = null;
  let audioUrl = null;
  let audioDuration = null;
  let stickerData = null;
  let locationData = null;
  let fileData = null;
  let msgContent = "";
  const extras = []; // log suffixes

  // === Handle แต่ละ message type ===

  // 📝 Text
  if (msg.type === "text") {
    msgContent = msg.text || "";
  }

  // 🖼️ Image → download เก็บ base64 + Vision AI
  if (msg.type === "image") {
    const imgBuffer = await downloadLineImage(msg.id);
    if (imgBuffer) {
      imageData = `data:image/jpeg;base64,${imgBuffer.toString("base64")}`;
      extras.push(`+img(${(imgBuffer.length / 1024).toFixed(0)}KB)`);

      // Vision AI — วิเคราะห์รูปเป็นข้อความเก็บไว้สำหรับ RAG/analytics
      imageDescription = await analyzeImage(imgBuffer);
      if (imageDescription) {
        console.log(`[Vision] ${imageDescription.substring(0, 60)}`);
      }
    }
    msgContent = imageDescription || "[รูปภาพ]";
  }

  // 🎥 Video → download เก็บ base64 (ถ้าไม่ใหญ่เกิน) หรือเก็บ messageId
  if (msg.type === "video") {
    const vidBuffer = await downloadLineImage(msg.id); // LINE Data API ใช้ endpoint เดียวกัน
    if (vidBuffer && vidBuffer.length < 5 * 1024 * 1024) { // < 5MB → เก็บ base64
      videoUrl = `data:video/mp4;base64,${vidBuffer.toString("base64")}`;
      extras.push(`+vid(${(vidBuffer.length / 1024).toFixed(0)}KB)`);
    } else if (vidBuffer) {
      extras.push(`+vid(${(vidBuffer.length / 1024 / 1024).toFixed(1)}MB, too large for base64)`);
      // เก็บ marker ว่ามีวิดีโอ แต่ไม่เก็บ base64 (ใหญ่เกิน)
      videoUrl = `line-content://${msg.id}`;
    }
    msgContent = "[วิดีโอ]";
    audioDuration = msg.duration || null;
  }

  // 🎵 Audio → download เก็บ base64
  if (msg.type === "audio") {
    const audBuffer = await downloadLineImage(msg.id);
    if (audBuffer && audBuffer.length < 5 * 1024 * 1024) { // < 5MB
      audioUrl = `data:audio/m4a;base64,${audBuffer.toString("base64")}`;
      extras.push(`+aud(${(audBuffer.length / 1024).toFixed(0)}KB)`);
    } else if (audBuffer) {
      audioUrl = `line-content://${msg.id}`;
      extras.push(`+aud(too large)`);
    }
    msgContent = "[เสียง]";
    audioDuration = msg.duration || null;
  }

  // 😀 Sticker → เก็บ packageId + stickerId
  if (msg.type === "sticker") {
    stickerData = {
      packageId: msg.packageId || msg.stickerId ? String(msg.packageId) : null,
      stickerId: msg.stickerId ? String(msg.stickerId) : null,
      stickerResourceType: msg.stickerResourceType || null, // STATIC, ANIMATION, SOUND, etc.
      keywords: msg.keywords || [], // tags ของ sticker
    };
    msgContent = `[sticker:${msg.packageId}/${msg.stickerId}]`;
    extras.push("+sticker");
  }

  // 📍 Location → เก็บ lat/lng/title/address
  if (msg.type === "location") {
    locationData = {
      title: msg.title || "ตำแหน่งที่ตั้ง",
      address: msg.address || "",
      latitude: msg.latitude,
      longitude: msg.longitude,
    };
    msgContent = `[ตำแหน่ง: ${msg.title || ""} ${msg.address || ""}]`.trim();
    extras.push("+loc");
  }

  // 📎 File → download + เก็บข้อมูลไฟล์
  if (msg.type === "file") {
    const fileBuffer = await downloadLineImage(msg.id);
    if (fileBuffer && fileBuffer.length < 5 * 1024 * 1024) {
      const ext = (msg.fileName || "").split(".").pop() || "bin";
      fileData = {
        fileName: msg.fileName || "file",
        fileSize: msg.fileSize || fileBuffer.length,
        data: `data:application/octet-stream;base64,${fileBuffer.toString("base64")}`,
      };
      extras.push(`+file(${msg.fileName})`);
    }
    msgContent = `[ไฟล์: ${msg.fileName || "unknown"}]`;
  }

  // Fallback content
  if (!msgContent) msgContent = `[${msg.type}]`;

  // === [Route] Detect topic for smart routing ===
  const topic = detectMessageTopic(msgContent);

  // === Save to MongoDB — เก็บทุก field ===
  await saveMsg(sourceId, {
    role: "user",
    userName,
    userId: source.userId,
    content: msgContent,
    messageType: msg.type,
    topic,
    // Media fields
    imageUrl: imageData,
    imageDescription: imageDescription || null,
    videoUrl: videoUrl,
    audioUrl: audioUrl,
    audioDuration: audioDuration,
    sticker: stickerData,
    location: locationData,
    file: fileData,
    // Metadata
    hasImage: !!imageData,
    hasVideo: !!videoUrl,
    hasAudio: !!audioUrl,
    hasSticker: !!stickerData,
    hasLocation: !!locationData,
    hasFile: !!fileData,
    groupId: source.groupId || source.roomId,
    messageId: msg.id,
    timestamp: event.timestamp,
  }, "line");

  console.log(
    `[MSG] ${userName}: ${msgContent.substring(0, 60)} ${extras.join(" ")}`
  );
}

// === MCP Client — เชื่อม MCP servers ภายนอก ===
const mcpTools = []; // tools จาก MCP servers
const mcpToolHandlers = {}; // toolName → { serverUrl, apiKey }

async function connectMCPServer(name, sseUrl, apiKey) {
  try {
    console.log(`[MCP] Connecting to ${name}: ${sseUrl}`);
    const headers = { Accept: "text/event-stream" };
    if (apiKey) headers["X-API-Key"] = apiKey;

    const res = await fetch(sseUrl, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) { console.error(`[MCP] ${name} HTTP ${res.status}`); return; }

    // อ่าน SSE stream เพื่อหา endpoint URL
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let messageEndpoint = null;

    // อ่าน SSE events จนกว่าจะได้ endpoint
    const timeout = setTimeout(() => reader.cancel(), 8000);
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.substring(5).trim();
            try {
              const parsed = JSON.parse(data);
              if (parsed.endpoint) messageEndpoint = new URL(parsed.endpoint, sseUrl).href;
            } catch (e) {
              // อาจเป็น endpoint URL ตรงๆ
              if (data.startsWith("/") || data.startsWith("http")) {
                messageEndpoint = data.startsWith("http") ? data : new URL(data, sseUrl).href;
              }
            }
          }
          if (line.startsWith("event: endpoint")) {
            // next data line จะเป็น endpoint
          }
        }
        if (messageEndpoint) break;
      }
    } finally {
      clearTimeout(timeout);
      reader.cancel().catch(() => {});
    }

    if (!messageEndpoint) {
      // Fallback: ใช้ SSE URL เปลี่ยน /sse เป็น /message
      messageEndpoint = sseUrl.replace("/sse", "/message");
      console.log(`[MCP] ${name} no endpoint from SSE, fallback: ${messageEndpoint}`);
    } else {
      console.log(`[MCP] ${name} endpoint: ${messageEndpoint}`);
    }

    // เปิด SSE ค้างไว้ เพื่อรับ response + ส่ง tools/list
    const sseHeaders2 = { Accept: "text/event-stream" };
    if (apiKey) sseHeaders2["X-API-Key"] = apiKey;
    const sseRes2 = await fetch(sseUrl, { headers: sseHeaders2 });
    const reader2 = sseRes2.body.getReader();
    const decoder2 = new TextDecoder();
    let sseBuf = "";
    let sseEndpoint = null;

    // อ่าน endpoint
    const ep = await new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), 5000);
      (async () => {
        while (true) {
          const { done, value } = await reader2.read();
          if (done) break;
          sseBuf += decoder2.decode(value, { stream: true });
          const ls = sseBuf.split("\n"); sseBuf = ls.pop();
          for (const l of ls) {
            if (l.startsWith("data:")) {
              const d = l.substring(5).trim();
              if (d.startsWith("/")) { clearTimeout(t); resolve(d); return; }
            }
          }
        }
      })();
    });

    if (!ep) { reader2.cancel().catch(() => {}); return; }
    sseEndpoint = new URL(ep, sseUrl).href;

    // ส่ง tools/list (response จะมาทาง SSE)
    fetch(sseEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(apiKey ? { "X-API-Key": apiKey } : {}) },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    }).catch(() => {});

    // อ่าน tools/list response จาก SSE
    const toolsResult = await new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), 10000);
      (async () => {
        while (true) {
          const { done, value } = await reader2.read();
          if (done) break;
          sseBuf += decoder2.decode(value, { stream: true });
          const ls = sseBuf.split("\n"); sseBuf = ls.pop();
          for (const l of ls) {
            if (l.startsWith("data:")) {
              try {
                const parsed = JSON.parse(l.substring(5).trim());
                if (parsed.result?.tools) { clearTimeout(t); resolve(parsed.result.tools); return; }
              } catch (e) {}
            }
          }
        }
      })();
    });
    reader2.cancel().catch(() => {});

    const tools = toolsResult || [];
    console.log(`[MCP] ${name}: ${tools.length} tools loaded`);

    // เก็บ SSE URL + endpoint สำหรับ tool calls
    for (const tool of tools) {
      mcpTools.push({
        type: "function",
        function: {
          name: `mcp_${name}_${tool.name}`,
          description: tool.description || tool.name,
          parameters: tool.inputSchema || { type: "object", properties: {} },
        },
      });
      mcpToolHandlers[`mcp_${name}_${tool.name}`] = { sseUrl, apiKey, originalName: tool.name };
      console.log(`[MCP]   → ${tool.name}: ${(tool.description || "").substring(0, 60)}`);
    }
  } catch (e) {
    console.error(`[MCP] ${name} error:`, e.message);
  }
}

// === Call MCP Tool (เปิด SSE → send → อ่าน response จาก SSE) ===
async function callMCPTool(toolName, args) {
  const handler = mcpToolHandlers[toolName];
  if (!handler) return "Unknown MCP tool";
  try {
    const headers = { Accept: "text/event-stream" };
    if (handler.apiKey) headers["X-API-Key"] = handler.apiKey;

    // เปิด SSE
    const sseRes = await fetch(handler.sseUrl, { headers });
    const reader = sseRes.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let endpoint = null;

    // อ่าน endpoint
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const ls = buf.split("\n"); buf = ls.pop();
      for (const l of ls) {
        if (l.startsWith("data:") && l.substring(5).trim().startsWith("/")) {
          endpoint = new URL(l.substring(5).trim(), handler.sseUrl).href;
        }
      }
      if (endpoint) break;
    }

    if (!endpoint) { reader.cancel().catch(() => {}); return "MCP: no endpoint"; }

    // ส่ง tool call
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(handler.apiKey ? { "X-API-Key": handler.apiKey } : {}) },
      body: JSON.stringify({
        jsonrpc: "2.0", id: Date.now(),
        method: "tools/call",
        params: { name: handler.originalName, arguments: args },
      }),
    }).catch(() => {});

    // อ่าน response จาก SSE
    const result = await new Promise((resolve) => {
      const t = setTimeout(() => resolve("MCP: timeout"), 15000);
      (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const ls = buf.split("\n"); buf = ls.pop();
          for (const l of ls) {
            if (l.startsWith("data:")) {
              try {
                const parsed = JSON.parse(l.substring(5).trim());
                if (parsed.result?.content) {
                  clearTimeout(t);
                  resolve(parsed.result.content.map((c) => c.text || JSON.stringify(c)).join("\n"));
                  return;
                }
                if (parsed.error) {
                  clearTimeout(t);
                  resolve(`MCP Error: ${parsed.error.message}`);
                  return;
                }
              } catch (e) {}
            }
          }
        }
      })();
    });
    reader.cancel().catch(() => {});
    return result || "No result";
  } catch (e) {
    return `MCP Error: ${e.message}`;
  }
}

// === Connect MCP servers on startup ===
async function initMCPServers() {
  const servers = [
    {
      name: "erp",
      url: process.env.MCP_ERP_URL || "https://dev.bcaicloud.com/goapi/mcp/sse",
      apiKey: process.env.MCP_ERP_API_KEY || "",
    },
  ].filter((s) => s.url);

  for (const server of servers) {
    await connectMCPServer(server.name, server.url, server.apiKey);
  }
  console.log(`[MCP] Total tools: ${mcpTools.length}`);
}

// === Agent Tools — AI เรียกได้ (built-in + MCP) ===
const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_history",
      description: "ค้นหาประวัติสนทนาที่เกี่ยวข้องจากฐานข้อมูล ใช้เมื่อต้องการหาว่าเคยคุยเรื่องอะไร",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "คำค้นหา เช่น 'ราคา' 'นัดหมาย' 'สินค้า'" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_analytics",
      description: "ดูคะแนนวิเคราะห์ความรู้สึกและแนวโน้มซื้อของลูกค้า",
      parameters: { type: "object", properties: {} },
    },
  },
];

// === Execute Tool ===
async function executeTool(toolName, args, sourceId) {
  if (toolName === "search_history") {
    const docs = await searchMessages(sourceId, args.query || "", 5);
    if (docs.length === 0) {
      const recent = await getRecentMessages(sourceId, 5);
      return recent.map((d) => `[${d.role === "assistant" ? "Bot" : d.userName || "User"}] ${d.content}`).join("\n") || "ไม่มีประวัติ";
    }
    return docs.map((d) => `[${d.role === "assistant" ? "Bot" : d.userName || "User"}] ${d.content}`).join("\n");
  }
  if (toolName === "get_analytics") {
    const database = await getDB();
    if (!database) return "ไม่มีข้อมูล";
    const data = await database.collection("chat_analytics").findOne({ sourceId });
    if (!data) return "ยังไม่มีการวิเคราะห์";
    return `Sentiment: ${data.sentiment?.score}/100 (${data.sentiment?.level}) — ${data.sentiment?.reason}\nPurchase: ${data.purchaseIntent?.score}/100 (${data.purchaseIntent?.level}) — ${data.purchaseIntent?.reason}`;
  }
  // MCP tools
  if (mcpToolHandlers[toolName]) {
    return await callMCPTool(toolName, args);
  }
  return "Unknown tool";
}

// === AI Provider — fallback chain + rate limit cooldown ===
const providerCooldown = {}; // provider → timestamp ที่จะหมด cooldown

async function callProvider(messages, tools) {
  const providers = [
    // ─── ฟรี (auto-discover จาก OpenRouter ทุก 1 ชม.) ───
    ...getOpenRouterFreeProviders(),
    // ─── ฟรี (dedicated) ───
    { name: "SambaNova", url: "https://api.sambanova.ai/v1/chat/completions", key: process.env.SAMBANOVA_API_KEY, model: "Qwen3-235B" },
    // ─── เสียเงิน (ต้องเปิด PAID_AI_ENABLED=true) ───
    ...(PAID_AI ? [
      { name: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", key: process.env.GROQ_API_KEY, model: "llama-3.3-70b-versatile" },
      { name: "Cerebras", url: "https://api.cerebras.ai/v1/chat/completions", key: process.env.CEREBRAS_API_KEY, model: "qwen-3-235b-a22b-instruct-2507" },
    ] : []),
  ].filter((p) => p.key);

  for (const provider of providers) {
    // Skip ถ้ายังอยู่ใน cooldown (rate limit)
    const cooldownUntil = providerCooldown[provider.name] || 0;
    if (Date.now() < cooldownUntil) {
      console.log(`[AI] ⏭️ Skip ${provider.name} (cooldown ${Math.ceil((cooldownUntil - Date.now()) / 1000)}s)`);
      continue;
    }

    try {
      const body = { model: provider.model, messages, max_tokens: 800 };
      if (tools && tools.length > 0) body.tools = tools;

      const res = await fetch(provider.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        const errMsg = JSON.stringify(data.error).substring(0, 100);
        console.error(`[AI] ${provider.name} error:`, errMsg);
        // Rate limit → cooldown 60 วินาที
        if (errMsg.includes("rate") || errMsg.includes("limit") || errMsg.includes("429")) {
          providerCooldown[provider.name] = Date.now() + 1800000; // cooldown 30 นาที
          console.log(`[AI] 🕐 ${provider.name} cooldown 60s`);
        }
        continue;
      }
      const choice = data.choices?.[0];
      if (choice) {
        const usage = data.usage || {};
        console.log(`[AI] ✅ ${provider.name} (${provider.model}) tokens: ${usage.total_tokens || 0}`);
        trackAICost({
          provider: provider.name, model: provider.model, feature: tools?.length ? "chat-tools" : "chat-reply",
          inputTokens: usage.prompt_tokens || 0,
          outputTokens: usage.completion_tokens || 0,
        });
        // ถ้าเป็นตัวเสียเงิน → cooldown 5 นาที เพื่อให้ตัวฟรีลองก่อนรอบถัดไป
        const pricing = AI_PRICING[provider.name];
        if (pricing && (pricing.input > 0 || pricing.output > 0)) {
          providerCooldown[provider.name] = Date.now() + 300000; // 5 min
          console.log(`[AI] 💰 ${provider.name} เสียเงิน → cooldown 5m ให้ตัวฟรีลองก่อน`);
        }
        return {
          provider: provider.name,
          model: provider.model,
          message: choice.message,
          finishReason: choice.finish_reason,
          usage: {
            prompt: usage.prompt_tokens || 0,
            completion: usage.completion_tokens || 0,
            total: usage.total_tokens || 0,
          },
        };
      }
    } catch (e) {
      console.error(`[AI] ${provider.name} error:`, e.message);
    }
  }
  return null;
}

// === Agentic AI — loop จนได้คำตอบ ===
const MAX_STEPS = 8;

async function askAI(userText, sourceId) {
  // ดึง recent messages + RAG context
  const recent = await getRecentMessages(sourceId, 10);
  let relevant = [];
  try {
    relevant = await Promise.race([
      searchMessages(sourceId, userText, 5),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
  } catch (e) {}

  // Deduplicate context
  const seenIds = new Set();
  const contextDocs = [];
  for (const doc of [...relevant, ...recent]) {
    const id = doc._id?.toString();
    if (id && !seenIds.has(id)) { seenIds.add(id); contextDocs.push(doc); }
  }

  const contextStr = contextDocs.length > 0
    ? contextDocs.map((d) => `[${d.role === "assistant" ? "น้องกุ้ง" : d.userName || "User"}] ${d.content}`).join("\n")
    : "";

  const botConfig = await getBotConfig(sourceId);
  const systemPrompt = botConfig.systemPrompt || DEFAULT_PROMPT;

  // สร้าง MCP tools list สำหรับ prompt
  const mcpToolNames = mcpTools.map((t) => `- ${t.function.name}: ${t.function.description.substring(0, 80)}`).join("\n");

  const messages = [
    {
      role: "system",
      content: `${systemPrompt}

${contextStr ? `ประวัติสนทนาที่เกี่ยวข้อง:\n${contextStr}` : ""}

## วิธีทำงาน — Deep Agentic Loop (สำคัญมาก)
คุณทำงานแบบ step-by-step สูงสุด 8 steps โดย **เจาะลึกข้อมูลให้มากที่สุด**:

**Step 1: วิเคราะห์คำถาม + วางแผน**
- คำถามนี้ต้องการข้อมูลอะไรบ้าง? วาง plan ว่าต้องเรียก tool อะไรบ้าง
- ถ้ามี MCP tool ที่เกี่ยวข้อง → เรียกใช้ทันที อย่าเดาคำตอบ
- ถ้าคำถามกว้าง → วางแผนเรียก tools หลายตัว

**Step 2-6: เจาะลึก — ถามตัวเองทุก step**
หลังได้ผลจาก tool ให้ถามตัวเอง 3 คำถามนี้:
1. "ทำไม?" — ตัวเลขนี้สูง/ต่ำเพราะอะไร? → เรียก tool เพิ่มเพื่อหาสาเหตุ
2. "เทียบกับอะไร?" — เปรียบเทียบกับเดือนก่อน/ปีก่อน → เรียก get_mom_comparison หรือ get_yoy_comparison
3. "มีอะไรเกี่ยวข้องอีก?" — ยอดขายสูง + สต็อกต่ำ = ต้องสั่งของ → เรียก get_low_stock_alerts

**Step 7-8: สรุป + แนะนำ + ถาม user**
- สรุปข้อมูลทั้งหมดที่ได้
- วิเคราะห์ insight: แนวโน้ม, จุดเด่น, จุดอ่อน, ข้อเสนอแนะ
- **ท้ายข้อความ ถาม user เสมอ** ว่าอยากดูอะไรเพิ่ม เช่น:
  "📌 อยากดูเพิ่มมั้ยคะ? เช่น แยกตามพนักงาน / เทียบกับปีก่อน / ดูสินค้าค้างสต็อก"

**ตัวอย่าง Deep Loop:**

คำถาม: "ยอดขายเดือนนี้"
- Step 1: get_monthly_summary → ยอด 500K
- Step 2: "ทำไม?" → get_mom_comparison → ลด 15% จากเดือนก่อน
- Step 3: "อะไรลด?" → get_top_selling_products → สินค้า A ลด 40%
- Step 4: "สต็อกพอมั้ย?" → get_low_stock_alerts → สินค้า A สต็อกเหลือ 5
- Step 5: สรุป + insight + แนะนำ + ถาม user

คำถาม: "สุขภาพธุรกิจ"
- Step 1: get_business_health → score 72/100
- Step 2: get_dashboard_kpis → ยอดขาย กำไร ออเดอร์
- Step 3: get_profit_analysis → margin ลด
- Step 4: get_accounts_receivable → ลูกหนี้ค้าง 200K
- Step 5: get_low_stock_alerts → สินค้าใกล้หมด 8 ตัว
- Step 6: get_customer_growth → ลูกค้าใหม่ลด
- Step 7: สรุปภาพรวม + จุดเด่น/จุดอ่อน + action items + ถาม user

คำถาม: "สวัสดี" (แค่ทักทาย)
- Step 1: ไม่ต้อง loop → ทักทายกลับเลย (ไม่เจาะลึก)

## กฎเลือก Tool
| คำถามเกี่ยวกับ | ใช้ tool |
|---|---|
| สินค้า/ราคา/สต็อก | mcp_erp_search_products, mcp_erp_list_barcodes |
| ยอดขายวันนี้ | mcp_erp_get_daily_sales |
| ยอดขายช่วงเวลา | mcp_erp_get_sales_by_date_range |
| สินค้าขายดี | mcp_erp_get_top_selling_products |
| KPI/ภาพรวม | mcp_erp_get_dashboard_kpis |
| สุขภาพธุรกิจ | mcp_erp_get_business_health |
| กำไร/ต้นทุน | mcp_erp_get_profit_analysis |
| ลูกค้า | mcp_erp_get_top_customers, mcp_erp_get_customer_segments |
| สต็อก/คลัง | mcp_erp_get_inventory_value, mcp_erp_get_low_stock_alerts |
| สินค้าค้างสต็อก | mcp_erp_get_dead_stock |
| ลูกหนี้ | mcp_erp_list_debtors, mcp_erp_get_accounts_receivable |
| เจ้าหนี้ | mcp_erp_list_creditors, mcp_erp_get_accounts_payable |
| เปรียบเทียบ YoY | mcp_erp_get_yoy_comparison |
| เปรียบเทียบ MoM | mcp_erp_get_mom_comparison |
| ยอดขายตามพนักงาน | mcp_erp_get_sales_by_seller |
| กระแสเงินสด | mcp_erp_get_cash_flow |
| ประวัติสนทนา | search_history |
| อารมณ์ลูกค้า | get_analytics |

## กฎสำคัญ
- **ห้ามตอบว่า "ไม่มีข้อมูล" โดยไม่ค้นก่อน** — ต้องเรียก tool ค้นก่อนเสมอ
- **ข้อมูลจาก MCP ให้แสดงรายละเอียดให้มากที่สุด** แสดงเป็น list ให้อ่านง่าย:
  • สินค้า: ชื่อ, รหัส, บาร์โค้ด, ราคา, หน่วยนับ, หมวด, กลุ่ม
  • สต็อก: จำนวนคงเหลือ, คลัง, ตำแหน่ง
  • **แม้สินค้าหมดสต็อก (0) ก็ต้องแสดงราคาและรายละเอียดด้วย** — ผู้ใช้ต้องรู้ว่าสินค้ามีในระบบ ราคาเท่าไหร่ แค่หมดชั่วคราว
  • ยอดขาย: จำนวน, มูลค่า, เปรียบเทียบ, แนวโน้ม
  • ลูกค้า/ลูกหนี้: ชื่อ, รหัส, ยอดค้าง, วันครบกำหนด
- ถ้ามีหลายรายการ ให้แสดงทุกรายการ อย่าตัดหรือย่อ (ยกเว้นเกิน 20 รายการ ให้แสดง top 20 + บอกว่ามีอีก)
- จัดรูปแบบให้สวย: ใช้ bullet points, ตัวหนา, emoji
- **ห้ามซ่อนข้อมูลที่ได้มา** — แสดงทุกอย่างที่ tool return มา ผู้ใช้ต้องเห็นข้อมูลครบ
- ห้ามแสดง error, JSON raw, technical details → สรุปเป็นภาษาคนอ่านง่าย
- ตอบเป็นภาษาไทยเสมอ ใช้ emoji พอเหมาะ
- ถ้า tool return error → ลอง tool อื่น หรือบอกผู้ใช้สุภาพ`
    },
  ];

  // เพิ่ม conversation flow
  for (const doc of recent.slice(-5)) {
    if (doc.role === "user" && doc.content) messages.push({ role: "user", content: doc.content });
    else if (doc.role === "assistant" && doc.content) messages.push({ role: "assistant", content: doc.content });
  }
  messages.push({ role: "user", content: userText });

  // === Agentic Loop ===
  let totalTokens = { prompt: 0, completion: 0, total: 0 };
  let lastModel = "";
  let lastProvider = "";
  let stepCount = 0;
  const toolsUsed = []; // เก็บ tools ที่เรียก
  let mcpUsed = false;
  const startTime = Date.now();

  for (let step = 0; step < MAX_STEPS; step++) {
    console.log(`[Agent] Step ${step + 1}/${MAX_STEPS}`);
    stepCount = step + 1;

    const allTools = [...AGENT_TOOLS, ...mcpTools];
    const result = await callProvider(messages, allTools);
    if (!result) break;

    lastModel = result.model;
    lastProvider = result.provider;
    totalTokens.prompt += result.usage?.prompt || 0;
    totalTokens.completion += result.usage?.completion || 0;
    totalTokens.total += result.usage?.total || 0;

    const msg = result.message;

    // ถ้า AI เรียก tool
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push(msg);

      for (const tc of msg.tool_calls) {
        const toolName = tc.function.name;
        let toolArgs = {};
        try { toolArgs = JSON.parse(tc.function.arguments || "{}"); } catch (e) {}

        // Track tool usage
        const shortName = toolName.replace("mcp_erp_", "");
        toolsUsed.push(shortName);
        if (toolName.startsWith("mcp_")) mcpUsed = true;

        console.log(`[Agent] 🔧 Tool: ${toolName}(${JSON.stringify(toolArgs).substring(0, 50)})`);
        const toolResult = await executeTool(toolName, toolArgs, sourceId);
        console.log(`[Agent] 📋 Result: ${toolResult.substring(0, 80)}`);

        messages.push({ role: "tool", tool_call_id: tc.id, content: toolResult });
      }
      continue;
    }

    // ถ้า AI ตอบเลย
    if (msg.content) {
      const footer = buildFooter(lastProvider, lastModel, totalTokens, stepCount, toolsUsed, mcpUsed, startTime);
      const quickReplies = generateQuickReplies(toolsUsed, mcpUsed);
      console.log(`[Agent] 💬 Final (step ${stepCount}): ${msg.content.substring(0, 60)}`);
      return { text: msg.content + footer, quickReplies };
    }
  }

  // Fallback
  console.log("[Agent] Loop exhausted, final call without tools...");
  const finalResult = await callProvider(messages, null);
  if (finalResult?.message?.content) {
    totalTokens.total += finalResult.usage?.total || 0;
    const footer = buildFooter(finalResult.provider, finalResult.model, totalTokens, stepCount, toolsUsed, mcpUsed, startTime);
    return { text: finalResult.message.content + footer, quickReplies: generateQuickReplies(toolsUsed, mcpUsed) };
  }
  return { text: "ปูขอโทษค่ะ ตอนนี้ตอบไม่ได้ ลองถามใหม่นะคะ 🙏", quickReplies: [] };
}

// === สร้าง Quick Reply ตามบริบท ===
function generateQuickReplies(toolsUsed, mcpUsed) {
  const suggestions = [];

  // ถ้าเพิ่งดูยอดขาย → แนะนำเจาะลึก
  if (toolsUsed.some((t) => t.includes("sales") || t.includes("monthly") || t.includes("daily"))) {
    suggestions.push("📈 เทียบเดือนก่อน", "👨‍💼 แยกตามพนักงาน", "🏆 สินค้าขายดี", "💰 วิเคราะห์กำไร");
  }
  // ถ้าเพิ่งดูสินค้า → แนะนำดูเพิ่ม
  else if (toolsUsed.some((t) => t.includes("product") || t.includes("barcode") || t.includes("search"))) {
    suggestions.push("📦 เช็คสต็อก", "📉 สินค้าค้างสต็อก", "🏆 สินค้าขายดี", "💰 ดูราคา");
  }
  // ถ้าเพิ่งดู KPI / สุขภาพธุรกิจ
  else if (toolsUsed.some((t) => t.includes("kpi") || t.includes("health") || t.includes("profit"))) {
    suggestions.push("📊 ยอดขายเดือนนี้", "👥 ลูกค้า Top 10", "⚠️ สต็อกต่ำ", "💳 ลูกหนี้ค้าง");
  }
  // ถ้าเพิ่งดูลูกค้า
  else if (toolsUsed.some((t) => t.includes("customer") || t.includes("debtor"))) {
    suggestions.push("📊 ยอดขายวันนี้", "🏆 สินค้าขายดี", "💳 ลูกหนี้ค้าง", "📈 การเติบโต");
  }
  // ถ้าเพิ่งดูสต็อก
  else if (toolsUsed.some((t) => t.includes("inventory") || t.includes("stock") || t.includes("dead"))) {
    suggestions.push("📊 ยอดขายเดือนนี้", "🏆 สินค้าขายดี", "💰 มูลค่าสต็อก", "📉 สินค้าค้างนาน");
  }
  // default — ทักทาย/คำถามทั่วไป
  else {
    suggestions.push("📊 ยอดขายวันนี้", "🏥 สุขภาพธุรกิจ", "🏆 สินค้าขายดี", "📦 เช็คสต็อก");
  }

  return suggestions.slice(0, 4); // LINE Quick Reply max 13 แต่ 4 พอดี
}

// === สร้าง footer แสดงสถิติ ===
function buildFooter(provider, model, tokens, steps, tools, mcpUsed, startTime) {
  const cost = estimateCost(provider, tokens);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const toolList = tools.length > 0 ? tools.join(", ") : "-";

  return `\n\n---\n📊 Model: ${provider}/${model}\n🔢 Tokens: ${tokens.total.toLocaleString()} (in:${tokens.prompt.toLocaleString()} out:${tokens.completion.toLocaleString()})\n💰 Cost: ${cost}\n🔄 Loop: ${steps} step${steps > 1 ? "s" : ""}\n🔧 Tools: ${toolList}\n🔌 MCP: ${mcpUsed ? "✅ ใช้" : "❌ ไม่ใช้"}\n⏱️ Time: ${elapsed}s`;
}

// === คำนวณค่าใช้จ่ายโดยประมาณ (เงินบาท) ===
function estimateCost(provider, tokens) {
  // ราคาต่อ 1M tokens (USD) — ฟรีทั้งหมดแต่แสดงราคาจริงถ้าเสียเงิน
  const rates = {
    SambaNova: { input: 0, output: 0 },
    Groq: { input: 0.05, output: 0.08 },
    Cerebras: { input: 0, output: 0 },
    OpenRouter: { input: 0, output: 0 },
  };
  const rate = rates[provider] || { input: 0, output: 0 };
  const usd = (tokens.prompt * rate.input + tokens.completion * rate.output) / 1_000_000;
  const thb = usd * 35; // อัตราแลกเปลี่ยนประมาณ
  if (thb < 0.01) return "฿0.00 (ฟรี)";
  return `฿${thb.toFixed(2)}`;
}

// === ส่ง reply กลับ LINE (พร้อม Quick Reply) ===
async function replyToLine(replyToken, text, quickReplies) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !replyToken) return false;
  try {
    const message = { type: "text", text };

    // เพิ่ม Quick Reply ปุ่มกด (ฟรี ใช้ reply token)
    if (quickReplies && quickReplies.length > 0) {
      message.quickReply = {
        items: quickReplies.map((label) => ({
          type: "action",
          action: { type: "message", label: label.substring(0, 20), text: label },
        })),
      };
    }

    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ replyToken, messages: [message] }),
    });
    return res.ok;
  } catch (e) {
    console.error("[LINE] Reply error:", e.message);
    return false;
  }
}

// === น้องกุ้งตอบแทน — ตรวจสอบว่าควรตอบหรือไม่ ===
async function shouldAiReply(config, text, userName, source) {
  const mode = config.aiReplyMode || "off";
  if (mode === "off") return false;

  // ไม่ตอบข้อความจากพนักงาน SML
  if (userName && userName.startsWith("SML")) return false;

  // mode: auto → ตอบทุกข้อความ (ยกเว้นพนักงาน)
  if (mode === "auto") return true;

  // mode: mention → ตอบเมื่อมีคำว่า "น้องกุ้ง" หรือ "น้องกุ้ง" หรือชื่อ bot
  if (mode === "mention") {
    const botName = (config.botName || "น้องกุ้ง").toLowerCase();
    const lower = text.toLowerCase();
    return lower.includes(botName) || lower.includes("น้องกุ้ง") || lower.includes("น้องกุ้ง");
  }

  // mode: keyword → ตอบเมื่อมี keyword ที่กำหนด
  if (mode === "keyword") {
    const keywords = config.aiReplyKeywords || [];
    if (keywords.length === 0) return false;
    const lower = text.toLowerCase();
    return keywords.some((kw) => lower.includes(kw.toLowerCase()));
  }

  return false;
}

// === น้องกุ้งตอบแทนใน LINE (ใช้ Reply API — ฟรี!) ===
async function aiReplyToLine(event, sourceId, userName, text, config) {
  const startTime = Date.now();

  // ดึง context จาก RAG
  const contextDocs = await searchMessages(sourceId, text).catch(() => []);
  const contextStr = contextDocs.slice(0, 5)
    .map((d) => `[${d.role === "assistant" ? config.botName || "น้องกุ้ง" : d.userName || "User"}] ${d.content}`)
    .join("\n");

  // [A/B] Append A/B variant instruction to system prompt
  const variant = getABVariant(sourceId);
  const abInstruction = AB_PROMPTS[variant];

  const systemPrompt = config.systemPrompt || DEFAULT_PROMPT;
  const messages = [
    { role: "system", content: `${systemPrompt}\n\nสไตล์การตอบ: ${abInstruction}\n\nประวัติสนทนา:\n${contextStr || "(ไม่มี)"}` },
    { role: "user", content: cleanForAI(text) },
  ];

  // เรียก AI (ใช้ LightAI ประหยัด token)
  const reply = await callLightAI(messages, { maxTokens: 300, timeout: 15000 }).catch(() => null);
  if (!reply) {
    console.log("[AI-Reply] AI ไม่ตอบ — skip");
    return;
  }

  // AI บอก "รอทีมงาน" → สร้าง alert ให้ dashboard
  if (/รอทีมงาน/.test(reply)) {
    await createAiHandoffAlert(sourceId, userName, text);
  }

  // ส่งกลับด้วย Reply API (ฟรี!)
  const sent = await replyToLine(event.replyToken, reply);
  if (sent) {
    // เก็บ reply ลง MongoDB
    await saveMsg(sourceId, {
      role: "assistant",
      userName: config.botName || "น้องกุ้ง",
      content: reply,
      messageType: "text",
      isAiReply: true,
      abVariant: variant,
    }, "line");

    // Track cost
    const elapsed = Date.now() - startTime;
    console.log(`[AI-Reply] ✅ ตอบใน ${elapsed}ms: ${reply.substring(0, 50)}`);
  }
}

// === น้องกุ้งตอบแทนใน Facebook/Instagram (Send API — ฟรี!) ===
async function aiReplyToMeta(senderId, text, sourceId, platform) {
  const contextDocs = await searchMessages(sourceId, text).catch(() => []);
  const contextStr = contextDocs.slice(0, 5)
    .map((d) => `[${d.role === "assistant" ? "น้องกุ้ง" : d.userName || "User"}] ${d.content}`)
    .join("\n");

  // [A/B] Append A/B variant instruction
  const variant = getABVariant(sourceId);
  const abInstruction = AB_PROMPTS[variant];

  const messages = [
    { role: "system", content: `${DEFAULT_PROMPT}\n\nสไตล์การตอบ: ${abInstruction}\n\nประวัติสนทนา:\n${contextStr || "(ไม่มี)"}` },
    { role: "user", content: cleanForAI(text) },
  ];

  const reply = await callLightAI(messages, { maxTokens: 300, timeout: 15000 }).catch(() => null);
  if (!reply) return;

  // AI บอก "รอทีมงาน" → สร้าง alert ให้ dashboard
  if (/รอทีมงาน/.test(reply)) {
    await createAiHandoffAlert(sourceId, senderId, text, platform);
  }

  const sent = await sendMetaMessage(senderId, reply);
  if (sent) {
    await saveMsg(sourceId, {
      role: "assistant",
      userName: "น้องกุ้ง",
      content: reply,
      messageType: "text",
      isAiReply: true,
      abVariant: variant,
    }, platform);
    console.log(`[AI-Reply] ✅ ${platform}: ${reply.substring(0, 50)}`);
  }
}

// === Push message (fallback — รองรับ Quick Reply ด้วย) ===
async function pushToLine(to, text, quickReplies) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !to) return;
  try {
    const message = { type: "text", text };
    // Push message รองรับ Quick Reply เหมือน reply
    if (quickReplies && quickReplies.length > 0) {
      message.quickReply = {
        items: quickReplies.map((label) => ({
          type: "action",
          action: { type: "message", label: label.substring(0, 20), text: label },
        })),
      };
    }
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to,
        messages: [message],
      }),
    });
  } catch (e) {
    console.error("[LINE] Push error:", e.message);
  }
}

// === Slow Response Detection — เตือนตอบช้าเกิน 1 นาที ===
const SLOW_THRESHOLD_MS = 60000; // 1 นาที

async function checkSlowResponse(sourceId, staffName) {
  const nameUpper = (staffName || "").toUpperCase();
  if (!nameUpper.startsWith("SML")) return; // เฉพาะพนักงาน

  const database = await getDB();
  if (!database) return;

  // หาข้อความก่อนหน้าของลูกค้า (ล่าสุด)
  const lastMsgs = await database.collection(MESSAGES_COLL)
    .find({ sourceId })
    .sort({ createdAt: -1 })
    .limit(5)
    .project({ userName: 1, createdAt: 1 })
    .toArray();

  if (lastMsgs.length < 2) return;

  // ข้อความแรก = ตัวที่เพิ่งส่ง (พนักงาน), หาข้อความลูกค้าก่อนหน้า
  const staffMsg = lastMsgs[0]; // ข้อความล่าสุด (พนักงาน)
  const customerMsg = lastMsgs.find((m, i) => {
    if (i === 0) return false;
    const n = (m.userName || "").toUpperCase();
    return !n.startsWith("SML") && !n.includes("น้องกุ้ง");
  });

  if (!customerMsg || !customerMsg.createdAt || !staffMsg.createdAt) return;

  const diffMs = new Date(staffMsg.createdAt).getTime() - new Date(customerMsg.createdAt).getTime();
  if (diffMs <= 0 || diffMs > 86400000) return; // ข้ามถ้าลำดับผิดหรือเกิน 24 ชม.

  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMs > SLOW_THRESHOLD_MS) {
    // เตือน! ตอบช้าเกิน 1 นาที
    await database.collection("alerts").insertOne({
      type: "slow_response",
      sourceId,
      staffName,
      customerName: customerMsg.userName,
      responseMinutes: diffMinutes,
      level: diffMinutes > 30 ? "red" : diffMinutes > 5 ? "yellow" : "green",
      message: `${staffName} ตอบช้า ${diffMinutes} นาที (ลูกค้า: ${customerMsg.userName})`,
      read: false,
      createdAt: new Date(),
    });
    console.log(`[ALERT] ⚠️ ${staffName} ตอบช้า ${diffMinutes} นาที ในห้อง ${sourceId.substring(0, 8)}`);
  }
}

// === Skill-Based Analytics — แยกคน แยกห้อง ประหยัด token ===
// แต่ละข้อความ → ดึง skill เดิมของคนนั้น + ข้อความใหม่ → AI อัปเดต skill → รวมเป็นห้อง

async function analyzeChat(sourceId, userName, messageText, lineUserId, source) {
  if (!messageText || messageText === "undefined") return;
  if (messageText.trim().length < 2) return;

  const database = await getDB();
  if (!database) return;

  const nameUpper = (userName || "").toUpperCase();
  const isStaff = nameUpper.startsWith("SML") || nameUpper.startsWith("SML-");
  const isBot = nameUpper.includes("น้องกุ้ง") || nameUpper === "น้องกุ้ง";
  if (isBot) return; // ข้ามข้อความจาก bot เก่า
  const userId = userName || "Unknown";
  const skillKey = { sourceId, userId }; // แยกคน-แยกห้อง

  try {
    // 1. ดึง skill เดิมของคนนี้ในห้องนี้
    const existingSkill = await database.collection("user_skills").findOne(skillKey);
    const prevSkill = existingSkill ? {
      sentiment: existingSkill.sentiment,
      purchaseIntent: existingSkill.purchaseIntent,
    } : null;

    const prevTags = existingSkill?.tags || [];
    const prevStage = existingSkill?.pipelineStage || "new";
    const prevContext = prevSkill
      ? `Skill เดิม: ความรู้สึก=${prevSkill.sentiment?.level}(${prevSkill.sentiment?.score}) โอกาสซื้อ=${prevSkill.purchaseIntent?.level}(${prevSkill.purchaseIntent?.score}) tags=[${prevTags.join(",")}] stage=${prevStage}`
      : "ยังไม่มี skill เดิม (คนใหม่)";

    // 2. ส่ง AI แค่ skill เดิม + ข้อความใหม่ 1 ข้อ (ประหยัด token มาก!)
    const content = await callLightAI([
      {
        role: "system",
        content: `อัปเดต skill ของ${isStaff ? "พนักงาน" : "ลูกค้า"} จาก skill เดิม + ข้อความใหม่
return JSON เท่านั้น:
{
  "sentiment": { "score": <0-100>, "level": "<green|yellow|red>", "reason": "<สั้นๆ ไทย>" },
  "purchaseIntent": { "score": <0-100>, "level": "<green|yellow|red>", "reason": "<สั้นๆ ไทย>" },
  "tags": ["<tag อัตโนมัติ จากเนื้อหาสนทนา เช่น: ถามราคา, สนใจสินค้า, ร้องเรียน, ขอบคุณ, ถามวิธีใช้, ต้องการซื้อ, เปรียบเทียบ, นัดหมาย ฯลฯ>"],
  "pipelineStage": "<new|interested|quoting|negotiating|closed_won|closed_lost|following_up>"
}
sentiment: green(60-100)=ปกติ, yellow(30-59)=ติดตาม, red(0-29)=ไม่พอใจ
purchaseIntent: green(0-29)=ไม่สนใจ, yellow(30-59)=เริ่มสนใจ, red(60-100)=สนใจซื้อ!
tags: เก็บ tag จาก skill เดิม + เพิ่มใหม่ถ้ามี (ไม่ลบเก่า, ไม่ซ้ำ, สูงสุด 10 tags)
pipelineStage: new=ใหม่, interested=สนใจ, quoting=เสนอราคา, negotiating=ต่อรอง, closed_won=ปิดการขาย, closed_lost=ไม่ซื้อ, following_up=ติดตาม
ค่อยๆ ปรับ score จาก skill เดิม ไม่กระโดดมาก`
      },
      { role: "user", content: `${prevContext}\nข้อความใหม่: "${cleanForAI(messageText.substring(0, 200))}"` },
    ], { json: true, maxTokens: 300 });
    if (!content) return;

    const skill = JSON.parse(content);

    // 3. อัปเดต user_skills (ต่อคน-ต่อห้อง) + tags + pipeline
    const tags = [...new Set([...(skill.tags || []), ...prevTags])].slice(0, 10);
    const pipelineStage = skill.pipelineStage || prevStage || "new";

    await database.collection("user_skills").updateOne(
      skillKey,
      {
        $set: {
          sourceId,
          userId,
          userName,
          isStaff,
          sentiment: skill.sentiment,
          purchaseIntent: skill.purchaseIntent,
          tags,
          pipelineStage,
          lastMessage: messageText.substring(0, 100),
          updatedAt: new Date(),
        },
        $inc: { messageCount: 1 },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    // 4. Auto-create/update ลูกค้าใน CRM + ดึง LINE profile อัตโนมัติ
    if (!isStaff) {
      // ดึง LINE profile (รูป, ชื่อ, status)
      let lineProfile = {};
      if (lineUserId) {
        try {
          const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
          let profileUrl;
          if (source?.type === "group" && source?.groupId) {
            profileUrl = `https://api.line.me/v2/bot/group/${source.groupId}/member/${lineUserId}`;
          } else {
            profileUrl = `https://api.line.me/v2/bot/profile/${lineUserId}`;
          }
          const pRes = await fetch(profileUrl, { headers: { Authorization: `Bearer ${token}` } });
          if (pRes.ok) {
            const p = await pRes.json();
            lineProfile = {
              avatarUrl: p.pictureUrl || "",
              lineId: lineUserId,
              statusMessage: p.statusMessage || "",
            };
          }
        } catch {}
      }

      // platformIds — เก็บ ID ของแต่ละ platform เป็น array (รองรับหลาย ID ต่อ platform)
      const addToSetOps = { tags: { $each: tags }, rooms: sourceId };
      if (platform === "line" && lineUserId) {
        addToSetOps["platformIds.line"] = lineUserId;
      } else if (platform === "facebook" && userId) {
        addToSetOps["platformIds.facebook"] = userId;
      } else if (platform === "instagram" && userId) {
        addToSetOps["platformIds.instagram"] = userId;
      }

      // ตรวจว่า platformIds เดิมเป็น string หรือ array — ถ้าเป็น string ต้อง convert ก่อน
      const existingCust = await database.collection("customers").findOne({ name: userName });
      if (existingCust?.platformIds) {
        const pids = existingCust.platformIds;
        for (const k of ["line", "facebook", "instagram"]) {
          if (pids[k] && !Array.isArray(pids[k])) {
            // Convert string → array ก่อน addToSet
            await database.collection("customers").updateOne(
              { name: userName },
              { $set: { [`platformIds.${k}`]: [pids[k]] } }
            );
          }
        }
      }

      await database.collection("customers").updateOne(
        { name: userName },
        {
          $set: {
            name: userName,
            lastSentiment: skill.sentiment,
            lastPurchaseIntent: skill.purchaseIntent,
            pipelineStage,
            ...lineProfile,
            updatedAt: new Date(),
          },
          $addToSet: addToSetOps,
          $inc: { totalMessages: 1 },
          $setOnInsert: { createdAt: new Date(), firstName: "", lastName: "", company: "", position: "", phone: "", email: "", address: "", notes: "", customTags: [], platformIds: { line: [], facebook: [], instagram: [] } },
        },
        { upsert: true }
      );
    }

    console.log(`[Skill] ${userName}@${sourceId.substring(0, 8)}: sentiment=${skill.sentiment?.level}(${skill.sentiment?.score}) purchase=${skill.purchaseIntent?.level}(${skill.purchaseIntent?.score}) tags=[${tags.join(",")}] stage=${pipelineStage}`);

    // 4. รวม skill ทุกคนในห้อง → อัปเดต chat_analytics (ไม่ต้องเรียก AI!)
    await updateRoomAnalytics(sourceId);

    // 5. เก็บ log
    await database.collection("analysis_logs").insertOne({
      sourceId,
      userId,
      userName,
      isStaff,
      sentiment: skill.sentiment,
      purchaseIntent: skill.purchaseIntent,
      messageText: messageText.substring(0, 200),
      analyzedAt: new Date(),
    });

  } catch (e) {
    console.error("[Skill] Error:", e.message);
  }
}

// รวม skill ทุกคนในห้อง → คำนวณ average → เก็บ chat_analytics
async function updateRoomAnalytics(sourceId) {
  const database = await getDB();
  if (!database) return;

  const skills = await database.collection("user_skills").find({ sourceId }).toArray();
  if (skills.length === 0) return;

  const customerSkills = skills.filter((s) => !s.isStaff);
  const staffSkills = skills.filter((s) => s.isStaff);

  const avgScore = (arr, field) => {
    if (arr.length === 0) return { score: 50, level: "green", reason: "ไม่มีข้อมูล" };
    const avg = Math.round(arr.reduce((sum, s) => sum + (s[field]?.score || 50), 0) / arr.length);
    const level = field === "purchaseIntent"
      ? (avg >= 60 ? "red" : avg >= 30 ? "yellow" : "green")
      : (avg >= 60 ? "green" : avg >= 30 ? "yellow" : "red");
    // เหตุผลจากคนที่มี score แย่สุด
    const worst = [...arr].sort((a, b) => {
      const aScore = a[field]?.score || 50;
      const bScore = b[field]?.score || 50;
      return field === "purchaseIntent" ? bScore - aScore : aScore - bScore;
    })[0];
    return { score: avg, level, reason: worst?.[field]?.reason || "-" };
  };

  const customerSentiment = avgScore(customerSkills, "sentiment");
  const staffSentiment = avgScore(staffSkills, "sentiment");
  const overallSentiment = avgScore(skills, "sentiment");
  const purchaseIntent = avgScore(customerSkills.length > 0 ? customerSkills : skills, "purchaseIntent");

  await database.collection("chat_analytics").updateOne(
    { sourceId },
    {
      $set: {
        sourceId,
        sentiment: overallSentiment,
        customerSentiment,
        staffSentiment,
        overallSentiment,
        purchaseIntent,
        userCount: skills.length,
        customerCount: customerSkills.length,
        staffCount: staffSkills.length,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  console.log(`[Room] ${sourceId.substring(0, 8)}: ${customerSkills.length} customers, ${staffSkills.length} staff → overall=${overallSentiment.level} purchase=${purchaseIntent.level}`);
}

// === Vision AI — อ่านรูปแปลความหมาย (Groq → Gemini fallback) ===
async function analyzeImage(imageBuffer) {
  if (!imageBuffer) return null;
  const base64 = imageBuffer.toString("base64");
  const dataUrl = `data:image/jpeg;base64,${base64}`;
  const prompt = "อธิบายรูปนี้เป็นภาษาไทย กระชับ 1-2 ประโยค บอกว่าเห็นอะไรในรูป";

  // 1. OpenRouter free vision (meta-llama/llama-4-scout:free)
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: { Authorization: `Bearer ${orKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct:free",
          messages: [{ role: "user", content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ] }],
          max_tokens: 300,
        }),
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        console.log("[Vision] OpenRouter OK");
        return data.choices[0].message.content;
      }
      if (data.error) console.log("[Vision] OpenRouter:", (data.error.message || "").substring(0, 80));
    } catch (e) { console.log("[Vision] OpenRouter:", e.message); }
  }

  // 2. Groq vision fallback (เสียเงิน — ต้องเปิด PAID_AI_ENABLED)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && PAID_AI) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(20000),
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [{ role: "user", content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ] }],
          max_tokens: 300,
        }),
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        console.log("[Vision] Groq OK");
        return data.choices[0].message.content;
      }
    } catch (e) { console.log("[Vision] Groq:", e.message); }
  }

  // 3. Gemini fallback
  const googleKey = process.env.GOOGLE_API_KEY;
  if (googleKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(20000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: base64 } },
            ] }],
          }),
        }
      );
      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) return data.candidates[0].content.parts[0].text;
    } catch (e) { console.log("[Vision] Gemini:", e.message); }
  }

  return null;
}

// === Meta (Facebook/Instagram) helpers ===

// Verify X-Hub-Signature-256
function verifyMetaSignature(rawBody, signature) {
  if (!signature) return false;
  const hmac = require("crypto").createHmac("sha256", process.env.FB_APP_SECRET || "")
  const digest = "sha256=" + hmac.update(rawBody).digest("hex")
  return digest === signature
}

// Cache โปรไฟล์ผู้ใช้ Meta (ไม่เรียก Graph API ซ้ำ)
const metaProfileCache = {} // userId → { name, profilePic, _ts }
const META_PROFILE_TTL = 3600000 // 1 ชม.

async function getMetaUserProfile(userId) {
  const cached = metaProfileCache[userId]
  if (cached && Date.now() - cached._ts < META_PROFILE_TTL) return cached

  const token = process.env.FB_PAGE_ACCESS_TOKEN
  if (!token) return { name: userId, profilePic: null }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${userId}?fields=name,profile_pic&access_token=${token}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return { name: userId, profilePic: null }
    const data = await res.json()
    const profile = { name: data.name || userId, profilePic: data.profile_pic || null, _ts: Date.now() }
    metaProfileCache[userId] = profile
    return profile
  } catch (e) {
    return { name: userId, profilePic: null }
  }
}

// ส่งข้อความกลับ Meta (สำรองไว้ — ระบบนี้ listen-only, ยังไม่เรียก)
async function sendMetaMessage(recipientId, text) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN
  if (!token) return false
  try {
    const res = await fetch("https://graph.facebook.com/v19.0/me/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    })
    return res.ok
  } catch (e) {
    console.error("[Meta] sendMetaMessage error:", e.message)
    return false
  }
}

// === Meta Webhook: Verification (GET) ===
app.get("/webhook/meta", (req, res) => {
  const mode = req.query["hub.mode"]
  const token = req.query["hub.verify_token"]
  const challenge = req.query["hub.challenge"]

  if (mode === "subscribe" && token === (process.env.FB_VERIFY_TOKEN || "")) {
    console.log("[Meta] Webhook verified ✅")
    return res.status(200).send(challenge)
  }
  console.log("[Meta] Webhook verification failed ❌")
  return res.status(403).send("Forbidden")
})

// === Meta Webhook: Messages (POST) ===
app.post("/webhook/meta", express.raw({ type: "*/*" }), async (req, res) => {
  const rawBody = req.body
  const signature = req.headers["x-hub-signature-256"]

  // Verify signature
  if (!verifyMetaSignature(rawBody, signature)) {
    console.log("[Meta] Invalid signature ❌")
    return res.status(403).json({ error: "Invalid signature" })
  }

  let parsed
  try {
    parsed = JSON.parse(rawBody.toString("utf-8"))
  } catch {
    return res.status(200).json({ status: "ok" })
  }

  // ตอบ Meta ทันที (ต้องตอบภายใน 20 วินาที)
  res.status(200).json({ status: "ok" })

  const object = parsed.object // "page" = Facebook, "instagram" = Instagram
  const platform = object === "instagram" ? "instagram" : "facebook"

  const entries = parsed.entry || []
  for (const entry of entries) {
    const messagingEvents = entry.messaging || []
    for (const event of messagingEvents) {
      const sender = event.sender
      const recipient = event.recipient
      if (!sender?.id) continue

      // ข้ามข้อความที่ Bot ส่งเอง
      if (event.message?.is_echo) continue

      const senderId = sender.id
      const sourceId = platform === "facebook" ? `fb_${senderId}` : `ig_${senderId}`

      // ดึง user profile (cached)
      const profile = await getMetaUserProfile(senderId).catch(() => ({ name: senderId, profilePic: null }))
      const userName = profile.name

      // Save group meta
      saveGroupMeta(sourceId, userName, { type: "user" }, platform).catch(() => {})

      // === Opt-out / Opt-in / PDPA / Human Handoff Detection (Meta) ===
      const metaLowerText = (event.message?.text || "").toLowerCase().trim();

      if (OPT_OUT_KEYWORDS.includes(metaLowerText)) {
        await setOptOut(sourceId, true);
        await sendMetaMessage(senderId, "✅ หยุดส่งข้อความอัตโนมัติแล้วค่ะ\nพิมพ์ \"เปิด\" เพื่อรับข้อความอีกครั้ง");
        console.log(`[Opt-out] ${sourceId.substring(0, 12)} opted out (${platform})`);
        continue;
      }

      if (OPT_IN_KEYWORDS.includes(metaLowerText)) {
        await setOptOut(sourceId, false);
        await sendMetaMessage(senderId, "✅ เปิดรับข้อความอัตโนมัติแล้วค่ะ");
        console.log(`[Opt-in] ${sourceId.substring(0, 12)} opted in (${platform})`);
        continue;
      }

      if (DELETE_KEYWORDS.includes(metaLowerText)) {
        await sendMetaMessage(senderId, "📩 ได้รับคำขอลบข้อมูลแล้วค่ะ ทีมงานจะดำเนินการภายใน 30 วันตาม PDPA\n\nหากมีคำถามเพิ่มเติม สามารถติดต่อทีมงานได้ค่ะ");
        await logDeletionRequest(sourceId, platform);
        console.log(`[PDPA] ขอลบข้อมูล: ${sourceId.substring(0, 12)} (${platform})`);
        continue;
      }

      if (HANDOFF_REGEX.test(metaLowerText)) {
        await sendMetaMessage(senderId, "🙋 ส่งต่อให้ทีมงานแล้วค่ะ กรุณารอสักครู่ ทีมงานจะตอบกลับเร็วที่สุดค่ะ");
        await createHandoffAlert(sourceId, userName, event.message?.text);
        console.log(`[Handoff] ${sourceId.substring(0, 12)} ขอคุยกับพนักงาน (${platform})`);
        if (event.message?.text) {
          await saveMsg(sourceId, {
            role: "user", userName, userId: senderId,
            content: event.message.text, messageType: "text",
            messageId: event.message.mid || null, timestamp: event.timestamp || null,
            recipientId: recipient?.id || null,
          }, platform);
        }
        continue;
      }

      // handle text message
      if (event.message?.text) {
        const msgText = event.message.text
        const topic = detectMessageTopic(msgText)
        await saveMsg(sourceId, {
          role: "user",
          userName,
          userId: senderId,
          content: msgText,
          messageType: "text",
          topic,
          messageId: event.message.mid || null,
          timestamp: event.timestamp || null,
          recipientId: recipient?.id || null,
        }, platform)

        console.log(`[Meta/${platform}] ${userName}@${sourceId.substring(0, 12)}: ${msgText.substring(0, 60)}`)

        // === [Privacy] แจ้ง PDPA ข้อความแรก (Meta) ===
        sendPrivacyNoticeIfNeeded(sourceId, platform, () =>
          sendMetaMessage(senderId, PRIVACY_TEXT)
        ).catch(() => {})

        analyzeChat(sourceId, userName, msgText, senderId, { type: "user" }).catch((e) => console.error("[Meta/Skill] Catch:", e.message))
        learnFromMessage(sourceId, userName, msgText, "text", "user").catch(() => {})

        // น้องกุ้งตอบแทนใน Facebook/Instagram (Send API — ฟรี!)
        const metaIsOptedOut = await checkOptedOut(sourceId).catch(() => false);
        if (!metaIsOptedOut) {
          const metaConfig = await getBotConfig(sourceId)
          const metaShouldReply = await shouldAiReply(metaConfig, msgText, userName, { type: "user" })
          if (metaShouldReply) {
            console.log(`[AI-Reply] น้องกุ้งตอบแทน → ${platform} ${sourceId.substring(0, 12)}`)
            aiReplyToMeta(senderId, msgText, sourceId, platform).catch((e) =>
              console.error(`[AI-Reply] ${platform} error:`, e.message)
            )
          }
        }
      }

      // handle ALL attachment types (image, video, audio, file, location, sticker)
      const attachments = event.message?.attachments || []
      for (const att of attachments) {
        const attUrl = att.payload?.url || null
        const baseMsgFields = {
          role: "user",
          userName,
          userId: senderId,
          messageId: event.message?.mid || null,
          timestamp: event.timestamp || null,
          recipientId: recipient?.id || null,
        }

        if (att.type === "image") {
          await saveMsg(sourceId, {
            ...baseMsgFields,
            content: `[รูปภาพ]`,
            messageType: "image",
            imageUrl: attUrl,
            hasImage: true,
          }, platform)
          console.log(`[Meta/${platform}] ${userName}: [image]`)

        } else if (att.type === "video") {
          await saveMsg(sourceId, {
            ...baseMsgFields,
            content: "[วิดีโอ]",
            messageType: "video",
            videoUrl: attUrl,
            hasVideo: true,
          }, platform)
          console.log(`[Meta/${platform}] ${userName}: [video]`)

        } else if (att.type === "audio") {
          await saveMsg(sourceId, {
            ...baseMsgFields,
            content: "[เสียง]",
            messageType: "audio",
            audioUrl: attUrl,
            hasAudio: true,
          }, platform)
          console.log(`[Meta/${platform}] ${userName}: [audio]`)

        } else if (att.type === "file") {
          await saveMsg(sourceId, {
            ...baseMsgFields,
            content: `[ไฟล์: ${att.payload?.name || "unknown"}]`,
            messageType: "file",
            file: {
              fileName: att.payload?.name || "file",
              fileSize: att.payload?.size || null,
              url: attUrl,
            },
            hasFile: true,
          }, platform)
          console.log(`[Meta/${platform}] ${userName}: [file]`)

        } else if (att.type === "location") {
          const coords = att.payload?.coordinates || {}
          await saveMsg(sourceId, {
            ...baseMsgFields,
            content: `[ตำแหน่ง: ${coords.lat || 0}, ${coords.long || 0}]`,
            messageType: "location",
            location: {
              title: att.title || "ตำแหน่งที่ตั้ง",
              address: "",
              latitude: coords.lat || 0,
              longitude: coords.long || 0,
            },
            hasLocation: true,
          }, platform)
          console.log(`[Meta/${platform}] ${userName}: [location]`)

        } else if (att.type === "fallback") {
          // sticker หรือ attachment ที่ Meta ส่งมาแบบ fallback
          await saveMsg(sourceId, {
            ...baseMsgFields,
            content: att.payload?.title || `[${att.type}]`,
            messageType: att.type,
            attachmentUrl: attUrl,
          }, platform)
          console.log(`[Meta/${platform}] ${userName}: [${att.type}]`)
        }

        // Analyze ทุก attachment
        const attContent = `[${att.type}]`
        analyzeChat(sourceId, userName, attContent, senderId, { type: "user" }).catch(() => {})
      }

      // handle sticker (Meta ส่ง sticker_id แยก)
      if (event.message?.sticker_id) {
        await saveMsg(sourceId, {
          role: "user",
          userName,
          userId: senderId,
          content: `[sticker:${event.message.sticker_id}]`,
          messageType: "sticker",
          sticker: {
            stickerId: String(event.message.sticker_id),
            stickerUrl: `https://graph.facebook.com/v19.0/${event.message.sticker_id}/picture`,
          },
          hasSticker: true,
          messageId: event.message?.mid || null,
          timestamp: event.timestamp || null,
        }, platform)
        console.log(`[Meta/${platform}] ${userName}: [sticker]`)
      }
    }
  }
})

// === LINE Webhook endpoint ===
app.post("/webhook", express.raw({ type: "*/*" }), async (req, res) => {
  const rawBody = req.body;
  const bodyString = rawBody.toString("utf-8");

  if (!bodyString) return res.status(200).json({ status: "ok" });

  let parsed;
  try {
    parsed = JSON.parse(bodyString);
  } catch {
    return res.status(200).json({ status: "ok" });
  }

  const events = parsed.events || [];

  // ตอบ LINE ทันที (ไม่ให้ timeout)
  res.status(200).json({ status: "ok" });

  for (const event of events) {
    if (event.type !== "message") continue;

    const source = event.source;
    const sourceId = source.groupId || source.roomId || source.userId;
    const msg = event.message;

    // Auto-create bot config
    let contactName = null;
    if (source.groupId) {
      contactName = await getGroupName(source.groupId).catch(() => null);
    } else if (source.userId) {
      contactName = await getUserName(source).catch(() => null);
    }
    getBotConfig(sourceId, { type: source.type, groupName: contactName }).catch(() => {});

    // === Cache replyToken สำหรับ admin ตอบ (Reply API ฟรี!) ===
    if (event.replyToken) {
      cacheReplyToken(sourceId, event.replyToken);
    }

    // === Opt-out / Opt-in / PDPA / Human Handoff Detection ===
    const lowerText = (msg.text || "").toLowerCase().trim();

    if (OPT_OUT_KEYWORDS.includes(lowerText)) {
      await setOptOut(sourceId, true);
      if (event.replyToken) {
        await replyToLine(event.replyToken, "✅ หยุดส่งข้อความอัตโนมัติแล้วค่ะ\nพิมพ์ \"เปิด\" เพื่อรับข้อความอีกครั้ง");
      }
      console.log(`[Opt-out] ${sourceId.substring(0, 8)} opted out`);
      continue;
    }

    if (OPT_IN_KEYWORDS.includes(lowerText)) {
      await setOptOut(sourceId, false);
      if (event.replyToken) {
        await replyToLine(event.replyToken, "✅ เปิดรับข้อความอัตโนมัติแล้วค่ะ");
      }
      console.log(`[Opt-in] ${sourceId.substring(0, 8)} opted in`);
      continue;
    }

    if (DELETE_KEYWORDS.includes(lowerText)) {
      if (event.replyToken) {
        await replyToLine(event.replyToken, "📩 ได้รับคำขอลบข้อมูลแล้วค่ะ ทีมงานจะดำเนินการภายใน 30 วันตาม PDPA\n\nหากมีคำถามเพิ่มเติม สามารถติดต่อทีมงานได้ค่ะ");
      }
      await logDeletionRequest(sourceId, "line");
      console.log(`[PDPA] ขอลบข้อมูล: ${sourceId.substring(0, 8)}`);
      continue;
    }

    if (HANDOFF_REGEX.test(lowerText)) {
      if (event.replyToken) {
        await replyToLine(event.replyToken, "🙋 ส่งต่อให้ทีมงานแล้วค่ะ กรุณารอสักครู่ ทีมงานจะตอบกลับเร็วที่สุดค่ะ");
      }
      const userName = await getUserName(source).catch(() => "ลูกค้า");
      await createHandoffAlert(sourceId, userName, msg.text);
      console.log(`[Handoff] ${sourceId.substring(0, 8)} ขอคุยกับพนักงาน`);
      await processEvent(event).catch(() => {});
      continue;
    }

    // === 5-นาที Auto-Reply Timer (เฉพาะ 1-on-1 LINE OA) ===
    if (source.type === "user" && msg.text) {
      const uName = await getUserName(source).catch(() => "ลูกค้า");
      scheduleAutoReply(sourceId, uName, msg.text, source.type);
    }

    // === เก็บข้อความ + น้องกุ้งตอบแทน (ถ้าเปิด) ===
    try {
      await processEvent(event);

      // === [Privacy] แจ้ง PDPA ข้อความแรก (เฉพาะ 1-on-1) ===
      if (source.type === "user") {
        sendPrivacyNoticeIfNeeded(sourceId, "line", () =>
          sendLinePush(sourceId, [{ type: "text", text: PRIVACY_TEXT }])
        ).catch(() => {});
      }

      const userName = await getUserName(source).catch(() => "User");
      const messageText = msg.text || `[${msg.type}]`;
      const lineUserId = source.userId || null;
      console.log(`[Listen] ${userName}@${sourceId.substring(0, 8)}: ${messageText.substring(0, 40)}`);

      // ตรวจจับตอบช้า
      checkSlowResponse(sourceId, userName).catch(() => {});

      // Skill-Based Analytics
      analyzeChat(sourceId, userName, messageText, lineUserId, source).catch((e) => console.error("[Skill] Catch:", e.message));

      // AI Learning: อัพเดท memory + ตรวจจับ signals
      learnFromMessage(sourceId, userName, messageText, msg.type, source.type).catch(() => {});

      // === น้องกุ้งตอบแทน (LINE Reply API — ฟรี!) ===
      const isOptedOut = await checkOptedOut(sourceId).catch(() => false);
      if (msg.text && event.replyToken && !isOptedOut) {
        const config = await getBotConfig(sourceId);
        const shouldReply = await shouldAiReply(config, msg.text, userName, source);
        if (shouldReply) {
          console.log(`[AI-Reply] น้องกุ้งตอบแทน → ${sourceId.substring(0, 8)}`);
          aiReplyToLine(event, sourceId, userName, msg.text, config).catch((e) =>
            console.error("[AI-Reply] Error:", e.message)
          );
        }
      }
    } catch (e) {
      console.error("[Listen] Error:", e.message);
    }
  }
});


// === API: ดู/ตั้งค่า bot config ต่อ group ===
app.get("/config/:sourceId", async (req, res) => {
  const config = await getBotConfig(req.params.sourceId);
  res.json(config);
});

app.post("/config/:sourceId", express.json(), async (req, res) => {
  const { systemPrompt, botName, model, aiReplyMode, aiReplyKeywords } = req.body;
  await setBotConfig(req.params.sourceId, {
    ...(systemPrompt !== undefined ? { systemPrompt } : {}),
    ...(botName !== undefined ? { botName } : {}),
    ...(model !== undefined ? { model } : {}),
    ...(aiReplyMode !== undefined ? { aiReplyMode } : {}),
    ...(aiReplyKeywords !== undefined ? { aiReplyKeywords } : {}),
  });
  res.json({ status: "ok" });
});

// === API: ดู config ทั้งหมด ===
app.get("/configs", async (req, res) => {
  const database = await getDB();
  if (!database) return res.json([]);
  const configs = await database.collection("bot_config").find().toArray();
  res.json(configs);
});

// === Migrate: ย้าย chat_xxx → messages + ลบ collection เก่า ===
async function migrateOldCollections() {
  const database = await getDB();
  if (!database) return;

  const collections = await database.listCollections().toArray();
  const oldColls = collections.filter((c) => c.name.startsWith("chat_") && c.name !== "chat_analytics");
  if (oldColls.length === 0) return;

  console.log(`[Migrate] Found ${oldColls.length} old chat collections`);
  const msgColl = database.collection(MESSAGES_COLL);
  let totalMigrated = 0;

  for (const coll of oldColls) {
    const name = coll.name;
    // ดึง sourceId จากชื่อ collection: chat_Ca8e408... → Ca8e408...
    const sourceId = name.replace("chat_", "");

    try {
      const docs = await database.collection(name).find({}).toArray();
      if (docs.length === 0) {
        await database.collection(name).drop();
        continue;
      }

      // เพิ่ม sourceId ให้ทุก doc แล้ว insert เข้า messages
      const docsWithSourceId = docs.map((d) => {
        const { _id, ...rest } = d;
        return { ...rest, sourceId: rest.sourceId || sourceId };
      });

      await msgColl.insertMany(docsWithSourceId, { ordered: false }).catch(() => {});
      totalMigrated += docs.length;

      // ลบ collection เก่า
      await database.collection(name).drop();
      console.log(`[Migrate] ${name}: ${docs.length} docs → messages ✅ (dropped)`);
    } catch (e) {
      console.error(`[Migrate] ${name} error:`, e.message);
    }
  }

  console.log(`[Migrate] Done! Total: ${totalMigrated} docs migrated`);

  // Backfill platform field — เติม platform: "line" ให้ documents ที่ยังไม่มี
  try {
    const msgsResult = await database.collection(MESSAGES_COLL).updateMany(
      { platform: { $exists: false } },
      { $set: { platform: "line" } }
    );
    const metaResult = await database.collection("groups_meta").updateMany(
      { platform: { $exists: false } },
      { $set: { platform: "line" } }
    );
    if (msgsResult.modifiedCount > 0 || metaResult.modifiedCount > 0) {
      console.log(`[Migrate] Backfill platform: ${msgsResult.modifiedCount} messages, ${metaResult.modifiedCount} groups_meta`);
    }
  } catch (e) {
    console.error("[Migrate] Backfill platform error:", e.message);
  }
}

// === Daily Summary — น้องกุ้งสรุปงานสิ้นวัน ===
async function generateDailySummary() {
  const database = await getDB();
  if (!database) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateFilter = { createdAt: { $gte: today, $lt: tomorrow } };

  // 1. ข้อความวันนี้ แยกตามห้อง
  const msgsByRoom = await database.collection(MESSAGES_COLL).aggregate([
    { $match: dateFilter },
    { $group: { _id: "$sourceId", count: { $sum: 1 }, lastMsg: { $last: "$content" } } },
    { $sort: { count: -1 } },
  ]).toArray();

  const totalMsgs = msgsByRoom.reduce((s, r) => s + r.count, 0);
  const activeRooms = msgsByRoom.length;

  // 2. Alerts วันนี้ (ตอบช้า)
  const alerts = await database.collection("alerts")
    .find({ ...dateFilter, type: "slow_response" })
    .sort({ responseMinutes: -1 })
    .limit(10)
    .toArray();

  // 3. ห้องที่ต้องติดตาม (sentiment red/yellow หรือ purchaseIntent สูง)
  const analytics = await database.collection("chat_analytics").find({}).toArray();
  const redRooms = analytics.filter((a) => a.customerSentiment?.level === "red" || a.sentiment?.level === "red");
  const yellowRooms = analytics.filter((a) => a.customerSentiment?.level === "yellow" || a.sentiment?.level === "yellow");
  const hotLeads = analytics.filter((a) => a.purchaseIntent?.level === "red");

  // 4. ดึงชื่อห้อง
  const groupsMeta = await database.collection("groups_meta").find({}).toArray();
  const nameMap = {};
  for (const g of groupsMeta) nameMap[g.sourceId] = g.name || g.sourceId?.substring(0, 12);

  const getName = (sourceId) => nameMap[sourceId] || sourceId?.substring(0, 12) || "?";

  // 5. สร้างสรุป
  const dateStr = today.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  let summary = `📋 สรุปงานวันนี้ (${dateStr})\n`;
  summary += `━━━━━━━━━━━━━━\n`;
  summary += `💬 ข้อความทั้งหมด: ${totalMsgs} ข้อความ\n`;
  summary += `👥 ห้องที่มีความเคลื่อนไหว: ${activeRooms} ห้อง\n`;

  // ตอบช้า
  if (alerts.length > 0) {
    summary += `\n⚠️ ตอบช้า (${alerts.length} ครั้ง):\n`;
    for (const a of alerts.slice(0, 5)) {
      summary += `  • ${a.staffName} ตอบช้า ${a.responseMinutes} นาที (${a.customerName})\n`;
    }
  }

  // ลูกค้าไม่พอใจ
  if (redRooms.length > 0) {
    summary += `\n🔴 ลูกค้าไม่พอใจ (${redRooms.length} ห้อง):\n`;
    for (const r of redRooms.slice(0, 5)) {
      summary += `  • ${getName(r.sourceId)}: ${r.customerSentiment?.reason || r.sentiment?.reason || "-"}\n`;
    }
  }

  // ต้องติดตาม
  if (yellowRooms.length > 0) {
    summary += `\n🟡 ต้องติดตาม (${yellowRooms.length} ห้อง):\n`;
    for (const r of yellowRooms.slice(0, 5)) {
      summary += `  • ${getName(r.sourceId)}: ${r.customerSentiment?.reason || r.sentiment?.reason || "-"}\n`;
    }
  }

  // โอกาสขาย
  if (hotLeads.length > 0) {
    summary += `\n🔥 โอกาสขายสูง (${hotLeads.length} ห้อง):\n`;
    for (const r of hotLeads.slice(0, 5)) {
      summary += `  • ${getName(r.sourceId)}: ${r.purchaseIntent?.reason || "-"}\n`;
    }
  }

  // ห้องที่คุยเยอะสุด
  if (msgsByRoom.length > 0) {
    summary += `\n📊 ห้องที่คุยเยอะสุด:\n`;
    for (const r of msgsByRoom.slice(0, 5)) {
      summary += `  • ${getName(r._id)}: ${r.count} ข้อความ\n`;
    }
  }

  if (!alerts.length && !redRooms.length && !yellowRooms.length && !hotLeads.length) {
    summary += `\n✅ ไม่มีประเด็นต้องติดตามวันนี้ เยี่ยมเลยค่ะ!`;
  }

  summary += `\n━━━━━━━━━━━━━━\n🦐 น้องกุ้ง สรุปให้ค่ะ`;

  return summary;
}

// ส่งสรุปวันไปหาเป้าหมาย
async function sendDailySummary() {
  const target = process.env.DAILY_SUMMARY_TO;
  if (!target) {
    console.log("[Summary] ❌ ไม่ได้ตั้ง DAILY_SUMMARY_TO — ข้าม");
    return;
  }
  try {
    const summary = await generateDailySummary();
    if (!summary) return;
    await pushToLine(target, summary);
    console.log(`[Summary] ✅ ส่งสรุปวันไป ${target.substring(0, 10)}...`);
  } catch (e) {
    console.error("[Summary] Error:", e.message);
  }
}

// Cron — เช็คทุกนาที ถ้าตรงเวลาที่ตั้ง → ส่งสรุป (default 20:00)
let lastSummaryDate = "";
function startDailyCron() {
  const cronHour = parseInt(process.env.DAILY_SUMMARY_HOUR || "20", 10);
  const cronMinute = parseInt(process.env.DAILY_SUMMARY_MINUTE || "0", 10);

  setInterval(() => {
    const now = new Date();
    const todayKey = now.toISOString().split("T")[0];
    if (now.getHours() === cronHour && now.getMinutes() === cronMinute && lastSummaryDate !== todayKey) {
      lastSummaryDate = todayKey;
      console.log(`[Cron] 🕐 ถึงเวลาสรุปวัน (${cronHour}:${String(cronMinute).padStart(2, "0")})`);
      sendDailySummary();
    }
  }, 60000); // เช็คทุก 1 นาที

  console.log(`[Cron] Daily summary scheduled at ${cronHour}:${String(cronMinute).padStart(2, "0")} → ${process.env.DAILY_SUMMARY_TO || "(not set)"}`);
}

// API: ทดสอบสรุปวัน (กด manual ได้)
app.get("/daily-summary", async (req, res) => {
  const summary = await generateDailySummary();
  res.json({ summary });
});

app.post("/daily-summary/send", async (req, res) => {
  await sendDailySummary();
  res.json({ status: "sent" });
});

// === น้องกุ้ง — AI Advisor ทุก 1 ชม. ===
async function generateAdvice() {
  const database = await getDB();
  if (!database) return null;

  // ดึงข้อมูลล่าสุด
  const analytics = await database.collection("chat_analytics").find({}).toArray();
  const alerts = await database.collection("alerts")
    .find({ createdAt: { $gte: new Date(Date.now() - 3600000) } })
    .toArray();
  const skills = await database.collection("user_skills")
    .find({ updatedAt: { $gte: new Date(Date.now() - 86400000) } })
    .sort({ updatedAt: -1 })
    .limit(50)
    .toArray();

  // ดึงชื่อห้อง
  const groupsMeta = await database.collection("groups_meta").find({}).toArray();
  const nameMap = {};
  for (const g of groupsMeta) nameMap[g.sourceId] = g.name || g.sourceId?.substring(0, 12);
  const getName = (id) => nameMap[id] || id?.substring(0, 12) || "?";

  // สร้าง context สำหรับ AI
  const redRooms = analytics.filter((a) => a.customerSentiment?.level === "red" || a.sentiment?.level === "red");
  const yellowRooms = analytics.filter((a) => a.customerSentiment?.level === "yellow" || a.sentiment?.level === "yellow");
  const hotLeads = analytics.filter((a) => a.purchaseIntent?.level === "red");
  const slowAlerts = alerts.filter((a) => a.type === "slow_response");

  const context = {
    totalRooms: analytics.length,
    redRooms: redRooms.map((r) => ({ name: getName(r.sourceId), reason: r.customerSentiment?.reason || r.sentiment?.reason })),
    yellowRooms: yellowRooms.map((r) => ({ name: getName(r.sourceId), reason: r.customerSentiment?.reason || r.sentiment?.reason })),
    hotLeads: hotLeads.map((r) => ({ name: getName(r.sourceId), reason: r.purchaseIntent?.reason, score: r.purchaseIntent?.score })),
    slowAlerts: slowAlerts.map((a) => ({ staff: a.staffName, minutes: a.responseMinutes, customer: a.customerName })),
    activeUsers: skills.slice(0, 20).map((s) => ({
      name: s.userName,
      room: getName(s.sourceId),
      sentiment: s.sentiment?.level,
      purchase: s.purchaseIntent?.level,
      tags: (s.tags || []).slice(0, 5),
      stage: s.pipelineStage,
    })),
  };

  // สร้าง prompt สำหรับ AI → ใช้ callLightAI (OpenRouter free → Groq → Gemini)
  const adviceSystemPrompt = `คุณชื่อ "น้องกุ้ง" 🦐 เป็น AI Advisor ที่วิเคราะห์ข้อมูลแชทลูกค้าแล้วให้คำแนะนำ
return JSON เท่านั้น: { "advice": [ { "priority": "<critical|warning|info|opportunity>", "icon": "<emoji>", "title": "<หัวข้อสั้นๆ>", "detail": "<คำแนะนำ 1-2 ประโยค ภาษาไทย เป็นกันเอง>", "action": "<สิ่งที่ควรทำ>", "relatedRoom": "<ชื่อห้อง หรือ null>" } ] }
ให้ 3-7 คำแนะนำ เรียงตาม priority (critical ก่อน)
critical = จัดการด่วน (ลูกค้าไม่พอใจ, ตอบช้ามาก)
warning = ควรติดตาม (sentiment เริ่มแย่)
opportunity = โอกาสขาย (purchase intent สูง)
info = ข้อมูลทั่วไป (สถิติ, trend)
ถ้าไม่มีข้อมูลผิดปกติ ให้แนะนำเรื่องทั่วไป เช่น ติดตามลูกค้า, ทักทายลูกค้าเก่า`;

  const content = await callLightAI([
    { role: "system", content: adviceSystemPrompt },
    { role: "user", content: JSON.stringify(context) },
  ], { json: true, maxTokens: 1000, timeout: 30000 });

  if (!content) return null;

  try {
    console.log("[น้องกุ้ง] Raw:", content.substring(0, 200));
    let advice = JSON.parse(content);
    if (!Array.isArray(advice)) {
      const arrKey = Object.keys(advice).find((k) => Array.isArray(advice[k]));
      advice = arrKey ? advice[arrKey] : [];
    }
    return advice;
  } catch (e) {
    console.error("[น้องกุ้ง] JSON parse error:", e.message);
    return null;
  }
}

async function runAdvisor() {
  try {
    const advice = await generateAdvice();
    if (!advice || advice.length === 0) {
      console.log("[น้องกุ้ง] ไม่มีคำแนะนำใหม่");
      return;
    }

    const database = await getDB();
    if (!database) return;

    await database.collection("ai_advice").insertOne({
      advice,
      createdAt: new Date(),
    });

    console.log(`[น้องกุ้ง] ✅ สร้างคำแนะนำ ${advice.length} ข้อ`);
  } catch (e) {
    console.error("[น้องกุ้ง] Error:", e.message);
  }
}

// Cron — ทุก 1 ชม.
function startAdvisorCron() {
  // รันครั้งแรกหลัง startup 30 วินาที
  setTimeout(() => runAdvisor(), 30000);
  // แล้วทุก 1 ชม.
  setInterval(() => runAdvisor(), 3600000);
  console.log("[น้องกุ้ง] 🦐 AI Advisor — monitor ทุก 1 ชม.");
}

// API: ดึงคำแนะนำล่าสุด
app.get("/advice", async (req, res) => {
  const database = await getDB();
  if (!database) return res.json([]);
  const latest = await database.collection("ai_advice")
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
  res.json(latest);
});

// API: รัน manual
app.post("/advice/generate", async (req, res) => {
  await runAdvisor();
  const database = await getDB();
  const latest = await database.collection("ai_advice").findOne({}, { sort: { createdAt: -1 } });
  res.json(latest);
});

// === Advisor API — ให้ OpenClaw เรียกดึงข้อมูล ===
// (path ยังเป็น /api/advisor/* เพื่อ backward compatibility)

// ดึง sources ที่มีข้อความใหม่หลัง since
app.get("/api/advisor/sources-changed", async (req, res) => {
  const database = await getDB();
  if (!database) return res.json({ sources: [], queriedAt: new Date().toISOString() });

  const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 3600000);
  try {
    // หา sourceId ที่มีข้อความใหม่หลัง since
    const pipeline = [
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$sourceId",
          lastMessageAt: { $max: "$createdAt" },
          newMessageCount: { $sum: 1 },
        },
      },
      { $sort: { newMessageCount: -1 } },
    ];
    const changed = await database.collection(MESSAGES_COLL).aggregate(pipeline).toArray();

    // เสริมชื่อห้อง
    const groupsMeta = await database.collection("groups_meta").find({}).toArray();
    const metaMap = {};
    for (const g of groupsMeta) metaMap[g.sourceId] = g;

    const sources = changed.map((c) => ({
      sourceId: c._id,
      groupName: metaMap[c._id]?.groupName || c._id?.substring(0, 12),
      sourceType: metaMap[c._id]?.sourceType || "unknown",
      lastMessageAt: c.lastMessageAt,
      newMessageCount: c.newMessageCount,
    }));

    res.json({ sources, queriedAt: new Date().toISOString() });
  } catch (e) {
    console.error("[Advisor API] sources-changed error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ดึงรายละเอียด source: ข้อความใหม่ + analytics + skills + alerts
app.get("/api/advisor/source-detail/:sourceId", async (req, res) => {
  const database = await getDB();
  if (!database) return res.status(500).json({ error: "DB not ready" });

  const { sourceId } = req.params;
  const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 3600000);

  try {
    // ข้อความใหม่
    const messages = await database.collection(MESSAGES_COLL)
      .find({ sourceId, createdAt: { $gte: since } })
      .sort({ createdAt: 1 })
      .project({ role: 1, userName: 1, content: 1, createdAt: 1, imageDescription: 1 })
      .limit(100)
      .toArray();

    // analytics ล่าสุด
    const analytics = await database.collection("chat_analytics").findOne({ sourceId }) || {};

    // skills ของ users ใน source
    const skills = await database.collection("user_skills")
      .find({ sourceId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .toArray();

    // alerts ล่าสุด
    const alerts = await database.collection("alerts")
      .find({ sourceId, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // lastPulledAt
    const pullRecord = await database.collection("advisor_pull_log").findOne({ sourceId });

    // ชื่อห้อง
    const meta = await database.collection("groups_meta").findOne({ sourceId });

    res.json({
      sourceId,
      groupName: meta?.groupName || sourceId?.substring(0, 12),
      sourceType: meta?.sourceType || "unknown",
      messages,
      analytics,
      skills,
      alerts,
      lastPulledAt: pullRecord?.lastPulledAt || null,
    });
  } catch (e) {
    console.error("[Advisor API] source-detail error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// บันทึกคำแนะนำจาก OpenClaw Advisor
app.post("/api/advisor/advice", express.json(), async (req, res) => {
  const database = await getDB();
  if (!database) return res.status(500).json({ error: "DB not ready" });

  const { advice, analyzedSources, pulledAt, type } = req.body;
  if (!advice || !Array.isArray(advice)) {
    return res.status(400).json({ error: "advice array required" });
  }

  try {
    // Normalize: รองรับ format ที่ AI อาจส่งมาต่างกัน
    const normalized = advice.map((a) => ({
      priority: a.priority || "info",
      icon: a.icon || a.emoji || "📋",
      title: a.title || a.content || a.summary || "คำแนะนำ",
      detail: a.detail || a.description || a.content || "",
      action: a.action || a.recommendation || "",
      analysis: a.analysis || null,
      relatedRoom: a.relatedRoom || a.room || a.sourceId || null,
      sourceId: a.sourceId || null,
    }));

    // Add type field — problem-analysis, sales-opportunity, team-coaching, weekly-strategy, health-monitor
    const adviceType = type || (advice[0] && advice[0].type) || "general";

    await database.collection("ai_advice").insertOne({
      type: adviceType,
      advice: normalized,
      analyzedSources: analyzedSources || [],
      source: "openclaw",
      createdAt: new Date(pulledAt || Date.now()),
    });

    console.log(`[Advisor] ✅ รับคำแนะนำ ${advice.length} ข้อ type=${adviceType} จาก ${(analyzedSources || []).length} sources`);
    res.json({ ok: true, count: advice.length, type: adviceType });
  } catch (e) {
    console.error("[Advisor API] advice save error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ดึงคำแนะนำกรองตาม type
app.get("/api/advisor/advice-by-type", async (req, res) => {
  const database = await getDB();
  if (!database) return res.json([]);

  const { type, limit: limitStr } = req.query;
  const limit = parseInt(limitStr) || 10;

  try {
    const filter = type ? { type } : {};
    const docs = await database.collection("ai_advice")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    res.json(docs);
  } catch (e) {
    console.error("[Advisor API] advice-by-type error:", e.message);
    res.json([]);
  }
});

// ส่ง Telegram alert สำหรับ critical findings จาก OpenClaw
app.post("/api/advisor/telegram-alert", express.json(), async (req, res) => {
  const database = await getDB();
  if (!database) return res.status(500).json({ error: "DB not ready" });

  const { message, priority } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  try {
    // ดึง accounts ทั้งหมดที่มี telegramChatId
    const accounts = await database.collection("accounts")
      .find({ telegramChatId: { $exists: true, $ne: null } })
      .toArray();

    if (accounts.length === 0) {
      console.log("[Telegram Alert] ไม่มี accounts ที่เชื่อมต่อ Telegram");
      return res.json({ ok: true, sent: 0, message: "no telegram accounts" });
    }

    const priorityPrefix = priority === "critical" ? "🚨 วิกฤต" :
      priority === "warning" ? "⚠️ เตือน" :
      priority === "opportunity" ? "💰 โอกาส" : "📊 ข้อมูล";

    const fullMessage = `${priorityPrefix} — น้องกุ้ง AI Advisor\n\n${message}`;

    let sent = 0;
    for (const account of accounts) {
      try {
        await sendTelegram(account.telegramChatId, fullMessage);
        sent++;
      } catch (e) {
        console.error(`[Telegram Alert] ส่งไม่ได้ chatId=${account.telegramChatId}:`, e.message);
      }
    }

    console.log(`[Telegram Alert] ส่ง ${sent}/${accounts.length} accounts — priority=${priority}`);
    res.json({ ok: true, sent, total: accounts.length });
  } catch (e) {
    console.error("[Telegram Alert] error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// อัพเดต lastPulledAt ของ sources ที่ OpenClaw ดึงไปแล้ว
app.post("/api/advisor/update-pulled", express.json(), async (req, res) => {
  const database = await getDB();
  if (!database) return res.status(500).json({ error: "DB not ready" });

  const { sourceIds, pulledAt } = req.body;
  if (!sourceIds || !Array.isArray(sourceIds)) {
    return res.status(400).json({ error: "sourceIds array required" });
  }

  const ts = new Date(pulledAt || Date.now());
  try {
    const bulk = sourceIds.map((sourceId) => ({
      updateOne: {
        filter: { sourceId },
        update: { $set: { sourceId, lastPulledAt: ts, updatedAt: ts }, $setOnInsert: { createdAt: ts } },
        upsert: true,
      },
    }));
    await database.collection("advisor_pull_log").bulkWrite(bulk);

    console.log(`[Advisor] 📝 อัพเดต lastPulledAt ${sourceIds.length} sources`);
    res.json({ ok: true, updated: sourceIds.length });
  } catch (e) {
    console.error("[Advisor API] update-pulled error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// === Cost Tracking API ===

// รับ cost จาก OpenClaw/external
app.post("/api/advisor/cost", express.json(), async (req, res) => {
  const database = await getDB();
  if (!database) return res.status(500).json({ error: "DB not ready" });

  const { provider, model, feature, inputTokens, outputTokens, totalTokens, costUsd, sourceId, service } = req.body;
  try {
    await database.collection("ai_costs").insertOne({
      provider: provider || "unknown",
      model: model || "unknown",
      feature: feature || "unknown",
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      totalTokens: totalTokens || (inputTokens || 0) + (outputTokens || 0),
      costUsd: costUsd || 0,
      sourceId: sourceId || null,
      service: service || "external",
      createdAt: new Date(),
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ดึง cost summary สำหรับ dashboard
// API: ดู free models + cooldown status
app.get("/api/free-models", (req, res) => {
  const now = Date.now();
  const cooldowns = {};
  for (const [k, v] of Object.entries(lightAICooldown)) {
    if (v > now) cooldowns[k] = { until: new Date(v).toISOString(), remainSec: Math.ceil((v - now) / 1000) };
  }
  for (const [k, v] of Object.entries(providerCooldown)) {
    if (v > now) cooldowns[k] = { until: new Date(v).toISOString(), remainSec: Math.ceil((v - now) / 1000) };
  }
  res.json({
    count: discoveredFreeModels.length,
    lastDiscovery: lastDiscovery ? new Date(lastDiscovery).toISOString() : null,
    models: discoveredFreeModels,
    cooldowns,
    paidAI: PAID_AI,
    dedicated: ["SambaNova (Qwen3-235B)", "Gemini 2.0 Flash"],
  });
});

// ─── CEO Review — ดึงผลงานจริงของน้องกุ้ง + AI สร้างบทสนทนาติดตามผลงาน ───
const ceoReviewCache = {}; // { agentName: { ceo, emp, ts } }

// Map ชื่อน้องกุ้ง → feature ใน ai_costs
const KUNG_TO_FEATURE = {
  "แก้ว": "crm-analysis", "ทองคำ": "sales-opportunity", "ครูโค้ช": "team-coaching",
  "อาร์ม": "weekly-strategy", "หมอใจ": "customer-health", "แบงค์": "payment-verify",
  "เมฆ": "delivery-track", "ขนุน": "win-back", "แนน": "cross-sell",
  "บุ๋ม": "daily-summary", "แต้ม": "lead-scoring", "นาฬิกา": "appointment", "เปรียบ": "price-analysis",
};

app.get("/api/ceo-review", async (req, res) => {
  const agentName = req.query.agent || "";
  if (!agentName) return res.json({ ceo: "", emp: "" });

  // cache 5 นาที/ตัว
  const cached = ceoReviewCache[agentName];
  if (cached && Date.now() - cached.ts < 300000) {
    return res.json({ ceo: cached.ceo, emp: cached.emp });
  }

  try {
    const database = await getDB();
    if (!database) return res.json({ ceo: "", emp: "" });

    // หา feature ของน้องกุ้งตัวนี้
    const feature = KUNG_TO_FEATURE[agentName] || "";
    const query = feature ? { feature } : {};

    // ดึงผลงานล่าสุด 5 รายการ
    const recentWork = await database.collection("ai_costs")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log(`[CEO-Review] ${agentName}: feature=${feature}, recentWork=${recentWork.length}`);
    // สร้าง context — ถ้ามีผลงานจริงใช้ผลงาน ถ้าไม่มีก็ให้ AI แต่งเอง
    let prompt;
    if (recentWork.length > 0) {
      const workSummary = recentWork.map(w => {
        const t = w.createdAt ? new Date(w.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }) : "?";
        return `${t} — ${w.feature} ${w.totalTokens || 0} tokens ${w.costUsd > 0 ? "฿" + (w.costUsd * 35).toFixed(2) : "ฟรี"}`;
      }).join("\n");
      prompt = `CEO ชื่อบอส กำลังตรวจงาน "${agentName}" น้องกุ้ง AI
ผลงานล่าสุด:
${workSummary}

สร้างบทสนทนา 1 คู่ CEO ถามติดตามผลงานจริง + พนักงานเถียงกลับตลกๆ แซวกัน ห้ามซ้ำกับครั้งก่อน
{"ceo":"ถามเรื่องผลงานจริง สั้น 5-15 คำ","emp":"ตอบเถียงกลับ ตลก 5-15 คำ"}`;
    } else {
      prompt = `CEO ชื่อบอส กำลังเดินตรวจออฟฟิศ เจอ "${agentName}" น้องกุ้ง AI
สร้างบทสนทนา 1 คู่ CEO ถามพนักงานตลกๆ + พนักงานเถียงกลับแซวบอส ห้ามซ้ำกับครั้งก่อน เรื่องในออฟฟิศ (กาแฟ แมว งาน ลูกค้า เงินเดือน โบนัส ฯลฯ)
{"ceo":"ถามตลก สั้น 5-15 คำ","emp":"ตอบเถียงกลับ ตลก 5-15 คำ"}`;
    }

    // ให้ AI สร้างบทสนทนา
    const sambaKey = process.env.SAMBANOVA_API_KEY;
    if (!sambaKey) return res.json({ ceo: "", emp: "" });

    const r = await fetch("https://api.sambanova.ai/v1/chat/completions", {
      method: "POST", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${sambaKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "Qwen3-235B",
        messages: [
          { role: "system", content: "ตอบ JSON เท่านั้น ห้ามเพิ่มข้อความอื่น ห้ามซ้ำกับครั้งก่อน" },
          { role: "user", content: prompt },
        ],
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });
    const d = await r.json();
    if (d.error) console.log(`[CEO-Review] SambaNova error:`, JSON.stringify(d.error).substring(0, 200));
    const result = d.choices?.[0]?.message?.content;
    console.log(`[CEO-Review] ${agentName}: AI result=${result ? result.substring(0, 100) : "null"}, status=${r.status}`);
    if (result) {
      trackAICost({ provider: "SambaNova", model: "Qwen3-235B", feature: "ceo-review",
        inputTokens: d.usage?.prompt_tokens || 0, outputTokens: d.usage?.completion_tokens || 0 });
      try {
        const parsed = JSON.parse(result);
        if (parsed.ceo && parsed.emp) {
          ceoReviewCache[agentName] = { ceo: parsed.ceo, emp: parsed.emp, ts: Date.now() };
          console.log(`[CEO-Review] ✅ ${agentName}: "${parsed.ceo}" → "${parsed.emp}"`);
          return res.json(parsed);
        }
        console.log(`[CEO-Review] ❌ parsed แต่ไม่มี ceo/emp:`, JSON.stringify(parsed).substring(0, 100));
      } catch (pe) { console.log(`[CEO-Review] ❌ JSON parse fail:`, pe.message); }
    }
  } catch (e) {
    console.log("[CEO-Review] error:", e.message);
  }
  res.json({ ceo: "", emp: "" });
});

app.get("/api/costs", async (req, res) => {
  const database = await getDB();
  if (!database) return res.json({ today: {}, weekly: {}, daily: [] });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    // สรุปรายวัน (7 วันล่าสุด)
    const dailyPipeline = [
      { $match: { createdAt: { $gte: weekStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$costUsd" },
          calls: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    // สรุปตาม feature
    const featurePipeline = [
      { $match: { createdAt: { $gte: weekStart } } },
      {
        $group: {
          _id: "$feature",
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$costUsd" },
          calls: { $sum: 1 },
          avgTokens: { $avg: "$totalTokens" },
        },
      },
      { $sort: { totalCost: -1 } },
    ];

    // สรุปตาม provider
    const providerPipeline = [
      { $match: { createdAt: { $gte: weekStart } } },
      {
        $group: {
          _id: "$provider",
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$costUsd" },
          calls: { $sum: 1 },
        },
      },
      { $sort: { calls: -1 } },
    ];

    // วันนี้
    const todayPipeline = [
      { $match: { createdAt: { $gte: todayStart } } },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$costUsd" },
          calls: { $sum: 1 },
          inputTokens: { $sum: "$inputTokens" },
          outputTokens: { $sum: "$outputTokens" },
        },
      },
    ];

    // เดือนนี้
    const monthPipeline = [
      { $match: { createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$costUsd" },
          calls: { $sum: 1 },
        },
      },
    ];

    // รายการล่าสุด 20 รายการ
    const recentCosts = await database.collection("ai_costs")
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .project({ provider: 1, model: 1, feature: 1, totalTokens: 1, costUsd: 1, createdAt: 1, service: 1 })
      .toArray();

    const [daily, byFeature, byProvider, todayResult, monthResult] = await Promise.all([
      database.collection("ai_costs").aggregate(dailyPipeline).toArray(),
      database.collection("ai_costs").aggregate(featurePipeline).toArray(),
      database.collection("ai_costs").aggregate(providerPipeline).toArray(),
      database.collection("ai_costs").aggregate(todayPipeline).toArray(),
      database.collection("ai_costs").aggregate(monthPipeline).toArray(),
    ]);

    res.json({
      today: todayResult[0] || { totalTokens: 0, totalCost: 0, calls: 0, inputTokens: 0, outputTokens: 0 },
      month: monthResult[0] || { totalTokens: 0, totalCost: 0, calls: 0 },
      daily,
      byFeature,
      byProvider,
      recent: recentCosts,
    });
  } catch (e) {
    console.error("[Costs API] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// === Inbox: Send Message (Reply-first → Push-fallback) ===

// สร้าง LINE message objects จาก payload
// รองรับ: text, image, video, audio, location, sticker, template, flex, quickReply
function buildLineMessages({ text, imageUrl, videoUrl, audioUrl, audioDuration, location, sticker, template, flex, quickReply }) {
  const messages = [];
  if (text) {
    const textMsg = { type: "text", text };
    // quickReply แนบกับข้อความสุดท้าย (LINE API rule)
    messages.push(textMsg);
  }
  if (imageUrl) {
    messages.push({
      type: "image",
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl,
    });
  }
  if (videoUrl) {
    messages.push({
      type: "video",
      originalContentUrl: videoUrl,
      previewImageUrl: imageUrl || videoUrl, // ใช้ imageUrl เป็น thumbnail ถ้ามี
    });
  }
  if (audioUrl) {
    messages.push({
      type: "audio",
      originalContentUrl: audioUrl,
      duration: audioDuration || 60000, // default 60 วินาที
    });
  }
  if (location && location.latitude && location.longitude) {
    messages.push({
      type: "location",
      title: location.title || "ตำแหน่งที่ตั้ง",
      address: location.address || "",
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }
  if (sticker && sticker.packageId && sticker.stickerId) {
    messages.push({
      type: "sticker",
      packageId: String(sticker.packageId),
      stickerId: String(sticker.stickerId),
    });
  }
  if (template) {
    messages.push({
      type: "template",
      altText: template.altText || "ข้อความ template",
      template: template.content || template,
    });
  }
  if (flex) {
    messages.push({
      type: "flex",
      altText: flex.altText || "ข้อความ Flex",
      contents: flex.contents || flex,
    });
  }
  // แนบ quickReply กับข้อความสุดท้าย
  if (quickReply && quickReply.items && messages.length > 0) {
    messages[messages.length - 1].quickReply = { items: quickReply.items };
  }
  return messages;
}

// ส่งด้วย Reply API (ฟรี!) — ใช้ replyToken ที่ cache ไว้
async function sendLineReply(replyToken, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !replyToken) return false;
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    });
    if (res.ok) {
      console.log("[Inbox] ✅ Reply API สำเร็จ (ฟรี!)");
      return true;
    }
    const errText = await res.text().catch(() => "");
    console.log(`[Inbox] Reply API ล้มเหลว (${res.status}) — fallback to Push`);
    return false;
  } catch (e) {
    console.log("[Inbox] Reply API error:", e.message, "— fallback to Push");
    return false;
  }
}

// ส่งด้วย Push API (เสียเงิน) — fallback
async function sendLinePush(to, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn("[Inbox] LINE_CHANNEL_ACCESS_TOKEN not set — cannot push");
    return false;
  }
  if (messages.length === 0) return false;
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, messages }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[Inbox] LINE push error:", res.status, errText);
      return false;
    }
    console.log("[Inbox] ✅ Push API สำเร็จ");
    return true;
  } catch (e) {
    console.error("[Inbox] sendLinePush error:", e.message);
    return false;
  }
}

// Strategy: Reply-first → Push-fallback (ประหยัดค่าใช้จ่าย)
async function sendLineMessage(sourceId, payload) {
  const messages = buildLineMessages(payload);
  if (messages.length === 0) return { sent: false, method: "none" };

  // 1) ลอง Reply API ก่อน (ฟรี!)
  const cachedToken = getReplyToken(sourceId);
  if (cachedToken) {
    const replySent = await sendLineReply(cachedToken, messages);
    if (replySent) return { sent: true, method: "reply" };
  }

  // 2) Fallback → Push API
  const pushSent = await sendLinePush(sourceId, messages);
  return { sent: pushSent, method: pushSent ? "push" : "failed" };
}

// POST /api/inbox/send — ส่งข้อความจาก Dashboard ไปหาลูกค้า
// รองรับ: text, imageUrl, sticker { packageId, stickerId }
app.post("/api/inbox/send", sendLimiter, express.json(), async (req, res) => {
  const {
    sourceId, platform, text, imageUrl, videoUrl, audioUrl, audioDuration,
    location, sticker, template, flex, quickReply, staffName
  } = req.body;

  if (!sourceId || !platform) {
    return res.status(400).json({ error: "sourceId and platform required" });
  }
  const hasContent = text || imageUrl || videoUrl || audioUrl || location || sticker || template || flex;
  if (!hasContent) {
    return res.status(400).json({ error: "ต้องมีเนื้อหาอย่างน้อย 1 อย่าง" });
  }

  const senderName = staffName || "พนักงาน";
  let sent = false;
  let method = "push";

  // Admin ตอบแล้ว → ยกเลิก auto-reply timer
  cancelAutoReply(sourceId);

  try {
    if (platform === "line") {
      const payload = { text, imageUrl, videoUrl, audioUrl, audioDuration, location, sticker, template, flex, quickReply };
      const result = await sendLineMessage(sourceId, payload);
      sent = result.sent;
      method = result.method;
    } else if (platform === "facebook" || platform === "instagram") {
      const recipientId = sourceId.replace(/^(fb_|ig_)/, "");
      if (text) {
        sent = await sendMetaMessage(recipientId, text);
        method = "push";
      }
    } else {
      return res.status(400).json({ error: `platform '${platform}' not supported` });
    }

    if (!sent) {
      return res.status(502).json({ error: "ส่งข้อความไม่สำเร็จ — ตรวจสอบ token และการตั้งค่า" });
    }

    // กำหนด messageType + content สำหรับเก็บ
    let messageType = "text";
    let content = text || "";
    if (sticker) { messageType = "sticker"; content = content || `[sticker:${sticker.packageId}/${sticker.stickerId}]`; }
    else if (videoUrl) { messageType = "video"; content = content || "[วิดีโอ]"; }
    else if (audioUrl) { messageType = "audio"; content = content || "[เสียง]"; }
    else if (location) { messageType = "location"; content = content || `[ตำแหน่ง: ${location.title || ""}]`; }
    else if (imageUrl && !text) { messageType = "image"; }
    else if (template) { messageType = "template"; content = content || "[ข้อความ template]"; }
    else if (flex) { messageType = "flex"; content = content || "[Flex Message]"; }

    // บันทึกข้อความลง MongoDB
    await saveMsg(
      sourceId,
      {
        role: "assistant",
        userName: senderName,
        content,
        messageType,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        audioUrl: audioUrl || null,
        location: location || null,
        sticker: sticker || null,
        sendMethod: method,
      },
      platform
    );

    auditLog("send_message", { sourceId, platform, staffName: senderName, messageType }).catch(() => {});
    console.log(`[Inbox] ✅ ส่ง${method === "reply" ? "(ฟรี)" : "(push)"} → ${platform}:${sourceId.substring(0, 8)} โดย ${senderName}`);
    res.json({ ok: true, method });
  } catch (e) {
    console.error("[Inbox] /api/inbox/send error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/inbox/upload — อัพโหลดรูปภาพสำหรับส่ง
app.post("/api/inbox/upload", uploadLimiter, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "ไม่มีไฟล์รูปภาพ" });
  }
  // [Security] Validate file signature (magic bytes)
  if (!validateImageSignature(req.file.path)) {
    fs.unlinkSync(req.file.path);
    console.warn("[Security] Rejected upload — invalid image signature:", req.file.originalname);
    return res.status(400).json({ error: "ไฟล์ไม่ใช่รูปภาพที่รองรับ (JPEG/PNG/GIF/WebP)" });
  }
  // สร้าง public URL (ผ่าน nginx/proxy)
  const baseUrl = process.env.BASE_URL || `https://crm.satistang.com`;
  const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
  auditLog("upload_image", { filename: req.file.filename }).catch(() => {});
  res.json({ ok: true, imageUrl, filename: req.file.filename });
});

// Serve uploaded images
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));

// === AI Suggest Reply — แนะนำคำตอบ + เหตุผลให้ Admin ===
app.post("/api/inbox/suggest", aiLimiter, express.json(), async (req, res) => {
  const { sourceId } = req.body;
  if (!sourceId) return res.status(400).json({ error: "sourceId required" });

  auditLog("view_suggest", { sourceId }).catch(() => {});

  try {
    const db = await getDB();

    // ดึง 15 ข้อความล่าสุด
    const recentMsgs = await db.collection("messages")
      .find({ sourceId })
      .sort({ createdAt: -1 })
      .limit(15)
      .project({ role: 1, userName: 1, content: 1, messageType: 1, createdAt: 1 })
      .toArray();

    if (recentMsgs.length === 0) {
      return res.json({ suggestions: [] });
    }

    recentMsgs.reverse(); // เรียงจากเก่า→ใหม่

    // ดึงข้อมูล customer (ถ้ามี)
    const customer = await db.collection("customers")
      .findOne({ rooms: sourceId })
      .catch(() => null);

    // ดึง sentiment ล่าสุด
    const analytics = await db.collection("chat_analytics")
      .findOne({ sourceId })
      .catch(() => null);

    // สร้าง context
    const chatHistory = recentMsgs.map(m =>
      `[${m.role === "user" ? m.userName || "ลูกค้า" : "พนักงาน"}]: ${m.content || `[${m.messageType}]`}`
    ).join("\n");

    const customerInfo = customer
      ? `\nข้อมูลลูกค้า: ${customer.name || "ไม่ทราบชื่อ"}${customer.pipelineStage ? `, สถานะ: ${customer.pipelineStage}` : ""}${customer.tags?.length ? `, แท็ก: ${customer.tags.join(",")}` : ""}`
      : "";

    const sentimentInfo = analytics
      ? `\nSentiment: ${analytics.customerSentiment?.level || "ไม่ทราบ"}, Purchase Intent: ${analytics.purchaseIntent?.level || "ไม่ทราบ"}`
      : "";

    const aiMessages = [
      {
        role: "system",
        content: `คุณเป็นที่ปรึกษาการขายและบริการลูกค้า วิเคราะห์บทสนทนาแล้วแนะนำคำตอบให้พนักงาน

ตอบเป็น JSON format:
{
  "suggestions": [
    {
      "text": "ข้อความที่แนะนำ (ภาษาไทย สุภาพ เป็นธรรมชาติ)",
      "reason": "เหตุผลสั้นๆ ว่าทำไมควรตอบแบบนี้",
      "tone": "friendly|professional|urgent|empathetic",
      "priority": "high|medium|low"
    }
  ],
  "analysis": "สรุปสถานการณ์ 1 ประโยค"
}

กฏ:
- แนะนำ 2-3 คำตอบ เรียงตามลำดับเหมาะสม
- ข้อความต้องกระชับ ไม่เกิน 3 ประโยค
- วิเคราะห์อารมณ์ลูกค้า + ความต้องการ
- ถ้าลูกค้าถามราคา → แนะนำถามรายละเอียดก่อน แล้วค่อยเสนอ
- ถ้าลูกค้าร้องเรียน → แนะนำเห็นใจก่อน แล้วค่อยแก้ปัญหา
- ถ้าลูกค้าสนใจซื้อ → แนะนำปิดการขาย
- ตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น`
      },
      {
        role: "user",
        content: await (async () => {
          // ดึง memory + KB + skill lessons
          const lastCustomerMsg = recentMsgs.filter(m => m.role === "user").pop();
          const allSourceIds = customer?.rooms || [sourceId];
          const aiContext = await buildAIContext(sourceId, lastCustomerMsg?.content || chatHistory.substring(0, 200), allSourceIds);
          return `บทสนทนา:\n${cleanForAI(chatHistory)}${customerInfo}${sentimentInfo}${aiContext}\n\nแนะนำคำตอบให้พนักงาน:`;
        })()
      }
    ];

    const reply = await callLightAI(aiMessages, { maxTokens: 500, timeout: 20000 }).catch(() => null);

    if (!reply) {
      return res.json({ suggestions: [], analysis: "ไม่สามารถวิเคราะห์ได้" });
    }

    // Parse JSON จาก AI response (หลายวิธี)
    let parsed = null;

    // วิธี 1: ลอง parse ทั้งก้อน
    try { parsed = JSON.parse(reply.trim()); } catch {}

    // วิธี 2: ตัด markdown code block แล้ว parse
    if (!parsed) {
      try {
        const codeBlock = reply.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlock) parsed = JSON.parse(codeBlock[1].trim());
      } catch {}
    }

    // วิธี 3: หา JSON object ด้วย bracket matching
    if (!parsed) {
      try {
        const start = reply.indexOf("{");
        if (start >= 0) {
          let depth = 0;
          let end = start;
          for (let i = start; i < reply.length; i++) {
            if (reply[i] === "{") depth++;
            if (reply[i] === "}") depth--;
            if (depth === 0) { end = i + 1; break; }
          }
          parsed = JSON.parse(reply.substring(start, end));
        }
      } catch {}
    }

    if (parsed && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
      // ตรวจสอบ format แต่ละ suggestion
      parsed.suggestions = parsed.suggestions.map(s => ({
        text: s.text || "",
        reason: s.reason || "AI แนะนำ",
        tone: s.tone || "friendly",
        priority: s.priority || "medium",
      }));
      return res.json(parsed);
    }

    // Fallback: ถ้า parse ไม่ได้เลย → แยก text ออกจาก JSON artifacts
    const cleanText = reply
      .replace(/```json\s*/g, "").replace(/```/g, "")
      .replace(/\{[\s\S]*\}/g, "")
      .trim();

    res.json({
      suggestions: [{ text: cleanText || reply.substring(0, 200), reason: "AI แนะนำ", tone: "friendly", priority: "medium" }],
      analysis: ""
    });
  } catch (e) {
    console.error("[Suggest] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// === Knowledge Base (KM) — Qdrant Cloud + MongoDB ===
const KB_COLL = "knowledge_base"; // MongoDB เก็บ metadata
const QDRANT_URL = process.env.QDRANT_URL || ""; // e.g. https://xxx.cloud.qdrant.io:6333
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";
const QDRANT_COLLECTION = "knowledge_base";

// Qdrant helper: เรียก Qdrant REST API
async function qdrantRequest(method, path, body = null) {
  if (!QDRANT_URL) throw new Error("QDRANT_URL not set");
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(QDRANT_API_KEY ? { "api-key": QDRANT_API_KEY } : {}),
    },
    signal: AbortSignal.timeout(10000),
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${QDRANT_URL}${path}`, opts);
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Qdrant ${method} ${path}: ${res.status} ${err.substring(0, 200)}`);
  }
  return res.json();
}

// สร้าง collection ใน Qdrant (ครั้งแรก)
async function ensureQdrantCollection() {
  if (!QDRANT_URL) return;
  try {
    await qdrantRequest("GET", `/collections/${QDRANT_COLLECTION}`);
  } catch {
    try {
      await qdrantRequest("PUT", `/collections/${QDRANT_COLLECTION}`, {
        vectors: { size: 768, distance: "Cosine" }, // Gemini embedding = 768 dims
      });
      console.log("[Qdrant] ✅ Collection สร้างแล้ว:", QDRANT_COLLECTION);
    } catch (e) {
      console.error("[Qdrant] Create collection error:", e.message);
    }
  }
}

// Upsert KB เข้า Qdrant
async function upsertKBToQdrant(id, title, content, category, tags) {
  if (!QDRANT_URL) return;
  const embedding = await getEmbedding(`${title} ${content}`.substring(0, 2000));
  if (!embedding) return;
  await qdrantRequest("PUT", `/collections/${QDRANT_COLLECTION}/points`, {
    points: [{
      id: id.toString(),
      vector: embedding,
      payload: { title, content: content.substring(0, 5000), category, tags },
    }],
  });
  console.log(`[Qdrant] ✅ Upsert: ${title.substring(0, 30)}`);
}

// ลบ KB จาก Qdrant
async function deleteKBFromQdrant(id) {
  if (!QDRANT_URL) return;
  try {
    await qdrantRequest("POST", `/collections/${QDRANT_COLLECTION}/points/delete`, {
      points: [id.toString()],
    });
  } catch {}
}

// ค้นหา KB จาก Qdrant (semantic search)
async function searchKB(queryText, limit = 5) {
  // ลอง Qdrant ก่อน
  if (QDRANT_URL) {
    try {
      const queryEmbed = await getEmbedding(queryText);
      if (queryEmbed) {
        const result = await qdrantRequest("POST", `/collections/${QDRANT_COLLECTION}/points/query`, {
          query: queryEmbed,
          limit,
          with_payload: true,
          score_threshold: 0.3,
        });
        const points = result.result?.points || result.result || [];
        if (points.length > 0) {
          return points.map(p => ({
            _id: p.id,
            title: p.payload?.title || "",
            content: p.payload?.content || "",
            category: p.payload?.category || "",
            tags: p.payload?.tags || [],
            score: p.score,
          }));
        }
      }
    } catch (e) {
      console.error("[Qdrant] Search error:", e.message);
    }
  }

  // Fallback: MongoDB keyword search
  try {
    const db = await getDB();
    if (!db) return [];
    const keywords = queryText.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s]/g, "").trim();
    if (keywords) {
      return await db.collection(KB_COLL).find(
        { active: true, $or: [
          { content: { $regex: keywords.split(/\s+/).slice(0, 3).join("|"), $options: "i" } },
          { title: { $regex: keywords.split(/\s+/).slice(0, 3).join("|"), $options: "i" } },
        ]},
        { projection: { title: 1, content: 1, category: 1, tags: 1 } }
      ).limit(limit).toArray();
    }
  } catch {}
  return [];
}

// Init Qdrant collection on startup
ensureQdrantCollection().catch(() => {});

// GET /api/km — รายการ KB ทั้งหมด
app.get("/api/km", async (req, res) => {
  try {
    const db = await getDB();
    const items = await db.collection(KB_COLL)
      .find({}, { projection: { embedding: 0 } })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/km — สร้าง KB ใหม่
app.post("/api/km", express.json({ limit: "5mb" }), async (req, res) => {
  const { title, content, category, tags } = req.body;
  if (!title || !content) return res.status(400).json({ error: "title and content required" });

  try {
    const db = await getDB();
    const doc = {
      title: title.trim(),
      content: content.trim(),
      category: category || "general",
      tags: Array.isArray(tags) ? tags : (tags || "").split(",").map(t => t.trim()).filter(Boolean),
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection(KB_COLL).insertOne(doc);

    // Upsert เข้า Qdrant (async)
    upsertKBToQdrant(result.insertedId, title, content, category || "general", doc.tags).catch(e =>
      console.error("[KB] Qdrant upsert error:", e.message)
    );

    auditLog("create_kb", { title }).catch(() => {});
    console.log(`[KB] + เพิ่ม: ${title}`);
    res.json({ ok: true, id: result.insertedId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/km/:id — แก้ไข / เปิด-ปิด
app.patch("/api/km/:id", express.json(), async (req, res) => {
  const { ObjectId } = require("mongodb");
  const { title, content, category, tags, active } = req.body;
  try {
    const db = await getDB();
    const update = { updatedAt: new Date() };
    if (title !== undefined) update.title = title.trim();
    if (content !== undefined) update.content = content.trim();
    if (category !== undefined) update.category = category;
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim()).filter(Boolean);
    if (active !== undefined) update.active = active;

    await db.collection(KB_COLL).updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });

    // Re-embed Qdrant ถ้าแก้เนื้อหา
    if (title !== undefined || content !== undefined) {
      const doc = await db.collection(KB_COLL).findOne({ _id: new ObjectId(req.params.id) });
      if (doc) {
        upsertKBToQdrant(doc._id, doc.title, doc.content, doc.category, doc.tags).catch(() => {});
      }
    }

    auditLog("update_kb", { id: req.params.id, active }).catch(() => {});
    console.log(`[KB] ✏️ อัพเดท: ${req.params.id} ${active !== undefined ? (active ? "→ เปิด" : "→ ปิด") : ""}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/km/:id — ลบ KB
app.delete("/api/km/:id", express.json(), async (req, res) => {
  const { ObjectId } = require("mongodb");
  try {
    const db = await getDB();
    await db.collection(KB_COLL).deleteOne({ _id: new ObjectId(req.params.id) });
    deleteKBFromQdrant(req.params.id).catch(() => {});
    auditLog("delete_kb", { id: req.params.id }).catch(() => {});
    console.log(`[KB] 🗑️ ลบ: ${req.params.id}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/memory/:sourceId — ดู memory + skill lessons ของลูกค้า/กลุ่ม
app.get("/api/memory/:sourceId", async (req, res) => {
  try {
    const db = await getDB();
    const memory = await getMemory(req.params.sourceId);
    const lessons = await db.collection(SKILL_LESSONS_COLL)
      .find({ sourceId: req.params.sourceId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    const globalLessons = await getSkillLessons(10);
    res.json({ memory: memory || {}, lessons, globalLessons });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/skills/lessons — ดู global skill lessons ทั้งหมด
app.get("/api/skills/lessons", async (req, res) => {
  try {
    const db = await getDB();
    const lessons = await db.collection(SKILL_LESSONS_COLL)
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    res.json(lessons);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/km/search — ค้นหา KB (สำหรับ debug/test)
app.post("/api/km/search", aiLimiter, express.json(), async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "query required" });
  try {
    const results = await searchKB(query);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === Customer Merge — ค้นหาลูกค้าซ้ำ ===

// GET /api/customers/duplicates — หาลูกค้าที่อาจเป็นคนเดียวกัน
app.get("/api/customers/duplicates", async (req, res) => {
  try {
    const db = await getDB();
    const customers = await db.collection("customers")
      .find({}, {
        projection: { name: 1, firstName: 1, lastName: 1, phone: 1, email: 1, rooms: 1, platformIds: 1, totalMessages: 1, avatarUrl: 1, updatedAt: 1, pipelineStage: 1 }
      })
      .sort({ name: 1 })
      .toArray();

    // หาลูกค้าที่อาจซ้ำ
    const groups = [];
    const used = new Set();

    for (let i = 0; i < customers.length; i++) {
      if (used.has(customers[i]._id.toString())) continue;
      const matches = [];

      for (let j = i + 1; j < customers.length; j++) {
        if (used.has(customers[j]._id.toString())) continue;
        const a = customers[i];
        const b = customers[j];
        const reasons = [];

        // ชื่อเหมือนกัน
        const nameA = (a.firstName || a.name || "").toLowerCase().trim();
        const nameB = (b.firstName || b.name || "").toLowerCase().trim();
        if (nameA && nameB && nameA.length >= 2 && nameA === nameB) reasons.push("ชื่อเหมือนกัน");

        // เบอร์โทรเหมือนกัน
        if (a.phone && b.phone && a.phone.replace(/\D/g, "") === b.phone.replace(/\D/g, "")) reasons.push("เบอร์โทรเดียวกัน");

        // Email เหมือนกัน
        if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) reasons.push("Email เดียวกัน");

        // ชื่อคล้ายกัน (3+ ตัวแรกเหมือน + ยาวพอ)
        if (!reasons.length && nameA.length >= 4 && nameB.length >= 4 && nameA.substring(0, 4) === nameB.substring(0, 4)) {
          reasons.push("ชื่อคล้ายกัน");
        }

        if (reasons.length > 0) {
          matches.push({ customer: b, reasons });
          used.add(b._id.toString());
        }
      }

      if (matches.length > 0) {
        used.add(customers[i]._id.toString());
        groups.push({ primary: customers[i], duplicates: matches });
      }
    }

    // แยกลูกค้า multi-platform ที่มีแค่ 1 platform (อาจมี account อื่นอีก)
    function hasAnyId(val) { return Array.isArray(val) ? val.filter(Boolean).length > 0 : !!val; }
    const singlePlatform = customers.filter(c => {
      const pids = c.platformIds || {};
      const count = [pids.line, pids.facebook, pids.instagram].filter(v => hasAnyId(v)).length;
      return count === 1 && !used.has(c._id.toString());
    });

    res.json({
      groups,
      singlePlatform: singlePlatform.length,
      totalCustomers: customers.length,
      duplicateGroups: groups.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === AI Learning System — Memory + Skill Refinement ===
const MEMORY_COLL = "ai_memory";        // จำลูกค้า + กลุ่ม
const SKILL_LESSONS_COLL = "ai_skill_lessons"; // เรียนรู้จากความสำเร็จ/ล้มเหลว

// ── Customer/Group Memory ──────────────────────────────────────────────────

// ดึง memory ของ sourceId (compact แล้ว ประหยัด token)
async function getMemory(sourceId) {
  const db = await getDB();
  if (!db) return null;
  return db.collection(MEMORY_COLL).findOne({ sourceId });
}

// บันทึก/อัพเดท memory
async function upsertMemory(sourceId, updates) {
  const db = await getDB();
  if (!db) return;
  await db.collection(MEMORY_COLL).updateOne(
    { sourceId },
    { $set: { ...updates, updatedAt: new Date() }, $setOnInsert: { sourceId, createdAt: new Date() } },
    { upsert: true }
  );
}

// วิเคราะห์ข้อความ → อัพเดท memory อัตโนมัติ (เรียกหลัง processEvent)
async function learnFromMessage(sourceId, userName, content, messageType, sourceType) {
  if (!content || content.startsWith("[") || messageType !== "text") return;
  if (content.length < 5) return; // ข้อความสั้นเกินไม่มีอะไรเรียนรู้

  const db = await getDB();
  if (!db) return;

  const mem = await getMemory(sourceId) || {};
  const msgCount = (mem.messageCount || 0) + 1;

  // ทุกข้อความ: อัพเดท stats
  const quickUpdate = {
    messageCount: msgCount,
    lastMessageAt: new Date(),
    lastUserName: userName,
    sourceType: sourceType || mem.sourceType,
  };

  // ทุก 10 ข้อความ: AI สรุป + เรียนรู้ (ประหยัด token)
  if (msgCount % 10 === 0) {
    compactMemory(sourceId, mem).catch(() => {});
  }

  // ตรวจจับ signals พิเศษ (ไม่ใช้ AI ประหยัด token)
  const lower = content.toLowerCase();

  // 🛒 ซื้อสินค้า → เรียนรู้ทำไมถึงสำเร็จ
  if (/สั่ง|ซื้อ|จ่าย|โอน|ชำระ|order|สลิป/.test(lower)) {
    quickUpdate.lastPurchaseSignal = new Date();
    quickUpdate.purchaseCount = (mem.purchaseCount || 0) + 1;
    learnSkillFromOutcome(sourceId, "purchase").catch(() => {});
  }
  // 👍 ชม / พอใจ → เรียนรู้อะไรได้ผล
  if (/ขอบคุณ|ดีมาก|สุดยอด|ประทับใจ|แนะนำ|ชอบ|เยี่ยม|thank|great|good/.test(lower)) {
    quickUpdate.lastPositiveFeedback = new Date();
    quickUpdate.positiveCount = (mem.positiveCount || 0) + 1;
    learnSkillFromOutcome(sourceId, "positive").catch(() => {});
  }
  // 😤 ร้องเรียน → เรียนรู้อะไรไม่ได้ผล
  if (/ผิดหวัง|แย่|ช้า|เสีย|ไม่ดี|คืนเงิน|ยกเลิก|ร้องเรียน/.test(lower)) {
    quickUpdate.lastNegativeFeedback = new Date();
    quickUpdate.negativeCount = (mem.negativeCount || 0) + 1;
    learnSkillFromOutcome(sourceId, "negative").catch(() => {});
  }
  // 📦 ถามสินค้า (detect product interest)
  if (/ราคา|รุ่น|สี|ขนาด|spec|รายละเอียด|มีอะไร|แบบไหน/.test(lower)) {
    quickUpdate.lastProductInquiry = new Date();
  }

  await upsertMemory(sourceId, quickUpdate);
}

// ── Auto Compact Memory (ทุก 10 ข้อความ) ───────────────────────────────────

async function compactMemory(sourceId, existingMem) {
  const db = await getDB();
  if (!db) return;

  // ดึง 20 ข้อความล่าสุด
  const recentMsgs = await db.collection("messages")
    .find({ sourceId, role: "user" })
    .sort({ createdAt: -1 })
    .limit(20)
    .project({ content: 1, userName: 1, createdAt: 1 })
    .toArray();

  if (recentMsgs.length < 5) return;

  const chatSample = recentMsgs.reverse()
    .map(m => `${m.userName}: ${m.content}`)
    .join("\n");

  const prevSummary = existingMem.compactSummary || "";

  const aiMessages = [
    {
      role: "system",
      content: `คุณเป็นระบบสรุป Memory ของลูกค้า/กลุ่ม สรุปให้สั้นที่สุด (ไม่เกิน 150 คำ) เป็นภาษาไทย

ตอบเป็น JSON:
{
  "compactSummary": "สรุปรวม: ลูกค้าเป็นใคร ชอบอะไร ซื้ออะไร สไตล์พูดแบบไหน",
  "interests": ["สินค้าที่สนใจ"],
  "personality": "สไตล์ลูกค้า (สั้นๆ เช่น ใจร้อน, ชอบต่อราคา, ถามละเอียด)",
  "bestApproach": "วิธีตอบที่เหมาะกับลูกค้าคนนี้ (1 ประโยค)",
  "purchaseHistory": "สิ่งที่เคยซื้อ/สนใจ (ถ้ามี)",
  "skillLesson": "บทเรียนจากการสนทนานี้ — อะไรได้ผล/ไม่ได้ผล (1 ประโยค)"
}`
    },
    {
      role: "user",
      content: `Memory เดิม: ${prevSummary || "ยังไม่มี"}\n\nบทสนทนาล่าสุด:\n${cleanForAI(chatSample)}\n\nสรุป Memory ใหม่:`
    },
  ];

  const reply = await callLightAI(aiMessages, { maxTokens: 300, timeout: 20000 }).catch(() => null);
  if (!reply) return;

  // Parse JSON
  let parsed = null;
  try { parsed = JSON.parse(reply.trim()); } catch {}
  if (!parsed) {
    try {
      const m = reply.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    } catch {}
  }

  if (parsed) {
    await upsertMemory(sourceId, {
      compactSummary: parsed.compactSummary || prevSummary,
      interests: parsed.interests || existingMem.interests || [],
      personality: parsed.personality || existingMem.personality || "",
      bestApproach: parsed.bestApproach || existingMem.bestApproach || "",
      purchaseHistory: parsed.purchaseHistory || existingMem.purchaseHistory || "",
      lastCompactAt: new Date(),
    });

    // บันทึก skill lesson (ถ้ามี)
    if (parsed.skillLesson) {
      await db.collection(SKILL_LESSONS_COLL).insertOne({
        sourceId,
        lesson: parsed.skillLesson,
        context: "auto-compact",
        createdAt: new Date(),
      });
    }

    console.log(`[Memory] 🧠 Compact: ${sourceId.substring(0, 8)} — ${(parsed.compactSummary || "").substring(0, 50)}`);
  }
}

// ── Skill Lessons — เรียนรู้จาก success/failure ────────────────────────────

// เรียกตอนลูกค้าชม/ซื้อ/ร้องเรียน → สรุปบทเรียน
async function learnSkillFromOutcome(sourceId, outcomeType) {
  const db = await getDB();
  if (!db) return;

  // ดึง 10 ข้อความล่าสุด (ก่อน outcome)
  const recentMsgs = await db.collection("messages")
    .find({ sourceId })
    .sort({ createdAt: -1 })
    .limit(10)
    .project({ role: 1, userName: 1, content: 1 })
    .toArray();

  if (recentMsgs.length < 3) return;

  const chatSample = recentMsgs.reverse()
    .map(m => `[${m.role === "assistant" ? "staff" : m.userName}]: ${m.content}`)
    .join("\n");

  const outcomeLabels = {
    purchase: "ลูกค้าซื้อสินค้า (สำเร็จ!)",
    positive: "ลูกค้าชม/พอใจ (สำเร็จ!)",
    negative: "ลูกค้าร้องเรียน/ไม่พอใจ (ล้มเหลว!)",
  };

  const aiMessages = [
    {
      role: "system",
      content: `วิเคราะห์บทสนทนานี้ ผลลัพธ์คือ: ${outcomeLabels[outcomeType] || outcomeType}

ตอบเป็น JSON สั้นๆ:
{
  "whatWorked": "อะไรที่ทำได้ดี (1 ประโยค)",
  "whatFailed": "อะไรที่ควรปรับ (1 ประโยค)",
  "rule": "กฎที่ควรจำ สำหรับใช้กับลูกค้าคนอื่นด้วย (1 ประโยค)",
  "category": "sales|service|product|communication"
}`
    },
    { role: "user", content: cleanForAI(chatSample) },
  ];

  const reply = await callLightAI(aiMessages, { maxTokens: 200, timeout: 15000 }).catch(() => null);
  if (!reply) return;

  let parsed = null;
  try { parsed = JSON.parse(reply.trim()); } catch {}
  if (!parsed) { try { const m = reply.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch {} }

  if (parsed) {
    await db.collection(SKILL_LESSONS_COLL).insertOne({
      sourceId,
      outcomeType,
      whatWorked: parsed.whatWorked || "",
      whatFailed: parsed.whatFailed || "",
      rule: parsed.rule || "",
      category: parsed.category || "general",
      createdAt: new Date(),
    });
    console.log(`[Skill] 📝 Lesson (${outcomeType}): ${(parsed.rule || "").substring(0, 60)}`);
  }
}

// ดึง skill lessons ล่าสุด (สำหรับ AI suggest/auto-reply)
async function getSkillLessons(limit = 5) {
  const db = await getDB();
  if (!db) return [];
  return db.collection(SKILL_LESSONS_COLL)
    .find({}, { projection: { rule: 1, category: 1, outcomeType: 1 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

// ── Build AI Context (memory + skills + KB) ────────────────────────────────

async function buildAIContext(sourceId, customerMessage, allSourceIds = null) {
  // ถ้ามี allSourceIds (merged customer) → ใช้ room แรกเป็น memory หลัก
  const memorySourceId = allSourceIds?.[0] || sourceId;
  const [memory, kbResults, lessons] = await Promise.all([
    getMemory(memorySourceId).catch(() => null),
    searchKB(customerMessage, 3).catch(() => []),
    getSkillLessons(5).catch(() => []),
  ]);

  let context = "";

  // Memory
  if (memory?.compactSummary) {
    context += `\nข้อมูลลูกค้า: ${memory.compactSummary}`;
    if (memory.personality) context += `\nสไตล์: ${memory.personality}`;
    if (memory.bestApproach) context += `\nวิธีตอบที่เหมาะ: ${memory.bestApproach}`;
    if (memory.interests?.length) context += `\nสนใจ: ${memory.interests.join(", ")}`;
    if (memory.purchaseHistory) context += `\nเคยซื้อ: ${memory.purchaseHistory}`;
  }

  // KB
  if (kbResults.length > 0) {
    context += `\n\nฐานความรู้:\n${kbResults.map(k => `[${k.category}] ${k.title}: ${k.content.substring(0, 300)}`).join("\n")}`;
  }

  // Skill Lessons
  if (lessons.length > 0) {
    const rules = lessons.filter(l => l.rule).map(l => `- ${l.rule}`).join("\n");
    if (rules) context += `\n\nบทเรียนที่เรียนรู้มา:\n${rules}`;
  }

  return context;
}

// === Merge Consolidation — รวม AI data หลัง merge ลูกค้า ===

async function consolidateMemoryAfterMerge(primaryRooms, secondaryRooms) {
  const db = await getDB();
  if (!db) return;
  const allRooms = [...primaryRooms, ...secondaryRooms];
  const memDocs = await db.collection(MEMORY_COLL).find({ sourceId: { $in: allRooms } }).toArray();
  if (memDocs.length <= 1) return;

  const merged = {
    messageCount: 0, purchaseCount: 0, positiveCount: 0, negativeCount: 0,
    compactSummary: "", interests: [], personality: "", bestApproach: "", purchaseHistory: "",
  };
  for (const m of memDocs) {
    merged.messageCount += m.messageCount || 0;
    merged.purchaseCount += m.purchaseCount || 0;
    merged.positiveCount += m.positiveCount || 0;
    merged.negativeCount += m.negativeCount || 0;
    if (m.compactSummary) merged.compactSummary += (merged.compactSummary ? " | " : "") + m.compactSummary;
    if (m.interests) merged.interests.push(...m.interests);
    if (m.personality && !merged.personality) merged.personality = m.personality;
    if (m.bestApproach && !merged.bestApproach) merged.bestApproach = m.bestApproach;
    if (m.purchaseHistory) merged.purchaseHistory += (merged.purchaseHistory ? ", " : "") + m.purchaseHistory;
  }
  merged.interests = [...new Set(merged.interests)];

  const primarySourceId = primaryRooms[0];
  await db.collection(MEMORY_COLL).updateOne(
    { sourceId: primarySourceId },
    { $set: { ...merged, updatedAt: new Date() }, $setOnInsert: { sourceId: primarySourceId, createdAt: new Date() } },
    { upsert: true }
  );
  await db.collection(MEMORY_COLL).deleteMany({ sourceId: { $in: secondaryRooms } });
  console.log(`[Merge] รวม ai_memory ${memDocs.length} docs → ${primarySourceId.substring(0, 8)}`);
}

async function consolidateAnalyticsAfterMerge(primaryRooms, secondaryRooms) {
  const db = await getDB();
  if (!db) return;
  const allRooms = [...primaryRooms, ...secondaryRooms];
  const docs = await db.collection("chat_analytics").find({ sourceId: { $in: allRooms } }).toArray();
  if (docs.length <= 1) return;

  // ใช้ analytics จาก room ที่อัพเดทล่าสุดเป็นหลัก
  docs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const best = docs[0];
  const primarySourceId = primaryRooms[0];

  const totalUsers = docs.reduce((sum, d) => sum + (d.userCount || 0), 0);
  const totalCustomers = docs.reduce((sum, d) => sum + (d.customerCount || 0), 0);
  const totalStaff = docs.reduce((sum, d) => sum + (d.staffCount || 0), 0);

  await db.collection("chat_analytics").updateOne(
    { sourceId: primarySourceId },
    {
      $set: {
        sourceId: primarySourceId,
        sentiment: best.sentiment,
        customerSentiment: best.customerSentiment,
        staffSentiment: best.staffSentiment,
        overallSentiment: best.overallSentiment,
        purchaseIntent: best.purchaseIntent,
        userCount: totalUsers,
        customerCount: totalCustomers,
        staffCount: totalStaff,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
  await db.collection("chat_analytics").deleteMany({ sourceId: { $in: secondaryRooms } });
  console.log(`[Merge] รวม chat_analytics ${docs.length} docs → ${primarySourceId.substring(0, 8)}`);
}

async function consolidateSkillsAfterMerge(primaryRooms, secondaryRooms) {
  const db = await getDB();
  if (!db) return;
  const allRooms = [...primaryRooms, ...secondaryRooms];
  const docs = await db.collection("user_skills").find({ sourceId: { $in: allRooms } }).toArray();
  if (docs.length === 0) return;

  const primarySourceId = primaryRooms[0];

  // ย้าย user_skills จาก secondary rooms → primary room
  // group by userId เก็บตัวล่าสุด
  const byUser = new Map();
  for (const d of docs) {
    const existing = byUser.get(d.userId);
    if (!existing || (d.updatedAt || 0) > (existing.updatedAt || 0)) {
      byUser.set(d.userId, d);
    }
  }

  // ลบ skills เก่าทั้งหมดแล้ว insert ใหม่ด้วย primarySourceId
  await db.collection("user_skills").deleteMany({ sourceId: { $in: allRooms } });
  const newDocs = [...byUser.values()].map(({ _id, ...rest }) => ({
    ...rest,
    sourceId: primarySourceId,
    updatedAt: new Date(),
  }));
  if (newDocs.length > 0) {
    await db.collection("user_skills").insertMany(newDocs);
  }
  console.log(`[Merge] รวม user_skills ${docs.length} → ${newDocs.length} docs (${primarySourceId.substring(0, 8)})`);
}

// POST /api/customers/merge/consolidate — dashboard เรียกหลัง merge
app.post("/api/customers/merge/consolidate", express.json(), async (req, res) => {
  try {
    const { primaryRooms, secondaryRooms } = req.body;
    if (!primaryRooms?.length) return res.status(400).json({ error: "primaryRooms required" });
    console.log(`[Merge] consolidate: primary=${primaryRooms.length} rooms, secondary=${(secondaryRooms || []).length} rooms`);
    auditLog("merge_customer", { primaryRooms, secondaryRooms }).catch(() => {});
    await Promise.all([
      consolidateMemoryAfterMerge(primaryRooms, secondaryRooms || []),
      consolidateAnalyticsAfterMerge(primaryRooms, secondaryRooms || []),
      consolidateSkillsAfterMerge(primaryRooms, secondaryRooms || []),
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[Merge] consolidate error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// === [Audit] GET /api/audit-logs — ดู audit logs ===
app.get("/api/audit-logs", async (req, res) => {
  try {
    const db = await getDB();
    const limit = parseInt(req.query.limit || "100");
    const logs = await db.collection(AUDIT_LOG_COLL)
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === Telegram Bot (น้องกุ้ง) ===
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

// Webhook endpoint for Telegram
app.post("/webhook/telegram", express.json(), async (req, res) => {
  res.sendStatus(200);
  const update = req.body;
  if (!update.message) return;

  const chatId = update.message.chat.id;
  const text = update.message.text || "";

  // Handle /start GUID
  if (text.startsWith("/start ")) {
    const guid = text.replace("/start ", "").trim();
    await saveTelegramLink(chatId, guid);
    await sendTelegram(chatId, "🦐 สวัสดีค่ะ! น้องกุ้งเชื่อมต่อกับบัญชีของคุณเรียบร้อยแล้ว\n\nพิมพ์ถามอะไรก็ได้ค่ะ เช่น:\n• สรุปแชทวันนี้\n• ลูกค้าไหนต้องติดตาม\n• วิเคราะห์ยอดขาย");
    return;
  }

  if (text === "/start") {
    await sendTelegram(chatId, "🦐 น้องกุ้งค่ะ! กรุณาเชื่อมต่อบัญชีผ่าน OpenClaw Mini CRM Dashboard ก่อนนะคะ\n\nไปที่: ตั้งค่า → เชื่อมต่อ → Telegram");
    return;
  }

  // Look up account by chatId
  const account = await findAccountByTelegramChatId(chatId);
  if (!account) {
    await sendTelegram(chatId, "❌ ยังไม่ได้เชื่อมต่อบัญชี กรุณาเชื่อมผ่าน Dashboard ก่อนค่ะ");
    return;
  }

  // Connect to user's MongoDB, get recent data, ask AI
  await handleTelegramQuery(chatId, text, account);
});

async function sendTelegram(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("[Telegram] Send error:", e.message);
  }
}

async function saveTelegramLink(chatId, guid) {
  const database = await getDB();
  if (!database) return;
  try {
    await database.collection("accounts").updateOne(
      { _id: guid },
      { $set: { telegramChatId: chatId, telegramLinkedAt: new Date() } }
    );
    console.log(`[Telegram] Linked chatId=${chatId} → guid=${guid}`);
  } catch (e) {
    console.error("[Telegram] saveTelegramLink error:", e.message);
  }
}

async function findAccountByTelegramChatId(chatId) {
  const database = await getDB();
  if (!database) return null;
  try {
    return await database.collection("accounts").findOne({ telegramChatId: chatId });
  } catch (e) {
    console.error("[Telegram] findAccount error:", e.message);
    return null;
  }
}

async function handleTelegramQuery(chatId, question, account) {
  // ใช้ MongoDB Atlas ของ system (single-tenant) — ดึง sourceId จาก account
  let userDb;
  try {
    const mongoUri = account.mongodbUri || process.env.MONGODB_URI;
    const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    userDb = client.db(process.env.MONGODB_DB || "smltrack");
  } catch (e) {
    await sendTelegram(chatId, "❌ เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบ MongoDB URI ใน Dashboard");
    return;
  }

  // Get recent data for context
  const sourceFilter = account.sourceIds?.length
    ? { sourceId: { $in: account.sourceIds } }
    : {};

  const [recentMessages, recentAdvice, analytics] = await Promise.all([
    userDb.collection("messages").find(sourceFilter).sort({ createdAt: -1 }).limit(50).toArray(),
    userDb.collection("ai_advice").find(sourceFilter).sort({ createdAt: -1 }).limit(1).toArray(),
    userDb.collection("chat_analytics").find(sourceFilter).sort({ updatedAt: -1 }).limit(10).toArray(),
  ]);

  // Build context
  const context = {
    question,
    totalMessages: recentMessages.length,
    rooms: [...new Set(recentMessages.map(m => m.sourceId))].length,
    latestAdvice: recentAdvice[0]?.advice || [],
    analytics: analytics.map(a => ({
      room: a.groupName,
      sentiment: a.customerSentiment,
      purchase: a.purchaseIntent,
    })),
  };

  // Call AI (use account's AI key or fallback to system key)
  const aiKey = account.aiKeys?.openrouterKey || process.env.OPENROUTER_API_KEY;
  if (!aiKey) {
    await sendTelegram(chatId, "❌ ยังไม่ได้ตั้งค่า AI API key กรุณาตั้งค่าใน Dashboard → Settings");
    return;
  }

  const messages = [
    { role: "system", content: "คุณคือน้องกุ้ง 🦐 AI advisor ประจำธุรกิจ ตอบภาษาไทย กระชับ ตรงประเด็น ใช้ emoji เล็กน้อย ใช้ HTML format (<b>bold</b>, <i>italic</i>)" },
    { role: "user", content: `ข้อมูลธุรกิจ: ${JSON.stringify(context, null, 0).slice(0, 2000)}\n\nคำถาม: ${question}` },
  ];

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model: "qwen/qwen3-235b-a22b:free", messages, max_tokens: 500 }),
    });
    const data = await resp.json();
    let answer = data.choices?.[0]?.message?.content || "ไม่สามารถตอบได้ในตอนนี้ค่ะ";
    // Remove think tags
    if (answer.includes("</think>")) answer = answer.split("</think>").pop().trim();
    await sendTelegram(chatId, `🦐 ${answer}`);
    // Track cost
    if (data.usage) {
      await trackAICost({
        provider: "openrouter",
        model: "qwen3-235b-a22b:free",
        feature: "telegram-query",
        inputTokens: data.usage.prompt_tokens || 0,
        outputTokens: data.usage.completion_tokens || 0,
        sourceId: account._id || null,
        success: true,
      });
    }
  } catch (e) {
    console.error("[Telegram] AI error:", e.message);
    await sendTelegram(chatId, "❌ เกิดข้อผิดพลาดในการวิเคราะห์ กรุณาลองใหม่ค่ะ");
  }
}

// Setup Telegram webhook (call once via browser/curl)
app.get("/setup-telegram-webhook", async (req, res) => {
  if (!TELEGRAM_BOT_TOKEN) {
    return res.status(400).json({ error: "TELEGRAM_BOT_TOKEN not set" });
  }
  const webhookUrl = `https://crm.satistang.com/webhook/telegram`;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === [Churn] Churn Prediction — ทำนายลูกค้าที่กำลังจะหาย ===
app.get("/api/customers/churn-risk", async (req, res) => {
  try {
    const database = await getDB();
    if (!database) return res.status(500).json({ error: "DB not connected" });
    const now = new Date();

    const customers = await database.collection("customers")
      .find({}, { projection: { name: 1, firstName: 1, lastName: 1, rooms: 1, platformIds: 1, totalMessages: 1, updatedAt: 1, pipelineStage: 1 } })
      .toArray();

    const risks = [];
    for (const c of customers) {
      if (!c.rooms?.length) continue;

      const lastMsg = await database.collection("messages")
        .findOne({ sourceId: { $in: c.rooms } }, { sort: { createdAt: -1 }, projection: { createdAt: 1 } });

      if (!lastMsg) continue;
      const lastActivity = lastMsg.createdAt;
      const daysSinceLastActivity = Math.floor((now - new Date(lastActivity)) / (24 * 60 * 60 * 1000));

      let riskLevel = "low";
      let riskReason = "";

      if (daysSinceLastActivity > 30) {
        riskLevel = "critical";
        riskReason = `ไม่มีข้อความ ${daysSinceLastActivity} วัน — อาจหายไปแล้ว`;
      } else if (daysSinceLastActivity > 7) {
        riskLevel = "high";
        riskReason = `ไม่มีข้อความ ${daysSinceLastActivity} วัน — เสี่ยงหลุด`;
      } else if (daysSinceLastActivity > 3) {
        riskLevel = "medium";
        riskReason = `ไม่มีข้อความ ${daysSinceLastActivity} วัน — ควรติดตาม`;
      }

      if (riskLevel !== "low") {
        risks.push({
          ...c,
          _id: c._id.toString(),
          lastActivity,
          daysSinceLastActivity,
          riskLevel,
          riskReason,
        });
      }
    }

    const order = { critical: 0, high: 1, medium: 2 };
    risks.sort((a, b) => (order[a.riskLevel] || 3) - (order[b.riskLevel] || 3));

    console.log(`[Churn] Found ${risks.length} at-risk customers`);
    res.json({ risks, total: risks.length });
  } catch (e) {
    console.error("[Churn] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// === [A/B] A/B Testing Results ===
app.get("/api/ab-results", async (req, res) => {
  try {
    const database = await getDB();
    if (!database) return res.status(500).json({ error: "DB not connected" });

    const results = await database.collection("messages").aggregate([
      { $match: { abVariant: { $exists: true }, role: "assistant" } },
      { $group: {
        _id: "$abVariant",
        count: { $sum: 1 },
      }},
    ]).toArray();

    console.log(`[A/B] Results: ${JSON.stringify(results)}`);
    res.json(results);
  } catch (e) {
    console.error("[A/B] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "OpenClaw Mini CRM AI Agent" });
});

// === Start ===
const PORT = process.env.PORT || 3000;
getDB().then(async () => {
  // สร้าง indexes
  await ensureIndexes().catch((e) => console.error("[Index] Error:", e.message));

  // Migrate: ย้ายข้อมูลจาก chat_xxx collections เก่า → messages collection ใหม่
  await migrateOldCollections().catch((e) => console.error("[Migrate] Error:", e.message));

  // Init MCP servers
  await initMCPServers().catch((e) => console.error("[MCP] Init error:", e.message));

  // Start daily summary cron
  startDailyCron();
  startAdvisorCron();

  app.listen(PORT, () => {
    console.log(`[Agent] Running on port ${PORT}`);
    console.log(`[Agent] AI: OpenRouter(free) → SambaNova → Groq → Cerebras`);
    console.log(`[Agent] Tools: ${AGENT_TOOLS.length} built-in + ${mcpTools.length} MCP`);
    console.log(`[Agent] RAG: Vector Search → Keyword → Recent (3-tier)`);
  });
});
