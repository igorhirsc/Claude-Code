import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { RigidBody, RoundCuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { fabricMaterial } from '@/three/common/materials'
import { setCanvasCursorHover } from '@/components/ui/Cursor'
import { pillowGeometry } from './geometry'
import { useHeroStore, type PillowId } from './heroStore'

/** Pillow half-extents (m): a 44 cm square, ~14 cm thick at the crown. */
export const PILLOW = { hw: 0.22, hh: 0.22, hz: 0.07 }
/** Collider: a rounded slab a little inside the puffed silhouette. */
const COLLIDER = { hw: 0.18, hh: 0.18, hz: 0.026, r: 0.03 }
const MASS = 0.6 // kg — a feather-filled 45 cm pillow

/**
 * Toss targets, as velocity changes. The impulse is derived from the body's
 * real mass and inertia so the motion is the same whatever the collider.
 * Up 1.3 m/s ≈ an 8–9 cm hop; 0.55 m/s sideways ≈ 15 cm of drift in the air.
 * Pitch/roll stay low so the thin pillow wobbles but never flips on edge;
 * the yaw (spin about its thin axis) carries the playfulness.
 */
const TOSS = { up: 1.3, lateral: 0.55, pitchRoll: 0.75, yaw: 2.2 }

const sign = () => (Math.random() < 0.5 ? -1 : 1)
const q = new THREE.Quaternion()
const v = new THREE.Vector3()

type ThrowPillowProps = {
  id: PillowId
  color: THREE.ColorRepresentation
  position: [number, number, number]
  rotation: [number, number, number]
  lite?: boolean
}

export function ThrowPillow({ id, color, position, rotation, lite = false }: ThrowPillowProps) {
  const body = useRef<RapierRigidBody>(null)
  const hovered = useRef(false)
  const geometry = useMemo(() => pillowGeometry(PILLOW.hw, PILLOW.hh, PILLOW.hz, lite ? 22 : 36), [lite])
  useEffect(() => () => geometry.dispose(), [geometry])

  const material = useMemo(
    () => fabricMaterial(color, { roughness: 0.82, sheen: 1, sheenRoughness: 0.45 }),
    [color],
  )

  useEffect(() => {
    const toss = () => {
      const rb = body.current
      if (!rb) return
      const m = rb.mass()
      rb.applyImpulse({ x: sign() * TOSS.lateral * m, y: TOSS.up * m, z: 0 }, true)

      // Angular impulse L = I·Δω in the body's principal frame (the collider's
      // own axes for a centred slab), rotated into world space.
      const I = rb.principalInertia()
      const r = rb.rotation()
      q.set(r.x, r.y, r.z, r.w)
      v.set(I.x * sign() * TOSS.pitchRoll, I.y * sign() * TOSS.pitchRoll, I.z * sign() * TOSS.yaw).applyQuaternion(q)
      rb.applyTorqueImpulse({ x: v.x, y: v.y, z: v.z }, true)
    }
    return useHeroStore.subscribe((s, prev) => {
      if (s.tossNonce !== prev.tossNonce && (s.tossTarget === 'all' || s.tossTarget === id)) toss()
    })
  }, [id])

  // Never leave the shared cursor stuck in its hover state.
  useEffect(
    () => () => {
      if (hovered.current) setCanvasCursorHover(false)
    },
    [],
  )

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (hovered.current) return
    hovered.current = true
    setCanvasCursorHover(true)
  }
  const onOut = () => {
    if (!hovered.current) return
    hovered.current = false
    setCanvasCursorHover(false)
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    // A drag that happens to end on a pillow orbits the camera; only a
    // genuine click tosses.
    if (e.delta > 6) return
    useHeroStore.getState().toss(id)
  }

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={position}
      rotation={rotation}
      linearDamping={0.35}
      angularDamping={0.9}
      canSleep
    >
      <RoundCuboidCollider
        args={[COLLIDER.hw, COLLIDER.hh, COLLIDER.hz, COLLIDER.r]}
        mass={MASS}
        friction={1.1}
        restitution={0.05}
      />
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        <meshPhysicalMaterial {...material} />
      </mesh>
    </RigidBody>
  )
}
