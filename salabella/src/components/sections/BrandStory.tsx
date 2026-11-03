import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion, useSectionVisibility } from '@/hooks/useMediaFlags'
import { ArrowUpRightIcon } from '@/components/ui/icons'

gsap.registerPlugin(ScrollTrigger)

const WoodVignette = lazy(() => import('@/three/story/WoodVignette'))

/* ------------------------------------------------------------------ data */

const PROCESS = [
  {
    title: 'Design',
    body: 'Cada peça começa no estúdio, em croqui e depois em escala real. Ajustamos proporção, altura de assento e caimento até que o conforto e o desenho digam a mesma coisa.',
  },
  {
    title: 'Seleção de materiais',
    body: 'Freijó, cumaru e carvalho de manejo certificado, secos ao ar por meses; tecidos naturais de tecelagens brasileiras. A escolha é feita tábua por tábua, rolo por rolo.',
  },
  {
    title: 'Manufatura',
    body: 'Nos ateliês parceiros, a madeira é cortada, torneada e encaixada à mão, com espiga e cavilha. Os estofados são montados sobre cintas elásticas, sem atalhos.',
  },
  {
    title: 'Acabamento',
    body: 'Lixamento progressivo, óleo natural e cera de abelha — ou laca fosca, quando o projeto pede. Cada peça é revisada e assinada antes de seguir para a sua casa.',
  },
] as const

/* ------------------------------------------------------------- vignette */

/** Pulsing ring silhouette that holds the frame until the shader is ready. */
function VignetteSkeleton({ hidden }: { hidden: boolean }) {
  return (
    <div
      aria-hidden
      className={clsx(
        'pointer-events-none absolute inset-0 z-[1] grid place-items-center bg-ink-800 transition-opacity duration-700 ease-aaa',
        hidden && 'opacity-0',
      )}
    >
      <div className="relative flex w-[58%] flex-col items-center">
        <div className="aspect-[2.3/1] w-full animate-pulse rounded-[50%] border-[18px] border-ink-700 md:border-[26px]" />
        <div className="-mt-3 h-3 w-[96%] rounded-[50%] bg-ink-900/60 blur-[6px]" />
        <p className="eyebrow mt-8 text-[0.6875rem] text-linen-300">Torneando o estudo</p>
      </div>
    </div>
  )
}

type VignetteFrameProps = {
  caption: string
  detail?: string
  className?: string
  /** Aspect classes for the canvas box. */
  aspect?: string
}

/**
 * Framed, lazily mounted WoodVignette with spec-sheet corner ticks and a
 * caption. Mounts its canvas only near the viewport; renders every frame
 * only while visible (frameloop "demand" otherwise).
 */
export function VignetteFrame({ caption, detail, className, aspect = 'aspect-[5/4]' }: VignetteFrameProps) {
  const { ref, everInView, inView } = useSectionVisibility<HTMLElement>('300px')
  const reduced = useReducedMotion()
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])

  return (
    <figure ref={ref} className={className}>
      <div className={clsx('relative w-full overflow-hidden border border-ink-700 bg-ink-800', aspect)}>
        {everInView && (
          <Suspense fallback={null}>
            <WoodVignette active={inView} reduced={reduced} onReady={onReady} />
          </Suspense>
        )}
        <VignetteSkeleton hidden={ready} />
        {['top-3 left-3 border-t border-l', 'top-3 right-3 border-t border-r', 'bottom-3 left-3 border-b border-l', 'bottom-3 right-3 border-b border-r'].map(
          (c) => (
            <span key={c} aria-hidden className={clsx('pointer-events-none absolute z-[2] size-4 border-brass-500/80', c)} />
          ),
        )}
      </div>
      <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <span className="font-display text-base text-current italic md:text-lg">{caption}</span>
        {detail && <span className="eyebrow text-[0.6875rem] opacity-90">{detail}</span>}
      </figcaption>
    </figure>
  )
}

/* -------------------------------------------------------------- section */

export default function BrandStory() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  // Copy rises line by line, the frame settles, then the process strip
  // staggers in with its brass rules drawing left to right.
  useEffect(() => {
    const root = sectionRef.current
    if (!root || reduced) return
    const timers: number[] = []
    let io: IntersectionObserver | null = null

    const ctx = gsap.context(() => {
      const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out', duration: 1.2 } })
      intro
        .from('[data-reveal-line]', { yPercent: 110, stagger: 0.08, duration: 1.3 })
        .from('[data-reveal]', { y: 24, autoAlpha: 0, stagger: 0.08 }, 0.2)
        .from('[data-reveal-frame]', { y: 40, autoAlpha: 0, scale: 0.98, duration: 1.5 }, 0.1)

      const steps = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
      steps
        .from('[data-step-rule]', { scaleX: 0, transformOrigin: 'left center', duration: 1.2, stagger: 0.12 })
        .from('[data-step]', { y: 28, autoAlpha: 0, duration: 1.1, stagger: 0.12 }, 0.1)

      const play = (tl: gsap.core.Timeline) => () => {
        if (tl.progress() === 0 && !tl.isActive()) tl.play()
      }
      const playIntro = play(intro)
      const playSteps = play(steps)

      ScrollTrigger.create({ trigger: '[data-intro]', start: 'top 75%', once: true, onEnter: playIntro })
      ScrollTrigger.create({ trigger: '[data-steps]', start: 'top 85%', once: true, onEnter: playSteps })

      // Safety net: if ScrollTrigger mis-measures (layout shifts from the
      // lazy canvases above), real viewport entry still plays each timeline.
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          const fn = (e.target as HTMLElement).dataset.steps !== undefined ? playSteps : playIntro
          timers.push(window.setTimeout(fn, 700))
        })
      })
      root.querySelectorAll('[data-intro], [data-steps]').forEach((el) => io?.observe(el))
    }, root)

    return () => {
      io?.disconnect()
      timers.forEach((t) => window.clearTimeout(t))
      ctx.revert()
    }
  }, [reduced])

  return (
    <section
      id="atelier"
      ref={sectionRef}
      aria-labelledby="atelier-titulo"
      className="grain relative overflow-hidden bg-ink-900 text-linen-100"
    >
      <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-32 lg:py-40">
        <div data-intro className="grid gap-14 md:grid-cols-12 md:items-center md:gap-10 lg:gap-16">
          {/* --------------------------------------------------- copy -- */}
          <div className="md:col-span-6 lg:col-span-5">
            <p data-reveal className="eyebrow flex items-center gap-3 text-brass-400">
              <span aria-hidden className="h-px w-8 bg-brass-400" />
              O ateliê
            </p>
            <h2
              id="atelier-titulo"
              className="mt-6 font-display text-[2.375rem] leading-[1.04] font-light tracking-[-0.02em] text-linen-50 md:text-5xl lg:text-6xl"
            >
              <span className="block overflow-hidden pb-[0.08em]">
                <span data-reveal-line className="block">
                  Móveis que
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.1em]">
                <span data-reveal-line className="block">
                  carregam <em className="font-normal text-brass-300 italic">o gesto</em>
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.1em]">
                <span data-reveal-line className="block">
                  de quem os fez.
                </span>
              </span>
            </h2>
            <p data-reveal className="mt-8 max-w-[52ch] text-base leading-relaxed text-linen-300 md:text-[1.0625rem]">
              Cada peça Salabella nasce de um desenho nosso e termina nas mãos de um artesão parceiro — marceneiros,
              tapeceiros e torneiros que trabalham em pequenas oficinas de São Paulo e do interior. Não há linha de
              montagem: há bancadas, nomes e sobrenomes.
            </p>
            <p data-reveal className="mt-5 max-w-[52ch] text-base leading-relaxed text-linen-300 md:text-[1.0625rem]">
              Por isso nenhuma poltrona sai exatamente igual à outra. A curva de um braço, o veio que corre pelo tampo, o
              ponto feito à mão: são marcas de autoria, e é delas que a peça tira o seu valor ao longo dos anos.
            </p>
            <Link
              data-reveal
              to="/sobre"
              className="group mt-9 inline-flex items-center gap-2 border-b border-brass-400/60 pb-1 text-sm font-medium text-linen-50 transition-colors duration-200 hover:border-brass-300 hover:text-brass-200"
            >
              Conheça o ateliê
              <span className="transition-transform duration-200 ease-aaa group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRightIcon size={18} />
              </span>
            </Link>
          </div>

          {/* ----------------------------------------------- vignette -- */}
          <div data-reveal-frame className="md:col-span-6 lg:col-span-6 lg:col-start-7">
            <VignetteFrame
              caption="Estudo de veio, torneado à mão"
              detail="Freijó maciço · Ø 34 cm"
              className="text-linen-200"
            />
          </div>
        </div>

        {/* ------------------------------------------------- process -- */}
        <div data-steps className="mt-24 md:mt-32">
          <h3 className="eyebrow text-brass-400">Do croqui à sua casa</h3>
          <ol className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-10">
            {PROCESS.map((step, i) => (
              <li key={step.title} className="relative pt-8">
                <span data-step-rule aria-hidden className="absolute inset-x-0 top-0 block h-px bg-brass-500/70" />
                <div data-step>
                  <p className="font-display text-4xl leading-none font-light text-brass-300 tabular-nums md:text-5xl" aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h4 className="mt-5 font-display text-2xl leading-tight text-linen-50">
                    <span className="sr-only">Etapa {i + 1}: </span>
                    {step.title}
                  </h4>
                  <p className="mt-3 max-w-[42ch] text-[0.9375rem] leading-relaxed text-linen-300">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
