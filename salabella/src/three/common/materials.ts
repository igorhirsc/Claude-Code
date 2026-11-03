import * as THREE from 'three'

/**
 * Shared PBR material presets so every 3D section in the site reads as the
 * same physical "world" — same fabric weight, same wood warmth, same metal.
 * Return plain prop objects (spread onto <meshPhysicalMaterial/>) rather than
 * instances, so React/R3F owns disposal.
 */

export { palette } from '@/data/palette'
import { palette } from '@/data/palette'

export const fabricMaterial = (color: THREE.ColorRepresentation, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) => ({
  color,
  roughness: 0.92,
  metalness: 0,
  sheen: 1,
  sheenRoughness: 0.75,
  sheenColor: new THREE.Color(color).lerp(new THREE.Color(palette.linen50), 0.5),
  clearcoat: 0,
  ...opts,
})

export const boucleMaterial = (color: THREE.ColorRepresentation) => ({
  color,
  roughness: 1,
  metalness: 0,
  sheen: 0.6,
  sheenRoughness: 1,
  sheenColor: new THREE.Color(palette.linen50),
})

export const woodMaterial = (color: THREE.ColorRepresentation, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) => ({
  color,
  roughness: 0.38,
  metalness: 0,
  clearcoat: 0.35,
  clearcoatRoughness: 0.28,
  ...opts,
})

export const leatherMaterial = (color: THREE.ColorRepresentation) => ({
  color,
  roughness: 0.48,
  metalness: 0,
  clearcoat: 0.18,
  clearcoatRoughness: 0.35,
  sheen: 0.25,
  sheenColor: new THREE.Color(color).lerp(new THREE.Color(palette.linen50), 0.3),
})

export const brassMaterial = (opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) => ({
  color: palette.brass400,
  roughness: 0.28,
  metalness: 1,
  envMapIntensity: 1.4,
  ...opts,
})

export const ceramicMaterial = (color: THREE.ColorRepresentation) => ({
  color,
  roughness: 0.12,
  metalness: 0,
  clearcoat: 0.7,
  clearcoatRoughness: 0.1,
})

export const glassMaterial = (opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) => ({
  color: palette.cream,
  roughness: 0.05,
  metalness: 0,
  transmission: 1,
  thickness: 0.4,
  ior: 1.5,
  ...opts,
})
