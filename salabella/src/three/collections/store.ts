import { create } from 'zustand'
import type { CategoryId } from './CategoryIcons'

/**
 * Bridge between the DOM card grid and the shared WebGL scene.
 *
 * Cards write here on pointer/focus events; the scene reads it with
 * `useCollectionsStore.getState()` inside `useFrame`, so nothing subscribes
 * and no React component re-renders on pointer move.
 *
 * `reveal` is a mutable per-category 0→1 entrance progress. GSAP tweens the
 * numbers in place (same timeline as the DOM cards) and the icons read them
 * every frame — again with zero React work.
 */
export type Pointer = { x: number; y: number }

type CollectionsState = {
  hovered: CategoryId | null
  focused: CategoryId | null
  /** Pointer position over the hovered card, normalised to -1..1 (y down). */
  pointer: Pointer
  reveal: Record<CategoryId, number>
  setHovered: (id: CategoryId | null) => void
  setFocused: (id: CategoryId | null) => void
  setPointer: (x: number, y: number) => void
}

export const useCollectionsStore = create<CollectionsState>()((set) => ({
  hovered: null,
  focused: null,
  pointer: { x: 0, y: 0 },
  reveal: { sofas: 0, poltronas: 0, mesas: 0, estantes: 0, iluminacao: 0, decoracao: 0 },
  setHovered: (hovered) => set({ hovered }),
  setFocused: (focused) => set({ focused }),
  setPointer: (x, y) => set({ pointer: { x, y } }),
}))

/** The card currently driving the 3D response: pointer wins over focus. */
export function activeCategory(s: CollectionsState): { id: CategoryId | null; via: 'pointer' | 'focus' | null } {
  if (s.hovered) return { id: s.hovered, via: 'pointer' }
  if (s.focused) return { id: s.focused, via: 'focus' }
  return { id: null, via: null }
}
