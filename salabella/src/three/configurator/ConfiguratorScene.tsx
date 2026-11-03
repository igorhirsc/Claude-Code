import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { CanvasShell } from '@/three/common/CanvasShell'
import { ContactShadow } from '@/three/common/ContactShadow'
import { StudioLighting, STUDIO_KEY_POSITION } from '@/three/common/Lighting'
import { PostFX } from '@/three/common/PostFX'
import { palette } from '@/three/common/materials'
import { ArmchairModel } from './ArmchairModel'
import { DimensionCallout } from './DimensionCallout'
import { ARMCHAIR, CALLOUTS, specCm, SPECS } from './dimensions'
import type { SwatchId } from './swatches'

/** Imperative handle so DOM buttons give the orbit a keyboard path. */
export type ConfiguratorApi = { rotate: (radians: number) => void; reset: () => void }

export type ConfiguratorSceneProps = {
  swatchId: SwatchId
  /** Section on screen → render every frame; off screen → frameloop "demand". */
  active: boolean
  reduced?: boolean
  /** Narrow canvas: pull the camera back and use compact callouts. */
  compact?: boolean
  callouts?: boolean
  apiRef?: MutableRefObject<ConfiguratorApi | null>
  onReady?: () => void
}

/** Orbit target: the chair's visual centre of mass, a little above the seat. */
const TARGET = new THREE.Vector3(0, ARMCHAIR.extents.height * 0.47, 0.01)
/** Front three-quarter, slightly from the right, eye a little above seat. */
const HOME_AZIMUTH = 0.62
const HOME_POLAR = 1.2
/** Gentle autorotate sways between these azimuths instead of spinning. */
const SWAY_MIN = 0.12
const SWAY_MAX = 1.0
const RESUME_AFTER_MS = 3200

function cameraPosition(azimuth: number, polar: number, distance: number) {
  return new THREE.Vector3().setFromSphericalCoords(distance, polar, azimuth).add(TARGET)
}

function Rig({
  active,
  reduced,
  distance,
  apiRef,
}: {
  /** Off screen: no sway, no controls.update() → demand frameloop goes idle. */
  active: boolean
  reduced: boolean
  distance: number
  apiRef?: MutableRefObject<ConfiguratorApi | null>
}) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const auto = useRef(!reduced)
  const speed = useRef(0.55)
  const goal = useRef<number | null>(null)
  const resumeTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    camera.position.copy(cameraPosition(HOME_AZIMUTH, HOME_POLAR, distance))
    camera.lookAt(TARGET)
    controls.current?.update()
    invalidate()
  }, [camera, distance, invalidate])

  // Vertical swipes keep scrolling the page on touch; horizontal drags orbit.
  useEffect(() => {
    gl.domElement.style.touchAction = 'pan-y'
  }, [gl])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const pause = () => {
      auto.current = false
      goal.current = null
      window.clearTimeout(resumeTimer.current)
    }
    const resume = () => {
      window.clearTimeout(resumeTimer.current)
      if (!reduced) resumeTimer.current = window.setTimeout(() => (auto.current = true), RESUME_AFTER_MS)
    }
    c.addEventListener('start', pause)
    c.addEventListener('end', resume)
    return () => {
      c.removeEventListener('start', pause)
      c.removeEventListener('end', resume)
      window.clearTimeout(resumeTimer.current)
    }
  }, [reduced])

  useEffect(() => {
    if (!apiRef) return
    apiRef.current = {
      rotate: (r) => {
        const c = controls.current
        if (!c) return
        auto.current = false
        goal.current = (goal.current ?? c.getAzimuthalAngle()) + r
        window.clearTimeout(resumeTimer.current)
        if (!reduced) resumeTimer.current = window.setTimeout(() => (auto.current = true), RESUME_AFTER_MS * 2)
        invalidate()
      },
      reset: () => {
        goal.current = HOME_AZIMUTH
        invalidate()
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [apiRef, reduced, invalidate])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c || !active) return
    if (import.meta.env.DEV && (window as unknown as Record<string, unknown>).__auroraFrozen) return
    const az = c.getAzimuthalAngle()
    if (goal.current !== null) {
      // eased keyboard rotation: exponential approach, frame-rate independent
      const k = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 6)
      let next = az + (goal.current - az) * k
      if (Math.abs(goal.current - next) < 1e-3) {
        next = goal.current
        goal.current = null
      }
      const off = new THREE.Vector3().subVectors(camera.position, c.target)
      const sph = new THREE.Spherical().setFromVector3(off)
      sph.theta = next
      camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(c.target))
      invalidate()
    } else if (auto.current) {
      // ping-pong sway — a slow turn that always shows the chair's face
      if (az > SWAY_MAX) speed.current = -Math.abs(speed.current)
      else if (az < SWAY_MIN) speed.current = Math.abs(speed.current)
      const next = az + speed.current * 0.12 * Math.min(dt, 0.1)
      const off = new THREE.Vector3().subVectors(camera.position, c.target)
      const sph = new THREE.Spherical().setFromVector3(off)
      sph.theta = next
      camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(c.target))
    }
    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={TARGET}
      enabled={active}
      enableDamping
      dampingFactor={0.075}
      rotateSpeed={0.6}
      enablePan={false}
      enableZoom={false}
      minPolarAngle={0.92}
      maxPolarAngle={1.42}
    />
  )
}

/**
 * Dev-only hook for scripts/arm-seam-check.mjs: fixed camera views and a flat
 * "mask" render (upholstery / wood+brass / background as three flat colours)
 * so seams can be checked by pixel, plus the body SDF for embed checks.
 * Stripped from production builds by the import.meta.env.DEV guard.
 */
function DebugHook() {
  const { camera, scene, invalidate, controls } = useThree()
  const get = useThree((st) => st.get)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const saved = new Map<THREE.Object3D, { material?: THREE.Material | THREE.Material[]; visible: boolean }>()
    const w = window as unknown as Record<string, unknown>
    w.__aurora = {
      state: () => {
        const st = get()
        return { size: st.size, viewport: { w: st.viewport.width, dpr: st.viewport.dpr } }
      },
      setView: (azimuth: number, polar: number, distance = 3.05) => {
        const c = controls as unknown as { target: THREE.Vector3; update: () => void; enabled: boolean } | null
        camera.position.setFromSphericalCoords(distance, polar, azimuth).add(TARGET)
        camera.lookAt(TARGET)
        if (c) {
          c.enabled = false
          c.update()
        }
        w.__auroraFrozen = true
        invalidate()
      },
      setMask: (on: boolean) => {
        if (on) {
          scene.userData.bg = scene.background
          scene.background = new THREE.Color(palette.linen50)
          const flat = (hex: string) => new THREE.MeshBasicMaterial({ color: hex })
          const uph = flat(palette.clay500)
          const hard = flat(palette.moss600)
          scene.traverse((o) => {
            const m = o as THREE.Mesh
            if (!m.isMesh && !(o as THREE.Object3D & { isLine2?: boolean }).isLine2) return
            saved.set(o, { material: m.material, visible: o.visible })
            if (o.name === 'upholstery') m.material = uph
            else if (o.name === 'leg' || o.name === 'sabot' || o.name === 'collar') m.material = hard
            else o.visible = false
          })
        } else {
          scene.background = scene.userData.bg
          saved.forEach((v, o) => {
            if (v.material) (o as THREE.Mesh).material = v.material
            o.visible = v.visible
          })
          saved.clear()
        }
        invalidate()
      },
      meshComponents: () => {
        const mesh = scene.getObjectByName('upholstery') as THREE.Mesh | undefined
        if (!mesh) return -1
        const index = mesh.geometry.index!.array
        const n = mesh.geometry.attributes.position.count
        const parent = new Int32Array(n).map((_, i) => i)
        const find = (a: number): number => {
          while (parent[a] !== a) a = parent[a] = parent[parent[a]]
          return a
        }
        for (let i = 0; i < index.length; i += 3) {
          const a = find(index[i])
          parent[find(index[i + 1])] = a
          parent[find(index[i + 2])] = a
        }
        const roots = new Set<number>()
        for (let i = 0; i < n; i++) roots.add(find(i))
        return roots.size
      },
    }
    return () => {
      delete w.__aurora
    }
  }, [camera, scene, invalidate, controls, get])
  return null
}

function Scene({
  active,
  swatchId,
  reduced = false,
  compact = false,
  callouts = true,
  apiRef,
  onReady,
}: ConfiguratorSceneProps) {
  const distance = compact ? 3.55 : 3.05
  const labels = useMemo(
    () =>
      CALLOUTS.map((c) => {
        const spec = SPECS.find((s) => s.id === c.id)!
        return { def: c, label: c.id === 'assento' ? 'Assento' : spec.label, value: `${specCm(c.id)} cm` }
      }),
    [],
  )

  return (
    <>
      <color attach="background" args={[palette.linen200]} />
      <StudioLighting ground={false} intensity={1.05} />
      {/* a touch of direct key light, from the rig's own key position, for form */}
      <directionalLight position={STUDIO_KEY_POSITION} intensity={0.55} color={palette.linen50} />
      <ArmchairModel swatchId={swatchId} reduced={reduced} onReady={onReady} />
      {/* one soft contact shadow, captured once (the chair never moves). The
          callouts live on the overlay layer, so they never cast into it. */}
      <ContactShadow position={[0, -0.0005, 0]} scale={[3.2, 3.2]} resolution={1024} far={0.65} blur={2.6} opacity={0.55} color={palette.ink900} frames={1} />
      {callouts && labels.map((l) => <DimensionCallout key={l.def.id} def={l.def} label={l.label} value={l.value} compact={compact} />)}
      <Rig active={active} reduced={reduced} distance={distance} apiRef={apiRef} />
      {import.meta.env.DEV && <DebugHook />}
      <PostFX bloom={false} />
    </>
  )
}

/**
 * Studio set for the Poltrona Aurora: shared CanvasShell + StudioLighting +
 * PostFX, damped orbit with a gentle sway, dimension callouts. Default export
 * so sections can React.lazy() it and keep three.js out of the main bundle.
 */
export default function ConfiguratorScene({ active, ...rest }: ConfiguratorSceneProps) {
  return (
    <CanvasShell
      frameloop={active ? 'always' : 'demand'}
      camera={{ fov: 30, near: 0.1, far: 30, position: cameraPosition(HOME_AZIMUTH, HOME_POLAR, rest.compact ? 3.55 : 3.05).toArray() }}
      shadows={false}
      aria-label="Poltrona Aurora em 3D — arraste para girar"
    >
      <Scene active={active} {...rest} />
    </CanvasShell>
  )
}
