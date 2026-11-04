import * as THREE from 'three'
import { palette } from '@/three/common/materials'

/**
 * Single source of truth for the sofa's proportions (metres). The visual
 * meshes (HeroSofa) and the physics colliders (HeroScene) both read from here,
 * so the pillows always rest on the surfaces you can see.
 */
export const SOFA = {
  width: 1.9,
  depth: 0.86,
  legH: 0.15,
  trayH: 0.07,
  /** Top of the wooden tray; all upholstery sits on it. */
  base: 0.22,
  arm: { w: 0.16, h: 0.4, zBack: -0.34, zFront: 0.45, r: 0.06 },
  back: { h: 0.58, d: 0.21, tilt: 0.09, zFrontBottom: -0.22, r: 0.07, crown: 0.016 },
  seat: { h: 0.22, zBack: -0.29, zFront: 0.435, r: 0.075, crown: 0.014 },
  legInset: { x: 0.82, z: 0.33 },
  legSplay: 0.075,
} as const

export const ARM_X = SOFA.width / 2 - 0.01 - SOFA.arm.w / 2
export const ARM_INNER = ARM_X - SOFA.arm.w / 2
export const SEAT_TOP = SOFA.base + SOFA.seat.h
/**
 * Arm & seat overlap: the seat tucks this far into each arm. Must be at least
 * the seat's corner radius, or the seat's rounded end pulls away from the
 * arm's flat face and leaves a dark notch where they meet.
 */
export const SEAT_TUCK = SOFA.seat.r + 0.005

/** Backrest pivots on its bottom-front edge; this returns its centre + rotation. */
export function backTransform() {
  const { h, d, tilt, zFrontBottom } = SOFA.back
  const local = new THREE.Vector3(0, h / 2, -d / 2).applyEuler(new THREE.Euler(-tilt, 0, 0))
  return {
    position: [0, SOFA.base + local.y, zFrontBottom + local.z] as [number, number, number],
    rotation: [-tilt, 0, 0] as [number, number, number],
  }
}

/** z of the backrest's (uncrowned) front face at height y. */
export const backFrontZ = (y: number) => SOFA.back.zFrontBottom - (y - SOFA.base) * Math.tan(SOFA.back.tilt)

/** Upholstery: warm oat linen, a quiet stage for the clay + moss pillows. */
export const upholsteryColor = new THREE.Color(palette.linen300).lerp(new THREE.Color(palette.brass300), 0.22)
/** Imbuia-toned hardwood for the tray and legs. */
export const woodColor = new THREE.Color(palette.clay600).lerp(new THREE.Color(palette.ink700), 0.55)

/** Pillow half-extents (m): a 44 cm square, ~14 cm thick at the crown. */
export const PILLOW = { hw: 0.22, hh: 0.22, hz: 0.07 }
