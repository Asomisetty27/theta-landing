import * as React from 'react';
import { useRef, useMemo, useEffect, useState, Suspense, createContext, useContext } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Environment, Html, ContactShadows, MeshReflectorMaterial, Lightformer } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  Vignette,
  DepthOfField,
  N8AO,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { createNoise3D } from 'simplex-noise';
import { useGpuTextures, type GpuTextures } from './gpuTextures';

// PBR maps from gpuTextures.ts — loaded once inside Suspense and threaded via
// context so individual layer components can opt in without prop churn.
const GpuMapsCtx = createContext<GpuTextures | null>(null);
function GpuMapsProvider({ children }: { children: React.ReactNode }) {
  const maps = useGpuTextures();
  return <GpuMapsCtx.Provider value={maps}>{children}</GpuMapsCtx.Provider>;
}
function useGpuMaps(): GpuTextures | null {
  return useContext(GpuMapsCtx);
}

RectAreaLightUniformsLib.init();

// Offline-capture mode (?capture=1) — unlocks render settings far too slow
// for realtime, used by scripts/og/capture-hero.mjs to record the scene
// frame-by-frame into a video. Never set for real visitors.
const CAPTURE = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('capture');

const T = {
  bg: '#06060A',
  s1: '#111117',
  border: '#232330',
  text: '#ECE6D8',
  muted: '#9A9285',
  healthy: '#D4AF37',
  caution: '#C8942A',
  rising: '#C85F2A',
  critical: '#B83030',
  bp: '#C9A84C',
};
const FM = "'JetBrains Mono', ui-monospace, monospace";

// Physically-grounded thermal sim — shared with DataCenterScene/TowerUnit.
// Replaces this scene's old level-lerp driver and its `0.22 + level * 0.41`
// R_θ readout, which was (a) ~6× too large for a liquid-cooled H100 and
// (b) rising with load — the exact opposite of what Theta detects.
import {
  ThermalSim,
  H100_SXM,
  phaseAt as modelPhaseAt,
  thermalRgb,
  heroTelem as _heroTelem,
  heroFanDuty as _heroFanDuty,
  type Phase as ModelPhase,
} from './thermalModel';
// HUD lives in the (three-free) video hero module; this scene reuses it so
// the live-GL fallback and the video version show the identical readout.
import { PhaseHUD, LineupLabel } from './GPUHeroVideo';

type Phase = ModelPhase;
type AnimStage = 'exploded' | 'assembling' | 'assembled' | 'disassembling';
type CoolerStyle = 'blower' | 'triple-fan' | 'cold-plate' | 'passive-fin';
type DieLayout = 'monolithic' | 'dual-die' | 'chiplet-grid';
type StackProfile = 'card' | 'module';

interface GPUSpec {
  id: string;
  name: string;
  arch: string;
  mem: string;
  vendor: string;
  accent: string;
  cooler: CoolerStyle;
  dieLayout: DieLayout;
  memCount: number;
  width: number;
  depth: number;
}

// ──────────────────────────────────────────────────────────────────────────
// The lineup — five silicon archetypes that define the current AI-data-center
// hardware landscape. Two PCIe-card silhouettes (blower / triple-fan) and
// three flat OAM/SXM module silhouettes (cold-plate, no fans) — chosen so
// every card on the runway reads as a genuinely different machine, not five
// re-skins of the same box.
// ──────────────────────────────────────────────────────────────────────────

// Dimensions corrected against verified specs (see .agents/research/*-spec.md):
//   - A100 PCIe blower: ~10.5" FHFL, narrow aspect
//   - L40S: FHFL passive, 267×111mm, ~2.4:1 aspect → wider/flatter
//   - H100 SXM5: SXM5 module with VRM wings, ~200×100mm
//   - B200 SXM6: ~10-15% larger than SXM5
//   - MI300X OAM: 228×107mm, very rectangular (2.13:1)
const GPU_SPECS: GPUSpec[] = [
  // Dimensions tuned to match the real product footprint AND the exact pixel
  // aspect of each photoreal skin texture so the printed lid covers the full
  // top face with zero blank shroud showing.
  { id: 'a100',   name: 'A100 PCIe', arch: 'AMPERE · GA100',    mem: '80GB HBM2e',  vendor: 'NVIDIA', accent: '#76b900', cooler: 'blower',     dieLayout: 'monolithic',   memCount: 6, width: 8.40, depth: 3.92 }, // PCIe 2-slot, ~2.14:1
  { id: 'l40s',   name: 'L40S',      arch: 'ADA LOVELACE',      mem: '48GB GDDR6',  vendor: 'NVIDIA', accent: '#76b900', cooler: 'passive-fin', dieLayout: 'monolithic',   memCount: 8, width: 9.60, depth: 3.20 }, // long single-slot, 3:1
  { id: 'h100',   name: 'H100 SXM5', arch: 'HOPPER · GH100',    mem: '80GB HBM3',   vendor: 'NVIDIA', accent: '#76b900', cooler: 'cold-plate', dieLayout: 'monolithic',   memCount: 6, width: 6.00, depth: 4.00 }, // SXM5 module, 3:2
  { id: 'b200',   name: 'B200 SXM6', arch: 'BLACKWELL · GB100', mem: '192GB HBM3e', vendor: 'NVIDIA', accent: '#76b900', cooler: 'cold-plate', dieLayout: 'dual-die',     memCount: 8, width: 6.40, depth: 6.40 }, // SXM6 dual-die, 1:1
  { id: 'mi300x', name: 'MI300X',    arch: 'CDNA 3 · CHIPLET',  mem: '192GB HBM3',  vendor: 'AMD',    accent: '#ed1c24', cooler: 'cold-plate', dieLayout: 'chiplet-grid', memCount: 8, width: 7.50, depth: 4.00 }, // OAM module, 1.875:1
];

const HERO_INDEX = 2; // H100 SXM5 — the thermal-arc protagonist; Theta's primary subject
const CARD_SPACING = 9.6;
const LINEUP_X0 = -((GPU_SPECS.length - 1) * CARD_SPACING) / 2;
const cardX = (i: number) => LINEUP_X0 + i * CARD_SPACING;

function stackProfileFor(spec: GPUSpec): StackProfile {
  return spec.cooler === 'cold-plate' ? 'module' : 'card';
}

// Per-archetype layer separation. Cards (with fan shrouds) explode into a tall
// stack; flat modules (liquid-cooled, no shroud) separate into a much shorter,
// denser sandwich — the difference IS the story (one needs to move air, one doesn't).
const LAYER_OFFSETS: Record<StackProfile, { exploded: number[]; assembled: number[] }> = {
  card:   { exploded: [-4.3, -2.05, 0.35, 4.1],   assembled: [-1.27, -0.97, -0.61, 0.56] },
  module: { exploded: [-2.75, -1.25, 0.25, 1.65], assembled: [-0.46, -0.30, -0.15, 0.07] },
};

// Cinematic reveal cycle — each card runs the same explode → hold → assemble →
// hold loop, phase-offset by index so the runway is always mid-motion somewhere
// (a living showroom, not five synchronized robots).
const CYCLE = { explodedHold: 2.6, assembling: 2.4, assembledHold: 5.8, disassembling: 1.8 };
const CYCLE_LEN = CYCLE.explodedHold + CYCLE.assembling + CYCLE.assembledHold + CYCLE.disassembling;
// Phase cards so only one is mid-transition at a time — the eye lands on a
// single moving card while the rest are held in their pose.
const STAGGER = (CYCLE.assembling + CYCLE.disassembling + 0.6);

function cardStageAt(elapsed: number, index: number): { stage: AnimStage; cycleProgress: number } {
  const t = (((elapsed + index * STAGGER) % CYCLE_LEN) + CYCLE_LEN) % CYCLE_LEN;
  if (t < CYCLE.explodedHold) return { stage: 'exploded', cycleProgress: t / CYCLE.explodedHold };
  let acc = CYCLE.explodedHold;
  if (t < acc + CYCLE.assembling) return { stage: 'assembling', cycleProgress: (t - acc) / CYCLE.assembling };
  acc += CYCLE.assembling;
  if (t < acc + CYCLE.assembledHold) return { stage: 'assembled', cycleProgress: (t - acc) / CYCLE.assembledHold };
  acc += CYCLE.assembledHold;
  return { stage: 'disassembling', cycleProgress: (t - acc) / CYCLE.disassembling };
}

// Adapter over the model's pure-rgb ramp — the model is three-free so the
// video hero can import it without pulling this chunk.
const _thermalColor = new THREE.Color();
function thermalHex(t: number): THREE.Color {
  const [r, g, b] = thermalRgb(t);
  return _thermalColor.setRGB(r, g, b);
}

function spring(cur: number, target: number, delta: number, k: number): number {
  return cur + (target - cur) * (1 - Math.exp(-k * delta));
}

// ──────────────────────────────────────────────────────────────────────────
// Procedural textures — generic PCB + roughness + brushed-metal (cold plates)
// ──────────────────────────────────────────────────────────────────────────

function makePCBTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  // Dark forest green solder mask — server-grade boards run darker than consumer
  ctx.fillStyle = '#0F4A2E';
  ctx.fillRect(0, 0, 512, 512);
  // FR4 fiberglass weave — the visible warp/weft is the "expensive hardware" tell
  ctx.strokeStyle = '#0a3622';
  ctx.lineWidth = 0.8;
  for (let y = 0; y < 512; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
  for (let x = 0; x < 512; x += 18) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
  // Trace routing
  ctx.strokeStyle = '#175a3a';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 50; i++) {
    const sx = Math.random() * 512, sy = Math.random() * 512;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (Math.random() - 0.5) * 120, sy);
    ctx.lineTo(sx + (Math.random() - 0.5) * 120, sy + (Math.random() - 0.5) * 90);
    ctx.stroke();
  }
  // Via pads — nickel-gold ENIG finish
  ctx.fillStyle = '#b8860b';
  for (let i = 0; i < 320; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.anisotropy = 8;
  return t;
}

function makeRoughnessMap(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 150 + Math.random() * 50;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeBrushedMetalTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#aab0b8';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2200; i++) {
    const y = Math.random() * 512;
    const shade = 150 + Math.random() * 90;
    ctx.strokeStyle = `rgba(${shade},${shade + 4},${shade + 8},${0.05 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.6 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y + (Math.random() - 0.5) * 3);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Organic ABF substrate — dark brown-black, fine grain. Used under SXM/OAM
// mezzanine pads and HBM stacks (NOT green FR4 — this is the "server module,
// not gaming card" tell).
function makeOrganicSubstrateTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1C1C20';
  ctx.fillRect(0, 0, 512, 512);
  // Fine-grain speckle — ABF resin texture, not weave
  const img = ctx.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    img.data[i]     = THREE.MathUtils.clamp(img.data[i]     + n, 14, 50);
    img.data[i + 1] = THREE.MathUtils.clamp(img.data[i + 1] + n, 14, 50);
    img.data[i + 2] = THREE.MathUtils.clamp(img.data[i + 2] + n * 0.9, 16, 52);
  }
  ctx.putImageData(img, 0, 0);
  // Subtle laminate striations
  ctx.globalAlpha = 0.05;
  for (let y = 0; y < 512; y += 2) {
    ctx.fillStyle = Math.random() > 0.5 ? '#26262c' : '#101013';
    ctx.fillRect(0, y, 512, 1);
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Product-text decal — transparent canvas with crisp wordmark used as an
// emissive/printed label on shroud tops and cold-plate lids. This is the
// single biggest "real GPU vs generic 3D box" tell — every shipped accelerator
// has its model name screen-printed or laser-etched on the exterior.
function makeProductTextDecal(
  primary: string,
  secondary?: string,
  opts: { color?: string; sub?: string; align?: 'center' | 'left'; tracking?: number } = {}
): THREE.CanvasTexture {
  const W = 1024, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  const color = opts.color ?? '#E8E8EE';
  const tracking = opts.tracking ?? 0.18;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = opts.align ?? 'center';
  const x = opts.align === 'left' ? 48 : W / 2;
  // Primary wordmark — bold, wide-tracked
  ctx.font = `700 96px "Helvetica Neue", "Arial Black", sans-serif`;
  const tracked = primary.split('').join(String.fromCharCode(8201)); // thin-space tracking
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.fillText(tracked, x, H / 2 - (secondary ? 28 : 0));
  ctx.shadowBlur = 0;
  if (secondary) {
    ctx.font = `400 44px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.72;
    const trackedSub = secondary.split('').join(String.fromCharCode(8201));
    ctx.fillText(trackedSub, x, H / 2 + 50);
    ctx.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

type Textures = {
  pcb: THREE.CanvasTexture;
  rough: THREE.CanvasTexture;
  brushed: THREE.CanvasTexture;
  organic: THREE.CanvasTexture;
  decals: Record<string, THREE.CanvasTexture>;
};

// ──────────────────────────────────────────────────────────────────────────
// Instanced helpers — keep draw calls flat across five simultaneous assemblies
// ──────────────────────────────────────────────────────────────────────────

function InstancedBoxes({
  positions, size, color, roughness = 0.4, metalness = 0.6, emissive, emissiveIntensity,
}: {
  positions: [number, number, number][];
  size: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4();
    positions.forEach((p, i) => {
      m.makeTranslation(p[0], p[1], p[2]);
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [positions]);
  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, positions.length]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity ?? 0}
        toneMapped={!emissive}
      />
    </instancedMesh>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Layer label — reads a per-card opacity ref via useFrame
// ──────────────────────────────────────────────────────────────────────────

function LayerLabel({ text, sub, opacityRef, accent }: { text: string; sub?: string; opacityRef: React.MutableRefObject<number>; accent: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useFrame(() => {
    if (wrapRef.current) wrapRef.current.style.opacity = String(opacityRef.current);
  });
  return (
    <Html occlude={false} center={false} style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <div ref={wrapRef} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 20, height: 1, background: accent + '55' }} />
        <div>
          <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 8, fontFamily: FM, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{text}</div>
          {sub && <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 7, fontFamily: FM, whiteSpace: 'nowrap', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </Html>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Shared sub-parts
// ──────────────────────────────────────────────────────────────────────────

function Fan({ fanRef, radius = 1.0 }: { fanRef: React.MutableRefObject<THREE.Group | null>; radius?: number }) {
  return (
    <group ref={fanRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.055, 12, 44]} />
        {/* Fan frame — molded plastic, matte */}
        <meshStandardMaterial color="#1A1A1F" roughness={0.65} metalness={0.0} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.18, 16]} />
        <meshStandardMaterial color="#15151A" roughness={0.7} metalness={0.0} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => {
        const angle = (i / 7) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, angle, 0]}>
            <mesh position={[radius * 0.5, 0, 0]} rotation={[0.35, 0, 0]}>
              <boxGeometry args={[radius * 0.72, 0.035, 0.2]} />
              {/* Fan blades — light translucent-ish gray plastic */}
              <meshStandardMaterial color="#C8C8CE" roughness={0.5} metalness={0.0} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Layer renderers — parametrized by archetype (card vs module)
// ──────────────────────────────────────────────────────────────────────────

function SubstrateLayer({ spec, textures, labelOpacityRef }: { spec: GPUSpec; textures: Textures; labelOpacityRef: React.MutableRefObject<number> }) {
  const profile = stackProfileFor(spec);

  // Module baseplates carry a gold contact-pad array along the short edge —
  // instanced (4 rows × 14 cols = 56 pads, one draw call). Computed
  // unconditionally so this hook always runs in the same order regardless
  // of which archetype this instance renders (rules-of-hooks).
  const pads = useMemo<[number, number, number][]>(() => {
    const out: [number, number, number][] = [];
    const cols = 14, rows = 4;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      out.push([-spec.width / 2 + 0.55 + c * ((spec.width - 1.1) / (cols - 1)), 0.07, spec.depth / 2 - 0.34 - r * 0.13]);
    }
    return out;
  }, [spec]);

  if (profile === 'card') {
    return (
      <group>
        <RoundedBox args={[spec.width, 0.16, spec.depth]} radius={0.05} smoothness={4}>
          <meshStandardMaterial color="#1a1a1e" roughness={0.2} metalness={0.88} roughnessMap={textures.rough} envMapIntensity={1.1} />
        </RoundedBox>
        <mesh position={[-spec.width / 2 - 0.06, -0.34, spec.depth * 0.3]}>
          <boxGeometry args={[0.07, 1.0, 1.7]} />
          <meshStandardMaterial color="#0c0c0e" roughness={0.4} metalness={0.85} />
        </mesh>
        <mesh position={[-spec.width / 2 - 0.06, -0.34, spec.depth * 0.3]}>
          <boxGeometry args={[0.09, 0.12, 1.7]} />
          <meshStandardMaterial color="#c8c8c8" roughness={0.25} metalness={0.9} />
        </mesh>
        <LayerLabel text="ALUMINUM BACKPLATE" sub="anodized 6061 · PCIe bracket" opacityRef={labelOpacityRef} accent={spec.accent} />
      </group>
    );
  }
  return (
    <group>
      {/* Module baseplate — organic ABF substrate (dark brown-black), NOT green FR4.
          This is the visual cue that says "server module, not consumer card". */}
      <RoundedBox args={[spec.width, 0.12, spec.depth]} radius={0.04} smoothness={4}>
        <meshStandardMaterial color="#1C1C20" roughness={0.5} metalness={0.1} map={textures.organic} envMapIntensity={1.0} />
      </RoundedBox>
      {/* SXM5/OAM mezzanine pads — gold-on-nickel; same plated-gold spec as PCIe fingers */}
      <InstancedBoxes positions={pads} size={[0.1, 0.02, 0.07]} color="#D4AF37" roughness={0.28} metalness={1.0} />
      <LayerLabel text="MODULE BASEPLATE" sub="SXM5 / OAM contact array · 56 pads" opacityRef={labelOpacityRef} accent={spec.accent} />
    </group>
  );
}

function SubstrateAndComponentsLayer({ spec, textures, labelOpacityRef }: { spec: GPUSpec; textures: Textures; labelOpacityRef: React.MutableRefObject<number> }) {
  const profile = stackProfileFor(spec);
  const maps = useGpuMaps();

  const smds = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number]; gold: boolean }[] = [];
    const n = profile === 'card' ? 26 : 16;
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - 0.5) * (spec.width - 1.0);
      const z = (Math.random() - 0.5) * (spec.depth - 1.4);
      if (Math.abs(x) < 1.4 && Math.abs(z) < 1.4) continue;
      out.push({ pos: [x, 0.13, z], size: [0.06 + Math.random() * 0.09, 0.05, 0.04 + Math.random() * 0.05], gold: Math.random() > 0.78 });
    }
    return out;
  }, [spec, profile]);

  const inductors = useMemo<[number, number, number][]>(() => {
    const out: [number, number, number][] = [];
    const n = profile === 'card' ? 6 : 4;
    for (let i = 0; i < n; i++) out.push([-spec.width / 2 + 0.9 + (i % 3) * 0.85, 0.22, -spec.depth / 2 + 0.85 + Math.floor(i / 3) * 0.85]);
    return out;
  }, [spec, profile]);

  return (
    <group>
      {/* PCB body — dark forest green solder mask over FR4; server-grade dark mask, not consumer bright green.
          PCB normal map (gpuTextures.pcbNormal) drives micro-relief solder-mask topography for grazing light. */}
      <RoundedBox args={[spec.width - 0.2, 0.22, spec.depth - 0.2]} radius={0.05} smoothness={4}>
        <meshStandardMaterial
          color="#0F4A2E"
          roughness={0.55}
          metalness={0.05}
          map={textures.pcb}
          normalMap={maps?.pcbNormal ?? undefined}
          normalScale={maps?.pcbNormal ? new THREE.Vector2(0.6, 0.6) : undefined}
          envMapIntensity={0.9}
        />
      </RoundedBox>
      {profile === 'card' && Array.from({ length: 16 }).map((_, i) => (
        <mesh key={`pcie-${i}`} position={[-spec.width / 2 + 1.1 + i * 0.3, -0.02, spec.depth / 2 - 0.18]}>
          <boxGeometry args={[0.2, 0.2, 0.4]} />
          {/* PCIe gold fingers — nickel underplate + hard gold overplate; roughness slightly above
              pure gold so it reads as plated, not solid. */}
          <meshStandardMaterial color="#D4AF37" roughness={0.28} metalness={1.0} />
        </mesh>
      ))}
      {inductors.map((p, i) => (
        <RoundedBox key={`ind-${i}`} args={[0.4, 0.3, 0.4]} radius={0.04} smoothness={3} position={p}>
          <meshStandardMaterial color="#2a2a2e" roughness={0.65} metalness={0.3} roughnessMap={textures.rough} />
        </RoundedBox>
      ))}
      {smds.map((s, i) => (
        <mesh key={`smd-${i}`} position={s.pos}>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color={s.gold ? '#D4AF37' : '#16161a'} roughness={s.gold ? 0.3 : 0.6} metalness={s.gold ? 1.0 : 0.3} roughnessMap={s.gold ? undefined : textures.rough} />
        </mesh>
      ))}
      {/* AMD INSTINCT silkscreen decal — printed on the PCB short edge of the
          MI300X OAM module. Faces up; aligned along the long axis of the short edge. */}
      {spec.id === 'mi300x' && maps?.amdDecal && (
        <mesh
          position={[spec.width / 2 - 0.65, 0.115 + 0.001, 0]}
          rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
        >
          <planeGeometry args={[Math.min(spec.depth - 0.8, 3.0), 0.5]} />
          <meshBasicMaterial map={maps.amdDecal} transparent toneMapped={false} opacity={0.95} />
        </mesh>
      )}
      <LayerLabel
        text={profile === 'card' ? 'PCB SUBSTRATE' : 'INTERPOSER · ORGANIC SUBSTRATE'}
        sub={profile === 'card' ? '14-layer FR4 · power delivery' : 'CoWoS-style · die ↔ HBM fabric'}
        opacityRef={labelOpacityRef}
        accent={spec.accent}
      />
    </group>
  );
}

function CoolerLayer({
  spec, textures, thermalRef, fanRefs, labelOpacityRef,
}: {
  spec: GPUSpec;
  textures: Textures;
  thermalRef: React.MutableRefObject<number>;
  fanRefs: React.MutableRefObject<THREE.Group | null>[];
  labelOpacityRef: React.MutableRefObject<number>;
}) {
  const finMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const lidMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const maps = useGpuMaps();

  useFrame(() => {
    const t = thermalRef.current;
    if (finMatRef.current) { finMatRef.current.emissive.set('#c85f2a'); finMatRef.current.emissiveIntensity = t * 0.35; }
    if (lidMatRef.current) { lidMatRef.current.emissive.copy(thermalHex(t)); lidMatRef.current.emissiveIntensity = t * 0.5; }
  });

  // Both archetypes' instanced-position arrays are computed unconditionally
  // (rules-of-hooks) — only one set is actually mounted per instance, decided
  // by spec.cooler, which is invariant for the lifetime of this component.
  const grooves = useMemo<[number, number, number][]>(() => {
    const out: [number, number, number][] = [];
    const n = 14;
    for (let i = 0; i < n; i++) out.push([-spec.width / 2 + 0.5 + (i * (spec.width - 1)) / (n - 1), -0.07, 0]);
    return out;
  }, [spec]);

  const FIN_COUNT = 16;
  const spacing = 0.2;
  const startY = -((FIN_COUNT - 1) * spacing) / 2;
  const fins = useMemo<[number, number, number][]>(
    () => Array.from({ length: FIN_COUNT }).map((_, i) => [0, startY + i * spacing, 0] as [number, number, number]),
    [startY]
  );

  if (spec.cooler === 'cold-plate') {
    // Liquid-cooled module — the photoreal product skin fills the entire top
    // face edge-to-edge, sized exactly to spec.width × spec.depth so no stock
    // lid color shows through.
    const skin = maps?.skins?.[spec.id];
    return (
      <group>
        <RoundedBox args={[spec.width, 0.16, spec.depth]} radius={0.05} smoothness={4}>
          <meshStandardMaterial ref={lidMatRef} color="#1a1a1f" roughness={0.45} metalness={0.55} envMapIntensity={1.0} emissive="#000" emissiveIntensity={0} />
        </RoundedBox>
        {skin && (
          <mesh position={[0, 0.0805, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[spec.width, spec.depth]} />
            <meshStandardMaterial map={skin} roughness={0.92} metalness={0.05} envMapIntensity={0.35} />
          </mesh>
        )}
        <LayerLabel text="COLD PLATE · LIQUID I/F" sub="nickel-plated copper · micro-channel" opacityRef={labelOpacityRef} accent={spec.accent} />
      </group>
    );
  }

  if (spec.cooler === 'passive-fin') {
    // L40S single-slot passive card. The photoreal skin already contains the
    // ribbed anodized-aluminum extrusion, the NVIDIA + L40S wordmark, the
    // mounting-screw pockets, the green diagonal accent stripe AND the 4× DP
    // bracket — so the 3D geometry is just a flat shroud sized exactly to the
    // skin, with the skin draped over the full top face. No ribs poking
    // through, no stock GPU showing.
    const shellH = 0.62;
    return (
      <group>
        <RoundedBox args={[spec.width, shellH, spec.depth]} radius={0.035} smoothness={4} position={[0, 0, 0]}>
          <meshStandardMaterial
            ref={lidMatRef}
            color="#2a2a30"
            roughness={0.6}
            metalness={0.55}
            envMapIntensity={1.0}
          />
        </RoundedBox>
        {maps?.skins?.l40s && (
          <mesh position={[0, shellH / 2 + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[spec.width, spec.depth]} />
            <meshStandardMaterial map={maps.skins.l40s} roughness={0.9} metalness={0.1} envMapIntensity={0.35} />
          </mesh>
        )}
        <LayerLabel text="PASSIVE FIN STACK · 4× DP" sub="anodized aluminum extrusion · server airflow" opacityRef={labelOpacityRef} accent={spec.accent} />
      </group>
    );
  }



  // A100 PCIe blower archetype. The photoreal skin contains the radial blower
  // fan, the smooth shroud, the NVIDIA A100 silkscreen and the green accent
  // stripe — so we render only a flat shroud sized to the skin and drape the
  // skin over the entire top face. No 3D fan torus, no rib stack poking
  // through. Internal fin block stays underneath for the exploded-view layer
  // separation, but it sits well below the shroud top.
  const shroudH = 0.34;
  return (
    <group>
      {/* internal fin stack — only visible in exploded view, hidden under the shroud when assembled */}
      <group position={[0, -1.9, 0]}>
        <InstancedBoxes positions={fins} size={[spec.width - 1.2, 0.045, spec.depth - 1.2]} color="#B8B8BC" roughness={0.4} metalness={0.85} emissive="#c85f2a" emissiveIntensity={0} />
        <mesh position={[0, FIN_COUNT * spacing * 0.5 + 0.1, 0]}>
          <boxGeometry args={[spec.width - 1.0, 0.12, 0.5]} />
          <meshStandardMaterial ref={finMatRef} color="#CFCAC0" roughness={0.18} metalness={0.95} emissive="#c85f2a" emissiveIntensity={0} map={maps?.nickelBrushed ?? undefined} />
        </mesh>
      </group>
      {/* Shroud body — flat lid, exactly the card footprint, hidden by the skin on top */}
      <RoundedBox args={[spec.width, shroudH, spec.depth]} radius={0.045} smoothness={4} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#0E0E11" roughness={0.55} metalness={0.05} />
      </RoundedBox>
      {/* Photoreal top-face skin — full footprint, edge-to-edge */}
      {maps?.skins?.a100 && (
        <mesh position={[0, 0.5 + shroudH / 2 + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[spec.width, spec.depth]} />
          <meshStandardMaterial map={maps.skins.a100} roughness={0.92} metalness={0.05} envMapIntensity={0.35} />
        </mesh>
      )}
      {/* PCIe bracket — full-height steel I/O end-plate at +z edge. Real
          server cards have a vented bracket with screw notch + slot openings
          for exhaust (blower) or display outputs (passive). */}
      <group position={[0, 0.32, spec.depth / 2 + 0.04]}>
        <mesh>
          <boxGeometry args={[spec.width + 0.05, 1.3, 0.04]} />
          <meshStandardMaterial color="#9a9aa0" roughness={0.55} metalness={0.85} />
        </mesh>
        {/* Screw-tab notch (top) */}
        <mesh position={[spec.width / 2 - 0.2, 0.7, 0]}>
          <boxGeometry args={[0.4, 0.08, 0.06]} />
          <meshStandardMaterial color="#9a9aa0" roughness={0.55} metalness={0.85} />
        </mesh>
        {/* Exhaust vent slots for blower cards, DP cutouts for triple-fan
            absent (triple-fans vent into the chassis, not out the bracket). */}
        {spec.cooler === 'blower' && Array.from({ length: 8 }).map((_, i) => (
          <mesh key={`vent-${i}`} position={[-spec.width / 2 + 1.2 + i * 0.5, -0.05, 0.01]}>
            <boxGeometry args={[0.32, 0.55, 0.03]} />
            <meshStandardMaterial color="#06060a" roughness={0.9} metalness={0.0} />
          </mesh>
        ))}
      </group>
      {/* A100 PCIe 8-pin EPS power connector — black housing with 8 gold pins,
          mounted top-rear of the shroud (real card: single 8-pin near the
          bracket end, recessed into the shroud). */}
      {spec.cooler === 'blower' && (
        <group position={[spec.width / 2 - 1.05, 0.5 + shroudH / 2 + 0.08, -spec.depth / 2 + 0.32]}>
          <RoundedBox args={[0.95, 0.16, 0.42]} radius={0.025} smoothness={3}>
            <meshStandardMaterial color="#0a0a0c" roughness={0.7} metalness={0.05} />
          </RoundedBox>
          {/* 2 rows × 4 cols of gold pin sockets, slightly recessed */}
          {Array.from({ length: 8 }).map((_, i) => {
            const col = i % 4, row = Math.floor(i / 4);
            return (
              <mesh key={`epin-${i}`} position={[-0.34 + col * 0.225, 0.07, -0.1 + row * 0.2]}>
                <boxGeometry args={[0.11, 0.04, 0.11]} />
                <meshStandardMaterial color="#D4AF37" roughness={0.3} metalness={1.0} />
              </mesh>
            );
          })}
        </group>
      )}

      <LayerLabel
        text={spec.cooler === 'blower' ? 'BLOWER + FIN STACK' : 'TRIPLE-FAN SHROUD'}
        sub={spec.cooler === 'blower' ? 'radial · single-slot exhaust' : '3 × 75mm axial · open shroud'}
        opacityRef={labelOpacityRef}
        accent={spec.accent}
      />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// GPU card — full assembly with its own staggered explode/assemble loop
// ──────────────────────────────────────────────────────────────────────────

function GPUCard({
  spec, index, textures, heroLevelRef,
}: {
  spec: GPUSpec;
  index: number;
  textures: Textures;
  heroLevelRef: React.MutableRefObject<number>;
}) {
  const isHero = index === HERO_INDEX;
  const profile = stackProfileFor(spec);
  const offsets = LAYER_OFFSETS[profile];

  const g0 = useRef<THREE.Group>(null!);
  const g1 = useRef<THREE.Group>(null!);
  const g2 = useRef<THREE.Group>(null!);
  const g3 = useRef<THREE.Group>(null!);
  const groups = [g0, g1, g2, g3];

  const labelOpacity0 = useRef(0);
  const labelOpacity1 = useRef(0);
  const labelOpacity2 = useRef(0);
  const labelOpacity3 = useRef(0);
  const labelOpacities = [labelOpacity0, labelOpacity1, labelOpacity2, labelOpacity3];

  const fanRefs = [useRef<THREE.Group | null>(null), useRef<THREE.Group | null>(null), useRef<THREE.Group | null>(null)];
  const localLevelRef = useRef(0.07);
  const stageRef = useRef<AnimStage>('exploded');

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const { stage } = cardStageAt(t, index);
    stageRef.current = stage;

    const showLabels = stage === 'exploded' || stage === 'disassembling';
    const targetLabelOp = showLabels ? 1 : 0;
    const labelRate = showLabels ? 2.4 : 3.4;
    labelOpacities.forEach((ref) => {
      ref.current = spring(ref.current, targetLabelOp, delta, labelRate);
    });

    const breatheAmt = (stage === 'exploded' || stage === 'disassembling') ? 0.13 : 0;
    const breathe = (i: number) => Math.sin(t * 0.55 + i * 1.3 + index * 2.1) * breatheAmt;

    const assembledTarget = stage === 'assembling' || stage === 'assembled';
    const targetY = assembledTarget ? offsets.assembled : offsets.exploded;
    const k = (stage === 'assembling' || stage === 'disassembling') ? 2.7 : 1.9;

    for (let i = 0; i < groups.length; i++) {
      const ref = groups[i];
      if (ref.current) ref.current.position.y = spring(ref.current.position.y, targetY[i] + breathe(i), delta, k);
    }

    // thermal level driving emissive die/cooler glow
    if (isHero) {
      localLevelRef.current = heroLevelRef.current;
    } else {
      localLevelRef.current = 0.07 + Math.sin(t * 0.25 + index * 1.9) * 0.035;
    }

    // Fan controller realism: fans track TEMPERATURE through the sim's
    // lagged fan-duty channel (≈1.6 s controller filter), so RPM audibly
    // trails the thermal event instead of snapping with it — and keeps
    // spinning fast during recovery while the card is still shedding heat.
    const fanBase = stage === 'assembled' ? 4 : stage === 'assembling' ? 2.2 : 0.9;
    const fanDuty = isHero ? _heroFanDuty.current : localLevelRef.current;
    const fanSpeed = fanBase + (stage === 'assembled' ? fanDuty * 11 : 0);
    fanRefs.forEach((ref) => { if (ref.current) ref.current.rotation.y += delta * fanSpeed; });
  });

  return (
    <group position={[cardX(index), 0, 0]}>
      <group ref={g0} position={[0, offsets.exploded[0], 0]}>
        <SubstrateLayer spec={spec} textures={textures} labelOpacityRef={labelOpacities[0]} />
      </group>
      <group ref={g1} position={[0, offsets.exploded[1], 0]}>
        <SubstrateAndComponentsLayer spec={spec} textures={textures} labelOpacityRef={labelOpacities[1]} />
      </group>
      <group ref={g2} position={[0, offsets.exploded[2], 0]}>
        <DieBlockWrapper spec={spec} thermalRef={localLevelRef} opacityRef={labelOpacities[2]} />
      </group>
      <group ref={g3} position={[0, offsets.exploded[3], 0]}>
        <CoolerLayer spec={spec} textures={textures} thermalRef={localLevelRef} fanRefs={fanRefs} labelOpacityRef={labelOpacities[3]} />
      </group>
      <CardNamePlate spec={spec} index={index} />
    </group>
  );
}

// Small wrapper so DieBlock can take a plain opacity ref (avoids prop-shape mismatch above)
function DieBlockWrapper({ spec, thermalRef, opacityRef }: { spec: GPUSpec; thermalRef: React.MutableRefObject<number>; opacityRef: React.MutableRefObject<number> }) {
  const matRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const maps = useGpuMaps();
  useFrame(() => {
    const t = thermalRef.current;
    const c = thermalHex(t);
    matRefs.current.forEach((m) => {
      if (!m) return;
      m.emissive.copy(c);
      m.emissiveIntensity = t * t * 1.7;
    });
  });

  let dies: { pos: [number, number, number]; w: number; d: number }[];
  if (spec.dieLayout === 'monolithic') {
    dies = [{ pos: [0, 0.07, 0], w: 1.7, d: 1.7 }];
  } else if (spec.dieLayout === 'dual-die') {
    dies = [{ pos: [-0.66, 0.07, 0], w: 1.25, d: 1.7 }, { pos: [0.66, 0.07, 0], w: 1.25, d: 1.7 }];
  } else {
    // MI300X: 8 XCD/IOD chiplets — transposed to 2 cols × 4 rows so the
    // chiplet field runs along the long (z) axis of the OAM package,
    // matching AMD's MI300X die-shot orientation.
    dies = [];
    for (let r = 0; r < 4; r++) for (let cI = 0; cI < 2; cI++) {
      dies.push({ pos: [-0.21 + cI * 0.42, 0.07, -0.72 + r * 0.48], w: 0.38, d: 0.44 });
    }
  }

  // HBM placement is layout-specific. Real B200/H100 modules stack HBM in
  // rings/rows around the die — not decorative. Chiplet modules (MI300X)
  // flank the chiplet grid along its long edges.
  type MemPlace = { pos: [number, number, number]; w: number; d: number; h: number };
  const memPositions = useMemo<MemPlace[]>(() => {
    const out: MemPlace[] = [];
    const hbmH = 0.32;
    if (spec.dieLayout === 'dual-die') {
      // B200: 8 HBM3e stacks flanking the dual-die complex, 4 each side.
      const dieCenters = [-0.66, 0.66];
      const perSide = Math.max(1, Math.floor(spec.memCount / (dieCenters.length * 2)));
      const zSpan = 1.5;
      dieCenters.forEach((dx) => {
        [-1, 1].forEach((side) => {
          for (let i = 0; i < perSide; i++) {
            const z = perSide === 1 ? 0 : -zSpan / 2 + (i * zSpan) / (perSide - 1);
            out.push({ pos: [dx + side * 0.95, hbmH / 2, z], w: 0.42, d: 0.62, h: hbmH });
          }
        });
      });
    } else if (spec.dieLayout === 'monolithic') {
      // H100 SXM5: 6 HBM3 stacks in a hex ring around the central die.
      // (A100 and other monolithic modules fall back to the flanking rows.)
      if (spec.id === 'h100' && spec.memCount === 6) {
        const R = 1.35;
        const w = 0.46;
        const d = 0.6;
        // Hex angles starting at +x, every 60°. Real SXM5 reference: 3 stacks
        // top, 3 stacks bottom — flatter on the long edges than a perfect hex
        // so use a slight z-bias to read as two parallel rows of 3.
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const x = Math.cos(ang) * R * 1.1;
          const z = Math.sin(ang) * R * 0.78;
          out.push({ pos: [x, hbmH / 2, z], w, d, h: hbmH });
        }
      } else {
        const perSide = Math.max(1, Math.floor(spec.memCount / 2));
        const zSpan = 1.7;
        [-1, 1].forEach((side) => {
          for (let i = 0; i < perSide; i++) {
            const z = perSide === 1 ? 0 : -zSpan / 2 + (i * zSpan) / (perSide - 1);
            out.push({ pos: [side * 1.35, hbmH / 2, z], w: 0.46, d: 0.6, h: hbmH });
          }
        });
      }
    } else {
      // MI300X (transposed grid): 8 HBM3 flanking the now-vertical chiplet
      // field along its long (z) edges. perSide=4, zSpan widened.
      const perSide = Math.max(1, Math.floor(spec.memCount / 2));
      const zSpan = 2.2;
      [-1, 1].forEach((side) => {
        for (let i = 0; i < perSide; i++) {
          const z = perSide === 1 ? 0 : -zSpan / 2 + (i * zSpan) / (perSide - 1);
          out.push({ pos: [side * 0.95, hbmH / 2, z], w: 0.42, d: 0.44, h: hbmH });
        }
      });
    }
    return out;
  }, [spec]);

  const dieLabel = spec.dieLayout === 'dual-die' ? 'DUAL-DIE COMPLEX' : spec.dieLayout === 'chiplet-grid' ? 'CHIPLET ARRAY · 8×XCD' : 'MONOLITHIC DIE';
  // Per-die IHS caps render for monolithic only. Dual-die (B200) and
  // chiplet-grid (MI300X) get a single unified IHS spanning the full module.
  const showPerDieIHS = spec.dieLayout === 'monolithic';
  // HBM gold caps are hidden when the unified IHS covers them (B200), since
  // they'd visually intersect the lid.
  const showHbmCaps = spec.dieLayout !== 'dual-die';

  return (
    <group>
      {/* Package substrate / interposer — rectangular, matching real silicon footprint */}
      <RoundedBox args={[spec.width * 0.92, 0.04, spec.depth * 0.92]} radius={0.03} smoothness={3} position={[0, -0.02, 0]}>
        <meshStandardMaterial color="#1C1C20" roughness={0.5} metalness={0.1} />
      </RoundedBox>
      {dies.map((d, i) => (
        <group key={i}>
          {/* Lapped silicon die — near-black with faint blue tint */}
          <RoundedBox args={[d.w, 0.12, d.d]} radius={0.02} smoothness={3} position={d.pos}>
            <meshStandardMaterial ref={(m) => { matRefs.current[i] = m; }} color="#16161C" roughness={0.15} metalness={0.3} />
          </RoundedBox>
          {showPerDieIHS && (
            <RoundedBox args={[d.w * 1.04, 0.05, d.d * 1.04]} radius={0.015} smoothness={3} position={[d.pos[0], d.pos[1] + 0.085, d.pos[2]]}>
              <meshStandardMaterial color="#CFCAC0" roughness={0.18} metalness={0.95} envMapIntensity={1.25} map={maps?.nickelBrushed ?? undefined} />
            </RoundedBox>
          )}
        </group>
      ))}
      {/* H100 SXM5 — NVIDIA wordmark etched into the IHS top face */}
      {spec.id === 'h100' && maps?.nvidiaDecal && (
        <mesh position={[0, 0.07 + 0.085 + 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.1, 0.28]} />
          <meshBasicMaterial map={maps.nvidiaDecal} transparent toneMapped={false} opacity={0.9} />
        </mesh>
      )}
      {/* B200 unified IHS — one large nickel-plated lid spanning both dies
          AND the 8 HBM3e stacks (reference: Blackwell B200 package shot). */}
      {spec.dieLayout === 'dual-die' && (
        <group>
          <RoundedBox args={[3.6, 0.05, 2.2]} radius={0.04} smoothness={4} position={[0, 0.345, 0]}>
            <meshStandardMaterial color="#CFCAC0" roughness={0.18} metalness={0.95} envMapIntensity={1.25} map={maps?.nickelBrushed ?? undefined} />
          </RoundedBox>
          {/* NV-HBI signature — faint recessed hairline across the lid where the
              two GB100 dies meet through the high-bandwidth interconnect bridge.
              Slightly darker, slightly rougher than the lid for grazing-light read. */}
          <mesh position={[0, 0.371, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.018, 2.16]} />
            <meshStandardMaterial color="#5a564f" roughness={0.55} metalness={0.7} envMapIntensity={0.6} />
          </mesh>
        </group>
      )}

      {/* MI300X unified IHS — single nickel lid spanning the transposed 2×4
          chiplet field. Dimensions transposed to match the new grid. */}
      {spec.dieLayout === 'chiplet-grid' && (
        <RoundedBox args={[1.15, 0.05, 2.05]} radius={0.025} smoothness={4} position={[0, 0.155, 0]}>
          <meshStandardMaterial color="#CFCAC0" roughness={0.2} metalness={0.94} envMapIntensity={1.2} map={maps?.nickelBrushed ?? undefined} />
        </RoundedBox>
      )}
      {memPositions.map((m, i) => (
        <group key={`mem-${i}`} position={m.pos}>
          {/* HBM stack base — dark ABF organic substrate */}
          <mesh position={[0, -m.h / 2 + 0.02, 0]}>
            <boxGeometry args={[m.w + 0.04, 0.04, m.d + 0.04]} />
            <meshStandardMaterial color="#1A1614" roughness={0.6} metalness={0.05} />
          </mesh>
          {/* The stack itself — taller than wide, matte brown-black */}
          <RoundedBox args={[m.w, m.h, m.d]} radius={0.015} smoothness={3}>
            <meshStandardMaterial color="#26201C" roughness={0.55} metalness={0.1} />
          </RoundedBox>
          {/* HBM3 top cap — gold metallic TIM/logic-die lid. Hidden under
              the unified B200 IHS where it'd visually intersect the lid. */}
          {showHbmCaps && (
            <mesh position={[0, m.h / 2 + 0.006, 0]}>
              <boxGeometry args={[m.w * 0.96, 0.012, m.d * 0.96]} />
              <meshStandardMaterial color="#C9A86A" roughness={0.32} metalness={0.95} envMapIntensity={1.15} />
            </mesh>
          )}
          <mesh position={[0, m.h / 2 - 0.02, m.d / 2 + 0.001]}>
            <planeGeometry args={[m.w * 0.92, 0.012]} />
            <meshStandardMaterial color="#3a3028" roughness={0.7} metalness={0.05} />
          </mesh>
        </group>
      ))}
      <LayerLabel text={dieLabel} sub={`${spec.mem} · stacked memory`} opacityRef={opacityRef} accent={spec.accent} />
    </group>
  );
}

// Floating model name plate — visible while exploded, the "ad copy" beat
function CardNamePlate({ spec, index }: { spec: GPUSpec; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useFrame((state, delta) => {
    if (!ref.current) return;
    const { stage } = cardStageAt(state.clock.elapsedTime, index);
    const target = (stage === 'exploded' || stage === 'disassembling') ? 1 : 0;
    const cur = parseFloat(ref.current.dataset.op || '0');
    // dt-based smoothing — the old 0.06/frame constant ran 2× faster on
    // 120 Hz displays; exp form is frame-rate independent (k≈3.6/s ≙ 0.06@60fps)
    const next = cur + (target - cur) * (1 - Math.exp(-3.6 * delta));
    ref.current.dataset.op = String(next);
    ref.current.style.opacity = String(next);
    ref.current.style.transform = `translateY(${(1 - next) * 8}px)`;
  });
  return (
    <Html position={[0, -3.6, 0]} center occlude={false} style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <div ref={ref} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
        <div style={{ fontFamily: FM, fontSize: 8.5, letterSpacing: '0.22em', color: spec.accent, marginBottom: 3 }}>
          {spec.vendor}
        </div>
        <div style={{ fontFamily: FM, fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', color: T.text }}>
          {spec.name}
        </div>
        <div style={{ fontFamily: FM, fontSize: 8, letterSpacing: '0.12em', color: T.muted, marginTop: 2 }}>
          {spec.arch} · {spec.mem}
        </div>
      </div>
    </Html>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Cinematic palette — "Liquid Gold": Champagne Gold + Obsidian Silver.
// Luxury watch / premium automotive reveal aesthetic. Warm, not neon.
// ──────────────────────────────────────────────────────────────────────────
const CINE = {
  void:        '#2A2620', // warm slate (atmosphere)
  voidDeep:    '#0A0A0B', // deep obsidian (backdrop blackpoint)
  hot:         '#FFE8BC', // champagne gold (accent emissive)
  hotSoft:     '#D4AF37', // 18k champagne gold (desaturated, not brassy)
  rim:         '#E2E8F0', // liquid platinum (white rim / softbox)
  floor:       '#06060A', // black nickel mirror floor
};

// ──────────────────────────────────────────────────────────────────────────
// The set — black-nickel mirror floor (0.01 roughness) + warm slate-to-
// soft-champagne gradient cyc. Single champagne emissive ribbon for the
// luxury "inner glow" — wide bloom, low intensity, no neon line.
// ──────────────────────────────────────────────────────────────────────────

function Backdrop() {
  // Smooth warm-slate → soft-champagne gradient. Linear falloff, zero noise.
  const gradTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 1024;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 1024);
    g.addColorStop(0.00, CINE.voidDeep);
    g.addColorStop(0.32, '#1a1612');
    g.addColorStop(0.50, '#3a2f22');
    g.addColorStop(0.60, '#6a5236');
    g.addColorStop(0.66, '#a8814a');
    g.addColorStop(0.74, '#4a3a26');
    g.addColorStop(1.00, CINE.voidDeep);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 1024);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  return (
    <group>
      {/* Cyc backdrop — warm silk gradient, behind everything */}
      <mesh position={[0, 6, -18]}>
        <planeGeometry args={[120, 38]} />
        <meshBasicMaterial map={gradTex} toneMapped={false} />
      </mesh>
      {/* Champagne emissive ribbon — wide, soft, luxury "inner heat" glow */}
      <mesh position={[0, 4.6, -15]}>
        <boxGeometry args={[26, 0.06, 0.04]} />
        <meshBasicMaterial color={CINE.hot} toneMapped={false} />
      </mesh>
      {/* Faint horizon under-strip — desaturated gold whisper */}
      <mesh position={[0, -1.2, -15]}>
        <planeGeometry args={[60, 0.05]} />
        <meshBasicMaterial color={CINE.hotSoft} toneMapped={false} opacity={0.3} transparent />
      </mesh>
    </group>
  );
}

function Runway({ textures }: { textures: Textures }) {
  return (
    <group position={[0, -3.4, 0]}>
      {/* Black nickel mirror floor — roughness pushed to glass minimum so
          metallic surfaces cast long, unbroken vertical reflections. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GPU_SPECS.length * CARD_SPACING + 24, 26]} />
        <MeshReflectorMaterial
          blur={[120, 40]}
          resolution={CAPTURE ? 2048 : 1024}
          mixBlur={0.5}
          mixStrength={1.8}
          mixContrast={1.1}
          roughness={0.01}
          depthScale={0.4}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color={CINE.floor}
          metalness={0.98}
          mirror={0.7}
        />
      </mesh>
      {/* Removed gold ring halos under each GPU — read as an upside-down U arch. */}
      {/* Warm slate atmosphere — soft falloff, low density */}
      <fogExp2 attach="fog" args={[CINE.void, 0.02]} />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Lighting — Liquid Gold rig:
//   • Overhead silver softbox (clean white, broad) → pure white linear bands
//   • Traveling key spot — platinum white, follows hero
//   • Champagne backdrop wash — warm cyc bleed onto rear of cards
//   • Subtle platinum side fill from camera-left
//   • Warm blackpoint ambient — never crushes to true black
// ──────────────────────────────────────────────────────────────────────────

function SceneLights({ camXRef }: { camXRef: React.MutableRefObject<number> }) {
  const stripRef = useRef<THREE.RectAreaLight>(null!);
  const fillRef = useRef<THREE.RectAreaLight>(null!);
  const cycRef = useRef<THREE.RectAreaLight>(null!);
  const spotRef = useRef<THREE.SpotLight>(null!);

  useEffect(() => {
    stripRef.current?.lookAt(0, 0, 0);
    fillRef.current?.lookAt(0, 0, 0);
    cycRef.current?.lookAt(0, 4, 0);
  }, []);

  useFrame(() => {
    if (spotRef.current) {
      spotRef.current.position.x = camXRef.current;
      spotRef.current.target.position.x = camXRef.current;
      spotRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      {/* Overhead silver softbox — narrow, tight top band kiss only */}
      <rectAreaLight ref={stripRef} position={[0, 13, 3]} width={16} height={3.5} intensity={4.5} color={CINE.rim} />
      {/* Whisper platinum side fill from camera-left — just lifts shadow side */}
      <rectAreaLight ref={fillRef} position={[-12, 5, 8]} width={7} height={5} intensity={0.85} color="#e8edf3" />
      {/* Champagne cyc wash — warm bleed across rear of cards, very low */}
      <rectAreaLight ref={cycRef} position={[0, 3.5, -10]} width={20} height={5} intensity={1.1} color={CINE.hot} />
      {/* Per-card traveling key — tight liquid-platinum spot, deep falloff */}
      <spotLight ref={spotRef} position={[0, 11, 6]} angle={0.32} penumbra={0.88} intensity={42} color={CINE.rim} distance={22} decay={2.2} castShadow shadow-mapSize={CAPTURE ? [4096, 4096] : [2048, 2048]} shadow-bias={-0.00018} />
      {/* Warm blackpoint ambient — barely there */}
      <ambientLight intensity={0.018} color={CINE.void} />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Camera — slow lateral dolly sweeping the full runway, noise-driven drift
// ──────────────────────────────────────────────────────────────────────────

const SWEEP_HALF = (GPU_SPECS.length - 1) * CARD_SPACING * 0.5 + 3;
const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

// ── Authored capture path ──────────────────────────────────────────────────
// The live site sweeps generically; the video gets a directed camera synced
// to the hero H100's cycle phase (hero stage offset: index 2 × STAGGER).
// One loop = 2 × CYCLE_LEN (25.2s) so the cut back to frame one is seamless:
//   1. open low 3/4 on the assembled hero — hardware credibility
//   2. crane up as it explodes — look INTO the separating thermal stack
//      (die → TIM → cold plate: the exact path R_θ measures)
//   3. arc out and dolly the lineup while staggered cards hit their poses
//   4. return arc, settle into the opening framing
export const CAPTURE_LOOP_SECONDS = CYCLE_LEN * 4; // 50.4 s — half-tempo recut
// Key times are matched against each card's cycle phase (offset i×STAGGER,
// mod CYCLE_LEN) so the camera arrives exactly as that card breaks apart —
// but each card now gets a ~8 s DWELL with slow internal drift instead of a
// 2.5 s drive-by (the first 25.2 s cut read as sped-up). Disassemble windows
// (mod 12.6): hero@1.2 · L40S@6.0 · A100@10.8 · MI300X@4.2 · B200@9.0.
const CAPTURE_KEYS: { t: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  // hero H100 — assembled → explode → top-down → re-assemble
  { t: 0.0,  pos: [4.6, 1.5, 8.2],     look: [0, 0.35, 0] },
  { t: 2.4,  pos: [3.4, 2.6, 7.4],     look: [0, 0.45, 0] },      // disassembling 1.2–3.0
  { t: 4.8,  pos: [0.8, 5.2, 6.8],     look: [0, -0.25, 0] },     // exploded 3.0–5.6, look down in
  { t: 7.4,  pos: [-2.6, 3.6, 8.6],    look: [-0.3, 0.25, 0] },   // assembling 5.6–8.0, drift off
  // L40S — arrive on exploded tail (7.8–10.4), watch it close, slow hold
  { t: 10.2, pos: [-12.4, 2.9, 10.0],  look: [-9.6, 0.3, 0] },
  { t: 13.8, pos: [-13.6, 2.1, 8.8],   look: [-9.6, 0.22, 0] },   // assembled, slow push-in
  { t: 17.8, pos: [-11.9, 2.9, 9.3],   look: [-9.6, 0.34, 0] },   // anticipating the 18.6 break
  { t: 19.8, pos: [-13.2, 3.5, 9.7],   look: [-9.6, 0.42, 0] },   // mid-disassemble exit beat
  // A100 — tall blower-card stack: arrive assembled, ride the full explode
  { t: 21.6, pos: [-21.6, 2.4, 9.4],   look: [-19.2, 0.3, 0] },
  { t: 24.6, pos: [-22.4, 3.4, 8.2],   look: [-19.2, 0.6, 0] },   // disassembling 23.4–25.2, rise
  { t: 27.0, pos: [-19.6, 5.6, 7.4],   look: [-19.2, 0.1, 0] },   // exploded 25.2–27.8, high look-in
  { t: 29.6, pos: [-15.4, 4.2, 10.4],  look: [-17.5, 0.3, 0] },   // assembling, pull away
  // wide — the whole runway in one calm frame
  { t: 32.4, pos: [0, 5.4, 14.6],      look: [-1.0, 0.4, 0] },
  // MI300X — watch the final close, hold, exit as it cracks open again
  { t: 35.4, pos: [16.2, 2.6, 9.8],    look: [19.2, 0.3, 0] },    // assembling 33.8–36.2
  { t: 38.8, pos: [15.4, 2.1, 8.8],    look: [19.2, 0.22, 0] },   // assembled drift
  { t: 41.6, pos: [17.0, 2.8, 9.4],    look: [19.2, 0.35, 0] },
  { t: 43.2, pos: [16.4, 3.4, 8.8],    look: [19.2, 0.5, 0] },    // disassembling 42.0–43.8
  // B200 — arrive assembled, framed as it breaks, then home to the hero
  { t: 45.4, pos: [6.8, 2.6, 9.6],     look: [9.6, 0.3, 0] },
  { t: 48.0, pos: [7.6, 3.4, 8.6],     look: [9.6, 0.5, 0] },     // disassembling 46.8–48.6
  { t: 49.2, pos: [6.4, 2.4, 8.6],     look: [6.0, 0.35, 0] },    // return leg → loops to t=0
];

function sampleCapturePath(elapsed: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  const t = elapsed % CAPTURE_LOOP_SECONDS;
  const n = CAPTURE_KEYS.length;
  let i = n - 1;
  for (let k = 0; k < n; k++) {
    if (t >= CAPTURE_KEYS[k].t) i = k; else break;
  }
  const a = CAPTURE_KEYS[i];
  const b = CAPTURE_KEYS[(i + 1) % n];
  const span = ((i + 1 === n ? CAPTURE_LOOP_SECONDS : b.t) - a.t);
  const raw = THREE.MathUtils.clamp((t - a.t) / span, 0, 1);
  const e = raw * raw * (3 - 2 * raw); // smoothstep per segment
  outPos.set(
    THREE.MathUtils.lerp(a.pos[0], b.pos[0], e),
    THREE.MathUtils.lerp(a.pos[1], b.pos[1], e),
    THREE.MathUtils.lerp(a.pos[2], b.pos[2], e),
  );
  outLook.set(
    THREE.MathUtils.lerp(a.look[0], b.look[0], e),
    THREE.MathUtils.lerp(a.look[1], b.look[1], e),
    THREE.MathUtils.lerp(a.look[2], b.look[2], e),
  );
}

function CameraRig({ camXRef }: { camXRef: React.MutableRefObject<number> }) {
  const { camera } = useThree();
  const noiseX = useMemo(() => createNoise3D(), []);
  const noiseY = useMemo(() => createNoise3D(), []);
  const noiseZ = useMemo(() => createNoise3D(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (CAPTURE) {
      // Authored, perfectly-looping path — no noise drift (noise isn't
      // periodic and would break the seamless loop point).
      sampleCapturePath(t, _camTarget, _lookTarget);
      camera.position.copy(_camTarget);
      camera.lookAt(_lookTarget);
      camXRef.current = _lookTarget.x; // keeps the traveling key light + DoF on subject
      // Composition: the live page overlays its headline block on the LEFT
      // ~40% of the hero. Shift the projection window so the subject sits
      // right-of-center, never behind the text.
      const w = state.size.width, h = state.size.height;
      (camera as THREE.PerspectiveCamera).setViewOffset(w, h, w * 0.12, 0, w, h);
      return;
    }

    const SWEEP_PERIOD = 34;
    const phase = (t % SWEEP_PERIOD) / SWEEP_PERIOD;
    // Triangle wave 0→1→0 across the runway, eased at the turnarounds
    const tri = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
    const eased = tri * tri * (3 - 2 * tri);
    const sweepX = -SWEEP_HALF + eased * SWEEP_HALF * 2;

    camXRef.current = sweepX;

    _camTarget.set(
      sweepX + noiseX(t * 0.05, 0, 0) * 1.1,
      4.6 + noiseY(0, t * 0.045, 0) * 0.5,
      13.5 + noiseZ(0, 0, t * 0.04) * 1.2
    );
    camera.position.lerp(_camTarget, 0.04);

    _lookTarget.set(sweepX * 0.55, 0.4, 0);
    camera.lookAt(_lookTarget);
  });

  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// Post-processing
// ──────────────────────────────────────────────────────────────────────────

const _dofTargetUnused = null;
const _dofTarget = new THREE.Vector3(0, 0.4, 0);

function PostFX({ camXRef }: { camXRef: React.MutableRefObject<number> }) {
  useFrame(() => {
    _dofTarget.x = camXRef.current * 0.55;
  });
  return (
    <EffectComposer multisampling={2}>
      {/* Screen-space AO — grounds the exploded layers against each other.
          CAPTURE-only: the pass costs too much frame time on mid-tier GPUs
          for the live page; the offline video carries the AO quality.
          (4× MSAA + "high" + dpr 1.5: 8×/ultra/dpr2 was 15s a frame and
          indistinguishable after the 1080p downscale.) */}
      {CAPTURE && <N8AO aoRadius={1.0} intensity={2.6} distanceFalloff={1.2} quality="performance" />}
      <DepthOfField target={_dofTarget} focalLength={0.055} bokehScale={2.4} height={480} />
      <Bloom luminanceThreshold={0.55} luminanceSmoothing={0.55} intensity={0.45} radius={1.1} mipmapBlur />
      <Vignette offset={0.32} darkness={0.55} eskil={false} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}


// ──────────────────────────────────────────────────────────────────────────
// Root
// ──────────────────────────────────────────────────────────────────────────

export default function GPUHeroScene() {
  const heroLevelRef = useRef(0.08);
  const phaseRef = useRef<Phase>('idle');
  const valuesRef = useRef({ level: 0.08, progress: 0 });
  const camXRef = useRef(0);

  useEffect(() => {
    // First-order RC thermal integration (see thermalModel.ts): junction
    // temp chases T_ref + R_θ·P with asymmetric heat/cool time constants,
    // power carries utilization ripple + discrete DVFS throttle steps, and
    // the sensor model quantizes to integer °C / W at 4 Hz like NVML.
    let raf = 0;
    const start = performance.now();
    let last = start;
    const sim = new ThermalSim(H100_SXM);
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { phase, progress } = modelPhaseAt(elapsed);
      const telem = sim.step(phase, progress, dt, elapsed);
      phaseRef.current = phase;
      heroLevelRef.current = telem.glow;
      _heroFanDuty.current = telem.fan;
      _heroTelem.current = telem;
      valuesRef.current = { level: telem.glow, progress };
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const textures = useMemo(() => ({
    pcb: makePCBTexture(),
    rough: makeRoughnessMap(),
    brushed: makeBrushedMetalTexture(),
    organic: makeOrganicSubstrateTexture(),
    decals: {
      a100:   makeProductTextDecal('NVIDIA',  'A100',                { color: '#76b900' }),
      l40s:   makeProductTextDecal('NVIDIA',  'L40S',                { color: '#76b900' }),
      h100:   makeProductTextDecal('NVIDIA',  'H100 SXM5',           { color: '#d8d8de' }),
      b200:   makeProductTextDecal('NVIDIA',  'B200 · BLACKWELL',    { color: '#d8d8de' }),
      mi300x: makeProductTextDecal('AMD INSTINCT', 'MI300X · CDNA 3', { color: '#e8e8ee' }),
    },
  }), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: CAPTURE ? '100vh' : '90vh', background: CINE.voidDeep }}>
      <Canvas
        shadows
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.72, outputColorSpace: THREE.SRGBColorSpace, preserveDrawingBuffer: CAPTURE }}
        dpr={CAPTURE ? 1 : [1, 1.6]}
        camera={{ position: [LINEUP_X0, 4.6, 14], fov: 38 }}
      >
        <color attach="background" args={[CINE.voidDeep]} />
        <Backdrop />
        <SceneLights camXRef={camXRef} />
        <Suspense fallback={null}>
          <GpuMapsProvider>
            <Runway textures={textures} />
            {GPU_SPECS.map((spec, i) => (
              <GPUCard key={spec.id} spec={spec} index={i} textures={textures} heroLevelRef={heroLevelRef} />
            ))}
          </GpuMapsProvider>
        </Suspense>
        <ContactShadows position={[0, -3.39, 0]} opacity={0.92} scale={80} blur={3.2} far={6} resolution={1024} color="#000000" />
        {/* Custom studio environment — replaces the stock warehouse HDRI.
            Five light formers model a product-photography rig: the long
            overhead softbox draws an unbroken specular band down every
            heatsink fin; the platinum + champagne side cards split the
            metals warm/cool; the rear horizon band gives fin edges a gold
            kiss. Reflections now match the scene's own lighting story.
            (Drop-in upgrade path: <Environment files="/textures/studio.hdr">
            swaps this for a generated HDRI with zero other changes.) */}
        <Environment resolution={256} environmentIntensity={0.45}>
          <Lightformer form="rect" intensity={3.4} color="#fff2dc" position={[0, 12, 2]}  scale={[26, 5]} />
          <Lightformer form="rect" intensity={1.1} color="#dfe7f2" position={[-16, 5, 6]} scale={[5, 9]} />
          <Lightformer form="rect" intensity={0.9} color="#d4af37" position={[15, 4, -4]} scale={[5, 7]} />
          <Lightformer form="rect" intensity={0.7} color="#c9a84c" position={[0, 2.2, -14]} scale={[34, 2.4]} />
          <Lightformer form="circle" intensity={0.35} color="#2c3340" position={[0, -8, 4]} scale={14} />
        </Environment>
        <CameraRig camXRef={camXRef} />
        <PostFX camXRef={camXRef} />
      </Canvas>


      {/* DOM overlays stay live in the video version too — excluded from
          capture so the recording is pure scene */}
      {!CAPTURE && <PhaseHUD phaseRef={phaseRef} valuesRef={valuesRef} />}
      {!CAPTURE && <LineupLabel />}
    </div>
  );
}
