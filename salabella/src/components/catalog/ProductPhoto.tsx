import { useId, type ReactNode } from 'react'
import clsx from 'clsx'
import type { Finish, Product, Shape } from '@/data/products'
import { tokenVar, type PaletteKey } from '@/three/configurator/swatches'

/**
 * Procedural studio "photograph" of a product: a two-stop token backdrop
 * (wall → floor sweep), a finish-specific light treatment, and a quiet
 * silhouette of the piece lit to match its material — soft radial for
 * fabric, a diagonal sweep across wood, a hot specular band on brass and a
 * glossy blob on ceramic and glass. Pure CSS/SVG, no network images.
 */

const v = tokenVar
const mix = (a: PaletteKey, b: PaletteKey, pctA: number) => `color-mix(in oklab, ${v(a)} ${pctA}%, ${v(b)})`
const fade = (a: PaletteKey, pct: number) => `color-mix(in oklab, ${v(a)} ${pct}%, transparent)`

/** Light falling on the backdrop, by finish. */
function wallLight(finish: Finish): string {
  switch (finish) {
    case 'fabric':
      return `radial-gradient(ellipse 75% 55% at 38% 30%, ${fade('linen50', 30)}, transparent 70%)`
    case 'wood':
      return `linear-gradient(118deg, transparent 18%, ${fade('linen50', 24)} 31%, transparent 44%), linear-gradient(118deg, transparent 47%, ${fade('linen50', 12)} 53%, transparent 59%)`
    case 'brass':
      return `radial-gradient(ellipse 50% 38% at 50% 40%, ${fade('brass200', 42)}, transparent 72%)`
    case 'ceramic':
      return `radial-gradient(circle at 76% 18%, ${fade('linen50', 38)}, transparent 32%)`
    case 'glass':
      return `radial-gradient(circle at 50% 42%, ${fade('brass200', 55)}, transparent 46%)`
  }
}

function BodyGradient({ id, finish, body }: { id: string; finish: Finish; body: PaletteKey }) {
  switch (finish) {
    case 'fabric':
      return (
        <radialGradient id={id} cx="0.36" cy="0.28" r="0.9">
          <stop offset="0" style={{ stopColor: mix(body, 'linen50', 74) }} />
          <stop offset="0.55" style={{ stopColor: v(body) }} />
          <stop offset="1" style={{ stopColor: mix(body, 'ink900', 74) }} />
        </radialGradient>
      )
    case 'wood':
      return (
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: mix(body, 'ink900', 80) }} />
          <stop offset="0.4" style={{ stopColor: v(body) }} />
          <stop offset="0.5" style={{ stopColor: mix(body, 'linen50', 70) }} />
          <stop offset="0.6" style={{ stopColor: v(body) }} />
          <stop offset="1" style={{ stopColor: mix(body, 'ink900', 72) }} />
        </linearGradient>
      )
    case 'brass':
      return (
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0.15">
          <stop offset="0" style={{ stopColor: mix('brass500', 'ink900', 72) }} />
          <stop offset="0.28" style={{ stopColor: v(body) }} />
          <stop offset="0.44" style={{ stopColor: v('brass200') }} />
          <stop offset="0.5" style={{ stopColor: v('linen50') }} />
          <stop offset="0.56" style={{ stopColor: v('brass200') }} />
          <stop offset="0.74" style={{ stopColor: v(body) }} />
          <stop offset="1" style={{ stopColor: mix('brass500', 'ink900', 78) }} />
        </linearGradient>
      )
    case 'ceramic':
      return (
        <radialGradient id={id} cx="0.34" cy="0.3" r="0.85">
          <stop offset="0" style={{ stopColor: mix(body, 'linen50', 66) }} />
          <stop offset="0.5" style={{ stopColor: v(body) }} />
          <stop offset="1" style={{ stopColor: mix(body, 'ink900', 70) }} />
        </radialGradient>
      )
    case 'glass':
      return (
        <radialGradient id={id} cx="0.5" cy="0.48" r="0.6">
          <stop offset="0" style={{ stopColor: v('linen50') }} />
          <stop offset="0.38" style={{ stopColor: v(body) }} />
          <stop offset="1" style={{ stopColor: mix(body, 'clay600', 55) }} />
        </radialGradient>
      )
  }
}

type Paint = { body: string; acc: string; glow: string }

/** Silhouettes on a 400 × 500 canvas; the floor line sits at y = 372. */
const SHAPES: Record<Shape, (p: Paint) => ReactNode> = {
  sofa: ({ body, acc }) => (
    <>
      {[84, 306].map((x) => (
        <polygon key={x} points={`${x},338 ${x + 12},338 ${x + 9},372 ${x + 3},372`} fill={acc} />
      ))}
      <rect x="60" y="204" width="280" height="84" rx="32" fill={body} />
      <rect x="48" y="262" width="304" height="80" rx="22" fill={body} />
      <rect x="38" y="236" width="56" height="106" rx="26" fill={body} />
      <rect x="306" y="236" width="56" height="106" rx="26" fill={body} />
      <rect x="92" y="252" width="106" height="36" rx="15" fill={body} stroke="currentColor" strokeOpacity="0.08" />
      <rect x="202" y="252" width="106" height="36" rx="15" fill={body} stroke="currentColor" strokeOpacity="0.08" />
    </>
  ),
  modular: ({ body, acc }) => (
    <>
      <rect x="36" y="348" width="328" height="12" rx="3" fill={acc} />
      <rect x="28" y="232" width="236" height="70" rx="28" fill={body} />
      <rect x="28" y="276" width="344" height="76" rx="22" fill={body} />
      <rect x="262" y="262" width="110" height="90" rx="24" fill={body} />
      <path d="M150 284 v62 M262 284 v62" stroke="currentColor" strokeOpacity="0.1" strokeWidth="2" />
    </>
  ),
  armchair: ({ body, acc }) => (
    <>
      {[126, 262].map((x) => (
        <g key={x}>
          <polygon points={`${x},336 ${x + 14},336 ${x + 10},366 ${x + 4},366`} fill={acc} />
          <rect x={x + 3} y="362" width="8" height="10" rx="1.5" fill={v('brass400')} />
        </g>
      ))}
      <rect x="126" y="170" width="148" height="128" rx="44" fill={body} />
      <rect x="104" y="236" width="54" height="104" rx="26" fill={body} />
      <rect x="242" y="236" width="54" height="104" rx="26" fill={body} />
      <rect x="112" y="294" width="176" height="46" rx="18" fill={body} />
      <rect x="148" y="266" width="104" height="40" rx="17" fill={body} stroke="currentColor" strokeOpacity="0.08" />
    </>
  ),
  lounge: ({ body, acc }) => (
    <>
      <polygon points="118,214 132,214 150,372 136,372" fill={acc} />
      <polygon points="268,214 282,214 264,372 250,372" fill={acc} />
      <rect x="124" y="304" width="152" height="10" rx="3" fill={acc} />
      <path d="M138 206 Q200 196 262 206 L268 300 Q200 318 132 300 Z" fill={body} />
      <path d="M128 296 Q200 336 272 296 L272 318 Q200 356 128 318 Z" fill={body} />
    </>
  ),
  table: ({ body }) => (
    <>
      {[74, 308].map((x) => (
        <polygon key={x} points={`${x},258 ${x + 20},258 ${x + 15},372 ${x + 5},372`} fill={body} />
      ))}
      <rect x="66" y="258" width="268" height="14" fill={body} opacity="0.85" />
      <rect x="44" y="242" width="312" height="18" rx="3" fill={body} />
    </>
  ),
  'side-table': ({ body, acc }) => (
    <>
      <ellipse cx="200" cy="368" rx="54" ry="9" fill={acc} />
      <rect x="192" y="276" width="16" height="92" fill={acc} />
      <ellipse cx="200" cy="268" rx="98" ry="22" fill={mix('ink900', 'linen50', 12)} opacity="0.25" />
      <ellipse cx="200" cy="262" rx="98" ry="24" fill={body} />
    </>
  ),
  shelf: ({ body, acc }) => (
    <>
      <rect x="108" y="96" width="9" height="276" fill={body} />
      <rect x="283" y="96" width="9" height="276" fill={body} />
      {[118, 178, 238, 298, 352].map((y) => (
        <rect key={y} x="100" y={y} width="200" height="11" rx="2" fill={body} />
      ))}
      <rect x="130" y="146" width="10" height="32" fill={acc} />
      <rect x="142" y="150" width="8" height="28" fill={v('clay500')} />
      <rect x="152" y="142" width="11" height="36" fill={v('linen200')} />
      <ellipse cx="248" cy="224" rx="18" ry="14" fill={v('clay400')} />
      <rect x="236" y="268" width="38" height="30" rx="4" fill={acc} />
      <circle cx="160" cy="330" r="14" fill={v('moss500')} />
    </>
  ),
  sideboard: ({ body, acc }) => (
    <>
      {[74, 314].map((x) => (
        <polygon key={x} points={`${x},342 ${x + 12},342 ${x + 9},372 ${x + 3},372`} fill={v('clay600')} />
      ))}
      <rect x="54" y="228" width="292" height="116" rx="6" fill={body} />
      <path d="M127 236 v100 M200 236 v100 M273 236 v100" stroke="currentColor" strokeOpacity="0.14" strokeWidth="1.5" />
      {[118, 136, 264, 282].map((x) => (
        <circle key={x} cx={x} cy="286" r="4" fill={acc} />
      ))}
    </>
  ),
  pendant: ({ body, acc, glow }) => (
    <>
      <rect x="199" y="0" width="2" height="196" fill={acc} opacity="0.8" />
      <rect x="190" y="188" width="20" height="16" rx="3" fill={body} />
      <path d="M104 304 Q106 204 200 198 Q294 204 296 304 Z" fill={body} />
      <ellipse cx="200" cy="304" rx="96" ry="10" fill={v('linen50')} opacity="0.9" />
      <ellipse cx="200" cy="374" rx="150" ry="20" fill={glow} opacity="0.32" />
    </>
  ),
  lamp: ({ body, acc }) => (
    <>
      <ellipse cx="200" cy="366" rx="48" ry="8" fill={acc} />
      <rect x="197" y="262" width="6" height="104" fill={acc} />
      <circle cx="200" cy="212" r="64" fill={body} />
    </>
  ),
  vase: ({ body, acc }) => (
    <>
      {[-38, -22, -8, 6, 20, 34].map((dx, i) => (
        <path
          key={dx}
          d={`M${200 + dx * 0.2} 226 Q${200 + dx * 0.9} ${170 - i * 6} ${200 + dx * 2.2} ${96 + (i % 3) * 18}`}
          stroke={acc}
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      ))}
      <path
        d="M170 372 Q138 330 148 290 Q158 252 182 240 L184 222 L216 222 L218 240 Q242 252 252 290 Q262 330 230 372 Z"
        fill={body}
      />
    </>
  ),
  basket: ({ body }) => (
    <>
      <path d="M106 292 L294 292 L276 368 Q200 380 124 368 Z" fill={body} />
      {[310, 328, 346].map((y) => (
        <path key={y} d={`M${112 + (y - 292) * 0.25} ${y} Q200 ${y + 8} ${288 - (y - 292) * 0.25} ${y}`} stroke="currentColor" strokeOpacity="0.14" strokeWidth="2" fill="none" />
      ))}
      <ellipse cx="200" cy="292" rx="94" ry="14" fill={body} />
      <ellipse cx="200" cy="293" rx="80" ry="9" fill={mix('ink900', 'brass500', 30)} opacity="0.35" />
    </>
  ),
}

/** Hanging and glowing pieces cast no floor shadow under themselves. */
const NO_SHADOW: Shape[] = ['pendant']

export function ProductPhoto({ product, className, children }: { product: Product; className?: string; children?: ReactNode }) {
  const uid = useId().replace(/:/g, '')
  const { wall, floor, body, accent } = product.tones
  const bodyId = `${uid}-b`
  const accId = `${uid}-a`
  const shadowId = `${uid}-s`
  const glossId = `${uid}-g`
  const glossy = product.finish === 'ceramic' || product.finish === 'glass'

  return (
    <div
      className={clsx('grain relative overflow-hidden', className)}
      style={{
        backgroundColor: v(wall),
        backgroundImage: `${wallLight(product.finish)}, linear-gradient(180deg, ${v(wall)} 0%, ${mix(wall, floor, 70)} 66%, ${v(floor)} 76%, ${mix(floor, 'ink900', 88)} 100%)`,
      }}
    >
      <svg
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
        focusable={false}
        className="absolute inset-0 size-full text-ink-900 transition-transform duration-[900ms] ease-aaa group-hover:scale-[1.035] group-focus-within:scale-[1.035]"
      >
        <defs>
          <BodyGradient id={bodyId} finish={product.finish} body={body} />
          <linearGradient id={accId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: mix(accent, 'linen50', 82) }} />
            <stop offset="0.5" style={{ stopColor: v(accent) }} />
            <stop offset="1" style={{ stopColor: mix(accent, 'ink900', 75) }} />
          </linearGradient>
          <radialGradient id={shadowId}>
            <stop offset="0" style={{ stopColor: v('ink900') }} stopOpacity="0.42" />
            <stop offset="0.6" style={{ stopColor: v('ink900') }} stopOpacity="0.16" />
            <stop offset="1" style={{ stopColor: v('ink900') }} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={glossId}>
            <stop offset="0" style={{ stopColor: v('linen50') }} stopOpacity="0.85" />
            <stop offset="1" style={{ stopColor: v('linen50') }} stopOpacity="0" />
          </radialGradient>
        </defs>
        {!NO_SHADOW.includes(product.shape) && <ellipse cx="200" cy="372" rx="176" ry="15" fill={`url(#${shadowId})`} />}
        {SHAPES[product.shape]({ body: `url(#${bodyId})`, acc: `url(#${accId})`, glow: `url(#${glossId})` })}
        {glossy && <ellipse cx={product.shape === 'lamp' ? 178 : 160} cy={product.shape === 'lamp' ? 186 : 254} rx="26" ry="10" fill={`url(#${glossId})`} transform={`rotate(-18 170 230)`} />}
      </svg>
      {children}
    </div>
  )
}
