import { guessIsMac } from '@/lib/tauri'

/** Turn a KeyboardEvent into a normalised binding string like "mod+shift+p". */
export function eventToBinding(e: KeyboardEvent): string | null {
  const key = e.key
  if (['Control', 'Shift', 'Alt', 'Meta', 'Dead'].includes(key)) return null
  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('mod')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')
  parts.push(key.length === 1 ? key.toLowerCase() : key.toLowerCase())
  return parts.join('+')
}

/** Does the event match a binding string? */
export function matchesBinding(e: KeyboardEvent, binding: string): boolean {
  if (!binding) return false
  return eventToBinding(e) === binding
}

/** Human-readable form for the UI. */
export function prettyBinding(binding: string, isMac = guessIsMac()): string {
  return binding
    .split('+')
    .map((p) => {
      if (p === 'mod') return isMac ? '⌘' : 'Ctrl'
      if (p === 'shift') return isMac ? '⇧' : 'Shift'
      if (p === 'alt') return isMac ? '⌥' : 'Alt'
      return p.length === 1 ? p.toUpperCase() : p.replace(/^\w/, (c) => c.toUpperCase())
    })
    .join(isMac ? '' : '+')
}
