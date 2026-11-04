import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ADDRESS_LINES,
  EMAIL,
  EMAIL_HREF,
  HOURS_LINES,
  MAPS_URL,
  PHONE_DISPLAY,
  PHONE_HREF,
  WHATSAPP_URL,
} from '@/data/storeLocator'
import { useMagnetic } from '@/hooks/useMagnetic'
import { focusWithClearance } from '@/hooks/useLenis'
import { StoreMap } from '@/components/ui/StoreMap'
import {
  ArrowUpRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  WhatsAppIcon,
} from '@/components/ui/icons'

gsap.registerPlugin(ScrollTrigger)

/* ------------------------------------------------------------------ data */

const SUBJECTS = [
  'Quero visitar o showroom',
  'Orçamento de uma peça',
  'Peça sob medida ou projeto especial',
  'Sou arquiteto(a) ou designer',
  'Pós-venda e cuidados com a peça',
  'Outro assunto',
]

/** `?assunto=` shortcuts used by links elsewhere (e.g. the footer's "Projetos especiais"). */
const SUBJECT_PRESETS: Record<string, string> = {
  showroom: SUBJECTS[0],
  orcamento: SUBJECTS[1],
  projeto: SUBJECTS[2],
  arquitetos: SUBJECTS[3],
}

const presetSubject = () => SUBJECT_PRESETS[new URLSearchParams(window.location.search).get('assunto') ?? ''] ?? ''

const CHANNELS = [
  { icon: <WhatsAppIcon size={18} />, label: 'WhatsApp', note: 'A resposta mais rápida', href: WHATSAPP_URL, external: true },
  { icon: <PhoneIcon size={18} />, label: PHONE_DISPLAY, note: HOURS_LINES[0], href: PHONE_HREF, external: false },
  { icon: <MailIcon size={18} />, label: EMAIL, note: 'Respondemos em até um dia útil', href: EMAIL_HREF, external: false },
]

const OTHER_SERVICES = [
  { title: 'Arquitetos e designers', body: 'Condições de especificação, amostras de tecido e acabamento.', subject: 'Arquitetos e designers' },
  { title: 'Imprensa', body: 'Imagens em alta, release e entrevistas com o ateliê.', subject: 'Imprensa' },
  { title: 'Artesãos parceiros', body: 'Marcenaria, tapeçaria ou cerâmica? Queremos conhecer seu trabalho.', subject: 'Artesãos parceiros' },
]

type FieldName = 'nome' | 'email' | 'telefone' | 'assunto' | 'mensagem'
type Values = Record<FieldName, string>
type Errors = Partial<Record<FieldName, string>>

const EMPTY: Values = { nome: '', email: '', telefone: '', assunto: '', mensagem: '' }
const ORDER: FieldName[] = ['nome', 'email', 'telefone', 'assunto', 'mensagem']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validateField(name: FieldName, raw: string): string | undefined {
  const v = raw.trim()
  switch (name) {
    case 'nome':
      if (!v) return 'Como podemos te chamar? Digite seu nome.'
      if (v.length < 2) return 'Seu nome precisa de pelo menos 2 letras.'
      return
    case 'email':
      if (!v) return 'Precisamos do seu e-mail para responder.'
      if (!EMAIL_RE.test(v)) return 'Esse e-mail parece incompleto — confira o @ e o domínio.'
      return
    case 'telefone': {
      if (!v) return
      const digits = v.replace(/\D/g, '')
      if (digits.length < 10 || digits.length > 13) return 'Inclua o DDD, por exemplo (11) 91234-5678.'
      return
    }
    case 'mensagem':
      if (!v) return 'Conte para a gente o que você tem em mente.'
      if (v.length < 10) return 'Escreva um pouco mais — umas poucas linhas já ajudam.'
      return
    default:
      return
  }
}

function validateAll(values: Values): Errors {
  const errors: Errors = {}
  for (const k of ORDER) {
    const e = validateField(k, values[k])
    if (e) errors[k] = e
  }
  return errors
}

/* ------------------------------------------------------------ reveal hook */

/** Scroll reveal for `[data-reveal]` children, with a visibility fallback. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let io: IntersectionObserver | null = null
    let fallback: number | undefined
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true })
      tl.from('[data-reveal]', { y: 28, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 })
      const play = () => {
        if (tl.progress() === 0 && !tl.isActive()) tl.play()
      }
      ScrollTrigger.create({ trigger: root, start: 'top 85%', once: true, onEnter: play })
      io = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            window.clearTimeout(fallback)
            fallback = window.setTimeout(play, 650)
          }
        },
        { threshold: 0.05 },
      )
      io.observe(root)
    }, root)
    return () => {
      io?.disconnect()
      window.clearTimeout(fallback)
      ctx.revert()
    }
  }, [])
  return ref
}

/* ---------------------------------------------------------------- fields */

const labelBase =
  'pointer-events-none absolute left-0 origin-left text-ink-900/65 transition-all duration-200 ease-aaa'
const labelResting = 'top-7 text-[0.9375rem] leading-6'
const labelFloated = 'top-1 text-[0.6875rem] leading-4 font-medium tracking-[0.2em] uppercase'
// Floats on focus or once the field holds text (placeholder=" " trick).
const labelFloats =
  'peer-focus:top-1 peer-focus:text-[0.6875rem] peer-focus:leading-4 peer-focus:font-medium peer-focus:tracking-[0.2em] peer-focus:uppercase peer-focus:text-ink-900 ' +
  'peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-[0.6875rem] peer-[:not(:placeholder-shown)]:leading-4 peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:tracking-[0.2em] peer-[:not(:placeholder-shown)]:uppercase'

const controlBase =
  'peer block w-full scroll-mt-32 appearance-none rounded-none border-0 border-b bg-transparent px-0 pt-7 pb-3 text-[0.9375rem] leading-6 text-ink-900 transition-colors duration-200 focus:outline-none focus-visible:outline-none disabled:opacity-60'

function FieldShell({
  id,
  error,
  hint,
  children,
  className,
}: {
  id: string
  error?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('relative', className)}>
      {children}
      <div className="flex min-h-7 items-start pt-2">
        {error ? (
          <p id={`${id}-erro`} className="text-sm leading-5 text-clay-600">
            {error}
          </p>
        ) : hint ? (
          <p id={`${id}-dica`} className="text-xs leading-5 text-ink-900/65">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/** Brass focus bar that draws across under the active field. */
const FocusBar = ({ invalid, className = 'top-[calc(4rem-1px)]' }: { invalid?: boolean; className?: string }) => (
  <span
    aria-hidden="true"
    className={clsx(
      className,
      'pointer-events-none absolute inset-x-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 ease-aaa peer-focus:scale-x-100',
      invalid ? 'bg-clay-600' : 'bg-brass-400',
    )}
  />
)

/* ------------------------------------------------------------------ page */

type Status = 'idle' | 'submitting' | 'success'

export default function Contato() {
  const heroRef = useRef<HTMLElement>(null)
  const formWrapRef = useReveal<HTMLDivElement>()
  const asideRef = useReveal<HTMLElement>()
  const submitRef = useMagnetic<HTMLButtonElement>({ strength: 0.25, max: 10 })
  const successRef = useRef<HTMLHeadingElement>(null)
  const mountedRef = useRef(false)
  const timerRef = useRef<number | undefined>(undefined)

  const [values, setValues] = useState<Values>(() => ({ ...EMPTY, assunto: presetSubject() }))
  // A footer link like ?assunto=projeto can arrive while this page is already
  // mounted (query-only navigation doesn't remount <main>), so re-apply it.
  const { search } = useLocation()
  useEffect(() => {
    const preset = presetSubject()
    if (preset) setValues((v) => (v.assunto === preset ? v : { ...v, assunto: preset }))
  }, [search])
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [status, setStatus] = useState<Status>('idle')
  const [summary, setSummary] = useState('')
  const [sentName, setSentName] = useState('')

  // StrictMode mounts → unmounts → mounts in dev: re-arm the flag on every
  // mount, otherwise the pending submit never lands on the success state.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      window.clearTimeout(timerRef.current)
    }
  }, [])

  // Hero entrance.
  useEffect(() => {
    const root = heroRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 })
        .from('[data-hero-line]', { yPercent: 110, duration: 1.4, stagger: 0.1 })
        .from('[data-hero-fade]', { y: 20, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, 0.35)
    }, root)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (status === 'success') focusWithClearance(successRef.current)
  }, [status])

  const update = (name: FieldName, value: string) => {
    setValues((v) => ({ ...v, [name]: value }))
    // Live re-validation only once the visitor has met the field's error.
    if (touched[name] || errors[name]) {
      setErrors((e) => ({ ...e, [name]: validateField(name, value) }))
    }
  }

  const blur = (name: FieldName) => {
    setTouched((t) => ({ ...t, [name]: true }))
    // Don't scold an empty field the visitor merely tabbed through.
    if (values[name].trim() || errors[name]) {
      setErrors((e) => ({ ...e, [name]: validateField(name, values[name]) }))
    }
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'submitting') return
    const next = validateAll(values)
    setErrors(next)
    setTouched({ nome: true, email: true, telefone: true, assunto: true, mensagem: true })
    const invalid = ORDER.filter((k) => next[k])
    if (invalid.length) {
      setSummary(
        invalid.length === 1
          ? 'Falta só um detalhe — veja o campo destacado.'
          : `Faltam ${invalid.length} detalhes — veja os campos destacados.`,
      )
      focusWithClearance(document.getElementById(`contato-${invalid[0]}`))
      return
    }
    setSummary('Enviando sua mensagem…')
    setStatus('submitting')
    // No backend yet: simulate the round-trip.
    timerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return
      setSentName(values.nome.trim().split(/\s+/)[0] ?? '')
      setStatus('success')
      setSummary('')
    }, 1300)
  }

  const reset = () => {
    setValues(EMPTY)
    setErrors({})
    setTouched({})
    setStatus('idle')
    setSummary('')
    requestAnimationFrame(() => focusWithClearance(document.getElementById('contato-nome')))
  }

  const describedBy = (name: FieldName, hint?: boolean) =>
    errors[name] ? `contato-${name}-erro` : hint ? `contato-${name}-dica` : undefined

  const borderFor = (name: FieldName) =>
    errors[name] ? 'border-clay-600' : 'border-ink-900/50 hover:border-ink-900/80 focus:border-ink-900/80'

  const submitting = status === 'submitting'

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section
        ref={heroRef}
        data-header="dark"
        aria-labelledby="contato-hero-titulo"
        className="grain relative overflow-hidden bg-ink-900 pt-40 pb-20 text-linen-50 md:pt-48 md:pb-28"
      >
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:items-end lg:gap-12">
            <div className="lg:col-span-8">
              <p data-hero-fade className="eyebrow flex items-center gap-3 text-brass-300">
                <span aria-hidden="true" className="h-px w-8 bg-brass-400" />
                Contato
              </p>
              <h1
                id="contato-hero-titulo"
                className="mt-8 font-display text-[2.375rem] leading-[1] font-light tracking-[-0.025em] sm:text-[2.875rem] md:text-7xl xl:text-[5.5rem]"
              >
                <span className="block overflow-hidden pb-[0.1em]">
                  <span data-hero-line className="block">
                    Toda peça começa
                  </span>
                </span>
                <span className="block overflow-hidden pb-[0.1em]">
                  <span data-hero-line className="block">
                    com <em className="whitespace-nowrap text-brass-200 italic">uma conversa.</em>
                  </span>
                </span>
              </h1>
              <p data-hero-fade className="mt-8 max-w-[54ch] text-base leading-relaxed text-linen-100/75 md:text-lg">
                Uma dúvida sobre medidas, um tecido que você quer ver ao vivo, um projeto que ainda é só um esboço —
                escreva para a gente. Quem responde é o próprio ateliê, em até um dia útil.
              </p>
            </div>

            <ul className="divide-y divide-linen-100/15 border-y border-linen-100/15 lg:col-span-4">
              {CHANNELS.map((c) => (
                <li key={c.label} data-hero-fade>
                  <a
                    href={c.href}
                    {...(c.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className="group flex items-center gap-4 py-5 transition-colors duration-200"
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-brass-400/50 text-brass-300 transition-colors duration-200 group-hover:bg-brass-300 group-hover:text-ink-900">
                      {c.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] text-linen-50">{c.label}</span>
                      <span className="mt-0.5 block text-xs text-linen-100/65">{c.note}</span>
                    </span>
                    <ArrowUpRightIcon
                      size={16}
                      className="shrink-0 text-linen-100/60 transition-transform duration-300 ease-aaa group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brass-300"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- form + sidebar */}
      <section data-header="light" aria-label="Formulário e informações da loja" className="bg-linen-50 py-24 text-ink-900 md:py-32">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <div className="grid grid-cols-1 gap-20 lg:grid-cols-12 lg:gap-12 xl:gap-20">
            <div ref={formWrapRef} id="formulario" className="scroll-mt-28 lg:col-span-7">
              {status === 'success' ? (
                <div className="flex min-h-[34rem] flex-col items-start justify-center">
                  <span className="inline-flex size-16 items-center justify-center rounded-full bg-moss-600 text-linen-50">
                    <CheckIcon size={28} />
                  </span>
                  <h2
                    ref={successRef}
                    tabIndex={-1}
                    className="mt-8 scroll-mt-32 font-display text-4xl leading-tight font-light tracking-[-0.02em] text-balance focus:outline-none md:text-5xl"
                  >
                    Mensagem recebida{sentName ? `, ${sentName}` : ''}.
                  </h2>
                  <p className="mt-5 max-w-[50ch] text-base leading-relaxed text-ink-900/75">
                    Obrigado por escrever. Alguém do ateliê responde em até um dia útil, pelo e-mail que você deixou
                    {values.telefone.trim() ? ' ou pelo WhatsApp' : ''}. Se for urgente, o WhatsApp é o caminho mais
                    rápido.
                  </p>
                  <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="eyebrow inline-flex items-center gap-2.5 rounded-full bg-ink-900 px-6 py-4 text-linen-50 transition-colors duration-200 hover:bg-clay-600"
                    >
                      <WhatsAppIcon size={16} />
                      Abrir WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={reset}
                      className="eyebrow border-b border-ink-900/40 py-1.5 text-ink-900 transition-colors duration-200 hover:border-ink-900"
                    >
                      Enviar outra mensagem
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p data-reveal className="eyebrow text-clay-600">
                    Escreva para o ateliê
                  </p>
                  <h2
                    data-reveal
                    className="mt-5 max-w-[18ch] font-display text-4xl leading-[1.05] font-light tracking-[-0.02em] text-balance md:text-5xl"
                  >
                    Conte o que você está imaginando.
                  </h2>
                  <p data-reveal className="mt-5 max-w-[52ch] text-base leading-relaxed text-ink-900/75">
                    Medidas, fotos do ambiente, uma referência que você guardou — tudo ajuda. Campos com * são
                    obrigatórios.
                  </p>

                  <form data-reveal noValidate onSubmit={onSubmit} className="mt-12" aria-describedby="contato-resumo">
                    <fieldset disabled={submitting} className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                      <legend className="sr-only">Seus dados e sua mensagem</legend>

                      <FieldShell id="contato-nome" error={errors.nome}>
                        <input
                          id="contato-nome"
                          name="nome"
                          type="text"
                          autoComplete="name"
                          required
                          placeholder=" "
                          value={values.nome}
                          onChange={(e) => update('nome', e.target.value)}
                          onBlur={() => blur('nome')}
                          aria-invalid={!!errors.nome || undefined}
                          aria-describedby={describedBy('nome')}
                          className={clsx(controlBase, borderFor('nome'))}
                        />
                        <label htmlFor="contato-nome" className={clsx(labelBase, labelResting, labelFloats)}>
                          Nome<span aria-hidden="true"> *</span>
                        </label>
                        <FocusBar invalid={!!errors.nome} />
                      </FieldShell>

                      <FieldShell id="contato-email" error={errors.email}>
                        <input
                          id="contato-email"
                          name="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          required
                          placeholder=" "
                          value={values.email}
                          onChange={(e) => update('email', e.target.value)}
                          onBlur={() => blur('email')}
                          aria-invalid={!!errors.email || undefined}
                          aria-describedby={describedBy('email')}
                          className={clsx(controlBase, borderFor('email'))}
                        />
                        <label htmlFor="contato-email" className={clsx(labelBase, labelResting, labelFloats)}>
                          E-mail<span aria-hidden="true"> *</span>
                        </label>
                        <FocusBar invalid={!!errors.email} />
                      </FieldShell>

                      <FieldShell id="contato-telefone" error={errors.telefone} hint="Opcional · com DDD">
                        <input
                          id="contato-telefone"
                          name="telefone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder=" "
                          value={values.telefone}
                          onChange={(e) => update('telefone', e.target.value)}
                          onBlur={() => blur('telefone')}
                          aria-invalid={!!errors.telefone || undefined}
                          aria-describedby={describedBy('telefone', true)}
                          className={clsx(controlBase, borderFor('telefone'))}
                        />
                        <label htmlFor="contato-telefone" className={clsx(labelBase, labelResting, labelFloats)}>
                          Telefone ou WhatsApp
                        </label>
                        <FocusBar invalid={!!errors.telefone} />
                      </FieldShell>

                      <FieldShell id="contato-assunto" hint="Ajuda a direcionar para a pessoa certa">
                        <select
                          id="contato-assunto"
                          name="assunto"
                          value={values.assunto}
                          onChange={(e) => update('assunto', e.target.value)}
                          aria-describedby={describedBy('assunto', true)}
                          className={clsx(
                            controlBase,
                            borderFor('assunto'),
                            'cursor-pointer pr-8',
                            !values.assunto && 'text-ink-900/65',
                          )}
                        >
                          <option value="">Escolha um assunto</option>
                          {SUBJECTS.map((s) => (
                            <option key={s} value={s} className="text-ink-900">
                              {s}
                            </option>
                          ))}
                        </select>
                        <label htmlFor="contato-assunto" className={clsx(labelBase, labelFloated)}>
                          Assunto
                        </label>
                        <ChevronDownIcon
                          size={18}
                          className="pointer-events-none absolute top-8 right-0 text-ink-900/65"
                        />
                        <FocusBar />
                      </FieldShell>

                      <FieldShell id="contato-mensagem" error={errors.mensagem} className="sm:col-span-2">
                        <textarea
                          id="contato-mensagem"
                          name="mensagem"
                          rows={7}
                          required
                          placeholder=" "
                          value={values.mensagem}
                          onChange={(e) => update('mensagem', e.target.value)}
                          onBlur={() => blur('mensagem')}
                          aria-invalid={!!errors.mensagem || undefined}
                          aria-describedby={describedBy('mensagem')}
                          className={clsx(controlBase, borderFor('mensagem'), 'min-h-48 resize-y')}
                        />
                        <label htmlFor="contato-mensagem" className={clsx(labelBase, labelResting, labelFloats)}>
                          Mensagem<span aria-hidden="true"> *</span>
                        </label>
                        <FocusBar invalid={!!errors.mensagem} className="bottom-[calc(1.75rem-1px)]" />
                      </FieldShell>
                    </fieldset>

                    <div className="mt-8 flex flex-col-reverse items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-[40ch] text-xs leading-relaxed text-ink-900/65">
                        Usamos seus dados apenas para responder a esta mensagem. Nada de listas sem o seu sim.
                      </p>
                      <button
                        ref={submitRef}
                        type="submit"
                        disabled={submitting}
                        aria-busy={submitting || undefined}
                        className="group eyebrow inline-flex shrink-0 items-center gap-3 rounded-full bg-ink-900 py-4 pr-4 pl-7 text-linen-50 transition-colors duration-200 hover:bg-clay-600 disabled:cursor-progress disabled:hover:bg-ink-900"
                      >
                        {submitting ? 'Enviando…' : 'Enviar mensagem'}
                        <span className="inline-flex size-7 items-center justify-center rounded-full bg-linen-50/10">
                          {submitting ? (
                            <span
                              aria-hidden="true"
                              className="size-3.5 animate-spin rounded-full border-[1.5px] border-linen-50/30 border-t-linen-50"
                            />
                          ) : (
                            <ArrowUpRightIcon
                              size={14}
                              className="transition-transform duration-300 ease-aaa group-hover:rotate-45"
                            />
                          )}
                        </span>
                      </button>
                    </div>
                    <p id="contato-resumo" role="status" aria-live="polite" className="mt-4 min-h-5 text-sm text-clay-600">
                      {summary}
                    </p>
                  </form>
                </>
              )}
            </div>

            {/* ------------------------------------------------- sidebar */}
            <aside ref={asideRef} id="showroom" aria-labelledby="contato-showroom" className="scroll-mt-28 lg:col-span-5">
              <div className="lg:sticky lg:top-28">
                <div data-reveal>
                  <StoreMap compact />
                </div>

                <div data-reveal className="mt-10">
                  <p id="contato-showroom" className="eyebrow text-clay-600">
                    Showroom Jardins
                  </p>
                  <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <SideItem icon={<PinIcon size={17} />} label="Endereço">
                      <a
                        href={MAPS_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-ink-900/25 underline-offset-4 transition-colors duration-200 hover:decoration-ink-900"
                      >
                        {ADDRESS_LINES[0].split(' — ').map((part) => (
                          <span key={part} className="block">
                            {part}
                          </span>
                        ))}
                        {ADDRESS_LINES[1]}
                      </a>
                    </SideItem>
                    <SideItem icon={<ClockIcon size={17} />} label="Horário">
                      {HOURS_LINES[0]}
                      <br />
                      {HOURS_LINES[1]}
                    </SideItem>
                  </dl>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="eyebrow mt-8 inline-flex w-full items-center justify-between rounded-full border border-ink-900 px-6 py-4 text-ink-900 transition-colors duration-200 hover:bg-ink-900 hover:text-linen-50"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <WhatsAppIcon size={16} />
                      Agendar visita
                    </span>
                    <ArrowUpRightIcon size={15} />
                  </a>
                </div>

                <div data-reveal className="mt-12 border-t border-ink-900/10 pt-8">
                  <p className="eyebrow text-ink-900/65">Outros atendimentos</p>
                  <ul className="mt-5 divide-y divide-ink-900/10">
                    {OTHER_SERVICES.map((s) => (
                      <li key={s.title}>
                        <a
                          href={`${EMAIL_HREF}?subject=${encodeURIComponent(s.subject)}`}
                          className="group flex items-start justify-between gap-6 py-4"
                        >
                          <span>
                            <span className="block font-display text-lg text-ink-900">{s.title}</span>
                            <span className="mt-1 block max-w-[44ch] text-sm leading-relaxed text-ink-900/70">
                              {s.body}
                            </span>
                          </span>
                          <ArrowUpRightIcon
                            size={16}
                            className="mt-1.5 shrink-0 text-ink-900/60 transition-transform duration-300 ease-aaa group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-clay-600"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}

function SideItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-brass-400/60 text-clay-600">
        {icon}
      </span>
      <div>
        <dt className="eyebrow text-[0.6875rem] text-ink-900/65">{label}</dt>
        <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-900">{children}</dd>
      </div>
    </div>
  )
}
