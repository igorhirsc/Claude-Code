import { useId, useMemo, type ReactNode } from 'react'
import clsx from 'clsx'
import type { Finish, Product, Shape } from '@/data/products'
import { tokenVar, type PaletteKey } from '@/three/configurator/swatches'

/**
 * Procedural studio "photograph" of a product, drawn as SVG in a refined
 * illustrative style: a cyclorama backdrop lit from the upper left with a
 * soft falloff and vignette, a blurred ambient shadow plus tight contact
 * shadows under every foot, and the piece itself in a consistent elevated
 * 3/4 view (front face, top plane and right-hand side plane). Materials are
 * built per face with user-space gradients (so thin, wide parts never get a
 * slanted streak) and fine procedural textures: a woven ground or bouclé
 * loops on upholstery, grain on wood, stitched seams on leather, lathe rings
 * on brass and glaze on ceramic. Every colour is a brand token. No rasters,
 * no network.
 */

const v = tokenVar
/** `pctA` percent of `a` mixed into `b`, in OKLab. */
const mix = (a: PaletteKey, b: PaletteKey, pctA: number) => `color-mix(in oklab, ${v(a)} ${pctA}%, ${v(b)})`
/** Lighten toward linen-50 / darken toward ink-900 by `amt` percent. */
const t = (k: PaletteKey, amt: number) => mix(k, 'linen50', 100 - amt)
const s = (k: PaletteKey, amt: number) => mix(k, 'ink900', 100 - amt)

/** Depth vector of the 3/4 view: how far the back of a piece sits up and to the right. */
const DX = 20
const DY = -22
/** Floor contact line for the front of a piece. */
const FY = 388

type Stop = [offset: number, color: string, opacity?: number]
type Paint = { front: string; top: string; side: string; tex?: string }
type Mat = 'fabric' | 'boucle' | 'wood' | 'darkwood' | 'leather' | 'lacquer' | 'brass'

type Kit = {
  lin: (stops: Stop[], x1: number, y1: number, x2: number, y2: number) => string
  /** Radial gradient; `squash` < 1 flattens it vertically about its centre (a pool of light on the floor). */
  rad: (stops: Stop[], cx: number, cy: number, r: number, fx?: number, fy?: number, squash?: number) => string
  pat: { weave: string; boucle: string; grainH: string; grainV: string; rings: string }
  blur: { wide: string; mid: string; tight: string }
  defs: ReactNode[]
}

function makeKit(uid: string): Kit {
  const defs: ReactNode[] = []
  let n = 0
  const stopsOf = (stops: Stop[]) =>
    stops.map(([o, c, a], i) => <stop key={i} offset={o} style={{ stopColor: c, stopOpacity: a ?? 1 }} />)
  return {
    defs,
    lin: (stops, x1, y1, x2, y2) => {
      const id = `${uid}l${n++}`
      defs.push(
        <linearGradient key={id} id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          {stopsOf(stops)}
        </linearGradient>,
      )
      return `url(#${id})`
    },
    rad: (stops, cx, cy, r, fx, fy, squash) => {
      const id = `${uid}r${n++}`
      const tf = squash ? `translate(${cx} ${cy}) scale(1 ${squash}) translate(${-cx} ${-cy})` : undefined
      defs.push(
        <radialGradient key={id} id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r} fx={fx ?? cx} fy={fy ?? cy} gradientTransform={tf}>
          {stopsOf(stops)}
        </radialGradient>,
      )
      return `url(#${id})`
    },
    pat: {
      weave: `url(#${uid}-weave)`,
      boucle: `url(#${uid}-boucle)`,
      grainH: `url(#${uid}-grainH)`,
      grainV: `url(#${uid}-grainV)`,
      rings: `url(#${uid}-rings)`,
    },
    blur: { wide: `url(#${uid}-bw)`, mid: `url(#${uid}-bm)`, tight: `url(#${uid}-bt)` },
  }
}

/** Shared patterns and blur filters, one set per photo. */
function SharedDefs({ uid }: { uid: string }) {
  const ink = { stroke: v('ink900') }
  const lin = { stroke: v('linen50') }
  return (
    <>
      <pattern id={`${uid}-weave`} width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M0 1 H4" style={ink} strokeOpacity="0.07" strokeWidth="0.9" />
        <path d="M1 0 V4" style={lin} strokeOpacity="0.07" strokeWidth="0.8" />
        <path d="M0 3 H4" style={lin} strokeOpacity="0.04" strokeWidth="0.7" />
      </pattern>
      <pattern id={`${uid}-boucle`} width="7" height="7" patternUnits="userSpaceOnUse">
        <circle cx="1.6" cy="1.8" r="1.25" fill="none" style={ink} strokeOpacity="0.09" strokeWidth="0.7" />
        <circle cx="5.2" cy="4.6" r="1.35" fill="none" style={ink} strokeOpacity="0.08" strokeWidth="0.7" />
        <circle cx="2.8" cy="5.6" r="1" fill="none" style={lin} strokeOpacity="0.1" strokeWidth="0.6" />
        <circle cx="5.6" cy="1.2" r="0.9" fill="none" style={lin} strokeOpacity="0.09" strokeWidth="0.6" />
      </pattern>
      <pattern id={`${uid}-grainH`} width="140" height="9" patternUnits="userSpaceOnUse">
        <path d="M0 2 Q35 0.6 70 2.4 T140 2" fill="none" style={ink} strokeOpacity="0.16" strokeWidth="0.6" />
        <path d="M0 6.2 Q30 7.6 64 5.8 T140 6.2" fill="none" style={ink} strokeOpacity="0.1" strokeWidth="0.9" />
        <path d="M0 4.4 Q50 3.6 96 4.8 T140 4.4" fill="none" style={lin} strokeOpacity="0.07" strokeWidth="0.5" />
      </pattern>
      <pattern id={`${uid}-grainV`} width="7" height="120" patternUnits="userSpaceOnUse">
        <path d="M1.8 0 Q0.8 30 2.2 60 T1.8 120" fill="none" style={ink} strokeOpacity="0.16" strokeWidth="0.6" />
        <path d="M5 0 Q6 34 4.6 66 T5 120" fill="none" style={ink} strokeOpacity="0.1" strokeWidth="0.8" />
      </pattern>
      <pattern id={`${uid}-rings`} width="400" height="3.2" patternUnits="userSpaceOnUse">
        <path d="M0 1 H400" style={ink} strokeOpacity="0.06" strokeWidth="0.6" />
        <path d="M0 2.4 H400" style={lin} strokeOpacity="0.08" strokeWidth="0.5" />
      </pattern>
      <filter id={`${uid}-bw`} x="-30%" y="-200%" width="160%" height="500%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
      <filter id={`${uid}-bm`} x="-40%" y="-200%" width="180%" height="500%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
      <filter id={`${uid}-bt`} x="-60%" y="-300%" width="220%" height="700%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
    </>
  )
}

/* -------------------------------------------------------------- materials */

/** Per-face paints for a box whose front face spans (x, y, w, h). */
function paints(k: Kit, mat: Mat, key: PaletteKey, x: number, y: number, w: number, h: number): Paint {
  switch (mat) {
    case 'fabric':
    case 'boucle':
      return {
        front: k.lin([[0, t(key, 20)], [0.45, v(key)], [1, s(key, 22)]], 0, y, 0, y + h),
        top: k.lin([[0, t(key, 32)], [1, t(key, 12)]], x, 0, x + w + DX, 0),
        side: k.lin([[0, s(key, 16)], [1, s(key, 34)]], 0, y + DY, 0, y + h),
        tex: mat === 'boucle' ? k.pat.boucle : k.pat.weave,
      }
    case 'leather':
      return {
        front: k.lin([[0, t(key, 24)], [0.3, v(key)], [1, s(key, 30)]], 0, y, 0, y + h),
        top: k.lin([[0, t(key, 30)], [0.5, t(key, 12)], [1, v(key)]], x, 0, x + w + DX, 0),
        side: k.lin([[0, s(key, 20)], [1, s(key, 40)]], 0, y + DY, 0, y + h),
      }
    case 'wood':
    case 'darkwood': {
      const lift = mat === 'darkwood' ? 18 : 12
      // Imbuia and other dark woods: pull the token toward clay so it reads as
      // warm timber rather than grey.
      if (mat === 'darkwood') {
        const base = mix(key, 'clay600', 74)
        return {
          front: k.lin([[0, `color-mix(in oklab, ${base} 86%, ${v('ink900')})`], [0.4, base], [0.52, `color-mix(in oklab, ${base} 80%, ${v('linen50')})`], [0.7, base], [1, `color-mix(in oklab, ${base} 80%, ${v('ink900')})`]], x, 0, x + w, 0),
          top: k.lin([[0, `color-mix(in oklab, ${base} 70%, ${v('linen50')})`], [1, `color-mix(in oklab, ${base} 92%, ${v('linen50')})`]], x, 0, x + w + DX, 0),
          side: k.lin([[0, `color-mix(in oklab, ${base} 74%, ${v('ink900')})`], [1, `color-mix(in oklab, ${base} 62%, ${v('ink900')})`]], 0, y + DY, 0, y + h),
          tex: w > h ? k.pat.grainH : k.pat.grainV,
        }
      }
      return {
        front: k.lin(
          [[0, s(key, 10)], [0.35, v(key)], [0.5, t(key, lift)], [0.68, v(key)], [1, s(key, 16)]],
          x,
          0,
          x + w,
          0,
        ),
        top: k.lin([[0, t(key, lift + 12)], [1, t(key, 4)]], x, 0, x + w + DX, 0),
        side: k.lin([[0, s(key, 22)], [1, s(key, 36)]], 0, y + DY, 0, y + h),
        tex: w > h ? k.pat.grainH : k.pat.grainV,
      }
    }
    case 'lacquer':
      // Satin lacquer: one soft vertical sheen across the doors, no hotspot.
      return {
        front: k.lin(
          [[0, s(key, 12)], [0.22, v(key)], [0.4, t(key, 12)], [0.5, t(key, 16)], [0.6, t(key, 10)], [0.8, v(key)], [1, s(key, 16)]],
          x,
          0,
          x + w,
          0,
        ),
        top: k.lin([[0, t(key, 26)], [1, t(key, 10)]], x, 0, x + w + DX, 0),
        side: k.lin([[0, s(key, 24)], [1, s(key, 38)]], 0, y + DY, 0, y + h),
      }
    case 'brass':
      return {
        front: k.lin(
          [[0, s('brass500', 28)], [0.3, v(key)], [0.46, v('brass200')], [0.54, t('brass200', 30)], [0.62, v('brass300')], [1, s('brass500', 30)]],
          x,
          0,
          x + w,
          0,
        ),
        top: k.lin([[0, v('brass200')], [1, v(key)]], x, 0, x + w + DX, 0),
        side: k.lin([[0, s('brass500', 20)], [1, s('brass500', 40)]], 0, y + DY, 0, y + h),
      }
  }
}

type BoxOpts = {
  x: number
  y: number
  w: number
  h: number
  /** Corner radius of the front face. */
  r?: number
  dx?: number
  dy?: number
  /** Upholstery piping drawn around the front face, in this colour family. */
  piping?: PaletteKey
  hideSide?: boolean
  hideTop?: boolean
}

/**
 * A box in the 3/4 view: side plane, top plane, then the front face, each
 * with its own paint. Rounded corners on the receding planes come from a
 * round-joined stroke in the same paint.
 */
function box(k: Kit, mat: Mat, key: PaletteKey, o: BoxOpts) {
  const { x, y, w, h, r = 0, dx = DX, dy = DY } = o
  const p = paints(k, mat, key, x, y, w, h)
  const rr = Math.min(r, w / 2, h / 2)
  const sw = Math.max(0.01, rr * 0.9)
  const top = `M${x + rr * 0.55} ${y + rr * 0.35} L${x + w - rr * 0.55} ${y + rr * 0.35} L${x + w - rr * 0.55 + dx} ${y + dy + rr * 0.35} L${x + rr * 0.55 + dx} ${y + dy + rr * 0.35} Z`
  const side = `M${x + w - rr * 0.35} ${y + rr * 0.55} L${x + w - rr * 0.35 + dx} ${y + dy + rr * 0.55} L${x + w - rr * 0.35 + dx} ${y + h + dy - rr * 0.55} L${x + w - rr * 0.35} ${y + h - rr * 0.55} Z`
  const face = { x, y, width: w, height: h, rx: rr }
  return (
    <g>
      {!o.hideSide && (
        <>
          <path d={side} fill={p.side} stroke={p.side} strokeWidth={sw} strokeLinejoin="round" />
          {p.tex && <path d={side} fill={p.tex} />}
        </>
      )}
      {!o.hideTop && (
        <>
          <path d={top} fill={p.top} stroke={p.top} strokeWidth={sw} strokeLinejoin="round" />
          {p.tex && <path d={top} fill={p.tex} />}
        </>
      )}
      <rect {...face} fill={p.front} />
      {p.tex && <rect {...face} fill={p.tex} />}
      {o.piping && (
        <>
          <rect {...face} fill="none" style={{ stroke: s(o.piping, 34) }} strokeWidth="1.6" />
          <rect
            x={x + 1.3}
            y={y + 1.3}
            width={w - 2.6}
            height={h - 2.6}
            rx={Math.max(0, rr - 1.3)}
            fill="none"
            style={{ stroke: t(o.piping, 36) }}
            strokeOpacity="0.55"
            strokeWidth="0.8"
          />
        </>
      )}
    </g>
  )
}

/** A loose cushion: one soft, rounded volume with a radial key, piping and a centre dimple. */
function pillow(k: Kit, key: PaletteKey, x: number, y: number, w: number, h: number, tex: string) {
  const d = `M${x + 8} ${y + 3} Q${x + w / 2} ${y - 3} ${x + w - 8} ${y + 3} Q${x + w + 2} ${y + h / 2} ${x + w - 6} ${y + h - 3} Q${x + w / 2} ${y + h + 3} ${x + 6} ${y + h - 3} Q${x - 2} ${y + h / 2} ${x + 8} ${y + 3} Z`
  const fill = k.rad([[0, t(key, 30)], [0.5, v(key)], [1, s(key, 26)]], x + w * 0.34, y + h * 0.3, Math.max(w, h) * 0.85)
  const cx = x + w / 2
  const cy = y + h / 2
  return (
    <g>
      <path d={d} fill={fill} />
      <path d={d} fill={tex} />
      <path d={d} fill="none" style={{ stroke: s(key, 32) }} strokeWidth="1.4" />
      <path
        d={`M${cx - w * 0.2} ${cy - 2} Q${cx} ${cy + 3} ${cx + w * 0.2} ${cy - 2}`}
        fill="none"
        style={{ stroke: s(key, 30) }}
        strokeOpacity="0.45"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </g>
  )
}

/** Tapered leg from (x, y0) to the floor at yb, with a lit left edge. */
function leg(k: Kit, mat: Mat, key: PaletteKey, x: number, y0: number, yb: number, wTop: number, wBot: number) {
  const c = x + wTop / 2
  const d = `M${x} ${y0} L${x + wTop} ${y0} L${c + wBot / 2} ${yb} L${c - wBot / 2} ${yb} Z`
  const p = paints(k, mat, key, x, y0, wTop, yb - y0)
  return (
    <g>
      <path d={d} fill={k.lin([[0, t(key, 14)], [0.4, v(key)], [1, s(key, 34)]], x, 0, x + wTop, 0)} />
      {p.tex && <path d={d} fill={k.pat.grainV} />}
    </g>
  )
}

/** Soft contact shadow pair: a wide ambient pool and a tight dark core. */
function shadow(k: Kit, cx: number, cy: number, rx: number, ry: number, strength = 1) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} style={{ fill: v('ink900') }} opacity={0.3 * strength} filter={k.blur.wide} />
      <ellipse cx={cx} cy={cy} rx={rx * 0.86} ry={ry * 0.45} style={{ fill: v('ink900') }} opacity={0.32 * strength} filter={k.blur.mid} />
    </g>
  )
}

/** Tight dark contact under a foot. */
function foot(k: Kit, cx: number, cy: number, rx = 8, ry = 2.4, o = 0.55) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} style={{ fill: v('ink900') }} opacity={o} filter={k.blur.tight} />
}

/* ----------------------------------------------------------------- pieces */

type Tones = Product['tones']
type Draw = (k: Kit, tones: Tones, finish: Finish) => ReactNode

const upholstery = (finish: Finish, shape: Shape): Mat => (shape === 'modular' ? 'boucle' : finish === 'leather' ? 'leather' : 'fabric')

const SHAPES: Record<Shape, Draw> = {
  sofa: (k, { body, accent }, finish) => {
    const m = upholstery(finish, 'sofa')
    const tex = k.pat.weave
    return (
      <>
        {shadow(k, 212, FY - 4, 178, 14)}
        {leg(k, 'wood', accent, 334, 330, FY + DY + 2, 11, 7)}
        {foot(k, 338, FY + DY + 2)}
        {box(k, m, body, { x: 70, y: 196, w: 266, h: 92, r: 24 })}
        {pillow(k, body, 104, 212, 112, 70, tex)}
        {pillow(k, body, 214, 208, 112, 72, tex)}
        {box(k, 'wood', accent, { x: 58, y: 330, w: 288, h: 10, r: 2, hideTop: true })}
        {box(k, m, body, { x: 54, y: 290, w: 296, h: 42, r: 12 })}
        {box(k, m, body, { x: 88, y: 270, w: 116, h: 30, r: 12, piping: body, hideSide: true })}
        {box(k, m, body, { x: 202, y: 270, w: 116, h: 30, r: 12, piping: body })}
        {box(k, m, body, { x: 36, y: 236, w: 56, h: 100, r: 24, piping: body })}
        {box(k, m, body, { x: 312, y: 236, w: 56, h: 100, r: 24, piping: body })}
        {leg(k, 'wood', accent, 74, 340, FY, 14, 8)}
        {leg(k, 'wood', accent, 318, 340, FY, 14, 8)}
        {foot(k, 81, FY)}
        {foot(k, 325, FY)}
      </>
    )
  },

  modular: (k, { body, accent }) => {
    const tex = k.pat.boucle
    return (
      <>
        {shadow(k, 200, FY - 6, 180, 15)}
        {box(k, 'boucle', body, { x: 30, y: 222, w: 236, h: 82, r: 30 })}
        {pillow(k, body, 52, 238, 88, 58, tex)}
        {pillow(k, body, 136, 234, 90, 60, tex)}
        {/* recessed plinth: only a shadow line shows under the modules */}
        {box(k, 'darkwood', accent, { x: 40, y: 349, w: 220, h: 7, r: 1, hideTop: true })}
        {[0, 1, 2].map((i) => (
          <g key={i}>{box(k, 'boucle', body, { x: 26 + i * 80, y: 290, w: 82, h: 60, r: 22, piping: body, hideSide: i < 2 })}</g>
        ))}
        {/* chaise module, projecting toward the camera */}
        {box(k, 'darkwood', accent, { x: 274, y: 365, w: 78, h: 7, r: 1, hideTop: true })}
        {box(k, 'boucle', body, { x: 264, y: 306, w: 94, h: 60, r: 22, dy: -40, dx: 12, piping: body })}
        {pillow(k, body, 280, 266, 60, 24, tex)}
        {foot(k, 52, 357, 16)}
        {foot(k, 248, 357, 16)}
        {foot(k, 286, FY - 14, 14)}
        {foot(k, 342, FY - 14, 14)}
      </>
    )
  },

  armchair: (k, { body, accent }, finish) => {
    const m = upholstery(finish, 'armchair')
    const ferrule = (x: number, yb: number) => (
      <rect x={x} y={yb - 9} width="8" height="9" rx="1.5" fill={k.lin([[0, v('brass200')], [0.5, v('brass400')], [1, s('brass500', 30)]], x, 0, x + 8, 0)} />
    )
    return (
      <>
        {shadow(k, 212, FY - 4, 122, 13)}
        {leg(k, 'wood', accent, 270, 330, FY + DY, 12, 7)}
        {ferrule(272.5, FY + DY)}
        {foot(k, 276, FY + DY)}
        {box(k, m, body, { x: 128, y: 168, w: 150, h: 128, r: 46 })}
        {box(k, m, body, { x: 114, y: 292, w: 176, h: 46, r: 16 })}
        {box(k, m, body, { x: 146, y: 268, w: 112, h: 28, r: 12, piping: body, hideSide: true })}
        {box(k, m, body, { x: 98, y: 236, w: 52, h: 102, r: 24, piping: body })}
        {box(k, m, body, { x: 256, y: 236, w: 52, h: 102, r: 24, piping: body })}
        {leg(k, 'wood', accent, 122, 338, FY, 14, 8)}
        {leg(k, 'wood', accent, 270, 338, FY, 14, 8)}
        {ferrule(125, FY)}
        {ferrule(273, FY)}
        {foot(k, 129, FY)}
        {foot(k, 277, FY)}
      </>
    )
  },

  lounge: (k, { body, accent }) => {
    // Leather sling (body) on a freijó frame (accent): two materials.
    const wood = accent
    const leather = body
    const post = (x1: number, y1: number, x2: number, y2: number, wdt: number, far = false) => {
      const d = `M${x1 - wdt / 2} ${y1} L${x1 + wdt / 2} ${y1} L${x2 + wdt / 2 - 1} ${y2} L${x2 - wdt / 2 + 1} ${y2} Z`
      return (
        <g>
          <path d={d} fill={k.lin([[0, far ? s(wood, 14) : t(wood, 14)], [0.45, far ? s(wood, 24) : v(wood)], [1, s(wood, far ? 46 : 34)]], Math.min(x1, x2) - wdt / 2, 0, Math.max(x1, x2) + wdt / 2, 0)} />
          <path d={d} fill={k.pat.grainV} />
        </g>
      )
    }
    const rail = (x1: number, x2: number, y: number, hh: number, far = false) => (
      <g>
        <rect x={x1} y={y} width={x2 - x1} height={hh} rx={hh / 2} fill={k.lin([[0, far ? v(wood) : t(wood, 22)], [0.5, far ? s(wood, 20) : v(wood)], [1, s(wood, far ? 44 : 36)]], 0, y, 0, y + hh)} />
        <rect x={x1} y={y} width={x2 - x1} height={hh} rx={hh / 2} fill={k.pat.grainH} />
      </g>
    )
    const backSling = 'M146 194 Q222 184 300 194 L306 300 Q224 316 140 300 Z'
    const seatSling = 'M130 300 Q218 322 316 298 L322 326 Q220 356 122 328 Z'
    const stitch = { stroke: t(leather, 40), strokeOpacity: 0.7 }
    return (
      <>
        {shadow(k, 222, FY - 6, 128, 13)}
        {/* far frame */}
        {post(152, 180, 160, FY + DY, 11, true)}
        {post(296, 180, 304, FY + DY, 11, true)}
        {rail(146, 304, 186, 10, true)}
        {foot(k, 160, FY + DY)}
        {foot(k, 304, FY + DY)}
        {/* leather */}
        <path d={backSling} fill={k.lin([[0, t(leather, 18)], [0.35, v(leather)], [1, s(leather, 34)]], 0, 190, 0, 310)} />
        <path d={backSling} fill={k.lin([[0, s(leather, 20), 0.6], [0.3, v(leather), 0], [0.7, v(leather), 0], [1, s(leather, 30), 0.7]], 140, 0, 306, 0)} />
        <path d="M152 202 Q222 193 296 202" fill="none" style={stitch} strokeWidth="0.9" strokeDasharray="3 2.4" />
        <path d="M150 292 Q224 307 298 292" fill="none" style={stitch} strokeWidth="0.9" strokeDasharray="3 2.4" />
        <path d={seatSling} fill={k.lin([[0, t(leather, 30)], [0.4, t(leather, 8)], [1, s(leather, 30)]], 0, 298, 0, 350)} />
        <path d="M134 322 Q220 348 316 320" fill="none" style={stitch} strokeWidth="0.9" strokeDasharray="3 2.4" />
        {/* near frame: front posts, arms and the front rail the sling wraps over */}
        {rail(113, 329, 318, 12)}
        {post(124, 252, 120, FY, 13)}
        {post(318, 252, 322, FY, 13)}
        <path
          d={`M110 252 L138 252 L${138 + DX} ${252 + DY} L${110 + DX} ${252 + DY} Z`}
          fill={k.lin([[0, t(wood, 26)], [1, t(wood, 6)]], 110, 0, 160, 0)}
          stroke={t(wood, 16)}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d={`M304 252 L332 252 L${332 + DX} ${252 + DY} L${304 + DX} ${252 + DY} Z`}
          fill={k.lin([[0, t(wood, 22)], [1, t(wood, 4)]], 304, 0, 354, 0)}
          stroke={t(wood, 12)}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="110" y="252" width="28" height="9" rx="2" fill={k.lin([[0, v(wood)], [1, s(wood, 30)]], 0, 252, 0, 261)} />
        <rect x="304" y="252" width="28" height="9" rx="2" fill={k.lin([[0, v(wood)], [1, s(wood, 30)]], 0, 252, 0, 261)} />
        {/* cavilha (dowel) heads at the joints */}
        {[
          [121, 323],
          [321, 323],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="2.2" style={{ fill: s(wood, 40) }} />
        ))}
        {foot(k, 120, FY)}
        {foot(k, 322, FY)}
      </>
    )
  },

  table: (k, { body }) => {
    // Freijó top over trapezoid legs; apron drawn first so the legs sit in front of it.
    const end = (x: number) => (
      <g>
        <path d={`M${x} 252 L${x + 26} 252 L${x + 22} ${FY} L${x + 4} ${FY} Z`} fill={k.lin([[0, t(body, 14)], [0.4, v(body)], [1, s(body, 30)]], x, 0, x + 26, 0)} />
        <path d={`M${x} 252 L${x + 26} 252 L${x + 22} ${FY} L${x + 4} ${FY} Z`} fill={k.pat.grainV} />
        {/* through-tenon of the apron, end grain showing */}
        <rect x={x + 9} y="258" width="8" height="12" rx="1" style={{ fill: s(body, 34) }} />
        <path d={`M${x + 10.5} 262 h5 M${x + 10.5} 266 h5`} style={{ stroke: s(body, 52) }} strokeWidth="0.6" />
      </g>
    )
    return (
      <>
        {shadow(k, 210, FY - 4, 176, 12, 0.9)}
        {/* far legs */}
        <path d={`M${78 + DX} 252 L${102 + DX} 252 L${98 + DX} ${FY + DY} L${82 + DX} ${FY + DY} Z`} style={{ fill: s(body, 34) }} />
        <path d={`M${300 + DX} 252 L${324 + DX} 252 L${320 + DX} ${FY + DY} L${304 + DX} ${FY + DY} Z`} style={{ fill: s(body, 30) }} />
        {foot(k, 90 + DX, FY + DY)}
        {foot(k, 312 + DX, FY + DY)}
        {/* apron, opaque */}
        <rect x="96" y="254" width="216" height="18" fill={k.lin([[0, s(body, 16)], [1, s(body, 30)]], 0, 254, 0, 272)} />
        <rect x="96" y="254" width="216" height="18" fill={k.pat.grainH} />
        {end(76)}
        {end(300)}
        {foot(k, 89, FY)}
        {foot(k, 313, FY)}
        {box(k, 'wood', body, { x: 40, y: 236, w: 318, h: 18, r: 2 })}
        {/* rabo-de-andorinha (butterfly) keys inlaid across the board joints */}
        {[
          [150, 225],
          [262, 225],
        ].map(([x, y]) => (
          <path key={x} d={`M${x - 8} ${y - 3} L${x + 8} ${y - 1} L${x + 4} ${y + 3} L${x + 12} ${y + 5} L${x - 4} ${y + 3} L${x} ${y - 1} Z`} style={{ fill: s(body, 42) }} opacity="0.85" />
        ))}
        <path d={`M44 ${236 + DY / 2 + 1} L${356 + DX / 2} ${236 + DY / 2 + 1}`} style={{ stroke: s(body, 26) }} strokeOpacity="0.35" strokeWidth="0.7" />
        {/* end grain on the visible table end */}
        <path d={`M358 239 L${358 + DX} ${236 + DY} M358 246 L${358 + DX} ${243 + DY} M358 251 L${358 + DX} ${248 + DY}`} style={{ stroke: s(body, 50) }} strokeOpacity="0.4" strokeWidth="0.6" />
      </>
    )
  },

  'side-table': (k, { body, accent }) => {
    const top = { cx: 200, cy: 250, rx: 104, ry: 25 }
    const glaze = k.rad([[0, v('linen50')], [0.45, t(body, 0)], [0.8, s(body, 8)], [1, s(body, 16)]], 166, 242, 130)
    return (
      <>
        {shadow(k, 202, FY - 2, 96, 10)}
        {/* brass base: foot disc and turned column */}
        <ellipse cx="200" cy={FY - 4} rx="56" ry="11" fill={k.lin([[0, s('brass500', 30)], [0.3, v(accent)], [0.5, v('brass200')], [0.7, v(accent)], [1, s('brass500', 36)]], 144, 0, 256, 0)} />
        <ellipse cx="200" cy={FY - 7} rx="56" ry="11" fill={k.lin([[0, v('brass200')], [1, v(accent)]], 144, 0, 256, 0)} />
        <ellipse cx="200" cy={FY - 7} rx="56" ry="11" fill={k.pat.rings} />
        <rect x="191" y="268" width="18" height={FY - 7 - 268} fill={k.lin([[0, s('brass500', 34)], [0.3, v(accent)], [0.48, v('brass200')], [0.56, t('brass200', 30)], [0.7, v(accent)], [1, s('brass500', 40)]], 191, 0, 209, 0)} />
        <ellipse cx="200" cy="270" rx="22" ry="5" style={{ fill: s('brass500', 30) }} />
        {/* ceramic top: rolled edge, then glazed face */}
        <path
          d={`M${top.cx - top.rx} ${top.cy} L${top.cx - top.rx} ${top.cy + 12} A${top.rx} ${top.ry} 0 0 0 ${top.cx + top.rx} ${top.cy + 12} L${top.cx + top.rx} ${top.cy} Z`}
          fill={k.lin([[0, s(body, 14)], [0.3, s(body, 4)], [0.55, t(body, 0)], [1, s(body, 28)]], 96, 0, 304, 0)}
        />
        <ellipse {...top} fill={glaze} />
        <ellipse cx={top.cx} cy={top.cy + 1} rx={top.rx - 6} ry={top.ry - 3.5} fill="none" style={{ stroke: s(body, 18) }} strokeOpacity="0.5" strokeWidth="1.2" />
        <ellipse {...top} fill="none" style={{ stroke: t(body, 0) }} strokeOpacity="0.9" strokeWidth="1" />
        {/* window reflection in the glaze: a soft streak, not a blob */}
        <path d="M134 246 Q160 236 196 236" fill="none" style={{ stroke: v('linen50') }} strokeOpacity="0.75" strokeWidth="2.4" strokeLinecap="round" filter={k.blur.tight} />
      </>
    )
  },

  shelf: (k, { body, accent }) => {
    const shelves = [140, 196, 252, 308, 364]
    const book = (x: number, w: number, h: number, base: number, key: PaletteKey) => (
      <g key={x}>
        <rect x={x} y={base - h} width={w} height={h} fill={k.lin([[0, t(key, 12)], [1, s(key, 24)]], x, 0, x + w, 0)} />
        <rect x={x + 1.5} y={base - h + 5} width={w - 3} height="1.2" style={{ fill: v('brass300') }} opacity="0.55" />
        <path d={`M${x} ${base - h} L${x + 8} ${base - h - 9} L${x + w + 8} ${base - h - 9} L${x + w} ${base - h} Z`} style={{ fill: t(key, 26) }} />
      </g>
    )
    const shelfItems: ReactNode[] = [
      // a small stoneware bowl
      <g key="bowl">
        <path d="M238 118 Q240 126 252 127 Q264 126 266 118 Z" fill={k.lin([[0, t('linen200', 20)], [1, s('linen300', 20)]], 238, 0, 266, 0)} />
        <ellipse cx="252" cy="118" rx="14" ry="3" style={{ fill: s('linen300', 10) }} />
      </g>,
      // a run of books
      <g key="books">
        {book(132, 9, 42, 184, 'clay600')}
        {book(142, 8, 38, 184, 'moss500')}
        {book(151, 11, 46, 184, 'linen200')}
        {book(163, 8, 34, 184, 'brass400')}
      </g>,
      // books lying flat and a terracotta bowl
      <g key="stack">
        {(['linen200', 'clay600', 'moss600'] as PaletteKey[]).map((key, j) => (
          <g key={key}>
            <rect x={136 + j * 2} y={231 - j * 7} width={46 - j * 4} height="7" fill={k.lin([[0, t(key, 10)], [1, s(key, 22)]], 0, 231 - j * 7, 0, 238 - j * 7)} />
            <path d={`M${136 + j * 2} ${231 - j * 7} L${144 + j * 2} ${224 - j * 7} L${190 - j * 2} ${224 - j * 7} L${182 - j * 2} ${231 - j * 7} Z`} style={{ fill: t(key, 24) }} />
          </g>
        ))}
        <ellipse cx="256" cy="238" rx="20" ry="5" style={{ fill: s('clay400', 20) }} />
        <path d="M236 222 Q236 238 256 240 Q276 238 276 222 Z" fill={k.lin([[0, t('clay400', 20)], [0.5, v('clay400')], [1, s('clay400', 30)]], 236, 0, 276, 0)} />
        <ellipse cx="256" cy="222" rx="20" ry="4.5" style={{ fill: s('clay500', 30) }} />
      </g>,
      // a bud vase with capim and a framed print
      <g key="vase">
        <path d="M160 296 Q156 276 166 264 L170 256 L178 256 L182 264 Q192 276 188 296 Z" fill={k.lin([[0, t('moss500', 18)], [0.4, v('moss500')], [1, s('moss500', 34)]], 156, 0, 192, 0)} />
        <path d="M174 256 Q170 234 160 220 M174 256 Q182 236 194 228" fill="none" style={{ stroke: v('brass400') }} strokeWidth="1.2" strokeLinecap="round" />
        <rect x="232" y="264" width="44" height="32" rx="2" fill={k.lin([[0, t(accent, 10)], [1, s(accent, 26)]], 0, 264, 0, 296)} />
        <rect x="237" y="269" width="34" height="22" style={{ fill: v('linen200') }} />
        <path d="M241 287 Q250 276 256 282 Q262 274 268 287 Z" style={{ fill: s('moss500', 10) }} opacity="0.7" />
      </g>,
      // books and a lidded box
      <g key="box">
        {[0, 1, 2].map((j) => book(196 + j * 12, 10, 30 + j * 4, 352, (['ink700', 'clay500', 'brass300'] as PaletteKey[])[j]))}
        <rect x="250" y="328" width="30" height="24" rx="2" fill={k.lin([[0, t('clay400', 16)], [1, s('clay400', 26)]], 250, 0, 280, 0)} />
        <path d="M250 328 L258 320 L288 320 L280 328 Z" style={{ fill: t('clay400', 22) }} />
      </g>,
    ]
    const timber = mix(body, 'clay600', 74)
    return (
      <>
        {shadow(k, 210, FY - 4, 128, 10)}
        {/* far uprights */}
        <rect x={110 + DX} y={120 + DY} width="8" height={FY - 120} style={{ fill: `color-mix(in oklab, ${timber} 66%, ${v('ink900')})` }} />
        <rect x={284 + DX} y={120 + DY} width="8" height={FY - 120} style={{ fill: `color-mix(in oklab, ${timber} 70%, ${v('ink900')})` }} />
        {/* Shelves top to bottom, each followed by what stands on it, so an
            object always sits in front of its own shelf's top plane. */}
        {shelves.map((y, i) => (
          <g key={y}>
            {box(k, 'darkwood', body, { x: 100, y: y - 10, w: 200, h: 10, r: 1.5 })}
            <path d={`M118 ${y} L130 ${y} L118 ${y + 10} Z`} style={{ fill: v(accent) }} />
            <path d={`M282 ${y} L270 ${y} L282 ${y + 10} Z`} style={{ fill: s(accent, 16) }} />
            {shelfItems[i]}
          </g>
        ))}
        {/* near uprights */}
        <rect x="108" y="120" width="9" height={FY - 120} fill={k.lin([[0, `color-mix(in oklab, ${timber} 80%, ${v('linen50')})`], [1, `color-mix(in oklab, ${timber} 80%, ${v('ink900')})`]], 108, 0, 117, 0)} />
        <rect x="283" y="120" width="9" height={FY - 120} fill={k.lin([[0, `color-mix(in oklab, ${timber} 88%, ${v('linen50')})`], [1, `color-mix(in oklab, ${timber} 74%, ${v('ink900')})`]], 283, 0, 292, 0)} />
        <rect x="108" y="120" width="9" height={FY - 120} fill={k.pat.grainV} />
        <rect x="283" y="120" width="9" height={FY - 120} fill={k.pat.grainV} />
        {foot(k, 112, FY)}
        {foot(k, 288, FY)}
      </>
    )
  },

  sideboard: (k, { body, accent }) => {
    const x = 50
    const w = 296
    const y = 226
    const h = 124
    const doors = [0, 1, 2, 3].map((i) => x + (w / 4) * i)
    const pull = (cx: number) => (
      <g key={cx}>
        <ellipse cx={cx + 1} cy={y + 64} rx="4.5" ry="3" style={{ fill: v('ink900') }} opacity="0.25" filter={k.blur.tight} />
        <circle cx={cx} cy={y + 62} r="4.4" fill={k.rad([[0, v('brass200')], [0.55, v(accent)], [1, s('brass500', 30)]], cx - 1.5, y + 60.5, 5.5)} />
        <circle cx={cx - 1.4} cy={y + 60.6} r="1.1" style={{ fill: t('brass200', 50) }} />
      </g>
    )
    const feetWood = s('clay600', 18)
    return (
      <>
        {shadow(k, 210, FY - 4, 170, 12)}
        <path d={`M${x + w + DX - 16} ${y + h + DY - 1} L${x + w + DX - 5} ${y + h + DY - 1} L${x + w + DX - 7} ${FY + DY} L${x + w + DX - 13} ${FY + DY} Z`} style={{ fill: s('clay600', 40) }} />
        {foot(k, x + w + DX - 10, FY + DY)}
        {[x + 16, x + w - 28].map((lx) => (
          <g key={lx}>
            <path d={`M${lx} ${y + h} L${lx + 12} ${y + h} L${lx + 9} ${FY} L${lx + 3} ${FY} Z`} style={{ fill: feetWood }} />
            <path d={`M${lx} ${y + h} L${lx + 12} ${y + h} L${lx + 9} ${FY} L${lx + 3} ${FY} Z`} fill={k.pat.grainV} />
            {foot(k, lx + 6, FY)}
          </g>
        ))}
        {box(k, 'lacquer', body, { x, y, w, h, r: 3 })}
        {/* door reveals: a shadow line with a lit lip beside it */}
        {doors.slice(1).map((dx) => (
          <g key={dx}>
            <path d={`M${dx} ${y + 6} V${y + h - 6}`} style={{ stroke: s(body, 44) }} strokeWidth="1.3" />
            <path d={`M${dx + 1.2} ${y + 6} V${y + h - 6}`} style={{ stroke: t(body, 34) }} strokeOpacity="0.5" strokeWidth="0.7" />
          </g>
        ))}
        <path d={`M${x + 4} ${y + h - 6} H${x + w - 4}`} style={{ stroke: s(body, 30) }} strokeOpacity="0.5" strokeWidth="0.8" />
        {[doors[1] - 9, doors[1] + 9, doors[3] - 9, doors[3] + 9].map(pull)}
      </>
    )
  },

  pendant: (k, { body, accent }) => {
    const rim = { cx: 200, cy: 300, rx: 98, ry: 15 }
    const dome = 'M102 300 Q102 214 186 202 L214 202 Q298 214 298 300 Z'
    return (
      <>
        {/* light falling from the dome onto a table below the frame */}
        <path d="M116 306 L284 306 L350 500 L50 500 Z" fill={k.lin([[0, v('brass200'), 0.26], [1, v('brass200'), 0]], 0, 306, 0, 500)} filter={k.blur.wide} />
        <rect width="400" height="500" fill={k.rad([[0, v('brass200'), 0.4], [0.5, v('brass200'), 0.14], [1, v('brass200'), 0]], 200, 440, 180, undefined, undefined, 0.2)} />
        {/* textile cord with a faint twist, ceiling canopy above the frame */}
        <rect x="198.5" y="0" width="3" height="190" style={{ fill: s('ink700', 10) }} />
        <path d="M198.5 0 V190" style={{ stroke: v(accent) }} strokeOpacity="0.25" strokeWidth="0.8" strokeDasharray="1.4 2.6" />
        <rect x="190" y="184" width="20" height="20" rx="3" fill={k.lin([[0, s('brass500', 20)], [0.4, v('brass200')], [1, s('brass500', 34)]], 190, 0, 210, 0)} />
        <path d={dome} fill={k.lin([[0, s('brass500', 46)], [0.22, s(body, 6)], [0.4, v('brass200')], [0.48, t('brass200', 36)], [0.56, v('brass300')], [0.8, s(body, 18)], [1, s('brass500', 50)]], 102, 0, 298, 0)} />
        <path d={dome} fill={k.lin([[0, v('linen50'), 0.18], [0.4, v('linen50'), 0], [1, v('ink900'), 0.2]], 0, 202, 0, 300)} />
        <path d={dome} fill={k.pat.rings} />
        {/* spun lip, then the warm inside glowing through the opening */}
        <ellipse {...rim} fill={k.lin([[0, s('brass500', 40)], [0.5, v('brass200')], [1, s('brass500', 40)]], 102, 0, 298, 0)} />
        <ellipse cx="200" cy="301.5" rx="92" ry="11" fill={k.rad([[0, v('linen50')], [0.55, t('brass200', 40)], [1, v('brass300')]], 200, 303, 92)} />
      </>
    )
  },

  lamp: (k, { body, accent }) => {
    const c = { cx: 200, cy: 204, r: 66 }
    return (
      <>
        {/* warm halo on the wall behind the globe */}
        <circle cx={c.cx} cy={c.cy} r="170" fill={k.rad([[0, v('brass300'), 0.42], [0.5, v('brass300'), 0.12], [1, v('brass300'), 0]], c.cx, c.cy, 170)} />
        {shadow(k, 206, FY - 4, 70, 9)}
        <rect width="400" height="500" fill={k.rad([[0, v('brass300'), 0.34], [1, v('brass300'), 0]], 200, FY - 2, 120, undefined, undefined, 0.16)} />
        {/* brass base and stem */}
        <ellipse cx="200" cy={FY - 6} rx="46" ry="9" fill={k.lin([[0, s('brass500', 34)], [0.45, v('brass200')], [1, s('brass500', 40)]], 154, 0, 246, 0)} />
        <ellipse cx="200" cy={FY - 9} rx="46" ry="9" fill={k.lin([[0, v('brass200')], [1, v(accent)]], 154, 0, 246, 0)} />
        <ellipse cx="200" cy={FY - 9} rx="46" ry="9" fill={k.pat.rings} />
        <rect x="197" y="262" width="6" height={FY - 9 - 262} fill={k.lin([[0, s('brass500', 30)], [0.45, v('brass200')], [1, s('brass500', 40)]], 197, 0, 203, 0)} />
        <rect x="190" y="262" width="20" height="10" rx="2" fill={k.lin([[0, s('brass500', 26)], [0.45, v('brass200')], [1, s('brass500', 40)]], 190, 0, 210, 0)} />
        {/* blown amber glass: dark rim, lit core, a crescent reflection and a few seeds */}
        <circle {...c} fill={k.rad([[0, v('linen50')], [0.24, t(body, 40)], [0.52, v('brass300')], [0.78, v('brass400')], [0.93, mix('brass500', 'clay500', 60)], [1, s('clay600', 12)]], c.cx + 4, c.cy + 10, c.r, c.cx + 2, c.cy + 14)} />
        <path d="M152 176 Q166 148 196 142" fill="none" style={{ stroke: v('linen50') }} strokeOpacity="0.8" strokeWidth="3.2" strokeLinecap="round" filter={k.blur.tight} />
        <path d="M244 236 Q236 254 216 264" fill="none" style={{ stroke: v('brass200') }} strokeOpacity="0.5" strokeWidth="1.6" strokeLinecap="round" />
        {[
          [176, 222, 1.4],
          [226, 186, 1.1],
          [214, 238, 0.9],
          [182, 190, 0.8],
        ].map(([x, y, r]) => (
          <circle key={x} cx={x} cy={y} r={r} fill="none" style={{ stroke: v('linen50') }} strokeOpacity="0.55" strokeWidth="0.6" />
        ))}
      </>
    )
  },

  vase: (k, { body, accent }) => {
    const outline =
      'M176 384 Q140 352 144 306 Q148 262 178 244 Q186 238 186 226 L186 214 L214 214 L214 226 Q214 238 222 244 Q252 262 256 306 Q260 352 224 384 Z'
    const stems = [-40, -28, -16, -6, 4, 14, 26, 38]
    return (
      <>
        {shadow(k, 204, FY - 2, 66, 9)}
        {/* capim dourado: fine golden stems with their small round flower heads */}
        {stems.map((dx, i) => {
          const tx = 200 + dx * 2.3
          const ty = 92 + (i % 3) * 16 + Math.abs(dx) * 0.6
          return (
            <g key={dx}>
              <path
                d={`M${200 + dx * 0.18} 220 Q${200 + dx * 0.9} ${170 - (i % 2) * 8} ${tx} ${ty}`}
                fill="none"
                style={{ stroke: i % 2 ? v(accent) : v('brass300') }}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx={tx} cy={ty} r="3.2" fill={k.rad([[0, v('brass200')], [1, s('brass500', 10)]], tx - 1, ty - 1, 4)} />
            </g>
          )
        })}
        <ellipse cx="200" cy="214" rx="14" ry="3.6" style={{ fill: s(body, 60) }} />
        {/* glazed body: cylindrical shading, then a vertical key, throwing rings and a bare foot */}
        <path d={outline} fill={k.lin([[0, s(body, 30)], [0.22, v(body)], [0.36, t(body, 22)], [0.5, v(body)], [0.82, s(body, 30)], [1, s(body, 46)]], 140, 0, 260, 0)} />
        <path d={outline} fill={k.lin([[0, v('linen50'), 0.1], [0.5, v('linen50'), 0], [1, v('ink900'), 0.22]], 0, 214, 0, 384)} />
        <path d={outline} fill={k.pat.rings} />
        <path d="M168 380 Q200 388 232 380 L226 384 Q200 390 174 384 Z" style={{ fill: s('linen300', 20) }} />
        <path d="M160 368 Q170 373 178 369 Q190 376 200 371 Q212 377 222 370 Q232 374 240 367" fill="none" style={{ stroke: s(body, 40) }} strokeOpacity="0.55" strokeWidth="1.2" />
        <ellipse cx="200" cy="214" rx="14" ry="3.6" fill="none" style={{ stroke: t(body, 30) }} strokeWidth="1.4" />
        <path d="M168 270 Q162 300 166 334" fill="none" style={{ stroke: v('linen50') }} strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" filter={k.blur.tight} />
      </>
    )
  },

  basket: (k, { body, accent }) => {
    const rows = 7
    const top = 286
    const bot = 384
    const lerp = (a: number, b: number, f: number) => a + (b - a) * f
    return (
      <>
        {shadow(k, 204, FY - 2, 118, 12)}
        {/* inside wall and floor, seen through the opening */}
        <ellipse cx="200" cy={top} rx="96" ry="22" fill={k.lin([[0, s(body, 50)], [1, s(body, 26)]], 0, top - 22, 0, top + 22)} />
        {/* a linen throw folded into the basket */}
        <path d="M128 288 Q150 250 196 258 Q240 246 270 276 Q252 292 200 294 Q150 296 128 288 Z" fill={k.lin([[0, t('linen200', 30)], [1, s('linen300', 12)]], 0, 250, 0, 296)} />
        <path d="M150 268 Q190 262 236 266" fill="none" style={{ stroke: s('linen300', 26) }} strokeOpacity="0.6" strokeWidth="1" />
        <path d="M132 286 Q160 276 196 280" fill="none" style={{ stroke: s('linen300', 22) }} strokeOpacity="0.5" strokeWidth="0.9" />
        {/* coiled body: each coil shaded as a rounded band, stitched with buriti */}
        {Array.from({ length: rows }, (_, i) => {
          const f0 = i / rows
          const f1 = (i + 1) / rows
          const y0 = lerp(top, bot, f0)
          const y1 = lerp(top, bot, f1)
          const rx0 = lerp(96, 80, f0)
          const rx1 = lerp(96, 80, f1)
          const ry0 = lerp(22, 15, f0)
          const ry1 = lerp(22, 15, f1)
          const d = `M${200 - rx0} ${y0} A${rx0} ${ry0} 0 0 0 ${200 + rx0} ${y0} L${200 + rx1} ${y1} A${rx1} ${ry1} 0 0 1 ${200 - rx1} ${y1} Z`
          return (
            <g key={i}>
              <path d={d} fill={k.lin([[0, s(body, 30)], [0.25, t(body, 14)], [0.5, v(body)], [0.85, s(body, 26)], [1, s(body, 40)]], 200 - rx0, 0, 200 + rx0, 0)} />
              <path d={d} fill={k.lin([[0, v('linen50'), 0.16], [0.45, v('linen50'), 0], [1, v('ink900'), 0.28]], 0, y0, 0, y1 + ry1)} />
              {Array.from({ length: 13 }, (_, j) => {
                const a = Math.PI * (0.1 + (0.8 * (j + (i % 2) * 0.5)) / 13)
                const cx = 200 - Math.cos(a) * ((rx0 + rx1) / 2)
                const cy = (y0 + y1) / 2 + Math.sin(a) * ((ry0 + ry1) / 2)
                return (
                  <path
                    key={j}
                    d={`M${cx - 1.6} ${cy - 5} L${cx + 1.6} ${cy + 5}`}
                    style={{ stroke: s(accent, 22) }}
                    strokeOpacity={0.35 + 0.5 * Math.sin(a)}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                )
              })}
            </g>
          )
        })}
        {/* thick rim coil */}
        <path
          d={`M104 ${top} A96 22 0 0 0 296 ${top}`}
          fill="none"
          style={{ stroke: t(body, 18) }}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path d={`M104 ${top} A96 22 0 0 1 296 ${top}`} fill="none" style={{ stroke: s(body, 10) }} strokeWidth="5" strokeLinecap="round" />
      </>
    )
  },
}

export function ProductPhoto({ product, className, children }: { product: Product; className?: string; children?: ReactNode }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const { wall, floor } = product.tones
  // Everything that registers a gradient runs inside one memo, so the defs
  // list and the ids it hands out always come from the same pass.
  const scene = useMemo(() => {
    const k = makeKit(uid)
    const art = SHAPES[product.shape](k, product.tones, product.finish)
    // Cyclorama: wall falls off away from the key (upper left), curves into
    // the floor around y≈350, and the floor darkens toward the lens; a soft
    // vignette closes the frame.
    const backdrop = {
      wall: k.lin([[0, t(wall, 10)], [0.55, v(wall)], [0.69, mix(wall, floor, 55)], [0.76, v(floor)], [1, s(floor, 22)]], 0, 0, 0, 500),
      key: k.rad([[0, v('linen50'), 0.3], [0.45, v('linen50'), 0.1], [1, v('linen50'), 0]], 120, 110, 320),
      pool: k.rad([[0, v('linen50'), 0.16], [0.6, v('linen50'), 0.05], [1, v('linen50'), 0]], 200, 392, 220, undefined, undefined, 0.3),
      vignette: k.rad([[0, v('ink900'), 0], [0.62, v('ink900'), 0], [1, v('ink900'), 0.28]], 200, 240, 340),
    }
    return { defs: [...k.defs], art, backdrop, shared: <SharedDefs uid={uid} /> }
  }, [uid, product, wall, floor])
  const { defs, art, backdrop } = scene

  return (
    <div className={clsx('grain relative overflow-hidden', className)} style={{ backgroundColor: v(wall) }}>
      <svg
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
        focusable={false}
        className="absolute inset-0 size-full"
      >
        <defs>
          {scene.shared}
          {defs}
        </defs>
        <rect width="400" height="500" fill={backdrop.wall} />
        <rect width="400" height="500" fill={backdrop.key} />
        <rect width="400" height="500" fill={backdrop.pool} />
        <g className="origin-[50%_77%] transition-transform duration-[900ms] ease-aaa group-hover:scale-[1.03] group-focus-within:scale-[1.03]">
          {art}
        </g>
        <rect width="400" height="500" fill={backdrop.vignette} pointerEvents="none" />
      </svg>
      {children}
    </div>
  )
}
