import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import { CanvasShell } from '@/three/common/CanvasShell'
import { ContactShadow, toOverlayLayer } from '@/three/common/ContactShadow'
import { StudioLighting, STUDIO_KEY_POSITION } from '@/three/common/Lighting'
import { PostFX } from '@/three/common/PostFX'
import { palette } from '@/three/common/materials'
import { HeroSofa } from './HeroSofa'
import { ThrowPillow } from './ThrowPillow'
import { ARM_INNER, ARM_X, PILLOW, SEAT_TOP, SOFA, backFrontZ, backTransform } from './sofaSpec'
import { CameraRig, type HeroLayout } from './CameraRig'
import type { PillowId } from './heroStore'

/** Physics surfaces sit a hair below the visual crown: soft cushions give. */
const SINK = 0.006

/**
 * Fixed colliders mirroring the sofa (from the same SOFA spec), plus low
 * invisible curbs along the seat's front edge so a lively toss can never
 * send a pillow off the furniture.
 */
function SofaColliders() {
  const back = backTransform()
  const seatD = SOFA.seat.zFront - SOFA.seat.zBack
  const armD = SOFA.arm.zFront - SOFA.arm.zBack
  const curbH = 0.05
  return (
    <RigidBody type="fixed" colliders={false} friction={1.2}>
      {/* floor */}
      <CuboidCollider args={[4, 0.05, 4]} position={[0, -0.05, 0]} friction={1.2} />
      {/* seat */}
      <CuboidCollider
        args={[ARM_INNER, SOFA.seat.h / 2, seatD / 2]}
        position={[0, SEAT_TOP - SINK - SOFA.seat.h / 2, (SOFA.seat.zBack + SOFA.seat.zFront) / 2]}
        friction={1.3}
      />
      {/* backrest (same pivot + tilt as the mesh), front pushed out by its crown */}
      <CuboidCollider
        args={[SOFA.width / 2, SOFA.back.h / 2, SOFA.back.d / 2 + SOFA.back.crown / 2]}
        position={back.position}
        rotation={back.rotation}
        friction={1.1}
      />
      {/* arms */}
      {[-1, 1].map((s) => (
        <CuboidCollider
          key={s}
          args={[SOFA.arm.w / 2, SOFA.arm.h / 2, armD / 2]}
          position={[s * ARM_X, SOFA.base + SOFA.arm.h / 2, (SOFA.arm.zBack + SOFA.arm.zFront) / 2]}
          friction={1.1}
        />
      ))}
      {/* invisible curb along the seat's front edge */}
      <CuboidCollider
        args={[ARM_INNER, curbH / 2, 0.02]}
        position={[0, SEAT_TOP + curbH / 2, SOFA.seat.zFront - 0.04]}
        friction={1.2}
      />
    </RigidBody>
  )
}

type PillowPose = { id: PillowId; color: string; position: [number, number, number]; rotation: [number, number, number] }

/**
 * Start each pillow leaning on the backrest, a few centimetres above its
 * resting place: close enough that the drop is a soft settle (hidden by the
 * preloader), never a tumble. Corners are checked against the seat and the
 * tilted back so nothing starts interpenetrating (which Rapier would resolve
 * with an explosive push).
 */
function pillowPose(id: PillowId, color: string, x: number, yaw: number, roll: number, drop: number): PillowPose {
  const lean = 0.3
  const euler = new THREE.Euler(-lean, yaw, roll, 'YXZ')
  const hx = PILLOW.hw * 0.95
  const hy = PILLOW.hh * 0.95
  const hz = PILLOW.hz * 0.8
  const corners: THREE.Vector3[] = []
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) corners.push(new THREE.Vector3(sx * hx, sy * hy, sz * hz).applyEuler(euler))
  const minY = Math.min(...corners.map((c) => c.y))
  const y = SEAT_TOP - minY + drop
  // Slide forward until every corner clears the backrest's crowned face.
  let z = backFrontZ(y) + 0.4
  for (let i = 0; i < 80; i++) {
    const clear = corners.every((c) => c.z + z > backFrontZ(c.y + y) + SOFA.back.crown + 0.012)
    if (!clear) break
    z -= 0.005
  }
  z += 0.005
  // RigidBody takes XYZ Euler angles; re-express the YXZ pose.
  const xyz = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromEuler(euler), 'XYZ')
  return { id, color, position: [x, y, z], rotation: [xyz.x, xyz.y, xyz.z] }
}

type HeroSceneProps = {
  /** Section is on screen: render every frame and step physics. */
  active: boolean
  layout: HeroLayout
  reduced: boolean
  /** Small viewport or coarse pointer: lighter detail, no idle motion. */
  lite: boolean
}

export default function HeroScene({ active, layout, reduced, lite }: HeroSceneProps) {
  const pillows = useMemo(() => {
    // Reduced motion: no visible settle — start a millimetre above rest.
    const drop = reduced ? 0.002 : 0.05
    return [
      pillowPose('clay', palette.clay500, -(ARM_INNER - 0.3), 0.16, 0.07, drop),
      pillowPose('moss', palette.moss500, ARM_INNER - 0.31, -0.13, -0.06, drop),
    ]
  }, [reduced])

  const key = useMemo(() => new THREE.Vector3(...STUDIO_KEY_POSITION).normalize().multiplyScalar(7), [])

  return (
    <CanvasShell
      shadows="percentage"
      dpr={lite ? [1, 1.5] : [1, 1.75]}
      frameloop={active ? 'always' : 'demand'}
      camera={{ fov: 28, near: 0.1, far: 40, position: [2, 1.4, 6] }}
      gl={{ alpha: true }}
      aria-hidden
    >
      <StudioLighting intensity={1.05} ground={false} />
      {/* The rig's key softbox as a real shadow caster, so pillows and arms
          cast true shadows onto the upholstery. Same direction as the IBL key. */}
      <directionalLight
        position={key}
        intensity={1.15}
        color={palette.linen50}
        castShadow
        shadow-mapSize={lite ? [1024, 1024] : [2048, 2048]}
        shadow-radius={6}
        shadow-bias={-0.0004}
        shadow-normalBias={0.012}
        shadow-camera-left={-1.5}
        shadow-camera-right={1.5}
        shadow-camera-top={1.5}
        shadow-camera-bottom={-1.5}
        shadow-camera-near={3}
        shadow-camera-far={12}
      />
      <HeroSofa lite={lite} />

      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} paused={!active}>
          <SofaColliders />
          {pillows.map((p) => (
            <ThrowPillow key={p.id} id={p.id} color={p.color} position={p.position} rotation={p.rotation} lite={lite} />
          ))}
        </Physics>
      </Suspense>

      {/* Cast shadow from the key light onto the floor. A catcher, never a
          caster: it lives on the overlay layer the contact captures skip. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0005, 0]} receiveShadow ref={(m) => m && toOverlayLayer(m)}>
        <planeGeometry args={[8, 8]} />
        <shadowMaterial color={palette.ink900} opacity={0.1} transparent depthWrite={false} />
      </mesh>
      {/* Tight contact occlusion where the brass feet meet the floor... */}
      <ContactShadow
        position={[0, -0.001, 0]}
        scale={[3, 2.2]}
        resolution={lite ? 512 : 1024}
        blur={0.9}
        far={0.12}
        opacity={0.8}
        color={palette.ink900}
      />
      {/* ...and a broad, soft ambient pool under the whole piece. */}
      <ContactShadow
        position={[0, -0.0015, 0]}
        scale={[4, 3]}
        resolution={lite ? 256 : 512}
        blur={2.2}
        far={0.9}
        opacity={0.42}
        color={palette.ink900}
      />

      <CameraRig active={active} layout={layout} reduced={reduced} calm={lite} />
      <PostFX bloom={false} vignette={false} grain={!lite && !reduced} ao={!lite} />
    </CanvasShell>
  )
}
