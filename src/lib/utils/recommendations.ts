import type { Priority, TaskWithProject } from '@/types/database'
import { daysUntil, isOverdue } from './dates'

/**
 * Deterministic work-recommendation score (ARCHITECTURE.md §19).
 * Higher = more deserving of attention now. No AI.
 */

const PRIORITY_WEIGHT: Record<Priority, number> = {
  low: 0,
  medium: 15,
  high: 35,
  urgent: 55,
}

export interface ScoredTask {
  task: TaskWithProject
  score: number
  factors: string[]
}

export function scoreTask(task: TaskWithProject): ScoredTask {
  let score = 0
  const factors: string[] = []

  score += PRIORITY_WEIGHT[task.priority]
  if (task.priority === 'high' || task.priority === 'urgent') {
    factors.push(`${task.priority} priority`)
  }

  if (isOverdue(task.due_date)) {
    score += 50
    factors.push('overdue')
  } else {
    const d = daysUntil(task.due_date)
    if (d !== null) {
      if (d <= 0) {
        score += 40
        factors.push('due today')
      } else if (d === 1) {
        score += 28
        factors.push('due tomorrow')
      } else if (d <= 3) {
        score += 18
        factors.push(`due in ${d}d`)
      } else if (d <= 7) {
        score += 8
      }
    }
  }

  if (task.status === 'in_progress') {
    score += 12
    factors.push('in progress')
  }
  if (task.status === 'blocked') {
    score -= 8
    factors.push('blocked')
  }

  if (task.project?.status === 'on_hold') {
    score -= 30
  }

  return { task, score, factors }
}

export function recommendTasks(tasks: TaskWithProject[], limit = 5): ScoredTask[] {
  return tasks
    .filter((t) => t.status === 'todo' || t.status === 'in_progress' || t.status === 'blocked')
    .map(scoreTask)
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
