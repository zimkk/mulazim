import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import type { ProjectHealth } from '@/lib/utils/health'

type Tone = 'neutral' | 'healthy' | 'attention' | 'stale' | 'overdue' | 'onhold' | 'info' | 'accent'

const TONES: Record<Tone, string> = {
  neutral: 'bg-[--color-surface-2] text-[--color-text-muted]',
  healthy: 'bg-[--color-healthy]/12 text-[--color-healthy]',
  attention: 'bg-[--color-attention]/12 text-[--color-attention]',
  stale: 'bg-[--color-stale]/12 text-[--color-stale]',
  overdue: 'bg-[--color-overdue]/12 text-[--color-overdue]',
  onhold: 'bg-[--color-onhold]/12 text-[--color-onhold]',
  info: 'bg-[--color-info]/12 text-[--color-info]',
  accent: 'bg-[--color-accent]/12 text-[--color-accent]',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
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
  return <Badge tone={HEALTH_TONE[health]}>{label}</Badge>
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
