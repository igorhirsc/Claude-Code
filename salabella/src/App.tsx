import { useLayoutEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Loader } from '@/components/ui/Loader'
import { Cursor } from '@/components/ui/Cursor'
import { scrollTo, useLenis } from '@/hooks/useLenis'
import Home from '@/pages/Home'
import Colecoes from '@/pages/Colecoes'
import Sobre from '@/pages/Sobre'
import Contato from '@/pages/Contato'

/** Gap kept between a hash target and the top of the viewport (clears the fixed header). */
const HASH_OFFSET = -100

/**
 * Route changes start at the top of the new page (Lenis keeps its own scroll
 * position, so the native reset alone is not enough). A URL hash scrolls to
 * its target once the new page has mounted. Query-only changes (catalog
 * filters) keep the visitor where they are.
 */
function ScrollToTop() {
  const { pathname, hash, key, state } = useLocation()
  // Links that change only the query (footer → /colecoes?categoria=…) opt in.
  const forced = (state as { resetScroll?: boolean } | null)?.resetScroll ? key : ''
  const lastPath = useRef<string | null>(null)

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  }, [])

  useLayoutEffect(() => {
    let raf = 0
    let settle = 0
    let tries = 0
    // Same page, new hash (e.g. a footer link to a section of /sobre while
    // already on /sobre): glide there instead of jumping.
    const samePage = lastPath.current === pathname && !forced
    lastPath.current = pathname
    if (!hash) {
      scrollTo(0, { immediate: true })
      window.scrollTo({ top: 0, behavior: 'instant' })
      raf = requestAnimationFrame(() => {
        scrollTo(0, { immediate: true })
        ScrollTrigger.refresh()
      })
      return () => cancelAnimationFrame(raf)
    }

    let id = hash.slice(1)
    try {
      id = decodeURIComponent(id)
    } catch {
      /* keep the raw id */
    }
    // The new page may still be laying out: retry for a few frames.
    const seek = () => {
      const el = document.getElementById(id)
      if (el) {
        ScrollTrigger.refresh()
        scrollTo(el, { offset: HASH_OFFSET, immediate: !samePage })
        // Pin spacers and late layout (fonts, reveals) can shift the target
        // after the first jump: settle once more.
        if (!samePage) settle = window.setTimeout(() => scrollTo(el, { offset: HASH_OFFSET, immediate: true }), 350)
        return
      }
      if (++tries < 30) raf = requestAnimationFrame(seek)
    }
    if (!samePage) scrollTo(0, { immediate: true })
    raf = requestAnimationFrame(seek)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(settle)
    }
  }, [pathname, hash, forced])

  return null
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  useLenis()

  return (
    <>
      <ScrollToTop />
      {loading && <Loader onDone={() => setLoading(false)} />}
      <Header inert={loading} />
      <main key={location.pathname} inert={loading}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/colecoes" element={<Colecoes />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/contato" element={<Contato />} />
        </Routes>
      </main>
      <Footer inert={loading} />
      <Cursor />
    </>
  )
}
