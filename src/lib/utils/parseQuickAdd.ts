import { addDays, nextDay, parse, type Day } from 'date-fns'
import type { Priority } from '@/types/database'

export interface ParsedQuickAdd {
  title: string
  tagNames: string[]
  priority: Priority | null
  dueDate: string | null // yyyy-mm-dd
}

const PRIORITY_WORDS: Record<string, Priority> = {
  '!low': 'low',
  '!med': 'medium',
  '!medium': 'medium',
  '!high': 'high',
  '!urgent': 'urgent',
  p1: 'urgent',
  p2: 'high',
  p3: 'medium',
  p4: 'low',
}

const WEEKDAYS: Record<string, Day> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Parse `#tag`, `!priority` / `p1`, and a date phrase out of quick-add text. */
export function parseQuickAdd(input: string): ParsedQuickAdd {
  let text = ` ${input} `
  const tagNames: string[] = []
  let priority: Priority | null = null
  let dueDate: string | null = null
  const now = new Date()

  // #tags
  text = text.replace(/\s#([\p{L}\p{N}_-]+)/gu, (_m, name) => {
    tagNames.push(String(name))
    return ' '
  })

  // priority tokens
  text = text.replace(/\s(![a-z]+|p[1-4])\b/gi, (m, tok) => {
    const p = PRIORITY_WORDS[String(tok).toLowerCase()]
    if (p) {
      priority = p
      return ' '
    }
    return m
  })

  // relative / named dates (first match wins)
  const patterns: [RegExp, () => Date | null][] = [
    [/\btoday\b/i, () => now],
    [/\btomorrow\b/i, () => addDays(now, 1)],
    [/\bin (\d+) days?\b/i, (m?: RegExpMatchArray) => (m ? addDays(now, Number(m[1])) : null)],
    [/\bnext week\b/i, () => addDays(now, 7)],
    [
      /\b(mon|tue|wed|thu|fri|sat|sun)(?:day)?\b/i,
      (m?: RegExpMatchArray) =>
        m ? nextDay(now, WEEKDAYS[m[1]!.toLowerCase().slice(0, 3)]!) : null,
    ],
    [
      /\b(\d{1,2})\/(\d{1,2})\b/,
      (m?: RegExpMatchArray) => {
        if (!m) return null
        const d = parse(`${m[1]}/${m[2]}/${now.getFullYear()}`, 'M/d/yyyy', now)
        return isNaN(+d) ? null : d
      },
    ],
  ]

  for (const [re, fn] of patterns) {
    const m = text.match(re)
    if (m) {
      const d = (fn as (mm?: RegExpMatchArray) => Date | null)(m)
      if (d && !isNaN(+d)) {
        dueDate = iso(d)
        text = text.replace(re, ' ')
        break
      }
    }
  }

  return {
    title: text.replace(/\s+/g, ' ').trim(),
    tagNames,
    priority,
    dueDate,
  }
}
