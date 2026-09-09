import type { ProjectWithStats } from '@/types/database'
import { daysUntil } from './dates'
import { DEFAULT_STALE_THRESHOLDS, staleLevel, type StaleThresholds } from './staleness'

/** Derived project health (ARCHITECTURE.md §15). Never stored. */
export type ProjectHealth =
  | 'healthy'
  | 'attention'
  | 'stale'
  | 'overdue'
  | 'completed'
  | 'on_hold'
  | 'archived'

export interface HealthResult {
  health: ProjectHealth
  label: string
  reasons: string[]
}

const LABELS: Record<ProjectHealth, string> = {
  healthy: 'Healthy',
  attention: 'Attention needed',
  stale: 'Stale',
  overdue: 'Overdue',
  completed: 'Completed',
  on_hold: 'On hold',
  archived: 'Archived',
}

export function projectHealth(
  project: Pick<
    ProjectWithStats,
    'status' | 'last_activity_at' | 'deadline' | 'priority' | 'open_task_count' | 'overdue_task_count'
  >,
  thresholds: StaleThresholds = DEFAULT_STALE_THRESHOLDS,
): HealthResult {
  const reasons: string[] = []

  if (project.status === 'completed') return done('completed', reasons)
  if (project.status === 'archived') return done('archived', reasons)
  if (project.status === 'on_hold') return done('on_hold', reasons)

  const deadlineDays = daysUntil(project.deadline)
  if (deadlineDays !== null && deadlineDays < 0) {
    reasons.push(`Deadline passed ${Math.abs(deadlineDays)}d ago`)
  }
  if (project.overdue_task_count > 0) {
    reasons.push(
      `${project.overdue_task_count} overdue task${project.overdue_task_count === 1 ? '' : 's'}`,
    )
  }
  if ((deadlineDays !== null && deadlineDays < 0) || project.overdue_task_count > 0) {
    return build('overdue', reasons)
  }

  const stale = staleLevel(project, thresholds)
  if (stale === 'stale') {
    reasons.push('No activity for 14+ days')
    return build('stale', reasons)
  }

  if (deadlineDays !== null && deadlineDays <= 3) {
    reasons.push(
      deadlineDays === 0 ? 'Deadline today' : `Deadline in ${deadlineDays}d`,
    )
  }
  if (stale === 'attention') {
    reasons.push('Getting quiet — 7+ days since activity')
  }
  if ((project.priority === 'high' || project.priority === 'urgent') && project.open_task_count > 0) {
    reasons.push(`${project.priority} priority with open work`)
  }

  if (reasons.length > 0) return build('attention', reasons)

  reasons.push('On track')
  return build('healthy', reasons)
}

function build(health: ProjectHealth, reasons: string[]): HealthResult {
  return { health, label: LABELS[health], reasons }
}

function done(health: ProjectHealth, reasons: string[]): HealthResult {
  return { health, label: LABELS[health], reasons }
}
