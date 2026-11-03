/**
 * Poltrona Aurora — single source of truth for the armchair's geometry AND
 * the measurements printed on the page. Units are metres; y is up, the floor
 * is y = 0, the seat faces +z.
 *
 * Nothing in ArmchairModel, DimensionCallout or the spec list hard-codes a
 * size: every mesh, callout anchor and "84 cm" label is derived from the
 * constants below, so the numbers a visitor reads are the model they see.
 *
 * This module is plain math (no three.js import) so the DOM side of the site
 * can read the spec sheet without pulling WebGL code into the main bundle.
 */

export type Vec3 = [number, number, number]

const deg = (d: number) => (d * Math.PI) / 180

/* -------------------------------------------------------------- frame -- */

/** Overall width, arm face to arm face. */
const WIDTH = 0.84
/** Underside of the upholstered body — the top of the legs. */
const BODY_BOTTOM = 0.17
/** Top of the arm rolls. */
const ARM_TOP = 0.6
/** Arm thickness (outer face to inner face of the well). */
const ARM_WIDTH = 0.13
/** Front face of the upholstered frame (arms and base). */
const FRAME_FRONT = 0.4
/** Rear face of the frame at its base. */
const FRAME_REAR = -0.38
/** Deck the seat cushion rests on. */
const DECK_Y = 0.33

/** Back rest: reclined slab rising from inside the frame. */
const BACK = {
  /** Recline from vertical — top travels rearward. */
  recline: deg(9),
  /** Pivot of the recline: bottom-rear of the slab, buried in the frame. */
  pivot: [0.26, -0.37] as [number, number], // (y, z)
  /** Slab thickness front-to-back and its height along the reclined axis. */
  thickness: 0.2,
  length: 0.55,
  /** Profile corner radius — the soft roll on top of the back. */
  radius: 0.085,
}

/** Profile radius of the frame's side silhouette and its extruded edges. */
const FRAME_RADIUS = 0.06
const EDGE_RADIUS = 0.055

/** Seat cushion: loose, crowned, proud of the frame at the front. */
const SEAT = {
  halfWidth: WIDTH / 2 - ARM_WIDTH + 0.012, // squeezed 12 mm into each arm
  bottom: DECK_Y - 0.03,
  /** Nominal top before crowning (front edge height ≈ seat height). */
  top: 0.45,
  front: FRAME_FRONT + 0.03,
  radius: 0.06,
  crown: 0.014,
  /** Slight rake so the cushion sheds you toward the back. */
  rake: deg(3),
}

/** Back cushion, in the back slab's reclined frame. */
const BACK_CUSHION = {
  halfWidth: SEAT.halfWidth,
  /** Thickness proud of the slab's front face (plus a 20 mm embed). */
  thickness: 0.12,
  embed: 0.02,
  /** Along the reclined axis, measured from the pivot. */
  from: 0.13,
  to: 0.5,
  radius: 0.06,
  crown: 0.012,
}

/* ---------------------------------------------------------------- legs -- */

/**
 * Classic tapered leg: wide where it meets the frame, narrow at the floor,
 * splayed outward a few degrees, with a brass sabot + collar at the foot.
 */
const LEG = {
  /** Inset from the frame's flat underside, clear of its rounded edges. */
  x: WIDTH / 2 - 0.085,
  zFront: FRAME_FRONT - 0.085,
  zRear: FRAME_REAR + 0.085,
  /** Leg top is buried this far up into the upholstery. */
  embed: 0.035,
  radiusTop: 0.024,
  radiusBottom: 0.0135,
  splay: deg(6),
  sabotHeight: 0.042,
  sabotRadius: 0.0165,
  collarHeight: 0.007,
  collarRadius: 0.0195,
}

/* ----------------------------------------------------- derived extents -- */

/** Rotate a (y, z) offset by the back's recline about its pivot. */
export function backToWorld(along: number, forward: number): [number, number] {
  const c = Math.cos(BACK.recline)
  const s = Math.sin(BACK.recline)
  // local +along = up the reclined slab (tilting toward -z), +forward = +z
  const y = BACK.pivot[0] + along * c + forward * s
  const z = BACK.pivot[1] - along * s + forward * c
  return [y, z]
}

/**
 * Exact outer extents of the reclined back slab. The slab is a rounded rect
 * of half extents (t/2, L/2) centred at (along L/2, forward t/2); its outer
 * envelope is the inner rect rotated + radius.
 */
function backExtents() {
  const r = BACK.radius
  const corners: [number, number][] = []
  for (const a of [r, BACK.length - r])
    for (const f of [r, BACK.thickness - r]) corners.push(backToWorld(a, f))
  const top = Math.max(...corners.map((p) => p[0])) + r
  const rear = Math.min(...corners.map((p) => p[1])) - r
  return { top, rear }
}

const back = backExtents()

/**
 * The raked cushion pivots on its front-top edge, so its lower front corner
 * swings slightly forward: that corner is the chair's frontmost point.
 */
const seatFront = (() => {
  const h = SEAT.top - SEAT.bottom
  const r = SEAT.radius
  return SEAT.front + (h - r) * Math.sin(SEAT.rake) - r * Math.cos(SEAT.rake) + r
})()

/** Height of the crowned seat at its front edge — what a tape would read. */
const SEAT_HEIGHT = SEAT.top

export const ARMCHAIR = {
  WIDTH,
  BODY_BOTTOM,
  ARM_TOP,
  ARM_WIDTH,
  FRAME_FRONT,
  FRAME_REAR,
  DECK_Y,
  FRAME_RADIUS,
  EDGE_RADIUS,
  BACK,
  SEAT,
  BACK_CUSHION,
  LEG,
  /** Measured envelope (metres). */
  extents: {
    width: WIDTH,
    height: back.top,
    front: seatFront,
    rear: back.rear,
    depth: seatFront - back.rear,
    seatHeight: SEAT_HEIGHT,
    armHeight: ARM_TOP,
  },
} as const

/** Axis-aligned bounds of the upholstered body, padded for meshing. */
export function bodyBounds(pad = 0.02): { min: Vec3; max: Vec3 } {
  return {
    min: [-WIDTH / 2 - pad, BODY_BOTTOM - pad, back.rear - pad],
    max: [WIDTH / 2 + pad, back.top + pad, seatFront + pad],
  }
}

/* -------------------------------------------------- the visible numbers -- */

const cm = (m: number) => Math.round(m * 100)

export type Spec = { id: 'largura' | 'profundidade' | 'altura' | 'assento'; label: string; cm: number }

/** Spec sheet shown in the configurator, the quick view and the callouts. */
export const SPECS: readonly Spec[] = [
  { id: 'largura', label: 'Largura', cm: cm(ARMCHAIR.extents.width) },
  { id: 'profundidade', label: 'Profundidade', cm: cm(ARMCHAIR.extents.depth) },
  { id: 'altura', label: 'Altura', cm: cm(ARMCHAIR.extents.height) },
  { id: 'assento', label: 'Altura do assento', cm: cm(ARMCHAIR.extents.seatHeight) },
]

export const specCm = (id: Spec['id']) => SPECS.find((s) => s.id === id)!.cm

/** "84 × 82 × 80 cm" (L × P × A). */
export const SPEC_SUMMARY = `${specCm('largura')} × ${specCm('profundidade')} × ${specCm('altura')} cm`

/* ------------------------------------------------------ callout anchors -- */

export type CalloutDef = {
  id: Spec['id']
  /** Point on the model's real surface. */
  anchor: Vec3
  /** Outward surface direction at the anchor — hides the callout when it faces away. */
  normal: Vec3
  /** Leader line end, relative to the anchor (metres). */
  offset: Vec3
}

const seatFrontTop: Vec3 = [0, SEAT.top, SEAT.front - SEAT.radius * 0.35]
const backTopCentre = (() => {
  // top of the roll: the highest point of the reclined slab's front corner
  const [y, z] = backToWorld(BACK.length - BACK.radius, BACK.thickness - BACK.radius)
  return [0, y + BACK.radius, z] as Vec3
})()
// Outer face of the right arm, a hand's width below the roll.
const armOuter: Vec3 = [WIDTH / 2, ARM_TOP - 0.11, FRAME_FRONT - 0.16]

export const CALLOUTS: readonly CalloutDef[] = [
  { id: 'altura', anchor: backTopCentre, normal: [0, 1, 0], offset: [-0.26, 0.12, 0] },
  { id: 'largura', anchor: armOuter, normal: [1, 0, 0], offset: [0.2, 0.1, 0.04] },
  { id: 'assento', anchor: seatFrontTop, normal: [0, 0.4, 1], offset: [-0.24, -0.12, 0.12] },
]
