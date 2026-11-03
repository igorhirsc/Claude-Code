import Hero from '@/components/sections/Hero'
import Contact from '@/components/sections/Contact'
import Collections from '@/components/sections/Collections'
import Configurator from '@/components/sections/Configurator'
import BrandStory from '@/components/sections/BrandStory'

/**
 * `data-header` tells the fixed Header which tone sits under it (light =
 * cream background, dark = ink). BrandStory and Contact carry it on their own
 * <section>; the 3D sections are wrapped here so their files stay untouched.
 */
export default function Home() {
  return (
    <>
      <div data-header="light">
        <Hero />
      </div>
      <div data-header="dark">
        <Collections />
      </div>
      <div data-header="light">
        <Configurator />
      </div>
      <BrandStory />
      <Contact />
    </>
  )
}
