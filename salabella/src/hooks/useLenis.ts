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

export function scrollTo(target: string | number | HTMLElement, opts?: { offset?: number }) {
  if (lenisSingleton) lenisSingleton.scrollTo(target, { offset: opts?.offset ?? 0 })
  else if (typeof target === 'number') window.scrollTo({ top: target })
  else {
    const el = typeof target === 'string' ? document.querySelector(target) : target
    el?.scrollIntoView()
  }
}
