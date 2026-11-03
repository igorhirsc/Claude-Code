import { useId } from 'react'
import clsx from 'clsx'
import { SPECS } from '@/three/configurator/dimensions'
import { SWATCHES, tokenVar, swatchById, type SwatchId } from '@/three/configurator/swatches'

/**
 * Shared DOM controls for the Poltrona Aurora — used by the home configurator
 * and the catalogue quick view, so both read the same swatches and the same
 * measured spec sheet (dimensions.ts). No three.js imports here.
 */

export function SwatchPicker({
  value,
  onChange,
  tone = 'light',
  size = 'md',
}: {
  value: SwatchId
  onChange: (id: SwatchId) => void
  tone?: 'light' | 'dark'
  size?: 'md' | 'sm'
}) {
  const labelId = useId()
  const current = swatchById(value)
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p id={labelId} className={clsx('eyebrow', tone === 'dark' ? 'text-linen-300' : 'text-ink-600')}>
          Tecido
        </p>
        <p aria-live="polite" className={clsx('text-sm', tone === 'dark' ? 'text-linen-100' : 'text-ink-900')}>
          <span className="font-medium">{current.name}</span>
          <span className={tone === 'dark' ? 'text-linen-300' : 'text-ink-600'}> — {current.fabric}</span>
        </p>
      </div>
      <div role="group" aria-labelledby={labelId} className="mt-4 flex flex-wrap gap-3">
        {SWATCHES.map((s) => {
          const pressed = s.id === value
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={pressed}
              aria-label={`Tecido ${s.name}`}
              title={s.name}
              onClick={() => onChange(s.id)}
              className={clsx(
                'group relative grid place-items-center rounded-full transition-transform duration-200 ease-aaa hover:-translate-y-0.5 focus-visible:-translate-y-0.5',
                size === 'sm' ? 'size-10' : 'size-12',
              )}
            >
              {/* ring: brass when chosen, hairline otherwise */}
              <span
                aria-hidden
                className={clsx(
                  'absolute inset-0 rounded-full border transition-[border-color,transform] duration-200 ease-aaa',
                  pressed
                    ? 'scale-100 border-brass-500'
                    : tone === 'dark'
                      ? 'scale-90 border-linen-50/0 group-hover:scale-100 group-hover:border-linen-50/40'
                      : 'scale-90 border-ink-900/0 group-hover:scale-100 group-hover:border-ink-900/30',
                )}
              />
              <span
                aria-hidden
                className={clsx(
                  'rounded-full shadow-[inset_0_-3px_6px_-2px_color-mix(in_oklab,var(--color-ink-900)_35%,transparent),inset_0_2px_4px_-1px_color-mix(in_oklab,var(--color-linen-50)_45%,transparent)] transition-transform duration-200 ease-aaa',
                  size === 'sm' ? 'size-7' : 'size-8',
                  pressed && 'scale-90',
                )}
                style={{ background: tokenVar(s.color) }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function SpecList({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  return (
    <dl className={clsx('grid max-w-[30rem] grid-cols-2 gap-x-8 gap-y-5', className)}>
      {SPECS.map((s) => (
        <div key={s.id} className={clsx('border-t pt-3', tone === 'dark' ? 'border-linen-50/15' : 'border-ink-900/15')}>
          <dt className={clsx('eyebrow text-[0.6875rem]', tone === 'dark' ? 'text-linen-300' : 'text-ink-600')}>{s.label}</dt>
          <dd className={clsx('mt-1.5 font-display text-2xl tabular-nums', tone === 'dark' ? 'text-linen-50' : 'text-ink-900')}>
            {s.cm}
            <span className="ml-1 font-sans text-sm">cm</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}
