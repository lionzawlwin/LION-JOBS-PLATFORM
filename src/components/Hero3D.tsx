'use client';

import { useRef, useEffect, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// ── Myanmar brand palette ─────────────────────────────────────────
const GOLD        = '#D4AF37';
const GOLD_BRIGHT = '#F5D76E';
const RUBY        = '#9B1C31';
const SAPPHIRE    = '#1B3A6B';
const SAPPHIRE_LT = '#2E5EAA';

// ── Mouse-reactive scene ──────────────────────────────────────────
function Scene() {
  const groupRef = useRef<THREE.Group>(null!);
  const mouse    = useRef<[number, number]>([0, 0]);

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
    if (!groupRef.current) return;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y, mouse.current[0] * 0.22, 0.035,
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x, mouse.current[1] * 0.10, 0.035,
    );
  });

  return (
    <group ref={groupRef}>
      {/* ── Large golden octahedron — Shwedagon pagoda geometry ── */}
      <Float speed={0.9} rotationIntensity={0.3} floatIntensity={0.9}>
        <mesh position={[-2.8, 0.2, 0]}>
          <octahedronGeometry args={[1.6, 0]} />
          <meshStandardMaterial color={GOLD} metalness={0.95} roughness={0.06} />
        </mesh>
      </Float>

      {/* ── Ruby torus — halo / ring ─────────────────────────────── */}
      <Float speed={0.7} rotationIntensity={0.5} floatIntensity={0.6}>
        <mesh position={[3.0, 0.4, -1.2]} rotation={[Math.PI / 3, 0.2, 0]}>
          <torusGeometry args={[1.1, 0.28, 16, 48]} />
          <meshStandardMaterial color={RUBY} metalness={0.75} roughness={0.18} />
        </mesh>
      </Float>

      {/* ── Sapphire icosahedron — crystalline gem ───────────────── */}
      <Float speed={1.4} rotationIntensity={0.9} floatIntensity={1.2}>
        <mesh position={[0.8, 2.4, -0.5]}>
          <icosahedronGeometry args={[0.75, 0]} />
          <meshStandardMaterial color={SAPPHIRE} metalness={0.85} roughness={0.08} />
        </mesh>
      </Float>

      {/* ── Small sapphire cube ─────────────────────────────────── */}
      <Float speed={1.1} rotationIntensity={1.2} floatIntensity={0.7}>
        <mesh position={[4.5, -1.5, 0]} rotation={[0.4, 0.4, 0.4]}>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <meshStandardMaterial color={SAPPHIRE_LT} metalness={0.8} roughness={0.15} />
        </mesh>
      </Float>

      {/* ── Gold particle spheres ───────────────────────────────── */}
      {(
        [
          [-1.5,  3.0,  0.5],
          [ 4.0,  1.5, -0.5],
          [-4.0, -0.8,  0.3],
          [ 1.8, -2.8,  0.8],
          [ 5.0,  0.0, -1.0],
          [-3.5,  2.5, -0.5],
        ] as [number, number, number][]
      ).map(([x, y, z], i) => (
        <Float key={i} speed={1.0 + i * 0.15} rotationIntensity={0} floatIntensity={0.4 + i * 0.08}>
          <mesh position={[x, y, z]}>
            <sphereGeometry args={[0.11 + (i % 3) * 0.04, 8, 8]} />
            <meshStandardMaterial color={GOLD_BRIGHT} metalness={1} roughness={0} />
          </mesh>
        </Float>
      ))}

      {/* ── Background wireframe sphere ─────────────────────────── */}
      <mesh>
        <sphereGeometry args={[5.5, 14, 14]} />
        <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.022} />
      </mesh>
    </group>
  );
}

// Memoised so dynamic() re-renders don't cause unnecessary Canvas remounts
const Hero3D = memo(function Hero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 50 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.5]}
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {/* Warm gold key light  */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 5]}  intensity={2.0} color="#FFF5C0" />
      {/* Cool sapphire fill */}
      <pointLight       position={[-4, -3, -2]} intensity={1.5} color={SAPPHIRE} />
      {/* Warm ruby rim */}
      <pointLight       position={[4, 4, 2]}    intensity={0.7} color={RUBY} />
      <Scene />
    </Canvas>
  );
});

export default Hero3D;
