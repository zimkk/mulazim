import type { Project } from '@/types/database'
import { daysSince } from './dates'

/** Default thresholds from ARCHITECTURE.md §16. Will become user-configurable later. */
export interface StaleThresholds {
  /** <= this many days => "active" */
  active: number
  /** <= this many days => "normal" */
  normal: number
  /** <= this many days => "attention", above => "stale" */
  attention: number
}

export const DEFAULT_STALE_THRESHOLDS: StaleThresholds = {
  active: 2,
  normal: 6,
  attention: 13,
}

export type StaleLevel = 'active' | 'normal' | 'attention' | 'stale' | 'not_applicable'

export function staleLevel(
  project: Pick<Project, 'status' | 'last_activity_at'>,
  thresholds: StaleThresholds = DEFAULT_STALE_THRESHOLDS,
): StaleLevel {
  // On-hold / completed / archived projects don't generate stale warnings (§16).
  if (project.status !== 'active') return 'not_applicable'

  const days = daysSince(project.last_activity_at)
  if (days <= thresholds.active) return 'active'
  if (days <= thresholds.normal) return 'normal'
  if (days <= thresholds.attention) return 'attention'
  return 'stale'
}

export function isStale(
  project: Pick<Project, 'status' | 'last_activity_at'>,
  thresholds?: StaleThresholds,
): boolean {
  return staleLevel(project, thresholds) === 'stale'
}
