import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ADDRESS_LINES,
  EMAIL,
  EMAIL_HREF,
  HOURS_LINES,
  INSTAGRAM_URL,
  MAPS_URL,
  PHONE_DISPLAY,
  PHONE_HREF,
  PINTEREST_URL,
  WHATSAPP_URL,
} from '@/data/storeLocator'
import { useMagnetic } from '@/hooks/useMagnetic'
import { StoreMap } from '@/components/ui/StoreMap'
import {
  ArrowUpRightIcon,
  ClockIcon,
  InstagramIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  PinterestIcon,
  WhatsAppIcon,
} from '@/components/ui/icons'

gsap.registerPlugin(ScrollTrigger)

function InfoItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div data-reveal className="flex gap-4">
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

const linkUnderline =
  'bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat transition-[background-size] duration-300 ease-aaa hover:bg-[length:100%_1px] focus-visible:bg-[length:100%_1px]'

export default function Contact() {
  const rootRef = useRef<HTMLElement>(null)
  const ctaRef = useMagnetic<HTMLAnchorElement>({ strength: 0.25, max: 10 })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let io: IntersectionObserver | null = null
    let fallback: number | undefined

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out', duration: 1.2 } })
      tl.from('[data-reveal-line]', { yPercent: 110, stagger: 0.09, duration: 1.3 })
        .from('[data-reveal]', { y: 26, autoAlpha: 0, stagger: 0.07 }, 0.25)
        .from('[data-reveal-map]', { y: 50, autoAlpha: 0, scale: 0.97, duration: 1.5 }, 0.15)

      const play = () => {
        if (tl.progress() === 0 && !tl.isActive()) tl.play()
      }
      ScrollTrigger.create({ trigger: root, start: 'top 72%', once: true, onEnter: play })

      // Fallback: if ScrollTrigger mis-measures (late layout shifts from 3D
      // sections above), any real visibility still plays the reveal shortly
      // after — content can never sit at opacity 0 while on screen.
      io = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            window.clearTimeout(fallback)
            fallback = window.setTimeout(play, 650)
          }
        },
        { threshold: 0.12 },
      )
      io.observe(root)
    }, root)

    return () => {
      io?.disconnect()
      window.clearTimeout(fallback)
      ctx.revert()
    }
  }, [])

  return (
    <section
      ref={rootRef}
      id="contato"
      aria-labelledby="contato-titulo"
      className="grain relative overflow-hidden bg-linen-100 py-28 text-ink-900 md:py-36"
    >
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-12 xl:gap-20">
          <div className="lg:col-span-5">
            <p data-reveal className="eyebrow flex items-center gap-3 text-clay-600">
              <span aria-hidden="true" className="h-px w-8 bg-clay-500" />
              Showroom · Jardins
            </p>

            <h2
              id="contato-titulo"
              className="mt-7 font-display text-[2.75rem] leading-[1.02] font-light tracking-[-0.02em] text-balance md:text-6xl xl:text-[4.5rem]"
            >
              <span className="block overflow-hidden pb-[0.08em]">
                <span data-reveal-line className="block">
                  Venha sentir
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.08em]">
                <span data-reveal-line className="block">
                  cada peça <em className="text-clay-600 italic">de perto.</em>
                </span>
              </span>
            </h2>

            <p data-reveal className="mt-8 max-w-[52ch] text-base leading-relaxed text-ink-900/75 md:text-[1.0625rem]">
              Foto nenhuma explica o afundar de uma almofada de pluma ou o veio da madeira sob a mão. No showroom você
              senta, toca, compara tecidos e conversa com quem desenha cada peça. O café é por nossa conta.
            </p>

            <dl className="mt-12 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
              <InfoItem icon={<PinIcon size={17} />} label="Endereço">
                <a href={MAPS_URL} target="_blank" rel="noreferrer" className={linkUnderline}>
                  {ADDRESS_LINES[0].split(' — ').map((part) => (
                    <span key={part} className="block">
                      {part}
                    </span>
                  ))}
                  {ADDRESS_LINES[1]}
                </a>
              </InfoItem>
              <InfoItem icon={<ClockIcon size={17} />} label="Horário">
                {HOURS_LINES[0]}
                <br />
                {HOURS_LINES[1]}
              </InfoItem>
              <InfoItem icon={<PhoneIcon size={17} />} label="Telefone">
                <a href={PHONE_HREF} className={linkUnderline}>
                  {PHONE_DISPLAY}
                </a>
              </InfoItem>
              <InfoItem icon={<MailIcon size={17} />} label="E-mail">
                <a href={EMAIL_HREF} className={linkUnderline}>
                  {EMAIL}
                </a>
              </InfoItem>
            </dl>

            <div data-reveal className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-5">
              <a
                ref={ctaRef}
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="group eyebrow inline-flex items-center gap-3 rounded-full bg-ink-900 py-4 pr-4 pl-6 text-linen-50 transition-colors duration-200 hover:bg-clay-600"
              >
                <WhatsAppIcon size={17} />
                Agendar visita
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-linen-50/10 transition-transform duration-300 ease-aaa group-hover:rotate-45">
                  <ArrowUpRightIcon size={14} />
                </span>
              </a>
              <Link to="/contato" className={`eyebrow py-2 text-ink-900 ${linkUnderline}`}>
                Outras formas de contato
              </Link>
            </div>

            <div data-reveal className="mt-12 flex items-center gap-5 border-t border-ink-900/10 pt-8">
              <p className="eyebrow text-[0.6875rem] text-ink-900/65">Acompanhe o atelier</p>
              <div className="flex gap-2">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram da SALABELLA"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-ink-900/15 text-ink-900 transition-colors duration-200 hover:border-ink-900 hover:bg-ink-900 hover:text-linen-50"
                >
                  <InstagramIcon size={17} />
                </a>
                <a
                  href={PINTEREST_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Pinterest da SALABELLA"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-ink-900/15 text-ink-900 transition-colors duration-200 hover:border-ink-900 hover:bg-ink-900 hover:text-linen-50"
                >
                  <PinterestIcon size={17} />
                </a>
              </div>
            </div>
          </div>

          <div data-reveal-map className="lg:col-span-7 lg:pt-4">
            <StoreMap tall />
            <p className="mt-4 text-xs leading-relaxed text-ink-900/65">
              Estacionamento conveniado na própria alameda · a seis minutos a pé do metrô Consolação.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
