import { useState, type FormEvent } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { WHATSAPP_URL, INSTAGRAM_URL, PINTEREST_URL } from '@/data/storeLocator'
import { useMagnetic } from '@/hooks/useMagnetic'
import { ArrowUpRightIcon, CheckIcon } from '@/components/ui/icons'

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
    heading: 'Ateliê',
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

const SOCIAL = [
  { label: 'WhatsApp', href: WHATSAPP_URL },
  { label: 'Instagram', href: INSTAGRAM_URL },
  { label: 'Pinterest', href: PINTEREST_URL },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Underline that draws in from the left on hover/focus (background-size, so it wraps with the text). */
const underline =
  'bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size,color] duration-300 ease-aaa hover:bg-[length:100%_1px] focus-visible:bg-[length:100%_1px]'

type Status = { kind: 'idle' } | { kind: 'error'; message: string } | { kind: 'success' }

export function Footer() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const submitRef = useMagnetic<HTMLButtonElement>({ strength: 0.35, max: 8 })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const value = email.trim()
    if (!value) {
      setStatus({ kind: 'error', message: 'Digite seu e-mail para receber as novidades.' })
    } else if (!EMAIL_RE.test(value)) {
      setStatus({ kind: 'error', message: 'Esse e-mail parece incompleto — confira e tente de novo.' })
    } else {
      setStatus({ kind: 'success' })
      setEmail('')
      return
    }
    document.getElementById('footer-email')?.focus()
  }

  const invalid = status.kind === 'error'

  return (
    <footer className="grain relative overflow-hidden bg-ink-900 pt-24 pb-10 text-linen-100">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="rule-brass mb-16" />

        <div className="grid grid-cols-1 gap-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="font-display text-3xl tracking-[0.1em]">SALABELLA</p>
            <p className="mt-5 max-w-[30ch] text-sm leading-relaxed text-linen-100/65">
              Móveis autorais, desenhados em São Paulo e feitos à mão por artesãos parceiros. Peças para viver com
              beleza, todos os dias.
            </p>

            <form className="mt-8 max-w-sm" noValidate onSubmit={onSubmit}>
              <p className="eyebrow mb-3 text-brass-300">Cartas do ateliê</p>
              <div
                className={clsx(
                  'flex items-center gap-2 border-b pb-2 transition-colors duration-300 focus-within:border-brass-300',
                  invalid ? 'border-clay-400' : 'border-linen-100/25',
                )}
              >
                <label htmlFor="footer-email" className="sr-only">
                  Seu e-mail
                </label>
                <input
                  id="footer-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (status.kind !== 'idle') setStatus({ kind: 'idle' })
                  }}
                  aria-invalid={invalid || undefined}
                  aria-describedby="footer-email-status"
                  placeholder="seu melhor e-mail"
                  className="w-full bg-transparent py-1 text-sm text-linen-50 placeholder:text-linen-100/55 focus:outline-none"
                />
                <button
                  ref={submitRef}
                  type="submit"
                  className="eyebrow inline-flex shrink-0 items-center gap-1.5 py-1 text-brass-300 transition-colors duration-200 hover:text-brass-200"
                >
                  Assinar
                  <ArrowUpRightIcon size={14} />
                </button>
              </div>
              <p
                id="footer-email-status"
                role="status"
                aria-live="polite"
                className={clsx(
                  'mt-3 flex min-h-5 items-center gap-2 text-xs leading-5',
                  status.kind === 'error' && 'text-clay-400',
                  status.kind === 'success' && 'text-brass-300',
                  status.kind === 'idle' && 'text-linen-100/55',
                )}
              >
                {status.kind === 'success' && <CheckIcon size={14} />}
                {status.kind === 'error' && status.message}
                {status.kind === 'success' && 'Pronto! Você vai receber nossas próximas cartas.'}
                {status.kind === 'idle' && 'Lançamentos e bastidores, uma vez por mês.'}
              </p>
            </form>
          </div>

          {SITEMAP.map((col) => (
            <div key={col.heading}>
              <p className="eyebrow text-brass-300">{col.heading}</p>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <NavLink to={l.to} className={clsx(underline, 'text-sm text-linen-100/70 hover:text-linen-50')}>
                      {l.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-col items-start justify-between gap-6 border-t border-linen-100/15 pt-8 text-xs text-linen-100/60 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} SALABELLA Móveis — CNPJ 00.000.000/0001-00</p>
          <div className="flex gap-6">
            {SOCIAL.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className={clsx(underline, 'hover:text-linen-50')}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
