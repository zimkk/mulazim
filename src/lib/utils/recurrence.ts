import { addDays, addMonths, isWeekend, nextMonday, parseISO } from 'date-fns'
import type { Recurrence } from '@/types/database'

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekdays: 'Every weekday',
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
}

/** The next date (yyyy-mm-dd) for a recurrence, or null if it stops past `until`. */
export function nextOccurrence(from: string, rule: Recurrence, until: string | null): string | null {
  if (rule === 'none') return null
  const d = parseISO(from)
  let next: Date
  switch (rule) {
    case 'daily':
      next = addDays(d, 1)
      break
    case 'weekdays':
      next = addDays(d, 1)
      if (isWeekend(next)) next = nextMonday(next)
      break
    case 'weekly':
      next = addDays(d, 7)
      break
    case 'biweekly':
      next = addDays(d, 14)
      break
    case 'monthly':
      next = addMonths(d, 1)
      break
    default:
      return null
  }
  const iso = next.toISOString().slice(0, 10)
  return until && iso > until ? null : iso
}
