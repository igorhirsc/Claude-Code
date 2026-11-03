import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useIsCoarsePointer, useReducedMotion } from '@/hooks/useMediaFlags'

const CANVAS_HOVER_EVENT = 'salabella:cursor-hover'
const INTERACTIVE = 'a, button, [role=button], [data-cursor-hover], summary, label[for], select'
const TEXT_ENTRY =
  'textarea, [contenteditable=""], [contenteditable="true"], input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file])'

/**
 * Shared cursor API for WebGL scenes. 3D components call this on pointer
 * over/out of interactive meshes instead of ever touching
 * `document.body.style.cursor` — the Cursor merges it with its DOM hover state.
 */
export function setCanvasCursorHover(active: boolean) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<boolean>(CANVAS_HOVER_EVENT, { detail: active }))
}

/**
 * Custom cursor: a precise dot plus a lagging ring. `mix-blend-difference`
 * with a linen fill inverts whatever sits underneath, so it reads on linen
 * walls, ink bands and WebGL alike. Fine pointers only.
 */
export function Cursor() {
  const coarse = useIsCoarsePointer()
  const reduced = useReducedMotion()
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (coarse) return
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    const root = document.documentElement
    const prevCursor = root.style.cursor
    root.style.cursor = 'none'
    // Links/buttons carry their own `cursor: pointer`; hide those too, but
    // keep the native I-beam in text fields (where our cursor steps aside).
    const style = document.createElement('style')
    style.setAttribute('data-cursor-style', '')
    style.textContent = `html.has-custom-cursor, html.has-custom-cursor *{cursor:none!important}
html.has-custom-cursor :is(${TEXT_ENTRY}){cursor:text!important}`
    document.head.appendChild(style)
    root.classList.add('has-custom-cursor')

    const dur = reduced ? 0 : 1
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, autoAlpha: 0 })
    const dotX = gsap.quickTo(dot, 'x', { duration: 0.12 * dur, ease: 'power3.out' })
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.12 * dur, ease: 'power3.out' })
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.5 * dur, ease: 'power3.out' })
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.5 * dur, ease: 'power3.out' })

    let domHover = false
    let canvasHover = false
    let overText = false
    let inside = false
    let pressed = false

    const render = () => {
      const hover = domHover || canvasHover
      const visible = inside && !overText
      const t = { duration: 0.25 * dur, ease: 'power3.out', overwrite: 'auto' as const }
      gsap.to(dot, { ...t, autoAlpha: visible && !hover ? 1 : 0, scale: pressed ? 0.6 : 1 })
      gsap.to(ring, {
        ...t,
        autoAlpha: visible ? 1 : 0,
        scale: (hover ? 1.9 : 1) * (pressed ? 0.85 : 1),
        borderWidth: hover ? 1 : 1.5,
      })
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (!inside) {
        // First sighting: jump into place instead of sweeping in from 0,0.
        gsap.set([dot, ring], { x: e.clientX, y: e.clientY })
        inside = true
        render()
      }
      dotX(e.clientX)
      dotY(e.clientY)
      ringX(e.clientX)
      ringY(e.clientY)
    }
    const onOver = (e: PointerEvent) => {
      const t = e.target instanceof Element ? e.target : null
      const nextText = !!t?.closest(TEXT_ENTRY)
      const nextHover = !nextText && !!t?.closest(INTERACTIVE)
      if (nextText !== overText || nextHover !== domHover) {
        overText = nextText
        domHover = nextHover
        render()
      }
    }
    const onLeaveDoc = () => {
      inside = false
      render()
    }
    const onDown = () => {
      pressed = true
      render()
    }
    const onUp = () => {
      pressed = false
      render()
    }
    const onCanvas = (e: Event) => {
      canvasHover = !!(e as CustomEvent<boolean>).detail
      render()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeaveDoc)
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('blur', onLeaveDoc)
    window.addEventListener(CANVAS_HOVER_EVENT, onCanvas)

    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      document.documentElement.removeEventListener('pointerleave', onLeaveDoc)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('blur', onLeaveDoc)
      window.removeEventListener(CANVAS_HOVER_EVENT, onCanvas)
      gsap.killTweensOf([dot, ring])
      root.classList.remove('has-custom-cursor')
      style.remove()
      root.style.cursor = prevCursor
    }
  }, [coarse, reduced])

  if (coarse) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100] mix-blend-difference">
      <div
        ref={ringRef}
        className="invisible fixed top-0 left-0 size-9 rounded-full border-[1.5px] border-linen-50 opacity-0 will-change-transform"
      />
      <div
        ref={dotRef}
        className="invisible fixed top-0 left-0 size-1.5 rounded-full bg-linen-50 opacity-0 will-change-transform"
      />
    </div>
  )
}
