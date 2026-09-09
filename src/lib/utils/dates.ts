import {
  differenceInCalendarDays,
  formatDistanceToNowStrict,
  isPast,
  isToday,
  isTomorrow,
  parseISO,
} from 'date-fns'

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  return typeof value === 'string' ? parseISO(value) : value
}

/** "just now", "3h ago", "8 days ago" */
export function relativeTime(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  return formatDistanceToNowStrict(d, { addSuffix: true })
}

/** Whole days since a timestamp (>= 0). */
export function daysSince(value: string | Date | null | undefined): number {
  const d = toDate(value)
  if (!d) return Number.POSITIVE_INFINITY
  return Math.max(0, differenceInCalendarDays(new Date(), d))
}

/** Whole days until a date. Negative when in the past. */
export function daysUntil(value: string | Date | null | undefined): number | null {
  const d = toDate(value)
  if (!d) return null
  return differenceInCalendarDays(d, new Date())
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  const d = toDate(dueDate)
  if (!d) return false
  return isPast(d) && !isToday(d)
}

export function dueLabel(dueDate: string | null | undefined): string {
  const d = toDate(dueDate)
  if (!d) return 'No due date'
  if (isToday(d)) return 'Due today'
  if (isTomorrow(d)) return 'Due tomorrow'
  const diff = differenceInCalendarDays(d, new Date())
  if (diff < 0) return `Overdue by ${Math.abs(diff)}d`
  return `Due in ${diff}d`
}

export function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** yyyy-mm-dd for <input type="date"> */
export function toDateInputValue(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return ''
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}
