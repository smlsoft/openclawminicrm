"use client";

import { Canvas, useFrame, ThreeElements } from "@react-three/fiber";
import { OrbitControls, Html, Billboard } from "@react-three/drei";
import { Suspense, useRef, useMemo } from "react";
import * as THREE from "three";

interface Agent {
  id: number;
  name: string;
  role: string;
  emoji: string;
  color: string;
  status: string;
  quote: string;
}

interface Props {
  agents: Agent[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

// ─── Shrimp Character ───
function ShrimpCharacter({ agent, position, onClick, isSelected }: {
  agent: Agent; position: [number, number, number]; onClick: () => void; isSelected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Mesh>(null!);
  const seed = agent.id * 1.7;
  const color = useMemo(() => new THREE.Color(agent.color), [agent.color]);
  const lighterColor = useMemo(() => color.clone().offsetHSL(0, 0, 0.15), [color]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    if (agent.status === "sleeping") {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.5 + seed) * 0.02;
    } else if (agent.status === "excited" || agent.status === "alert") {
      groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 4 + seed)) * 0.12;
    } else if (agent.status === "running") {
      groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 6 + seed)) * 0.08;
    } else {
      groupRef.current.position.y = position[1] + Math.sin(t * 2 + seed) * 0.03;
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.45, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.82, 0.05]} castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.07, 0.87, 0.2]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[-0.07, 0.87, 0.23]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[0.07, 0.87, 0.2]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[0.07, 0.87, 0.23]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
      {/* Claws */}
      <mesh position={[-0.32, 0.4, 0.1]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color={lighterColor} /></mesh>
      <mesh position={[0.32, 0.4, 0.1]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color={lighterColor} /></mesh>
      {/* Tail */}
      <mesh position={[0, 0.25, -0.2]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.1, 0.25, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Antennae */}
      <mesh position={[-0.04, 1.05, 0.12]} rotation={[0.3, 0.3, -0.5]}>
        <cylinderGeometry args={[0.006, 0.004, 0.25, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.04, 1.05, 0.12]} rotation={[0.3, -0.3, 0.5]}>
        <cylinderGeometry args={[0.006, 0.004, 0.25, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Name Tag — HTML overlay */}
      <Html position={[0, 1.3, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div style={{
          background: agent.color,
          color: "white",
          padding: "2px 10px",
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 700,
          whiteSpace: "nowrap",
          fontFamily: "Prompt, sans-serif",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}>
          {agent.emoji} {agent.name}
        </div>
      </Html>

      {/* Selected ring */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.55, 32]} />
          <meshBasicMaterial color={agent.color} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

// ─── Desk ───
function Desk({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {/* Table top */}
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.05, 0.65]} />
        <meshStandardMaterial color="#8B6914" roughness={0.7} />
      </mesh>
      {/* Legs */}
      {[[-0.45, 0.3, -0.25], [0.45, 0.3, -0.25], [-0.45, 0.3, 0.25], [0.45, 0.3, 0.25]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
      {/* Monitor */}
      <mesh position={[0, 0.88, -0.15]} castShadow>
        <boxGeometry args={[0.45, 0.3, 0.02]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* Screen glow */}
      <mesh position={[0, 0.88, -0.135]}>
        <planeGeometry args={[0.4, 0.25]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} toneMapped={false} />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[0, 0.72, -0.15]} castShadow>
        <cylinderGeometry args={[0.015, 0.03, 0.1, 6]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

// ─── Chair ───
function Chair({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[0.35, 0.04, 0.35]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.6, -0.15]} castShadow>
        <boxGeometry args={[0.35, 0.4, 0.03]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.19, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.38, 6]} />
        <meshStandardMaterial color="#555" metalness={0.4} />
      </mesh>
    </group>
  );
}

// ─── Floor ───
function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1a2332" roughness={0.9} />
      </mesh>
      <gridHelper args={[30, 30, "#2a3a4a", "#1e2d3d"]} />
    </group>
  );
}

// ─── Desk Layout ───
function DeskLayout({ agents, selected, onSelect }: Props) {
  const positions = useMemo(() => {
    const result: [number, number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      result.push([Math.cos(angle) * 3.5, 0, Math.sin(angle) * 3.5]);
    }
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      result.push([Math.cos(angle) * 6.5, 0, Math.sin(angle) * 6.5]);
    }
    return result;
  }, []);

  return (
    <group>
      {agents.map((agent, i) => {
        const pos = positions[i] || [0, 0, 0];
        const angle = Math.atan2(pos[2], pos[0]) + Math.PI;
        return (
          <group key={agent.id} rotation={[0, angle, 0]}>
            <Desk position={pos} color={agent.color} />
            <Chair position={[pos[0], 0, pos[2] + 0.55]} color={agent.color} />
            <ShrimpCharacter
              agent={agent}
              position={[pos[0], 0.3, pos[2] + 0.35]}
              onClick={() => onSelect(selected === agent.id ? null : agent.id)}
              isSelected={selected === agent.id}
            />
          </group>
        );
      })}

      {/* Center sign */}
      <Html position={[0, 2.5, 0]} center distanceFactor={12}>
        <div style={{
          textAlign: "center",
          color: "#818cf8",
          fontFamily: "Prompt, sans-serif",
          fontWeight: 700,
          fontSize: 18,
          textShadow: "0 0 20px rgba(129,140,248,0.5)",
          whiteSpace: "nowrap",
        }}>
          🦐 OpenClaw Office<br />
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>น้องกุ้ง 13 ตัว ทำงาน 24/7</span>
        </div>
      </Html>
    </group>
  );
}

// ─── Main Scene ───
export default function OfficeScene({ agents, selected, onSelect }: Props) {
  return (
    <Canvas
      camera={{ position: [10, 7, 10], fov: 50 }}
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
      style={{ background: "linear-gradient(180deg, #0a0e1a 0%, #111827 100%)" }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#818cf8" />
      <pointLight position={[-5, 3, 5]} intensity={0.3} color="#22d3ee" />
      <fog attach="fog" args={["#0a0e1a", 15, 35]} />

      <Suspense fallback={null}>
        <Floor />
        <DeskLayout agents={agents} selected={selected} onSelect={onSelect} />
      </Suspense>

      <OrbitControls
        minDistance={4}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={0.3}
        enableDamping
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </Canvas>
  );
}
