import * as React from 'react';
import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Environment, ContactShadows } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  DepthOfField,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { createNoise3D } from 'simplex-noise';

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

// ──────────────────────────────────────────────────────────────────────────
// Shared thermal driver — module-level mutable refs, written once per frame
// by ThermalDriver (inside the Canvas, via useFrame) and read by BOTH the
// emissive accents here AND <OperatorPanel>'s DOM readouts. Same single-
// clock-two-renderers pattern as DataCenterHUD/Caption. The chassis
// stays metal in EVERY phase — only LED strips, heat-pipe indicators,
// and the internal-glow vent change color.
// ──────────────────────────────────────────────────────────────────────────

import {
  ThermalSim,
  H100_SXM,
  phaseAt,
  thermalHex as _thermalHexImpl,
  fmtRth,
  type Phase as PhaseT,
  type Telemetry,
} from './thermalModel';

export type Phase = PhaseT;
export type AlertLogEntry = { id: number; t: string; phase: Phase; node: string; rtheta: string; msg: string };

export const HERO_NODE_ID = 'G-04';

export const _towerLevel = { current: 0.1 };
export const _towerPhase: { current: Phase } = { current: 'idle' };
export const _towerProgress = { current: 0 };
export const _alertLog: { current: AlertLogEntry[] } = { current: [] };

// Live physically-derived telemetry — written by ThermalDriver each frame,
// read by OperatorPanel and the HUD layers. See thermalModel.ts for why the
// old `0.071 + level * 0.024` readouts were physically wrong (R_θ must stay
// FLAT under healthy load — that's the product's core claim).
export const _towerTelemetry: { current: Telemetry } = {
  current: {
    tj: 37, tjSensor: 37, p: 84, pSensor: 84,
    rthTrue: H100_SXM.rthBase, rthSensor: H100_SXM.rthBase, rthStale: false,
    glow: 0.12, fan: 0.12, throttled: false, leadMin: null,
  },
};

// Re-export so existing importers keep a single path.
export const thermalHex = _thermalHexImpl;

const ALERT_COPY: Partial<Record<Phase, string>> = {
  load:     'Utilization ramped — thermal path nominal',
  anomaly:  'R_θ drift detected — cooling path degrading',
  critical: 'HIGH R_θ — auto-throttle engaged',
  recovery: 'R_θ trending back to baseline',
};

let _alertSeq = 0;

function pushAlert(phase: Phase, rthSensor: number) {
  const msg = ALERT_COPY[phase];
  if (!msg) return;
  _alertSeq += 1;
  const entry: AlertLogEntry = {
    id: _alertSeq,
    t: new Date().toLocaleTimeString('en-US', { hour12: false }),
    phase, node: HERO_NODE_ID, rtheta: fmtRth(rthSensor), msg,
  };
  _alertLog.current = [entry, ..._alertLog.current].slice(0, 6);
}

const _sim = new ThermalSim(H100_SXM);

function ThermalDriver() {
  const lastIdx = useRef(-1);
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const { idx, phase, progress } = phaseAt(t);
    const telem = _sim.step(phase, progress, delta, t);
    _towerTelemetry.current = telem;
    _towerLevel.current = telem.glow;
    _towerPhase.current = phase;
    _towerProgress.current = progress;
    if (idx !== lastIdx.current) {
      lastIdx.current = idx;
      pushAlert(phase, telem.rthSensor);
    }
  });
  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// Service-sequence driver — plays once when the section scrolls into view:
// front mesh door swings, hero sled extends on rails, lid hinges up,
// exposing the HGX baseboard for the heatmap + shimmer to overlay.
// Triggered from outside by setting _seqTriggered = true (intersection
// observer in root component); driver latches the start time off the R3F
// clock so timing is independent of React render cadence.
// ──────────────────────────────────────────────────────────────────────────

export const _doorOpen = { current: 0 };
export const _sledOut = { current: 0 };
export const _lidOpen = { current: 0 };
export const _seqTriggered = { current: false };
let _seqStart = -1;

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeOutQuad = (x: number) => 1 - (1 - x) * (1 - x);

// Damped spring: 0..0.85 eases up to a 4% overshoot, 0.85..1 settles back.
// Reads as a real sprung hinge instead of a CSS transition.
function springEase(x: number, overshoot = 1.04): number {
  const k = THREE.MathUtils.clamp(x, 0, 1);
  if (k < 0.85) return easeOutCubic(k / 0.85) * overshoot;
  const u = (k - 0.85) / 0.15;
  return overshoot + (1 - overshoot) * easeOutQuad(u);
}

// Lid two-stage: unlatch to 15%, pause (the click), lift with 2% overshoot,
// settle back. Total ~1.95 s.
function lidEase(dt: number): number {
  const unlatch = 0.55, pause = 0.15, lift = 1.0, settle = 0.25;
  const t1 = unlatch;
  const t2 = t1 + pause;
  const t3 = t2 + lift;
  const t4 = t3 + settle;
  if (dt <= 0) return 0;
  if (dt < t1) return 0.15 * easeOutCubic(dt / t1);
  if (dt < t2) return 0.15;
  if (dt < t3) return 0.15 + (1.02 - 0.15) * easeOutCubic((dt - t2) / lift);
  if (dt < t4) return 1.02 + (1 - 1.02) * easeOutQuad((dt - t3) / settle);
  return 1;
}

// Sled: ease-out cubic + a tiny rail-lock snap at the end.
function sledEase(dt: number): number {
  const u = THREE.MathUtils.clamp(dt / 1.7, 0, 1);
  const base = easeOutCubic(u);
  const snap = u > 0.94 ? Math.sin((u - 0.94) * 60) * 0.014 * (1 - u) : 0;
  return THREE.MathUtils.clamp(base + snap, 0, 1.014);
}

function SequenceDriver() {
  useFrame((state) => {
    if (!_seqTriggered.current) return;
    if (_seqStart < 0) _seqStart = state.clock.elapsedTime;
    const dt = state.clock.elapsedTime - _seqStart;
    // Stagger so each stage starts where the previous one is visually
    // committed: sled begins when the door is ~75% open (rail mouth clear),
    // lid begins right as the sled finishes its rail-lock snap.
    _doorOpen.current = springEase(THREE.MathUtils.clamp(dt / 1.5, 0, 1));
    _sledOut.current  = sledEase(dt - 1.1);
    _lidOpen.current  = lidEase(dt - 2.85);

    // Dynamic DoF: pull focus from rack-front toward baseboard, then toward
    // the front hero die as the lid opens. Mutate the existing Vector3
    // reference so PostFX picks it up without re-creating the effect.
    const sP = THREE.MathUtils.clamp(_sledOut.current, 0, 1);
    const lP = THREE.MathUtils.clamp(_lidOpen.current, 0, 1);
    _dofTarget.set(
      -1.05,
      1.55 + 0.13 * sP + 0.04 * lP,
      0.55 + 0.50 * sP + 0.06 * lP,
    );
  });
  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// PBR texture pipeline — every map procedurally generated to keep the
// "no imported binary assets" convention, but pushed to the resolution and
// detail density needed to read as a real machine instead of a diagram.
//
// Per-map design notes (each is what its name says, not a stand-in):
//   baseColor  — dark anthracite with subtle hue variation + faint smudges
//   roughness  — uneven, with scratches, dust patches, fingerprint smears
//   normal     — panel seams (recessed), screw bevels, vent slat shadows,
//                random micro-scratch bumps
//   ao         — edge darkening at seams, recessed vent shadows, screw
//                wells, corner contact darkening
//
// Together these give a chassis that responds to HDRI light like real
// brushed metal — not "color × constant roughness" plastic.
// ──────────────────────────────────────────────────────────────────────────

const CHASSIS_TEX_SIZE = 1024;

function makeChassisBaseColor(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = CHASSIS_TEX_SIZE;
  const ctx = c.getContext('2d')!;
  // Base anthracite with subtle vertical brushed-metal gradient
  const g = ctx.createLinearGradient(0, 0, 0, CHASSIS_TEX_SIZE);
  g.addColorStop(0, '#1a1a1f');
  g.addColorStop(0.5, '#16161a');
  g.addColorStop(1, '#13131a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CHASSIS_TEX_SIZE, CHASSIS_TEX_SIZE);
  // Faint horizontal brushed-grain striations
  ctx.globalAlpha = 0.04;
  for (let y = 0; y < CHASSIS_TEX_SIZE; y += 1) {
    ctx.fillStyle = Math.random() > 0.5 ? '#22222a' : '#0e0e12';
    ctx.fillRect(0, y, CHASSIS_TEX_SIZE, 1);
  }
  ctx.globalAlpha = 1;
  // Sparse darker smudges (fingerprints / handling marks)
  for (let i = 0; i < 22; i++) {
    const x = Math.random() * CHASSIS_TEX_SIZE;
    const y = Math.random() * CHASSIS_TEX_SIZE;
    const r = 30 + Math.random() * 60;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(8,8,12,0.18)');
    grd.addColorStop(1, 'rgba(8,8,12,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // Tiny warning/asset labels — too small to read, exactly right
  ctx.fillStyle = 'rgba(232,232,240,0.22)';
  ctx.fillRect(60, 80, 110, 16);
  ctx.fillStyle = 'rgba(200,148,42,0.18)';
  ctx.fillRect(180, 80, 26, 16);
  ctx.fillStyle = 'rgba(232,232,240,0.12)';
  ctx.font = '11px monospace';
  ctx.fillText('CAUTION · HOT SURFACE', 60, 124);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeChassisRoughness(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = CHASSIS_TEX_SIZE;
  const ctx = c.getContext('2d')!;
  // Base roughness ~0.55 (mid-rough metal, not mirror, not chalk)
  ctx.fillStyle = '#8e8e8e';
  ctx.fillRect(0, 0, CHASSIS_TEX_SIZE, CHASSIS_TEX_SIZE);
  // Dust patches → rougher (brighter)
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * CHASSIS_TEX_SIZE;
    const y = Math.random() * CHASSIS_TEX_SIZE;
    const r = 50 + Math.random() * 90;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(195,195,195,0.5)');
    grd.addColorStop(1, 'rgba(195,195,195,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // Fine scratches → smoother (darker streaks)
  ctx.strokeStyle = 'rgba(60,60,60,0.35)';
  for (let i = 0; i < 180; i++) {
    ctx.lineWidth = 0.4 + Math.random() * 0.7;
    const x = Math.random() * CHASSIS_TEX_SIZE;
    const y = Math.random() * CHASSIS_TEX_SIZE;
    const len = 20 + Math.random() * 80;
    const ang = (Math.random() - 0.5) * 0.3; // mostly-horizontal scratches
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  // Pixel-grain noise (per-pixel high-frequency variation)
  const img = ctx.getImageData(0, 0, CHASSIS_TEX_SIZE, CHASSIS_TEX_SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 28;
    img.data[i]   = THREE.MathUtils.clamp(img.data[i]   + n, 40, 230);
    img.data[i+1] = img.data[i];
    img.data[i+2] = img.data[i];
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeChassisNormal(): THREE.CanvasTexture {
  // Normal-map convention: R=X, G=Y, B=Z, with flat-up = (128,128,255).
  // We bake panel-seam recesses + screw bevels + vent shadow + micro-scratches.
  const c = document.createElement('canvas');
  c.width = c.height = CHASSIS_TEX_SIZE;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#8080ff'; // flat
  ctx.fillRect(0, 0, CHASSIS_TEX_SIZE, CHASSIS_TEX_SIZE);
  // Panel seams — pairs of dark/bright lines simulate a V-groove
  const drawSeam = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.strokeStyle = '#5050ff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = '#b0b0ff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0 + 1, y0 + 1); ctx.lineTo(x1 + 1, y1 + 1); ctx.stroke();
  };
  // Outer panel border seam
  drawSeam(40, 40, CHASSIS_TEX_SIZE - 40, 40);
  drawSeam(40, CHASSIS_TEX_SIZE - 40, CHASSIS_TEX_SIZE - 40, CHASSIS_TEX_SIZE - 40);
  drawSeam(40, 40, 40, CHASSIS_TEX_SIZE - 40);
  drawSeam(CHASSIS_TEX_SIZE - 40, 40, CHASSIS_TEX_SIZE - 40, CHASSIS_TEX_SIZE - 40);
  // Horizontal panel divisions (U-boundaries)
  for (let i = 1; i < 6; i++) {
    const y = (CHASSIS_TEX_SIZE / 6) * i;
    drawSeam(60, y, CHASSIS_TEX_SIZE - 60, y);
  }
  // Screw bevels at corners (radial gradient = round indentation)
  const drawScrew = (x: number, y: number) => {
    const grd = ctx.createRadialGradient(x, y, 0, x, y, 6);
    grd.addColorStop(0, '#5050ff');
    grd.addColorStop(0.7, '#8080ff');
    grd.addColorStop(1, '#8080ff');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    // Cross-slot
    ctx.strokeStyle = '#3030ff'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke();
  };
  const screws: [number, number][] = [
    [60, 60], [CHASSIS_TEX_SIZE - 60, 60],
    [60, CHASSIS_TEX_SIZE - 60], [CHASSIS_TEX_SIZE - 60, CHASSIS_TEX_SIZE - 60],
  ];
  for (let i = 1; i < 6; i++) {
    const y = (CHASSIS_TEX_SIZE / 6) * i;
    screws.push([60, y], [CHASSIS_TEX_SIZE - 60, y]);
  }
  screws.forEach(([x, y]) => drawScrew(x, y));
  // Micro-scratch bumps (random oriented bumps)
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * CHASSIS_TEX_SIZE;
    const y = Math.random() * CHASSIS_TEX_SIZE;
    const len = 3 + Math.random() * 10;
    const ang = Math.random() * Math.PI;
    ctx.strokeStyle = `rgba(${100 + Math.random() * 60},${100 + Math.random() * 60},255,0.4)`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function makeChassisAO(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = CHASSIS_TEX_SIZE;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CHASSIS_TEX_SIZE, CHASSIS_TEX_SIZE);
  // Edge darkening (vignette toward corners)
  const grd = ctx.createRadialGradient(
    CHASSIS_TEX_SIZE / 2, CHASSIS_TEX_SIZE / 2, CHASSIS_TEX_SIZE * 0.3,
    CHASSIS_TEX_SIZE / 2, CHASSIS_TEX_SIZE / 2, CHASSIS_TEX_SIZE * 0.75
  );
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, CHASSIS_TEX_SIZE, CHASSIS_TEX_SIZE);
  // Seam shadows
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 6; i++) {
    const y = (CHASSIS_TEX_SIZE / 6) * i;
    ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(CHASSIS_TEX_SIZE - 60, y); ctx.stroke();
  }
  // Outer border shadow
  ctx.strokeRect(40, 40, CHASSIS_TEX_SIZE - 80, CHASSIS_TEX_SIZE - 80);
  // Screw-well dots
  const wells: [number, number][] = [];
  for (let i = 1; i < 6; i++) {
    const y = (CHASSIS_TEX_SIZE / 6) * i;
    wells.push([60, y], [CHASSIS_TEX_SIZE - 60, y]);
  }
  wells.push([60, 60], [CHASSIS_TEX_SIZE - 60, 60], [60, CHASSIS_TEX_SIZE - 60], [CHASSIS_TEX_SIZE - 60, CHASSIS_TEX_SIZE - 60]);
  wells.forEach(([x, y]) => {
    const grd2 = ctx.createRadialGradient(x, y, 0, x, y, 7);
    grd2.addColorStop(0, 'rgba(0,0,0,0.6)');
    grd2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd2;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Sled-front faceplate maps — separate set so the sled doesn't read as just
// a stripe of the chassis.
function makeSledFaceColor(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#1a1a1f');
  g.addColorStop(1, '#0f0f14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);
  // Vent slats — slightly darker recesses (a deeper-detail vent ALSO exists
  // as real geometry; this is the texture layer that fills between them)
  ctx.fillStyle = '#08080b';
  for (let x = 120; x < 380; x += 8) ctx.fillRect(x, 26, 4, 76);
  // Asset label band
  ctx.fillStyle = 'rgba(232,232,240,0.18)';
  ctx.fillRect(420, 36, 70, 12);
  ctx.font = '8px monospace';
  ctx.fillStyle = 'rgba(232,232,240,0.6)';
  ctx.fillText('G-04', 426, 46);
  ctx.fillStyle = 'rgba(232,232,240,0.3)';
  ctx.fillText('RACK R-1', 422, 60);
  // Fine grain
  ctx.globalAlpha = 0.06;
  for (let y = 0; y < 128; y++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#22222a' : '#08080c';
    ctx.fillRect(0, y, 512, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeFloorColor(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0d0d11';
  ctx.fillRect(0, 0, 512, 512);
  // Raised-floor tile grid
  ctx.strokeStyle = 'rgba(40,40,50,0.6)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const p = (i / 4) * 512;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke();
  }
  // Floor speckle
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#1c1c22' : '#08080c';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Perforated mesh-door alpha — circular holes on a tight grid, like the
// front bezel of a DGX/HGX rack. Used as an alphaMap on a thin door panel
// so light + the interior glow visibly bleed through after the door opens.
function makeDoorPerf(): THREE.CanvasTexture {
  const SZ = 512;
  const c = document.createElement('canvas');
  c.width = c.height = SZ;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SZ, SZ);
  ctx.fillStyle = '#000000';
  const pitch = 14;
  const r = 5;
  for (let y = pitch; y < SZ - pitch; y += pitch) {
    const offset = (Math.floor((y - pitch) / pitch) % 2) * (pitch / 2);
    for (let x = pitch + offset; x < SZ - pitch; x += pitch) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// PCB color map — dark green solder mask with white silkscreen pads + traces.
// Sits as the baseboard surface revealed under the lid; sized to fill the
// sled-interior footprint.
function makePCBColor(): THREE.CanvasTexture {
  const SZ = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = SZ;
  const ctx = c.getContext('2d')!;
  // Deep PCB green (FR-4 with HASL finish look)
  const g = ctx.createLinearGradient(0, 0, SZ, SZ);
  g.addColorStop(0, '#0a2418');
  g.addColorStop(0.5, '#0d2e1c');
  g.addColorStop(1, '#08201a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SZ, SZ);
  // Subtle noise
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#1a4030' : '#04140a';
    ctx.fillRect(Math.random() * SZ, Math.random() * SZ, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
  // Silkscreen traces — random orthogonal lines (BGA breakout look)
  ctx.strokeStyle = 'rgba(220,210,180,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * SZ; const y = Math.random() * SZ;
    const len = 40 + Math.random() * 180;
    const horiz = Math.random() > 0.5;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + (horiz ? len : 0), y + (horiz ? 0 : len));
    ctx.stroke();
  }
  // Component pad clusters
  ctx.fillStyle = 'rgba(210,200,170,0.55)';
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * SZ; const y = Math.random() * SZ;
    const w = 4 + Math.random() * 18; const h = 4 + Math.random() * 12;
    ctx.fillRect(x, y, w, h);
  }
  // Silkscreen reference designators
  ctx.fillStyle = 'rgba(232,232,232,0.55)';
  ctx.font = '10px monospace';
  for (let i = 0; i < 40; i++) {
    ctx.fillText(`U${10 + i}`, Math.random() * SZ, Math.random() * SZ);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Lid underside — egg-crate thermal-foam pattern. What you actually see when
// you lift a server lid: dark grey foam pressing on the cold-plate tops.
function makeLidFoam(): THREE.CanvasTexture {
  const SZ = 256;
  const c = document.createElement('canvas');
  c.width = c.height = SZ;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#16161a';
  ctx.fillRect(0, 0, SZ, SZ);
  const cell = 16;
  for (let y = 0; y < SZ; y += cell) {
    for (let x = 0; x < SZ; x += cell) {
      const g = ctx.createRadialGradient(x + cell / 2, y + cell / 2, 1, x + cell / 2, y + cell / 2, cell * 0.55);
      g.addColorStop(0, 'rgba(70,70,78,0.55)');
      g.addColorStop(0.65, 'rgba(20,20,24,0.4)');
      g.addColorStop(1, 'rgba(5,5,8,0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  // Faint label patch
  ctx.fillStyle = 'rgba(180,170,140,0.18)';
  ctx.fillRect(SZ - 70, 16, 54, 14);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

type Textures = {
  chassisColor: THREE.CanvasTexture;
  chassisRough: THREE.CanvasTexture;
  chassisNormal: THREE.CanvasTexture;
  chassisAO: THREE.CanvasTexture;
  sledFace: THREE.CanvasTexture;
  floor: THREE.CanvasTexture;
  doorPerf: THREE.CanvasTexture;
  pcb: THREE.CanvasTexture;
  lidFoam: THREE.CanvasTexture;
};

// ──────────────────────────────────────────────────────────────────────────
// Geometry
// ──────────────────────────────────────────────────────────────────────────

const RACK_W = 1.4;
const RACK_D = 1.1;
const RACK_H = 3.0;
const SLEDS_PER_RACK = 6;
const SLED_H = 0.32;
const SLED_GAP = 0.06;
const HERO_SLED_INDEX = 3;

const TOWERS: { pos: [number, number, number]; rotY: number; hero: boolean }[] = [
  { pos: [-1.05, 0, 0],    rotY: 0.34,  hero: true },
  { pos: [1.15, 0, -0.9],  rotY: -0.22, hero: false },
];
const HERO_TOWER = TOWERS.find((tw) => tw.hero)!;

// ──────────────────────────────────────────────────────────────────────────
// Screw — small beveled cylinder that catches highlights. Real geometry
// rather than texture so it picks up the HDRI specular and casts shadows.
// ──────────────────────────────────────────────────────────────────────────

function Screw({ pos, screwGeo, screwMat }: { pos: [number, number, number]; screwGeo: THREE.BufferGeometry; screwMat: THREE.Material }) {
  return (
    <mesh position={pos} rotation={[Math.PI / 2, 0, 0]} geometry={screwGeo} material={screwMat} castShadow receiveShadow />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sled — built from FOUR materially-distinct pieces:
//   1. Chassis body — brushed metal, NEVER changes color
//   2. Vent grille — real geometry slats, dark recess
//   3. LED status strip — thin emissive line, changes color w/ thermal
//   4. Heat-pipe glow port — small recessed disk, glows through a vent
//
// The hero sled wires (3) and (4) to the shared thermal driver. Companion
// sleds get (3) and (4) but locked at the idle/green color. The chassis
// body is identical across all sleds — that's the realism win: a real
// machine doesn't change color when something goes wrong, only its
// indicator lights do.
// ──────────────────────────────────────────────────────────────────────────

// uv2 setup callback for planeGeometry meshes that use aoMap — Three.js does
// NOT auto-copy uv→uv2, so aoMap is silently ignored without this. Idempotent.
function ensureUv2(mesh: THREE.Mesh | null) {
  if (mesh?.geometry && !mesh.geometry.attributes.uv2 && mesh.geometry.attributes.uv) {
    mesh.geometry.setAttribute('uv2', mesh.geometry.attributes.uv);
  }
}

const VENT_SLATS = 9;
const VENT_SLAT_W = RACK_W * 0.22;
const VENT_SLAT_H = SLED_H * 0.04;
const VENT_SLAT_PITCH = SLED_H * 0.08;

function Sled({
  index, yBase, isHero, textures, sledChassisMat, ventMat,
}: {
  index: number;
  yBase: number;
  isHero: boolean;
  textures: Textures;
  sledChassisMat: THREE.Material;
  ventMat: THREE.Material;
}) {
  const ledRef = useRef<THREE.MeshStandardMaterial>(null!);
  const pipeRef = useRef<THREE.MeshStandardMaterial>(null!);
  const isHeroSled = isHero && index === HERO_SLED_INDEX;

  // Z of the sled's front face (where decals/vents/LEDs live).
  // sled body sits at z = RACK_D*0.18 with depth RACK_D*0.62
  //   → front face at z = RACK_D*0.18 + RACK_D*0.31 = RACK_D*0.49
  const Z_FACE = RACK_D * 0.49;

  useFrame((state) => {
    const t = isHeroSled ? _towerLevel.current : 0.08;
    // Real warning-LED behavior: steady when nominal, fast blink on critical
    const phase = _towerPhase.current;
    let blink = 1;
    if (isHeroSled && phase === 'critical') {
      // ~3.5 Hz hard blink (0.35..1.0)
      blink = 0.35 + 0.65 * (Math.sin(state.clock.elapsedTime * 22) > 0 ? 1 : 0);
    } else if (isHeroSled && phase === 'anomaly') {
      // ~1.2 Hz soft pulse
      blink = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 7.5));
    }
    // Companion-sled breathing: slow 6 s sine + per-sled phase offset so the
    // 5 non-hero LEDs don't blink in lockstep — sells "active hardware".
    const breath = 0.78 + 0.22 * Math.sin(state.clock.elapsedTime * 1.05 + index * 1.37);
    if (ledRef.current) {
      ledRef.current.emissive.copy(thermalHex(t));
      ledRef.current.emissiveIntensity = isHeroSled ? (1.4 + t * t * 7.5) * blink : 1.05 * breath;
    }
    if (pipeRef.current) {
      pipeRef.current.emissive.copy(thermalHex(t));
      pipeRef.current.emissiveIntensity = isHeroSled ? (0.5 + t * t * 5.0) * (0.7 + 0.3 * blink) : 0.32 * breath;
    }
  });

  return (
    <group position={[0, yBase, 0]}>
      {/* Chassis body — beveled, metallic, NEVER changes color */}
      <RoundedBox args={[RACK_W * 0.86, SLED_H, RACK_D * 0.62]} radius={0.012} smoothness={3} position={[0, 0, RACK_D * 0.18]} castShadow receiveShadow material={sledChassisMat} />

      {/* Front faceplate — sled-specific PBR map (asset tag, label band) */}
      <mesh position={[0, 0, Z_FACE + 0.002]} ref={ensureUv2} castShadow receiveShadow>
        <planeGeometry args={[RACK_W * 0.84, SLED_H * 0.94]} />
        <meshStandardMaterial map={textures.sledFace} roughness={0.62} metalness={0.55} side={THREE.FrontSide} />
      </mesh>

      {/* Vent grille — real recessed slats. Each slat is a thin box that
          catches its own highlight, casts a real shadow into the recess
          below it. This is what makes a vent read as "deep" rather than
          "painted on" — texture alone can't do this. */}
      <group position={[-RACK_W * 0.16, 0, Z_FACE + 0.006]}>
        {Array.from({ length: VENT_SLATS }).map((_, i) => {
          const y = -((VENT_SLATS - 1) / 2) * VENT_SLAT_PITCH + i * VENT_SLAT_PITCH;
          return (
            <mesh key={i} position={[0, y, 0]} material={ventMat} castShadow receiveShadow>
              <boxGeometry args={[VENT_SLAT_W, VENT_SLAT_H, 0.014]} />
            </mesh>
          );
        })}
        {/* Dark recess behind the slats — sells the "inside is shadow" depth */}
        <mesh position={[0, 0, -0.008]}>
          <planeGeometry args={[VENT_SLAT_W + 0.01, VENT_SLATS * VENT_SLAT_PITCH + 0.01]} />
          <meshStandardMaterial color="#020203" roughness={0.95} metalness={0} />
        </mesh>
      </group>

      {/* LED status strip — the PRIMARY thermal indicator. Sized so it
          reads from the camera distance: ~25% of sled width, ~14% of
          sled height. toneMapped:false keeps it HDR-bright so Bloom picks
          it up cleanly even at low emissive intensity in idle states.
          The chassis around it stays metallic — only this bar changes
          color across the thermal arc. */}
      <mesh position={[RACK_W * 0.3, -SLED_H * 0.34, Z_FACE + 0.007]}>
        <planeGeometry args={[RACK_W * 0.26, SLED_H * 0.13]} />
        <meshStandardMaterial
          ref={ledRef}
          color="#020203"
          roughness={0.2}
          metalness={0.0}
          emissive="#1c6b3a"
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>

      {/* LED strip bezel — thin frame around the LED that catches a
          highlight, sells it as a real recessed indicator and not a
          painted-on rectangle */}
      <mesh position={[RACK_W * 0.3, -SLED_H * 0.34, Z_FACE + 0.005]}>
        <planeGeometry args={[RACK_W * 0.28, SLED_H * 0.16]} />
        <meshStandardMaterial color="#0a0a0d" roughness={0.45} metalness={0.7} />
      </mesh>

      {/* Tiny secondary status pip — always-on white, three-LED rack-status
          cluster effect when paired with the main strip */}
      <mesh position={[RACK_W * 0.08, -SLED_H * 0.34, Z_FACE + 0.007]}>
        <circleGeometry args={[SLED_H * 0.045, 16]} />
        <meshStandardMaterial color="#020203" emissive="#cfdcff" emissiveIntensity={0.9} roughness={0.3} toneMapped={false} />
      </mesh>

      {/* Heat-pipe glow port — small disk visible through the vent recess,
          bleeds internal die color. Subtle, the 'something is glowing INSIDE
          the box' tell, distinct from the surface-mounted LED. */}
      <mesh position={[-RACK_W * 0.16, 0, Z_FACE - 0.004]}>
        <circleGeometry args={[SLED_H * 0.12, 24]} />
        <meshStandardMaterial
          ref={pipeRef}
          color="#020203"
          roughness={0.85}
          metalness={0.0}
          emissive="#1c6b3a"
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// HeroOpenSled — the one sled in the demo that performs the service
// sequence: rides on rails out of the rack (sled-slide), then its top lid
// hinges up to expose an HGX-style 4-GPU baseboard. The baseboard surface
// gets a per-die thermal heatmap + a refraction-shimmer plane driven by the
// shared _towerLevel ref, so "live overheating" reads as a real thermal
// event the moment the lid clears.
//
// Geometry budget kept tight: ~12 small meshes + one shader plane. Fits
// inside the existing perf envelope and adds no new postprocess passes.
// ──────────────────────────────────────────────────────────────────────────

// Shader for heat-shimmer plane — additive, UV-warped scrolling noise.
// No texture sample — pure procedural pseudo-noise for zero allocations.
const ShimmerShader = {
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uColor: { value: new THREE.Color('#c85f2a') },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec2 vUv;
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uColor;
    // Cheap hash + value noise
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p); vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    void main() {
      vec2 uv = vUv;
      // Vertical scroll + horizontal warp = rising heat haze
      float n1 = noise(uv * vec2(6.0, 9.0) + vec2(0.0, -uTime * 0.6));
      float n2 = noise(uv * vec2(11.0, 14.0) + vec2(uTime * 0.3, -uTime * 0.9));
      float n  = mix(n1, n2, 0.5);
      // Fade out toward top + sides (heat plume silhouette)
      float fade = smoothstep(0.0, 0.25, uv.y) * (1.0 - smoothstep(0.65, 1.0, uv.y));
      fade *= smoothstep(0.0, 0.18, uv.x) * (1.0 - smoothstep(0.82, 1.0, uv.x));
      float a = n * fade * uIntensity * 0.55;
      gl_FragColor = vec4(uColor * a * 1.8, a);
    }
  `,
};

// HotSpot shader — physically-motivated die heatmap. Gaussian falloff around
// a slowly-jittering hotspot (real GA100/GH100 dies don't heat uniformly —
// the hottest area is offset from geometric center and wanders w/ workload).
const HotSpotShader = {
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uColor: { value: new THREE.Color('#c85f2a') },
    uSeed: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    varying vec2 vUv;
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uColor;
    uniform float uSeed;
    void main() {
      // Hotspot wanders ±0.08 from center, driven by per-die seed
      vec2 c = vec2(
        0.5 + 0.08 * sin(uTime * 0.7 + uSeed * 6.28),
        0.5 + 0.08 * cos(uTime * 0.62 + uSeed * 4.11)
      );
      float d = distance(vUv, c);
      float hot = exp(-d * d * 14.0) * uIntensity;
      // Secondary cooler ring (the rest of the die at lower T)
      float bulk = exp(-d * d * 4.0) * uIntensity * 0.45;
      float a = clamp(hot + bulk, 0.0, 1.0) * 0.95;
      vec3 col = uColor * (1.0 + hot * 1.6);
      gl_FragColor = vec4(col, a);
    }
  `,
};

function HeroOpenSled({
  yBase, textures, sledChassisMat, ventMat,
}: {
  yBase: number;
  textures: Textures;
  sledChassisMat: THREE.Material;
  ventMat: THREE.Material;
}) {
  const ledRef = useRef<THREE.MeshStandardMaterial>(null!);
  const pipeRef = useRef<THREE.MeshStandardMaterial>(null!);
  const slideRef = useRef<THREE.Group>(null!);
  const lidRef = useRef<THREE.Group>(null!);
  const dieShaderRefs = useRef<THREE.ShaderMaterial[]>([]);
  const finMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const shimmerRef = useRef<THREE.ShaderMaterial>(null!);
  const strutLRef = useRef<THREE.Mesh>(null!);
  const strutRRef = useRef<THREE.Mesh>(null!);

  const Z_FACE = RACK_D * 0.49;
  const SLED_HALF = SLED_H / 2;
  const SLIDE_TRAVEL = RACK_D * 0.72;
  const LID_MAX_RAD = 80 * Math.PI / 180;

  // ─── HGX-style baseboard layout ────────────────────────────────────────
  // 4 GPU SXM packages in 2×2 arrangement around a central NVSwitch cluster
  // (4 small fabric dies in a cross). DIMMs along the long edges; CPU
  // sockets along the front edge.
  const DIE_W = 0.18;
  const DIE_HALF_OFFSET_X = 0.26;
  const DIE_HALF_OFFSET_Z = 0.20;
  const diePositions: [number, number][] = [
    [-DIE_HALF_OFFSET_X,  DIE_HALF_OFFSET_Z],
    [ DIE_HALF_OFFSET_X,  DIE_HALF_OFFSET_Z],
    [-DIE_HALF_OFFSET_X, -DIE_HALF_OFFSET_Z],
    [ DIE_HALF_OFFSET_X, -DIE_HALF_OFFSET_Z],
  ];
  // 4 NVSwitch dies arranged in a cross between the GPUs
  const nvswitchPositions: [number, number][] = [
    [ 0,         0.09 ],
    [ 0,        -0.09 ],
    [ 0.09,      0    ],
    [-0.09,      0    ],
  ];
  // Cold plate fins (12 thin parallel fins on top of each plate)
  const FIN_COUNT = 12;
  const FIN_PITCH = (DIE_W * 0.58) / (FIN_COUNT - 1);
  const finOffsets = Array.from({ length: FIN_COUNT }, (_, i) => -DIE_W * 0.29 + i * FIN_PITCH);

  useFrame((state) => {
    const t = _towerLevel.current;
    const phase = _towerPhase.current;
    let blink = 1;
    if (phase === 'critical') {
      blink = 0.35 + 0.65 * (Math.sin(state.clock.elapsedTime * 22) > 0 ? 1 : 0);
    } else if (phase === 'anomaly') {
      blink = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 7.5));
    }
    if (ledRef.current) {
      ledRef.current.emissive.copy(thermalHex(t));
      ledRef.current.emissiveIntensity = (1.4 + t * t * 7.5) * blink;
    }
    if (pipeRef.current) {
      pipeRef.current.emissive.copy(thermalHex(t));
      pipeRef.current.emissiveIntensity = (0.5 + t * t * 5.0) * (0.7 + 0.3 * blink);
    }

    // Slide group — pushes the sled forward along +Z (out of the rack)
    if (slideRef.current) {
      slideRef.current.position.z = _sledOut.current * SLIDE_TRAVEL;
    }
    // Lid hinge — pivot at rear edge, rotate -X
    const lidRad = -_lidOpen.current * LID_MAX_RAD;
    if (lidRef.current) {
      lidRef.current.rotation.x = lidRad;
    }
    // Gas struts — extend their piston length to track lid angle. The piston
    // is the inner cylinder; we scale its Y. Anchor cylinder stays fixed.
    const strutScale = 1 + _lidOpen.current * 1.6;
    if (strutLRef.current) strutLRef.current.scale.y = strutScale;
    if (strutRRef.current) strutRRef.current.scale.y = strutScale;

    // Hotspot shaders on each die
    const heatColor = thermalHex(t);
    const heatI = THREE.MathUtils.clamp(t, 0, 1) * _lidOpen.current;
    for (const mat of dieShaderRefs.current) {
      if (!mat) continue;
      mat.uniforms.uTime.value = state.clock.elapsedTime;
      mat.uniforms.uIntensity.value = heatI;
      mat.uniforms.uColor.value.copy(heatColor);
    }
    // Fin glow — fins heat from contact: emissive ∝ level²
    if (finMatRef.current) {
      finMatRef.current.emissive.copy(heatColor);
      finMatRef.current.emissiveIntensity = (t * t) * 1.6 * _lidOpen.current;
    }
    // Shimmer
    if (shimmerRef.current) {
      shimmerRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      shimmerRef.current.uniforms.uIntensity.value = t * _lidOpen.current;
      shimmerRef.current.uniforms.uColor.value.copy(heatColor);
    }
  });

  return (
    <group position={[0, yBase, 0]} ref={slideRef}>
      {/* ─── Sled chassis ─────────────────────────────────────────────── */}
      <RoundedBox args={[RACK_W * 0.86, SLED_H, RACK_D * 0.62]} radius={0.012} smoothness={3} position={[0, 0, RACK_D * 0.18]} castShadow receiveShadow material={sledChassisMat} />
      <mesh position={[0, 0, Z_FACE + 0.002]} ref={ensureUv2} castShadow receiveShadow>
        <planeGeometry args={[RACK_W * 0.84, SLED_H * 0.94]} />
        <meshStandardMaterial map={textures.sledFace} roughness={0.62} metalness={0.55} side={THREE.FrontSide} />
      </mesh>

      {/* Rail flanges on each side — thin brushed-alu plates that ride the
          static rack rails (which live in the chassis, not on the sled). */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * RACK_W * 0.435, -SLED_H * 0.18, RACK_D * 0.18]} castShadow>
          <boxGeometry args={[0.012, 0.022, RACK_D * 0.58]} />
          <meshStandardMaterial color="#7d818a" roughness={0.42} metalness={0.85} />
        </mesh>
      ))}

      {/* Vent grille (front) */}
      <group position={[-RACK_W * 0.16, 0, Z_FACE + 0.006]}>
        {Array.from({ length: VENT_SLATS }).map((_, i) => {
          const y = -((VENT_SLATS - 1) / 2) * VENT_SLAT_PITCH + i * VENT_SLAT_PITCH;
          return (
            <mesh key={i} position={[0, y, 0]} material={ventMat} castShadow receiveShadow>
              <boxGeometry args={[VENT_SLAT_W, VENT_SLAT_H, 0.014]} />
            </mesh>
          );
        })}
        <mesh position={[0, 0, -0.008]}>
          <planeGeometry args={[VENT_SLAT_W + 0.01, VENT_SLATS * VENT_SLAT_PITCH + 0.01]} />
          <meshStandardMaterial color="#020203" roughness={0.95} metalness={0} />
        </mesh>
      </group>

      {/* LED + bezel + status pip + heat-pipe disk */}
      <mesh position={[RACK_W * 0.3, -SLED_H * 0.34, Z_FACE + 0.007]}>
        <planeGeometry args={[RACK_W * 0.26, SLED_H * 0.13]} />
        <meshStandardMaterial ref={ledRef} color="#020203" roughness={0.2} metalness={0.0} emissive="#1c6b3a" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <mesh position={[RACK_W * 0.3, -SLED_H * 0.34, Z_FACE + 0.005]}>
        <planeGeometry args={[RACK_W * 0.28, SLED_H * 0.16]} />
        <meshStandardMaterial color="#0a0a0d" roughness={0.45} metalness={0.7} />
      </mesh>
      <mesh position={[RACK_W * 0.08, -SLED_H * 0.34, Z_FACE + 0.007]}>
        <circleGeometry args={[SLED_H * 0.045, 16]} />
        <meshStandardMaterial color="#020203" emissive="#cfdcff" emissiveIntensity={0.9} roughness={0.3} toneMapped={false} />
      </mesh>
      <mesh position={[-RACK_W * 0.16, 0, Z_FACE - 0.004]}>
        <circleGeometry args={[SLED_H * 0.12, 24]} />
        <meshStandardMaterial ref={pipeRef} color="#020203" roughness={0.85} metalness={0.0} emissive="#1c6b3a" emissiveIntensity={0.5} toneMapped={false} />
      </mesh>

      {/* ─── Hinge plate ─ a small fixed plate at the rear top edge that
              represents the actual hinge body. The lid pivots on its forward
              edge, not directly on the chassis edge — small detail, makes
              the open-lid silhouette read mechanically. */}
      <RoundedBox
        args={[RACK_W * 0.86, 0.018, 0.034]}
        radius={0.004}
        smoothness={2}
        position={[0, SLED_HALF + 0.009, RACK_D * 0.18 - RACK_D * 0.31 + 0.005]}
        castShadow
      >
        <meshStandardMaterial color="#2c2c34" roughness={0.45} metalness={0.78} />
      </RoundedBox>
      {/* Two hinge knuckles — small cylinders on either end of the plate */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * RACK_W * 0.38, SLED_HALF + 0.018, RACK_D * 0.18 - RACK_D * 0.31 + 0.005]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.012, 0.012, 0.05, 12]} />
          <meshStandardMaterial color="#1a1a1f" roughness={0.4} metalness={0.85} />
        </mesh>
      ))}

      {/* ─── Gas struts ─ two black anchor cylinders fixed to chassis side
              walls; each contains a metallic piston (the scaled inner mesh)
              that extends as the lid opens. Visually sells the lid as a
              real mechanism that's being held open under spring force. */}
      <group position={[-RACK_W * 0.4, SLED_HALF + 0.005, RACK_D * 0.05]} rotation={[Math.PI / 3.2, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.10, 10]} />
          <meshStandardMaterial color="#0c0c10" roughness={0.55} metalness={0.5} />
        </mesh>
        <mesh ref={strutLRef} position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.08, 10]} />
          <meshStandardMaterial color="#b8bcc2" roughness={0.3} metalness={0.92} />
        </mesh>
      </group>
      <group position={[RACK_W * 0.4, SLED_HALF + 0.005, RACK_D * 0.05]} rotation={[Math.PI / 3.2, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.10, 10]} />
          <meshStandardMaterial color="#0c0c10" roughness={0.55} metalness={0.5} />
        </mesh>
        <mesh ref={strutRRef} position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.08, 10]} />
          <meshStandardMaterial color="#b8bcc2" roughness={0.3} metalness={0.92} />
        </mesh>
      </group>

      {/* ─── Lid hinge group ─ pivots on the FRONT edge of the hinge plate.
              Children offset forward so geometry sits where a real lid would. */}
      <group ref={lidRef} position={[0, SLED_HALF + 0.018, RACK_D * 0.18 - RACK_D * 0.31 + 0.022]}>
        {/* Lid cover — top face */}
        <RoundedBox
          args={[RACK_W * 0.86, 0.014, RACK_D * 0.6]}
          radius={0.006}
          smoothness={2}
          position={[0, 0.007, RACK_D * 0.30]}
          castShadow
          receiveShadow
          material={sledChassisMat}
        />
        {/* Lid underside — egg-crate thermal foam (visible once lid is up) */}
        <mesh position={[0, 0, RACK_D * 0.30]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[RACK_W * 0.84, RACK_D * 0.58]} />
          <meshStandardMaterial map={textures.lidFoam} roughness={0.92} metalness={0.05} side={THREE.FrontSide} />
        </mesh>
        {/* Lid handle — small inset pull near the front edge */}
        <mesh position={[0, 0.016, RACK_D * 0.55]}>
          <boxGeometry args={[RACK_W * 0.12, 0.004, 0.018]} />
          <meshStandardMaterial color="#1c1c22" roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Service-label decal on lid top */}
        <mesh position={[RACK_W * 0.32, 0.0145, RACK_D * 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.18, 0.06]} />
          <meshStandardMaterial color="#d8d2c2" roughness={0.78} />
        </mesh>
      </group>

      {/* ─── Exposed baseboard (HGX-style) ──────────────────────────────── */}
      <group position={[0, SLED_HALF - 0.012, RACK_D * 0.18]}>
        {/* PCB substrate */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} ref={ensureUv2} receiveShadow>
          <planeGeometry args={[RACK_W * 0.82, RACK_D * 0.58]} />
          <meshStandardMaterial map={textures.pcb} roughness={0.65} metalness={0.15} />
        </mesh>

        {/* 4 NVSwitch fabric chips in a cross between the GPUs */}
        {nvswitchPositions.map(([x, z], i) => (
          <RoundedBox key={i} args={[0.07, 0.014, 0.07]} radius={0.002} smoothness={2} position={[x, 0.007, z]} castShadow>
            <meshStandardMaterial color="#22222a" roughness={0.4} metalness={0.6} />
          </RoundedBox>
        ))}
        {/* NVLink silkscreen X removed per design — keeps the baseboard
            reading as PCB + chips, no gold cross. */}

        {/* 4 SXM packages */}
        {diePositions.map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            {/* Package substrate (PCB-green underneath, slightly raised) */}
            <RoundedBox args={[DIE_W * 1.08, 0.004, DIE_W * 1.08]} radius={0.002} smoothness={2} position={[0, 0.003, 0]} castShadow>
              <meshStandardMaterial color="#0e2418" roughness={0.6} metalness={0.1} />
            </RoundedBox>
            {/* Integrated heat spreader (IHS) — nickel-plated copper */}
            <RoundedBox args={[DIE_W, 0.016, DIE_W]} radius={0.003} smoothness={2} position={[0, 0.013, 0]} castShadow receiveShadow>
              <meshStandardMaterial color="#9ea2a8" roughness={0.32} metalness={0.85} />
            </RoundedBox>
            {/* Die hotspot overlay — Gaussian-falloff shader */}
            <mesh position={[0, 0.0225, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[DIE_W * 0.92, DIE_W * 0.92]} />
              <shaderMaterial
                ref={(m) => { if (m) dieShaderRefs.current[i] = m; }}
                args={[{
                  uniforms: {
                    uTime: { value: 0 },
                    uIntensity: { value: 0 },
                    uColor: { value: new THREE.Color('#c85f2a') },
                    uSeed: { value: i * 0.37 },
                  },
                  vertexShader: HotSpotShader.vertexShader,
                  fragmentShader: HotSpotShader.fragmentShader,
                  transparent: true,
                  depthWrite: false,
                  blending: THREE.AdditiveBlending,
                  toneMapped: false,
                }]}
              />
            </mesh>

            {/* Cold-plate body (brushed alu base) */}
            <RoundedBox args={[DIE_W * 0.78, 0.008, DIE_W * 0.78]} radius={0.002} smoothness={2} position={[0, 0.027, 0]} castShadow>
              <meshStandardMaterial color="#c0c4c8" roughness={0.45} metalness={0.78} />
            </RoundedBox>
            {/* Cold-plate fins — 12 thin parallel fins running rear→front */}
            {finOffsets.map((fx, fi) => (
              <mesh key={fi} position={[fx, 0.036, 0]} castShadow>
                <boxGeometry args={[0.006, 0.018, DIE_W * 0.74]} />
                <meshStandardMaterial
                  ref={fi === 0 && i === 0 ? finMatRef : undefined}
                  color="#a8acb2"
                  roughness={0.5}
                  metalness={0.82}
                  emissive="#000000"
                  emissiveIntensity={0}
                  toneMapped={false}
                />
              </mesh>
            ))}
            {/* Copper inlet/outlet pipes — two short bent pipes per plate */}
            {[-0.04, 0.04].map((px, pi) => (
              <mesh key={pi} position={[px, 0.04, -DIE_W * 0.45]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.006, 0.006, DIE_W * 0.36, 10]} />
                <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.85} />
              </mesh>
            ))}
          </group>
        ))}

        {/* Rear manifold — all the copper pipes converge to a small block */}
        <RoundedBox args={[RACK_W * 0.56, 0.022, 0.04]} radius={0.003} smoothness={2} position={[0, 0.034, -RACK_D * 0.27]} castShadow>
          <meshStandardMaterial color="#8a5526" roughness={0.5} metalness={0.78} />
        </RoundedBox>

        {/* Perimeter DIMM modules — green PCB stick + black SPD chip + gold edge */}
        {Array.from({ length: 8 }).map((_, i) => {
          const side = i < 4 ? -1 : 1;
          const k = i % 4;
          const x = -0.36 + k * 0.24;
          return (
            <group key={i} position={[x, 0.018, side * RACK_D * 0.245]}>
              <mesh castShadow>
                <boxGeometry args={[0.16, 0.036, 0.012]} />
                <meshStandardMaterial color="#0d3220" roughness={0.55} metalness={0.18} />
              </mesh>
              {/* SPD chip */}
              <mesh position={[0.05, 0.004, 0.007]}>
                <boxGeometry args={[0.022, 0.012, 0.002]} />
                <meshStandardMaterial color="#08080a" roughness={0.45} metalness={0.5} />
              </mesh>
              {/* Gold edge contacts at bottom */}
              <mesh position={[0, -0.017, 0.007]}>
                <boxGeometry args={[0.15, 0.004, 0.002]} />
                <meshStandardMaterial color="#caa148" roughness={0.35} metalness={0.92} />
              </mesh>
            </group>
          );
        })}

        {/* 2 CPU sockets at the front edge — small IHS squares */}
        {[-0.18, 0.18].map((cx, i) => (
          <group key={i} position={[cx, 0, RACK_D * 0.24]}>
            <RoundedBox args={[0.12, 0.006, 0.12]} radius={0.002} smoothness={2} position={[0, 0.005, 0]} castShadow>
              <meshStandardMaterial color="#1a1a1d" roughness={0.5} metalness={0.5} />
            </RoundedBox>
            <RoundedBox args={[0.094, 0.01, 0.094]} radius={0.002} smoothness={2} position={[0, 0.012, 0]} castShadow>
              <meshStandardMaterial color="#a8acb2" roughness={0.38} metalness={0.85} />
            </RoundedBox>
          </group>
        ))}

        {/* Heat-shimmer plane — narrower (over cold-plate cluster), additive */}
        <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2.2, 0, 0]}>
          <planeGeometry args={[RACK_W * 0.65, RACK_D * 0.55, 1, 1]} />
          <shaderMaterial
            ref={shimmerRef}
            args={[{
              uniforms: THREE.UniformsUtils.clone(ShimmerShader.uniforms),
              vertexShader: ShimmerShader.vertexShader,
              fragmentShader: ShimmerShader.fragmentShader,
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide,
              toneMapped: false,
            }]}
          />
        </mesh>
      </group>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tower — chassis frame + faceplate + side cable bundle + sleds + screws.
// All real geometry, all picks up HDRI light + contact shadows.
// ──────────────────────────────────────────────────────────────────────────

// DoorPanel — animated front bezel. Hero tower swings open on first
// scroll-into-view trigger via _doorOpen; companion stays static.
function DoorPanel({ tower, textures }: { tower: typeof TOWERS[number]; textures: Textures }) {
  const hingeRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (!tower.hero || !hingeRef.current) return;
    hingeRef.current.rotation.y = -_doorOpen.current * (110 * Math.PI / 180);
  });
  const half = RACK_W * 0.48;
  if (!tower.hero) {
    // Companion door — flat panel + the same hinge/latch hardware the hero
    // gets, so both racks share a physical language. No animation.
    return (
      <group position={[-half, RACK_H / 2, RACK_D / 2 + 0.001]}>
        <mesh position={[half, 0, 0]} ref={ensureUv2} castShadow receiveShadow>
          <planeGeometry args={[RACK_W * 0.96, RACK_H * 0.97]} />
          <meshStandardMaterial
            map={textures.chassisColor} roughnessMap={textures.chassisRough}
            normalMap={textures.chassisNormal} aoMap={textures.chassisAO}
            aoMapIntensity={0.9} roughness={1.0} metalness={0.85}
            normalScale={new THREE.Vector2(0.7, 0.7)} envMapIntensity={1.2}
            side={THREE.FrontSide}
          />
        </mesh>
        {/* Hinge knuckles (left edge) */}
        {[-RACK_H * 0.38, 0, RACK_H * 0.38].map((y, i) => (
          <mesh key={i} position={[0.012, y, 0.012]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.014, 0.014, 0.05, 12]} />
            <meshStandardMaterial color="#1a1a1f" roughness={0.45} metalness={0.85} />
          </mesh>
        ))}
        {/* Latch + handle (right edge) */}
        <mesh position={[2 * half - 0.06, 0, 0.012]} castShadow>
          <boxGeometry args={[0.018, 0.22, 0.024]} />
          <meshStandardMaterial color="#2a2a32" roughness={0.4} metalness={0.85} />
        </mesh>
      </group>
    );
  }
  // Hero: hinge group pivots at left edge (x = -half), door mesh offset to +half
  return (
    <group ref={hingeRef} position={[-half, RACK_H / 2, RACK_D / 2 + 0.001]}>
      {/* Outer perforated steel sheet */}
      <mesh position={[half, 0, 0]} ref={ensureUv2} castShadow receiveShadow>
        <planeGeometry args={[RACK_W * 0.96, RACK_H * 0.97]} />
        <meshStandardMaterial
          map={textures.chassisColor} roughnessMap={textures.chassisRough}
          normalMap={textures.chassisNormal} aoMap={textures.chassisAO}
          alphaMap={textures.doorPerf}
          aoMapIntensity={0.9} roughness={1.0} metalness={0.85}
          normalScale={new THREE.Vector2(0.7, 0.7)} envMapIntensity={1.2}
          transparent
          alphaTest={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner dust filter — a darker semi-opaque mesh layer behind the steel */}
      <mesh position={[half, 0, -0.006]}>
        <planeGeometry args={[RACK_W * 0.94, RACK_H * 0.95]} />
        <meshStandardMaterial
          color="#06060a"
          alphaMap={textures.doorPerf}
          transparent
          opacity={0.85}
          roughness={0.95}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Door frame border — thin powder-coat rim around the perforation */}
      {[
        { p: [half, RACK_H * 0.48, 0.002] as [number, number, number], s: [RACK_W * 0.96, 0.022, 0.012] as [number, number, number] },
        { p: [half, -RACK_H * 0.48, 0.002] as [number, number, number], s: [RACK_W * 0.96, 0.022, 0.012] as [number, number, number] },
        { p: [0.011, 0, 0.002] as [number, number, number], s: [0.022, RACK_H * 0.97, 0.012] as [number, number, number] },
        { p: [2 * half - 0.011, 0, 0.002] as [number, number, number], s: [0.022, RACK_H * 0.97, 0.012] as [number, number, number] },
      ].map((b, i) => (
        <mesh key={i} position={b.p} castShadow>
          <boxGeometry args={b.s} />
          <meshStandardMaterial color="#1c1c22" roughness={0.55} metalness={0.7} />
        </mesh>
      ))}
      {/* Hinge knuckles — 3 along the left edge */}
      {[-RACK_H * 0.38, 0, RACK_H * 0.38].map((y, i) => (
        <mesh key={i} position={[0.012, y, 0.012]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.014, 0.014, 0.05, 12]} />
          <meshStandardMaterial color="#1a1a1f" roughness={0.45} metalness={0.85} />
        </mesh>
      ))}
      {/* Recessed latch — small square dimple just left of the handle */}
      <mesh position={[2 * half - 0.085, -0.02, 0.008]}>
        <boxGeometry args={[0.024, 0.024, 0.006]} />
        <meshStandardMaterial color="#08080a" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Door handle — vertical bar near opening edge */}
      <mesh position={[2 * half - 0.06, 0, 0.012]} castShadow>
        <boxGeometry args={[0.018, 0.22, 0.024]} />
        <meshStandardMaterial color="#2a2a32" roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}

function TowerUnitMesh({
  tower, textures, screwGeo, screwMat, sledChassisMat, ventMat, frameMat,
}: {
  tower: typeof TOWERS[number];
  textures: Textures;
  screwGeo: THREE.BufferGeometry;
  screwMat: THREE.Material;
  sledChassisMat: THREE.Material;
  ventMat: THREE.Material;
  frameMat: THREE.Material;
}) {
  // Sled stack: the rack interior is [0.5, RACK_H - 0.5] (leaving room for
  // the top brand-plate panel and the bottom plenum). Sled bases are spaced
  // by SLED_H + SLED_GAP starting from y=0.55 (slightly above the floor of
  // the rack frame, in tower-local coords where the frame spans 0..RACK_H).
  const SLED_BASE_Y = 0.55;

  // Screw positions on the front face, relative to the chassis CENTER (at
  // tower-local y=RACK_H/2). Six screws: 4 corners + 2 mid-rail.
  const screwOffsets: [number, number][] = useMemo(() => {
    const mx = RACK_W * 0.46;
    const my = RACK_H * 0.46;
    return [
      [-mx, my], [mx, my], [-mx, -my], [mx, -my],
      [-mx, 0], [mx, 0],
    ];
  }, []);

  return (
    <>
    <group position={tower.pos} rotation={[0, tower.rotY, 0]}>
      {/* Rack feet — 4 small leveling-foot pucks. Without these, the rack
          appears to be sinking into the floor (any vertical offset reads as
          wrong against a hard floor edge). With them, you get the "this is
          a serviceable piece of equipment on a raised floor" silhouette. */}
      {([[-RACK_W*0.42, -RACK_D*0.42], [RACK_W*0.42, -RACK_D*0.42], [-RACK_W*0.42, RACK_D*0.42], [RACK_W*0.42, RACK_D*0.42]] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.025, z]} castShadow receiveShadow>
          <cylinderGeometry args={[0.045, 0.052, 0.05, 16]} />
          <meshStandardMaterial color="#0c0c10" roughness={0.55} metalness={0.7} />
        </mesh>
      ))}
      {/* Bottom plinth bar — slight inset around the base, gives the rack
          a 'sitting on something' silhouette. The actual chassis sits
          0.05 above the floor on the feet. */}
      <RoundedBox args={[RACK_W * 0.96, 0.06, RACK_D * 0.96]} radius={0.008} smoothness={2} position={[0, 0.07, 0]} castShadow receiveShadow material={frameMat} />

      {/* Everything from here down is the rack ASSEMBLY sitting on top of
          the plinth — wrapped in a group at y=0.1 (feet + plinth combined
          height) so every relative position inside stays clean. */}
      </group>
      <group position={[tower.pos[0], 0.1, tower.pos[2]]} rotation={[0, tower.rotY, 0]}>
      {/* Beveled chassis body — RoundedBox catches a thin highlight from
          the HDRI on every edge. The single biggest "this is a real
          machine" geometric tell. */}
      <RoundedBox args={[RACK_W, RACK_H, RACK_D]} radius={0.018} smoothness={3} position={[0, RACK_H / 2, 0]} castShadow receiveShadow material={frameMat} />

      {/* Front faceplate / door — for the hero tower this is wrapped in a
          hinge group that pivots on the left edge and swings ~110° on the
          service-sequence trigger; for the companion tower it stays a
          static panel. `ensureUv2` keeps the AO map active. */}
      <DoorPanel tower={tower} textures={textures} />


      {/* Top brand-plate strip — small bezel between the top edge and the
          first sled, gives a "rack header" silhouette */}
      <mesh position={[0, RACK_H - 0.18, RACK_D / 2 + 0.003]} castShadow>
        <planeGeometry args={[RACK_W * 0.7, 0.08]} />
        <meshStandardMaterial color="#0a0a0d" roughness={0.55} metalness={0.7} emissive="#1c2230" emissiveIntensity={0.12} />
      </mesh>

      {/* Screws — real cylinders, each picks up its own HDRI highlight */}
      {screwOffsets.map(([x, y], i) => (
        <Screw key={i} pos={[x, RACK_H / 2 + y, RACK_D / 2 + 0.012]} screwGeo={screwGeo} screwMat={screwMat} />
      ))}

      {/* Side cable bundle — vertical run with one bent section */}
      <mesh position={[RACK_W * 0.42, RACK_H * 0.7, -RACK_D * 0.42]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, RACK_H * 0.55, 8]} />
        <meshStandardMaterial color="#0a0a0d" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[RACK_W * 0.42, RACK_H * 0.42, -RACK_D * 0.32]} rotation={[Math.PI / 6, 0, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.32, 8]} />
        <meshStandardMaterial color="#0a0a0d" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Second thinner cable */}
      <mesh position={[RACK_W * 0.48, RACK_H * 0.65, -RACK_D * 0.42]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, RACK_H * 0.62, 8]} />
        <meshStandardMaterial color="#1c2030" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Top handle bar — horizontal grip rod */}
      <mesh position={[0, RACK_H + 0.04, RACK_D * 0.3]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, RACK_W * 0.5, 12]} />
        <meshStandardMaterial color="#1c1c22" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Handle bar end caps */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * RACK_W * 0.25, RACK_H + 0.04, RACK_D * 0.3]} castShadow>
          <sphereGeometry args={[0.024, 12, 8]} />
          <meshStandardMaterial color="#2a2a32" roughness={0.4} metalness={0.85} />
        </mesh>
      ))}

      {/* Sleds — fixed: tower-local y starts at SLED_BASE_Y, not below floor.
          The hero sled in the hero tower is replaced by HeroOpenSled which
          slides on rails + opens its lid + exposes the GPU baseboard. */}
      {Array.from({ length: SLEDS_PER_RACK }).map((_, i) => {
        const yBase = SLED_BASE_Y + i * (SLED_H + SLED_GAP) + SLED_H / 2;
        if (tower.hero && i === HERO_SLED_INDEX) {
          return (
            <HeroOpenSled
              key={i}
              yBase={yBase}
              textures={textures}
              sledChassisMat={sledChassisMat}
              ventMat={ventMat}
            />
          );
        }
        return (
          <Sled
            key={i}
            index={i}
            yBase={yBase}
            isHero={tower.hero}
            textures={textures}
            sledChassisMat={sledChassisMat}
            ventMat={ventMat}
          />
        );
      })}

      {/* Static rack rails for the hero sled — stay fixed in the chassis as
          the sled slides out. Two brushed-aluminum L-profiles on the inner
          walls at the hero sled's Y, full rack depth. Only added for the
          hero tower; the companion's sleds are sealed. */}
      {tower.hero && (() => {
        const yHero = SLED_BASE_Y + HERO_SLED_INDEX * (SLED_H + SLED_GAP) + SLED_H / 2;
        const yRail = yHero - SLED_H * 0.36;
        return (
          <group>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * RACK_W * 0.46, yRail, 0]}>
                {/* Horizontal flange */}
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.018, 0.006, RACK_D * 0.96]} />
                  <meshStandardMaterial color="#6d717a" roughness={0.42} metalness={0.85} />
                </mesh>
                {/* Vertical web */}
                <mesh position={[s * 0.006, 0.012, 0]} castShadow>
                  <boxGeometry args={[0.006, 0.022, RACK_D * 0.96]} />
                  <meshStandardMaterial color="#5f636c" roughness={0.5} metalness={0.78} />
                </mesh>
              </group>
            ))}
            {/* Front rail-end plates (where the rail bolts to the chassis post) */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * RACK_W * 0.46, yRail + 0.005, RACK_D * 0.47]} castShadow>
                <boxGeometry args={[0.024, 0.028, 0.01]} />
                <meshStandardMaterial color="#2a2a32" roughness={0.45} metalness={0.8} />
              </mesh>
            ))}
          </group>
        );
      })()}
    </group>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Floor + ceiling cable tray — minimal but real depth elements
// ──────────────────────────────────────────────────────────────────────────

function Environment3D({ textures }: { textures: Textures }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          map={textures.floor}
          color="#0d0d11"
          roughness={0.7}
          metalness={0.25}
          envMapIntensity={0.5}
        />
      </mesh>
      {/* Faint ceiling cable tray — a subtle horizon-bar */}
      <mesh position={[0, RACK_H + 1.4, -0.5]} castShadow>
        <boxGeometry args={[6, 0.06, 0.18]} />
        <meshStandardMaterial color="#0c0c10" roughness={0.6} metalness={0.5} />
      </mesh>
      <fogExp2 attach="fog" args={[T.bg, 0.06]} />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Lighting — three-point with a soft cool key, a fill rect, and a localized
// thermal point light tracking the hero sled. directionalLight casts the
// shadows; everything else just illuminates.
// ──────────────────────────────────────────────────────────────────────────

function SceneLights() {
  const thermalRef = useRef<THREE.PointLight>(null!);
  const heroPos = HERO_TOWER.pos;

  useFrame(() => {
    const t = _towerLevel.current;
    if (thermalRef.current) {
      thermalRef.current.color.copy(thermalHex(t));
      // Subtle — the LED is the focal point, the light spill is the supporting note
      thermalRef.current.intensity = 0.4 + t * 3.5;
    }
  });

  return (
    <>
      <ambientLight intensity={0.18} />
      {/* Key (shadow-caster) — cool, from upper-left */}
      <directionalLight
        position={[-3, 6, 4]}
        intensity={1.4}
        color="#cfdcff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-1}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0008}
      />
      {/* Fill — large area light, softens shadows */}
      <rectAreaLight position={[0, RACK_H + 2.2, 3.5]} rotation={[Math.PI / 2.2, 0, 0]} width={5} height={2.2} intensity={4.5} color="#bcd4ff" />
      {/* Practical — sled-area kicker light */}
      <pointLight position={[2.4, 1.5, 2.0]} intensity={1.0} color="#7fa8e0" distance={8} decay={2} />
      {/* Thermal spill from the hero sled — color tracks the LED */}
      <pointLight
        ref={thermalRef}
        position={[heroPos[0] + 0.4, RACK_H * 0.55, heroPos[2] + 0.65]}
        distance={3.5}
        decay={2.4}
      />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// CameraDrift — simplex-noise-driven handheld camera. Three independent
// noise fields (one per axis) make each axis wander at its own pace and
// scale, so the motion never repeats, never lines up rhythmically, and
// never reads as a sine wave. The 'k' (smoothing) value below was tuned
// empirically — too tight and the camera jitters, too loose and the noise
// is washed out into a sine again.
// ──────────────────────────────────────────────────────────────────────────

const noiseX = createNoise3D();
const noiseY = createNoise3D();
const noiseZ = createNoise3D();
const noiseLX = createNoise3D();
const noiseLY = createNoise3D();
const _camTarget = new THREE.Vector3();
const _camLook = new THREE.Vector3();

function CameraDrift() {
  const { camera } = useThree();
  const cur = useRef(new THREE.Vector3(0, 2.25, 4.4));
  const look = useRef(new THREE.Vector3(0.05, 1.5, -0.4));

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    // Camera position — wide slow wander on X, narrow slow on Y, medium on Z.
    // Raised eye-height so the framing looks down into the chassis rather than
    // up at the rack face.
    _camTarget.set(
      noiseX(t * 0.08, 0, 0) * 0.55,            // ~±0.55 sideways
      2.22 + noiseY(0, t * 0.06, 0) * 0.14,     // ~±0.14 vertical
      4.15 + noiseZ(0, 0, t * 0.07) * 0.28      // ~±0.28 forward/back
    );
    // Look-target — micro-jitter so the framing 'breathes' on the towers
    _camLook.set(
      0.05 + noiseLX(t * 0.11, 5, 0) * 0.08,
      1.5 + noiseLY(7, t * 0.09, 0) * 0.06,
      -0.4
    );

    const k = Math.min(1, delta * 1.6); // critically-damped feel
    cur.current.lerp(_camTarget, k);
    look.current.lerp(_camLook, k);

    camera.position.copy(cur.current);
    camera.lookAt(look.current);
  });

  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// Post-processing — DepthOfField as the primary 'this is a camera' tell,
// tuned-down Bloom only on emissive elements (now isolated to LEDs/heat
// pipes thanks to toneMapped:false on those materials), nearly-invisible
// chromatic aberration, vignette for natural lens darkening.
// ──────────────────────────────────────────────────────────────────────────

const _caOffset = new THREE.Vector2(0.00025, 0.00025);
// Focus locked on the hero tower's front face — the heat-pipe glow & LED
// sit right around y=1.55, x=-1.05, z=+~0.55 (rack front face). The
// companion tower (slightly behind and to the right) thus falls into a
// soft, photographic out-of-focus band.
const _dofTarget = new THREE.Vector3(-1.05, 1.55, 0.55);

function PostFX() {
  return (
    <EffectComposer multisampling={2} enableNormalPass={false}>
      <DepthOfField
        target={_dofTarget}
        focalLength={0.028}
        bokehScale={2.4}
        height={480}
      />
      <Bloom
        luminanceThreshold={0.72}
        luminanceSmoothing={0.2}
        intensity={0.5}
        radius={0.6}
        mipmapBlur
      />
      <ChromaticAberration
        offset={_caOffset}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={false}
        modulationOffset={0.15}
      />
      <Vignette offset={0.28} darkness={0.42} eskil={false} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Root — declares the shared geometries/materials once at the top level so
// every Sled/Tower references the same THREE.BufferGeometry / Material
// instance (Three.js can then upload them to the GPU once and reuse — same
// pattern InstancedMesh uses, just done manually because we have a fixed
// small count).
// ──────────────────────────────────────────────────────────────────────────

export default function TowerUnit() {
  const textures = useMemo<Textures>(() => ({
    chassisColor: makeChassisBaseColor(),
    chassisRough: makeChassisRoughness(),
    chassisNormal: makeChassisNormal(),
    chassisAO: makeChassisAO(),
    sledFace: makeSledFaceColor(),
    floor: makeFloorColor(),
    doorPerf: makeDoorPerf(),
    pcb: makePCBColor(),
    lidFoam: makeLidFoam(),
  }), []);

  // Shared geometries — instantiated once, reused across all instances.
  // (Vent slats are now rendered as a group of <mesh>es inside Sled — they
  // need real spacing, real shadow contribution, and a recess plane behind
  // them. A single merged geometry would lose all of that.)
  const screwGeo = useMemo(() => new THREE.CylinderGeometry(0.022, 0.024, 0.02, 16), []);

  // Shared materials — instantiated once
  const screwMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3a3a40', roughness: 0.42, metalness: 0.88, envMapIntensity: 1.2,
  }), []);
  const ventMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#040407', roughness: 0.9, metalness: 0.1,
  }), []);
  // Rack frame — powder-coated 6061-T6 aluminum structural members:
  // flatter, darker, less glossy than the sled panels. The intentional
  // contrast (anodized panel vs. matte powder-coat frame) is what reads
  // as "real assembled hardware" instead of one uniform material.
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3A3A42',
    roughness: 0.7,
    metalness: 0.4,
    envMapIntensity: 1.0,
  }), []);
  // Sled chassis — anodized 6061-T6 aluminum panel: slight tint, low gloss,
  // distinctly lighter than the frame.
  const sledChassisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#9A9AA2',
    roughness: 0.5,
    metalness: 0.6,
    envMapIntensity: 1.15,
  }), []);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    _towerLevel.current = 0.1;
    _towerPhase.current = 'idle';
    _towerProgress.current = 0;
    // Scroll-into-view trigger — flips _seqTriggered once when the scene's
    // container crosses 40% of the viewport. Sequence then plays once and
    // stays open (matches the "On scroll into view" UX choice).
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) _seqTriggered.current = true; },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', background: T.bg }}>
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        dpr={[1, 2]}
        camera={{ position: [0, 2.25, 4.4], fov: 38 }}
      >
        <color attach="background" args={[T.bg]} />

        <SceneLights />
        <Environment3D textures={textures} />

        {TOWERS.map((tower, i) => (
          <TowerUnitMesh
            key={i}
            tower={tower}
            textures={textures}
            screwGeo={screwGeo}
            screwMat={screwMat}
            sledChassisMat={sledChassisMat}
            ventMat={ventMat}
            frameMat={frameMat}
          />
        ))}

        {/* Contact shadows — soft ground-grounding, much cheaper than full
            shadow-map shadows for a flat horizon plane and reads as the
            "tower is actually sitting on the floor" signal that pure
            directional shadows alone don't deliver convincingly. */}
        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.55}
          scale={10}
          blur={2.4}
          far={3.5}
          resolution={1024}
          color="#000000"
        />

        {/* HDRI environment — the single biggest realism upgrade. 'warehouse'
            preset is drei-bundled (no extra fetch) and gives the dim,
            industrial reflection profile that exactly fits a data-center
            scene. Without this, even perfectly-tuned PBR materials read as
            videogame because they have nothing to reflect. */}
        <Environment preset="warehouse" environmentIntensity={0.85} />

        <CameraDrift />
        <ThermalDriver />
        <SequenceDriver />
        <PostFX />
      </Canvas>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 72, background: `linear-gradient(to bottom, transparent, ${T.bg})`, pointerEvents: 'none', zIndex: 5 }} />
    </div>
  );
}
