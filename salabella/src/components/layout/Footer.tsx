import { NavLink } from 'react-router-dom'
import { WHATSAPP_URL, INSTAGRAM_URL, PINTEREST_URL } from '@/data/storeLocator'

const SITEMAP = [
  {
    heading: 'Coleções',
    links: [
      { label: 'Sofás', to: '/colecoes?categoria=sofas' },
      { label: 'Poltronas', to: '/colecoes?categoria=poltronas' },
      { label: 'Mesas', to: '/colecoes?categoria=mesas' },
      { label: 'Estantes', to: '/colecoes?categoria=estantes' },
      { label: 'Iluminação', to: '/colecoes?categoria=iluminacao' },
      { label: 'Decoração', to: '/colecoes?categoria=decoracao' },
    ],
  },
  {
    heading: 'Atelier',
    links: [
      { label: 'Nossa história', to: '/sobre' },
      { label: 'Processo', to: '/sobre' },
      { label: 'Materiais', to: '/sobre' },
      { label: 'Sustentabilidade', to: '/sobre' },
    ],
  },
  {
    heading: 'Cliente',
    links: [
      { label: 'Contato', to: '/contato' },
      { label: 'Lojas físicas', to: '/contato' },
      { label: 'Projetos especiais', to: '/contato' },
      { label: 'Cuidados com a peça', to: '/sobre' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="grain relative overflow-hidden bg-ink-900 pt-24 pb-10 text-linen-100">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="rule-brass mb-16" />

        <div className="grid grid-cols-1 gap-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="font-display text-3xl tracking-[0.1em]">SALABELLA</p>
            <p className="mt-5 max-w-[30ch] text-sm leading-relaxed text-linen-100/60">
              Móveis autorais, desenhados em São Paulo e feitos à mão por artesãos parceiros. Peças para viver com
              beleza, todos os dias.
            </p>
            <form className="mt-8 flex max-w-sm items-center gap-2 border-b border-linen-100/25 pb-2" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="footer-email" className="sr-only">
                Seu e-mail
              </label>
              <input
                id="footer-email"
                type="email"
                required
                placeholder="seu melhor e-mail"
                className="w-full bg-transparent text-sm placeholder:text-linen-100/50 focus:outline-none"
              />
              <button type="submit" className="eyebrow shrink-0 text-brass-300 hover:text-brass-200">
                Assinar →
              </button>
            </form>
          </div>

          {SITEMAP.map((col) => (
            <div key={col.heading}>
              <p className="eyebrow text-brass-300">{col.heading}</p>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <NavLink to={l.to} className="text-sm text-linen-100/70 transition-colors hover:text-linen-50">
                      {l.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-col items-start justify-between gap-6 border-t border-linen-100/15 pt-8 text-xs text-linen-100/55 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} SALABELLA Móveis — CNPJ 00.000.000/0001-00</p>
          <div className="flex gap-6">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="hover:text-linen-100/90">
              WhatsApp
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-linen-100/90">
              Instagram
            </a>
            <a href={PINTEREST_URL} target="_blank" rel="noreferrer" className="hover:text-linen-100/90">
              Pinterest
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
