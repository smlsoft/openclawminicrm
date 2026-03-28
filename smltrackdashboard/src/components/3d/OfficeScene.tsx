"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Suspense, useRef, useMemo, useState } from "react";
import * as THREE from "three";

import { getRandomConversation, getQueueRemaining } from "./conversations";

interface Agent { id: number; name: string; role: string; emoji: string; color: string; status: string; quote: string; }
interface Props { agents: Agent[]; ttsEnabled?: boolean; }

// ─── TTS System — Edge TTS (Neural ไทยชัด) + fallback Web Speech ───
let ttsBusy = false;
let ttsBusySince = 0;
// Safety: ถ้า ttsBusy ค้างนานกว่า 30 วิ → auto-reset
function checkTTSStuck() { if (ttsBusy && Date.now() - ttsBusySince > 30000) { ttsBusy = false; } }

// ─── CEO Plan — วางแผนบทสนทนาล่วงหน้า (batch ทุก 1 นาที) ───
let ceoPlan: Record<string, { ceo: string; emp: string }> = {};
let lastPlanFetch = 0;

async function fetchCeoPlan() {
  if (typeof window === "undefined") return;
  if (Date.now() - lastPlanFetch < 60000 && Object.keys(ceoPlan).length > 0) return; // ดึงทุก 1 นาที
  try {
    const r = await fetch("/dashboard/api/ceo-review");
    const d = await r.json();
    if (d && typeof d === "object" && Object.keys(d).length > 0) {
      ceoPlan = d;
      lastPlanFetch = Date.now();
      usedPlanKeys.clear(); // plan ใหม่มา → reset ให้ CEO ถามใหม่ได้
    }
  } catch { /* keep existing */ }
}

// เริ่มโหลดแผนทันทีที่เปิดหน้า + refresh ทุก 1 นาที
if (typeof window !== "undefined") {
  fetchCeoPlan();
  setInterval(fetchCeoPlan, 60000);
}

const usedPlanKeys = new Set<string>(); // เก็บชื่อที่ CEO ถามแล้ว

function getCeoPlanFor(agentName: string): [string, string] | null {
  const shortName = agentName.replace("น้องกุ้ง", "");
  const key = shortName || agentName;
  // ข้ามถ้าถามแล้ว
  if (usedPlanKeys.has(key)) return null;
  const pair = ceoPlan[shortName] || ceoPlan[agentName];
  if (pair?.ceo && pair?.emp) return [pair.ceo, pair.emp];
  return null;
}

function markPlanUsed(agentName: string) {
  const shortName = agentName.replace("น้องกุ้ง", "");
  usedPlanKeys.add(shortName || agentName);
}

// Unlock audio สำหรับมือถือ — ต้องมี user gesture ก่อน
let audioUnlocked = false;
let sharedAudioCtx: AudioContext | null = null;

function unlockAudio() {
  if (audioUnlocked) return;
  try {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // สร้าง silent buffer เพื่อ unlock
    const buf = sharedAudioCtx.createBuffer(1, 1, 22050);
    const src = sharedAudioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(sharedAudioCtx.destination);
    src.start(0);
    audioUnlocked = true;
  } catch { /* silent */ }
}

// เรียก unlock เมื่อ user แตะหน้าจอ / click
if (typeof window !== "undefined") {
  const unlock = () => { unlockAudio(); window.removeEventListener("touchstart", unlock); window.removeEventListener("click", unlock); };
  window.addEventListener("touchstart", unlock, { once: true });
  window.addEventListener("click", unlock, { once: true });
}

// ─── นิทานสั้น — CEO ว่างเล่าให้พนักงานฟัง ───
let ceoStories: string[] = [];
let lastStoryFetch = 0;
let storyIdx = 0;

async function fetchCeoStories() {
  if (typeof window === "undefined") return;
  if (Date.now() - lastStoryFetch < 300000 && ceoStories.length > 0) return; // ดึงทุก 5 นาที
  try {
    const r = await fetch("/dashboard/api/ceo-review?" + new URLSearchParams({ story: "1" }));
    const d = await r.json();
    if (d.stories && Array.isArray(d.stories) && d.stories.length > 0) {
      ceoStories = d.stories;
      lastStoryFetch = Date.now();
      storyIdx = 0;
    }
  } catch { /* keep existing */ }
}

function getNextStory(): string | null {
  if (ceoStories.length === 0) return null;
  const s = ceoStories[storyIdx % ceoStories.length];
  storyIdx++;
  return s;
}

// โหลดนิทานเริ่มต้น
if (typeof window !== "undefined") {
  setTimeout(fetchCeoStories, 5000); // รอ 5 วิ หลังโหลดหน้า
  setInterval(fetchCeoStories, 300000);
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

    // ใช้ AudioContext (มือถือ friendly) ถ้า unlock แล้ว
    if (sharedAudioCtx && audioUnlocked) {
      try {
        const arrayBuf = await blob.arrayBuffer();
        const audioBuf = await sharedAudioCtx.decodeAudioData(arrayBuf);
        const source = sharedAudioCtx.createBufferSource();
        source.buffer = audioBuf;
        source.connect(sharedAudioCtx.destination);
        return new Promise((resolve) => {
          source.onended = () => resolve(true);
          source.start(0);
        });
      } catch { /* fallback to Audio element */ }
    }

    // Fallback: Audio element (desktop)
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

async function ceoSpeak(agentName: string, enabled: boolean) {
  checkTTSStuck();
  if (!enabled || ttsBusy || !agentName) return;

  // ล็อค ttsBusy ทันที ก่อนทำอะไร (ป้องกันเรียกซ้ำ)
  ttsBusy = true;
  ttsBusySince = Date.now();

  // สุ่มบทสนทนา hardcode (897 ชุด ไม่ซ้ำจนกว่าจะหมด)
  const conv = getRandomConversation(agentName);
  console.log(`[CEO] → ${agentName} ${conv?.turns.length || 0} turns (เหลือ ${getQueueRemaining()})`)
  if (!conv || conv.turns.length === 0) { ttsBusy = false; return; }
  try {
    // เล่นทุก turn สลับ CEO (Niwat) ↔ พนักงาน (Premwadee)
    for (let i = 0; i < conv.turns.length; i++) {
      if (!enabled) break;
      const text = conv.turns[i];
      const isCeo = i % 2 === 0;
      if (isCeo) {
        const ok = await edgeTTS(text, "th-TH-NiwatNeural", 0.9);
        if (!ok) await webSpeechFallback(text, 0.5, 0.85);
      } else {
        const ok = await edgeTTS(text, "th-TH-PremwadeeNeural", 1.0);
        if (!ok) await webSpeechFallback(text, 1.8, 0.9);
      }
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
      {/* จอคอม MacBook สีขาว/เงิน */}
      <mesh position={[0, 0.82, -0.18]} castShadow><boxGeometry args={[0.42, 0.28, 0.02]} /><meshStandardMaterial color="#e5e7eb" metalness={0.3} roughness={0.4} /></mesh>
      {/* หน้าจอ — สว่าง */}
      <mesh position={[0, 0.82, -0.165]}><planeGeometry args={[0.38, 0.24]} /><meshBasicMaterial color="#f0f4ff" toneMapped={false} /></mesh>
      {/* ขาตั้งจอ เงิน */}
      <mesh position={[0, 0.66, -0.18]} castShadow><boxGeometry args={[0.06, 0.08, 0.04]} /><meshStandardMaterial color="#d1d5db" metalness={0.4} roughness={0.3} /></mesh>
      {/* คีย์บอร์ด เงิน */}
      <mesh position={[0, 0.575, 0.05]}><boxGeometry args={[0.3, 0.01, 0.08]} /><meshStandardMaterial color="#e5e7eb" metalness={0.2} roughness={0.4} /></mesh>
      {/* เมาส์ เงิน */}
      <mesh position={[0.25, 0.575, 0.05]}><boxGeometry args={[0.04, 0.01, 0.06]} /><meshStandardMaterial color="#e5e7eb" metalness={0.2} roughness={0.4} /></mesh>
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
  const [chartType, setChartType] = useState(0);
  const [bars, setBars] = useState([40, 65, 30, 80, 55, 70, 45]);
  const [line, setLine] = useState([20, 45, 35, 60, 50, 75, 65, 40, 55, 70]);

  // เปลี่ยนกราฟ + สุ่มค่าทุก 4 วินาที
  useState(() => {
    const t = setInterval(() => {
      setChartType(c => (c + 1) % 3);
      setBars(prev => prev.map(() => 15 + Math.random() * 75));
      setLine(prev => prev.map(() => 10 + Math.random() * 80));
    }, 4000);
    return () => clearInterval(t);
  });

  const barColors = ["#6366f1", "#22d3ee", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#f97316"];
  const titles = ["📊 ยอดขายรายสัปดาห์", "📈 ลูกค้าใหม่รายวัน", "📉 ความพึงพอใจ"];

  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh castShadow><boxGeometry args={[2, 1.2, 0.05]} /><meshStandardMaterial color="#f8fafc" roughness={0.3} /></mesh>
      {/* Border */}
      <mesh position={[0, 0, 0.03]}><boxGeometry args={[2.1, 1.3, 0.02]} /><meshStandardMaterial color="#94a3b8" /></mesh>
      {/* Stand */}
      <mesh position={[-0.7, -0.9, 0.1]} castShadow><boxGeometry args={[0.04, 0.6, 0.04]} /><meshStandardMaterial color="#94a3b8" /></mesh>
      <mesh position={[0.7, -0.9, 0.1]} castShadow><boxGeometry args={[0.04, 0.6, 0.04]} /><meshStandardMaterial color="#94a3b8" /></mesh>

      {/* กราฟ Animation */}
      <Html position={[0, 0, 0.04]} transform occlude={false} distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div style={{
          width: 280, height: 160, background: "#fff", borderRadius: 8, padding: "10px 12px",
          fontFamily: "Prompt,sans-serif", overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 8 }}>
            {titles[chartType % 3]}
          </div>

          {chartType % 3 === 0 ? (
            /* Bar Chart */
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, paddingTop: 4 }}>
              {bars.map((h, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{
                    width: "100%", height: h, maxHeight: 90,
                    background: `linear-gradient(180deg, ${barColors[i]}, ${barColors[i]}88)`,
                    borderRadius: "3px 3px 0 0",
                    transition: "height 0.8s cubic-bezier(0.4,0,0.2,1)",
                  }} />
                  <span style={{ fontSize: 7, color: "#94a3b8" }}>{["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"][i]}</span>
                </div>
              ))}
            </div>
          ) : chartType % 3 === 1 ? (
            /* Line Chart */
            <svg width="256" height="100" viewBox="0 0 256 100" style={{ display: "block" }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`M${line.map((v, i) => `${i * 28},${100 - v}`).join(" L")} L${(line.length - 1) * 28},100 L0,100 Z`}
                fill="url(#lineGrad)" />
              <polyline points={line.map((v, i) => `${i * 28},${100 - v}`).join(" ")}
                fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: "all 0.8s ease" }} />
              {line.map((v, i) => (
                <circle key={i} cx={i * 28} cy={100 - v} r="3" fill="#6366f1" style={{ transition: "all 0.8s ease" }} />
              ))}
            </svg>
          ) : (
            /* Donut Chart */
            <div style={{ display: "flex", alignItems: "center", gap: 12, height: 100 }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                {(() => {
                  const vals = bars.slice(0, 5);
                  const total = vals.reduce((a, b) => a + b, 0);
                  let acc = 0;
                  return vals.map((v, i) => {
                    const pct = v / total;
                    const start = acc;
                    acc += pct;
                    const r = 32;
                    const circ = 2 * Math.PI * r;
                    return (
                      <circle key={i} cx="40" cy="40" r={r} fill="none"
                        stroke={barColors[i]} strokeWidth="12"
                        strokeDasharray={`${pct * circ} ${circ}`}
                        strokeDashoffset={-start * circ}
                        style={{ transition: "all 0.8s ease" }} />
                    );
                  });
                })()}
                <text x="40" y="44" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">
                  {Math.round(bars.slice(0, 5).reduce((a, b) => a + b, 0) / 5)}%
                </text>
              </svg>
              <div style={{ fontSize: 8, color: "#64748b", lineHeight: 1.8 }}>
                {["ขาย", "บริการ", "ส่งของ", "ตอบแชท", "ติดตาม"].map((l, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: barColors[i], display: "inline-block" }} />
                    {l}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Html>
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

  // Waypoints — ย้ายเข้า useFrame เพื่อตรวจ ceoPlan (global) ทุก frame
  const waypointsRef = useRef<[number, number][]>([[0.5, 0]]);
  const lastPlanCheck = useRef("");

  // คำพูด CEO สำหรับ balloon text (แสดงระหว่างเดิน)
  // CEO balloon text จาก plan (AI สร้าง) ไม่ hardcode
  const CEO_QUOTES = useMemo(() => {
    const quotes = Object.values(ceoPlan).map(p => p.ceo).filter(Boolean);
    return quotes.length > 0 ? quotes : ["..."];
  }, []);
  const flagRef = useRef<THREE.Mesh>(null!);
  const state = useRef({ wpIdx: 0, x: 0.5, z: 0, vx: 0, vz: 0, facingAngle: 0, legPhase: 0, pauseUntil: 0, quoteIdx: 0, quoteTime: 0, flagWave: 0, targetAngleAtPause: 0, currentAgentName: "" });

  useFrame((s, delta) => {
    if (!ref.current) return;
    const st = state.current;
    const now = s.clock.elapsedTime;

    // ── Waypoints: เดินทุกโต๊ะเสมอ (hardcode 1001 ชุด ไม่ต้องพึ่ง AI plan) ──
    if (lastPlanCheck.current === "") {
      lastPlanCheck.current = "init";
      const all: [number, number][] = [];
      agents.forEach((_, i) => {
        const dp = deskPositions[i];
        if (!dp) return;
        const offset = dp.facing === 0 ? 1.2 : -1.2;
        all.push([dp.pos[0] + offset, dp.pos[2]]);
      });
      waypointsRef.current = all.length > 0 ? all : [[0.5, 0], [-3, 2], [3, -2]];
    }
    const waypoints = waypointsRef.current;

    // ธงโบกสบัด — ตลอดเวลา
    st.flagWave += delta * 3;
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(st.flagWave) * 0.3;
      flagRef.current.rotation.z = Math.sin(st.flagWave * 1.5) * 0.15;
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
      st.pauseUntil = now + 15 + Math.random() * 5; // หยุด 15-20 วินาที (รอ TTS 6 turns จบ)
      st.vx = 0; st.vz = 0;
      // ธง — ไม่ต้อง reset (โบกตลอด)
      // หันหน้าเข้าหาตัวน้องกุ้ง (ไม่ใช่โต๊ะ)
      const wp = waypoints[st.wpIdx];
      const agentIdx = agents.findIndex((_, i) => {
        const dp = deskPositions[i];
        if (!dp) return false;
        // หาพนักงานที่อยู่ใกล้ waypoint (ทุก status ไม่ใช่แค่ active)
        const offset = dp.facing === 0 ? 1.2 : -1.2;
        return Math.abs((dp.pos[0] + offset) - wp[0]) < 0.5 && Math.abs(dp.pos[2] - wp[1]) < 0.5;
      });
      if (agentIdx >= 0) {
        const dp = deskPositions[agentIdx];
        const shrimpZ = dp.facing === 0 ? dp.pos[2] + 0.3 : dp.pos[2] - 0.3;
        const toX = dp.pos[0] - st.x;
        const toZ = shrimpZ - st.z;
        st.targetAngleAtPause = Math.atan2(toX, toZ);
        st.currentAgentName = agents[agentIdx].name;
      } else {
        // ไม่เจอ agent → ใช้ชื่อแรกที่ใกล้ที่สุด
        st.currentAgentName = agents[st.wpIdx % agents.length]?.name || "";
      }
      st.wpIdx = (st.wpIdx + 1) % waypoints.length;
      // พูดทุก waypoint
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
      {/* 🚩 ธง CEO — ผืนใหญ่โบกสบัด */}
      <group position={[0.3, 0.5, 0.1]}>
        {/* เสาธง */}
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.02, 0.015, 1.2, 6]} /><meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} /></mesh>
        {/* หัวเสาธง — ลูกบอลทอง */}
        <mesh position={[0, 1.12, 0]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#ffd700" emissive="#ffa500" emissiveIntensity={0.5} metalness={0.8} /></mesh>
        {/* ผ้าธง — ผืนใหญ่โบกสบัด */}
        <mesh ref={flagRef} position={[0.2, 0.9, 0]}>
          <planeGeometry args={[0.45, 0.3, 8, 4]} />
          <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.2} side={2} />
        </mesh>
        {/* ข้อความบนธง — CEO เต็มธง 90% */}
        <Html position={[0.22, 0.9, 0.01]} transform distanceFactor={4} style={{ pointerEvents: "none" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#ffd700", textShadow: "0 2px 6px rgba(0,0,0,0.9)", whiteSpace: "nowrap", fontFamily: "Prompt,sans-serif", letterSpacing: 2 }}>
            CEO
          </div>
        </Html>
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
      <Html position={[0, 0, 0.05]} transform distanceFactor={6} style={{ pointerEvents: "none" }}>
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

// ─── Holographic Alert Board 🚨 — Sci-Fi แจ้งเตือนเจ้าของกิจการ ───
interface AlertItem { icon: string; title: string; detail: string; priority: string; time: string; agent: string; }

let holoAlerts: AlertItem[] = [];
let lastAlertFetch = 0;

async function fetchHoloAlerts() {
  if (typeof window === "undefined") return;
  if (Date.now() - lastAlertFetch < 60000 && holoAlerts.length > 0) return;
  try {
    // ดึง advice (critical + warning) + alerts รวมกัน
    const [advRes, alertRes] = await Promise.all([
      fetch("/dashboard/api/advice?type=all&limit=5").then(r => r.json()).catch(() => []),
      fetch("/dashboard/api/alerts?limit=5").then(r => r.json()).catch(() => ({ alerts: [] })),
    ]);

    const items: AlertItem[] = [];

    // จาก advice — เฉพาะ critical + warning
    for (const rec of (Array.isArray(advRes) ? advRes : [])) {
      for (const a of (rec.advice || []).slice(0, 2)) {
        if (a.priority === "critical" || a.priority === "warning" || a.priority === "opportunity") {
          items.push({
            icon: a.icon || "🦐",
            title: a.title || "",
            detail: (a.detail || "").slice(0, 60),
            priority: a.priority,
            time: rec.createdAt ? new Date(rec.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "",
            agent: "น้องกุ้ง",
          });
        }
      }
    }

    // จาก alerts
    for (const al of (alertRes.alerts || [])) {
      items.push({
        icon: al.level === "red" ? "🚨" : "⚠️",
        title: al.customerName || "ลูกค้า",
        detail: (al.message || "").slice(0, 60),
        priority: al.level === "red" ? "critical" : "warning",
        time: al.createdAt ? new Date(al.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "",
        agent: al.type === "human_handoff" ? "ขอคุยคน" : "ตอบช้า",
      });
    }

    if (items.length > 0) {
      holoAlerts = items.slice(0, 8);
      lastAlertFetch = Date.now();
    }
  } catch { /* silent */ }
}

// โหลดทุก 1 นาที
if (typeof window !== "undefined") { fetchHoloAlerts(); setInterval(fetchHoloAlerts, 60000); }

function HoloAlertBoard({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [pulse, setPulse] = useState(0);

  // วนแสดง alert ทุก 6 วิ
  useState(() => {
    const t = setInterval(() => setCurrentIdx(i => holoAlerts.length > 0 ? (i + 1) % holoAlerts.length : 0), 6000);
    return () => clearInterval(t);
  });

  // Holographic pulse animation
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    setPulse(p => p + delta * 2);
    // ลอยขึ้นลงเบาๆ
    groupRef.current.position.y = position[1] + Math.sin(pulse) * 0.05;
  });

  const alert = holoAlerts[currentIdx];
  const hasCritical = holoAlerts.some(a => a.priority === "critical");
  const glowColor = hasCritical ? "#ef4444" : "#22d3ee";
  const bgColor = hasCritical ? "rgba(239,68,68,0.08)" : "rgba(34,211,238,0.08)";
  const borderColor = hasCritical ? "rgba(239,68,68,0.4)" : "rgba(34,211,238,0.4)";

  return (
    <group ref={groupRef} position={position}>
      {/* ฐาน holographic projector */}
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.1, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* แสง project ขึ้น */}
      <pointLight position={[0, 0, 0]} intensity={0.3} color={glowColor} distance={3} />

      {/* Holographic display */}
      <Html center distanceFactor={8}>
        <div style={{
          width: 400, minHeight: 180,
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: 16,
          padding: "16px 20px",
          fontFamily: "Prompt,monospace,sans-serif",
          backdropFilter: "blur(8px)",
          boxShadow: `0 0 30px ${glowColor}40, inset 0 0 20px ${glowColor}10`,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Scan line effect */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)`,
            animation: "scanline 3s linear infinite",
            opacity: 0.6,
          }} />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: glowColor, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
              ⚡ ALERT SYSTEM
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {holoAlerts.length > 0 ? `${currentIdx + 1}/${holoAlerts.length}` : "—"}
            </div>
          </div>

          {alert ? (
            <>
              {/* Alert content */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 32, lineHeight: 1 }}>{alert.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 18, fontWeight: 700,
                    color: alert.priority === "critical" ? "#f87171" : alert.priority === "warning" ? "#fbbf24" : "#4ade80",
                  }}>{alert.title}</div>
                  <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4, lineHeight: 1.5 }}>{alert.detail}</div>
                </div>
              </div>
              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: `1px solid ${borderColor}` }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>🦐 {alert.agent}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>{alert.time}</span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 36 }}>✅</div>
              <div style={{ fontSize: 16, color: "#4ade80", marginTop: 6 }}>ไม่มีเรื่องด่วน</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>น้องกุ้งดูแลอยู่</div>
            </div>
          )}

          {/* Priority bar */}
          {holoAlerts.length > 1 && (
            <div style={{ display: "flex", gap: 3, marginTop: 10, justifyContent: "center" }}>
              {holoAlerts.map((a, i) => (
                <div key={i} style={{
                  width: i === currentIdx ? 18 : 6, height: 4, borderRadius: 3,
                  background: a.priority === "critical" ? "#ef4444" : a.priority === "warning" ? "#f59e0b" : "#22d3ee",
                  opacity: i === currentIdx ? 1 : 0.3,
                  transition: "all 0.3s",
                }} />
              ))}
            </div>
          )}
        </div>

        {/* CSS for scan line */}
        <style>{`@keyframes scanline { 0% { transform: translateY(0); } 100% { transform: translateY(120px); } }`}</style>
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
      <Html position={[0, 0, 0.05]} transform distanceFactor={6} style={{ pointerEvents: "none" }}>
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

      {/* 🚨 Holographic Alert Board — Sci-Fi แจ้งเตือน */}
      <HoloAlertBoard position={[0, 2.5, -6]} />

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
