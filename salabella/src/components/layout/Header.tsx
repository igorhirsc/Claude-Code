import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { scrollTo } from '@/hooks/useLenis'
import { useMagnetic } from '@/hooks/useMagnetic'
import { WHATSAPP_URL, ADDRESS_LINES, HOURS_LINES } from '@/data/storeLocator'
import { ArrowUpRightIcon, CloseIcon, MenuIcon, WhatsAppIcon } from '@/components/ui/icons'

const LINKS = [
  { label: 'Coleções', to: '/colecoes' },
  { label: 'Ateliê', to: '/sobre' },
  { label: 'Contato', to: '/contato' },
]

const MENU_ID = 'menu-mobile'

type Tone = 'light' | 'dark'

/** Vertical probe (px from the top of the viewport) — the middle of the header bar. */
const PROBE_Y = 40

/**
 * Tone of the page section under the header bar, read from the nearest
 * `[data-header="light|dark"]` element (every top-level section and the
 * footer carries one). Light = cream background, dark = ink background.
 */
function toneUnderHeader(): Tone {
  const marked = document.querySelectorAll<HTMLElement>('[data-header]')
  let tone: Tone = 'light'
  marked.forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.top <= PROBE_Y && r.bottom > PROBE_Y) tone = el.dataset.header === 'dark' ? 'dark' : 'light'
  })
  return tone
}

export function Header({ inert }: { inert?: boolean }) {
  const [solid, setSolid] = useState(false)
  const [tone, setTone] = useState<Tone>('light')
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const ctaRef = useMagnetic<HTMLAnchorElement>({ strength: 0.28, max: 10 })

  // Scrolled state + the tone of whatever section sits under the bar. Checked
  // on scroll/resize (rAF-throttled) and again after every route change, once
  // the new page has mounted and the scroll position has been reset.
  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      setSolid(window.scrollY > 40)
      setTone(toneUnderHeader())
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    const late = window.setTimeout(measure, 120)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(late)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [location.pathname])

  // Re-measure synchronously after a route change, before the browser paints:
  // the passive effect above runs after first paint, which left two frames of
  // the previous page's tone (linen text over a linen hero, ~1:1). ScrollToTop
  // is mounted before Header, so its layout effect has already reset scroll.
  useLayoutEffect(() => {
    setSolid(window.scrollY > 40)
    setTone(toneUnderHeader())
  }, [location.pathname, location.hash])

  // Layout can shift without a scroll (lazy 3D mounts, reveals changing
  // heights), which would leave the tone stale until the next scroll.
  useEffect(() => {
    let raf = 0
    const ro = new ResizeObserver(() => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0
          setTone(toneUnderHeader())
        })
    })
    ro.observe(document.body)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  // Any navigation closes the menu (adjust-state-during-render pattern).
  const routeKey = location.pathname + location.search + location.hash
  const [lastRoute, setLastRoute] = useState(routeKey)
  if (lastRoute !== routeKey) {
    setLastRoute(routeKey)
    setOpen(false)
  }

  // Opening past the md: breakpoint (e.g. rotating a tablet) makes no sense.
  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => mq.matches && setOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [open])

  // Scroll lock + Escape while open. Lenis drives scroll from window wheel /
  // touch listeners, so overflow:hidden alone is not enough — swallow those
  // events in the capture phase before Lenis sees them.
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const body = document.body
    const prev = { html: html.style.overflow, body: body.style.overflow }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    const block = (e: Event) => {
      e.stopPropagation()
      if (!panelRef.current?.contains(e.target as Node)) e.preventDefault()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    window.addEventListener('wheel', block, { capture: true, passive: false })
    window.addEventListener('touchmove', block, { capture: true, passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      html.style.overflow = prev.html
      body.style.overflow = prev.body
      window.removeEventListener('wheel', block, { capture: true })
      window.removeEventListener('touchmove', block, { capture: true })
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Light text over ink sections and the open menu; ink text over cream.
  const onDark = open || tone === 'dark'

  // When the tone flips, colours snap: hover transitions are suspended for
  // two frames so text never fades across a bar that already changed.
  const headerRef = useRef<HTMLElement>(null)
  const firstTone = useRef(true)
  useLayoutEffect(() => {
    if (firstTone.current) {
      firstTone.current = false
      return
    }
    const el = headerRef.current
    if (!el) return
    el.setAttribute('data-switching', '')
    let r2 = 0
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => el.removeAttribute('data-switching'))
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
      el.removeAttribute('data-switching')
    }
  }, [onDark, solid])

  return (
    <header
      ref={headerRef}
      inert={inert}
      data-tone={open ? 'menu' : tone}
      data-solid={solid || undefined}
      className={clsx(
        // No background transition: text colour and bar colour must switch in
        // the same frame, or a lagging crossfade (e.g. while a 3D section is
        // busy) briefly puts linen text on a linen bar.
        'fixed inset-x-0 top-0 z-50 [&[data-switching]_*]:!transition-none',
        // Unscrolled: fully transparent, text tone follows the hero under it.
        // Scrolled: a translucent bar in the same family as the section below
        // (linen over cream, ink over ink), so it never turns grey.
        open
          ? 'bg-ink-900'
          : !solid
            ? 'bg-transparent'
            : tone === 'dark'
              ? 'bg-ink-900/85 shadow-[0_1px_0_0_color-mix(in_oklab,var(--color-linen-50)_10%,transparent)] backdrop-blur-md'
              : 'bg-linen-50/90 shadow-[0_1px_0_0_var(--color-linen-300)] backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-5 md:px-10">
        <NavLink
          to="/"
          className={clsx(
            'font-display text-xl tracking-[0.14em]',
            onDark ? 'text-linen-50' : 'text-ink-900',
          )}
          onClick={(e) => {
            if (window.location.pathname === '/') {
              e.preventDefault()
              setOpen(false)
              scrollTo(0)
            }
          }}
        >
          SALABELLA
        </NavLink>

        <nav aria-label="Principal" className="hidden items-center gap-7 md:flex lg:gap-10">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                clsx(
                  'group eyebrow relative py-1.5 transition-colors duration-200',
                  onDark
                    ? isActive
                      ? 'text-linen-50'
                      : 'text-linen-50/85 hover:text-linen-50'
                    : isActive
                      ? 'text-ink-900'
                      : 'text-ink-900/75 hover:text-ink-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {l.label}
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'absolute inset-x-0 bottom-0 h-px transition-transform duration-500 ease-aaa',
                      onDark ? 'bg-brass-400' : 'bg-brass-500',
                      isActive
                        ? 'scale-x-100'
                        : 'origin-right scale-x-0 group-hover:origin-left group-hover:scale-x-100 group-focus-visible:origin-left group-focus-visible:scale-x-100',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            ref={ctaRef}
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className={clsx(
              'eyebrow hidden items-center gap-2 rounded-full border px-5 py-2.5 whitespace-nowrap transition-colors duration-200 sm:inline-flex md:max-lg:size-10 md:max-lg:justify-center md:max-lg:px-0',
              onDark
                ? 'border-linen-50/70 text-linen-50 hover:border-brass-300 hover:bg-brass-300 hover:text-ink-900'
                : 'border-brass-400 text-ink-900 hover:border-ink-900 hover:bg-ink-900 hover:text-linen-50',
            )}
          >
            <WhatsAppIcon size={15} />
            <span className="md:max-lg:sr-only">Fale conosco</span>
          </a>

          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={MENU_ID}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((v) => !v)}
            className={clsx(
              '-mr-2 inline-flex size-11 items-center justify-center rounded-full transition-colors duration-200 md:hidden',
              onDark ? 'text-linen-50 hover:bg-linen-50/10' : 'text-ink-900 hover:bg-ink-900/5',
            )}
          >
            {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>

      <div
        id={MENU_ID}
        ref={panelRef}
        inert={!open}
        className={clsx(
          'grid transition-[grid-template-rows] duration-500 ease-aaa md:hidden',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <nav
            aria-label="Menu"
            className="mx-auto flex h-[calc(100svh-84px)] max-w-[1440px] flex-col px-6 pt-6 pb-10 text-linen-50"
          >
            <div className="rule-brass mb-6 opacity-60" />
            <ul className="space-y-1">
              {LINKS.map((l, i) => (
                <li
                  key={l.to}
                  style={{ transitionDelay: open ? `${120 + i * 70}ms` : '0ms' }}
                  className={clsx(
                    'transition-[opacity,translate] duration-500 ease-aaa',
                    open ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
                  )}
                >
                  <NavLink
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-baseline gap-4 py-3 font-display text-4xl leading-none transition-colors duration-200',
                        isActive ? 'text-brass-300' : 'text-linen-50 hover:text-brass-200',
                      )
                    }
                  >
                    <span className="w-6 font-sans text-xs tracking-[0.2em] text-linen-50/60">0{i + 1}</span>
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div
              style={{ transitionDelay: open ? '360ms' : '0ms' }}
              className={clsx(
                'mt-auto space-y-6 transition-opacity duration-500 ease-aaa',
                open ? 'opacity-100' : 'opacity-0',
              )}
            >
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="eyebrow inline-flex w-full items-center justify-between rounded-full bg-brass-300 px-6 py-4 text-ink-900 transition-colors duration-200 hover:bg-brass-200"
              >
                <span className="inline-flex items-center gap-2.5">
                  <WhatsAppIcon size={16} />
                  Fale com o ateliê
                </span>
                <ArrowUpRightIcon size={16} />
              </a>
              <div className="text-sm leading-relaxed text-linen-50/70">
                <p>{ADDRESS_LINES[0]}</p>
                <p>{HOURS_LINES[0]}</p>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
