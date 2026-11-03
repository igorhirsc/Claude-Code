import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useHeroStore } from './heroStore'

export type HeroLayout = 'side' | 'stacked'

/** Orbit pivot: the sofa's visual centre of mass. */
const TARGET = new THREE.Vector3(0, 0.4, 0.02)
/** Resting framing: three-quarter view from front-right, ~21° above. */
const POLAR = 1.2
const AZIMUTH = { side: 0.52, stacked: 0.42 }
const AZ_LIMITS: [number, number] = [-1.2, 1.8]
const POLAR_LIMITS: [number, number] = [1.04, 1.34]
/** Idle sweep: a slow ±20° pendulum that always keeps the front in view. */
const SWAY = { amp: 0.36, omega: (Math.PI * 2) / 19 }
const RESUME_AFTER_MS = 3000
const PARALLAX = { x: 0.07, y: 0.035 }
/** Sofa extents used for framing (m): widest yaw-swept span, and height. */
const FRAME_W = 2.05
const FRAME_H = 1.08
const INTRO = { from: 1.09, seconds: 2.2 }

const sph = new THREE.Spherical()
const off = new THREE.Vector3()

type CameraRigProps = {
  layout: HeroLayout
  /** Reduced motion: static framing, no sweep, no parallax, no dolly. */
  reduced: boolean
  /** Small viewport / coarse pointer: no sweep or parallax, polar locked. */
  calm: boolean
}

/**
 * Orbit camera with restrained polar range, damping, an idle sweep that
 * yields to the user's drag (resuming 3 s after release) and a subtle
 * pointer parallax on the orbit target. Framing is computed from the real
 * canvas size: in the side-by-side layout a lens shift (setViewOffset)
 * parks the sofa in the right-hand column without moving the orbit pivot.
 */
export function CameraRig({ layout, reduced, calm }: CameraRigProps) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const eventsEl = useThree((s) => s.events.connected) as HTMLElement | undefined
  const st = useRef({
    dist: 6,
    dragging: false,
    lastEnd: -Infinity,
    idle: 0,
    phase: 0,
    wasIdle: false,
    px: 0,
    py: 0,
    target: TARGET.clone(),
    placed: false,
  })
  const motion = !reduced && !calm
  const az0 = AZIMUTH[layout]

  // Framing: distance + lens shift from the canvas's real pixel size. The
  // column maths mirrors Hero.tsx: max-w-[1440px] container, copy on the
  // left, sofa centred at ~70% of the container in the side layout.
  useEffect(() => {
    const W = size.width
    const H = size.height
    if (!W || !H) return
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    let cx: number
    let cy: number
    let pxW: number
    let fracH: number
    if (layout === 'side') {
      const C = Math.min(W, 1440)
      cx = (W - C) / 2 + C * 0.7
      cy = H * 0.55
      pxW = C * 0.45
      fracH = 0.5
    } else {
      // The band's bottom ~64px carries the scroll cue: sit the sofa above it.
      cx = W / 2
      cy = H * 0.43
      pxW = W * 0.82
      fracH = 0.62
    }
    const dW = (FRAME_W * H) / (2 * t * pxW)
    const dH = FRAME_H / (2 * t * fracH)
    st.current.dist = Math.max(dW, dH)
    camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H)
    camera.updateProjectionMatrix()

    if (!st.current.placed) {
      st.current.placed = true
      const startMul = reduced ? 1 : INTRO.from
      off.setFromSpherical(sph.set(st.current.dist * startMul, POLAR, az0))
      camera.position.copy(TARGET).add(off)
      camera.lookAt(TARGET)
    }
    return () => {
      camera.clearViewOffset()
    }
  }, [size.width, size.height, layout, camera, reduced, az0])

  // Touch: let vertical swipes scroll the page; horizontal drags orbit.
  useEffect(() => {
    if (!eventsEl) return
    const prev = eventsEl.style.touchAction
    eventsEl.style.touchAction = 'pan-y'
    return () => {
      eventsEl.style.touchAction = prev
    }
  }, [eventsEl])

  // Pointer parallax source: the whole hero, mouse only.
  useEffect(() => {
    if (!motion || !eventsEl) return
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = eventsEl.getBoundingClientRect()
      st.current.px = THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1)
      st.current.py = THREE.MathUtils.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1)
    }
    const s = st.current
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      s.px = 0
      s.py = 0
    }
  }, [motion, eventsEl])

  // Runs before OrbitControls.update() (priority -1) so every frame renders
  // with a consistent position + lookAt.
  useFrame((_, rawDt) => {
    const c = controls.current
    if (!c) return
    const s = st.current
    const dt = Math.min(rawDt, 1 / 20)
    const now = performance.now()

    // Intro dolly, timed to the preloader reveal.
    let mul = 1
    if (!reduced) {
      const revealAt = useHeroStore.getState().revealAt
      const k = THREE.MathUtils.clamp((now - revealAt) / (INTRO.seconds * 1000), 0, 1)
      mul = 1 + (INTRO.from - 1) * Math.pow(1 - k, 3)
    }
    const dist = s.dist * mul
    c.minDistance = dist
    c.maxDistance = dist

    // Parallax on the orbit target.
    const tx = TARGET.x + (motion ? s.px * PARALLAX.x : 0)
    const ty = TARGET.y - (motion ? s.py * PARALLAX.y : 0)
    const lam = 1 - Math.exp(-dt * 3)
    s.target.x += (tx - s.target.x) * lam
    s.target.y += (ty - s.target.y) * lam
    s.target.z = TARGET.z
    c.target.copy(s.target)

    off.copy(camera.position).sub(c.target)
    sph.setFromVector3(off)
    sph.radius = dist

    if (motion) {
      const wantIdle = !s.dragging && now - s.lastEnd > RESUME_AFTER_MS
      if (wantIdle && !s.wasIdle) {
        // Pick up the pendulum where the user left the camera.
        s.phase = Math.asin(THREE.MathUtils.clamp((sph.theta - az0) / SWAY.amp, -1, 1))
      }
      s.wasIdle = wantIdle
      s.idle += ((wantIdle ? 1 : 0) - s.idle) * (1 - Math.exp(-dt * (wantIdle ? 0.9 : 8)))
      if (!s.dragging && s.idle > 1e-3) {
        s.phase += dt * SWAY.omega * s.idle
        const desired = az0 + SWAY.amp * Math.sin(s.phase)
        sph.theta += (desired - sph.theta) * (1 - Math.exp(-dt * 2.4 * s.idle))
      }
    }

    off.setFromSpherical(sph)
    camera.position.copy(c.target).add(off)
  }, -2)

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={TARGET}
      enableDamping
      dampingFactor={0.075}
      rotateSpeed={0.55}
      enableZoom={false}
      enablePan={false}
      minPolarAngle={calm ? POLAR : POLAR_LIMITS[0]}
      maxPolarAngle={calm ? POLAR : POLAR_LIMITS[1]}
      minAzimuthAngle={AZ_LIMITS[0]}
      maxAzimuthAngle={AZ_LIMITS[1]}
      onStart={() => {
        st.current.dragging = true
      }}
      onEnd={() => {
        st.current.dragging = false
        st.current.lastEnd = performance.now()
      }}
    />
  )
}
