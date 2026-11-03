import { useEffect, useId, useRef } from 'react'
import clsx from 'clsx'
import gsap from 'gsap'
import { ADDRESS_LINES, MAPS_URL } from '@/data/storeLocator'
import { ArrowUpRightIcon } from '@/components/ui/icons'

/*
  Procedural, offline "map" of the Jardins grid. Not cartography — an
  editorial drawing: the alamedas run on a tilted grid (as they do in the
  real neighbourhood), Av. Paulista caps the top and a brass route walks
  down from the metrô to the showroom.

  Street geometry lives in a "frame" whose origin is the store, rotated
  ANGLE° and translated so the store lands at (STORE_X, storeY) on screen.
  The pin and label chip are placed in screen space via `toScreen`, so they
  stay upright and the HTML chip can be positioned in percentages.
*/

const W = 500
const ANGLE = -28
const STORE_X = W * 0.6
const COL = 95 // block length along the alamedas
const LORENA = 0
const PAULISTA = -180
const METRO = { x: COL * 1.5, y: PAULISTA }

// Streets crossing the alamedas: store sits mid-block between two of them.
const STREET_X = Array.from({ length: 19 }, (_, i) => -COL / 2 + (i - 9) * COL)
// Alamedas, Lorena at 0. Rows beyond Paulista continue the grid (Bela Vista).
const ALAMEDAS = [-444, -378, -312, -246, PAULISTA, -120, -60, LORENA, 66, 132, 198, 264, 330, 396, 462, 528]

function makeToScreen(storeY: number) {
  const a = (ANGLE * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return (x: number, y: number) => ({ x: STORE_X + x * c - y * s, y: storeY + x * s + y * c })
}

// Deterministic pseudo-random so the drawing is identical on every render.
function hash(i: number, j: number) {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return s - Math.floor(s)
}

type Block = { x: number; y: number; w: number; h: number; tone: 'block' | 'park' | 'lot' }

function buildBlocks(): Block[] {
  const out: Block[] = []
  const gap = 9
  const paulistaRow = ALAMEDAS.indexOf(PAULISTA)
  for (let r = 0; r < ALAMEDAS.length - 1; r++) {
    for (let c = 0; c < STREET_X.length - 1; c++) {
      // Paulista is a wide avenue: pull the blocks back from it.
      const avTop = r === paulistaRow ? 6 : 0
      const avBottom = r === paulistaRow - 1 ? 6 : 0
      const x = STREET_X[c] + gap
      const y = ALAMEDAS[r] + gap + avTop
      const w = STREET_X[c + 1] - STREET_X[c] - gap * 2
      const h = ALAMEDAS[r + 1] - ALAMEDAS[r] - gap * 2 - avTop - avBottom
      const n = hash(r, c)
      // Trianon-ish green just below Paulista, and one square further down.
      if ((r === paulistaRow && c === 7) || (r === paulistaRow + 4 && c === 11)) {
        out.push({ x, y, w, h, tone: 'park' })
      } else if (n > 0.62) {
        // split block: two lots with an inner passage
        const split = w * (0.38 + n * 0.2)
        out.push({ x, y, w: split - 3, h, tone: 'block' })
        out.push({ x: x + split + 3, y, w: w - split - 3, h, tone: n > 0.86 ? 'lot' : 'block' })
      } else {
        out.push({ x, y, w, h, tone: 'block' })
      }
    }
  }
  return out
}

const BLOCKS = buildBlocks()
// SVG text scales with the map; bump it when the map renders narrow so
// street names stay legible on phones (container query on the wrapper).
const labelSize = 'text-[8.5px] @max-[30rem]:text-[12px]'
/** "Alameda Lorena, 1288" — the street line without the neighbourhood suffix. */
const STREET_ADDRESS = ADDRESS_LINES[0].split(' — ')[0]

const LABELS = [
  { text: 'AV. PAULISTA', x: -112, y: PAULISTA - 10 },
  { text: 'AL. SANTOS', x: -118, y: -126 },
  { text: 'AL. LORENA', x: -200, y: LORENA - 6 },
  { text: 'R. OSCAR FREIRE', x: -10, y: 60 },
]

export function StoreMap({
  className,
  compact = false,
  tall = false,
}: {
  className?: string
  compact?: boolean
  /** Portrait-ish frame (500×580) for tall columns; default is 5:4. */
  tall?: boolean
}) {
  const H = tall ? 580 : 400
  const storeY = H * (tall ? 0.64 : 0.62)
  const toScreen = makeToScreen(storeY)
  const raw = useId()
  const uid = raw.replace(/[^a-zA-Z0-9]/g, '')
  const wrapRef = useRef<HTMLDivElement>(null)
  const tiltRef = useRef<HTMLDivElement>(null)

  const pin = toScreen(0, 0)
  const route = `M ${METRO.x} ${METRO.y} V ${LORENA} H 0`

  useEffect(() => {
    const wrap = wrapRef.current
    const tilt = tiltRef.current
    if (!wrap || !tilt) return
    if (window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return

    const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.8, ease: 'power3.out' })
    const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.8, ease: 'power3.out' })
    gsap.set(tilt, { transformPerspective: 1100, transformOrigin: '50% 50%' })

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect()
      const nx = (e.clientX - r.left) / r.width - 0.5
      const ny = (e.clientY - r.top) / r.height - 0.5
      ry(nx * 6)
      rx(-ny * 5)
    }
    const onLeave = () => {
      rx(0)
      ry(0)
    }
    wrap.addEventListener('pointermove', onMove)
    wrap.addEventListener('pointerleave', onLeave)
    return () => {
      wrap.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerleave', onLeave)
      gsap.killTweensOf(tilt)
      gsap.set(tilt, { clearProps: 'transform' })
    }
  }, [])

  return (
    <div ref={wrapRef} className={clsx('@container relative', className)}>
      <div
        ref={tiltRef}
        style={{ aspectRatio: `${W} / ${H}` }}
        className="relative overflow-hidden rounded-[1.25rem] bg-ink-800 shadow-[0_30px_60px_-30px_var(--color-ink-900)] ring-1 ring-ink-900/10 will-change-transform"
      >
        <style>{`
          @keyframes sb-pulse-${uid} { 0% { transform: scale(1); opacity: .55 } 80%,100% { transform: scale(3.2); opacity: 0 } }
          @keyframes sb-draw-${uid} { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
          .sb-pulse-${uid} { transform-box: fill-box; transform-origin: center; animation: sb-pulse-${uid} 2.6s cubic-bezier(0.16,1,0.3,1) infinite }
          .sb-pulse-${uid}.d2 { animation-delay: 1.3s }
          .sb-route-${uid} { stroke-dasharray: 1; animation: sb-draw-${uid} 2.4s cubic-bezier(0.16,1,0.3,1) .4s both }
          @media (prefers-reduced-motion: reduce) {
            .sb-pulse-${uid} { animation: none; opacity: 0 }
            .sb-route-${uid} { animation: none }
          }
        `}</style>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 size-full"
          role="img"
          aria-label={`Mapa ilustrado: o showroom SALABELLA fica na ${ADDRESS_LINES[0]}, a poucas quadras da Avenida Paulista.`}
        >
          <defs>
            <radialGradient id={`vig-${uid}`} cx="45%" cy="50%" r="70%">
              <stop offset="55%" stopColor="var(--color-ink-900)" stopOpacity="0" />
              <stop offset="100%" stopColor="var(--color-ink-900)" stopOpacity="0.75" />
            </radialGradient>
            <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-clay-400)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-clay-400)" stopOpacity="0" />
            </radialGradient>
            <pattern id={`hatch-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-moss-500)" strokeWidth="1.4" opacity="0.6" />
            </pattern>
          </defs>

          <g transform={`translate(${STORE_X} ${storeY}) rotate(${ANGLE})`}>
            {/* blocks */}
            {BLOCKS.map((b, i) => (
              <rect
                key={i}
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={3}
                fill={
                  b.tone === 'park'
                    ? 'var(--color-moss-600)'
                    : b.tone === 'lot'
                      ? `url(#hatch-${uid})`
                      : 'var(--color-ink-700)'
                }
                opacity={b.tone === 'park' ? 0.9 : 1}
              />
            ))}

            {/* minor streets */}
            {STREET_X.map((x) => (
              <line key={`s${x}`} x1={x} y1={-900} x2={x} y2={900} stroke="var(--color-ink-600)" strokeWidth={1} opacity={0.55} />
            ))}
            {ALAMEDAS.map((y) => (
              <line key={`a${y}`} x1={-900} y1={y} x2={900} y2={y} stroke="var(--color-ink-600)" strokeWidth={1} opacity={0.55} />
            ))}

            {/* Al. Lorena — the store's street, a touch brighter */}
            <line x1={-900} y1={LORENA} x2={900} y2={LORENA} stroke="var(--color-linen-300)" strokeWidth={1.25} opacity={0.35} />

            {/* Av. Paulista */}
            <line x1={-900} y1={PAULISTA} x2={900} y2={PAULISTA} stroke="var(--color-linen-300)" strokeWidth={12} opacity={0.12} />
            <line x1={-900} y1={PAULISTA} x2={900} y2={PAULISTA} stroke="var(--color-linen-300)" strokeWidth={1} opacity={0.45} strokeDasharray="10 8" />

            {/* street names */}
            {LABELS.map((l) => (
              <text
                key={l.text}
                x={l.x}
                y={l.y}
                fill="var(--color-linen-100)"
                opacity={0.62}
                className={labelSize}
                letterSpacing={2.2}
                fontFamily="var(--font-sans)"
                fontWeight={500}
              >
                {l.text}
              </text>
            ))}

            {/* walking route from the metrô */}
            <path d={route} fill="none" stroke="var(--color-brass-400)" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.18} />
            <path
              d={route}
              pathLength={1}
              className={`sb-route-${uid}`}
              fill="none"
              stroke="var(--color-brass-300)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={METRO.x} cy={METRO.y} r={6.5} fill="var(--color-ink-900)" stroke="var(--color-brass-300)" strokeWidth={1.5} />
            <circle cx={METRO.x} cy={METRO.y} r={2.2} fill="var(--color-brass-300)" />
            <text
              x={METRO.x - 12}
              y={METRO.y + 22}
              textAnchor="end"
              fill="var(--color-brass-200)"
              className={labelSize}
              letterSpacing={2}
              fontFamily="var(--font-sans)"
              fontWeight={500}
            >
              METRÔ · 6 MIN A PÉ
            </text>
          </g>

          {/* pin (screen-space, upright) */}
          <circle cx={pin.x} cy={pin.y} r={60} fill={`url(#glow-${uid})`} />
          <circle className={`sb-pulse-${uid}`} cx={pin.x} cy={pin.y} r={9} fill="none" stroke="var(--color-clay-400)" strokeWidth={1.5} />
          <circle className={`sb-pulse-${uid} d2`} cx={pin.x} cy={pin.y} r={9} fill="none" stroke="var(--color-clay-400)" strokeWidth={1.5} />
          <ellipse cx={pin.x} cy={pin.y + 1.5} rx={7} ry={2.6} fill="var(--color-ink-900)" opacity={0.7} />
          <g transform={`translate(${pin.x} ${pin.y})`}>
            <path d="M0 0 C -2 -6 -11 -12 -11 -22 A 11 11 0 1 1 11 -22 C 11 -12 2 -6 0 0 Z" fill="var(--color-clay-500)" stroke="var(--color-clay-400)" strokeWidth={1} />
            <circle cx={0} cy={-22} r={4.2} fill="var(--color-linen-50)" />
          </g>

          {/* compass */}
          <g transform={`translate(${W - 42} 42)`} opacity={0.9}>
            <circle r={20} fill="var(--color-ink-900)" fillOpacity={0.6} stroke="var(--color-brass-400)" strokeOpacity={0.6} />
            <circle r={15} fill="none" stroke="var(--color-brass-400)" strokeOpacity={0.25} strokeDasharray="1 3" />
            <g transform={`rotate(${ANGLE})`}>
              <path d="M0 -13 L3.2 0 L0 2.5 L-3.2 0 Z" fill="var(--color-clay-400)" />
              <path d="M0 13 L3.2 0 L0 -2.5 L-3.2 0 Z" fill="var(--color-linen-300)" opacity={0.55} />
            </g>
            <text y={-25} textAnchor="middle" fill="var(--color-brass-300)" fontSize={8} letterSpacing={1} fontFamily="var(--font-sans)" fontWeight={600} transform={`rotate(${ANGLE})`}>
              N
            </text>
          </g>

          {/* scale bar */}
          <g transform={`translate(${W - 92} ${H - 26})`} opacity={0.75}>
            <path d="M0 0 V4 H60 V0" fill="none" stroke="var(--color-linen-300)" strokeWidth={1} />
            <text x={30} y={-5} textAnchor="middle" fill="var(--color-linen-100)" className={labelSize} letterSpacing={1.5} fontFamily="var(--font-sans)">
              200 M
            </text>
          </g>

          <rect width={W} height={H} fill={`url(#vig-${uid})`} pointerEvents="none" />
        </svg>

        {/* label chip, to the left of the pin head — the route runs off to the right */}
        <div
          className="pointer-events-none absolute flex -translate-x-full -translate-y-1/2 items-center"
          style={{ left: `calc(${(pin.x / W) * 100}% - 16px)`, top: `${((pin.y - 22) / H) * 100}%` }}
        >
          <div className="rounded-lg border border-brass-400/40 bg-ink-900/90 px-3.5 py-2.5 whitespace-nowrap shadow-[0_12px_30px_-12px_var(--color-ink-900)] backdrop-blur-sm @max-[30rem]:px-2.5 @max-[30rem]:py-2">
            <p className="text-[0.625rem] font-medium tracking-[0.26em] text-brass-300 @max-[30rem]:text-[0.5625rem] @max-[30rem]:tracking-[0.18em]">
              SHOWROOM SALABELLA
            </p>
            <p className={clsx('mt-1 font-display text-linen-50 @max-[30rem]:text-[0.8125rem]', compact ? 'text-[0.9375rem]' : 'text-base')}>
              {STREET_ADDRESS}
            </p>
          </div>
          <div className="h-px w-3 bg-brass-400/60" />
        </div>

        <a
          href={MAPS_URL}
          target="_blank"
          rel="noreferrer"
          className="eyebrow absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-linen-50 px-4 py-2.5 text-[0.6875rem] text-ink-900 shadow-[0_10px_30px_-12px_var(--color-ink-900)] transition-colors duration-200 hover:bg-brass-200"
        >
          Como chegar
          <ArrowUpRightIcon size={14} />
        </a>
      </div>
    </div>
  )
}
