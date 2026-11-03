import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type Options = {
  /** Fraction of the pointer offset the element follows (0–1). */
  strength?: number
  /** Hard cap on travel in px so large buttons never drift far. */
  max?: number
}

/**
 * Magnetic hover: the element leans toward the pointer while hovered and
 * springs home on leave. Off for reduced motion and coarse pointers, and
 * re-evaluates if either media query changes while mounted.
 */
export function useMagnetic<T extends HTMLElement = HTMLElement>({ strength = 0.3, max = 14 }: Options = {}) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarse = window.matchMedia('(pointer: coarse)')

    let teardown: (() => void) | null = null

    const setup = () => {
      teardown?.()
      teardown = null
      if (reduced.matches || coarse.matches) {
        gsap.set(el, { x: 0, y: 0 })
        return
      }
      const xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' })
      const yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' })
      const clamp = gsap.utils.clamp(-max, max)

      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        const r = el.getBoundingClientRect()
        xTo(clamp((e.clientX - (r.left + r.width / 2)) * strength))
        yTo(clamp((e.clientY - (r.top + r.height / 2)) * strength))
      }
      const onLeave = () => {
        gsap.killTweensOf(el, 'x,y')
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' })
      }
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerleave', onLeave)
      teardown = () => {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerleave', onLeave)
        gsap.killTweensOf(el, 'x,y')
        gsap.set(el, { x: 0, y: 0 })
      }
    }

    setup()
    reduced.addEventListener('change', setup)
    coarse.addEventListener('change', setup)
    return () => {
      reduced.removeEventListener('change', setup)
      coarse.removeEventListener('change', setup)
      teardown?.()
    }
  }, [strength, max])

  return ref
}
