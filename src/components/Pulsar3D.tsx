"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useSyncExternalStore } from "react";
import type { Mesh, Group } from "three";

const REDUCED_MQ = "(prefers-reduced-motion: reduce)";

function subscribePrefersReduced(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(REDUCED_MQ);
  mq.addEventListener?.("change", cb);
  return () => mq.removeEventListener?.("change", cb);
}

function readPrefersReduced() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(REDUCED_MQ).matches;
}

/**
 * Pulsar3D — a stylized neutron star with polar jets and an accretion disk.
 * Pure decorative canvas; pointer-events disabled so it never blocks scroll.
 */
function PulsarCore() {
  const group = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const reduced = useSyncExternalStore(
    subscribePrefersReduced,
    readPrefersReduced,
    () => false
  );

  useFrame((_, delta) => {
    if (reduced) return;
    if (group.current) group.current.rotation.y += delta * 0.25;
    if (core.current) core.current.rotation.z += delta * 0.05;
  });

  return (
    <group ref={group}>
      {/* Neutron-star core */}
      <mesh ref={core}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color="#1a0b2e"
          emissive="#7C3AED"
          emissiveIntensity={0.9}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Outer halo shell */}
      <mesh scale={1.12}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#8B5CF6" transparent opacity={0.18} side={2 /* BackSide */} />
      </mesh>

      {/* Polar jet — top */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.05, 0.18, 5, 24, 1, true]} />
        <meshBasicMaterial color="#22D3EE" transparent opacity={0.45} />
      </mesh>

      {/* Polar jet — bottom */}
      <mesh position={[0, -3, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.18, 5, 24, 1, true]} />
        <meshBasicMaterial color="#22D3EE" transparent opacity={0.45} />
      </mesh>

      {/* Accretion disk — inner violet ring */}
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[1.6, 2.0, 64]} />
        <meshBasicMaterial color="#7C3AED" transparent opacity={0.55} side={2} />
      </mesh>

      {/* Accretion disk — outer cyan ring */}
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[2.05, 2.6, 64]} />
        <meshBasicMaterial color="#22D3EE" transparent opacity={0.35} side={2} />
      </mesh>

      {/* Mid disk fade */}
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[2.0, 2.05, 64]} />
        <meshBasicMaterial color="#C4B5FD" transparent opacity={0.6} side={2} />
      </mesh>
    </group>
  );
}

export function Pulsar3D() {
  const camera = useMemo(() => ({ position: [0, 0, 6] as const, fov: 45 }), []);
  return (
    <Canvas
      camera={camera}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ pointerEvents: "none", width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <pointLight position={[-3, 3, 4]} intensity={2.2} color="#7C3AED" />
        <pointLight position={[3, -2, 3]} intensity={2.0} color="#22D3EE" />
        <PulsarCore />
      </Suspense>
    </Canvas>
  );
}
