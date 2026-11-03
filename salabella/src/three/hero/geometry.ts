import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const clamp = THREE.MathUtils.clamp

/** Dense near ±1, sparse in the middle: puts vertices where the rounding is. */
const edgeBias = (t: number) => Math.sign(t) * (1 - (1 - Math.abs(t)) ** 2)

type SoftBoxOptions = {
  /** Subdivisions along x / y / z. */
  seg?: [number, number, number]
  /** Upholstery crown: how far the +Y face domes upward at its centre (m). */
  crownY?: number
  /** Same for the +Z face (a backrest's front). */
  crownZ?: number
}

/**
 * Upholstered block: a rounded box with real surface subdivision and an
 * optional soft crown on one face, welded into ONE smooth-shaded volume
 * (no per-face vertex splits → no shading seams along the rounded edges).
 */
export function softBox(w: number, h: number, d: number, r: number, opts: SoftBoxOptions = {}) {
  const { seg = [24, 10, 18], crownY = 0, crownZ = 0 } = opts
  const g = new THREE.BoxGeometry(2, 2, 2, seg[0], seg[1], seg[2])
  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  const pos = g.attributes.position as THREE.BufferAttribute
  const hx = w / 2
  const hy = h / 2
  const hz = d / 2
  const v = new THREE.Vector3()
  const inner = new THREE.Vector3()
  const n = new THREE.Vector3()

  for (let i = 0; i < pos.count; i++) {
    const ux = edgeBias(pos.getX(i))
    const uy = edgeBias(pos.getY(i))
    const uz = edgeBias(pos.getZ(i))
    v.set(ux * hx, uy * hy, uz * hz)
    inner.set(clamp(v.x, -(hx - r), hx - r), clamp(v.y, -(hy - r), hy - r), clamp(v.z, -(hz - r), hz - r))
    n.subVectors(v, inner)
    if (n.lengthSq() > 1e-12) n.normalize().multiplyScalar(r)
    v.copy(inner).add(n)

    if (crownY) {
      const k = (1 - ux ** 4) * (1 - uz ** 4) * THREE.MathUtils.smoothstep(uy, 0, 1)
      v.y += crownY * k
    }
    if (crownZ) {
      const k = (1 - ux ** 4) * (1 - uy ** 4) * THREE.MathUtils.smoothstep(uz, 0, 1)
      v.z += crownZ * k
    }
    pos.setXYZ(i, v.x, v.y, v.z)
  }

  const welded = mergeVertices(g, 1e-5)
  g.dispose()
  welded.computeVertexNormals()
  return welded
}

/**
 * Throw pillow: two puffed sheets sharing one welded rim, with the classic
 * pinched "dog-ear" corners and a faint fabric ripple. Local axes: x width,
 * y height, z thickness (the thin axis).
 */
export function pillowGeometry(hw: number, hh: number, hz: number, n = 32) {
  const stride = n + 1
  const positions: number[] = []
  const index: number[] = []
  const frontIdx = (i: number, j: number) => j * stride + i
  const backBase = stride * stride
  const onRim = (i: number, j: number) => i === 0 || j === 0 || i === n || j === n
  const backIdx = (i: number, j: number) => (onRim(i, j) ? frontIdx(i, j) : backBase + frontIdx(i, j))

  const vert = (i: number, j: number, side: 1 | -1) => {
    const u = Math.sin(((i / n) * 2 - 1) * (Math.PI / 2))
    const w = Math.sin(((j / n) * 2 - 1) * (Math.PI / 2))
    const pu = 1 - u * u
    const pw = 1 - w * w
    // Edges pull inward mid-span so the corners read as stitched points.
    const x = u * hw * (1 - 0.075 * pw)
    const y = w * hh * (1 - 0.075 * pu)
    const puff = Math.pow(pu * pw, 0.5)
    const ripple = 0.0035 * Math.sin(u * 6.5 + w * 2.2 + (side > 0 ? 0 : 1.7)) * pu * pw
    const z = side * (hz * puff + ripple)
    positions.push(x, y, z)
  }

  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) vert(i, j, 1)
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) vert(i, j, -1)

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = frontIdx(i, j)
      const b = frontIdx(i + 1, j)
      const c = frontIdx(i + 1, j + 1)
      const d = frontIdx(i, j + 1)
      index.push(a, b, c, a, c, d)
      const a2 = backIdx(i, j)
      const b2 = backIdx(i + 1, j)
      const c2 = backIdx(i + 1, j + 1)
      const d2 = backIdx(i, j + 1)
      index.push(a2, c2, b2, a2, d2, c2)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(index)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}
