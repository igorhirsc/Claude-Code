/**
 * The Aurora's upholstery as ONE continuous surface.
 *
 * Earlier builds assembled seat, arms and back from separate rounded
 * primitives and kept losing at the joins: creases where they abutted, then
 * gaps where a capsule arm was embedded against the seat's nominal box while
 * the real rounded surface had already curved away. Here the whole
 * upholstered body is a single signed distance field, meshed once:
 *
 *   side profile = frame rect  ∪smooth  reclined back slab
 *   shell        = profile extruded across the width with rounded edges
 *   body         = shell  −smooth  seat well (rounded box ∩ back plane)
 *                  ∪smooth seat cushion ∪smooth back cushion
 *
 * Smooth unions/subtractions weld every junction with a real fillet, so
 * there is no seam to hide from any camera angle. The field is meshed with
 * naive surface nets and each vertex is projected onto the exact zero set,
 * with normals taken from the field gradient.
 *
 * Pure math, no three.js import: ArmchairModel wraps the arrays in a
 * BufferGeometry, and the seam-check script can reason about the same field.
 */
import { ARMCHAIR, bodyBounds } from './dimensions'

const { WIDTH, BODY_BOTTOM, ARM_TOP, ARM_WIDTH, FRAME_FRONT, FRAME_REAR, DECK_Y, FRAME_RADIUS, EDGE_RADIUS, BACK, SEAT, BACK_CUSHION } =
  ARMCHAIR

/* ------------------------------------------------------------ helpers -- */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Polynomial smooth min — fillet of roughly radius k where surfaces meet. */
function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}
const smax = (a: number, b: number, k: number) => -smin(-a, -b, k)

/** Rounded rectangle, centred at the origin, half extents (hx, hy). */
function roundRect(px: number, py: number, hx: number, hy: number, r: number) {
  const qx = Math.abs(px) - (hx - r)
  const qy = Math.abs(py) - (hy - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r
}

/** Rounded box, centred at the origin. */
function roundBox(px: number, py: number, pz: number, hx: number, hy: number, hz: number, r: number) {
  const qx = Math.abs(px) - (hx - r)
  const qy = Math.abs(py) - (hy - r)
  const qz = Math.abs(pz) - (hz - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r
}

/* -------------------------------------------------------------- field -- */

const BC = Math.cos(BACK.recline)
const BS = Math.sin(BACK.recline)
const RC = Math.cos(SEAT.rake)
const RS = Math.sin(SEAT.rake)

const frameCy = (BODY_BOTTOM + ARM_TOP) / 2
const frameCz = (FRAME_FRONT + FRAME_REAR) / 2
const frameHy = (ARM_TOP - BODY_BOTTOM) / 2
const frameHz = (FRAME_FRONT - FRAME_REAR) / 2

const wellHalfX = WIDTH / 2 - ARM_WIDTH
const seatRear = -0.25
const seatDepth = SEAT.front - seatRear
const seatHeight = SEAT.top - SEAT.bottom

/** Fillet sizes. */
const K_PROFILE = 0.08 // arm roll → back
const K_WELL = 0.09 // deck → back inside the well
const K_LIP = 0.03 // softens the lip where the well is cut
const K_CUSHION = 0.022 // cushions tuck into the frame

export function armchairSDF(x: number, y: number, z: number): number {
  /* side profile (y, z) */
  const frame = roundRect(z - frameCz, y - frameCy, frameHz, frameHy, FRAME_RADIUS)
  const dy = y - BACK.pivot[0]
  const dz = z - BACK.pivot[1]
  const along = dy * BC - dz * BS
  const forward = dy * BS + dz * BC
  const backSlab = roundRect(forward - BACK.thickness / 2, along - BACK.length / 2, BACK.thickness / 2, BACK.length / 2, BACK.radius)
  const profile = smin(frame, backSlab, K_PROFILE)

  /* extrude across the width with rounded edges */
  const re = EDGE_RADIUS
  const wx = profile + re
  const wy = Math.abs(x) - (WIDTH / 2 - re)
  let d = Math.min(Math.max(wx, wy), 0) + Math.hypot(Math.max(wx, 0), Math.max(wy, 0)) - re

  /* carve the seat well: between the arms, above the deck, ahead of the back */
  const wellBox = roundBox(x, y - (DECK_Y + 1), z, wellHalfX, 1, 3, 0.075)
  const ahead = BACK.thickness - forward
  const well = smax(wellBox, ahead, K_WELL)
  d = smax(d, -well, K_LIP)

  /* seat cushion — pivoted on its front-top edge so the front stays at SEAT.top */
  {
    const py = y - SEAT.top
    const pz = z - SEAT.front
    const ly = py * RC - pz * RS
    const lz = py * RS + pz * RC
    const cy = ly + seatHeight / 2
    const cz = lz + seatDepth / 2
    let s = roundBox(x, cy, cz, SEAT.halfWidth, seatHeight / 2, seatDepth / 2, SEAT.radius)
    const u = x / SEAT.halfWidth
    const v = cz / (seatDepth / 2)
    const crown = Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v) * clamp01(cy / (seatHeight / 2) + 0.5)
    s -= SEAT.crown * crown
    d = smin(d, s, K_CUSHION)
  }

  /* back cushion — in the reclined frame of the slab */
  {
    const t0 = BACK.thickness - BACK_CUSHION.embed
    const t1 = BACK.thickness + BACK_CUSHION.thickness
    const hz = (t1 - t0) / 2
    const hy = (BACK_CUSHION.to - BACK_CUSHION.from) / 2
    const cf = forward - (t0 + hz)
    const ca = along - (BACK_CUSHION.from + hy)
    let s = roundBox(x, ca, cf, BACK_CUSHION.halfWidth, hy, hz, BACK_CUSHION.radius)
    const u = x / BACK_CUSHION.halfWidth
    const v = ca / hy
    const crown = Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v) * clamp01(cf / hz + 0.5)
    s -= BACK_CUSHION.crown * crown
    d = smin(d, s, K_CUSHION)
  }

  return d
}

/* --------------------------------------------------------- surface nets -- */

export type MeshArrays = {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  indices: Uint32Array
}

const CORNERS: [number, number, number][] = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
]
const EDGES: [number, number][] = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [0, 2],
  [1, 3],
  [4, 6],
  [5, 7],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
]

function gradient(f: (x: number, y: number, z: number) => number, x: number, y: number, z: number, h: number, out: number[]) {
  out[0] = f(x + h, y, z) - f(x - h, y, z)
  out[1] = f(x, y + h, z) - f(x, y - h, z)
  out[2] = f(x, y, z + h) - f(x, y, z - h)
  const l = Math.hypot(out[0], out[1], out[2]) || 1
  out[0] /= l
  out[1] /= l
  out[2] /= l
}

/**
 * Naive surface nets over a regular grid, then each vertex is snapped to the
 * zero set by Newton steps along the gradient. Triangle winding is taken from
 * the field gradient, so every face points outward.
 */
export function meshSDF(
  f: (x: number, y: number, z: number) => number,
  min: [number, number, number],
  max: [number, number, number],
  cell: number,
  symmetricX = false,
): MeshArrays {
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1
  const ny = Math.ceil((max[1] - min[1]) / cell) + 1
  const nz = Math.ceil((max[2] - min[2]) / cell) + 1
  const vals = new Float32Array(nx * ny * nz)
  // The field is mirror-symmetric in x and the grid is laid out symmetric
  // about x = 0 (see armchairBodyMesh), so sample one half and mirror it.
  const mirror = symmetricX && Math.abs(min[0] + (nx - 1) * cell + min[0]) < cell * 1e-3
  const half = mirror ? Math.ceil(nx / 2) : nx
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < half; i++) {
        const v = f(min[0] + i * cell, min[1] + j * cell, min[2] + k * cell)
        vals[i + nx * (j + ny * k)] = v
        if (mirror) vals[nx - 1 - i + nx * (j + ny * k)] = v
      }

  const cx = nx - 1
  const cy = ny - 1
  const cz = nz - 1
  const cellVert = new Int32Array(cx * cy * cz).fill(-1)
  const pos: number[] = []
  const cv = new Float32Array(8)

  for (let k = 0; k < cz; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        let mask = 0
        for (let c = 0; c < 8; c++) {
          const o = CORNERS[c]
          const v = vals[i + o[0] + nx * (j + o[1] + ny * (k + o[2]))]
          cv[c] = v
          if (v < 0) mask |= 1 << c
        }
        if (mask === 0 || mask === 255) continue
        let sx = 0
        let sy = 0
        let sz = 0
        let n = 0
        for (const [a, b] of EDGES) {
          const va = cv[a]
          const vb = cv[b]
          if (va < 0 === vb < 0) continue
          const t = va / (va - vb)
          const A = CORNERS[a]
          const B = CORNERS[b]
          sx += A[0] + (B[0] - A[0]) * t
          sy += A[1] + (B[1] - A[1]) * t
          sz += A[2] + (B[2] - A[2]) * t
          n++
        }
        cellVert[i + cx * (j + cy * k)] = pos.length / 3
        pos.push(min[0] + (i + sx / n) * cell, min[1] + (j + sy / n) * cell, min[2] + (k + sz / n) * cell)
      }

  // Snap to the true surface.
  const g = [0, 0, 0]
  const h = cell * 0.25
  const vCount = pos.length / 3
  const normals = new Float32Array(vCount * 3)
  for (let v = 0; v < vCount; v++) {
    let x = pos[v * 3]
    let y = pos[v * 3 + 1]
    let z = pos[v * 3 + 2]
    for (let it = 0; it < 3; it++) {
      const d = f(x, y, z)
      gradient(f, x, y, z, h, g)
      x -= d * g[0]
      y -= d * g[1]
      z -= d * g[2]
    }
    gradient(f, x, y, z, h, g)
    pos[v * 3] = x
    pos[v * 3 + 1] = y
    pos[v * 3 + 2] = z
    normals[v * 3] = g[0]
    normals[v * 3 + 1] = g[1]
    normals[v * 3 + 2] = g[2]
  }

  // Quads across every sign-changing grid edge.
  const idx: number[] = []
  const cellAt = (i: number, j: number, k: number) => cellVert[i + cx * (j + cy * k)]
  const tri = (a: number, b: number, c: number) => {
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2]
    const ux = pos[b * 3] - ax, uy = pos[b * 3 + 1] - ay, uz = pos[b * 3 + 2] - az
    const wx = pos[c * 3] - ax, wy = pos[c * 3 + 1] - ay, wz = pos[c * 3 + 2] - az
    const fx = uy * wz - uz * wy
    const fy = uz * wx - ux * wz
    const fz = ux * wy - uy * wx
    const nxs = normals[a * 3] + normals[b * 3] + normals[c * 3]
    const nys = normals[a * 3 + 1] + normals[b * 3 + 1] + normals[c * 3 + 1]
    const nzs = normals[a * 3 + 2] + normals[b * 3 + 2] + normals[c * 3 + 2]
    if (fx * nxs + fy * nys + fz * nzs >= 0) idx.push(a, b, c)
    else idx.push(a, c, b)
  }
  const quad = (a: number, b: number, c: number, d: number) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return
    tri(a, b, c)
    tri(a, c, d)
  }
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const v0 = vals[i + nx * (j + ny * k)] < 0
        if (i < cx && j >= 1 && k >= 1 && j < cy && k < cz && v0 !== vals[i + 1 + nx * (j + ny * k)] < 0)
          quad(cellAt(i, j - 1, k - 1), cellAt(i, j, k - 1), cellAt(i, j, k), cellAt(i, j - 1, k))
        if (j < cy && i >= 1 && k >= 1 && i < cx && k < cz && v0 !== vals[i + nx * (j + 1 + ny * k)] < 0)
          quad(cellAt(i - 1, j, k - 1), cellAt(i, j, k - 1), cellAt(i, j, k), cellAt(i - 1, j, k))
        if (k < cz && i >= 1 && j >= 1 && i < cx && j < cy && v0 !== vals[i + nx * (j + ny * (k + 1))] < 0)
          quad(cellAt(i - 1, j - 1, k), cellAt(i, j - 1, k), cellAt(i, j, k), cellAt(i - 1, j, k))
      }

  // Box-projected UVs (metres) for an isotropic fabric-grain normal map —
  // isotropic so projection switches are invisible.
  const uvs = new Float32Array(vCount * 2)
  for (let v = 0; v < vCount; v++) {
    const ax = Math.abs(normals[v * 3])
    const ay = Math.abs(normals[v * 3 + 1])
    const az = Math.abs(normals[v * 3 + 2])
    const x = pos[v * 3]
    const y = pos[v * 3 + 1]
    const z = pos[v * 3 + 2]
    if (ax >= ay && ax >= az) {
      uvs[v * 2] = z
      uvs[v * 2 + 1] = y
    } else if (ay >= az) {
      uvs[v * 2] = x
      uvs[v * 2 + 1] = z
    } else {
      uvs[v * 2] = x
      uvs[v * 2 + 1] = y
    }
  }

  return { positions: new Float32Array(pos), normals, uvs, indices: new Uint32Array(idx) }
}

let cached: MeshArrays | null = null

/** The Aurora's upholstered body, meshed once per page load and shared. */
export function armchairBodyMesh(cell = 0.0075): MeshArrays {
  if (!cached) {
    const { min, max } = bodyBounds(0.02)
    // Snap the x range to whole cells, symmetric about 0, so meshSDF can mirror.
    const hx = Math.ceil(max[0] / cell) * cell
    min[0] = -hx
    max[0] = hx
    cached = meshSDF(armchairSDF, min, max, cell, true)
  }
  return cached
}
