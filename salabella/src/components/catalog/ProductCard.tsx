import clsx from 'clsx'
import type { Product } from '@/data/products'
import { CATEGORIES } from '@/data/categories'
import { tokenVar } from '@/three/configurator/swatches'
import { ArrowUpRightIcon, CheckIcon } from '@/components/ui/icons'
import { ProductPhoto } from './ProductPhoto'
import { BADGE, scrimFor } from './contrast'

const categoryLabel = (id: Product['category']) => CATEGORIES.find((c) => c.id === id)?.label ?? ''

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} aria-hidden focusable={false}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" strokeLinejoin="round" />
  </svg>
)

export function CategoryPill({ product, className }: { product: Product; className?: string }) {
  const s = scrimFor(product.tones.wall)
  return (
    <span
      data-contrast={s.ratio.toFixed(2)}
      className={clsx('eyebrow inline-flex items-center rounded-full px-3 py-1.5 text-[0.6875rem] backdrop-blur-sm', className)}
      style={{ background: `color-mix(in oklab, ${tokenVar(s.bg)} ${Math.round(s.alpha * 100)}%, transparent)`, color: tokenVar(s.text) }}
    >
      {categoryLabel(product.category)}
    </span>
  )
}

export function ProductBadge({ badge, className }: { badge: NonNullable<Product['badge']>; className?: string }) {
  return (
    <span
      data-contrast={BADGE.ratio.toFixed(2)}
      className={clsx('eyebrow inline-flex items-center rounded-full px-3 py-1.5 text-[0.6875rem]', className)}
      style={{ background: tokenVar(BADGE.bg), color: tokenVar(BADGE.text) }}
    >
      {badge}
    </span>
  )
}

type ProductCardProps = {
  product: Product
  saved: boolean
  onToggleSave: () => void
  onOpen: (trigger: HTMLElement) => void
}

/**
 * Catalogue card. The title is the card's single primary control (a real
 * button, stretched over the photo), the heart is a separate toggle on top.
 */
export function ProductCard({ product, saved, onToggleSave, onOpen }: ProductCardProps) {
  const titleId = `produto-${product.id}`
  return (
    <article aria-labelledby={titleId} className="group relative flex h-full flex-col">
      <ProductPhoto product={product} className="aspect-[4/5] w-full">
        <div className="absolute inset-x-4 top-4 z-[6] flex items-start justify-between gap-3">
          <CategoryPill product={product} />
          {product.badge && <ProductBadge badge={product.badge} />}
        </div>
        {product.featured && (
          <span className="eyebrow absolute bottom-4 left-4 z-[6] inline-flex items-center gap-2 rounded-full bg-ink-900/85 px-3.5 py-2 text-[0.6875rem] text-linen-50 backdrop-blur-sm">
            <span aria-hidden className="size-1.5 rounded-full bg-brass-300" />
            Configure em 3D
          </span>
        )}
      </ProductPhoto>
      <span
        aria-hidden
        className="block h-px w-full origin-left scale-x-0 bg-brass-400 transition-transform duration-[250ms] ease-aaa group-focus-within:scale-x-100 group-hover:scale-x-100"
      />

      <div className="flex flex-1 flex-col pt-5">
        <div className="flex items-start justify-between gap-4">
          <h3 id={titleId} className="font-display text-2xl leading-tight text-ink-900">
            <button
              type="button"
              onClick={(e) => onOpen(e.currentTarget)}
              aria-haspopup="dialog"
              className="text-left after:absolute after:inset-0 after:z-[5] after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-clay-500"
            >
              {product.name}
            </button>
          </h3>
          <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? `Remover ${product.name} da lista` : `Salvar ${product.name} na lista`}
            onClick={onToggleSave}
            className={clsx(
              'relative z-[7] -mt-1 grid size-10 shrink-0 place-items-center rounded-full border transition-colors duration-200',
              saved ? 'border-clay-600 bg-clay-600 text-linen-50' : 'border-ink-900/20 text-ink-900 hover:border-ink-900',
            )}
          >
            {saved ? <CheckIcon size={16} /> : <HeartIcon filled={false} />}
          </button>
        </div>
        <p className="mt-2 max-w-[44ch] text-[0.9375rem] leading-relaxed text-ink-700">{product.summary}</p>
        <div className="mt-auto flex items-center justify-between gap-4 pt-5 text-sm text-ink-600">
          <span className="tabular-nums">{product.dimensions}</span>
          <span className="eyebrow inline-flex items-center gap-1.5 text-[0.6875rem] text-ink-900">
            {product.featured ? 'Personalizar' : 'Ver detalhes'}
            <span className="transition-transform duration-200 ease-aaa group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRightIcon size={14} />
            </span>
          </span>
        </div>
      </div>
    </article>
  )
}
