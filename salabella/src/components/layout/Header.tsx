import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { scrollTo } from '@/hooks/useLenis'
import { WHATSAPP_URL } from '@/data/storeLocator'

const LINKS = [
  { label: 'Coleções', to: '/colecoes' },
  { label: 'Atelier', to: '/sobre' },
  { label: 'Contato', to: '/contato' },
]

export function Header() {
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={clsx(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-500',
        // Unscrolled: a flat ink scrim keeps light text >= ~6.9:1 over any
        // hero, light or dark. A fading gradient dropped to ~1.5:1 at the
        // nav row over the light Home hero.
        solid
          ? 'bg-linen-50/90 shadow-[0_1px_0_0_var(--color-linen-300)] backdrop-blur-md'
          : 'bg-ink-900/70 backdrop-blur-sm',
      )}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 md:px-10">
        <NavLink
          to="/"
          className={clsx('font-display text-xl tracking-[0.14em]', solid ? 'text-ink-900' : 'text-linen-50')}
          onClick={(e) => {
            if (window.location.pathname === '/') {
              e.preventDefault()
              scrollTo(0)
            }
          }}
        >
          SALABELLA
        </NavLink>

        <nav className="hidden items-center gap-10 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                clsx(
                  'eyebrow py-1 transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-75 hover:opacity-100',
                  solid ? 'text-ink-900' : 'text-linen-50',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className={clsx(
            'eyebrow rounded-full border px-5 py-2.5 transition-colors',
            solid ? 'border-brass-400 text-ink-900' : 'border-linen-50/70 text-linen-50',
          )}
        >
          Fale conosco
        </a>
      </div>
    </header>
  )
}
