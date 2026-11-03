import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import type { Line2 } from 'three-stdlib'
import { palette, brassMaterial } from '@/three/common/materials'
import { toOverlayLayer } from '@/three/common/ContactShadow'
import type { CalloutDef } from './dimensions'

type DimensionCalloutProps = {
  def: CalloutDef
  label: string
  value: string
  /** Smaller pill + tighter clamp for narrow canvases. */
  compact?: boolean
}

/** Pixels kept between a label pill and the canvas edge. */
const EDGE = 10
const v = new THREE.Vector3()
const toCam = new THREE.Vector3()

/**
 * Brass dot on a real surface point + hairline leader + label pill.
 * Fades out when its surface turns away from the camera (so a label never
 * floats over the far side of the chair), and the pill is clamped inside the
 * canvas so the card edge can never crop it.
 */
export function DimensionCallout({ def, label, value, compact = false }: DimensionCalloutProps) {
  const anchor = useMemo(() => new THREE.Vector3(...def.anchor), [def])
  const end = useMemo(() => anchor.clone().add(new THREE.Vector3(...def.offset)), [anchor, def])
  const normal = useMemo(() => new THREE.Vector3(...def.normal).normalize(), [def])
  const points = useMemo(() => [anchor, end] as [THREE.Vector3, THREE.Vector3], [anchor, end])

  const dotMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ ...brassMaterial({ roughness: 0.3 }), transparent: true, depthWrite: false }),
    [],
  )
  const lineRef = useRef<Line2>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const fade = useRef(0)
  const group = useRef<THREE.Group>(null!)
  // Overlay layer: drawn by the main camera, never by the contact-shadow
  // capture (else the leader + dot leave a ghost dumbbell on the floor).
  useLayoutEffect(() => toOverlayLayer(group.current), [])
  const pillHalf = compact ? { w: 58, h: 13 } : { w: 74, h: 15 }

  useFrame(({ camera, invalidate }, dt) => {
    toCam.copy(camera.position).sub(anchor).normalize()
    const facing = THREE.MathUtils.smoothstep(toCam.dot(normal), 0.02, 0.28)
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 9)
    const prev = fade.current
    fade.current += (facing - fade.current) * k
    if (Math.abs(fade.current - prev) > 1e-3) invalidate()
    const o = fade.current
    dotMat.opacity = o
    if (lineRef.current) (lineRef.current.material as THREE.Material & { opacity: number }).opacity = o
    if (pillRef.current) {
      pillRef.current.style.opacity = String(o)
      pillRef.current.style.visibility = o < 0.02 ? 'hidden' : 'visible'
    }
  })

  return (
    <group ref={group}>
      <mesh position={anchor} material={dotMat} renderOrder={2}>
        <sphereGeometry args={[0.0105, 20, 14]} />
      </mesh>
      <Line ref={lineRef} points={points} color={palette.brass500} lineWidth={1.6} transparent depthWrite={false} />
      <Html
        position={end}
        zIndexRange={[20, 10]}
        style={{ pointerEvents: 'none' }}
        calculatePosition={(el, camera, size) => {
          v.setFromMatrixPosition(el.matrixWorld).project(camera)
          const x = (v.x * 0.5 + 0.5) * size.width
          const y = (-v.y * 0.5 + 0.5) * size.height
          return [
            THREE.MathUtils.clamp(x, pillHalf.w + EDGE, size.width - pillHalf.w - EDGE),
            THREE.MathUtils.clamp(y, pillHalf.h + EDGE, size.height - pillHalf.h - EDGE),
          ]
        }}
      >
        <div
          ref={pillRef}
          data-callout-pill
          aria-hidden
          className={
            'pointer-events-none flex -translate-x-1/2 -translate-y-1/2 items-baseline gap-1.5 rounded-full border border-brass-400/70 bg-linen-50/92 whitespace-nowrap text-ink-900 shadow-[0_6px_18px_-10px_var(--color-ink-900)] backdrop-blur-sm ' +
            (compact ? 'px-2.5 py-1 text-[0.6875rem]' : 'px-3.5 py-1.5 text-xs')
          }
          style={{ opacity: 0 }}
        >
          <span className="font-medium tracking-[0.14em] text-ink-600 uppercase">{label}</span>
          <span className="font-display text-[1.05em] tabular-nums">{value}</span>
        </div>
      </Html>
    </group>
  )
}
