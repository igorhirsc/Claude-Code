import { SectionPlaceholder } from '@/components/ui/SectionPlaceholder'
import Contact from '@/components/sections/Contact'
import Collections from '@/components/sections/Collections'

export default function Home() {
  return (
    <>
      <SectionPlaceholder id="hero" label="Hero" />
      <Collections />
      <SectionPlaceholder id="configurador" label="Configurador" />
      <SectionPlaceholder id="atelier" label="Ateliê" tone="dark" />
      <Contact />
    </>
  )
}
