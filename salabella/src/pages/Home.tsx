import { SectionPlaceholder } from '@/components/ui/SectionPlaceholder'
import Hero from '@/components/sections/Hero'
import Contact from '@/components/sections/Contact'
import Collections from '@/components/sections/Collections'
import Configurator from '@/components/sections/Configurator'

export default function Home() {
  return (
    <>
      <Hero />
      <Collections />
      <Configurator />
      <SectionPlaceholder id="atelier" label="Ateliê" tone="dark" />
      <Contact />
    </>
  )
}
