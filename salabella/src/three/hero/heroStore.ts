import { create } from 'zustand'

export type PillowId = 'clay' | 'moss'
export type TossTarget = PillowId | 'all'

type HeroState = {
  /** Increments on every toss request; pillows react to changes, not values. */
  tossNonce: number
  tossTarget: TossTarget
  /** `performance.now()` timestamp at which the preloader reveals the hero. */
  revealAt: number
  toss: (target: TossTarget) => void
  setRevealAt: (t: number) => void
}

/**
 * Bridge between the DOM overlay (keyboard "shake the pillows" button) and
 * the physics scene: both pointer clicks on a pillow and the button go
 * through `toss`, so there is exactly one impulse code path.
 */
export const useHeroStore = create<HeroState>((set) => ({
  tossNonce: 0,
  tossTarget: 'all',
  revealAt: 0,
  toss: (target) => set((s) => ({ tossNonce: s.tossNonce + 1, tossTarget: target })),
  setRevealAt: (t) => set({ revealAt: t }),
}))
