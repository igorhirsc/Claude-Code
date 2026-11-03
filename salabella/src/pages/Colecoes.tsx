import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import gsap from 'gsap'
import { CATEGORIES, type CategoryId } from '@/data/categories'
import { PRODUCTS, productById } from '@/data/products'
import { useReducedMotion } from '@/hooks/useMediaFlags'
import { ProductCard } from '@/components/catalog/ProductCard'
import { QuickView } from '@/components/catalog/QuickView'

const isCategory = (v: string | null): v is CategoryId => !!v && CATEGORIES.some((c) => c.id === v)

const pecas = (n: number) => (n === 1 ? '1 peça' : `${n} peças`)

export default function Colecoes() {
  const [params, setParams] = useSearchParams()
  const reduced = useReducedMotion()
  const raw = params.get('categoria')
  const active: CategoryId | null = isCategory(raw) ? raw : null
  const activeCategory = CATEGORIES.find((c) => c.id === active)
  const openProduct = productById(params.get('peca'))

  const [saved, setSaved] = useState<Set<string>>(() => new Set())
  const toggleSave = useCallback(
    (id: string) =>
      setSaved((s) => {
        const next = new Set(s)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    [],
  )

  const products = useMemo(() => (active ? PRODUCTS.filter((p) => p.category === active) : PRODUCTS), [active])
  const counts = useMemo(() => {
    const m = new Map<CategoryId, number>()
    PRODUCTS.forEach((p) => m.set(p.category, (m.get(p.category) ?? 0) + 1))
    return m
  }, [])

  /** URL is the source of truth: chips and the quick view only write to it. */
  const setCategory = (id: CategoryId | null) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id) next.set('categoria', id)
        else next.delete('categoria')
        next.delete('peca')
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }
  const lastTrigger = useRef<HTMLElement | null>(null)
  const openQuickView = (id: string, trigger: HTMLElement) => {
    lastTrigger.current = trigger
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('peca', id)
        return next
      },
      { preventScrollReset: true },
    )
  }
  const closeQuickView = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('peca')
        return next
      },
      { replace: true, preventScrollReset: true },
    )
    // Return focus to the card that opened it (or its title, after a deep link).
    const id = params.get('peca')
    requestAnimationFrame(() => {
      const el = lastTrigger.current?.isConnected ? lastTrigger.current : document.querySelector<HTMLElement>(`#produto-${id} button`)
      el?.focus({ preventScroll: true })
    })
  }, [params, setParams])

  /* ---------------------------------------------------- choreography -- */

  const headRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLUListElement>(null)

  useLayoutEffect(() => {
    if (reduced || !headRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-reveal-line]', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.09, delay: 0.1 })
      gsap.from('[data-reveal]', { y: 22, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07, delay: 0.3 })
    }, headRef)
    return () => ctx.revert()
  }, [reduced])

  // Staggered re-reveal whenever the filter changes (and on first paint).
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const cards = Array.from(grid.children) as HTMLElement[]
    if (reduced) {
      gsap.set(cards, { autoAlpha: 1, y: 0 })
      return
    }
    const tween = gsap.fromTo(
      cards,
      { autoAlpha: 0, y: 36 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        ease: 'expo.out',
        stagger: { each: 0.07, from: 'start' },
        delay: 0.05,
        clearProps: 'transform',
      },
    )
    // Safety net: never leave a card stuck invisible (e.g. a throttled tab).
    const t = window.setTimeout(() => gsap.set(cards, { autoAlpha: 1, y: 0 }), 2600)
    return () => {
      window.clearTimeout(t)
      tween.kill()
    }
  }, [active, reduced])

  // Keep the document title honest about the filtered view.
  useEffect(() => {
    const prev = document.title
    document.title = activeCategory ? `${activeCategory.label} · Coleções · SALABELLA` : 'Coleções · SALABELLA'
    return () => {
      document.title = prev
    }
  }, [activeCategory])

  return (
    <>
      <section ref={headRef} data-header="light" aria-labelledby="colecoes-pagina-titulo" className="bg-linen-100 text-ink-900">
        <div className="mx-auto max-w-[1440px] px-6 pt-36 pb-12 md:px-10 md:pt-44 md:pb-16">
          <div className="grid gap-8 md:grid-cols-12 md:items-end md:gap-10">
            <div className="md:col-span-8 lg:col-span-7">
              <p data-reveal className="eyebrow flex items-center gap-3 text-clay-600">
                <span aria-hidden className="h-px w-8 bg-brass-400" />
                Catálogo · {pecas(PRODUCTS.length)} autorais
              </p>
              <h1
                id="colecoes-pagina-titulo"
                className="mt-7 font-display text-[2.875rem] leading-[1] font-light tracking-[-0.025em] md:text-7xl xl:text-[5.5rem]"
              >
                <span className="block overflow-hidden pb-[0.1em]">
                  <span data-reveal-line className="block">
                    Feitas à mão,
                  </span>
                </span>
                <span className="block overflow-hidden pb-[0.12em]">
                  <span data-reveal-line className="block text-clay-600 italic">
                    uma a uma.
                  </span>
                </span>
              </h1>
            </div>
            <p data-reveal className="max-w-[52ch] text-base leading-relaxed text-ink-700 md:col-span-4 md:col-start-9 lg:col-span-4 lg:col-start-9">
              Cada peça é desenhada no nosso estúdio em São Paulo e produzida por artesãos parceiros — marceneiros,
              estofadores, ceramistas e vidreiros — no tecido, na madeira e na medida da sua casa.
            </p>
          </div>
        </div>
      </section>

      <section data-header="light" aria-label="Peças do catálogo" className="bg-linen-100 text-ink-900">
        <div className="mx-auto max-w-[1440px] px-6 pb-24 md:px-10 md:pb-32">
          <div className="rule-brass" />

          {/* filters */}
          <div className="flex flex-col gap-5 py-7 lg:flex-row lg:items-center lg:justify-between">
            <div role="group" aria-label="Filtrar por categoria" className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
                {[{ id: null, label: 'Todos', n: PRODUCTS.length }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, n: counts.get(c.id) ?? 0 }))].map(
                  (chip) => {
                    const pressed = chip.id === active
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => setCategory(chip.id)}
                        className={clsx(
                          'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-[background-color,border-color,color] duration-200 ease-aaa',
                          pressed
                            ? 'border-ink-900 bg-ink-900 text-linen-50'
                            : 'border-ink-900/20 text-ink-800 hover:border-brass-500 hover:text-ink-900',
                        )}
                      >
                        {pressed && <span aria-hidden className="size-1.5 rounded-full bg-brass-300" />}
                        {chip.label}
                        <span className={clsx('tabular-nums text-xs', pressed ? 'text-brass-200' : 'text-ink-600')}>{chip.n}</span>
                      </button>
                    )
                  },
                )}
              </div>
            </div>
            <p aria-live="polite" className="text-sm text-ink-600 lg:text-right">
              Mostrando <span className="font-medium text-ink-900 tabular-nums">{pecas(products.length)}</span>
              {activeCategory ? (
                <>
                  {' '}
                  em <span className="font-medium text-ink-900">{activeCategory.label}</span>
                </>
              ) : (
                ' de todas as coleções'
              )}
            </p>
          </div>

          {activeCategory && (
            <p key={`desc-${activeCategory.id}`} className="-mt-1 mb-8 max-w-[60ch] font-display text-xl leading-snug text-ink-800 italic md:text-2xl">
              {activeCategory.description}
            </p>
          )}

          <ul ref={gridRef} key={`grid-${active ?? 'todos'}`} className="grid grid-cols-1 gap-x-6 gap-y-14 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  saved={saved.has(p.id)}
                  onToggleSave={() => toggleSave(p.id)}
                  onOpen={(el) => openQuickView(p.id, el)}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {openProduct && (
        <QuickView
          key={openProduct.id}
          product={openProduct}
          saved={saved.has(openProduct.id)}
          onToggleSave={() => toggleSave(openProduct.id)}
          onClose={closeQuickView}
        />
      )}
    </>
  )
}
