"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Suspense, useRef, useMemo, useState } from "react";
import * as THREE from "three";

interface Agent { id: number; name: string; role: string; emoji: string; color: string; status: string; quote: string; }
interface Props { agents: Agent[]; ttsEnabled?: boolean; }

// ─── TTS System — Edge TTS (Neural ไทยชัด) + fallback Web Speech ───
let ttsBusy = false;
let ttsBusySince = 0;
// Safety: ถ้า ttsBusy ค้างนานกว่า 30 วิ → auto-reset
function checkTTSStuck() { if (ttsBusy && Date.now() - ttsBusySince > 30000) { ttsBusy = false; } }

// จับคู่ CEO ถาม + พนักงานตอบ ให้สัมพันธ์กัน
const CONVERSATION_PAIRS: [string, string][] = [
  ["ยอดขายวันนี้เป็นไงบ้าง?", "ปิดได้ 3 ดีลแล้วค่ะบอส!"],
  ["ใครยังไม่ตอบแชทลูกค้า?", "ตอบหมดแล้วค่า ไม่ต้องห่วง!"],
  ["ทำงานเร็วกว่านี้ได้ไหม?", "ก็ทำเร็วสุดแล้วนะบอส!"],
  ["KPI เดือนนี้โอเคมั้ย?", "เกินเป้า 120% แล้วค่ะ!"],
  ["ลูกค้ารายนี้ follow up หรือยัง?", "ส่งข้อความไปแล้ว 3 รอบ!"],
  ["ทำไมยอดตกลงจากเมื่อวาน?", "วันนี้วันจันทร์ ลูกค้ายังไม่ตื่นค่ะ!"],
  ["กาแฟหมดแล้ว ใครไปซื้อ?", "ให้แมวไปซื้อดีกว่า!"],
  ["ขยันดีนะ ชอบๆ!", "ขอบคุณค่ะบอส ขอขึ้นเงินเดือนด้วย!"],
  ["ประชุมอีก 5 นาทีนะ!", "อ๋อ ขอกินโดนัทก่อน!"],
  ["ลูกค้า VIP โทรมา ดูแลด่วน!", "รับสายแล้วค่ะ กำลังจัดการ!"],
  ["สต็อกสินค้าเช็คหรือยัง?", "เช็คแล้ว เหลือน้อยมาก ต้องสั่งเพิ่ม!"],
  ["ใครอยากได้โบนัสยกมือ!", "หนูๆๆ! ยกทั้งสองมือเลย!"],
  ["ระวังคู่แข่งมาตัดราคานะ!", "รู้แล้วค่ะ เตรียมโปรไว้แล้ว!"],
  ["วันนี้ใครมาสาย?", "ไม่มีค่ะ มาก่อนบอสอีก!"],
  ["เงินเดือนออกแล้วนะ!", "เย้! ขอบคุณบอส!"],
  ["ทำไมแมวมานอนบนโต๊ะอีกแล้ว?", "หนูไล่ไม่ไป มันไม่กลัวหนู!"],
  ["พรุ่งนี้มีนัดส่งของ อย่าลืม!", "จดไว้แล้วค่ะ พร้อมส่ง!"],
  ["ตอบแชทให้เร็วนะ ลูกค้ารอ!", "ตอบอยู่ค่ะ มือไม่ว่างเลย!"],
  ["ใครทำยอดสูงสุดวันนี้?", "หนูเองค่ะ! ปิดไป 5 ราย!"],
  ["สู้ๆ นะทีม เชื่อมือทุกคน!", "สู้ๆ ค่ะบอส! ไม่ถอย!"],
  ["ลดราคาอีกได้ไหม ลูกค้าต่อ?", "ลดอีกไม่ได้แล้ว ขาดทุนค่ะ!"],
  ["ออฟฟิศรกจัง จัดให้หน่อย!", "ก็แมวมันรื้อไง!"],
  ["บอสภูมิใจในทีมนี้มาก!", "หนูก็ภูมิใจที่มีบอสดีๆ ค่ะ!"],
];

let aiPairs: [string, string][] = [];
let lastQuoteFetch = 0;
let pairIdx = 0;

async function fetchAIQuotes() {
  if (typeof window === "undefined") return;
  if (Date.now() - lastQuoteFetch < 3600000 && aiPairs.length > 0) return;
  try {
    const r = await fetch("/dashboard/api/ceo-quotes");
    const d = await r.json();
    if (d.ceo?.length > 0 && d.employee?.length > 0) {
      // จับคู่ ceo[i] กับ employee[i]
      aiPairs = d.ceo.map((c: string, i: number) => [c, d.employee[i % d.employee.length]] as [string, string]);
    }
    lastQuoteFetch = Date.now();
  } catch { /* keep existing */ }
}

function getNextPair(): [string, string] {
  const pool = aiPairs.length > 0 ? aiPairs : CONVERSATION_PAIRS;
  pairIdx = (pairIdx + 1) % pool.length;
  return pool[pairIdx];
}

// Edge TTS (Neural voice) → fallback Web Speech API
async function edgeTTS(text: string, voice: string, speed: number): Promise<boolean> {
  try {
    const r = await fetch("/dashboard/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, speed }),
    });
    if (!r.ok) return false;
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    return new Promise((resolve) => {
      audio.onended = () => { URL.revokeObjectURL(url); resolve(true); };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
      audio.play().catch(() => resolve(false));
    });
  } catch { return false; }
}

function webSpeechFallback(text: string, pitch: number, rate: number): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "th-TH"; u.rate = rate; u.pitch = pitch; u.volume = 0.8;
    const v = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("th"));
    if (v) u.voice = v;
    u.onend = () => resolve(); u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

// ดึงบทสนทนาจากผลงานจริง (40% โอกาส)
async function fetchReviewPair(agentName: string): Promise<[string, string] | null> {
  if (!agentName) return null;
  try {
    const r = await fetch(`/dashboard/api/ceo-review?agent=${encodeURIComponent(agentName)}`);
    const d = await r.json();
    if (d.ceo && d.emp) return [d.ceo, d.emp];
  } catch { /* fallback */ }
  return null;
}

async function ceoSpeak(agentName: string, enabled: boolean) {
  checkTTSStuck();
  if (!enabled || ttsBusy) return;
  ttsBusy = true;
  ttsBusySince = Date.now();
  try {
    fetchAIQuotes();

    let ceoQ: string, empA: string;

    // 40% โอกาส → ดึงจากผลงานจริง (ถ้าได้)
    if (agentName && Math.random() < 0.4) {
      const review = await fetchReviewPair(agentName);
      if (review) {
        [ceoQ, empA] = review;
      } else {
        [ceoQ, empA] = getNextPair();
      }
    } else {
      [ceoQ, empA] = getNextPair();
    }

    // CEO ถาม — เสียงชาย ต่ำ ช้า (Niwat) speed 0.9
    const ceoText = agentName ? `${agentName}! ${ceoQ}` : ceoQ;
    const ok = await edgeTTS(ceoText, "th-TH-NiwatNeural", 0.9);
    if (!ok) await webSpeechFallback(ceoText, 0.5, 0.85);

    // 70% พนักงานตอบ — เสียงหญิง สูง (Premwadee) speed 1.0
    if (enabled && Math.random() < 0.7) {
      const ok2 = await edgeTTS(empA, "th-TH-PremwadeeNeural", 1.0);
      if (!ok2) await webSpeechFallback(empA, 1.8, 0.9);
    }
  } catch (e) {
    // ป้องกัน ttsBusy ค้าง
    console.warn("[CEO TTS]", e);
  } finally {
    ttsBusy = false;
  }
}

function isCeoSpeaking() { return ttsBusy; }

// ─── Shrimp (กุ้งน่ารัก) ───
function Shrimp({ agent, position, rotationY = 0 }: { agent: Agent; position: [number, number, number]; rotationY?: number; }) {
  const ref = useRef<THREE.Group>(null!);
  const seed = agent.id * 1.7;
  const color = useMemo(() => new THREE.Color(agent.color), [agent.color]);
  const lighter = useMemo(() => color.clone().offsetHSL(0, 0, 0.15), [color]);

  // กำลังทำงาน → กระโดด | ไม่ทำงาน → นั่งนิ่งๆ
  const isActive = agent.status === "working" || agent.status === "excited" || agent.status === "running" || agent.status === "alert";

  useFrame((s) => {
    if (!ref.current) return;
    const base = position[1];
    if (!isActive) {
      ref.current.position.y = base; // นั่งนิ่ง
      return;
    }
    const t = s.clock.elapsedTime;
    ref.current.position.y = base + Math.abs(Math.sin(t * 3 + seed)) * 0.12; // กระโดด
  });

  return (
    <group ref={ref} position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.35, 0]} castShadow><sphereGeometry args={[0.22, 16, 16]} /><meshStandardMaterial color={color} roughness={0.3} /></mesh>
      <mesh position={[0, 0.65, 0.03]} castShadow><sphereGeometry args={[0.18, 16, 16]} /><meshStandardMaterial color={color} roughness={0.3} /></mesh>
      <mesh position={[-0.06, 0.69, 0.16]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[-0.06, 0.69, 0.19]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[0.06, 0.69, 0.16]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[0.06, 0.69, 0.19]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[-0.25, 0.32, 0.08]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color={lighter} /></mesh>
      <mesh position={[0.25, 0.32, 0.08]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color={lighter} /></mesh>
      <mesh position={[0, 0.18, -0.16]} rotation={[0.5, 0, 0]}><coneGeometry args={[0.08, 0.2, 8]} /><meshStandardMaterial color={color} /></mesh>
      <Html position={[0, 1.05, 0]} center distanceFactor={7} style={{ pointerEvents: "none" }}>
        <div style={{ background: agent.color, color: "#fff", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "Prompt,sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
          {agent.emoji} {agent.name}
        </div>
      </Html>
    </group>
  );
}

// ─── Speech Balloon (ลูกโป่งลอยขึ้นแล้วแตกหายไป) ───
function SpeechBalloon({ agent, position }: { agent: Agent; position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null!);
  const seed = agent.id * 3.14;

  useFrame((s) => {
    if (!ref.current) return;
    const t = (s.clock.elapsedTime * 0.18 + seed) % 10; // 10 second cycle — longer float
    const progress = t / 10;

    // Phase: 0-0.1 inflate, 0.1-0.85 float up, 0.85-1.0 pop (expand+fade)
    let scale = 1;
    if (progress < 0.1) {
      scale = progress / 0.1; // inflate from 0 to 1
    } else if (progress < 0.85) {
      scale = 1;
    } else {
      const pop = (progress - 0.85) / 0.15;
      scale = 1 + pop * 0.5; // expand before disappearing
      ref.current.children.forEach((c) => {
        if ((c as THREE.Mesh).material && "opacity" in (c as THREE.Mesh).material) {
          ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.8 * (1 - pop));
        }
      });
    }

    const y = position[1] + 1.8 + progress * 3.5; // float up higher
    ref.current.position.y = y;
    ref.current.position.x = position[0] + Math.sin(t * 1.5 + seed) * 0.2; // gentle sway
    ref.current.position.z = position[2] + Math.cos(t * 1.2 + seed) * 0.1;
    ref.current.scale.setScalar(scale);
    ref.current.visible = progress < 0.98;
  });

  return (
    <group ref={ref} position={position}>
      {/* Balloon body — oval shape */}
      <mesh>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={agent.color} transparent opacity={0.8} roughness={0.15} metalness={0.1} />
      </mesh>
      {/* Balloon highlight (shine) */}
      <mesh position={[-0.06, 0.06, 0.15]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="white" transparent opacity={0.4} />
      </mesh>
      {/* Balloon knot */}
      <mesh position={[0, -0.24, 0]}>
        <coneGeometry args={[0.03, 0.05, 6]} />
        <meshStandardMaterial color={agent.color} transparent opacity={0.8} />
      </mesh>
      {/* String — curvy */}
      <mesh position={[0, -0.38, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.25, 4]} />
        <meshStandardMaterial color="#aaa" transparent opacity={0.6} />
      </mesh>
      {/* Text label on balloon — แนวกว้าง อ่านง่าย */}
      <Html center distanceFactor={4} style={{ pointerEvents: "none", whiteSpace: "nowrap" }}>
        <div style={{
          textAlign: "center", fontFamily: "Prompt,sans-serif",
          color: "#fff", lineHeight: 1.3,
          textShadow: "0 2px 6px rgba(0,0,0,0.8)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 800 }}>{agent.emoji} {agent.name}</div>
          <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.9, marginTop: 2, background: "rgba(0,0,0,0.4)", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{agent.quote}</div>
        </div>
      </Html>
    </group>
  );
}

// ─── Furniture ───
function DeskUnit({ position, color, facing }: { position: [number, number, number]; color: string; facing: number }) {
  return (
    <group position={position} rotation={[0, facing, 0]}>
      {/* โต๊ะ */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow><boxGeometry args={[1.2, 0.04, 0.6]} /><meshStandardMaterial color="#B8860B" roughness={0.6} /></mesh>
      {[[-0.5, 0.27, -0.22], [0.5, 0.27, -0.22], [-0.5, 0.27, 0.22], [0.5, 0.27, 0.22]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow><boxGeometry args={[0.04, 0.54, 0.04]} /><meshStandardMaterial color="#333" /></mesh>
      ))}
      {/* จอคอม */}
      <mesh position={[0, 0.82, -0.18]} castShadow><boxGeometry args={[0.42, 0.28, 0.02]} /><meshStandardMaterial color="#1a1a2e" /></mesh>
      <mesh position={[0, 0.82, -0.165]}><planeGeometry args={[0.38, 0.24]} /><meshBasicMaterial color={color} transparent opacity={0.2} toneMapped={false} /></mesh>
      <mesh position={[0, 0.66, -0.18]} castShadow><boxGeometry args={[0.06, 0.08, 0.04]} /><meshStandardMaterial color="#222" /></mesh>
      {/* คีย์บอร์ด */}
      <mesh position={[0, 0.575, 0.05]}><boxGeometry args={[0.3, 0.01, 0.08]} /><meshStandardMaterial color="#2a2a3a" /></mesh>
      {/* เมาส์ */}
      <mesh position={[0.25, 0.575, 0.05]}><boxGeometry args={[0.04, 0.01, 0.06]} /><meshStandardMaterial color="#2a2a3a" /></mesh>
      {/* เก้าอี้ */}
      <mesh position={[0, 0.35, 0.45]} castShadow><boxGeometry args={[0.4, 0.04, 0.4]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
      <mesh position={[0, 0.58, 0.62]} castShadow><boxGeometry args={[0.4, 0.4, 0.04]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
      <mesh position={[0, 0.17, 0.45]}><cylinderGeometry args={[0.02, 0.02, 0.35, 6]} /><meshStandardMaterial color="#555" metalness={0.4} /></mesh>
      {[0, 1.2, 2.4, 3.6, 4.8].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.13 + 0, 0.02, Math.sin(a) * 0.13 + 0.45]}><sphereGeometry args={[0.02, 6, 6]} /><meshStandardMaterial color="#333" /></mesh>
      ))}
      {/* แก้วกาแฟ */}
      <mesh position={[0.4, 0.6, 0.1]}><cylinderGeometry args={[0.03, 0.025, 0.06, 8]} /><meshStandardMaterial color="#f5f5dc" /></mesh>
    </group>
  );
}

function Plant({ position, size = 1 }: { position: [number, number, number]; size?: number }) {
  return (
    <group position={position} scale={size}>
      {/* กระถาง */}
      <mesh position={[0, 0.15, 0]} castShadow><cylinderGeometry args={[0.15, 0.12, 0.3, 8]} /><meshStandardMaterial color="#8B4513" roughness={0.8} /></mesh>
      <mesh position={[0, 0.31, 0]} castShadow><cylinderGeometry args={[0.16, 0.15, 0.02, 8]} /><meshStandardMaterial color="#A0522D" /></mesh>
      {/* ดิน */}
      <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.14, 0.14, 0.02, 8]} /><meshStandardMaterial color="#3e2723" /></mesh>
      {/* ใบไม้ */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.3) * 0.08, 0.45 + i * 0.06, Math.sin(i * 1.3) * 0.08]} castShadow>
          <sphereGeometry args={[0.1 + i * 0.02, 8, 8]} />
          <meshStandardMaterial color={`hsl(${120 + i * 8}, 60%, ${30 + i * 5}%)`} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function CoffeeTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow><cylinderGeometry args={[0.4, 0.4, 0.04, 16]} /><meshStandardMaterial color="#5C4033" roughness={0.5} /></mesh>
      <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.04, 0.04, 0.4, 8]} /><meshStandardMaterial color="#333" metalness={0.3} /></mesh>
      <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[0.2, 0.2, 0.02, 12]} /><meshStandardMaterial color="#333" metalness={0.3} /></mesh>
      {/* แก้วกาแฟ 2 แก้ว */}
      <mesh position={[-0.12, 0.45, 0.08]}><cylinderGeometry args={[0.03, 0.025, 0.06, 8]} /><meshStandardMaterial color="#f5f5dc" /></mesh>
      <mesh position={[0.1, 0.45, -0.05]}><cylinderGeometry args={[0.03, 0.025, 0.06, 8]} /><meshStandardMaterial color="#e0d5c0" /></mesh>
    </group>
  );
}

function Whiteboard({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh castShadow><boxGeometry args={[2, 1.2, 0.05]} /><meshStandardMaterial color="#e8e8e8" roughness={0.3} /></mesh>
      {/* Border */}
      <mesh position={[0, 0, 0.03]}><boxGeometry args={[2.1, 1.3, 0.02]} /><meshStandardMaterial color="#888" /></mesh>
      {/* Stand */}
      <mesh position={[-0.7, -0.9, 0.1]} castShadow><boxGeometry args={[0.04, 0.6, 0.04]} /><meshStandardMaterial color="#888" /></mesh>
      <mesh position={[0.7, -0.9, 0.1]} castShadow><boxGeometry args={[0.04, 0.6, 0.04]} /><meshStandardMaterial color="#888" /></mesh>
    </group>
  );
}

function BookShelf({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const bookColors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#34495e"];
  return (
    <group position={position} rotation={rotation}>
      {/* ชั้น */}
      {[0, 0.5, 1.0, 1.5].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow><boxGeometry args={[1.2, 0.03, 0.3]} /><meshStandardMaterial color="#5C4033" /></mesh>
      ))}
      {/* ข้างซ้ายขวา */}
      <mesh position={[-0.6, 0.75, 0]} castShadow><boxGeometry args={[0.03, 1.5, 0.3]} /><meshStandardMaterial color="#5C4033" /></mesh>
      <mesh position={[0.6, 0.75, 0]} castShadow><boxGeometry args={[0.03, 1.5, 0.3]} /><meshStandardMaterial color="#5C4033" /></mesh>
      {/* หนังสือ */}
      {bookColors.map((c, i) => (
        <mesh key={i} position={[-0.4 + (i % 4) * 0.25, 0.17 + Math.floor(i / 4) * 0.5, 0]} castShadow>
          <boxGeometry args={[0.06, 0.25 + Math.random() * 0.1, 0.2]} />
          <meshStandardMaterial color={c} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Lamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.15, 0.1, 0.15, 8]} /><meshStandardMaterial color="#ffd700" emissive="#ffa500" emissiveIntensity={0.3} transparent opacity={0.8} /></mesh>
      <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.015, 0.015, 0.5, 6]} /><meshStandardMaterial color="#888" metalness={0.5} /></mesh>
      <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.1, 0.1, 0.02, 8]} /><meshStandardMaterial color="#555" /></mesh>
      <pointLight position={[0, 0.7, 0]} intensity={0.3} color="#ffd700" distance={3} />
    </group>
  );
}

// ─── Floor ───
function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#1a2332" roughness={0.9} /></mesh>
      <gridHelper args={[40, 40, "#222d3d", "#1a2535"]} />
    </group>
  );
}

// ─── CEO Quote (แสดงคำบ่น) ───
function CEOQuote({ quotes, stateRef }: { quotes: string[]; stateRef: React.RefObject<{ quoteIdx: number; quoteTime: number }> }) {
  const [text, setText] = useState(quotes[0]);
  useFrame((s) => {
    const st = stateRef.current;
    if (!st) return;
    const newText = quotes[st.quoteIdx % quotes.length];
    if (newText !== text) setText(newText);
  });
  return (
    <div style={{ marginTop: 3, fontSize: 9, color: "#fff", background: "rgba(0,0,0,0.5)", borderRadius: 5, padding: "2px 6px", whiteSpace: "nowrap" }}>
      {text}
    </div>
  );
}

// ─── CEO กุ้ง — เดินตรวจเฉพาะโต๊ะที่ทำงาน (physics-like) ───
function CEOShrimp({ agents, deskPositions, ttsEnabled = true }: { agents: Agent[]; deskPositions: { pos: [number, number, number]; facing: number }[]; ttsEnabled?: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  const color = useMemo(() => new THREE.Color("#ffd700"), []);
  const lighter = useMemo(() => color.clone().offsetHSL(0, 0, 0.15), [color]);

  // Waypoints — เดินทุกโต๊ะ (active ก่อน แล้ว idle) ไม่หายไปแม้ไม่มีคนทำงาน
  const waypoints: [number, number][] = useMemo(() => {
    const active: [number, number][] = [];
    const idle: [number, number][] = [];
    agents.forEach((agent, i) => {
      const dp = deskPositions[i];
      if (!dp) return;
      const offset = dp.facing === 0 ? 1.2 : -1.2;
      const pt: [number, number] = [dp.pos[0] + offset, dp.pos[2]];
      const isActive = agent.status === "working" || agent.status === "excited" || agent.status === "running" || agent.status === "alert";
      if (isActive) active.push(pt);
      else idle.push(pt);
    });
    // active ก่อน → สุ่ม idle 3 ตัว (CEO ไปดูคนไม่ทำงานด้วย)
    const shuffledIdle = idle.sort(() => Math.random() - 0.5).slice(0, 3);
    const all = [...active, ...shuffledIdle];
    if (all.length === 0) return [[0.5, 0], [-3, 2], [3, -2]]; // เดินสุ่มถ้าว่าง
    return all;
  }, [agents, deskPositions]);

  // คำพูด CEO สำหรับ balloon text (ดึงจากคู่สนทนา)
  const CEO_QUOTES = (aiPairs.length > 0 ? aiPairs : CONVERSATION_PAIRS).map(p => p[0]);
  const hammerRef = useRef<THREE.Group>(null!);
  const state = useRef({ wpIdx: 0, x: 0.5, z: 0, vx: 0, vz: 0, facingAngle: 0, legPhase: 0, pauseUntil: 0, quoteIdx: 0, quoteTime: 0, hammerSwing: 0, targetAngleAtPause: 0, currentAgentName: "" });

  useFrame((s, delta) => {
    if (!ref.current) return;
    const st = state.current;
    const now = s.clock.elapsedTime;

    // ค้อนแกว่ง
    if (hammerRef.current) {
      if (now < st.pauseUntil) {
        st.hammerSwing += delta * 8;
        hammerRef.current.rotation.z = Math.sin(st.hammerSwing) * 0.6; // เคาะ!
      } else {
        hammerRef.current.rotation.z = 0; // เก็บค้อน
      }
    }

    // หยุดพักที่ waypoint — หันหน้า + เคาะหัว + รอพูดเสร็จ
    if (now < st.pauseUntil || isCeoSpeaking()) {
      // หันหน้าเข้าหาพนักงาน (snap เร็ว)
      let angleDiff = st.targetAngleAtPause - st.facingAngle;
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      st.facingAngle += angleDiff * 0.2;
      ref.current.position.set(st.x, 0.25, st.z);
      ref.current.rotation.y = st.facingAngle;
      return;
    }

    const target = waypoints[st.wpIdx];
    const dx = target[0] - st.x;
    const dz = target[1] - st.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // ถึง waypoint → หยุดดู + เคาะหัว → ไปต่อ
    if (dist < 0.15) {
      st.pauseUntil = now + 2 + Math.random() * 1.5; // หยุด 2-3.5 วินาที
      st.vx = 0; st.vz = 0;
      st.hammerSwing = 0;
      // หันหน้าเข้าหาตัวน้องกุ้ง (ไม่ใช่โต๊ะ)
      const wp = waypoints[st.wpIdx];
      const agentIdx = agents.findIndex((a, i) => {
        const dp = deskPositions[i];
        if (!dp) return false;
        const isActive = a.status === "working" || a.status === "excited" || a.status === "running" || a.status === "alert";
        return isActive && Math.abs(dp.pos[2] - wp[1]) < 1.5 && Math.abs(dp.pos[0] - wp[0]) < 2.5;
      });
      if (agentIdx >= 0) {
        const dp = deskPositions[agentIdx];
        const shrimpZ = dp.facing === 0 ? dp.pos[2] + 0.3 : dp.pos[2] - 0.3;
        const toX = dp.pos[0] - st.x;
        const toZ = shrimpZ - st.z;
        st.targetAngleAtPause = Math.atan2(toX, toZ);
        st.currentAgentName = agents[agentIdx].name;
      }
      st.wpIdx = (st.wpIdx + 1) % waypoints.length;
      // พูดทุก waypoint — เรียกชื่อพนักงาน + พูด TTS
      st.quoteIdx = (st.quoteIdx + 1) % CEO_QUOTES.length;
      st.quoteTime = now;
      ceoSpeak(st.currentAgentName, ttsEnabled);
      return;
    }

    // Physics: เร่งช้าลง + แรงเสียดทานสูงขึ้น → เดินเนียน
    const speed = 0.8;
    const friction = 0.95;
    const ax = (dx / dist) * speed * delta;
    const az = (dz / dist) * speed * delta;
    st.vx = (st.vx + ax) * friction;
    st.vz = (st.vz + az) * friction;
    st.x += st.vx;
    st.z += st.vz;

    // หันหน้าไปทิศทางที่เดิน (smooth มากขึ้น)
    const targetAngle = Math.atan2(st.vx, st.vz);
    let angleDiff = targetAngle - st.facingAngle;
    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    st.facingAngle += angleDiff * 0.06;

    // ขาแกว่ง (walking — ช้าลง)
    const v = Math.sqrt(st.vx * st.vx + st.vz * st.vz);
    st.legPhase += v * 25;

    // Bob ขึ้นลงตามจังหวะเดิน
    const bob = Math.abs(Math.sin(st.legPhase)) * 0.03;

    ref.current.position.set(st.x, 0.25 + bob, st.z);
    ref.current.rotation.y = st.facingAngle;
  });

  return (
    <group ref={ref} position={[0.5, 0.25, 0]}>
      {/* ตัว CEO — ใหญ่กว่าปกติ 1.3x, สีทอง */}
      <mesh position={[0, 0.4, 0]} castShadow><sphereGeometry args={[0.26, 16, 16]} /><meshStandardMaterial color={color} roughness={0.2} metalness={0.3} /></mesh>
      <mesh position={[0, 0.72, 0.03]} castShadow><sphereGeometry args={[0.21, 16, 16]} /><meshStandardMaterial color={color} roughness={0.2} metalness={0.3} /></mesh>
      {/* ตา */}
      <mesh position={[-0.07, 0.76, 0.18]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[-0.07, 0.76, 0.21]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[0.07, 0.76, 0.18]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[0.07, 0.76, 0.21]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
      {/* แขน */}
      <mesh position={[-0.3, 0.37, 0.08]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color={lighter} /></mesh>
      <mesh position={[0.3, 0.37, 0.08]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color={lighter} /></mesh>
      {/* หาง */}
      <mesh position={[0, 0.2, -0.18]} rotation={[0.5, 0, 0]}><coneGeometry args={[0.09, 0.22, 8]} /><meshStandardMaterial color={color} /></mesh>
      {/* ค้อนเคาะหัวพนักงาน 🔨 — ใหญ่ เห็นชัด */}
      <group ref={hammerRef} position={[0.32, 0.7, 0.15]}>
        {/* ด้ามค้อน */}
        <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.025, 0.02, 0.35, 6]} /><meshStandardMaterial color="#8B4513" roughness={0.7} /></mesh>
        {/* หัวค้อน */}
        <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.15, 0.08, 0.08]} /><meshStandardMaterial color="#cc3333" metalness={0.5} roughness={0.3} /></mesh>
        {/* หน้าค้อน สีเงิน */}
        <mesh position={[0.08, 0.32, 0]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.15, 0.03, 0.08]} /><meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} /></mesh>
      </group>
      {/* มงกุฎ 👑 */}
      <mesh position={[0, 0.96, 0.03]}><coneGeometry args={[0.08, 0.12, 5]} /><meshStandardMaterial color="#ffd700" emissive="#ffa500" emissiveIntensity={0.5} metalness={0.8} /></mesh>
      <mesh position={[-0.06, 0.93, 0.03]}><coneGeometry args={[0.04, 0.08, 4]} /><meshStandardMaterial color="#ffd700" emissive="#ffa500" emissiveIntensity={0.3} metalness={0.8} /></mesh>
      <mesh position={[0.06, 0.93, 0.03]}><coneGeometry args={[0.04, 0.08, 4]} /><meshStandardMaterial color="#ffd700" emissive="#ffa500" emissiveIntensity={0.3} metalness={0.8} /></mesh>
      {/* Name tag + คำบ่น */}
      <Html position={[0, 1.2, 0]} center distanceFactor={7} style={{ pointerEvents: "none" }}>
        <div style={{ textAlign: "center", fontFamily: "Prompt,sans-serif" }}>
          <div style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#000", padding: "2px 10px", borderRadius: 6, fontSize: 10, fontWeight: 800, whiteSpace: "nowrap", boxShadow: "0 2px 12px rgba(255,215,0,0.5)" }}>
            👑 น้องกุ้ง CEO
          </div>
          <CEOQuote quotes={CEO_QUOTES} stateRef={state} />
        </div>
      </Html>
      {/* Glow */}
      <pointLight position={[0, 0.5, 0]} intensity={0.3} color="#ffd700" distance={3} />
    </group>
  );
}

// ─── แมวออฟฟิศ 🐱 เดินหลบของ + กระโดดขึ้นโต๊ะ + กวนพนักงาน ───
const CAT_MOODS = ["เหมียว~", "นอนดีกว่า zzZ", "กวนไปวันๆ~", "ขอกินด้วย!", "...แมวไม่สน", "หิวแล้ว!", "เบื่อ~"];
function OfficeCat({ deskPositions }: { deskPositions: { pos: [number, number, number]; facing: number }[] }) {
  const ref = useRef<THREE.Group>(null!);
  const tailRef = useRef<THREE.Mesh>(null!);

  // waypoints: พื้น + บนโต๊ะ (y=0.6) สลับกัน
  const waypoints = useMemo(() => {
    const pts: { x: number; y: number; z: number; onDesk: boolean }[] = [
      { x: 0, y: 0, z: 0, onDesk: false },
      { x: -2, y: 0, z: -3, onDesk: false },
      { x: 2, y: 0, z: 4, onDesk: false },
      { x: -5, y: 0, z: 1, onDesk: false },
      { x: 3, y: 0, z: -2, onDesk: false },
    ];
    // เพิ่มโต๊ะสุ่ม 3 ตัวให้กระโดดขึ้น
    const shuffled = [...deskPositions].sort(() => Math.random() - 0.5).slice(0, 3);
    shuffled.forEach((dp) => {
      pts.push({ x: dp.pos[0], y: 0.6, z: dp.pos[2], onDesk: true }); // บนโต๊ะ
      pts.push({ x: dp.pos[0] + (Math.random() - 0.5) * 2, y: 0, z: dp.pos[2] + 1, onDesk: false }); // ลงพื้น
    });
    return pts;
  }, [deskPositions]);

  const st = useRef({ wpIdx: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, angle: 0, pauseUntil: 0, moodIdx: 0 });

  useFrame((s, delta) => {
    if (!ref.current) return;
    const c = st.current;
    const now = s.clock.elapsedTime;

    // หางแกว่ง
    if (tailRef.current) tailRef.current.rotation.x = 0.8 + Math.sin(now * 3) * 0.3;

    // หยุดพักบนโต๊ะ (กวนพนักงาน 3 วิ)
    if (now < c.pauseUntil) {
      ref.current.position.set(c.x, c.y, c.z);
      ref.current.rotation.y = c.angle;
      return;
    }

    const wp = waypoints[c.wpIdx];
    const dx = wp.x - c.x;
    const dy = wp.y - c.y;
    const dz = wp.z - c.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // ถึง waypoint
    if (dist < 0.2 && Math.abs(dy) < 0.15) {
      if (wp.onDesk) {
        c.pauseUntil = now + 2 + Math.random() * 2; // นั่งบนโต๊ะ 2-4 วิ
        c.moodIdx = (c.moodIdx + 1) % CAT_MOODS.length;
      }
      c.wpIdx = (c.wpIdx + 1) % waypoints.length;
      c.vx = 0; c.vz = 0;
      return;
    }

    // Physics: เดิน + กระโดดขึ้นโต๊ะ
    const speed = 1.2;
    const friction = 0.93;
    c.vx = (c.vx + (dx / Math.max(dist, 0.1)) * speed * delta) * friction;
    c.vz = (c.vz + (dz / Math.max(dist, 0.1)) * speed * delta) * friction;

    // กระโดด (ถ้าต้องขึ้นโต๊ะ)
    if (wp.y > c.y + 0.05) {
      c.vy += 3.0 * delta; // กระโดดขึ้น
    } else if (c.y > 0.01 && wp.y < 0.1) {
      c.vy -= 5.0 * delta; // ตกลง (gravity)
    } else {
      c.vy *= 0.8;
    }

    c.x += c.vx;
    c.y = Math.max(0, c.y + c.vy * delta);
    c.z += c.vz;

    // หันหน้า
    const v = Math.sqrt(c.vx * c.vx + c.vz * c.vz);
    if (v > 0.005) {
      const target = Math.atan2(c.vx, c.vz);
      let diff = target - c.angle;
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      c.angle += diff * 0.12;
    }

    // bob เวลาเดินพื้น
    const bob = c.y < 0.05 ? Math.abs(Math.sin(now * 8)) * 0.015 : 0;
    ref.current.position.set(c.x, c.y + bob, c.z);
    ref.current.rotation.y = c.angle;
  });

  const mood = CAT_MOODS[st.current.moodIdx];
  return (
    <group ref={ref}>
      <mesh position={[0, 0.12, 0]} castShadow><boxGeometry args={[0.15, 0.12, 0.3]} /><meshStandardMaterial color="#ff9944" /></mesh>
      <mesh position={[0, 0.18, 0.18]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color="#ff9944" /></mesh>
      <mesh position={[-0.05, 0.26, 0.18]}><coneGeometry args={[0.03, 0.06, 4]} /><meshStandardMaterial color="#ff9944" /></mesh>
      <mesh position={[0.05, 0.26, 0.18]}><coneGeometry args={[0.03, 0.06, 4]} /><meshStandardMaterial color="#ff9944" /></mesh>
      <mesh ref={tailRef} position={[0, 0.15, -0.2]} rotation={[0.8, 0, 0]}><cylinderGeometry args={[0.015, 0.01, 0.2, 6]} /><meshStandardMaterial color="#ff9944" /></mesh>
      <mesh position={[-0.03, 0.2, 0.26]}><sphereGeometry args={[0.015, 6, 6]} /><meshStandardMaterial color="#2ecc71" emissive="#2ecc71" emissiveIntensity={0.3} /></mesh>
      <mesh position={[0.03, 0.2, 0.26]}><sphereGeometry args={[0.015, 6, 6]} /><meshStandardMaterial color="#2ecc71" emissive="#2ecc71" emissiveIntensity={0.3} /></mesh>
      <Html position={[0, 0.35, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div style={{ textAlign: "center", fontFamily: "Prompt,sans-serif" }}>
          <div style={{ fontSize: 8, color: "#ff9944" }}>🐱 ส้ม</div>
          <div style={{ fontSize: 7, color: "#ccc", background: "rgba(0,0,0,0.4)", borderRadius: 4, padding: "1px 4px", whiteSpace: "nowrap" }}>{mood}</div>
        </div>
      </Html>
    </group>
  );
}

// ─── ตู้กดน้ำ 🚰 ───
function WaterCooler({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[0.3, 0.8, 0.25]} /><meshStandardMaterial color="#e0e0e0" /></mesh>
      <mesh position={[0, 0.82, 0]}><cylinderGeometry args={[0.12, 0.12, 0.04, 12]} /><meshStandardMaterial color="#3498db" transparent opacity={0.5} /></mesh>
      <mesh position={[0, 0.95, 0]}><cylinderGeometry args={[0.1, 0.12, 0.25, 12]} /><meshStandardMaterial color="#3498db" transparent opacity={0.3} /></mesh>
      <Html position={[0, 1.2, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div style={{ fontSize: 7, color: "#3498db", fontFamily: "Prompt,sans-serif" }}>🚰 กดน้ำ</div>
      </Html>
    </group>
  );
}

// ─── พัดลม 🌀 หมุนตลอด ───
function Fan({ position }: { position: [number, number, number] }) {
  const bladeRef = useRef<THREE.Mesh>(null!);
  useFrame((s) => { if (bladeRef.current) bladeRef.current.rotation.z = s.clock.elapsedTime * 8; });
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.02, 0.02, 0.5, 6]} /><meshStandardMaterial color="#888" metalness={0.5} /></mesh>
      <mesh position={[0, 0.76, 0]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#555" metalness={0.5} /></mesh>
      <mesh ref={bladeRef} position={[0, 0.76, 0.02]}>
        <boxGeometry args={[0.4, 0.02, 0.01]} /><meshStandardMaterial color="#ccc" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[0.1, 0.1, 0.02, 8]} /><meshStandardMaterial color="#555" /></mesh>
    </group>
  );
}

// ─── โดนัทกล่อง 🍩 ───
function DonutBox({ position }: { position: [number, number, number] }) {
  const colors = ["#e74c3c", "#f39c12", "#e91e63", "#9b59b6", "#2ecc71", "#3498db"];
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[0.25, 0.04, 0.25]} /><meshStandardMaterial color="#f5c6d0" /></mesh>
      {colors.map((c, i) => (
        <mesh key={i} position={[(i % 3 - 1) * 0.07, 0.04, (Math.floor(i / 3) - 0.5) * 0.08]}>
          <torusGeometry args={[0.025, 0.01, 8, 12]} /><meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}

// ─── กระดิ่งทอง 🔔 (แกว่งเบาๆ) ───
function GoldenBell({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((s) => { if (ref.current) ref.current.rotation.z = Math.sin(s.clock.elapsedTime * 2) * 0.1; });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.005, 0.005, 0.1, 4]} /><meshStandardMaterial color="#888" /></mesh>
      <mesh position={[0, 0.08, 0]}><sphereGeometry args={[0.08, 12, 12]} /><meshStandardMaterial color="#ffd700" emissive="#ffa500" emissiveIntensity={0.2} metalness={0.8} /></mesh>
      <mesh position={[0, 0.02, 0]}><sphereGeometry args={[0.02, 6, 6]} /><meshStandardMaterial color="#333" /></mesh>
    </group>
  );
}

// ─── ป้ายพนักงานดีเด่น ⭐ ───
function StarBoard({ position, agents }: { position: [number, number, number]; agents: Agent[] }) {
  const best = agents.reduce((a, b) => (a.status === "working" ? a : b));
  return (
    <group position={position}>
      <mesh castShadow><boxGeometry args={[1, 0.8, 0.05]} /><meshStandardMaterial color="#1a1a2e" /></mesh>
      <mesh position={[0, 0, 0.03]}><boxGeometry args={[1.05, 0.85, 0.02]} /><meshStandardMaterial color="#ffd700" metalness={0.5} /></mesh>
      <Html position={[0, 0, 0.05]} center distanceFactor={6} style={{ pointerEvents: "none" }}>
        <div style={{ textAlign: "center", fontFamily: "Prompt,sans-serif", width: 100 }}>
          <div style={{ fontSize: 16 }}>⭐</div>
          <div style={{ fontSize: 8, color: "#ffd700", fontWeight: 700 }}>พนักงานดีเด่น</div>
          <div style={{ fontSize: 10, color: "#fff", fontWeight: 800, marginTop: 2 }}>{best.emoji} {best.name}</div>
          <div style={{ fontSize: 7, color: "#ccc" }}>{best.role}</div>
        </div>
      </Html>
    </group>
  );
}

// ─── ป้าย LED ยอดขาย 📊 (ดึงจริงจาก API) ───
function SalesBoard({ position }: { position: [number, number, number] }) {
  const [sales, setSales] = useState({ today: 0, yesterday: 0, month: 0 });
  const [show, setShow] = useState(0); // วนแสดง 3 ค่า

  // ดึงยอดจริงทุก 60 วิ
  useState(() => {
    const load = () => fetch("/dashboard/api/revenue").then(r => r.json()).then(d => {
      setSales({ today: d.today?.total || 0, yesterday: d.yesterday?.total || 0, month: d.month?.total || 0 });
    }).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  });

  // วนแสดง วันนี้ → เมื่อวาน → เดือน ทุก 5 วิ
  useState(() => {
    const t = setInterval(() => setShow(s => (s + 1) % 3), 5000);
    return () => clearInterval(t);
  });

  const labels = ["ยอดขายวันนี้", "ยอดเมื่อวาน", "ยอดเดือนนี้"];
  const values = [sales.today, sales.yesterday, sales.month];

  return (
    <group position={position}>
      <mesh castShadow><boxGeometry args={[1.2, 0.6, 0.05]} /><meshStandardMaterial color="#0a0a0a" /></mesh>
      <mesh position={[0, 0, 0.03]}><boxGeometry args={[1.25, 0.65, 0.02]} /><meshStandardMaterial color="#333" /></mesh>
      <Html position={[0, 0, 0.05]} center distanceFactor={6} style={{ pointerEvents: "none" }}>
        <div style={{ textAlign: "center", fontFamily: "monospace", width: 130 }}>
          <div style={{ fontSize: 7, color: "#4ade80" }}>📊 {labels[show]}</div>
          <div style={{ fontSize: 18, color: "#4ade80", fontWeight: 900, textShadow: "0 0 10px rgba(74,222,128,0.5)" }}>
            ฿{values[show].toLocaleString()}
          </div>
        </div>
      </Html>
      <pointLight position={[0, 0, 0.2]} intensity={0.2} color="#4ade80" distance={2} />
    </group>
  );
}

// ─── Office Layout ───
function OfficeLayout({ agents, ttsEnabled }: Props) {
  // 3 แถวๆ ละ 4-5 ตัว เว้นช่องทางเดินตรงกลาง
  const deskPositions: { pos: [number, number, number]; facing: number }[] = [
    // แถวซ้าย — แถวที่ 1 (4 ตัว) หันขวา
    { pos: [-4, 0, -4], facing: 0 },
    { pos: [-4, 0, -1.5], facing: 0 },
    { pos: [-4, 0, 1], facing: 0 },
    { pos: [-4, 0, 3.5], facing: 0 },
    // แถวซ้าย — แถวที่ 2 (4 ตัว) หันซ้าย
    { pos: [-1.5, 0, -4], facing: Math.PI },
    { pos: [-1.5, 0, -1.5], facing: Math.PI },
    { pos: [-1.5, 0, 1], facing: Math.PI },
    { pos: [-1.5, 0, 3.5], facing: Math.PI },
    // แถวขวา (5 ตัว) หันขวา
    { pos: [2.5, 0, -5], facing: 0 },
    { pos: [2.5, 0, -2.5], facing: 0 },
    { pos: [2.5, 0, 0], facing: 0 },
    { pos: [2.5, 0, 2.5], facing: 0 },
    { pos: [2.5, 0, 5], facing: 0 },
  ];

  return (
    <group>
      {agents.map((agent, i) => {
        const dp = deskPositions[i];
        if (!dp) return null;
        const shrimpZ = dp.facing === 0 ? dp.pos[2] + 0.3 : dp.pos[2] - 0.3;
        const isActive = agent.status === "working" || agent.status === "excited" || agent.status === "running" || agent.status === "alert";
        return (
          <group key={agent.id}>
            <DeskUnit position={dp.pos} color={agent.color} facing={dp.facing} />
            <Shrimp agent={agent} position={[dp.pos[0], 0.25, shrimpZ]} rotationY={dp.facing === 0 ? Math.PI : 0} />
            {isActive && <SpeechBalloon agent={agent} position={[dp.pos[0], 0, shrimpZ]} />}
            {!isActive && (
              <Html position={[dp.pos[0], 1.6, shrimpZ]} center distanceFactor={6} style={{ pointerEvents: "none" }}>
                <div style={{ textAlign: "center", fontFamily: "Prompt,sans-serif", animation: "pulse 2s infinite" }}>
                  <div style={{ fontSize: 18 }}>🟥</div>
                  <div style={{ fontSize: 8, color: "#f87171", fontWeight: 700, background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>
                    ระวังไล่ออก!
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* ─── เฟอร์นิเจอร์ตกแต่ง ─── */}

      {/* ต้นไม้ */}
      <Plant position={[-6, 0, -5]} size={1.2} />
      <Plant position={[-6, 0, 4]} size={0.9} />
      <Plant position={[5, 0, -6]} size={1.0} />
      <Plant position={[5, 0, 5]} size={1.3} />
      <Plant position={[0.5, 0, -6]} size={0.8} />
      <Plant position={[0.5, 0, 6]} size={0.7} />

      {/* โต๊ะกาแฟ ตรงกลางทางเดิน */}
      <CoffeeTable position={[0.5, 0, -1]} />
      <CoffeeTable position={[0.5, 0, 2.5]} />

      {/* Whiteboard */}
      <Whiteboard position={[-6.5, 1.2, 0]} rotation={[0, Math.PI / 2, 0]} />

      {/* ชั้นหนังสือ */}
      <BookShelf position={[5.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

      {/* โคมไฟ */}
      <Lamp position={[-6, 0, -2.5]} />
      <Lamp position={[-6, 0, 2]} />
      <Lamp position={[5, 0, -3]} />
      <Lamp position={[5, 0, 3]} />

      {/* CEO เดินตรวจเฉพาะโต๊ะที่ทำงาน */}
      <CEOShrimp agents={agents} deskPositions={deskPositions} ttsEnabled={ttsEnabled} />

      {/* 🐱 แมวออฟฟิศ เดินหลบของ + กระโดดขึ้นโต๊ะ */}
      <OfficeCat deskPositions={deskPositions} />

      {/* 🚰 ตู้กดน้ำ */}
      <WaterCooler position={[-6, 0, -1]} />

      {/* 🌀 พัดลม */}
      <Fan position={[5, 0, 1.5]} />
      <Fan position={[-6, 0, 3.5]} />

      {/* 🍩 โดนัท บนโต๊ะกาแฟ */}
      <DonutBox position={[0.5, 0.43, -1]} />
      <DonutBox position={[0.5, 0.43, 2.5]} />

      {/* 🔔 กระดิ่งทอง — ดังเมื่อปิดดีล */}
      <GoldenBell position={[0.5, 1.5, -4]} />

      {/* ⭐ ป้ายพนักงานดีเด่น */}
      <StarBoard position={[5.5, 1.5, -5]} agents={agents} />

      {/* 📊 ป้าย LED ยอดขาย */}
      <SalesBoard position={[-6.5, 1.8, -4]} />

      {/* ป้าย */}
      <Html position={[0, 3.5, -7]} center distanceFactor={15}>
        <div style={{ textAlign: "center", fontFamily: "Prompt,sans-serif" }}>
          <div style={{ color: "#818cf8", fontWeight: 700, fontSize: 20, textShadow: "0 0 20px rgba(129,140,248,0.5)" }}>🦐 OpenClaw Office</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>น้องกุ้ง 13 ตัว + CEO ทำงานให้คุณ 24/7</div>
        </div>
      </Html>
    </group>
  );
}

// ─── Main Scene ───
export default function OfficeScene({ agents, ttsEnabled }: Props) {
  return (
    <Canvas
      camera={{ position: [8, 6, 10], fov: 50 }}
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
      style={{ background: "linear-gradient(180deg, #0a0e1a 0%, #111827 100%)" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 12, 8]} intensity={1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[0, 4, 0]} intensity={0.4} color="#818cf8" />
      <pointLight position={[-5, 3, 3]} intensity={0.2} color="#22d3ee" />
      <pointLight position={[4, 3, -3]} intensity={0.2} color="#f472b6" />
      <fog attach="fog" args={["#0a0e1a", 18, 40]} />

      <Suspense fallback={null}>
        <Floor />
        <OfficeLayout agents={agents} ttsEnabled={ttsEnabled} />
      </Suspense>

      <OrbitControls minDistance={4} maxDistance={22} maxPolarAngle={Math.PI / 2.1} minPolarAngle={0.2} enableDamping dampingFactor={0.05} autoRotate autoRotateSpeed={0.2} />
    </Canvas>
  );
}
