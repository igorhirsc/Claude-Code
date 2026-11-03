import { lazy, Suspense, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react'
import gsap from 'gsap'
import { scrollTo } from '@/hooks/useLenis'
import { useIsCoarsePointer, useIsSmallViewport, useReducedMotion, useSectionVisibility } from '@/hooks/useMediaFlags'
import { useHeroStore } from '@/three/hero/heroStore'

const HeroScene = lazy(() => import('@/three/hero/HeroScene'))

/**
 * The preloader starts with the app; its panel wipe uncovers the hero at
 * ~2.2–3.1 s. The entrance is scheduled against module evaluation (≈ app
 * start) so a later client-side visit to "/" doesn't wait for a loader
 * that no longer exists.
 */
const MODULE_T0 = typeof performance === 'undefined' ? 0 : performance.now()
const REVEAL_AT_S = 2.55

const HEADLINE: { words: string[]; accent?: boolean }[] = [
  { words: ['Cada', 'peça,'] },
  { words: ['uma', 'assinatura.'] },
  { words: ['Cada', 'casa,'] },
  { words: ['uma', 'galeria.'], accent: true },
]

/** Side-by-side layout ⇔ Tailwind `md:landscape:` — same media queries. */
const LANDSCAPE = '(orientation: landscape)'
function useLandscape() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(LANDSCAPE)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(LANDSCAPE).matches,
    () => true,
  )
}

function OrbitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false}>
      <ellipse cx="12" cy="12" rx="9.5" ry="3.6" />
      <path d="M18.6 6.4l1.6 2.3-2.7.6" />
      <path d="M12 5.5v7" />
      <circle cx="12" cy="13.6" r="1.1" />
    </svg>
  )
}

function ShakeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false}>
      <rect x="6" y="7" width="12" height="10" rx="3" />
      <path d="M3 9.5c-.8 1.6-.8 3.4 0 5M21 9.5c.8 1.6.8 3.4 0 5" />
    </svg>
  )
}

export default function Hero() {
  const { ref: sectionRef, everInView, inView } = useSectionVisibility<HTMLElement>('0px')
  const small = useIsSmallViewport()
  const coarse = useIsCoarsePointer()
  const reduced = useReducedMotion()
  const landscape = useLandscape()
  const layout = !small && landscape ? 'side' : 'stacked'
  const lite = small || coarse

  const contentRef = useRef<HTMLDivElement>(null)
  const cueLineRef = useRef<HTMLSpanElement>(null)
  const [announce, setAnnounce] = useState('')

  // Entrance: eyebrow → headline word by word → copy → hint/footer, all on
  // the house expo-out curve, timed to land as the preloader wipes away.
  useLayoutEffect(() => {
    const setRevealAt = useHeroStore.getState().setRevealAt
    if (reduced) {
      setRevealAt(performance.now())
      return
    }
    const delay = Math.max(0.15, REVEAL_AT_S - (performance.now() - MODULE_T0) / 1000)
    setRevealAt(performance.now() + delay * 1000 - 250)

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(contentRef)
      const tl = gsap.timeline({ delay, defaults: { ease: 'expo.out' } })
      tl.from(q('[data-hero=eyebrow]'), { autoAlpha: 0, y: 14, duration: 1 })
        .from(q('[data-word]'), { yPercent: 115, rotate: 2.5, duration: 1.35, stagger: 0.075 }, 0.12)
        .from(q('[data-hero=fade]'), { autoAlpha: 0, y: 18, duration: 1.1, stagger: 0.1 }, 0.62)
        .from('[data-hero=footer]', { autoAlpha: 0, y: 10, duration: 1 }, 0.95)

      // The cue's brass tick travels down its rail, forever but gently.
      if (cueLineRef.current) {
        gsap.fromTo(
          cueLineRef.current,
          { yPercent: -100 },
          { yPercent: 260, duration: 1.9, ease: 'power2.inOut', repeat: -1, repeatDelay: 0.5, delay: delay + 1.6 },
        )
      }
      // Safety net: whatever happens to the timeline, copy is never stuck hidden.
      const fallback = window.setTimeout(() => tl.progress(1), (delay + 4) * 1000)
      return () => window.clearTimeout(fallback)
    }, sectionRef)
    return () => ctx.revert()
  }, [reduced, sectionRef])

  const onCue = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    scrollTo('#colecoes')
  }

  const onShake = () => {
    useHeroStore.getState().toss('all')
    setAnnounce((a) => (a === 'Almofadas sacudidas.' ? 'Almofadas sacudidas novamente.' : 'Almofadas sacudidas.'))
  }

  return (
    <section
      id="hero"
      ref={sectionRef}
      aria-labelledby="hero-titulo"
      className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-linen-100 text-ink-900 md:landscape:h-[100svh] md:landscape:min-h-[620px]"
    >
      {/* Gallery wash: a soft pool of light where the sofa stands. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_55%_at_50%_68%,var(--color-linen-50),transparent_70%)] md:landscape:bg-[radial-gradient(ellipse_52%_62%_at_70%_58%,var(--color-linen-50),transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-b from-transparent to-linen-200/60"
      />

      {/* Copy. In the side layout it floats over a full-bleed canvas, so it
          lets pointer drags through to the sofa except on real controls. */}
      <div
        ref={contentRef}
        className="relative z-10 order-1 mx-auto w-full max-w-[1440px] px-6 pt-28 pb-2 md:px-10 md:pt-32 md:landscape:pointer-events-none md:landscape:flex md:landscape:flex-1 md:landscape:items-center md:landscape:pt-24 md:landscape:pb-24"
      >
        <div className="max-w-[40rem] md:landscape:w-[46%] md:landscape:max-w-none">
          <p data-hero="eyebrow" className="eyebrow flex items-center gap-3 text-clay-600">
            <span aria-hidden className="h-px w-8 bg-brass-400" />
            Móveis autorais — São Paulo
          </p>

          <h1
            id="hero-titulo"
            className="mt-5 font-display text-[2.6rem] leading-[1.02] font-light tracking-[-0.02em] text-ink-900 min-[400px]:text-[2.85rem] md:mt-7 md:text-[4.25rem] md:landscape:text-[clamp(2.75rem,5.2vw,5rem)]"
          >
            {HEADLINE.map((line, li) => (
              <span key={li} className="block whitespace-nowrap">
                {line.words.map((w, wi) => (
                  <span key={wi}>
                    {/* mask: padding keeps descenders (ç, g) and italic overhang unclipped */}
                    <span className="-mb-[0.14em] inline-block overflow-hidden pr-[0.06em] pb-[0.14em] align-bottom">
                      <span
                        data-word
                        className={
                          line.accent
                            ? 'inline-block origin-bottom-left font-normal text-clay-600 italic'
                            : 'inline-block origin-bottom-left'
                        }
                      >
                        {w}
                      </span>
                    </span>
                    {wi < line.words.length - 1 ? ' ' : ''}
                  </span>
                ))}
                {li < HEADLINE.length - 1 ? ' ' : ''}
              </span>
            ))}
          </h1>

          <p data-hero="fade" className="mt-6 max-w-[46ch] text-base text-pretty leading-relaxed text-ink-600 md:mt-8 md:text-lg">
            Desenhamos em São Paulo; artesãos parceiros constroem à mão, em madeira maciça e fibras naturais. Móveis
            feitos sob encomenda para atravessar gerações — e para serem só seus.
          </p>

          <div data-hero="fade" className="relative mt-7 md:mt-9">
            <button
              type="button"
              onClick={onShake}
              className="peer pointer-events-none absolute top-1/2 left-0 inline-flex -translate-y-1/2 translate-x-1 items-center gap-2.5 rounded-full border border-ink-900/15 bg-linen-50 px-4 py-2.5 text-sm font-medium whitespace-nowrap text-ink-900 opacity-0 shadow-[0_6px_24px_-12px_var(--color-ink-900)] transition-[opacity,translate,background-color] duration-200 ease-aaa hover:bg-linen-200 focus-visible:pointer-events-auto focus-visible:translate-x-0 focus-visible:opacity-100"
            >
              <ShakeIcon />
              Sacudir as almofadas do sofá
            </button>
            <p className="flex items-center gap-3 text-sm text-ink-600 transition-opacity duration-200 ease-aaa peer-focus-visible:opacity-0">
              <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full border border-ink-900/15 text-ink-700">
                <OrbitIcon />
              </span>
              {coarse ? 'Deslize para girar · toque nas almofadas' : 'Arraste para girar · clique nas almofadas'}
            </p>
            <p className="sr-only" aria-live="polite">
              {announce}
            </p>
          </div>
        </div>
      </div>

      {/* The sofa. Stacked layouts give it its own band under the copy, so
          they can never collide; the side layout runs it full-bleed. */}
      <div
        role="img"
        aria-label="Sofá de dois lugares SALABELLA em 3D: linho cru, base em imbuia com pés de latão e duas almofadas, terracota e musgo."
        className="relative order-2 min-h-[300px] flex-1 md:min-h-[420px] md:landscape:absolute md:landscape:inset-0 md:landscape:min-h-0"
      >
        {everInView && (
          <Suspense fallback={null}>
            <HeroScene active={inView} layout={layout} reduced={reduced} lite={lite} />
          </Suspense>
        )}
      </div>

      <div
        data-hero="footer"
        className="relative z-10 order-3 mx-auto flex w-full max-w-[1440px] items-end justify-between gap-6 px-6 pt-2 pb-6 md:px-10 md:pb-8 md:landscape:pointer-events-none md:landscape:absolute md:landscape:inset-x-0 md:landscape:bottom-0"
      >
        <a
          href="#colecoes"
          onClick={onCue}
          className="group pointer-events-auto inline-flex items-center gap-3 py-2 text-ink-700 transition-colors duration-200 hover:text-clay-600"
        >
          <span aria-hidden className="relative block h-9 w-px overflow-hidden bg-ink-900/15">
            <span ref={cueLineRef} className="absolute inset-x-0 top-0 block h-1/3 bg-clay-500" />
          </span>
          <span className="eyebrow">Ver coleções</span>
        </a>
        <p className="hidden text-right text-xs leading-relaxed text-ink-600 sm:block">
          <span className="font-display text-sm text-ink-900 italic">Sofá Lapa</span>
          <span className="mx-2 text-brass-500" aria-hidden>
            ·
          </span>
          linho cru, imbuia maciça e latão
        </p>
      </div>
    </section>
  )
}
