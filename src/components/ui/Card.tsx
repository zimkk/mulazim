import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-[--color-border] bg-[--color-surface]',
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
}: {
  title: ReactNode
  count?: number
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between border-b border-[--color-border] px-4 py-2.5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-[--color-text]">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-[--color-surface-2] px-1.5 text-xs text-[--color-text-muted]">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...rest} />
}
