import Hero from '@/components/sections/Hero'
import Contact from '@/components/sections/Contact'
import Collections from '@/components/sections/Collections'
import Configurator from '@/components/sections/Configurator'
import BrandStory from '@/components/sections/BrandStory'

export default function Home() {
  return (
    <>
      <Hero />
      <Collections />
      <Configurator />
      <BrandStory />
      <Contact />
    </>
  )
}
