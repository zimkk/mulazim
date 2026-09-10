import { useEffect, useState, type ReactNode } from 'react'
import { animate } from 'motion'
import { m, useReduce } from '@/lib/motion'
import { cn } from '@/lib/utils/cn'

type Tone = 'neutral' | 'accent' | 'healthy' | 'attention' | 'stale'

const TONE_RING: Record<Tone, string> = {
  neutral: 'text-[var(--color-text-muted)] bg-[var(--color-surface-2)] ring-[var(--color-border)]',
  accent: 'text-[var(--color-accent)] bg-[var(--color-accent)]/10 ring-[var(--color-accent)]/20',
  healthy: 'text-[var(--color-healthy)] bg-[var(--color-healthy)]/10 ring-[var(--color-healthy)]/20',
  attention: 'text-[var(--color-attention)] bg-[var(--color-attention)]/10 ring-[var(--color-attention)]/20',
  stale: 'text-[var(--color-stale)] bg-[var(--color-stale)]/10 ring-[var(--color-stale)]/20',
}

/** Animated integer that counts up from 0 on mount / when `value` changes. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReduce()
  const [display, setDisplay] = useState(reduce ? value : 0)

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [value, reduce])

  return <span className={cn('tabular-nums', className)}>{display}</span>
}

export function Stat({
  label,
  value,
  icon,
  tone = 'neutral',
  hint,
  onClick,
}: {
  label: string
  value: number
  icon: ReactNode
  tone?: Tone
  hint?: string
  onClick?: () => void
}) {
  const Comp = onClick ? m.button : m.div
  return (
    <Comp
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
      onClick={onClick}
      whileHover={{ y: -2 }}
      className={cn(
        'card-lift flex w-full items-center gap-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left shadow-sm',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
          TONE_RING[tone],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xl font-semibold leading-none tracking-tight text-[var(--color-text)]">
          <CountUp value={value} />
        </div>
        <div className="mt-1 truncate text-xs font-medium text-[var(--color-text-muted)]">{label}</div>
        {hint && <div className="mt-0.5 truncate text-[0.6875rem] text-[var(--color-text-subtle)]">{hint}</div>}
      </div>
    </Comp>
  )
}
