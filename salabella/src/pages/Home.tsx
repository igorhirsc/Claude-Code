import { SectionPlaceholder } from '@/components/ui/SectionPlaceholder'

export default function Home() {
  return (
    <>
      <SectionPlaceholder id="hero" label="Hero" />
      <SectionPlaceholder id="colecoes" label="Coleções" tone="dark" />
      <SectionPlaceholder id="configurador" label="Configurador" />
      <SectionPlaceholder id="atelier" label="Ateliê" tone="dark" />
      <SectionPlaceholder id="contato" label="Contato" />
    </>
  )
}
