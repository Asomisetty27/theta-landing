import * as React from 'react';
import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Environment, Html, Instances, Instance, Lightformer } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();

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

// ──────────────────────────────────────────────────────────────────────────
// Narrative state machine — one authored sequence, not a free orbit.
// Reuses the GPUHeroScene pattern: module-level mutable refs read inside
// useFrame, set from a single setTimeout/rAF chain — zero React re-renders
// driving the animation.
// ──────────────────────────────────────────────────────────────────────────

type Stage = 'establishing' | 'flythrough' | 'focus' | 'incident' | 'pullback';

// Shared physically-grounded thermal arc — see thermalModel.ts. Replaces the
// per-scene `level` script and the `0.071 + level * 0.024` readout, which
// showed R_θ rising with load (the opposite of Theta's actual claim).
import {
  ThermalSim,
  H100_SXM,
  PHASE_SEQUENCE,
  thermalRgb,
  thermalCss,
  fmtRth,
  fmtLead,
  type Phase,
  type Telemetry,
} from './thermalModel';

// Adapter over the model's pure-rgb ramp (the model is three-free).
const _thermalColor = new THREE.Color();
function thermalHex(t: number): THREE.Color {
  const [r, g, b] = thermalRgb(t);
  return _thermalColor.setRGB(r, g, b);
}

const _stage: { current: Stage } = { current: 'establishing' };
const _storyT = { current: 0 };          // 0..1 progress through the whole loop
const _hudOpacity = { current: 0 };
const _alertPulse = { current: 0 };

// Live telemetry from the incident sim — written by NarrativeDirector,
// read by DataCenterHUD (same module-ref pattern as _hudOpacity).
const _dcTelemetry: { current: Telemetry | null } = { current: null };

const LOOP_SECONDS = 36;

const STAGE_SEQUENCE: { stage: Stage; at: number }[] = [
  { stage: 'establishing', at: 0 },
  { stage: 'flythrough',   at: 6 },
  { stage: 'focus',        at: 14 },
  { stage: 'incident',     at: 18 },
  { stage: 'pullback',     at: 28 },
];

function spring(cur: number, target: number, delta: number, k: number): number {
  return cur + (target - cur) * (1 - Math.exp(-k * delta));
}

function stageAt(t: number): Stage {
  let s: Stage = STAGE_SEQUENCE[0].stage;
  for (const row of STAGE_SEQUENCE) {
    if (t >= row.at) s = row.stage;
  }
  return s;
}

// ──────────────────────────────────────────────────────────────────────────
// Procedural textures
// ──────────────────────────────────────────────────────────────────────────

function makeFaceplateTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#16161a';
  ctx.fillRect(0, 0, 256, 256);
  // Vent slats
  ctx.fillStyle = '#0c0c0f';
  for (let y = 18; y < 256; y += 14) {
    ctx.fillRect(12, y, 232, 6);
  }
  // Status LEDs — sparse, mostly green/amber dots near the left edge
  const ledColors = ['#D4AF37', '#D4AF37', '#D4AF37', '#C8942A', '#C9A84C'];
  for (let i = 0; i < 28; i++) {
    ctx.fillStyle = ledColors[Math.floor(Math.random() * ledColors.length)];
    ctx.beginPath();
    ctx.arc(20 + Math.random() * 8, 10 + Math.random() * 236, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Asset-tag stencil block
  ctx.fillStyle = 'rgba(232,232,240,0.18)';
  ctx.fillRect(190, 8, 50, 10);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
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

type Textures = { faceplate: THREE.CanvasTexture; rough: THREE.CanvasTexture };

// ──────────────────────────────────────────────────────────────────────────
// Layout — pure data: two facing rows of racks per aisle, several aisles
// receding into haze. RackUnit positions are generated once and reused both
// for the instanced frames/sleds and for picking the "hero" (focus) rack.
// ──────────────────────────────────────────────────────────────────────────

const RACK_W = 1.4;
const RACK_D = 1.1;
const RACK_H = 3.0;
const AISLE_GAP = 3.2;   // cold-aisle clearance between facing rows
const RACK_PITCH = 1.7;  // spacing between racks along a row
const RACKS_PER_ROW = 9;
const ROWS = 4;          // facing-row pairs, receding in +Z

type RackTransform = { pos: [number, number, number]; rotY: number; row: number; idx: number };

function buildAisleLayout(): RackTransform[] {
  const out: RackTransform[] = [];
  for (let row = 0; row < ROWS; row++) {
    const z = row * (AISLE_GAP + RACK_D * 2 + 2.4);
    for (let i = 0; i < RACKS_PER_ROW; i++) {
      const x = (i - (RACKS_PER_ROW - 1) / 2) * RACK_PITCH;
      // Row faces +Z (front row of the pair) and the mirrored row faces -Z
      out.push({ pos: [x, 0, z - AISLE_GAP / 2 - RACK_D / 2], rotY: Math.PI, row, idx: out.length });
      out.push({ pos: [x, 0, z + AISLE_GAP / 2 + RACK_D / 2], rotY: 0,        row, idx: out.length });
    }
  }
  return out;
}

const RACK_LAYOUT = buildAisleLayout();
// The hero rack: front-row, mid-aisle of the second row pair — close enough
// to the establishing camera path to read clearly during the focus pull.
const HERO_RACK_INDEX = RACK_LAYOUT.findIndex(
  (r) => r.row === 1 && Math.abs(r.pos[0]) < 0.1 && r.rotY === 0
);
const HERO_SLED_INDEX = 5; // which of the 8 sleds in the hero rack glows
const HERO_ROW = RACK_LAYOUT[HERO_RACK_INDEX].row;
// Z of the cold-aisle centerline for the hero's row pair — the corridor
// running between two facing rows, equidistant from both walls of racks.
const HERO_AISLE_Z = HERO_ROW * (AISLE_GAP + RACK_D * 2 + 2.4);
// Generous margin past the outermost rack column — gives the CatmullRom
// spline (which can overshoot between closely-spaced waypoints) room to
// breathe without its tangents swinging back through rack geometry.
const AISLE_X_START = -((RACKS_PER_ROW - 1) / 2) * RACK_PITCH - 3.2;

const SLEDS_PER_RACK = 8;
const SLED_H = 0.22;
const SLED_GAP = 0.06;

// ──────────────────────────────────────────────────────────────────────────
// Camera flight path — CatmullRom spline through the narrative beats.
// CameraRig walks a spring-eased path parameter `u` along it; look-targets
// are interpolated the same way rather than fixed, so transitions read as
// one continuous camera move, not cuts.
//
// The path is a there-and-back-again palindrome: outbound (establishing →
// hero rack, points 0-4) and return (hero rack → establishing, points 4-8)
// retrace the EXACT same waypoints in reverse. This isn't just symmetry for
// its own sake — it means the return leg inherits the outbound leg's safety
// guarantees for free: (1) while at altitude, stay ABOVE everything (y > 11
// — clears both RACK_H=3 and the ceiling trays at RACK_H+1.6) until already
// positioned over the open aisle mouth in X/Z, only dropping/climbing once
// clear; (2) at server height, travel the cold-aisle CENTERLINE (constant
// Z = HERO_AISLE_Z, equidistant from both facing rows' faces — no rack
// origin sits on this line). Point 8 is identical to point 0 (and look-point
// 8 to look-point 0), so u=1 and u=0 are the same camera pose — the loop
// seam is a true match-cut, not a jump.
// ──────────────────────────────────────────────────────────────────────────

const ESTABLISHING_POS  = new THREE.Vector3(0, 14, -10);
const MOUTH_HIGH_POS    = new THREE.Vector3(AISLE_X_START, 12, HERO_AISLE_Z);
const MOUTH_LOW_POS     = new THREE.Vector3(AISLE_X_START, 1.7, HERO_AISLE_Z);
const CORRIDOR_POS      = new THREE.Vector3(-1.4, 1.6, HERO_AISLE_Z);
const HERO_ARRIVAL_POS  = new THREE.Vector3(0.6, 1.55, HERO_AISLE_Z);

const FLIGHT_POINTS = [
  ESTABLISHING_POS,   // 0 establishing — high overview
  MOUTH_HIGH_POS,     // 1 slide laterally to the aisle mouth, staying high & clear
  MOUTH_LOW_POS,      // 2 drop straight down into the open aisle entrance
  CORRIDOR_POS,       // 3 glide down the corridor centerline toward the hero rack
  HERO_ARRIVAL_POS,   // 4 arrived alongside the hero rack — hold through the incident
  CORRIDOR_POS,       // 5 retreat back down the centerline (mirror of 3)
  MOUTH_LOW_POS,      // 6 retreat to the aisle mouth (mirror of 2)
  MOUTH_HIGH_POS,     // 7 climb back to altitude — same safe vertical gate (mirror of 1)
  ESTABLISHING_POS,   // 8 back to establishing — loop seam, identical pose to point 0
];
const FLIGHT_CURVE = new THREE.CatmullRomCurve3(FLIGHT_POINTS, false, 'catmullrom', 0.4);

const OVERVIEW_LOOK  = new THREE.Vector3(0, 0, RACK_LAYOUT[ROWS - 1].pos[2] * 0.5);
const CORRIDOR_LOOK  = new THREE.Vector3(AISLE_X_START + 4, 1.6, HERO_AISLE_Z);
const TRACKING_LOOK  = new THREE.Vector3(-0.6, 1.5, HERO_AISLE_Z);
const HERO_LOOK      = new THREE.Vector3(...RACK_LAYOUT[HERO_RACK_INDEX].pos);

const LOOK_POINTS = [
  OVERVIEW_LOOK,   // 0 wide overview
  CORRIDOR_LOOK,   // 1 looking down the corridor ahead
  TRACKING_LOOK,   // 2 still tracking forward down the centerline
  HERO_LOOK,       // 3 focus pull — onto the hero rack
  HERO_LOOK,       // 4 hold on the hero rack through arrival
  HERO_LOOK,       // 5 still holding as the pull-away begins
  TRACKING_LOOK,   // 6 glancing back down the centerline (mirror of 2)
  CORRIDOR_LOOK,   // 7 corridor recedes behind (mirror of 1)
  OVERVIEW_LOOK,   // 8 wide overview — loop seam, identical to look-point 0
];
const LOOK_CURVE = new THREE.CatmullRomCurve3(LOOK_POINTS, false, 'catmullrom', 0.4);

// Maps story-time (seconds, 0..LOOP_SECONDS) to a 0..1 spline parameter `u`.
// Because the path is a palindrome through 9 points, u=0.5 lands exactly on
// the hero rack (point 4) — that's the anchor "incident" pins to. The first
// half (0 -> 0.5) is the approach; the second half (0.5 -> 1.0) retraces it
// home. Stage boundaries pin specific u-values so "arrival" lands on the
// hero rack regardless of spring easing.
const U_AT_STAGE: Record<Stage, number> = {
  establishing: 0.0,
  flythrough:   0.27,   // arriving at the aisle mouth, beginning the descent
  focus:        0.46,   // down the corridor, closing in on the hero rack
  incident:     0.50,   // arrived — hold here through the anomaly
  pullback:     0.70,   // pulling away, partway back down the corridor
};

function storyU(t: number): number {
  // Piecewise-linear interpolation between the named stage anchors —
  // smooth enough once spring-eased in CameraRig, and keeps "arrival"
  // deterministic rather than drifting with frame-rate.
  for (let i = 0; i < STAGE_SEQUENCE.length - 1; i++) {
    const a = STAGE_SEQUENCE[i];
    const b = STAGE_SEQUENCE[i + 1];
    if (t >= a.at && t <= b.at) {
      const local = (t - a.at) / (b.at - a.at);
      return THREE.MathUtils.lerp(U_AT_STAGE[a.stage], U_AT_STAGE[b.stage], local);
    }
  }
  // Pullback → loop seam: finish retracing the path home (u: pullback -> 1.0).
  // u=1.0 is point 8, identical in pose to point 0/u=0.0 — so the wrap at
  // the loop restart is a match-cut, not a jump.
  const last = STAGE_SEQUENCE[STAGE_SEQUENCE.length - 1];
  const local = THREE.MathUtils.clamp((t - last.at) / (LOOP_SECONDS - last.at), 0, 1);
  return THREE.MathUtils.lerp(U_AT_STAGE.pullback, 1.0, local);
}

// ──────────────────────────────────────────────────────────────────────────
// RackUnit — instanced frame + sled grid. Two Instances pools (frame, sled)
// keep the whole aisle to two draw calls regardless of rack count; the hero
// sled is rendered as a single emissive-capable mesh layered on top so it
// can run the thermal material independent of the instanced batch.
// ──────────────────────────────────────────────────────────────────────────

function RackFrames({ textures }: { textures: Textures }) {
  return (
    <Instances limit={RACK_LAYOUT.length} range={RACK_LAYOUT.length}>
      <boxGeometry args={[RACK_W, RACK_H, RACK_D]} />
      <meshStandardMaterial
        color="#1a1a1e"
        roughness={0.5}
        metalness={0.55}
        roughnessMap={textures.rough}
        envMapIntensity={0.9}
      />
      {RACK_LAYOUT.map((r) => (
        <Instance key={r.idx} position={[r.pos[0], RACK_H / 2, r.pos[2]]} rotation={[0, r.rotY, 0]} />
      ))}
    </Instances>
  );
}

function RackFaceplates({ textures }: { textures: Textures }) {
  // One faceplate per rack (front face only, offset toward the cold aisle).
  const items = useMemo(
    () =>
      RACK_LAYOUT.map((r) => {
        // Front faces the cold-aisle centerline, not the outer wall: the
        // rotY===0 (north-wall) row's front is on its -Z side, and the
        // rotY===π (south-wall) row's front is on its +Z side — opposite
        // of a naive "rotation matches facing sign" assumption.
        const facing = r.rotY === 0 ? -1 : 1;
        return {
          idx: r.idx,
          pos: [r.pos[0], RACK_H / 2, r.pos[2] + (facing * RACK_D) / 2 + 0.01 * facing] as [number, number, number],
          rotY: r.rotY,
        };
      }),
    []
  );
  return (
    <Instances limit={items.length} range={items.length}>
      <planeGeometry args={[RACK_W * 0.92, RACK_H * 0.94]} />
      <meshStandardMaterial
        map={textures.faceplate}
        roughness={0.6}
        metalness={0.2}
        envMapIntensity={0.5}
        side={THREE.DoubleSide}
      />
      {items.map((it) => (
        <Instance key={it.idx} position={it.pos} rotation={[0, it.rotY, 0]} />
      ))}
    </Instances>
  );
}

// The single sled that carries the incident — its own mesh + material so the
// thermal emissive can be driven every frame without touching the instanced
// batch (same isolation GPUHeroScene uses for DieLayer vs. the static layers).
function HeroSled({ thermalLevelRef }: { thermalLevelRef: React.MutableRefObject<number> }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const rack = RACK_LAYOUT[HERO_RACK_INDEX];
  const facing = rack.rotY === 0 ? -1 : 1; // matches RackFaceplates' aisle-facing convention
  const yOffset = -RACK_H / 2 + 0.4 + HERO_SLED_INDEX * (SLED_H + SLED_GAP);

  useFrame(() => {
    if (matRef.current) {
      const t = thermalLevelRef.current;
      matRef.current.emissive.copy(thermalHex(t));
      matRef.current.emissiveIntensity = 0.3 + t * t * 2.2;
    }
  });

  return (
    <group position={[rack.pos[0], RACK_H / 2 + yOffset, rack.pos[2]]} rotation={[0, rack.rotY, 0]}>
      <RoundedBox args={[RACK_W * 0.86, SLED_H, RACK_D * 0.7]} radius={0.02} smoothness={2} position={[0, 0, (facing * RACK_D * 0.12)]}>
        <meshStandardMaterial ref={matRef} color="#0d0d10" roughness={0.7} metalness={0.2} emissive="#1c6b3a" emissiveIntensity={0.3} />
      </RoundedBox>
      <LayerLabel text="NODE B07-04 · GPU 3" sub="theta · live R_θ" />
    </group>
  );
}

function LayerLabel({ text, sub }: { text: string; sub?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useFrame(() => {
    if (wrapRef.current) wrapRef.current.style.opacity = String(_hudOpacity.current);
  });
  return (
    <Html occlude={false} center={false} style={{ pointerEvents: 'none', userSelect: 'none' }} position={[0.9, 0.3, 0]}>
      <div ref={wrapRef} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.22)' }} />
        <div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 8.5, fontFamily: FM, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
            {text}
          </div>
          {sub && (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 7.5, fontFamily: FM, whiteSpace: 'nowrap', marginTop: 2 }}>
              {sub}
            </div>
          )}
        </div>
      </div>
    </Html>
  );
}

// Pulsing alert ring around the hero rack — DOM-overlay technique ported
// from ThermalGPUMap (scale-pulse driven by a sine, opacity gated by stage).
function AlertRing() {
  const ref = useRef<HTMLDivElement>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const show = _stage.current === 'incident';
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.4 * Math.PI * 2) * 0.08;
    ref.current.style.opacity = show ? String(0.25 + _alertPulse.current * 0.5) : '0';
    ref.current.style.transform = `translate(-50%, -50%) scale(${pulse})`;
  });
  const rack = RACK_LAYOUT[HERO_RACK_INDEX];
  return (
    <Html occlude={false} center position={[rack.pos[0], RACK_H * 0.5, rack.pos[2]]} style={{ pointerEvents: 'none' }}>
      <div
        ref={ref}
        style={{
          width: 180,
          height: 220,
          borderRadius: 18,
          border: `2px solid ${T.critical}`,
          boxShadow: `0 0 36px ${T.critical}`,
          opacity: 0,
        }}
      />
    </Html>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Floor / ceiling / haze — cheap depth treatment so racks recede convincingly
// without per-object LOD switching.
// ──────────────────────────────────────────────────────────────────────────

function Environment3D({ textures }: { textures: Textures }) {
  const farZ = RACK_LAYOUT[RACK_LAYOUT.length - 1].pos[2] + 14;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, farZ / 2 - 6]}>
        <planeGeometry args={[40, farZ + 30]} />
        <meshStandardMaterial color="#101015" roughness={0.35} metalness={0.4} roughnessMap={textures.rough} envMapIntensity={0.6} />
      </mesh>
      {/* Ceiling cable trays — coarse strips, just enough to read as infrastructure */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-9 + i * 3.6, RACK_H + 1.6, farZ / 2 - 6]}>
          <boxGeometry args={[0.18, 0.1, farZ + 24]} />
          <meshStandardMaterial color="#0c0c10" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}
      {/* Aisle light fixtures — segmented troffers (not continuous bars), the
          visible counterparts to the environment-map strips. Tone-mapped so
          ACES rolls them off instead of clipping to white. */}
      {[-0.9, 0.9].flatMap((x) =>
        Array.from({ length: Math.ceil((farZ + 18) / 4.2) }).map((_, s) => (
          <mesh key={`bar-${x}-${s}`} position={[x, RACK_H + 1.45, -12 + s * 4.2]}>
            <boxGeometry args={[0.12, 0.025, 2.0]} />
            <meshBasicMaterial color="#b7c6e4" />
          </mesh>
        ))
      )}
      <fogExp2 attach="fog" args={[T.bg, 0.018]} />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Lighting — sparse cool-aisle strips rather than one center glow; the
// thermal point light tracks the hero rack so the incident reads as a
// localized event in an otherwise calm room.
// ──────────────────────────────────────────────────────────────────────────

function SceneLights({ thermalLevelRef }: { thermalLevelRef: React.MutableRefObject<number> }) {
  const thermalRef = useRef<THREE.PointLight>(null!);
  const hero = RACK_LAYOUT[HERO_RACK_INDEX];

  useFrame(() => {
    const t = thermalLevelRef.current;
    if (thermalRef.current) {
      thermalRef.current.color.copy(thermalHex(t));
      thermalRef.current.intensity = 1.2 + t * 9;
    }
  });

  return (
    <>
      <rectAreaLight position={[0, RACK_H + 4, -4]} rotation={[Math.PI / 2, 0, 0]} width={6} height={3} intensity={9} color="#bcd4ff" />
      <rectAreaLight position={[0, RACK_H + 4, RACK_LAYOUT[ROWS - 1].pos[2]]} rotation={[Math.PI / 2, 0, 0]} width={6} height={3} intensity={6} color="#9ec0ff" />
      <pointLight position={[-4, 4, RACK_LAYOUT[1].pos[2]]} intensity={2.4} color="#7fa8e0" distance={14} decay={2} />
      <pointLight position={[4, 4, RACK_LAYOUT[2].pos[2]]} intensity={2.0} color="#7fa8e0" distance={14} decay={2} />
      <pointLight ref={thermalRef} position={[hero.pos[0], RACK_H * 0.6, hero.pos[2]]} distance={6} decay={2} />
      <ambientLight intensity={0.05} />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// CameraRig — walks the flight spline; `u` is spring-eased toward the
// story-time-derived target so stage transitions read as one continuous
// move rather than a cut. Look-target follows the companion spline.
// ──────────────────────────────────────────────────────────────────────────

function CameraRig() {
  const { camera } = useThree();
  const uState = useRef(0);
  const lookTmp = useRef(new THREE.Vector3());
  const posTmp = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    const target = storyU(_storyT.current);
    uState.current = spring(uState.current, target, delta, 1.1);
    const u = THREE.MathUtils.clamp(uState.current, 0, 1);

    FLIGHT_CURVE.getPointAt(u, posTmp.current);
    LOOK_CURVE.getPointAt(u, lookTmp.current);

    camera.position.copy(posTmp.current);
    camera.lookAt(lookTmp.current);
  });

  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// Post-processing — same chain as GPUHeroScene; lower bloom threshold so
// only the hero sled's emissive blooms, not the whole rack wall.
// ──────────────────────────────────────────────────────────────────────────

const _caOffset = new THREE.Vector2(0.0007, 0.0007);

function PostFX({ bloomRef }: { bloomRef: React.MutableRefObject<number> }) {
  const bloomEffectRef = useRef<any>(null);
  useFrame(() => {
    if (bloomEffectRef.current) bloomEffectRef.current.intensity = bloomRef.current;
  });
  return (
    <EffectComposer multisampling={0}>
      {/* N8AO removed from the live path — it pushed frame time past budget
          on mid-tier GPUs (visible lag). It returns in the offline-capture
          pass when this scene gets the video treatment. */}
      <Bloom ref={bloomEffectRef} luminanceThreshold={0.32} luminanceSmoothing={0.2} intensity={0.5} radius={0.45} mipmapBlur />
      <ChromaticAberration offset={_caOffset} blendFunction={BlendFunction.NORMAL} radialModulation={false} modulationOffset={0.15} />
      <Vignette offset={0.32} darkness={0.55} eskil={false} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// NarrativeDirector — the data-center analogue of GPUAssembly's useFrame
// block: one orchestration point owning story time, stage, thermal level,
// HUD visibility, and alert pulse. Everything else just reads these refs.
// ──────────────────────────────────────────────────────────────────────────

function NarrativeDirector({
  thermalLevelRef,
  bloomRef,
  phaseRef,
  valuesRef,
}: {
  thermalLevelRef: React.MutableRefObject<number>;
  bloomRef: React.MutableRefObject<number>;
  phaseRef: React.MutableRefObject<Phase>;
  valuesRef: React.MutableRefObject<{ level: number; progress: number }>;
}) {
  const phaseIdx = useRef(0);
  const phaseStart = useRef(0);
  const sim = useRef<ThermalSim | null>(null);
  if (!sim.current) sim.current = new ThermalSim(H100_SXM);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime % LOOP_SECONDS;
    _storyT.current = t;
    const stage = stageAt(t);
    _stage.current = stage;

    // HUD fades in on focus, out on pullback/establishing
    const hudTarget = stage === 'focus' || stage === 'incident' ? 1 : 0;
    _hudOpacity.current = THREE.MathUtils.clamp(
      _hudOpacity.current + (hudTarget - _hudOpacity.current) * Math.min(1, delta * 2.2),
      0,
      1
    );

    // Thermal arc — the incident sim only advances phases during the
    // incident stage; everywhere else the node physically cools toward idle
    // (real RC decay, not a spring on an abstract level).
    if (stage === 'incident' || stage === 'focus') {
      const cur = PHASE_SEQUENCE[phaseIdx.current];
      const elapsed = t - phaseStart.current;
      const progress = THREE.MathUtils.clamp(elapsed / cur.dur, 0, 1);
      phaseRef.current = cur.phase;

      const telem = sim.current!.step(cur.phase, progress, delta, state.clock.elapsedTime);
      _dcTelemetry.current = telem;
      thermalLevelRef.current = telem.glow;
      valuesRef.current = { level: telem.glow, progress };
      _alertPulse.current = cur.phase === 'anomaly' || cur.phase === 'critical' ? 1 : 0.3;

      if (elapsed >= cur.dur && stage === 'incident') {
        phaseIdx.current = (phaseIdx.current + 1) % PHASE_SEQUENCE.length;
        phaseStart.current = t;
      }
    } else {
      // Calm stages: workload drained, cooling path healthy — the sim keeps
      // integrating so the sled's glow decays on the real thermal curve.
      phaseIdx.current = 0;
      phaseStart.current = STAGE_SEQUENCE.find((s) => s.stage === 'incident')!.at;
      phaseRef.current = 'idle';
      const telem = sim.current!.step('idle', 1, delta, state.clock.elapsedTime);
      _dcTelemetry.current = telem;
      thermalLevelRef.current = telem.glow;
      valuesRef.current = { level: telem.glow, progress: 0 };
      _alertPulse.current = spring(_alertPulse.current, 0, delta, 2);
    }

    bloomRef.current = 0.25 + thermalLevelRef.current * thermalLevelRef.current * 1.6;
  });

  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// HUD — Theta readout, appears during focus/incident. Ported structure from
// GPUHeroScene's PhaseHUD; copy rewritten for a fleet-monitoring framing.
// ──────────────────────────────────────────────────────────────────────────

export function DataCenterHUD({
  phaseRef,
  valuesRef,
  scale = 1,
}: {
  phaseRef: React.MutableRefObject<Phase>;
  valuesRef: React.MutableRefObject<{ level: number; progress: number }>;
  scale?: number;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 120);
    return () => clearInterval(id);
  }, []);

  const phase = phaseRef.current;
  const { level, progress } = valuesRef.current;
  const telem = _dcTelemetry.current;
  const isCritical = phase === 'critical';
  const tColor = thermalCss(level);

  // Physically-derived readouts: integer-°C NVML-style sensor values, and
  // R_θ computed as (T_j − T_ref)/P so the numbers on screen always satisfy
  // the formula the page teaches. Falls back to idle figures pre-first-frame.
  const Tj     = telem ? `${telem.tjSensor}` : '37';
  const Rtheta = telem ? fmtRth(telem.rthSensor) : '0.072';
  const Pw     = telem ? `${telem.pSensor}` : '84';
  const lead   = telem ? fmtLead(telem.leadMin) : '—';

  const labelMap: Record<Phase, string> = {
    idle: 'NOMINAL', load: 'UNDER LOAD', anomaly: 'R_θ DRIFT DETECTED',
    critical: 'INCIDENT — ACTING', recovery: 'RESOLVING',
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 24 * scale,
      right: 24 * scale,
      width: 248 * scale,
      padding: `${10 * scale}px ${12 * scale}px`,
      background: 'rgba(6,6,10,0.88)',
      backdropFilter: 'blur(8px)',
      border: `1px solid ${isCritical ? T.critical : T.border}`,
      borderRadius: 6,
      fontFamily: FM,
      color: T.text,
      fontSize: 9 * scale,
      lineHeight: 1.7,
      boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
      pointerEvents: 'none',
      opacity: _hudOpacity.current,
      transition: 'opacity 0.6s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: T.muted, fontSize: 8 * scale, letterSpacing: '0.14em' }}>THETA · NODE B07-04</span>
        <span style={{ color: isCritical ? T.critical : tColor, fontWeight: 700, fontSize: 9 * scale, letterSpacing: '0.06em' }}>
          ● {labelMap[phase]}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: T.muted }}>T_junction</span>
        <span style={{ color: tColor }}>{Tj} °C</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: T.muted }}>Power</span>
        <span style={{ color: T.text }}>{Pw} W{telem?.throttled ? ' · DVFS' : ''}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: T.muted }}>R_θ_eff{telem?.rthStale ? ' · settling' : ''}</span>
        <span style={{ color: telem?.rthStale ? T.muted : T.text }}>{Rtheta} °C/W</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ color: T.muted }}>Est. lead time</span>
        <span style={{ color: T.bp }}>{lead}</span>
      </div>
      <div style={{ height: 2, background: T.s1, borderRadius: 1, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: tColor, transition: 'width 0.12s linear' }} />
      </div>
    </div>
  );
}

export function DataCenterCaption() {
  const [stage, setStage] = useState<Stage>('establishing');
  useEffect(() => {
    const id = setInterval(() => setStage(_stage.current), 200);
    return () => clearInterval(id);
  }, []);
  const copy: Record<Stage, string> = {
    establishing: 'A fleet of GPUs, running flat out.',
    flythrough:   'Theta watches every node — not just util and power.',
    focus:        'One node’s thermal path is starting to drift.',
    incident:     'R_θ catches it before throttling does — with lead time to act.',
    pullback:     'Theta is watching every node like this, all the time.',
  };
  return (
    <div style={{
      position: 'absolute', bottom: 24, left: 24,
      fontFamily: FM, fontSize: 11, letterSpacing: '0.02em',
      color: T.text, opacity: 0.8, maxWidth: 360,
      pointerEvents: 'none', textShadow: '0 2px 12px rgba(0,0,0,0.7)',
      transition: 'opacity 0.6s ease',
    }}>
      {copy[stage]}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Root scene — the shared 3D content. Wrappers (Showcase / Kiosk) decide
// canvas sizing, HUD scale, and chrome around this.
// ──────────────────────────────────────────────────────────────────────────

export default function DataCenterScene({ hudScale = 1 }: { hudScale?: number }) {
  const thermalLevelRef = useRef(0.1);
  const bloomRef        = useRef(0.25);
  const phaseRef        = useRef<Phase>('idle');
  const valuesRef       = useRef({ level: 0.1, progress: 0 });

  useEffect(() => {
    _stage.current = 'establishing';
    _storyT.current = 0;
    _hudOpacity.current = 0;
    _alertPulse.current = 0;
  }, []);

  const textures = useMemo(() => ({ faceplate: makeFaceplateTexture(), rough: makeRoughnessMap() }), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: T.bg }}>
      <Canvas
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, outputColorSpace: THREE.SRGBColorSpace }}
        dpr={[1, 2]}
        camera={{ position: FLIGHT_POINTS[0].toArray(), fov: 42 }}
      >
        <color attach="background" args={[T.bg]} />
        <SceneLights thermalLevelRef={thermalLevelRef} />
        <Environment3D textures={textures} />
        <RackFrames textures={textures} />
        <RackFaceplates textures={textures} />
        <HeroSled thermalLevelRef={thermalLevelRef} />
        <AlertRing />
        {/* Custom cold-aisle environment — replaces the stock warehouse HDRI.
            Repeating overhead strips down the aisle put the datacenter's
            signature blue-white bands into every faceplate and rail
            reflection; the faint warm rear former separates the hot aisle.
            (Drop-in upgrade path: <Environment files="..."> swaps in a
            generated HDRI with zero other changes.) */}
        <Environment resolution={256} environmentIntensity={0.75}>
          {[0, 9, 18, 27].map((z) => (
            <Lightformer key={z} form="rect" intensity={2.6} color="#cfdcf2"
              position={[0, 9, z]} scale={[2.6, 10]} target={[0, 0, z]} />
          ))}
          <Lightformer form="rect" intensity={0.5} color="#dfe7f2" position={[-18, 4, 10]} scale={[4, 24]} />
          <Lightformer form="rect" intensity={0.5} color="#dfe7f2" position={[18, 4, 10]} scale={[4, 24]} />
          <Lightformer form="rect" intensity={0.35} color="#3a2c1c" position={[0, 3, 40]} scale={[30, 6]} />
        </Environment>
        <CameraRig />
        <NarrativeDirector thermalLevelRef={thermalLevelRef} bloomRef={bloomRef} phaseRef={phaseRef} valuesRef={valuesRef} />
        <PostFX bloomRef={bloomRef} />
      </Canvas>

      <DataCenterHUD phaseRef={phaseRef} valuesRef={valuesRef} scale={hudScale} />
      <DataCenterCaption />
    </div>
  );
}
