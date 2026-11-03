/** Temporary stand-in for sections not yet built out. Remove once real content lands. */
export function SectionPlaceholder({ id, label, tone = 'light' }: { id: string; label: string; tone?: 'light' | 'dark' }) {
  return (
    <section
      id={id}
      className={
        tone === 'dark'
          ? 'flex min-h-[70vh] items-center justify-center bg-ink-800 text-linen-100'
          : 'flex min-h-[70vh] items-center justify-center bg-linen-100 text-ink-900'
      }
    >
      <p className="eyebrow opacity-50">{label}</p>
    </section>
  )
}
