import { use, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { palette, fabricMaterial, woodMaterial, brassMaterial } from '@/three/common/materials'
import { ARMCHAIR } from './dimensions'
import { loadArmchairBody } from './bodyLoader'
import { swatchById, type SwatchId } from './swatches'

const { LEG, BODY_BOTTOM, WIDTH } = ARMCHAIR

/* ------------------------------------------------------- fabric grain -- */

let grainTexture: THREE.CanvasTexture | null = null

/**
 * Tileable, isotropic slub-linen grain baked to a normal map on a canvas.
 * Isotropic on purpose: the body uses box-projected UVs, and a directional
 * weave would show where the projection switches axis.
 */
function fabricGrain() {
  if (grainTexture) return grainTexture
  const N = 256
  const h = new Float32Array(N * N)
  // a few octaves of tileable value noise
  const octave = (cells: number, amp: number, seed: number) => {
    const g = new Float32Array(cells * cells)
    let s = seed
    for (let i = 0; i < g.length; i++) {
      s = (s * 16807) % 2147483647
      g[i] = s / 2147483647
    }
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const fx = (x / N) * cells
        const fy = (y / N) * cells
        const x0 = Math.floor(fx)
        const y0 = Math.floor(fy)
        const tx = fx - x0
        const ty = fy - y0
        const sx = tx * tx * (3 - 2 * tx)
        const sy = ty * ty * (3 - 2 * ty)
        const at = (i: number, j: number) => g[(i % cells) + cells * (j % cells)]
        const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
        const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
        h[x + N * y] += (a + (b - a) * sy) * amp
      }
  }
  octave(64, 0.55, 7)
  octave(128, 0.35, 19)
  octave(32, 0.25, 41)

  const data = new Uint8ClampedArray(N * N * 4)
  const strength = 2.2
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const l = h[((x - 1 + N) % N) + N * y]
      const r = h[((x + 1) % N) + N * y]
      const d = h[x + N * ((y - 1 + N) % N)]
      const u = h[x + N * ((y + 1) % N)]
      let nx = (l - r) * strength
      let ny = (d - u) * strength
      let nz = 1
      const len = Math.hypot(nx, ny, nz)
      nx /= len
      ny /= len
      nz /= len
      const o = (x + N * y) * 4
      data[o] = (nx * 0.5 + 0.5) * 255
      data[o + 1] = (ny * 0.5 + 0.5) * 255
      data[o + 2] = (nz * 0.5 + 0.5) * 255
      data[o + 3] = 255
    }
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = N
  canvas.getContext('2d')!.putImageData(new ImageData(data, N, N), 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  // UVs are in metres: one tile every 7 cm
  tex.repeat.set(1 / 0.07, 1 / 0.07)
  tex.anisotropy = 4
  grainTexture = tex
  return tex
}

/* ---------------------------------------------------------------- legs -- */

type LegPose = { position: THREE.Vector3; quaternion: THREE.Quaternion; length: number; dir: THREE.Vector3 }

/** Four splayed legs, derived from dimensions.ts so the feet land exactly on y = 0. */
function legPoses(): LegPose[] {
  const topY = BODY_BOTTOM + LEG.embed
  const s = Math.sin(LEG.splay) / Math.SQRT2
  const c = Math.cos(LEG.splay)
  const length = topY / c
  const poses: LegPose[] = []
  for (const sx of [-1, 1])
    for (const [sz, z] of [
      [1, LEG.zFront],
      [-1, LEG.zRear],
    ] as const) {
      const dir = new THREE.Vector3(sx * s, -c, sz * s).normalize()
      const top = new THREE.Vector3(sx * LEG.x, topY, z)
      const position = top.clone().addScaledVector(dir, length / 2)
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate())
      poses.push({ position, quaternion, length, dir })
    }
  return poses
}

/* --------------------------------------------------------------- model -- */

type ArmchairModelProps = {
  swatchId: SwatchId
  /** Snap colour changes instead of blending (prefers-reduced-motion). */
  reduced?: boolean
  onReady?: () => void
}

const tmpTarget = new THREE.Color()
const tmpSheen = new THREE.Color()
const sheenTint = new THREE.Color(palette.linen50)

/**
 * The Poltrona Aurora. One upholstered SDF body (see upholstery.ts), four
 * tapered freijó legs with brass sabots + collars. All fabric surfaces share
 * ONE material, so a swatch change recolours the whole chair in lockstep.
 */
export function ArmchairModel({ swatchId, reduced = false, onReady }: ArmchairModelProps) {
  const arrays = use(loadArmchairBody())
  const invalidate = useThree((s) => s.invalidate)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arrays.positions, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(arrays.normals, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(arrays.uvs, 2))
    g.setIndex(new THREE.BufferAttribute(arrays.indices, 1))
    g.computeBoundingSphere()
    g.computeBoundingBox()
    return g
  }, [arrays])
  useEffect(() => () => geometry.dispose(), [geometry])

  const initial = useRef(swatchById(swatchId))
  const fabric = useMemo(() => {
    const base = palette[initial.current.color]
    const m = new THREE.MeshPhysicalMaterial({
      ...fabricMaterial(base),
      normalMap: fabricGrain(),
      normalScale: new THREE.Vector2(0.32, 0.32),
    })
    return m
  }, [])
  useEffect(() => () => fabric.dispose(), [fabric])

  const wood = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial(
        // freijó: warm mid-brown, lifted off black so it still reads as wood
        woodMaterial(new THREE.Color(palette.clay600).lerp(new THREE.Color(palette.ink600), 0.32), {
          roughness: 0.42,
          clearcoat: 0.4,
        }),
      ),
    [],
  )
  const brass = useMemo(() => new THREE.MeshPhysicalMaterial(brassMaterial({ roughness: 0.24 })), [])
  useEffect(
    () => () => {
      wood.dispose()
      brass.dispose()
    },
    [wood, brass],
  )

  const legs = useMemo(legPoses, [])
  const legGeo = useMemo(() => new THREE.CylinderGeometry(LEG.radiusTop, LEG.radiusBottom, legs[0].length, 28, 1), [legs])
  const sabotGeo = useMemo(() => new THREE.CylinderGeometry(LEG.sabotRadius, LEG.sabotRadius * 0.94, LEG.sabotHeight, 28), [])
  const collarGeo = useMemo(() => new THREE.CylinderGeometry(LEG.collarRadius, LEG.collarRadius, LEG.collarHeight, 28), [])
  useEffect(
    () => () => {
      legGeo.dispose()
      sabotGeo.dispose()
      collarGeo.dispose()
    },
    [legGeo, sabotGeo, collarGeo],
  )

  // Frame-rate-independent blend of colour AND sheen toward the swatch.
  const target = swatchById(swatchId)
  useLayoutEffect(() => {
    invalidate()
  }, [swatchId, invalidate])
  useFrame((_, dt) => {
    tmpTarget.set(palette[target.color])
    tmpSheen.copy(tmpTarget).lerp(sheenTint, 0.5)
    const k = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 7)
    fabric.color.lerp(tmpTarget, k)
    fabric.sheenColor.lerp(tmpSheen, k)
    const dr = Math.abs(fabric.color.r - tmpTarget.r) + Math.abs(fabric.color.g - tmpTarget.g) + Math.abs(fabric.color.b - tmpTarget.b)
    if (dr > 1e-4) invalidate()
  })

  // Ready = the chair has actually been drawn, not merely mounted: the first
  // useFrame runs right before the first render of this mesh; the next
  // animation frame is after it was presented, so the skeleton never fades
  // onto a blank canvas (shader compile can take seconds on slow GPUs).
  const readyFired = useRef(false)
  const readyRaf = useRef(0)
  useFrame(() => {
    if (readyFired.current) return
    readyFired.current = true
    readyRaf.current = requestAnimationFrame(() => onReady?.())
  })
  useEffect(
    () => () => {
      cancelAnimationFrame(readyRaf.current)
      readyFired.current = false
    },
    [],
  )

  return (
    <group name="poltrona-aurora">
      <mesh name="upholstery" geometry={geometry} material={fabric} castShadow receiveShadow />
      {legs.map((leg, i) => {
        // sabot sits on the floor end of the leg, collar caps it
        const footCentre = leg.length / 2 - LEG.sabotHeight / 2
        const collarCentre = leg.length / 2 - LEG.sabotHeight - LEG.collarHeight / 2 + 0.002
        return (
          <group key={i} position={leg.position} quaternion={leg.quaternion}>
            <mesh name="leg" geometry={legGeo} material={wood} castShadow />
            <mesh name="sabot" geometry={sabotGeo} material={brass} position={[0, -footCentre, 0]} castShadow />
            <mesh name="collar" geometry={collarGeo} material={brass} position={[0, -collarCentre, 0]} />
          </group>
        )
      })}
    </group>
  )
}

/** Half-width, exported for framing maths in the scene. */
export const ARMCHAIR_HALF_WIDTH = WIDTH / 2
