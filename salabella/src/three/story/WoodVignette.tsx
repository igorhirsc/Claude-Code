import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { CanvasShell } from '@/three/common/CanvasShell'
import { PostFX } from '@/three/common/PostFX'
import { palette } from '@/three/common/materials'
import { createPlinthMaterial, createWoodGrainMaterial, RING_MAJOR, RING_MINOR } from './WoodGrainMaterial'

/*
  Framing. The ring lies FLAT on the plinth (bore axis = world up) and the
  camera looks down at CAMERA_ELEVATION. The angle between the bore axis and
  the view direction is therefore 90° − elevation = 60°, and the sway is a
  yaw about that same axis, which cannot change it: the bore can never face
  the lens, so there is no black "look through the hole" frame at any point
  of the motion. Through the bore you always see the lit plinth.
*/
export const CAMERA_ELEVATION = THREE.MathUtils.degToRad(30)
const CAMERA_DISTANCE = 5.15
const TARGET = new THREE.Vector3(0, 0.12, 0)
/** Bounded sway instead of a spin: ±18° around BASE_YAW, 50 s period. */
const BASE_YAW = 0.6
export const SWAY_AMPLITUDE = THREE.MathUtils.degToRad(18)
export const SWAY_PERIOD = 50

/** Ring's outer radius plus breathing room, as a fraction of half-frame. */
const RING_FILL = 1 / 1.5

function Rig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    // Pull back in narrow/portrait frames so the ring never clips sideways.
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect
    const distance = Math.max(CAMERA_DISTANCE, (RING_MAJOR + RING_MINOR) / RING_FILL / halfW)
    camera.position.set(0, TARGET.y + Math.sin(CAMERA_ELEVATION) * distance, Math.cos(CAMERA_ELEVATION) * distance)
    camera.lookAt(TARGET)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, aspect, invalidate])
  return null
}

function Ring({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null)
  const material = useMemo(createWoodGrainMaterial, [])
  const geometry = useMemo(() => new THREE.TorusGeometry(RING_MAJOR, RING_MINOR, 72, 220), [])
  useEffect(
    () => () => {
      material.dispose()
      geometry.dispose()
    },
    [material, geometry],
  )

  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.rotation.y = reduced
      ? BASE_YAW
      : BASE_YAW + SWAY_AMPLITUDE * Math.sin((clock.elapsedTime / SWAY_PERIOD) * Math.PI * 2)
  })

  return (
    <group ref={group} position={[0, RING_MINOR, 0]} rotation={[0, BASE_YAW, 0]}>
      <mesh geometry={geometry} material={material} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  )
}

function Plinth() {
  const material = useMemo(createPlinthMaterial, [])
  useEffect(() => () => material.dispose(), [material])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} material={material}>
      <planeGeometry args={[60, 60]} />
    </mesh>
  )
}

/** Fires once the first frames are on screen, so the DOM skeleton can fade. */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0)
  const done = useRef(false)
  const invalidate = useThree((s) => s.invalidate)
  useFrame(() => {
    if (done.current) return
    frames.current += 1
    if (frames.current < 2) {
      invalidate()
      return
    }
    done.current = true
    onReady?.()
  })
  return null
}

export type WoodVignetteProps = {
  /** On screen → render every frame; off screen → frameloop "demand". */
  active: boolean
  reduced?: boolean
  onReady?: () => void
}

/**
 * "Estudo de veio": a turned freijó ring with a hand-written GLSL wood-grain
 * shader, resting on a softly lit plinth. Default export for React.lazy.
 */
export default function WoodVignette({ active, reduced = false, onReady }: WoodVignetteProps) {
  return (
    <CanvasShell
      frameloop={active && !reduced ? 'always' : 'demand'}
      shadows={false}
      dpr={[1, 1.5]}
      camera={{ fov: 30, position: [0, 2.3, 4.3], near: 0.1, far: 60 }}
      aria-hidden
    >
      {/* Safety net: whatever the frame shows beyond the plinth is warm ink. */}
      <color attach="background" args={[palette.ink800]} />
      <Rig />
      <Plinth />
      <Ring reduced={reduced} />
      <ContactShadows
        position={[0, 0, 0]}
        scale={5}
        resolution={512}
        blur={2.2}
        far={1.1}
        opacity={0.8}
        color={palette.ink900}
        frames={1}
      />
      <ReadySignal onReady={onReady} />
      <PostFX bloom={false} vignette={false} grain={!reduced} />
    </CanvasShell>
  )
}
