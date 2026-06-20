"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Suspense, useMemo, useRef, useSyncExternalStore, useState, useEffect } from "react";
import type { Mesh, Group, Points } from "three";
import * as THREE from "three";

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

function useThemeColor() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const update = () => setLight(document.documentElement.classList.contains("light"));
    update();
    window.addEventListener("theme-change", update);
    return () => window.removeEventListener("theme-change", update);
  }, []);
  return light;
}

/**
 * Particle field — 500 points drifting around the star, attracted to its poles.
 */
function ParticleField({ reduced }: { reduced: boolean }) {
  const points = useRef<Points>(null);
  const { positions, colors } = useMemo(() => {
    const count = 500;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribute in a sphere shell around the star.
      const r = 2.5 + Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      // Mix violet and cyan.
      const mix = Math.random();
      col[i * 3] = mix * 0.48 + (1 - mix) * 0.13;     // R: violet 0.48, cyan 0.13
      col[i * 3 + 1] = mix * 0.23 + (1 - mix) * 0.83; // G: violet 0.23, cyan 0.83
      col[i * 3 + 2] = mix * 0.93 + (1 - mix) * 0.93; // B: both ~0.93
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame((state, delta) => {
    if (reduced || !points.current) return;
    points.current.rotation.y += delta * 0.05;
    points.current.rotation.x += delta * 0.02;
    // Subtle drift toward poles.
    const geom = points.current.geometry as THREE.BufferGeometry;
    const arr = geom.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < arr.length; i += 3) {
      const pulse = Math.sin(t + i * 0.01) * 0.002;
      arr[i + 1] += pulse;
    }
    geom.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/**
 * Volumetric polar jet — cone with gradient material.
 */
function VolumetricJet({ position, flip = false, reduced }: { position: [number, number, number]; flip?: boolean; reduced: boolean }) {
  const mesh = useRef<Mesh>(null);
  useFrame((state) => {
    if (reduced || !mesh.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 2) * 0.15;
    mesh.current.scale.y = pulse;
  });

  return (
    <mesh ref={mesh} position={position} rotation={[flip ? Math.PI : 0, 0, 0]}>
      <coneGeometry args={[0.35, 4, 32, 1, true]} />
      <meshBasicMaterial
        color="#22D3EE"
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Auto-rotating torus rings around the star.
 */
function RingSystem({ reduced }: { reduced: boolean }) {
  const r1 = useRef<Mesh>(null);
  const r2 = useRef<Mesh>(null);
  const r3 = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (reduced) return;
    if (r1.current) r1.current.rotation.z += delta * 0.4;
    if (r2.current) r2.current.rotation.z -= delta * 0.3;
    if (r3.current) r3.current.rotation.z += delta * 0.5;
  });

  return (
    <group>
      <mesh ref={r1} rotation={[Math.PI / 2.5, 0.2, 0]}>
        <torusGeometry args={[3.0, 0.015, 8, 100]} />
        <meshBasicMaterial color="#7C3AED" transparent opacity={0.5} />
      </mesh>
      <mesh ref={r2} rotation={[Math.PI / 2.2, -0.3, 0.4]}>
        <torusGeometry args={[3.3, 0.012, 8, 100]} />
        <meshBasicMaterial color="#22D3EE" transparent opacity={0.4} />
      </mesh>
      <mesh ref={r3} rotation={[Math.PI / 3, 0.6, -0.2]}>
        <torusGeometry args={[3.6, 0.01, 8, 100]} />
        <meshBasicMaterial color="#C4B5FD" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/**
 * Mouse parallax — the whole scene subtly tilts toward the mouse.
 */
function MouseParallax({ children }: { children: React.ReactNode }) {
  const group = useRef<Group>(null);
  const target = useRef({ x: 0, y: 0 });

  useFrame(() => {
    if (!group.current) return;
    // Lerp current rotation toward target.
    group.current.rotation.x += (target.current.y - group.current.rotation.x) * 0.05;
    group.current.rotation.y += (target.current.x - group.current.rotation.y) * 0.05;
  });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 0.4;
      const ny = (e.clientY / window.innerHeight - 0.5) * 0.25;
      target.current.x = nx;
      target.current.y = ny;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return <group ref={group}>{children}</group>;
}

/**
 * PulsarCore — the central star with halo, jets, rings, particles.
 */
function PulsarCore() {
  const group = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const reduced = useSyncExternalStore(subscribePrefersReduced, readPrefersReduced, () => false);
  const light = useThemeColor();

  useFrame((_, delta) => {
    if (reduced) return;
    if (group.current) group.current.rotation.y += delta * 0.25;
    if (core.current) core.current.rotation.z += delta * 0.05;
  });

  return (
    <MouseParallax>
      {/* Neutron-star core */}
      <mesh ref={core}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color={light ? "#2D1B4E" : "#1a0b2e"}
          emissive="#7C3AED"
          emissiveIntensity={light ? 1.4 : 0.9}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Outer halo shell */}
      <mesh scale={1.12}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#8B5CF6" transparent opacity={light ? 0.12 : 0.18} side={THREE.BackSide} />
      </mesh>

      {/* Volumetric polar jets */}
      <VolumetricJet position={[0, 2, 0]} reduced={reduced} />
      <VolumetricJet position={[0, -2, 0]} flip reduced={reduced} />

      {/* Accretion disk — inner violet ring */}
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[1.6, 2.0, 64]} />
        <meshBasicMaterial color="#7C3AED" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>

      {/* Accretion disk — outer cyan ring */}
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[2.05, 2.6, 64]} />
        <meshBasicMaterial color="#22D3EE" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* Mid disk fade */}
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[2.0, 2.05, 64]} />
        <meshBasicMaterial color="#C4B5FD" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Auto-rotating torus rings */}
      <RingSystem reduced={reduced} />

      {/* Particle field */}
      <ParticleField reduced={reduced} />

      {/* Subtle group rotation handled by parent useFrame */}
      <group ref={group} />
    </MouseParallax>
  );
}

export function Pulsar3D() {
  const camera = useMemo(() => ({ position: [0, 0, 6] as const, fov: 45 }), []);
  return (
    <Canvas
      camera={camera}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none", width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <pointLight position={[-3, 3, 4]} intensity={2.2} color="#7C3AED" />
        <pointLight position={[3, -2, 3]} intensity={2.0} color="#22D3EE" />
        <PulsarCore />
        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.4}
            luminanceSmoothing={0.6}
            radius={0.7}
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
