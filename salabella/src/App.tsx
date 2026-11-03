import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Loader } from '@/components/ui/Loader'
import { Cursor } from '@/components/ui/Cursor'
import { useLenis } from '@/hooks/useLenis'
import Home from '@/pages/Home'
import Colecoes from '@/pages/Colecoes'
import Sobre from '@/pages/Sobre'
import Contato from '@/pages/Contato'

export default function App() {
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  useLenis()

  return (
    <>
      {loading && <Loader onDone={() => setLoading(false)} />}
      <Header />
      <main key={location.pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/colecoes" element={<Colecoes />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/contato" element={<Contato />} />
        </Routes>
      </main>
      <Footer />
      <Cursor />
    </>
  )
}
