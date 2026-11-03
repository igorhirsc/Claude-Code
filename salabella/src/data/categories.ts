/**
 * Catalogue categories — the single taxonomy shared by the home Collections
 * cards, the /colecoes filters, the product data and the footer links.
 * Kept free of three.js imports so pages that only need labels don't pull
 * the 3D stack into the main bundle.
 */
export type CategoryId = 'sofas' | 'poltronas' | 'mesas' | 'estantes' | 'iluminacao' | 'decoracao'

export type Category = {
  id: CategoryId
  label: string
  description: string
}

export const CATEGORIES: readonly Category[] = [
  { id: 'sofas', label: 'Sofás', description: 'Linhas baixas, assento profundo e estrutura em madeira maciça.' },
  { id: 'poltronas', label: 'Poltronas', description: 'Volumes macios em bouclé e linho, feitos para ler devagar.' },
  { id: 'mesas', label: 'Mesas', description: 'Tampos em freijó e encaixes de marcenaria deixados à vista.' },
  { id: 'estantes', label: 'Estantes', description: 'Marcenaria sob medida para livros, cerâmicas e memórias.' },
  { id: 'iluminacao', label: 'Iluminação', description: 'Latão escovado e cúpulas laqueadas para uma luz baixa e quente.' },
  { id: 'decoracao', label: 'Decoração', description: 'Cerâmica de torno e capim dourado do Jalapão, peça a peça.' },
] as const
