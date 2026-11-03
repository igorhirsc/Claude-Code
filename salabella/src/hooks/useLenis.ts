import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenisSingleton: Lenis | null = null

/**
 * Buttery smooth scroll, wired into GSAP's ticker so ScrollTrigger stays in
 * sync with Lenis instead of the native scroll event. Mount once at the app
 * root; sections just use gsap.ScrollTrigger as normal.
 */
export function useLenis() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })
    lenisSingleton = lenis
    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      lenisSingleton = null
    }
  }, [])
}

export type ScrollOpts = { offset?: number; immediate?: boolean }

/**
 * Scroll through Lenis when it is running (so its internal position stays in
 * sync), with a native fallback for reduced motion. `immediate` jumps without
 * easing — used for route changes.
 */
export function scrollTo(target: string | number | HTMLElement, opts?: ScrollOpts) {
  const offset = opts?.offset ?? 0
  const immediate = opts?.immediate ?? false
  // Resolve elements to a plain document offset ourselves: Lenis would also
  // add the element's CSS scroll-margin on top of `offset`, which double-counts
  // with the scroll-mt-* utilities that serve native focus/tab scrolling.
  let top: number
  if (typeof target === 'number') top = target + offset
  else {
    const el = typeof target === 'string' ? document.querySelector(target) : target
    if (!el) return
    top = el.getBoundingClientRect().top + window.scrollY + offset
  }
  top = Math.max(0, top)
  if (lenisSingleton) {
    // After a route change the page height differs from what Lenis last
    // measured; without a resize it would clamp to the old page's limit.
    lenisSingleton.resize()
    lenisSingleton.scrollTo(top, { immediate, force: true })
    return
  }
  window.scrollTo({ top, behavior: immediate ? 'instant' : 'smooth' })
}

/** Clearance kept between a scroll target and the fixed header (px). */
export const HEADER_CLEARANCE = 120

/**
 * Focus a form control without letting the browser park it under the fixed
 * header: focus with preventScroll, then scroll so it sits HEADER_CLEARANCE
 * below the top of the viewport (only if it is not already comfortably visible).
 */
export function focusWithClearance(el: HTMLElement | null, opts?: { immediate?: boolean }) {
  if (!el) return
  el.focus({ preventScroll: true })
  const r = el.getBoundingClientRect()
  if (r.top >= HEADER_CLEARANCE && r.bottom <= window.innerHeight - 24) return
  scrollTo(el, { offset: -HEADER_CLEARANCE, immediate: opts?.immediate })
}
