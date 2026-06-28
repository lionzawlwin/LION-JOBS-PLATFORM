'use client';

import { useRef, useEffect, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment } from '@react-three/drei';
import * as THREE from 'three';

// ── Camera sits at z=9, fov=50.
// Visible half-width at z=0 ≈ tan(25°)×9 ≈ 4.2 units.
// Text content lives within ±1.8 units of centre.
// All objects sit at |x|>3.5 or |y|>2.5 — safely off the text column.
// ─────────────────────────────────────────────────────────────────────
const GOLD     = '#D4AF37';
const RUBY     = '#9B1C31';
const SAPPHIRE = '#1B3A6B';
const SAP_LT   = '#3B6FC7';

// Shared material factory — emissive guarantees colour even under dim IBL
function mat(color: string, metalness = 0.6, roughness = 0.25, emissiveIntensity = 0.07) {
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

// ── Mouse-reactive parent group ───────────────────────────────────
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
      group.current.rotation.y, mouse.current[0] * 0.18, 0.04,
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x, mouse.current[1] * 0.09, 0.04,
    );
  });

  return (
    <group ref={group}>

      {/* ── LEFT EDGE: golden octahedron — Shwedagon pagoda shape ── */}
      <Float speed={0.9} rotationIntensity={0.35} floatIntensity={0.8}>
        <mesh position={[-5.0, 0.6, -2.5]}>
          <octahedronGeometry args={[0.55, 0]} />
          {mat(GOLD, 0.65, 0.2, 0.12)}
        </mesh>
      </Float>

      {/* ── RIGHT EDGE: ruby torus — halo / ring ──────────────────── */}
      <Float speed={0.75} rotationIntensity={0.45} floatIntensity={0.7}>
        <mesh position={[4.8, -0.3, -2.5]} rotation={[Math.PI / 3, 0.2, 0]}>
          <torusGeometry args={[0.55, 0.14, 16, 48]} />
          {mat(RUBY, 0.65, 0.22, 0.10)}
        </mesh>
      </Float>

      {/* ── TOP RIGHT: sapphire icosahedron — crystalline gem ────── */}
      <Float speed={1.3} rotationIntensity={0.8} floatIntensity={1.1}>
        <mesh position={[2.8, 3.2, -1.5]}>
          <icosahedronGeometry args={[0.28, 0]} />
          {mat(SAPPHIRE, 0.7, 0.18, 0.09)}
        </mesh>
      </Float>

      {/* ── BOTTOM LEFT: small sapphire cube ─────────────────────── */}
      <Float speed={1.0} rotationIntensity={1.1} floatIntensity={0.6}>
        <mesh position={[-4.0, -2.8, -1.0]} rotation={[0.5, 0.4, 0.3]}>
          <boxGeometry args={[0.28, 0.28, 0.28]} />
          {mat(SAP_LT, 0.6, 0.25, 0.08)}
        </mesh>
      </Float>

      {/* ── TOP LEFT: small gold diamond ─────────────────────────── */}
      <Float speed={0.85} rotationIntensity={0.5} floatIntensity={0.9}>
        <mesh position={[-3.2, 2.6, -1.5]}>
          <octahedronGeometry args={[0.2, 0]} />
          {mat(GOLD, 0.5, 0.3, 0.15)}
        </mesh>
      </Float>

      {/* ── BOTTOM RIGHT: ruby tetrahedron ───────────────────────── */}
      <Float speed={1.15} rotationIntensity={0.7} floatIntensity={0.75}>
        <mesh position={[3.8, -2.5, -1.2]}>
          <tetrahedronGeometry args={[0.22, 0]} />
          {mat(RUBY, 0.55, 0.28, 0.12)}
        </mesh>
      </Float>

      {/* ── Micro gold particle spheres (all at screen edges) ─────── */}
      {(
        [
          [-3.8,  1.8, -0.5],
          [ 5.5,  1.2, -3.0],
          [-5.5, -1.5, -3.0],
          [ 2.0,  4.0, -2.0],
          [-1.5, -3.8, -1.5],
          [ 4.5,  3.0, -2.5],
        ] as [number, number, number][]
      ).map(([x, y, z], i) => (
        <Float key={i} speed={0.9 + i * 0.12} floatIntensity={0.35 + i * 0.06} rotationIntensity={0}>
          <mesh position={[x, y, z]}>
            <sphereGeometry args={[0.065 + (i % 3) * 0.025, 8, 8]} />
            <meshStandardMaterial
              color="#F5D76E"
              metalness={0.85}
              roughness={0.1}
              emissive="#F5D76E"
              emissiveIntensity={0.18}
            />
          </mesh>
        </Float>
      ))}

      {/* ── Very faint background wireframe (pure atmosphere) ──────── */}
      <mesh>
        <sphereGeometry args={[6.5, 12, 12]} />
        <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.015} />
      </mesh>

    </group>
  );
}

// Memoised to prevent Canvas remount on parent re-renders
const Hero3D = memo(function Hero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 50 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.5]}
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {/*
        Environment provides Image-Based Lighting (IBL) — this is what makes
        metallic and semi-metallic materials reflect realistic colour.
        Without it, high-metalness objects look pitch-black in a dark scene.
        "sunset" gives warm golden tones that match the Myanmar palette.
      */}
      <Environment preset="sunset" />

      {/* Additional scene lights for directional colour accents */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 4]}  intensity={1.8} color="#FFF3B0" />
      <pointLight       position={[-5, 3, 2]}  intensity={2.0} color="#D4AF37" />
      <pointLight       position={[5, -3, 1]}  intensity={1.2} color="#3B6FC7" />

      <Scene />
    </Canvas>
  );
});

export default Hero3D;
