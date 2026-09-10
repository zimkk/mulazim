import type { Task, TaskWithProject } from '@/types/database'

/**
 * History-based estimate suggestion.
 *
 * Uses what past work actually took (`actual_minutes`, maintained by the
 * timer) rather than what was guessed at the time, so the suggestion improves
 * as real time gets logged. Deliberately a *suggestion* — never written
 * automatically, because a wrong auto-filled number is worse than an empty one.
 */

export interface EstimateSuggestion {
  minutes: number
  /** How many finished tasks the number is drawn from. */
  sampleSize: number
  /** Plain-language basis, shown to the user so the number isn't magic. */
  basis: string
}

/** Median resists the one task that took a whole day; a mean would not. */
function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2)
}

/** Round to something a human would actually type: 5m steps, then 15m past an hour. */
function humanize(minutes: number): number {
  if (minutes <= 60) return Math.max(5, Math.round(minutes / 5) * 5)
  return Math.round(minutes / 15) * 15
}

/**
 * Suggest an estimate for a new task.
 *
 * Prefers the narrowest evidence available: tasks sharing a tag, then the same
 * project, then anything finished. A narrower sample is more relevant even
 * when it is smaller, so the first tier with enough data wins.
 */
export function suggestEstimate(
  candidates: (Task | TaskWithProject)[],
  opts: { projectId?: string | null; tagIds?: string[]; tagMap?: Map<string, { id: string }[]> } = {},
): EstimateSuggestion | null {
  const finished = candidates.filter(
    (t) => t.status === 'done' && typeof t.actual_minutes === 'number' && t.actual_minutes! > 0,
  )
  if (finished.length === 0) return null

  const minutesOf = (list: typeof finished) => list.map((t) => t.actual_minutes!)

  // Tier 1 — tasks that shared a tag with this one.
  const { tagIds = [], tagMap, projectId } = opts
  if (tagIds.length && tagMap) {
    const tagged = finished.filter((t) =>
      (tagMap.get(t.id) ?? []).some((tag) => tagIds.includes(tag.id)),
    )
    if (tagged.length >= 3) {
      return {
        minutes: humanize(median(minutesOf(tagged))),
        sampleSize: tagged.length,
        basis: `${tagged.length} similar tagged tasks`,
      }
    }
  }

  // Tier 2 — same project.
  if (projectId) {
    const sameProject = finished.filter((t) => t.project_id === projectId)
    if (sameProject.length >= 3) {
      return {
        minutes: humanize(median(minutesOf(sameProject))),
        sampleSize: sameProject.length,
        basis: `${sameProject.length} finished tasks in this project`,
      }
    }
  }

  // Tier 3 — everything finished. Needs more evidence to be worth showing.
  if (finished.length >= 5) {
    return {
      minutes: humanize(median(minutesOf(finished))),
      sampleSize: finished.length,
      basis: `${finished.length} finished tasks across all projects`,
    }
  }

  return null
}

/** "1h 30m" / "45m" — matches how the time report reads. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

/**
 * Total estimated minutes for a set of tasks, treating an unestimated task as
 * a median-length one so the overload warning doesn't under-count.
 */
export function totalEstimated(tasks: Task[], fallbackMinutes = 30): number {
  return tasks.reduce((sum, t) => sum + (t.estimated_minutes ?? fallbackMinutes), 0)
}
