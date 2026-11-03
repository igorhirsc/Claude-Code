import { palette } from '@/three/common/materials'
import type { PaletteKey } from '@/three/configurator/swatches'

/**
 * WCAG contrast maths for text laid over the procedural card "photos".
 * Colours come from the shared palette (which mirrors tokens.css), so the
 * ratios are computed from the same values the browser paints.
 */

type RGB = [number, number, number]

const rgb = (key: PaletteKey): RGB => {
  const h = palette[key].slice(1)
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB
}

const channel = (c: number) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

export const luminance = ([r, g, b]: RGB) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

export const contrast = (a: RGB, b: RGB) => {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** `fg` at `alpha` composited over `bg`, in sRGB like the browser. */
const over = (fg: RGB, alpha: number, bg: RGB): RGB => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as RGB

export type Scrim = {
  bg: PaletteKey
  alpha: number
  text: PaletteKey
  /** Worst-case contrast of the text over the composited scrim. */
  ratio: number
}

/**
 * Pick the pill scrim for a card wall colour. Light walls get a linen scrim
 * with ink text, dark walls an ink scrim with linen text. The ratio is
 * checked against the bare wall AND the wall under the brightest light
 * treatment (35% linen wash); opacity rises until it clears 4.5:1.
 */
export function scrimFor(wall: PaletteKey): Scrim {
  const w = rgb(wall)
  const lit = over(rgb('linen50'), 0.35, w)
  const lightWall = luminance(w) > 0.2
  const bg: PaletteKey = lightWall ? 'linen50' : 'ink900'
  const text: PaletteKey = lightWall ? 'ink900' : 'linen50'
  let alpha = lightWall ? 0.78 : 0.5
  const worst = (a: number) => Math.min(contrast(rgb(text), over(rgb(bg), a, w)), contrast(rgb(text), over(rgb(bg), a, lit)))
  while (worst(alpha) < 4.5 && alpha < 1) alpha = Math.min(1, alpha + 0.05)
  return { bg, alpha, text, ratio: worst(alpha) }
}

/** Solid badge: brass on ink text — computed, not assumed. */
export const BADGE = { bg: 'brass300' as PaletteKey, text: 'ink900' as PaletteKey, ratio: contrast(rgb('brass300'), rgb('ink900')) }
