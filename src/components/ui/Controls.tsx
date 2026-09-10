import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/** A labelled row in a settings pane: title + optional description on the left, control on the right. */
export function SettingRow({
  title,
  description,
  control,
  stacked = false,
}: {
  title: string
  description?: ReactNode
  control: ReactNode
  stacked?: boolean
}) {
  return (
    <div
      className={cn(
        'flex gap-4 border-b border-[var(--color-border)] py-3 last:border-b-0',
        stacked ? 'flex-col' : 'items-center justify-between',
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>
        )}
      </div>
      <div className={cn(stacked ? '' : 'shrink-0')}>{control}</div>
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[1.375rem] w-10 shrink-0 items-center rounded-full transition-colors',
        checked
          ? 'bg-[var(--color-accent)]'
          : 'border border-[var(--color-border-strong)] bg-[var(--color-surface-2)]',
      )}
    >
      <span
        className={cn(
          'inline-block size-[1.125rem] rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
          checked ? 'translate-x-[1.25rem]' : 'translate-x-[0.1875rem]',
        )}
      />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
}) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5">
      {options.map((o) => {
        const isActive = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
              isActive
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
