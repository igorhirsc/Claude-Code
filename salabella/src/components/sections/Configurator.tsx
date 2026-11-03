import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useIsSmallViewport, useReducedMotion, useSectionVisibility } from '@/hooks/useMediaFlags'
import { useMagnetic } from '@/hooks/useMagnetic'
import { setCanvasCursorHover } from '@/components/ui/Cursor'
import { ArrowUpRightIcon, CheckIcon } from '@/components/ui/icons'
import { SpecList, SwatchPicker } from '@/components/catalog/AuroraControls'
import { DEFAULT_SWATCH, type SwatchId } from '@/three/configurator/swatches'
import type { ConfiguratorApi } from '@/three/configurator/ConfiguratorScene'

gsap.registerPlugin(ScrollTrigger)

const ConfiguratorScene = lazy(() => import('@/three/configurator/ConfiguratorScene'))

const RotateIcon = ({ flip = false }: { flip?: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    focusable={false}
    style={flip ? { transform: 'scaleX(-1)' } : undefined}
  >
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
    <path d="M4.5 4v3.5H8" />
  </svg>
)

/** Pulsing placeholder that holds the stage until the 3D chair is ready. */
export function StageSkeleton({ hidden }: { hidden: boolean }) {
  return (
    <div
      aria-hidden
      className={clsx(
        'pointer-events-none absolute inset-0 z-[1] grid place-items-center bg-linen-200 transition-opacity duration-700 ease-aaa',
        hidden && 'opacity-0',
      )}
    >
      <div className="flex w-[42%] max-w-[260px] flex-col items-center gap-0">
        {/* a soft, abstracted armchair silhouette */}
        <div className="flex w-full items-end gap-[4%]">
          <div className="h-16 w-[16%] animate-pulse rounded-[999px_999px_14px_14px] bg-linen-300/80" />
          <div className="flex flex-1 flex-col gap-[6px]">
            <div className="h-20 animate-pulse rounded-[22px_22px_10px_10px] bg-linen-300/70" />
            <div className="h-9 animate-pulse rounded-[14px] bg-linen-300/90" />
          </div>
          <div className="h-16 w-[16%] animate-pulse rounded-[999px_999px_14px_14px] bg-linen-300/80" />
        </div>
        <div className="mt-3 h-2 w-[110%] rounded-[50%] bg-ink-900/10 blur-[3px]" />
        <p className="eyebrow mt-6 text-[0.6875rem] text-ink-600">Preparando a peça</p>
      </div>
    </div>
  )
}

export default function Configurator() {
  const { ref: sectionRef, everInView, inView } = useSectionVisibility<HTMLElement>('400px')
  const small = useIsSmallViewport()
  const reduced = useReducedMotion()
  const [swatch, setSwatch] = useState<SwatchId>(DEFAULT_SWATCH)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState(false)
  const apiRef = useRef<ConfiguratorApi | null>(null)
  const ctaRef = useMagnetic<HTMLButtonElement>({ strength: 0.25, max: 10 })
  const onReady = useCallback(() => setReady(true), [])

  // Staggered entrance: copy column rises line by line, stage settles in.
  useEffect(() => {
    const root = sectionRef.current
    if (!root || reduced) return
    let io: IntersectionObserver | null = null
    let fallback: number | undefined
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out', duration: 1.2 } })
      tl.from('[data-reveal-line]', { yPercent: 110, stagger: 0.08, duration: 1.3 })
        .from('[data-reveal]', { y: 24, autoAlpha: 0, stagger: 0.07 }, 0.2)
        .from('[data-reveal-stage]', { y: 40, autoAlpha: 0, scale: 0.975, duration: 1.5 }, 0)
      const play = () => {
        if (tl.progress() === 0 && !tl.isActive()) tl.play()
      }
      ScrollTrigger.create({ trigger: root, start: 'top 70%', once: true, onEnter: play })
      // Never leave content stuck invisible if ScrollTrigger mis-measures.
      io = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
          window.clearTimeout(fallback)
          fallback = window.setTimeout(play, 700)
        }
      })
      io.observe(root)
    }, root)
    return () => {
      io?.disconnect()
      window.clearTimeout(fallback)
      ctx.revert()
    }
  }, [reduced, sectionRef])

  return (
    <section
      id="configurador"
      ref={sectionRef}
      aria-labelledby="configurador-titulo"
      className="relative overflow-hidden bg-linen-50 text-ink-900"
    >
      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-24 md:grid-cols-12 md:items-center md:gap-10 md:px-10 md:py-32 lg:gap-16 lg:py-40">
        {/* ------------------------------------------------------ stage -- */}
        <div data-reveal-stage className="md:col-span-7">
          <div
            data-ready={ready || undefined}
            className="relative aspect-[4/5] w-full overflow-hidden border border-linen-300 bg-linen-200 sm:aspect-[5/4] md:aspect-[6/7] lg:aspect-[5/4]"
            onPointerEnter={() => setCanvasCursorHover(true)}
            onPointerLeave={() => setCanvasCursorHover(false)}
          >
            {everInView && (
              <Suspense fallback={null}>
                <ConfiguratorScene
                  swatchId={swatch}
                  active={inView}
                  reduced={reduced}
                  compact={small}
                  apiRef={apiRef}
                  onReady={onReady}
                />
              </Suspense>
            )}
            <StageSkeleton hidden={ready} />

            {/* spec-sheet corner ticks */}
            {['top-3 left-3 border-t border-l', 'top-3 right-3 border-t border-r', 'bottom-3 left-3 border-b border-l', 'bottom-3 right-3 border-b border-r'].map(
              (c) => (
                <span key={c} data-stage-overlay aria-hidden className={clsx('pointer-events-none absolute z-[2] size-4 border-brass-500/70', c)} />
              ),
            )}
            <p data-stage-overlay aria-hidden className="eyebrow pointer-events-none absolute top-6 left-7 z-[2] text-[0.6875rem] text-ink-600">
              Vista 360°
            </p>

            <div data-stage-overlay className="absolute right-5 bottom-5 left-5 z-[2] flex items-center justify-between gap-3">
              <p className="pointer-events-none text-xs text-ink-600">
                <span className="hidden sm:inline">Arraste para girar</span>
                <span className="sm:hidden">Deslize para girar</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Girar a poltrona para a esquerda"
                  onClick={() => apiRef.current?.rotate(-Math.PI / 5)}
                  className="grid size-10 place-items-center rounded-full border border-ink-900/20 bg-linen-50/80 text-ink-900 backdrop-blur-sm transition-colors duration-200 hover:border-ink-900 hover:bg-linen-50"
                >
                  <RotateIcon />
                </button>
                <button
                  type="button"
                  aria-label="Girar a poltrona para a direita"
                  onClick={() => apiRef.current?.rotate(Math.PI / 5)}
                  className="grid size-10 place-items-center rounded-full border border-ink-900/20 bg-linen-50/80 text-ink-900 backdrop-blur-sm transition-colors duration-200 hover:border-ink-900 hover:bg-linen-50"
                >
                  <RotateIcon flip />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- copy -- */}
        <div className="md:col-span-5 lg:col-span-4 lg:col-start-9">
          <p data-reveal className="eyebrow flex items-center gap-3 text-clay-600">
            <span aria-hidden className="h-px w-8 bg-brass-400" />
            Configurador · Peça em destaque
          </p>
          <h2
            id="configurador-titulo"
            className="mt-6 font-display text-[3rem] leading-[0.98] font-light tracking-[-0.025em] md:text-6xl xl:text-7xl"
          >
            <span className="block overflow-hidden pb-[0.08em]">
              <span data-reveal-line className="block">
                Poltrona
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.12em]">
              <span data-reveal-line className="block text-clay-600 italic">
                Aurora
              </span>
            </span>
          </h2>
          <p data-reveal className="mt-6 max-w-[52ch] text-base leading-relaxed text-ink-700">
            Braços largos que abraçam, um encosto inclinado na medida da lombar e o assento solto, de pluma sobre espuma de
            alta resiliência. Estofada à mão por artesãos parceiros em São Paulo, chega no tecido que você escolher — e
            envelhece bonita com ele.
          </p>

          <div data-reveal className="mt-9">
            <SwatchPicker value={swatch} onChange={setSwatch} />
          </div>

          <div data-reveal>
            <SpecList className="mt-9" />
          </div>
          <p data-reveal className="mt-5 max-w-[52ch] text-sm leading-relaxed text-ink-600">
            Pés torneados em freijó maciço com ponteiras de latão · feita sob encomenda em 45 dias.
          </p>

          <div data-reveal className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <button
              ref={ctaRef}
              type="button"
              aria-pressed={saved}
              onClick={() => setSaved((s) => !s)}
              className={clsx(
                'eyebrow inline-flex items-center gap-2.5 rounded-full px-7 py-4 transition-colors duration-200',
                saved ? 'bg-moss-600 text-linen-50 hover:bg-moss-500' : 'bg-ink-900 text-linen-50 hover:bg-clay-600',
              )}
            >
              {saved && <CheckIcon size={16} />}
              {saved ? 'Na sua lista' : 'Adicionar à lista'}
            </button>
            <Link
              to="/colecoes?categoria=poltronas&peca=poltrona-aurora"
              className="group eyebrow inline-flex items-center gap-2 border-b border-ink-900/40 py-1.5 text-ink-900 transition-colors duration-200 hover:border-ink-900"
            >
              Ver detalhes
              <span className="transition-transform duration-200 ease-aaa group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRightIcon size={16} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
