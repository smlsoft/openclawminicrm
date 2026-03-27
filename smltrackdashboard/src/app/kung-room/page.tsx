"use client";

import { useState } from "react";

// ─── Copy Button ───
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy}
      className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-medium transition opacity-70 hover:opacity-100"
      style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
      {copied ? "✅ คัดลอกแล้ว" : "📋 คัดลอก"}
    </button>
  );
}

// ─── Prompt Code Block ───
function PromptBlock({ prompt, label }: { prompt: string; label?: string }) {
  return (
    <div className="relative mt-2">
      {label && <p className="text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>}
      <div className="relative rounded-xl overflow-hidden" style={{ background: "var(--bg-hover)" }}>
        <CopyBtn text={prompt} />
        <pre className="p-4 pr-20 text-xs leading-relaxed whitespace-pre-wrap font-mono"
          style={{ color: "var(--text-secondary)" }}>
          {prompt}
        </pre>
      </div>
    </div>
  );
}

// ─── Accordion Section ───
function Accordion({ title, icon, defaultOpen, children }: {
  title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[var(--bg-hover)] transition-colors">
        <span className="text-lg">{icon}</span>
        <span className="flex-1 text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</span>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--text-muted)" }}>
          <path d="M2 4l4 4 4-4" strokeLinecap="round" />
        </svg>
      </button>
      <div className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: open ? "5000px" : "0", opacity: open ? 1 : 0 }}>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Character Card ───
function CharCard({ name, nameTh, desc, prompt, borderColor }: {
  name: string; nameTh: string; desc: string; prompt: string; borderColor: string;
}) {
  return (
    <div className="card p-4 transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg"
      style={{ borderLeft: `4px solid ${borderColor}` }}>
      <h4 className="text-sm font-bold mb-0.5" style={{ color: borderColor }}>{name}</h4>
      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-primary)" }}>{nameTh}</p>
      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{desc}</p>
      <PromptBlock prompt={prompt} />
    </div>
  );
}

// ─── Data ───
const CHARACTERS = [
  {
    name: "Gateway Kung",
    nameTh: "กุ้งเกตเวย์ — ผู้จัดการหลัก",
    desc: "ศูนย์กลางควบคุม วิเคราะห์ สั่งการ Agent ทุกตัว",
    borderColor: "#0d9488",
    prompt: `A cute chibi shrimp character wearing a navy captain hat with a teal LED visor, standing at a holographic command center. The shrimp has big expressive eyes, small claws typing on a floating keyboard. Navy and teal color scheme. Pixar-style 3D render, soft studio lighting, white background.`,
  },
  {
    name: "LINE Agent Kung",
    nameTh: "กุ้ง LINE — ผู้ช่วยแชท",
    desc: "รับ-ส่งข้อความ LINE, ตอบลูกค้า, วิเคราะห์ sentiment",
    borderColor: "#22c55e",
    prompt: `A cute chibi shrimp character wearing a green LINE-themed headset with microphone, holding a chat bubble. The shrimp has friendly eyes and a warm smile. Green and white color scheme matching LINE branding. Pixar-style 3D render, soft studio lighting, white background.`,
  },
  {
    name: "ERP Agent Kung",
    nameTh: "กุ้ง ERP — ผู้เชี่ยวชาญข้อมูล",
    desc: "ดึงข้อมูลสินค้า ราคา สต็อก ใบเสนอราคา จาก ERP",
    borderColor: "#f59e0b",
    prompt: `A cute chibi shrimp character wearing golden safety goggles and an amber utility vest with many pockets. Holding a clipboard with product data. The shrimp looks smart and organized. Amber and gold color scheme. Pixar-style 3D render, soft studio lighting, white background.`,
  },
  {
    name: "Analytics Kung",
    nameTh: "กุ้งวิเคราะห์ — นักสถิติ",
    desc: "วิเคราะห์ KPI, sentiment, purchase intent, สร้างรายงาน",
    borderColor: "#a855f7",
    prompt: `A cute chibi shrimp character wearing pink-purple glasses with holographic data floating around. Holding a glowing crystal ball showing charts and graphs. The shrimp looks curious and analytical. Pink and purple color scheme. Pixar-style 3D render, soft studio lighting, white background.`,
  },
];

const POSE_PROMPTS = [
  {
    label: "Turnaround Sheet (5 มุมมอง)",
    prompt: `Character turnaround sheet of [CHARACTER NAME]. Front view, 3/4 view, side view, back view, top-down view. T-pose reference. Consistent proportions and colors across all angles. Clean white background, reference sheet layout. Studio lighting.`,
  },
  {
    label: "Expression Sheet (8 อารมณ์)",
    prompt: `Expression sheet of [CHARACTER NAME] showing 8 emotions: happy, sad, angry, surprised, thinking, confused, excited, sleeping. Chibi style, consistent design. Grid layout, clean white background. Each expression labeled.`,
  },
];

const SCENE_PROMPTS = [
  {
    label: "ฉากห้องทำงาน (Office Scene)",
    prompt: `A cozy tech office scene with 4 cute chibi shrimp characters working together. Navy shrimp at the main command desk with holographic screens, green shrimp answering chat messages, amber shrimp checking inventory on tablet, purple shrimp analyzing charts on a big monitor. Warm ambient lighting, plants, coffee cups. Isometric view, Pixar-style 3D render.`,
  },
  {
    label: "ฉากประชุม (Meeting Scene)",
    prompt: `4 cute chibi shrimp characters sitting around a round table in a modern meeting room. One shrimp presenting on a whiteboard with flowcharts. Others listening with different expressions - one taking notes, one nodding, one raising a claw to ask a question. Soft overhead lighting, glass walls. Pixar-style 3D render.`,
  },
];

const ANIMATION_SCENES = [
  {
    ep: "ตอนที่ 1: Intro",
    desc: "น้องกุ้งทั้ง 4 ตัวปรากฏตัวทีละตัว พร้อมชื่อและบทบาท",
    prompt: `Animation scene: A dark screen lights up. A cute navy chibi shrimp drops in from above, lands with a bounce, and salutes. Text appears: "Gateway Kung". Camera pans right to reveal 3 more shrimp characters dropping in one by one. Cinematic intro sequence, dramatic lighting, particle effects. 4 seconds, smooth motion.`,
  },
  {
    ep: "ตอนที่ 2: Message Received",
    desc: "ข้อความจาก LINE เข้ามา กุ้ง LINE รับและส่งต่อให้ Gateway",
    prompt: `Animation scene: A green chat bubble floats down from the top. The green LINE shrimp catches it excitedly, reads it, then tosses it to the navy Gateway shrimp who nods and starts typing commands. Speech bubbles with Thai text appear. Smooth character animation, 3 seconds.`,
  },
  {
    ep: "ตอนที่ 3: Processing",
    desc: "Gateway มอบหมายงาน — ERP ดึงข้อมูล, Analytics วิเคราะห์",
    prompt: `Animation scene: The navy Gateway shrimp stands in the center, pointing left and right. The amber ERP shrimp rushes to a filing cabinet pulling out documents. The purple Analytics shrimp types rapidly on a keyboard with holographic charts appearing. Split-screen effect, fast-paced, 3 seconds.`,
  },
  {
    ep: "ตอนที่ 4: Result Delivery",
    desc: "รวมข้อมูลทั้งหมด ส่งคำตอบกลับลูกค้า",
    prompt: `Animation scene: All 4 shrimp characters gather around a glowing orb of data. They combine their findings - the orb transforms into a perfect chat reply bubble. The green LINE shrimp grabs it and sends it flying upward with a sparkle trail. All shrimp celebrate with a high-five. Happy ending, 4 seconds.`,
  },
];

const STYLE_MODIFIERS = [
  { style: "Pixar / Disney", mod: "Pixar-style 3D render, subsurface scattering, soft shadows" },
  { style: "Anime / Ghibli", mod: "Studio Ghibli anime style, cel-shaded, watercolor background" },
  { style: "Pixel Art", mod: "16-bit pixel art style, retro game aesthetic, limited palette" },
  { style: "Watercolor", mod: "Delicate watercolor painting, soft edges, paper texture" },
  { style: "Flat Design", mod: "Modern flat design, bold colors, no shadows, vector style" },
  { style: "Clay / Claymation", mod: "Claymation style, stop-motion look, soft clay texture" },
  { style: "Neon Cyberpunk", mod: "Neon cyberpunk style, glowing edges, dark background, synthwave colors" },
  { style: "Sticker", mod: "Die-cut sticker design, thick white outline, glossy finish, no background" },
];

const TOOLS_TABLE = [
  { tool: "Midjourney", type: "ภาพนิ่ง", note: "คุณภาพสูงสุด, /imagine prompt" },
  { tool: "DALL-E 3", type: "ภาพนิ่ง", note: "เข้าใจ prompt ยาวดี, ChatGPT Plus" },
  { tool: "Stable Diffusion", type: "ภาพนิ่ง", note: "ฟรี, ControlNet + LoRA" },
  { tool: "Kling AI", type: "วิดีโอ", note: "Image-to-video, 5-10 วินาที" },
  { tool: "Runway Gen-3", type: "วิดีโอ", note: "Text/image-to-video, motion brush" },
  { tool: "Veo 2 (Google)", type: "วิดีโอ", note: "สมจริง, ยาวถึง 2 นาที" },
  { tool: "Sora (OpenAI)", type: "วิดีโอ", note: "Text-to-video, cinematic" },
  { tool: "Luma Dream Machine", type: "วิดีโอ", note: "ฟรี, image-to-video ง่าย" },
];

const NEGATIVE_PROMPT = `ugly, deformed, noisy, blurry, distorted, out of focus, bad anatomy, extra limbs, poorly drawn face, poorly drawn hands, missing fingers, extra fingers, mutated, mutation, text, watermark, signature, cropped, worst quality, low quality, jpeg artifacts, duplicate, morbid, mutilated, disfigured, gross proportions, malformed limbs, fused fingers, long neck, beginner, amateur`;

const CONSISTENCY_PROMPT = `[CHARACTER NAME] reference sheet. IMPORTANT: Use this exact design for all scenes.

Key features to maintain:
- Body: Cute chibi shrimp, round head, 2 small claws, curved tail
- Eyes: Big round eyes with white highlights, [CHARACTER EYE COLOR]
- Outfit: [DESCRIBE EXACT OUTFIT AND COLORS]
- Proportions: Head is 40% of body height, arms short, legs stubby
- Color palette: [LIST EXACT HEX COLORS]

Consistency tags: same character, character sheet reference, model sheet, on-model`;

// ─── Page ───
export default function KungRoomPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg md:text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            🦐 ห้องทำงานน้องกุ้ง
          </h1>
          <p className="text-xs md:text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            AI Character & Animation Prompts — Midjourney · DALL-E · Stable Diffusion · Kling · Veo · Sora
          </p>
        </div>
      </header>

      <main className="page-content">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* 1. ตัวละครหลัก */}
          <Accordion title="ตัวละครหลัก 4 ตัว" icon="🎨" defaultOpen>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              น้องกุ้ง 4 บทบาท — ใช้ prompt ด้านล่างสร้างตัวละครด้วย Midjourney / DALL-E / Stable Diffusion
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CHARACTERS.map(c => <CharCard key={c.name} {...c} />)}
            </div>
          </Accordion>

          {/* 2. แบบร่างท่าทาง */}
          <Accordion title="แบบร่างท่าทาง" icon="🖼️">
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              สร้าง reference sheet เพื่อให้ตัวละครเหมือนกันทุกฉาก
            </p>
            {POSE_PROMPTS.map(p => (
              <div key={p.label} className="mb-4">
                <h4 className="text-xs font-bold mb-1" style={{ color: "var(--text-primary)" }}>{p.label}</h4>
                <PromptBlock prompt={p.prompt} />
              </div>
            ))}
          </Accordion>

          {/* 3. ฉากห้องทำงาน */}
          <Accordion title="ฉากห้องทำงาน" icon="🏢">
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              ฉากรวมตัวละคร — ใช้สำหรับ hero image, banner, หรือ social media
            </p>
            {SCENE_PROMPTS.map(p => (
              <div key={p.label} className="mb-4">
                <h4 className="text-xs font-bold mb-1" style={{ color: "var(--text-primary)" }}>{p.label}</h4>
                <PromptBlock prompt={p.prompt} />
              </div>
            ))}
          </Accordion>

          {/* 4. ฉาก Animation */}
          <Accordion title="ฉาก Animation 4 ตอน" icon="🎬">
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              สร้างวิดีโอสั้น 4 ตอน ด้วย Kling / Veo / Sora — ใช้ภาพจาก Midjourney เป็น keyframe
            </p>
            <div className="space-y-4">
              {ANIMATION_SCENES.map((s, i) => (
                <div key={i} className="card p-4" style={{ borderLeft: "3px solid var(--primary)" }}>
                  <h4 className="text-xs font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>{s.ep}</h4>
                  <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
                  <PromptBlock prompt={s.prompt} />
                </div>
              ))}
            </div>
          </Accordion>

          {/* 5. Consistency */}
          <Accordion title="สร้างตัวละครให้เหมือนกันทุกฉาก" icon="🔗">
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              เทคนิคสำคัญ — ใส่ reference prompt นี้ทุกครั้งเพื่อให้ AI สร้างตัวละครเหมือนกัน
            </p>
            <PromptBlock prompt={CONSISTENCY_PROMPT} label="Reference Prompt Template" />

            <h4 className="text-xs font-bold mt-4 mb-2" style={{ color: "var(--text-primary)" }}>
              เครื่องมือช่วยรักษาความสม่ำเสมอ
            </h4>
            <div className="overflow-x-auto rounded-xl" style={{ background: "var(--bg-hover)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-primary)" }}>เครื่องมือ</th>
                    <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-primary)" }}>เทคนิค</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { tool: "Midjourney", tech: "--cref [URL] (Character Reference) + --sref [URL] (Style Reference)" },
                    { tool: "Stable Diffusion", tech: "LoRA training 20-30 ภาพ + ControlNet pose" },
                    { tool: "DALL-E 3", tech: "ใส่ detailed description เหมือนกันทุก prompt" },
                    { tool: "Kling / Runway", tech: "ใช้ภาพ reference เดียวกัน + image-to-video" },
                  ].map(r => (
                    <tr key={r.tool} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-3 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>{r.tool}</td>
                      <td className="px-3 py-2" style={{ color: "var(--text-muted)" }}>{r.tech}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>

          {/* 6. Style Modifiers */}
          <Accordion title="ปรับแต่งสไตล์" icon="🎭">
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              เพิ่มท้าย prompt เพื่อเปลี่ยนสไตล์ตัวละคร
            </p>
            <div className="overflow-x-auto rounded-xl" style={{ background: "var(--bg-hover)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-primary)" }}>สไตล์</th>
                    <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-primary)" }}>Modifier (เพิ่มท้าย prompt)</th>
                  </tr>
                </thead>
                <tbody>
                  {STYLE_MODIFIERS.map(r => (
                    <tr key={r.style} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{r.style}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: "var(--text-muted)" }}>{r.mod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>

          {/* 7. Negative Prompts */}
          <Accordion title="Negative Prompts" icon="🚫">
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              ใส่ใน Negative Prompt เพื่อหลีกเลี่ยงผลลัพธ์ที่ไม่ต้องการ — คัดลอกไปใช้ได้เลย
            </p>
            <PromptBlock prompt={NEGATIVE_PROMPT} />
          </Accordion>

          {/* 8. เครื่องมือแนะนำ */}
          <Accordion title="เครื่องมือแนะนำ" icon="🧰">
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              AI Image & Video Generation Tools ที่แนะนำสำหรับสร้างน้องกุ้ง
            </p>
            <div className="overflow-x-auto rounded-xl" style={{ background: "var(--bg-hover)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-primary)" }}>เครื่องมือ</th>
                    <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-primary)" }}>ประเภท</th>
                    <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-primary)" }}>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {TOOLS_TABLE.map(r => (
                    <tr key={r.tool} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{r.tool}</td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{r.type}</td>
                      <td className="px-3 py-2" style={{ color: "var(--text-muted)" }}>{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>

        </div>
      </main>
    </div>
  );
}
