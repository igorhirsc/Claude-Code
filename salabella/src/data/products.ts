import type { CategoryId } from '@/data/categories'
import type { PaletteKey } from '@/three/configurator/swatches'
import { SPEC_SUMMARY } from '@/three/configurator/dimensions'

/**
 * SALABELLA catalogue — twelve pieces, two per category. Category ids come
 * from the shared taxonomy in CategoryIcons (CATEGORIES); colours are keys
 * of the shared palette, so every card "photo" is built from brand tokens.
 */

/** How light falls on the piece in its card photo. */
export type Finish = 'fabric' | 'wood' | 'brass' | 'ceramic' | 'glass'

/** Silhouette drawn in the card photo. */
export type Shape =
  | 'sofa'
  | 'modular'
  | 'armchair'
  | 'lounge'
  | 'table'
  | 'side-table'
  | 'shelf'
  | 'sideboard'
  | 'pendant'
  | 'lamp'
  | 'vase'
  | 'basket'

export type Badge = 'Novo' | 'Sob medida' | 'Edição limitada' | 'Em 3D'

export type Product = {
  id: string
  name: string
  category: CategoryId
  /** One editorial sentence for the card. */
  summary: string
  /** Longer copy for the quick view. */
  description: string
  materials: string[]
  dimensions: string
  leadTime: string
  finish: Finish
  shape: Shape
  tones: {
    /** Backdrop: wall (top) → floor (bottom), the card's two-stop gradient. */
    wall: PaletteKey
    floor: PaletteKey
    /** The piece itself, and its secondary material (legs, base, fittings). */
    body: PaletteKey
    accent: PaletteKey
  }
  badge?: Badge
  /** Opens the live 3D configurator in its quick view. */
  featured?: boolean
}

export const PRODUCTS: readonly Product[] = [
  {
    id: 'sofa-ibirapuera',
    name: 'Sofá Ibirapuera',
    category: 'sofas',
    summary: 'Três lugares, encosto baixo e um assento fundo para domingos longos.',
    description:
      'Desenhado para salas que recebem: assento profundo de pluma sobre espuma, almofadas soltas e uma base em freijó que deixa o sofá flutuar a dois palmos do chão.',
    materials: ['Linho lavado natural', 'Base em freijó maciço', 'Assento de pluma e espuma HR'],
    dimensions: '228 × 98 × 74 cm',
    leadTime: 'Sob encomenda · 60 dias',
    finish: 'fabric',
    shape: 'sofa',
    tones: { wall: 'linen200', floor: 'linen300', body: 'brass300', accent: 'clay600' },
    badge: 'Novo',
  },
  {
    id: 'sofa-restinga',
    name: 'Sofá Restinga',
    category: 'sofas',
    summary: 'Módulos em bouclé que se rearranjam como dunas — em L, em U ou soltos.',
    description:
      'Cinco módulos independentes em bouclé de lã, unidos por engates ocultos. Monte em L para a sala de TV, desmonte em ilhas quando a casa estiver cheia.',
    materials: ['Bouclé de lã cor areia', 'Estrutura em eucalipto certificado', 'Engates em aço escovado'],
    dimensions: '312 × 104 × 68 cm (em L)',
    leadTime: 'Sob medida · 75 dias',
    finish: 'fabric',
    shape: 'modular',
    tones: { wall: 'moss500', floor: 'moss600', body: 'linen200', accent: 'ink700' },
    badge: 'Sob medida',
  },
  {
    id: 'poltrona-aurora',
    name: 'Poltrona Aurora',
    category: 'poltronas',
    summary: 'Braços que abraçam, encosto na medida da lombar. Escolha o tecido em 3D.',
    description:
      'Braços largos, um encosto inclinado na medida da lombar e o assento solto, de pluma sobre espuma de alta resiliência. Estofada à mão em São Paulo, chega no tecido que você escolher — e envelhece bonita com ele.',
    materials: ['Cinco tecidos à escolha', 'Pés torneados em freijó maciço', 'Ponteiras e anéis de latão'],
    dimensions: SPEC_SUMMARY,
    leadTime: 'Sob encomenda · 45 dias',
    finish: 'fabric',
    shape: 'armchair',
    tones: { wall: 'linen100', floor: 'linen300', body: 'clay500', accent: 'clay600' },
    badge: 'Em 3D',
    featured: true,
  },
  {
    id: 'poltrona-varanda',
    name: 'Poltrona Varanda',
    category: 'poltronas',
    summary: 'Couro caramelo em tira larga sobre um quadro baixo de freijó.',
    description:
      'Uma poltrona de leitura para a varanda ou para o canto da janela: o couro curtido ao vegetal assenta com o corpo e ganha pátina, e o quadro em freijó é encaixado sem parafusos aparentes.',
    materials: ['Couro curtido ao vegetal', 'Quadro em freijó maciço', 'Encaixes em cavilha'],
    dimensions: '72 × 86 × 70 cm',
    leadTime: 'Sob encomenda · 50 dias',
    finish: 'wood',
    shape: 'lounge',
    tones: { wall: 'ink700', floor: 'ink800', body: 'brass400', accent: 'clay600' },
  },
  {
    id: 'mesa-pinheiros',
    name: 'Mesa Pinheiros',
    category: 'mesas',
    summary: 'Jantar para oito em freijó maciço, com encaixes de marcenaria à vista.',
    description:
      'Tampo de 4 cm em tábuas de freijó selecionadas uma a uma, pés em trapézio e encaixes em rabo-de-andorinha deixados à vista — a marcenaria é o ornamento.',
    materials: ['Freijó maciço', 'Acabamento em óleo e cera de carnaúba', 'Encaixes rabo-de-andorinha'],
    dimensions: '240 × 100 × 76 cm',
    leadTime: 'Sob medida · 60 dias',
    finish: 'wood',
    shape: 'table',
    tones: { wall: 'cream', floor: 'linen300', body: 'clay600', accent: 'ink600' },
    badge: 'Sob medida',
  },
  {
    id: 'mesa-seixo',
    name: 'Mesa Lateral Seixo',
    category: 'mesas',
    summary: 'Tampo de cerâmica esmaltada, redondo como pedra de rio, sobre latão.',
    description:
      'O tampo é torneado e esmaltado por ceramistas de Cunha; cada queima deixa um brilho próprio. A base em latão maciço recebe o tampo por gravidade, sem cola.',
    materials: ['Cerâmica esmaltada de alta temperatura', 'Base em latão maciço escovado'],
    dimensions: 'Ø 48 × 52 cm',
    leadTime: 'Pronta entrega · 15 dias',
    finish: 'ceramic',
    shape: 'side-table',
    tones: { wall: 'clay400', floor: 'clay600', body: 'linen50', accent: 'brass400' },
    badge: 'Edição limitada',
  },
  {
    id: 'estante-vila-madalena',
    name: 'Estante Vila Madalena',
    category: 'estantes',
    summary: 'Prateleiras em imbuia escurecida, ritmadas para livros e cerâmica.',
    description:
      'Montantes delgados e prateleiras de alturas alternadas — uma estante que pede coleção, não enchimento. Feita sob medida para o vão da sua parede.',
    materials: ['Imbuia de reflorestamento', 'Montantes com mão-francesa de latão', 'Fixação oculta'],
    dimensions: '180 × 38 × 210 cm',
    leadTime: 'Sob medida · 70 dias',
    finish: 'wood',
    shape: 'shelf',
    tones: { wall: 'brass200', floor: 'brass300', body: 'ink600', accent: 'brass400' },
  },
  {
    id: 'aparador-taipa',
    name: 'Aparador Taipa',
    category: 'estantes',
    summary: 'Laca terracota em seis demãos e puxadores de latão torneado.',
    description:
      'Quatro portas em laca acetinada cor de taipa de pilão, lixada à mão entre cada uma das seis demãos. Puxadores torneados em latão, um a um.',
    materials: ['MDF naval em laca acetinada', 'Puxadores em latão torneado', 'Pés em freijó'],
    dimensions: '200 × 45 × 78 cm',
    leadTime: 'Sob encomenda · 55 dias',
    finish: 'ceramic',
    shape: 'sideboard',
    tones: { wall: 'linen100', floor: 'linen300', body: 'clay500', accent: 'brass400' },
    badge: 'Novo',
  },
  {
    id: 'pendente-cupula',
    name: 'Pendente Cúpula',
    category: 'iluminacao',
    summary: 'Cúpula em latão repuxado à mão, luz baixa e quente sobre a mesa.',
    description:
      'Repuxada em torno a partir de um único disco de latão, a cúpula concentra a luz para baixo e brilha por fora com o reflexo da sala. Acabamento escovado, sem verniz: ele escurece com o tempo.',
    materials: ['Latão repuxado e escovado', 'Cabo têxtil', 'LED 2700 K regulável'],
    dimensions: 'Ø 42 × 26 cm',
    leadTime: 'Pronta entrega · 10 dias',
    finish: 'brass',
    shape: 'pendant',
    tones: { wall: 'ink800', floor: 'ink900', body: 'brass400', accent: 'brass200' },
  },
  {
    id: 'luminaria-lume',
    name: 'Luminária Lume',
    category: 'iluminacao',
    summary: 'Globo de vidro soprado âmbar sobre uma haste fina de latão.',
    description:
      'O globo é soprado por vidreiros de Campo Largo e nenhum é igual ao outro: pequenas bolhas e variações de espessura fazem a luz vibrar sobre a mesa.',
    materials: ['Vidro soprado âmbar', 'Haste e base em latão', 'Dimmer no cabo'],
    dimensions: 'Ø 22 × 46 cm',
    leadTime: 'Sob encomenda · 30 dias',
    finish: 'glass',
    shape: 'lamp',
    tones: { wall: 'moss600', floor: 'ink800', body: 'brass200', accent: 'brass500' },
    badge: 'Edição limitada',
  },
  {
    id: 'vaso-jalapao',
    name: 'Vaso Jalapão',
    category: 'decoracao',
    summary: 'Cerâmica de torno em verde-musgo, com hastes de capim dourado.',
    description:
      'Torneado e esmaltado em verde-musgo, o vaso vem com um feixe de capim dourado colhido no Jalapão por artesãs da comunidade de Mumbuca, no Tocantins.',
    materials: ['Cerâmica de torno esmaltada', 'Capim dourado do Jalapão'],
    dimensions: 'Ø 24 × 38 cm',
    leadTime: 'Pronta entrega · 7 dias',
    finish: 'ceramic',
    shape: 'vase',
    tones: { wall: 'linen200', floor: 'linen300', body: 'moss500', accent: 'brass400' },
  },
  {
    id: 'cesto-trama',
    name: 'Cesto Trama',
    category: 'decoracao',
    summary: 'Capim dourado trançado em espiral, costurado com seda de buriti.',
    description:
      'Cada cesto leva dias de trançado em espiral e costura com seda de buriti. Serve a mantas, revistas ou simplesmente à luz da tarde, que ele devolve dourada.',
    materials: ['Capim dourado trançado', 'Costura em seda de buriti'],
    dimensions: 'Ø 40 × 34 cm',
    leadTime: 'Pronta entrega · 7 dias',
    finish: 'fabric',
    shape: 'basket',
    tones: { wall: 'clay500', floor: 'clay600', body: 'brass300', accent: 'brass500' },
    badge: 'Novo',
  },
]

export const FEATURED_PRODUCT_ID = 'poltrona-aurora'

export const productById = (id: string | null | undefined) => (id ? PRODUCTS.find((p) => p.id === id) : undefined)
