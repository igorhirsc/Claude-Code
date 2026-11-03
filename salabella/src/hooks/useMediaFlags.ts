import { useEffect, useRef, useState } from 'react'

function useMatchMedia(query: string, initial = false) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? initial : window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export const useReducedMotion = () => useMatchMedia('(prefers-reduced-motion: reduce)')
export const useIsCoarsePointer = () => useMatchMedia('(pointer: coarse)')
// 767.98px (not 768px) so this flips in lockstep with Tailwind's `md:`
// variant (`min-width: 768px`) — both are inclusive at their boundary, so a
// plain 768px cutoff here would double-count that exact width and desync
// any layout math that assumes "isSmall" and "md:" never disagree.
export const useIsSmallViewport = () => useMatchMedia('(max-width: 767.98px)')

/** Combined signal: should this view render the heavy/interactive 3D path? */
export function usePerfTier(): 'full' | 'lite' {
  const reduced = useReducedMotion()
  const small = useIsSmallViewport()
  return reduced || small ? 'lite' : 'full'
}

/**
 * Two visibility signals for a 3D section:
 * - `everInView` flips true once the element nears the viewport and stays
 *   true, so the Canvas mounts once (no remount / shader recompile cost).
 * - `inView` tracks live visibility, so the Canvas can switch to
 *   `frameloop="demand"` and stop rendering when scrolled away.
 */
export function useSectionVisibility<T extends HTMLElement>(rootMargin = '250px') {
  const ref = useRef<T | null>(null)
  const [everInView, setEverInView] = useState(false)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        const hit = !!entries[0]?.isIntersecting
        setInView(hit)
        if (hit) setEverInView(true)
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  return { ref, everInView, inView }
}
