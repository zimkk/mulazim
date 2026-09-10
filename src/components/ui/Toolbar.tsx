import type { InputHTMLAttributes } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/** Search field with a leading icon and a clear button. */
export function SearchInput({
  value,
  onValueChange,
  className,
  ...rest
}: {
  value: string
  onValueChange: (v: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--color-text-subtle)]" />
      <input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          'h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pr-8 pl-9 text-sm text-[var(--color-text)] shadow-xs',
          'transition-colors placeholder:text-[var(--color-text-subtle)] focus-visible:border-[var(--color-accent)]',
          'focus-visible:outline-0 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/25',
        )}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-text)]"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/** Pill filter row with an animated active indicator. */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count?: number }[]
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {options.map((o) => {
        const isActive = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150',
              isActive
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  'tabular-nums',
                  isActive ? 'text-[var(--color-accent-fg)]/70' : 'text-[var(--color-text-subtle)]',
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
