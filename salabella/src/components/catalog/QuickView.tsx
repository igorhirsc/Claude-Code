import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import gsap from 'gsap'
import type { Product } from '@/data/products'
import { CATEGORIES } from '@/data/categories'
import { useIsSmallViewport, useReducedMotion } from '@/hooks/useMediaFlags'
import { ArrowUpRightIcon, CheckIcon, CloseIcon } from '@/components/ui/icons'
import { setCanvasCursorHover } from '@/components/ui/Cursor'
import { DEFAULT_SWATCH, type SwatchId } from '@/three/configurator/swatches'
import { SpecList, SwatchPicker } from './AuroraControls'
import { ProductPhoto } from './ProductPhoto'
import { CategoryPill, ProductBadge } from './ProductCard'

const ConfiguratorScene = lazy(() => import('@/three/configurator/ConfiguratorScene'))

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** Skeleton held over the 3D stage until the chair reports ready. */
function StageLoading({ hidden }: { hidden: boolean }) {
  return (
    <div
      aria-hidden
      className={clsx(
        'pointer-events-none absolute inset-0 z-[1] grid place-items-center bg-linen-200 transition-opacity duration-700 ease-aaa',
        hidden && 'opacity-0',
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <span className="size-10 animate-spin rounded-full border border-brass-400/30 border-t-brass-500" />
        <p className="eyebrow text-[0.6875rem] text-ink-600">Preparando a peça</p>
      </div>
    </div>
  )
}

type QuickViewProps = {
  product: Product
  saved: boolean
  onToggleSave: () => void
  onClose: () => void
}

/**
 * Product quick view: a portal dialog with a focus trap, Escape to close,
 * scroll lock and an eased scale/fade in and out. The featured Poltrona
 * Aurora mounts the same lazy 3D configurator scene as the home page.
 */
export function QuickView({ product, saved, onToggleSave, onClose }: QuickViewProps) {
  const reduced = useReducedMotion()
  const small = useIsSmallViewport()
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const closing = useRef(false)
  const [swatch, setSwatch] = useState<SwatchId>(DEFAULT_SWATCH)
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  const category = CATEGORIES.find((c) => c.id === product.category)

  // Open: overlay fades, panel rises and scales in on the house ease.
  useLayoutEffect(() => {
    const overlay = overlayRef.current
    const panel = panelRef.current
    if (!overlay || !panel) return
    // Focus can only land once the dialog is visible (autoAlpha 0 = hidden).
    const focusClose = () => closeRef.current?.focus({ preventScroll: true })
    if (reduced) {
      gsap.set([overlay, panel], { autoAlpha: 1 })
      focusClose()
      return
    }
    const tl = gsap.timeline()
    tl.fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'power2.out' }).fromTo(
      panel,
      { autoAlpha: 0, scale: 0.955, y: 24 },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: 'expo.out' },
      0.05,
    )
    tl.call(focusClose, [], 0.12)
    return () => {
      tl.kill()
    }
  }, [reduced])

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    const overlay = overlayRef.current
    const panel = panelRef.current
    if (reduced || !overlay || !panel) return onClose()
    gsap
      .timeline({ onComplete: onClose })
      .to(panel, { autoAlpha: 0, scale: 0.97, y: 12, duration: 0.32, ease: 'power2.in' })
      .to(overlay, { autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 0.08)
  }, [onClose, reduced])

  // Scroll lock + initial focus + Escape + focus trap.
  useEffect(() => {
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      html.style.overflow = prevOverflow
      setCanvasCursorHover(false)
    }
  }, [close])

  return createPortal(
    <div
      ref={overlayRef}
      data-lenis-prevent
      className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-ink-900/70 backdrop-blur-[6px]"
      style={{ visibility: 'hidden' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="flex min-h-full items-start justify-center px-4 py-6 md:items-center md:px-10 md:py-12" onMouseDown={(e) => e.target === e.currentTarget && close()}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quickview-titulo"
          aria-describedby="quickview-descricao"
          className="relative grid w-full max-w-[1240px] overflow-hidden bg-linen-50 text-ink-900 shadow-[0_40px_120px_-40px_var(--color-ink-900)] md:grid-cols-12"
          style={{ visibility: 'hidden' }}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Fechar detalhes"
            className="absolute top-4 right-4 z-[10] grid size-11 place-items-center rounded-full border border-ink-900/15 bg-linen-50/90 text-ink-900 backdrop-blur-sm transition-colors duration-200 hover:border-ink-900 hover:bg-linen-50"
          >
            <CloseIcon size={20} />
          </button>

          {/* media */}
          <div className="relative md:col-span-7">
            {product.featured ? (
              <div
                className="relative aspect-[4/5] w-full bg-linen-200 sm:aspect-[5/4] md:aspect-auto md:h-full md:min-h-[620px]"
                onPointerEnter={() => setCanvasCursorHover(true)}
                onPointerLeave={() => setCanvasCursorHover(false)}
              >
                <Suspense fallback={null}>
                  <ConfiguratorScene swatchId={swatch} active reduced={reduced} compact={small} onReady={onReady} />
                </Suspense>
                <StageLoading hidden={ready} />
                <p className="pointer-events-none absolute bottom-5 left-6 z-[2] text-xs text-ink-600">Arraste para girar</p>
              </div>
            ) : (
              <ProductPhoto product={product} className="aspect-[4/5] w-full sm:aspect-[5/4] md:aspect-auto md:h-full md:min-h-[620px]">
                <div className="absolute top-5 left-5 z-[6] flex gap-2">
                  <CategoryPill product={product} />
                  {product.badge && <ProductBadge badge={product.badge} />}
                </div>
              </ProductPhoto>
            )}
          </div>

          {/* copy */}
          <div className="flex flex-col px-6 pt-8 pb-8 md:col-span-5 md:px-10 md:pt-14 md:pb-10">
            <p className="eyebrow text-clay-600">{category?.label}</p>
            <h2 id="quickview-titulo" className="mt-4 pr-12 font-display text-4xl leading-[1.02] font-light tracking-[-0.02em] md:text-5xl">
              {product.name}
            </h2>
            <p id="quickview-descricao" className="mt-5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-ink-700">
              {product.description}
            </p>

            {product.featured ? (
              <>
                <div className="mt-8">
                  <SwatchPicker value={swatch} onChange={setSwatch} size="sm" />
                </div>
                <SpecList className="mt-8" />
              </>
            ) : (
              <dl className="mt-8 grid gap-4 border-t border-ink-900/15 pt-5 text-sm">
                <div className="flex justify-between gap-6">
                  <dt className="eyebrow text-[0.6875rem] text-ink-600">Medidas</dt>
                  <dd className="text-right tabular-nums">{product.dimensions}</dd>
                </div>
                <div className="flex justify-between gap-6">
                  <dt className="eyebrow text-[0.6875rem] text-ink-600">Prazo</dt>
                  <dd className="text-right">{product.leadTime}</dd>
                </div>
              </dl>
            )}

            <div className="mt-8">
              <p className="eyebrow text-[0.6875rem] text-ink-600">Materiais</p>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-800">
                {product.materials.map((m) => (
                  <li key={m} className="flex gap-3">
                    <span aria-hidden className="mt-[0.6em] h-px w-3 shrink-0 bg-brass-400" />
                    {m}
                  </li>
                ))}
              </ul>
              {product.featured && <p className="mt-4 text-sm text-ink-600">{product.leadTime}</p>}
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-x-7 gap-y-4 pt-10">
              <button
                type="button"
                aria-pressed={saved}
                onClick={onToggleSave}
                className={clsx(
                  'eyebrow inline-flex items-center gap-2.5 rounded-full px-7 py-4 transition-colors duration-200',
                  saved ? 'bg-moss-600 text-linen-50 hover:bg-moss-500' : 'bg-ink-900 text-linen-50 hover:bg-clay-600',
                )}
              >
                {saved && <CheckIcon size={16} />}
                {saved ? 'Na sua lista' : 'Adicionar à lista'}
              </button>
              <Link
                to="/contato"
                className="group eyebrow inline-flex items-center gap-2 border-b border-ink-900/40 py-1.5 text-ink-900 transition-colors duration-200 hover:border-ink-900"
              >
                Falar com um consultor
                <span className="transition-transform duration-200 ease-aaa group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRightIcon size={16} />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
