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
        'flex gap-4 border-b border-[--color-border] py-3 last:border-b-0',
        stacked ? 'flex-col' : 'items-center justify-between',
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[--color-text]">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-[--color-text-muted]">{description}</p>
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
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-[--color-accent]' : 'bg-[--color-surface-2] border border-[--color-border]',
      )}
    >
      <span
        className={cn(
          'inline-block size-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
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
    <div className="inline-flex rounded-md border border-[--color-border] bg-[--color-surface] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded px-2.5 py-1 text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-[--color-accent] text-[--color-accent-fg]'
              : 'text-[--color-text-muted] hover:text-[--color-text]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
