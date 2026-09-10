import { m } from '@/lib/motion'
import { cn } from '@/lib/utils/cn'

/** Horizontal completion bar. `value` is 0–1. */
export function Progress({
  value,
  className,
  tone = 'accent',
}: {
  value: number
  className?: string
  tone?: 'accent' | 'healthy' | 'attention'
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  const fill = {
    accent: 'bg-[var(--color-accent)]',
    healthy: 'bg-[var(--color-healthy)]',
    attention: 'bg-[var(--color-attention)]',
  }[tone]
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <m.div
        className={cn('h-full rounded-full', fill)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

/** Compact circular progress, good next to a title. `value` is 0–1. */
export function ProgressRing({
  value,
  size = 28,
  stroke = 3,
  className,
}: {
  value: number
  size?: number
  stroke?: number
  className?: string
}) {
  const pct = Math.min(1, Math.max(0, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className={cn('shrink-0 -rotate-90', className)} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="stroke-[var(--color-surface-3)]"
      />
      <m.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        className="stroke-[var(--color-accent)]"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - pct) }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}
