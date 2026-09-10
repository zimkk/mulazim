import type { Task, TaskStatus } from '@/types/database'
import { isOverdue, toDate } from '@/lib/utils/dates'

/**
 * Automatic status transitions.
 *
 * Every rule here is deterministic and explainable — the user can always see
 * *why* a card moved, and can always move it back by hand. Three principles:
 *
 *  1. Never move a task the user has already resolved (done / cancelled).
 *  2. Only ever move work *forwards*. Nothing silently un-completes.
 *  3. Every automatic move is written to the activity log with `automatic: true`
 *     so history distinguishes "you did this" from "this happened".
 */

export type AutoRule = 'start-date' | 'timer-started' | 'subtasks-complete'

export const AUTO_RULE_LABEL: Record<AutoRule, string> = {
  'start-date': 'start date arrived',
  'timer-started': 'timer started',
  'subtasks-complete': 'all subtasks finished',
}

/** Statuses the user has explicitly resolved; automation leaves these alone. */
const RESOLVED: TaskStatus[] = ['done', 'cancelled']

export function isResolved(status: TaskStatus): boolean {
  return RESOLVED.includes(status)
}

/**
 * Rule 1 — a task scheduled to start today (or earlier) belongs in progress.
 * Only promotes from `todo`: a blocked task stays blocked, because a date
 * arriving does not unblock anything.
 */
export function shouldStartByDate(task: Task, today = new Date()): boolean {
  if (task.status !== 'todo' || !task.start_date) return false
  const start = toDate(task.start_date)
  if (!start) return false
  const midnight = new Date(today)
  midnight.setHours(23, 59, 59, 999)
  return start <= midnight
}

/** Rule 2 — tracking time against a task means you are working on it. */
export function shouldStartByTimer(task: Pick<Task, 'status'>): boolean {
  return task.status === 'todo' || task.status === 'blocked'
}

/**
 * Rule 3 — a parent whose subtasks are all checked is finished.
 * Requires at least one subtask, so a task with none is never auto-completed.
 */
export function shouldCompleteBySubtasks(
  task: Pick<Task, 'status'>,
  subtasks: { done: boolean }[],
): boolean {
  if (isResolved(task.status)) return false
  return subtasks.length > 0 && subtasks.every((s) => s.done)
}

/**
 * Rule 4 — overdue is a *flag*, never a move. Moving an overdue task would
 * lose the information that it is late; surfacing it keeps it where it is and
 * makes it impossible to miss.
 */
export function isOverdueOpen(task: Task): boolean {
  return !isResolved(task.status) && isOverdue(task.due_date)
}

/** Tasks needing a start-date promotion. Evaluated on load and on day change. */
export function tasksToAutoStart(tasks: Task[], today = new Date()): Task[] {
  return tasks.filter((t) => shouldStartByDate(t, today))
}

/** Human-readable sentence for the activity log. */
export function autoMoveDescription(title: string, rule: AutoRule, to: TaskStatus): string {
  const status = to === 'in_progress' ? 'In progress' : to === 'done' ? 'Done' : to
  return `"${title}" moved to ${status} — ${AUTO_RULE_LABEL[rule]}`
}
