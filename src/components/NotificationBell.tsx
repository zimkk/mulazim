import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, Check } from 'lucide-react'
import { AnimatePresence, m } from '@/lib/motion'
import { cn } from '@/lib/utils/cn'
import { relativeTime } from '@/lib/utils/dates'
import {
  useClearNotifications,
  useMarkNotificationsRead,
  useNotifications,
} from '@/lib/api/notifications'

export function NotificationBell() {
  const { data } = useNotifications()
  const markRead = useMarkNotificationsRead()
  const clear = useClearNotifications()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const items = data ?? []
  const unread = items.filter((n) => !n.read_at).length

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'relative rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]',
          open && 'bg-[var(--color-surface-2)] text-[var(--color-text)]',
        )}
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-[var(--color-stale)] px-1 text-[0.625rem] font-semibold text-white ring-2 ring-[var(--color-surface)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-3.5 py-2.5">
              <span className="text-sm font-semibold tracking-tight">Notifications</span>
              <div className="flex gap-2.5 text-xs text-[var(--color-text-muted)]">
                {unread > 0 && (
                  <button
                    onClick={() => markRead.mutate('all')}
                    className="transition-colors hover:text-[var(--color-text)]"
                  >
                    Mark all read
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    onClick={() => clear.mutate()}
                    className="transition-colors hover:text-[var(--color-text)]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-text-subtle)] ring-1 ring-inset ring-[var(--color-border)]">
                    <BellOff className="size-4" />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">You’re all caught up.</p>
                </div>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.read_at) markRead.mutate([n.id])
                      if (n.link) navigate(n.link)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-start gap-2.5 border-b border-[var(--color-border)] px-3.5 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]',
                      !n.read_at && 'bg-[var(--color-accent)]/5',
                    )}
                  >
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
                      hidden={!!n.read_at}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-[var(--color-text)]">{n.title}</span>
                      {n.body && (
                        <span className="block truncate text-xs text-[var(--color-text-muted)]">
                          {n.body}
                        </span>
                      )}
                      <span className="text-[0.625rem] text-[var(--color-text-subtle)]">
                        {relativeTime(n.created_at)}
                      </span>
                    </span>
                    {n.read_at && (
                      <Check className="mt-0.5 size-3 shrink-0 text-[var(--color-text-subtle)]" />
                    )}
                  </button>
                ))
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
