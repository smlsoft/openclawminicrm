"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Billboard, RoundedBox } from "@react-three/drei";
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

// ─── Shrimp Character (กุ้งน่ารัก) ───
function ShrimpCharacter({ agent, position, onClick, isSelected }: {
  agent: Agent; position: [number, number, number]; onClick: () => void; isSelected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Mesh>(null!);
  const seed = agent.id * 1.7;

  // Animation based on status
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Bobbing
    if (agent.status === "sleeping") {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.5 + seed) * 0.02;
      if (bodyRef.current) bodyRef.current.rotation.z = Math.sin(t * 0.3 + seed) * 0.1;
    } else if (agent.status === "excited" || agent.status === "alert") {
      groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 4 + seed)) * 0.15;
    } else if (agent.status === "running") {
      groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 6 + seed)) * 0.1;
      if (bodyRef.current) bodyRef.current.rotation.y = Math.sin(t * 3 + seed) * 0.3;
    } else if (agent.status === "thinking") {
      groupRef.current.position.y = position[1] + Math.sin(t * 1.5 + seed) * 0.05;
      if (bodyRef.current) bodyRef.current.rotation.z = Math.sin(t * 0.8 + seed) * 0.08;
    } else {
      // working / default — gentle bob
      groupRef.current.position.y = position[1] + Math.sin(t * 2 + seed) * 0.03;
    }

    // Selected glow pulse
    if (isSelected && bodyRef.current) {
      const scale = 1 + Math.sin(t * 3) * 0.05;
      bodyRef.current.scale.setScalar(scale);
    }
  });

  const color = new THREE.Color(agent.color);

  return (
    <group ref={groupRef} position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* ─── Body (ลำตัวกุ้ง — ทรงรี) ─── */}
      <mesh ref={bodyRef} position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Head (หัว — กลมใหญ่กว่า) */}
      <mesh position={[0, 0.95, 0.05]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Eyes — ตาซ้าย */}
      <mesh position={[-0.08, 1.0, 0.22]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-0.08, 1.0, 0.26]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Eyes — ตาขวา */}
      <mesh position={[0.08, 1.0, 0.22]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.08, 1.0, 0.26]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Smile */}
      {agent.status !== "sleeping" && agent.status !== "sad" && (
        <mesh position={[0, 0.9, 0.24]} rotation={[0.1, 0, 0]}>
          <torusGeometry args={[0.06, 0.015, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
      )}

      {/* Claws — ก้ามซ้าย */}
      <mesh position={[-0.35, 0.5, 0.15]} rotation={[0, 0, 0.5]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={color.clone().offsetHSL(0, 0, 0.1)} roughness={0.4} />
      </mesh>

      {/* Claws — ก้ามขวา */}
      <mesh position={[0.35, 0.5, 0.15]} rotation={[0, 0, -0.5]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={color.clone().offsetHSL(0, 0, 0.1)} roughness={0.4} />
      </mesh>

      {/* Tail — หาง */}
      <mesh position={[0, 0.35, -0.25]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.12, 0.3, 8]} />
        <meshStandardMaterial color={color.clone().offsetHSL(0, 0, -0.05)} roughness={0.4} />
      </mesh>

      {/* Antennae — หนวด */}
      <mesh position={[-0.05, 1.2, 0.15]} rotation={[0.3, 0.3, -0.5]}>
        <cylinderGeometry args={[0.008, 0.005, 0.3, 4]} />
        <meshStandardMaterial color={color.clone().offsetHSL(0, 0, -0.1)} />
      </mesh>
      <mesh position={[0.05, 1.2, 0.15]} rotation={[0.3, -0.3, 0.5]}>
        <cylinderGeometry args={[0.008, 0.005, 0.3, 4]} />
        <meshStandardMaterial color={color.clone().offsetHSL(0, 0, -0.1)} />
      </mesh>

      {/* ─── Name Tag (ชื่อลอยบนหัว) ─── */}
      <Billboard position={[0, 1.6, 0]}>
        {/* Background */}
        <mesh>
          <planeGeometry args={[1.2, 0.35]} />
          <meshBasicMaterial color={agent.color} transparent opacity={0.85} toneMapped={false} />
        </mesh>
        <Text
          position={[0, 0.02, 0.01]}
          fontSize={0.14}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="/dashboard/fonts/Prompt-Bold.woff"
        >
          {agent.name}
        </Text>
      </Billboard>

      {/* Status emoji floating */}
      <Billboard position={[0.4, 1.4, 0]}>
        <Text fontSize={0.2} anchorX="center" anchorY="middle">
          {agent.status === "sleeping" ? "💤" : agent.status === "excited" ? "✨" : agent.status === "thinking" ? "💭" : agent.status === "worried" ? "😟" : agent.status === "sad" ? "🥺" : agent.status === "running" ? "🏃" : agent.status === "alert" ? "⏰" : "💪"}
        </Text>
      </Billboard>

      {/* Selected ring */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color={agent.color} transparent opacity={0.6} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

// ─── Desk (โต๊ะทำงาน) ───
function Desk({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {/* Table top */}
      <RoundedBox args={[1.2, 0.06, 0.7]} radius={0.02} position={[0, 0.65, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#8B6914" roughness={0.7} />
      </RoundedBox>
      {/* Legs */}
      {[[-0.5, 0.325, -0.28], [0.5, 0.325, -0.28], [-0.5, 0.325, 0.28], [0.5, 0.325, 0.28]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.65, 8]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
      {/* Monitor */}
      <RoundedBox args={[0.5, 0.35, 0.03]} radius={0.01} position={[0, 0.98, -0.15]} castShadow>
        <meshStandardMaterial color="#222" roughness={0.3} />
      </RoundedBox>
      {/* Screen glow */}
      <mesh position={[0, 0.98, -0.13]}>
        <planeGeometry args={[0.44, 0.29]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} toneMapped={false} />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[0, 0.78, -0.15]} castShadow>
        <cylinderGeometry args={[0.02, 0.04, 0.12, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Keyboard */}
      <RoundedBox args={[0.35, 0.02, 0.12]} radius={0.005} position={[0, 0.69, 0.1]}>
        <meshStandardMaterial color="#444" roughness={0.5} />
      </RoundedBox>
    </group>
  );
}

// ─── Chair (เก้าอี้) ───
function Chair({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {/* Seat */}
      <RoundedBox args={[0.4, 0.05, 0.4]} radius={0.02} position={[0, 0.4, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.6} />
      </RoundedBox>
      {/* Back */}
      <RoundedBox args={[0.4, 0.45, 0.04]} radius={0.02} position={[0, 0.65, -0.18]} castShadow>
        <meshStandardMaterial color={color} roughness={0.6} />
      </RoundedBox>
      {/* Leg (center pillar) */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
        <meshStandardMaterial color="#555" metalness={0.5} />
      </mesh>
      {/* Base */}
      {[0, 1.25, 2.5, 3.75, 5].map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 0.15, 0.02, Math.sin(angle) * 0.15]} castShadow>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      ))}
    </group>
  );
}

// ─── Floor (พื้น — grid สวย) ───
function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1a2332" roughness={0.9} />
      </mesh>
      <gridHelper args={[30, 30, "#2a3a4a", "#1e2d3d"]} position={[0, 0, 0]} />
    </group>
  );
}

// ─── Desk Layout (วงกลม 13 ตัว) ───
function DeskLayout({ agents, selected, onSelect }: Props) {
  const positions = useMemo(() => {
    const result: [number, number, number][] = [];
    // Inner ring (6 agents)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      result.push([Math.cos(angle) * 4, 0, Math.sin(angle) * 4]);
    }
    // Outer ring (7 agents)
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      result.push([Math.cos(angle) * 7, 0, Math.sin(angle) * 7]);
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
            <Chair position={[pos[0], 0, pos[2] + 0.6]} color={agent.color} />
            <ShrimpCharacter
              agent={agent}
              position={[pos[0], 0.35, pos[2] + 0.4]}
              onClick={() => onSelect(selected === agent.id ? null : agent.id)}
              isSelected={selected === agent.id}
            />
          </group>
        );
      })}

      {/* Center decoration — ป้าย OpenClaw */}
      <Billboard position={[0, 3, 0]}>
        <Text fontSize={0.5} color="#818cf8" anchorX="center" anchorY="middle" font="/dashboard/fonts/Prompt-Bold.woff">
          🦐 OpenClaw Office
        </Text>
        <Text position={[0, -0.4, 0]} fontSize={0.18} color="#64748b" anchorX="center" anchorY="middle">
          น้องกุ้ง 13 ตัว ทำงาน 24/7
        </Text>
      </Billboard>
    </group>
  );
}

// ─── Main Scene ───
export default function OfficeScene({ agents, selected, onSelect }: Props) {
  return (
    <Canvas
      camera={{ position: [12, 8, 12], fov: 45 }}
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
      style={{ background: "linear-gradient(180deg, #0a0e1a 0%, #111827 100%)" }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#818cf8" />
      <pointLight position={[-5, 3, 5]} intensity={0.3} color="#22d3ee" />
      <pointLight position={[5, 3, -5]} intensity={0.3} color="#f472b6" />

      {/* Fog for depth */}
      <fog attach="fog" args={["#0a0e1a", 15, 35]} />

      <Suspense fallback={null}>
        <Floor />
        <DeskLayout agents={agents} selected={selected} onSelect={onSelect} />
      </Suspense>

      <OrbitControls
        minDistance={5}
        maxDistance={25}
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
