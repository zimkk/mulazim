import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import type { ProjectHealth } from '@/lib/utils/health'

type Tone = 'neutral' | 'healthy' | 'attention' | 'stale' | 'overdue' | 'onhold' | 'info' | 'accent'

const TONES: Record<Tone, { chip: string; dot: string }> = {
  neutral: { chip: 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] ring-[var(--color-border)]', dot: 'bg-[var(--color-text-subtle)]' },
  healthy: { chip: 'bg-[var(--color-healthy)]/12 text-[var(--color-healthy)] ring-[var(--color-healthy)]/20', dot: 'bg-[var(--color-healthy)]' },
  attention: { chip: 'bg-[var(--color-attention)]/12 text-[var(--color-attention)] ring-[var(--color-attention)]/20', dot: 'bg-[var(--color-attention)]' },
  stale: { chip: 'bg-[var(--color-stale)]/12 text-[var(--color-stale)] ring-[var(--color-stale)]/20', dot: 'bg-[var(--color-stale)]' },
  overdue: { chip: 'bg-[var(--color-overdue)]/12 text-[var(--color-overdue)] ring-[var(--color-overdue)]/20', dot: 'bg-[var(--color-overdue)]' },
  onhold: { chip: 'bg-[var(--color-onhold)]/12 text-[var(--color-onhold)] ring-[var(--color-onhold)]/20', dot: 'bg-[var(--color-onhold)]' },
  info: { chip: 'bg-[var(--color-info)]/12 text-[var(--color-info)] ring-[var(--color-info)]/20', dot: 'bg-[var(--color-info)]' },
  accent: { chip: 'bg-[var(--color-accent)]/12 text-[var(--color-accent)] ring-[var(--color-accent)]/20', dot: 'bg-[var(--color-accent)]' },
}

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className,
}: {
  children: ReactNode
  tone?: Tone
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap ring-1 ring-inset',
        TONES[tone].chip,
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', TONES[tone].dot)} />}
      {children}
    </span>
  )
}

const HEALTH_TONE: Record<ProjectHealth, Tone> = {
  healthy: 'healthy',
  attention: 'attention',
  stale: 'stale',
  overdue: 'overdue',
  completed: 'info',
  on_hold: 'onhold',
  archived: 'neutral',
}

export function HealthBadge({ health, label }: { health: ProjectHealth; label: string }) {
  return (
    <Badge tone={HEALTH_TONE[health]} dot>
      {label}
    </Badge>
  )
}

const PRIORITY_TONE: Record<string, Tone> = {
  urgent: 'overdue',
  high: 'attention',
  medium: 'info',
  low: 'neutral',
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge tone={PRIORITY_TONE[priority] ?? 'neutral'}>{priority}</Badge>
}
