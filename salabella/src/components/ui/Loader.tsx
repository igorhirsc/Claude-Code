import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

/**
 * Preloader: brass rule draws in, wordmark letters rise, then the whole
 * panel wipes up. Gives the 3D scenes underneath time to compile shaders
 * before they're revealed, which avoids an ugly first-paint pop-in.
 */
export function Loader({ onDone }: { onDone?: () => void }) {
  const [visible, setVisible] = useState(true)
  const root = useRef<HTMLDivElement>(null)
  const ruleRef = useRef<HTMLDivElement>(null)
  const lettersRef = useRef<HTMLDivElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false)
      onDoneRef.current?.()
      return
    }

    const letters = lettersRef.current?.querySelectorAll('span') ?? []
    const tl = gsap.timeline({
      onComplete: () => {
        setVisible(false)
        onDoneRef.current?.()
      },
    })

    tl.set(letters, { y: '110%' })
      .fromTo(ruleRef.current, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power3.inOut' })
      .to(letters, { y: '0%', duration: 0.9, stagger: 0.035, ease: 'power4.out' }, '-=0.35')
      .to({}, { duration: 0.45 })
      .to(root.current, { yPercent: -100, duration: 0.9, ease: 'power4.inOut' })

    return () => {
      tl.kill()
    }
  }, [])

  if (!visible) return null

  return (
    <div ref={root} className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-6 bg-ink-900" aria-hidden>
      <div ref={lettersRef} className="flex overflow-hidden">
        {'SALABELLA'.split('').map((ch, i) => (
          <span key={i} className="font-display block text-4xl text-linen-50 md:text-6xl">
            {ch}
          </span>
        ))}
      </div>
      <div ref={ruleRef} className="h-px w-40 origin-left bg-brass-400" />
    </div>
  )
}
