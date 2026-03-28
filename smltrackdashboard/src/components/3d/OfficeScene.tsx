"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Suspense, useRef, useMemo } from "react";
import * as THREE from "three";

interface Agent { id: number; name: string; role: string; emoji: string; color: string; status: string; quote: string; }
interface Props { agents: Agent[]; }

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
      {/* Text label on balloon — ตัวใหญ่ แสดงว่าคิดอะไร ทำอะไร */}
      <Html center distanceFactor={4} style={{ pointerEvents: "none" }}>
        <div style={{
          maxWidth: 200, textAlign: "center", fontFamily: "Prompt,sans-serif",
          color: "#fff", lineHeight: 1.4,
          textShadow: "0 2px 6px rgba(0,0,0,0.7)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{agent.emoji} {agent.name}</div>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.95, marginTop: 2, background: "rgba(0,0,0,0.35)", borderRadius: 8, padding: "3px 8px" }}>{agent.quote}</div>
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

// ─── Office Layout ───
function OfficeLayout({ agents }: Props) {
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

      {/* ป้าย */}
      <Html position={[0, 3.5, -7]} center distanceFactor={15}>
        <div style={{ textAlign: "center", fontFamily: "Prompt,sans-serif" }}>
          <div style={{ color: "#818cf8", fontWeight: 700, fontSize: 20, textShadow: "0 0 20px rgba(129,140,248,0.5)" }}>🦐 OpenClaw Office</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>น้องกุ้ง 13 ตัว ทำงานให้คุณ 24/7</div>
        </div>
      </Html>
    </group>
  );
}

// ─── Main Scene ───
export default function OfficeScene({ agents }: Props) {
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
        <OfficeLayout agents={agents} />
      </Suspense>

      <OrbitControls minDistance={4} maxDistance={22} maxPolarAngle={Math.PI / 2.1} minPolarAngle={0.2} enableDamping dampingFactor={0.05} autoRotate autoRotateSpeed={0.2} />
    </Canvas>
  );
}
