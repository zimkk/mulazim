import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check } from 'lucide-react'
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
        className="relative rounded-md p-1.5 text-[--color-text-muted] hover:bg-[--color-surface-2] hover:text-[--color-text]"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-[--color-stale] px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-80 overflow-hidden rounded-lg border border-[--color-border] bg-[--color-surface] shadow-xl">
          <div className="flex items-center justify-between border-b border-[--color-border] px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex gap-2 text-xs text-[--color-text-muted]">
              {unread > 0 && (
                <button onClick={() => markRead.mutate('all')} className="hover:text-[--color-text]">
                  Mark all read
                </button>
              )}
              {items.length > 0 && (
                <button onClick={() => clear.mutate()} className="hover:text-[--color-text]">
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-[--color-text-muted]">
                You’re all caught up.
              </p>
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
                    'flex w-full items-start gap-2 border-b border-[--color-border] px-3 py-2 text-left last:border-b-0 hover:bg-[--color-surface-2]',
                    !n.read_at && 'bg-[--color-accent]/5',
                  )}
                >
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[--color-accent]" hidden={!!n.read_at} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-[--color-text]">{n.title}</span>
                    {n.body && (
                      <span className="block truncate text-xs text-[--color-text-muted]">{n.body}</span>
                    )}
                    <span className="text-[10px] text-[--color-text-subtle]">
                      {relativeTime(n.created_at)}
                    </span>
                  </span>
                  {n.read_at && <Check className="mt-0.5 size-3 shrink-0 text-[--color-text-subtle]" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
