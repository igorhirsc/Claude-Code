import { lazy, Suspense, useLayoutEffect, useRef, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CATEGORIES } from '@/data/categories'
import { useCollectionsStore } from '@/three/collections/store'
import { useIsSmallViewport, useReducedMotion, useSectionVisibility } from '@/hooks/useMediaFlags'

gsap.registerPlugin(ScrollTrigger)

const CollectionsScene = lazy(() => import('@/three/collections/CollectionsScene'))

function Arrow() {
  return (
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
    >
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  )
}

export default function Collections() {
  const { ref: sectionRef, everInView, inView } = useSectionVisibility<HTMLElement>('300px')
  const small = useIsSmallViewport()
  const reduced = useReducedMotion()
  const headRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLUListElement>(null)

  const setHovered = useCollectionsStore((s) => s.setHovered)
  const setFocused = useCollectionsStore((s) => s.setFocused)
  const setPointer = useCollectionsStore((s) => s.setPointer)

  const onPointerMove = (e: PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPointer(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1)
  }

  // Staggered entrance. DOM cards and their 3D icons share one stagger so
  // each object unveils inside its own frame as the card arrives.
  useLayoutEffect(() => {
    const reveal = useCollectionsStore.getState().reveal
    const ids = CATEGORIES.map((c) => c.id)
    if (reduced) {
      ids.forEach((id) => (reveal[id] = 1))
      return
    }
    ids.forEach((id) => (reveal[id] = 0))

    const ctx = gsap.context(() => {
      const head = headRef.current ? Array.from(headRef.current.querySelectorAll('[data-reveal]')) : []
      const cards = gridRef.current ? (Array.from(gridRef.current.children) as HTMLElement[]) : []
      const done = new Set<number>()

      gsap.set(head, { autoAlpha: 0, y: 28 })
      gsap.set(cards, { autoAlpha: 0, y: 44 })

      ScrollTrigger.create({
        trigger: headRef.current,
        start: 'top 82%',
        once: true,
        onEnter: () => gsap.to(head, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09 }),
      })

      const revealCards = (batch: HTMLElement[]) => {
        const fresh = batch.filter((el) => !done.has(cards.indexOf(el)))
        fresh.forEach((el) => done.add(cards.indexOf(el)))
        if (!fresh.length) return
        gsap.to(fresh, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, clearProps: 'transform' })
        fresh.forEach((el, i) => {
          const id = ids[cards.indexOf(el)]
          const proxy = { v: reveal[id] }
          gsap.to(proxy, {
            v: 1,
            duration: 1.4,
            delay: 0.1 + i * 0.09,
            ease: 'expo.out',
            onUpdate: () => (reveal[id] = proxy.v),
          })
        })
      }

      ScrollTrigger.batch(cards, { start: 'top 88%', once: true, onEnter: (b) => revealCards(b as HTMLElement[]) })

      // Safety net: never leave content stuck invisible if a trigger misses
      // (e.g. layout shifts above before ScrollTrigger refreshes).
      const fallback = window.setTimeout(() => {
        const vh = window.innerHeight
        if (headRef.current && headRef.current.getBoundingClientRect().top < vh) gsap.to(head, { autoAlpha: 1, y: 0, duration: 0.6 })
        revealCards(cards.filter((el) => el.getBoundingClientRect().top < vh))
      }, 2500)
      return () => window.clearTimeout(fallback)
    }, sectionRef)

    return () => {
      ctx.revert()
      ids.forEach((id) => (reveal[id] = 1))
    }
  }, [reduced, sectionRef])

  return (
    <section
      id="colecoes"
      ref={sectionRef}
      aria-labelledby="colecoes-titulo"
      className="grain relative overflow-hidden bg-ink-900 text-linen-100"
    >
      <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-32 lg:py-40">
        <div ref={headRef} className="grid gap-8 md:grid-cols-12 md:items-end md:gap-10">
          <div className="md:col-span-7">
            <p data-reveal className="eyebrow text-brass-400">
              Coleções
            </p>
            <h2
              id="colecoes-titulo"
              data-reveal
              className="mt-5 font-display text-[2.5rem] leading-[1.04] font-light tracking-[-0.015em] text-balance text-linen-50 md:text-5xl lg:text-6xl xl:text-7xl"
            >
              Uma peça autoral para <em className="font-normal whitespace-nowrap text-brass-300 italic">cada canto</em> da casa.
            </h2>
          </div>
          <div className="md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9">
            <p data-reveal className="max-w-[52ch] text-base leading-relaxed text-linen-300">
              Do sofá de linhas baixas à luminária de latão, cada peça é desenhada em São Paulo e feita à mão por
              artesãos parceiros — sob encomenda, no tecido e na madeira que você escolher.
            </p>
            <Link
              data-reveal
              to="/colecoes"
              className="group mt-6 inline-flex items-center gap-2 border-b border-brass-400/60 pb-1 text-sm font-medium text-linen-50 transition-colors duration-200 hover:border-brass-300 hover:text-brass-200"
            >
              Ver o catálogo completo
              <span className="transition-transform duration-200 ease-aaa group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <Arrow />
              </span>
            </Link>
          </div>
        </div>

        <div className="relative mt-14 md:mt-20">
          {/* Shared WebGL layer behind the grid. Its icon positions are computed
              from the same cols/gap/aspect as the classes on the <ul> below. */}
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
            {everInView && (
              <Suspense fallback={null}>
                <CollectionsScene active={inView} small={small} reduced={reduced} />
              </Suspense>
            )}
          </div>

          <ul ref={gridRef} className="relative z-[1] grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
            {CATEGORIES.map((c, i) => (
              <li key={c.id} className="aspect-[4/5]">
                <Link
                  to={`/colecoes?categoria=${c.id}`}
                  aria-label={`Ver ${c.label.toLowerCase()} no catálogo`}
                  onPointerEnter={() => setHovered(c.id)}
                  onPointerMove={onPointerMove}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setFocused(c.id)}
                  onBlur={() => setFocused(null)}
                  className="group relative flex h-full flex-col justify-end border border-ink-700 p-4 transition-[translate,border-color] duration-[220ms] ease-aaa hover:-translate-y-1.5 hover:border-brass-500 focus-visible:-translate-y-1.5 focus-visible:border-brass-500 md:p-6"
                >
                  <span aria-hidden className="eyebrow absolute top-4 left-4 text-brass-400 tabular-nums md:top-6 md:left-6">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-xl leading-tight text-linen-50 md:text-2xl lg:text-[1.75rem]">
                      {c.label}
                    </h3>
                    <span className="text-brass-300 opacity-70 transition-[opacity,translate] duration-[220ms] ease-aaa group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Arrow />
                    </span>
                  </div>
                  <span
                    aria-hidden
                    className="mt-3 block h-px w-full origin-left scale-x-0 bg-brass-400 transition-transform duration-[250ms] ease-aaa group-hover:scale-x-100 group-focus-visible:scale-x-100"
                  />
                  <p className="mt-3 hidden max-w-[34ch] text-sm leading-relaxed text-linen-300 lg:block">{c.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
