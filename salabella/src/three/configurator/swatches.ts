import type { palette } from '@/three/common/materials'

/** A key of the shared 3D `palette` (mirrors the CSS tokens one-to-one). */
export type PaletteKey = keyof typeof palette

/** `clay500` → `var(--color-clay-500)`, `cream` → `var(--color-cream)`. */
export const tokenVar = (key: PaletteKey) => `var(--color-${key.replace(/(\d+)$/, '-$1')})`

export type SwatchId = 'linho-cru' | 'caramelo' | 'terracota' | 'musgo' | 'grafite'

export type Swatch = {
  id: SwatchId
  name: string
  /** Fabric base colour. */
  color: PaletteKey
  /** One line on the cloth itself. */
  fabric: string
}

/**
 * Five upholstery options for the Poltrona Aurora. Pure data (type-only
 * import of the palette) so the DOM swatch row never loads three.js.
 */
export const SWATCHES: readonly Swatch[] = [
  { id: 'linho-cru', name: 'Linho cru', color: 'linen300', fabric: 'Linho lavado, toque seco e fresco' },
  { id: 'caramelo', name: 'Caramelo', color: 'brass400', fabric: 'Veludo de algodão, pelo curto' },
  { id: 'terracota', name: 'Terracota', color: 'clay500', fabric: 'Bouclé de lã, trama aberta' },
  { id: 'musgo', name: 'Musgo', color: 'moss500', fabric: 'Linho encorpado, tingido em peça' },
  { id: 'grafite', name: 'Grafite', color: 'ink600', fabric: 'Chenille de algodão, macio e denso' },
]

export const DEFAULT_SWATCH: SwatchId = 'terracota'

export const swatchById = (id: SwatchId) => SWATCHES.find((s) => s.id === id) ?? SWATCHES[0]
