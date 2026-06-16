/**
 * Centralized texture loader for the photoreal GPU scene.
 *
 * Includes per-model top-down "product skin" textures generated from real
 * NVIDIA / AMD reference photos. These are applied to the top face of each
 * card's assembled exterior so the lineup reads as actual photographed
 * hardware, not generic 3D boxes.
 */
import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

import pcbNormalUrl from '@/assets/textures/pcb-normal.jpg';
import nickelBrushedUrl from '@/assets/textures/nickel-brushed.jpg';
import anodizedDarkUrl from '@/assets/textures/anodized-dark.jpg';
import nvidiaDecalUrl from '@/assets/textures/nvidia-decal.webp';
import amdDecalUrl from '@/assets/textures/amd-decal.webp';

import skinA100Url   from '@/assets/textures/skin-a100.jpg';
import skinL40sUrl   from '@/assets/textures/skin-l40s.jpg';
import skinH100Url   from '@/assets/textures/skin-h100.jpg';
import skinB200Url   from '@/assets/textures/skin-b200.jpg';
import skinMi300xUrl from '@/assets/textures/skin-mi300x.jpg';

export interface GpuTextures {
  pcbNormal: THREE.Texture;
  nickelBrushed: THREE.Texture;
  anodizedDark: THREE.Texture;
  nvidiaDecal: THREE.Texture;
  amdDecal: THREE.Texture;
  skins: Record<string, THREE.Texture>;
}

export function useGpuTextures(): GpuTextures {
  const [
    pcbNormal, nickelBrushed, anodizedDark, nvidiaDecal, amdDecal,
    skinA100, skinL40s, skinH100, skinB200, skinMi300x,
  ] = useTexture([
    pcbNormalUrl, nickelBrushedUrl, anodizedDarkUrl, nvidiaDecalUrl, amdDecalUrl,
    skinA100Url, skinL40sUrl, skinH100Url, skinB200Url, skinMi300xUrl,
  ]) as THREE.Texture[];

  return useMemo<GpuTextures>(() => {
    for (const t of [pcbNormal, nickelBrushed, anodizedDark]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
    }
    pcbNormal.colorSpace = THREE.NoColorSpace;
    nickelBrushed.colorSpace = THREE.SRGBColorSpace;
    anodizedDark.colorSpace = THREE.SRGBColorSpace;

    for (const t of [nvidiaDecal, amdDecal]) {
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    }

    const skins: Record<string, THREE.Texture> = {
      a100: skinA100, l40s: skinL40s, h100: skinH100, b200: skinB200, mi300x: skinMi300x,
    };
    for (const t of Object.values(skins)) {
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 16;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
    }

    return { pcbNormal, nickelBrushed, anodizedDark, nvidiaDecal, amdDecal, skins };
  }, [pcbNormal, nickelBrushed, anodizedDark, nvidiaDecal, amdDecal, skinA100, skinL40s, skinH100, skinB200, skinMi300x]);
}
