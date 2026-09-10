import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a hover lift + shadow. Use for cards that link somewhere. */
  hover?: boolean
  /** Elevation at rest. */
  elevation?: 'flat' | 'sm' | 'md'
}

const ELEVATION = {
  flat: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
} as const

export function Card({ className, hover = false, elevation = 'sm', ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]',
        ELEVATION[elevation],
        hover && 'card-lift cursor-pointer',
        className,
      )}
      {...rest}
    />
  )
}

export function CardHeader({
  title,
  count,
  action,
  icon,
}: {
  title: ReactNode
  count?: number
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {icon && (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            {icon}
          </span>
        )}
        <h2 className="truncate text-[0.8125rem] font-semibold tracking-tight text-[var(--color-text)]">
          {title}
        </h2>
        {count !== undefined && (
          <span className="rounded-full bg-[var(--color-surface-2)] px-1.5 text-xs font-medium text-[var(--color-text-muted)] tabular-nums">
            {count}
          </span>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...rest} />
}
