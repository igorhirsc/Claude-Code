import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { easing } from 'maath'
import { CanvasShell } from '@/three/common/CanvasShell'
import { StudioLighting, STUDIO_KEY_POSITION, STUDIO_FILL_POSITION } from '@/three/common/Lighting'
import { PostFX } from '@/three/common/PostFX'
import { palette } from '@/three/common/materials'
import { CATEGORIES, type CategoryId } from '@/data/categories'
import {
  CATEGORY_ICONS,
  ICON_SCALE,
  SHADOW_Y,
  SHADOW_FOOTPRINT,
  SHADOW_CONTACTS,
  BASE_YAW,
  IconMaterialsProvider,
} from './CategoryIcons'
import { useCollectionsStore, activeCategory } from './store'

/* ---------------------------------------------------------------------- */
/* Layout contract — MUST mirror the Tailwind classes in Collections.tsx:  */
/*   grid-cols-2 md:grid-cols-3, gap-3 md:gap-6, cards aspect-[4/5]        */
/* ---------------------------------------------------------------------- */
const GRID = {
  colsSmall: 2,
  colsMd: 3,
  gapSmall: 12, // gap-3
  gapMd: 24, // gap-6
  aspect: 5 / 4, // height / width  (aspect-[4/5])
  /** Fallback floor line (fraction of card height) until the DOM is measured. */
  floorFrac: 0.6,
  /** Card lift on hover/focus: hover:-translate-y-1.5 = 6px. */
  liftPx: 6,
  /** Air between an icon's lowest point (any pose) and the card's title. */
  titleClearPx: 24,
  /** Air under the card's index numeral / beside the card's walls. */
  topClearPx: 10,
  sideClearPx: 14,
}

/** World units are CSS pixels (orthographic, zoom 1). */
const BASE_PX = 132
const REF_CELL = 360
// 0.5 keeps icons legible in the 165px cards at 390px wide.
const MIN_CELL_SCALE = 0.5
const MAX_CELL_SCALE = 1.25

const BASE_PITCH = 0.36
const TILT_YAW = 0.42
const TILT_PITCH = 0.14
const SWAY_YAW = 0.07
/** Keyboard focus has no pointer: lean to a fixed, flattering angle. */
const FOCUS_POINTER = { x: 0.55, y: 0.25 }

/** Shadow/glow planes sit behind every icon's deepest point (camera at z=1000). */
const Z_CONTACT = -1300
const Z_SHADOW = -1350
const Z_GLOW = -1400

/**
 * Where each card's DOM text sits, measured by Collections.tsx (px from the
 * card's top edge): the icon must live between the index numeral and the
 * title block, whatever the title's line count at this width.
 */
export type CardMetrics = { textTop: number; topPad: number }

/**
 * Screen-space extents of an icon in authored units, relative to its floor
 * pivot, over EVERY pose it can take (idle sway, hover/focus tilt). Measured
 * from the real vertices once per icon.
 */
type Extents = { minX: number; maxX: number; minY: number; maxY: number }
const extentsCache = new Map<CategoryId, Extents>()

function measureExtents(id: CategoryId, root: THREE.Object3D): Extents {
  const hit = extentsCache.get(id)
  if (hit) return hit
  root.updateWorldMatrix(true, true)
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  const m = new THREE.Matrix4()
  const p = new THREE.Vector3()
  const pts: number[] = []
  const F = SHADOW_Y[id]
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    m.multiplyMatrices(inv, mesh.matrixWorld)
    const pos = mesh.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(m)
      pts.push(p.x, p.y - F, p.z)
    }
  })
  const e: Extents = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  const yaw0 = BASE_YAW[id]
  const yawSpan = TILT_YAW + SWAY_YAW
  for (let a = 0; a <= 8; a++) {
    const yaw = yaw0 - yawSpan + (a / 8) * 2 * yawSpan
    const cy = Math.cos(yaw)
    const sy = Math.sin(yaw)
    for (const pitch of [BASE_PITCH - TILT_PITCH, BASE_PITCH, BASE_PITCH + TILT_PITCH]) {
      const cp = Math.cos(pitch)
      const sp = Math.sin(pitch)
      for (let i = 0; i < pts.length; i += 3) {
        const x = pts[i]
        const y = pts[i + 1]
        const z = pts[i + 2]
        // Euler XYZ (yaw, then pitch), as the pivot applies it
        const X = x * cy + z * sy
        const Y = y * cp + sp * (x * sy - z * cy)
        if (X < e.minX) e.minX = X
        if (X > e.maxX) e.maxX = X
        if (Y < e.minY) e.minY = Y
        if (Y > e.maxY) e.maxY = Y
      }
    }
  }
  extentsCache.set(id, e)
  return e
}

type Cell = { id: CategoryId; x: number; floorY: number; cellW: number; cellH: number; scale: number }

function useCells(small: boolean, metrics: CardMetrics[] | null, extents: Partial<Record<CategoryId, Extents>>): Cell[] {
  const { width, height } = useThree((s) => s.size)
  return useMemo(() => {
    const cols = small ? GRID.colsSmall : GRID.colsMd
    const gap = small ? GRID.gapSmall : GRID.gapMd
    const cellW = (width - gap * (cols - 1)) / cols
    const cellH = cellW * GRID.aspect
    const cellScale = THREE.MathUtils.clamp(cellW / REF_CELL, MIN_CELL_SCALE, MAX_CELL_SCALE)
    return CATEGORIES.map((c, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const left = col * (cellW + gap)
      const top = row * (cellH + gap)
      // px per authored unit for this icon
      let scale = ICON_SCALE[c.id] * cellScale * BASE_PX
      let floor = cellH * GRID.floorFrac
      const m = metrics?.[i]
      const e = extents[c.id]
      if (m && e) {
        // Lowest point (any pose) rests GRID.titleClearPx above the title;
        // the icon shrinks if it would otherwise reach the numeral or walls.
        const bottom = m.textTop - GRID.titleClearPx
        const room = bottom - (m.topPad + GRID.topClearPx) - GRID.liftPx
        const halfW = Math.max(-e.minX, e.maxX)
        scale = Math.max(1, Math.min(scale, room / (e.maxY - e.minY), (cellW / 2 - GRID.sideClearPx) / halfW))
        floor = bottom + e.minY * scale
      }
      return {
        id: c.id,
        x: left + cellW / 2 - width / 2,
        floorY: height / 2 - (top + floor),
        cellW,
        cellH,
        scale,
      }
    })
  }, [width, height, small, metrics, extents])
}

/** One soft radial-gradient texture, shared by every shadow and glow. */
function useRadialTexture() {
  const tex = useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    // white + alpha; tinted by material colour (palette tokens)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.84)')
    g.addColorStop(0.8, 'rgba(255,255,255,0.42)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

const tmpCov = { a: 0, b: 0, c: 0 }
/**
 * Screen-space ellipse of the icon's floor footprint after yaw + pitch.
 * Floor point (x, z) maps to screen (x cosY + z sinY, sinP (x sinY − z cosY))
 * under Euler XYZ — the same order the icon group uses — so the
 * camera-facing shadow always matches the real base, whatever the tilt.
 */
function footprintEllipse(w: number, d: number, yaw: number, pitch: number) {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const sp = Math.sin(pitch)
  const m00 = cy
  const m01 = sy
  const m10 = sp * sy
  const m11 = -sp * cy
  const vx = (w * w) / 12
  const vz = (d * d) / 12
  tmpCov.a = m00 * m00 * vx + m01 * m01 * vz
  tmpCov.b = m00 * m10 * vx + m01 * m11 * vz
  tmpCov.c = m10 * m10 * vx + m11 * m11 * vz
  const { a, b, c } = tmpCov
  const mid = (a + c) / 2
  const r = Math.sqrt(((a - c) / 2) ** 2 + b * b)
  const angle = 0.5 * Math.atan2(2 * b, a - c)
  // 2.6σ: the footprint's corners (√6σ ≈ 2.45σ) still sit inside the falloff
  return { rx: 2.6 * Math.sqrt(mid + r), ry: 2.6 * Math.sqrt(Math.max(mid - r, 1e-6)), angle }
}

function CategoryIcon({
  cell,
  index,
  reduced,
  tex,
  onExtents,
}: {
  cell: Cell
  index: number
  reduced: boolean
  tex: THREE.Texture
  onExtents: (id: CategoryId, e: Extents) => void
}) {
  const Icon = CATEGORY_ICONS[cell.id]
  const F = SHADOW_Y[cell.id]
  const fp = SHADOW_FOOTPRINT[cell.id]

  const root = useRef<THREE.Group>(null!)
  const pivot = useRef<THREE.Group>(null!)
  const authored = useRef<THREE.Group>(null!)
  useLayoutEffect(() => onExtents(cell.id, measureExtents(cell.id, authored.current)), [cell.id, onExtents])
  const shadow = useRef<THREE.Mesh>(null!)
  const glow = useRef<THREE.Mesh>(null!)
  const shadowMat = useRef<THREE.MeshBasicMaterial>(null!)
  const contacts = SHADOW_CONTACTS[cell.id]
  const contactRefs = useRef<(THREE.Mesh | null)[]>([])
  const contactMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        color: palette.ink900,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        opacity: 0,
      }),
    [tex],
  )
  useEffect(() => () => contactMat.dispose(), [contactMat])
  const glowMat = useRef<THREE.MeshBasicMaterial>(null!)
  const s = useRef({ yaw: BASE_YAW[cell.id], pitch: BASE_PITCH, lift: 0, hot: 0 })

  useFrame((state, dt) => {
    const store = useCollectionsStore.getState()
    const { id: activeId, via } = activeCategory(store)
    const active = activeId === cell.id
    const p = via === 'focus' ? FOCUS_POINTER : store.pointer
    const t = state.clock.elapsedTime
    const sway = reduced ? 0 : Math.sin(t * 0.45 + index * 1.3) * 0.07
    const reveal = reduced ? 1 : store.reveal[cell.id]
    const k = s.current
    const d = Math.min(dt, 0.05)

    easing.damp(k, 'yaw', BASE_YAW[cell.id] + (active ? p.x * TILT_YAW : sway), 0.16, d)
    easing.damp(k, 'pitch', BASE_PITCH + (active ? p.y * TILT_PITCH : 0), 0.16, d)
    // 0.07s smooth time ≈ settles in ~220ms, matching the card's CSS lift
    easing.damp(k, 'lift', active ? GRID.liftPx : 0, 0.07, d)
    easing.damp(k, 'hot', active ? 1 : 0, 0.1, d)

    // entrance: unveil on a turntable — grows from its own floor while turning in
    const e = THREE.MathUtils.clamp(reveal, 0, 1)
    const spin = (1 - e) * -0.9
    root.current.position.set(cell.x, cell.floorY + k.lift, 0)
    pivot.current.rotation.set(k.pitch, k.yaw + spin, 0)
    pivot.current.scale.setScalar(Math.max(e, 1e-4))

    // contact shadow, camera-facing, shaped to the footprint at this tilt
    const yaw = k.yaw + spin
    const el = footprintEllipse(fp.w, fp.d, yaw, k.pitch)
    const S = cell.scale * Math.max(e, 1e-4)
    // footprint centre + a nudge toward back-left, away from the key light
    const kx = -Math.sign(STUDIO_KEY_POSITION[0]) * 0.05 * fp.w
    const kz = -Math.sign(STUDIO_KEY_POSITION[2]) * 0.07 * fp.d
    const lx = fp.cx + kx
    const lz = fp.cz + kz
    const sx = lx * Math.cos(yaw) + lz * Math.sin(yaw)
    const sy = Math.sin(k.pitch) * (lx * Math.sin(yaw) - lz * Math.cos(yaw))
    shadow.current.position.set(sx * S, sy * S, Z_SHADOW)
    shadow.current.rotation.set(0, 0, el.angle)
    shadow.current.scale.set(el.rx * S, el.ry * S + 3, 1)
    shadowMat.current.opacity = 0.85 * e * (1 - 0.15 * k.hot)

    // per-foot touch points, projected with the same yaw/pitch map
    const cY = Math.cos(yaw)
    const sY = Math.sin(yaw)
    const sP = Math.sin(k.pitch)
    contacts.forEach(([x, z, r], i) => {
      const mesh = contactRefs.current[i]
      if (!mesh) return
      mesh.position.set((x * cY + z * sY) * S, sP * (x * sY - z * cY) * S, Z_CONTACT)
      mesh.scale.set(r * 1.55 * S, r * 1.55 * S * sP + 1.5, 1)
    })
    contactMat.opacity = 0.85 * e

    glowMat.current.opacity = (0.45 + 0.3 * k.hot) * Math.min(1, e * 1.4)
  })

  // Shadow, contacts & glow live at the floor pivot, depth-tested and parked
  // behind the icon's deepest point: they can only ever show AROUND the
  // object, never on top of it (no x-ray blobs of hidden back legs).
  return (
    <group ref={root}>
      <mesh ref={glow} position={[0, cell.cellH * 0.16, Z_GLOW]} scale={[cell.cellW * 0.5, cell.cellH * 0.46, 1]} renderOrder={-2}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          ref={glowMat}
          map={tex}
          color={palette.ink600}
          transparent
          depthWrite={false}
          toneMapped={false}
          opacity={0}
        />
      </mesh>
      <mesh ref={shadow} renderOrder={-1}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          ref={shadowMat}
          map={tex}
          color={palette.ink900}
          transparent
          depthWrite={false}
          toneMapped={false}
          opacity={0}
        />
      </mesh>
      {contacts.map((_, i) => (
        <mesh key={i} ref={(m) => void (contactRefs.current[i] = m)} renderOrder={-1} material={contactMat}>
          <planeGeometry args={[2, 2]} />
        </mesh>
      ))}
      <group ref={pivot}>
        {/* move the authored floor (y = F) onto the pivot so tilts rock on the base */}
        <group scale={cell.scale} position={[0, -F * cell.scale, 0]}>
          <group ref={authored} userData={{ iconId: cell.id }}>
            <Icon />
          </group>
        </group>
      </group>
    </group>
  )
}

function Scene({ small, reduced, metrics }: { small: boolean; reduced: boolean; metrics: CardMetrics[] | null }) {
  const [extents, setExtents] = useState<Partial<Record<CategoryId, Extents>>>(() => Object.fromEntries(extentsCache))
  const onExtents = useCallback((id: CategoryId, e: Extents) => setExtents((prev) => (prev[id] === e ? prev : { ...prev, [id]: e })), [])
  const cells = useCells(small, metrics, extents)
  const tex = useRadialTexture()
  return (
    <>
      <StudioLighting ground={false} intensity={1} />
      <ambientLight intensity={0.22} color={palette.linen200} />
      {/* parallel key/fill so every icon is lit identically in pixel space */}
      <directionalLight position={STUDIO_KEY_POSITION} intensity={1.5} color={palette.linen50} />
      <directionalLight position={STUDIO_FILL_POSITION} intensity={0.35} color={palette.linen200} />
      <IconMaterialsProvider>
        {cells.map((cell, i) => (
          <CategoryIcon key={cell.id} cell={cell} index={i} reduced={reduced} tex={tex} onExtents={onExtents} />
        ))}
      </IconMaterialsProvider>
      {import.meta.env.DEV && <DebugHook />}
      <PostFX bloom grain={false} vignette={false} />
    </>
  )
}

/**
 * Dev-only: window.__colIcons() → each icon's on-canvas bounding box from its
 * real vertices (CSS px, canvas-relative), for layout checks in scripts.
 */
function DebugHook() {
  const { scene, camera, size, invalidate } = useThree()
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__colIcons = () => {
      invalidate()
      scene.updateMatrixWorld(true)
      const out: Record<string, { top: number; bottom: number; left: number; right: number }> = {}
      const v = new THREE.Vector3()
      scene.traverse((o) => {
        if (!o.userData.iconId) return
        let top = Infinity
        let bottom = -Infinity
        let left = Infinity
        let right = -Infinity
        o.traverse((c) => {
          const mesh = c as THREE.Mesh
          if (!mesh.isMesh) return
          const pos = mesh.geometry.attributes.position
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).project(camera)
            const x = (v.x * 0.5 + 0.5) * size.width
            const y = (-v.y * 0.5 + 0.5) * size.height
            top = Math.min(top, y)
            bottom = Math.max(bottom, y)
            left = Math.min(left, x)
            right = Math.max(right, x)
          }
        })
        out[o.userData.iconId] = { top, bottom, left, right }
      })
      return out
    }
    return () => {
      delete w.__colIcons
    }
  }, [scene, camera, size, invalidate])
  return null
}

export default function CollectionsScene({
  active,
  small,
  reduced,
  metrics = null,
}: {
  active: boolean
  small: boolean
  reduced: boolean
  metrics?: CardMetrics[] | null
}) {
  return (
    <CanvasShell
      orthographic
      shadows={false}
      frameloop={active ? 'always' : 'demand'}
      camera={{ position: [0, 0, 1000], zoom: 1, near: 1, far: 3000 }}
      style={{ pointerEvents: 'none' }}
      aria-hidden
    >
      <Scene small={small} reduced={reduced} metrics={metrics} />
    </CanvasShell>
  )
}
