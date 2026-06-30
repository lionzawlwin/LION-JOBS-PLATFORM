'use client';

import { useRef, useEffect, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// Camera at z=9, fov=50 → visible half-width at z=0 ≈ 4.2 units.
// All objects sit at |x|>3.5 or |y|>2.5 — safely outside the hero text column.

const GOLD     = '#D4AF37';
const SAPPHIRE = '#1B3A6B';
const SAP_LT   = '#3B6FC7';
const CREAM    = '#F8F4ED';

function mat(color: string, metalness = 0.52, roughness = 0.28, emissiveIntensity = 0.07) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={metalness}
      roughness={roughness}
      emissive={color}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

/** Gold briefcase — body + handle + clasp */
function Briefcase({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0.1, 0.32, -0.06]}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.84, 0.58, 0.3]} />
        {mat(GOLD, 0.62, 0.2, 0.12)}
      </mesh>
      {/* Handle */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[0.28, 0.1, 0.07]} />
        {mat(GOLD, 0.7, 0.15, 0.14)}
      </mesh>
      {/* Horizontal strap / divider line */}
      <mesh position={[0, 0.01, 0.152]}>
        <boxGeometry args={[0.84, 0.045, 0.008]} />
        {mat(SAPPHIRE, 0.8, 0.1, 0.16)}
      </mesh>
      {/* Centre clasp */}
      <mesh position={[0, 0.04, 0.155]}>
        <boxGeometry args={[0.09, 0.07, 0.01]} />
        {mat(SAP_LT, 0.88, 0.08, 0.22)}
      </mesh>
    </group>
  );
}

/** Floating CV / resume document */
function Resume({ position, rotation }: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation ?? [0.05, -0.22, 0.06]}>
      {/* Paper body */}
      <mesh>
        <boxGeometry args={[0.52, 0.68, 0.022]} />
        <meshStandardMaterial color={CREAM} metalness={0.0} roughness={0.88} />
      </mesh>
      {/* Name / title header block */}
      <mesh position={[0, 0.24, 0.014]}>
        <boxGeometry args={[0.36, 0.068, 0.006]} />
        {mat(SAPPHIRE, 0.2, 0.5, 0.06)}
      </mesh>
      {/* Thin divider */}
      <mesh position={[0, 0.145, 0.014]}>
        <boxGeometry args={[0.38, 0.007, 0.003]} />
        {mat(SAP_LT, 0.1, 0.6, 0.04)}
      </mesh>
      {/* Body text lines */}
      {([0, -0.07, -0.14, -0.21, -0.28] as number[]).map((y, i) => (
        <mesh key={i} position={[i % 2 === 0 ? -0.02 : 0.02, y, 0.014]}>
          <boxGeometry args={[i % 3 === 2 ? 0.27 : 0.34, 0.017, 0.003]} />
          {mat(SAP_LT, 0.05, 0.7, 0.012)}
        </mesh>
      ))}
    </group>
  );
}

/** Magnifying glass — circle (torus) + handle = job search */
function SearchIcon({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0.1, 0.18, -(Math.PI / 4) - 0.08]}>
      {/* Ring */}
      <mesh>
        <torusGeometry args={[0.26, 0.054, 16, 36]} />
        {mat(SAP_LT, 0.62, 0.22, 0.13)}
      </mesh>
      {/* Handle */}
      <mesh position={[0.22, -0.22, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.34, 8]} />
        {mat(SAP_LT, 0.62, 0.22, 0.11)}
      </mesh>
    </group>
  );
}

/** Small floating briefcase (accent piece, bottom-left) */
function MiniBriefcase({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0.08, -0.28, 0.14]}>
      <mesh>
        <boxGeometry args={[0.38, 0.26, 0.14]} />
        {mat(GOLD, 0.55, 0.25, 0.1)}
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.13, 0.05, 0.06]} />
        {mat(GOLD, 0.65, 0.18, 0.12)}
      </mesh>
    </group>
  );
}

/** Small floating document fragment (bottom-right accent) */
function MiniDoc({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0.1, 0.4, -0.1]}>
      <mesh>
        <boxGeometry args={[0.3, 0.4, 0.014]} />
        <meshStandardMaterial color={CREAM} metalness={0} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.1, 0.009]}>
        <boxGeometry args={[0.2, 0.04, 0.004]} />
        {mat(SAPPHIRE, 0.18, 0.6, 0.05)}
      </mesh>
    </group>
  );
}

/** Mouse-reactive parent group */
function Scene() {
  const group = useRef<THREE.Group>(null!);
  const mouse = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current = [
        (e.clientX / window.innerWidth  - 0.5) * 2,
        -(e.clientY / window.innerHeight - 0.5) * 2,
      ];
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y, mouse.current[0] * 0.14, 0.04,
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x, mouse.current[1] * 0.07, 0.04,
    );
  });

  return (
    <group ref={group}>

      {/* LEFT EDGE: gold briefcase — primary symbol of employment */}
      <Float speed={0.8} rotationIntensity={0.22} floatIntensity={0.72}>
        <Briefcase position={[-4.7, 0.3, -2.2]} />
      </Float>

      {/* RIGHT EDGE: floating resume / CV */}
      <Float speed={0.95} rotationIntensity={0.28} floatIntensity={0.78}>
        <Resume position={[4.6, 0.1, -2.2]} />
      </Float>

      {/* TOP RIGHT: magnifying glass — job search */}
      <Float speed={1.2} rotationIntensity={0.48} floatIntensity={1.0}>
        <SearchIcon position={[2.8, 3.1, -1.8]} />
      </Float>

      {/* BOTTOM LEFT: small briefcase accent */}
      <Float speed={0.72} rotationIntensity={0.38} floatIntensity={0.6}>
        <MiniBriefcase position={[-3.8, -2.7, -1.6]} />
      </Float>

      {/* BOTTOM RIGHT: small doc fragment */}
      <Float speed={1.05} rotationIntensity={0.55} floatIntensity={0.82}>
        <MiniDoc position={[3.9, -2.9, -1.9]} />
      </Float>

      {/* TOP LEFT: small search accent */}
      <Float speed={0.88} rotationIntensity={0.6} floatIntensity={0.9}>
        <group position={[-3.0, 3.0, -2.0]} rotation={[0, 0.2, Math.PI / 4]}>
          <mesh>
            <torusGeometry args={[0.18, 0.038, 12, 28]} />
            {mat(SAP_LT, 0.6, 0.24, 0.12)}
          </mesh>
          <mesh position={[0.15, -0.15, 0]}>
            <cylinderGeometry args={[0.026, 0.026, 0.22, 7]} />
            {mat(SAP_LT, 0.6, 0.24, 0.10)}
          </mesh>
        </group>
      </Float>

      {/* Micro gold spheres — scattered "talent pool" dots */}
      {(
        [
          [-5.3,  1.6, -3.2],
          [ 5.9,  1.9, -3.4],
          [-5.0, -1.3, -2.8],
          [ 1.6,  4.3, -2.6],
          [-1.9, -3.6, -2.1],
          [ 5.3, -1.1, -3.1],
          [-2.4,  3.6, -2.9],
          [ 4.2,  2.8, -2.6],
        ] as [number, number, number][]
      ).map(([x, y, z], i) => (
        <Float key={i} speed={0.7 + i * 0.11} floatIntensity={0.28} rotationIntensity={0}>
          <mesh position={[x, y, z]}>
            <sphereGeometry args={[0.048 + (i % 3) * 0.016, 8, 8]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? GOLD : SAP_LT}
              metalness={0.82}
              roughness={0.1}
              emissive={i % 3 === 0 ? GOLD : SAP_LT}
              emissiveIntensity={0.16}
            />
          </mesh>
        </Float>
      ))}

    </group>
  );
}

const Hero3D = memo(function Hero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 50 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.5]}
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {/* Hemisphere light simulates sky/ground IBL for metallic PBR — no CDN fetch */}
      <hemisphereLight args={['#FFF3B0', '#1B3A6B', 1.1]} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 4]}  intensity={2.0} color="#FFF3B0" />
      <pointLight       position={[-5, 3, 2]}  intensity={2.2} color="#D4AF37" />
      <pointLight       position={[5, -3, 1]}  intensity={1.4} color="#3B6FC7" />

      <Scene />
    </Canvas>
  );
});

export default Hero3D;
