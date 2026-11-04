import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HOURS_LINES } from '@/data/storeLocator'
import { useMagnetic } from '@/hooks/useMagnetic'
import { useReducedMotion } from '@/hooks/useMediaFlags'
import { ArrowUpRightIcon } from '@/components/ui/icons'
import { VignetteFrame } from '@/components/sections/BrandStory'

gsap.registerPlugin(ScrollTrigger)

/* ------------------------------------------------------------------ data */

const FACTS = [
  { label: 'Origem', value: 'São Paulo', note: 'Oficina no Bexiga' },
  { label: 'Fundação', value: '2012', note: 'Uma bancada, um torno' },
  { label: 'Rede', value: '+40', note: 'Ateliês parceiros' },
] as const

const VALUES = [
  {
    title: 'Autoria',
    body: 'Toda peça tem autor. Desenhamos em casa e creditamos cada artesão parceiro: o nome de quem fez vai gravado por baixo do assento, do tampo ou da base.',
  },
  {
    title: 'Ofício',
    body: 'Espiga e cavilha, costura à mão, torno de pé. Escolhemos técnicas lentas porque são as que duram — e porque deixam a marca de quem as executa.',
  },
  {
    title: 'Sustentabilidade',
    body: 'Madeira de manejo certificado ou de reaproveitamento, cola à base d’água, óleos naturais. Tudo é feito sob encomenda: nada fica parado em estoque.',
  },
  {
    title: 'Atemporalidade',
    body: 'Desenhamos para a próxima geração, não para a próxima estação. Linhas calmas, proporções honestas e reforma de estofados pelo tempo que a peça viver.',
  },
] as const

const PROCESS = [
  {
    title: 'Desenho',
    body: 'Cecília desenha a lápis, em escala real, e toda peça nova ganha um protótipo em pinus antes de ir para a madeira definitiva.',
  },
  {
    title: 'Madeira',
    body: 'Freijó e imbuia de manejo certificado ou de reaproveitamento, secos ao ar e escolhidos tábua a tábua pelo desenho do veio.',
  },
  {
    title: 'Bancada',
    body: 'Espiga, cavilha e rabo-de-andorinha na marcenaria; costura à mão na tapeçaria; seis demãos lixadas uma a uma na laca.',
  },
  {
    title: 'Assinatura',
    body: 'Acabamento em óleo e cera de carnaúba, conferência final no Bexiga e o nome de quem fez gravado por baixo da peça.',
  },
] as const

const MATERIALS = [
  { name: 'Freijó maciço', use: 'Tampos, pés torneados e quadros' },
  { name: 'Imbuia', use: 'Estantes e montantes' },
  { name: 'Linho e bouclé de lã', use: 'Estofados e almofadas soltas' },
  { name: 'Couro ao vegetal', use: 'Assentos em tira larga' },
  { name: 'Latão', use: 'Torneado, repuxado e escovado' },
  { name: 'Cerâmica e capim dourado', use: 'De Cunha (SP) e do Jalapão (TO)' },
] as const

const MILESTONES = [
  {
    year: '2012',
    title: 'A primeira bancada',
    body: 'Cecília Salabella e Benedito Nunes abrem uma oficina de 40 m² nos fundos de um sobrado no Bexiga. A primeira peça é a banqueta Lua, em freijó.',
  },
  {
    year: '2015',
    title: 'Os primeiros parceiros',
    body: 'Tapeceiros de Itu e torneiros de Ribeirão Pires entram para a rede. Nasce a primeira coleção de estofados, desenhada a quatro mãos com eles.',
  },
  {
    year: '2018',
    title: 'Showroom nos Jardins',
    body: 'A loja abre com uma bancada de verdade no fundo da sala, para que cada cliente veja de perto como uma peça é montada.',
  },
  {
    year: '2021',
    title: 'Madeira rastreada',
    body: 'Toda a madeira passa a ter origem certificada ou de reaproveitamento, com rastreio peça a peça, da tora ao acabamento.',
  },
  {
    year: '2024',
    title: 'Mil Auroras',
    body: 'A Poltrona Aurora chega à milésima unidade — cada uma estofada à mão e assinada por quem a fez.',
  },
  {
    year: '2026',
    title: 'Ateliê de portas abertas',
    body: 'A rede passa de quarenta ateliês parceiros, e a oficina do Bexiga começa a receber visitas com hora marcada.',
  },
] as const

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)

/* ------------------------------------------------------------------ page */

export default function Sobre() {
  const rootRef = useRef<HTMLDivElement>(null)
  const ctaRef = useMagnetic<HTMLAnchorElement>({ strength: 0.25, max: 10 })
  const reduced = useReducedMotion()

  useEffect(() => {
    const prev = document.title
    document.title = 'Sobre · SALABELLA'
    return () => {
      document.title = prev
    }
  }, [])

  // Header plays on load; everything below reveals on real viewport entry in
  // staggered batches. The brass timeline spine draws with scroll.
  useEffect(() => {
    const root = rootRef.current
    if (!root || reduced) return
    const timers: number[] = []
    let io: IntersectionObserver | null = null

    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'expo.out', duration: 1.2 }, delay: 0.15 })
        .from('[data-hero-line]', { yPercent: 110, stagger: 0.08, duration: 1.3 })
        .from('[data-hero-fade]', { y: 24, autoAlpha: 0, stagger: 0.08 }, 0.25)
        .from('[data-hero-card]', { y: 40, autoAlpha: 0, scale: 0.98, duration: 1.5 }, 0.2)

      const items = gsap.utils.toArray<HTMLElement>('[data-reveal]')
      const shown = new WeakSet<HTMLElement>()
      gsap.set(items, { autoAlpha: 0, y: 28 })
      const reveal = (batch: HTMLElement[]) => {
        const fresh = batch.filter((el) => !shown.has(el))
        fresh.forEach((el) => shown.add(el))
        if (fresh.length) gsap.to(fresh, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09 })
      }
      ScrollTrigger.batch(items, { start: 'top 88%', once: true, onEnter: (b) => reveal(b as HTMLElement[]) })

      const spine = root.querySelector<HTMLElement>('[data-spine]')
      if (spine) {
        gsap.fromTo(
          spine,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            transformOrigin: 'top center',
            scrollTrigger: { trigger: spine, start: 'top 75%', end: 'bottom 70%', scrub: 0.6 },
          },
        )
      }

      // Safety net: anything that has truly entered the viewport is shown
      // even if ScrollTrigger mis-measured after a layout shift.
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          const el = e.target as HTMLElement
          io?.unobserve(el)
          timers.push(window.setTimeout(() => reveal([el]), 900))
        })
      })
      items.forEach((el) => io?.observe(el))
    }, root)

    return () => {
      io?.disconnect()
      timers.forEach((t) => window.clearTimeout(t))
      ctx.revert()
    }
  }, [reduced])

  return (
    <div ref={rootRef}>
      {/* ------------------------------------------------------ header -- */}
      <section
        aria-labelledby="sobre-titulo"
        data-header="light"
        className="grain relative overflow-hidden bg-linen-100 pt-36 pb-20 text-ink-900 md:pt-44 md:pb-28"
      >
        <div className="mx-auto grid max-w-[1440px] gap-14 px-6 md:grid-cols-12 md:items-end md:gap-10 md:px-10 lg:gap-16">
          <div className="md:col-span-7 lg:col-span-8">
            <p data-hero-fade className="eyebrow flex items-center gap-3 text-clay-600">
              <span aria-hidden className="h-px w-8 bg-clay-500" />
              Sobre a Salabella
            </p>
            <h1
              id="sobre-titulo"
              className="mt-8 font-display text-[2.625rem] leading-[1.02] font-light tracking-[-0.025em] md:text-5xl lg:text-6xl xl:text-[5.25rem]"
            >
              <span className="block overflow-hidden pb-[0.08em]">
                <span data-hero-line className="block">
                  Uma casa de ofício,
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.12em]">
                <span data-hero-line className="block">
                  não uma <em className="text-clay-600 italic">fábrica</em>
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.12em]">
                <span data-hero-line className="block">
                  de móveis.
                </span>
              </span>
            </h1>
            <p data-hero-fade className="mt-8 max-w-[56ch] text-base leading-relaxed text-ink-700 md:text-lg">
              A Salabella desenha móveis autorais em São Paulo e os confia a uma rede de artesãos que trabalham com as
              mãos, em oficinas pequenas, no tempo que a madeira pede. Somos poucos, fazemos devagar e assinamos tudo o
              que sai daqui.
            </p>

            {/* @container: the figures scale with the row itself, so "São Paulo" fits its
                third at every width (at exactly 768px the cell is only ~107px). */}
            <dl className="@container mt-12 grid max-w-[44rem] grid-cols-3 gap-3 border-t border-ink-900/15 pt-8 sm:gap-8">
              {FACTS.map((f) => (
                <div key={f.label} data-hero-fade>
                  <dt className="eyebrow text-[0.6875rem] text-ink-600">{f.label}</dt>
                  <dd className="mt-3 font-display text-[clamp(1.3125rem,calc((100cqw-4rem)/14),2.25rem)] leading-none whitespace-nowrap text-ink-900 tabular-nums">
                    {f.value}
                  </dd>
                  <dd className="mt-2 text-xs leading-snug text-ink-600 sm:text-sm">{f.note}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div data-hero-card className="md:col-span-5 lg:col-span-4">
            <VignetteFrame
              caption="Estudo de veio, torneado à mão"
              detail="Freijó · Fig. 01"
              aspect="aspect-[5/4] md:aspect-[1/1]"
              className="text-ink-900"
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- founders -- */}
      <section id="historia" data-header="dark" aria-labelledby="historia-titulo" className="grain relative overflow-hidden bg-ink-900 text-linen-100">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-24 md:grid-cols-12 md:gap-10 md:px-10 md:py-32 lg:py-40">
          <div className="md:col-span-5 lg:col-span-4">
            <p data-reveal className="eyebrow flex items-center gap-3 text-brass-400">
              <span aria-hidden className="h-px w-8 bg-brass-400" />
              Nossa história
            </p>
            <h2
              id="historia-titulo"
              data-reveal
              className="mt-6 font-display text-[2.25rem] leading-[1.06] font-light tracking-[-0.02em] text-balance text-linen-50 md:text-4xl xl:text-5xl"
            >
              Começou com um torno, uma bancada e <em className="whitespace-nowrap text-brass-300 italic">alguma teimosia.</em>
            </h2>
          </div>

          <div className="md:col-span-7 lg:col-span-7 lg:col-start-6">
            <div className="max-w-[58ch] space-y-6 text-base leading-relaxed text-linen-300 md:text-[1.0625rem]">
              <p data-reveal>
                Em 2012, a arquiteta Cecília Salabella e o marceneiro Benedito Nunes alugaram 40 m² nos fundos de um
                sobrado no Bexiga. Ela trazia os desenhos; ele, trinta anos de bancada e um torno herdado do pai. A
                primeira peça foi uma banqueta de freijó — fizeram onze protótipos antes de acertar a altura.
              </p>
              <p data-reveal>
                A ideia nunca foi crescer como fábrica, e sim como rede. Em vez de montar uma linha de produção, os dois
                foram atrás de quem já fazia bem — tapeceiros em Itu, torneiros em Ribeirão Pires, uma família de
                ceramistas em Cunha — e passaram a desenhar junto com eles.
              </p>
            </div>

            <figure data-reveal className="my-14 max-w-[40rem] border-l border-brass-400 pl-6 md:my-16 md:pl-10">
              <blockquote className="font-display text-[1.75rem] leading-[1.22] font-light text-balance text-linen-50 italic md:text-[2.375rem]">
                “Madeira não aceita pressa. Quem apressa o veio ganha uma peça bonita por seis meses — e nós queremos as
                de sessenta anos.”
              </blockquote>
              <figcaption className="mt-6 text-sm text-linen-300">
                <span className="text-linen-50">Benedito Nunes</span> · marceneiro e cofundador
              </figcaption>
            </figure>

            <div className="max-w-[58ch] space-y-6 text-base leading-relaxed text-linen-300 md:text-[1.0625rem]">
              <p data-reveal>
                Hoje são mais de quarenta ateliês parceiros, e Cecília ainda desenha a lápis antes de abrir o computador.
                Cada peça continua saindo com o nome de quem a fez gravado por baixo, e cada desenho novo ainda passa pela
                bancada do Bexiga antes de entrar no catálogo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- values -- */}
      <section id="valores" data-header="light" aria-labelledby="valores-titulo" className="bg-linen-50 text-ink-900">
        <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-32">
          <div className="grid gap-6 md:grid-cols-12 md:items-end md:gap-10">
            <div className="md:col-span-7">
              <p data-reveal className="eyebrow flex items-center gap-3 text-clay-600">
                <span aria-hidden className="h-px w-8 bg-clay-500" />O que nos orienta
              </p>
              <h2
                id="valores-titulo"
                data-reveal
                className="mt-6 font-display text-[2.25rem] leading-[1.06] font-light tracking-[-0.02em] text-balance md:text-5xl"
              >
                Quatro princípios, <em className="text-clay-600 italic">nenhum atalho.</em>
              </h2>
            </div>
          </div>

          <ul className="mt-14 grid gap-px overflow-hidden border border-linen-300 bg-linen-300 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <li key={v.title} data-reveal className="flex flex-col bg-linen-50 p-7 md:p-9">
                <span aria-hidden className="font-display text-sm text-clay-600 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-10 font-display text-[1.75rem] leading-tight md:mt-14">{v.title}</h3>
                <span aria-hidden className="mt-4 block h-px w-10 bg-brass-400" />
                <p className="mt-5 max-w-[40ch] text-[0.9375rem] leading-relaxed text-ink-600">{v.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------- materials -- */}
      <section
        id="materiais"
        data-header="dark"
        aria-labelledby="materiais-titulo"
        className="grain relative overflow-hidden bg-ink-900 text-linen-100"
      >
        <div className="mx-auto grid max-w-[1440px] gap-14 px-6 py-24 md:grid-cols-12 md:gap-10 md:px-10 md:py-32">
          <div className="md:col-span-5 lg:col-span-4">
            <p data-reveal className="eyebrow flex items-center gap-3 text-brass-400">
              <span aria-hidden className="h-px w-8 bg-brass-400" />
              Materiais e processo
            </p>
            <h2
              id="materiais-titulo"
              data-reveal
              className="mt-6 font-display text-[2.25rem] leading-[1.06] font-light tracking-[-0.02em] text-balance text-linen-50 md:text-5xl"
            >
              Da tora à assinatura, <em className="text-brass-300 italic">no tempo da madeira.</em>
            </h2>
            <dl data-reveal className="mt-12 divide-y divide-linen-50/10 border-y border-linen-50/10">
              {MATERIALS.map((m) => (
                <div key={m.name} className="flex flex-col gap-1 py-3.5">
                  <dt className="font-display text-lg text-linen-50">{m.name}</dt>
                  <dd className="text-sm text-linen-300">{m.use}</dd>
                </div>
              ))}
            </dl>
          </div>

          <ol className="grid gap-px self-start overflow-hidden border border-linen-50/10 bg-linen-50/10 sm:max-md:grid-cols-2 md:col-span-7 lg:grid-cols-2 lg:col-span-7 lg:col-start-6">
            {PROCESS.map((step, i) => (
              <li key={step.title} data-reveal className="flex flex-col bg-ink-900 p-7 md:p-9">
                <span aria-hidden className="font-display text-sm text-brass-300 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-8 font-display text-[1.75rem] leading-tight text-linen-50 md:mt-12">{step.title}</h3>
                <span aria-hidden className="mt-4 block h-px w-10 bg-brass-400" />
                <p className="mt-5 max-w-[40ch] text-[0.9375rem] leading-relaxed text-linen-300">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------- timeline -- */}
      <section id="linha-do-tempo" data-header="light" aria-labelledby="linha-titulo" className="grain relative overflow-hidden bg-linen-100 text-ink-900">
        <div className="mx-auto grid max-w-[1440px] gap-14 px-6 py-24 md:grid-cols-12 md:gap-10 md:px-10 md:py-32">
          <div className="md:col-span-4">
            <div className="md:sticky md:top-32">
              <p data-reveal className="eyebrow flex items-center gap-3 text-clay-600">
                <span aria-hidden className="h-px w-8 bg-clay-500" />
                Linha do tempo
              </p>
              <h2
                id="linha-titulo"
                data-reveal
                className="mt-6 font-display text-[2.25rem] leading-[1.06] font-light tracking-[-0.02em] text-balance md:text-4xl lg:text-5xl"
              >
                Catorze anos, uma bancada de cada vez.
              </h2>
            </div>
          </div>

          <div className="relative md:col-span-8 lg:col-span-7 lg:col-start-6">
            {/* brass spine: a faint full-length track, and the drawn line on top */}
            <span aria-hidden className="absolute top-2 bottom-2 left-[5px] w-px bg-brass-400/30" />
            <span data-spine aria-hidden className="absolute top-2 bottom-2 left-[5px] w-px origin-top bg-brass-500" />
            <ol className="space-y-14 md:space-y-16">
              {MILESTONES.map((m) => (
                <li key={m.year} data-reveal className="relative grid gap-2 pl-10 sm:grid-cols-[7.5rem_1fr] sm:gap-8 md:pl-14">
                  <span
                    aria-hidden
                    className="absolute top-[0.55rem] left-0 size-[11px] rounded-full border border-brass-500 bg-linen-100"
                  />
                  <p className="font-display text-3xl leading-none text-clay-600 tabular-nums md:text-4xl">{m.year}</p>
                  <div>
                    <h3 className="font-display text-xl leading-snug md:text-2xl">{m.title}</h3>
                    <p className="mt-2 max-w-[52ch] text-[0.9375rem] leading-relaxed text-ink-600">{m.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- CTA -- */}
      <section id="visite" data-header="dark" aria-labelledby="visita-titulo" className="grain relative overflow-hidden bg-ink-900 text-linen-50">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center px-6 py-28 text-center md:px-10 md:py-40">
          <p data-reveal className="eyebrow text-brass-400">Visite o showroom</p>
          <h2
            id="visita-titulo"
            data-reveal
            className="mt-6 max-w-[16ch] font-display text-[2.5rem] leading-[1.04] font-light tracking-[-0.02em] text-balance md:text-6xl xl:text-7xl"
          >
            Venha ver a bancada trabalhando <em className="text-brass-300 italic">de perto.</em>
          </h2>
          <p data-reveal className="mt-8 max-w-[56ch] text-base leading-relaxed text-linen-300 md:text-lg">
            O showroom dos Jardins abre {lowerFirst(HOURS_LINES[0])}; {lowerFirst(HOURS_LINES[1])}. No fundo da sala, a
            bancada está sempre em uso. Quer conhecer a oficina do Bexiga? As visitas lá são agendadas pelo contato. Traga
            as medidas da sua sala e tempo para um café.
          </p>
          <div data-reveal className="mt-12">
            <Link
              ref={ctaRef}
              to="/contato?assunto=showroom#formulario"
              className="group eyebrow inline-flex items-center gap-3 rounded-full bg-linen-50 py-4 pr-4 pl-7 text-ink-900 transition-colors duration-200 hover:bg-brass-200"
            >
              Agendar uma visita
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-ink-900 text-linen-50 transition-transform duration-300 ease-aaa group-hover:rotate-45">
                <ArrowUpRightIcon size={16} />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
