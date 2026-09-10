import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/** A single keyboard chip, e.g. <Kbd>⌘</Kbd><Kbd>K</Kbd>. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5',
        'font-sans text-[0.6875rem] font-medium text-[var(--color-text-subtle)] shadow-xs',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

/** Renders a "mod+shift+k"-style binding as a row of chips. */
export function KbdSequence({ binding, className }: { binding: string; className?: string }) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  const parts = binding.split('+').map((p) => {
    const k = p.trim().toLowerCase()
    if (k === 'mod') return isMac ? '⌘' : 'Ctrl'
    if (k === 'shift') return '⇧'
    if (k === 'alt') return isMac ? '⌥' : 'Alt'
    if (k === 'ctrl') return isMac ? '⌃' : 'Ctrl'
    return k.length === 1 ? k.toUpperCase() : k[0]!.toUpperCase() + k.slice(1)
  })
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {parts.map((p, i) => (
        <Kbd key={`${p}-${i}`}>{p}</Kbd>
      ))}
    </span>
  )
}
