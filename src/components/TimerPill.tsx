import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Square } from 'lucide-react'
import { useRunningTimer, useStopTimer } from '@/lib/api/time'

function fmt(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export function TimerPill() {
  const { data: running } = useRunningTimer()
  const stop = useStopTimer()
  const [, tick] = useState(0)

  useEffect(() => {
    if (!running) return
    const iv = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(iv)
  }, [running])

  if (!running) return null
  const elapsed = Math.max(0, Math.round((Date.now() - new Date(running.started_at).getTime()) / 1000))

  return (
    <div className="flex items-center gap-2 rounded-full bg-[var(--color-accent-soft)] py-1 pr-1 pl-2.5 text-xs ring-1 ring-inset ring-[var(--color-accent)]/25">
      <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
      <Link
        to={running.task ? `/projects/${running.task.project_id}` : '#'}
        className="max-w-[160px] truncate font-medium text-[var(--color-accent)] hover:underline"
      >
        {running.task?.title ?? 'Tracking'}
      </Link>
      <span className="font-mono tabular-nums text-[var(--color-text)]">{fmt(elapsed)}</span>
      <button
        onClick={() => stop.mutate(running)}
        className="rounded-full p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-stale)]/15 hover:text-[var(--color-stale)]"
        aria-label="Stop timer"
      >
        <Square className="size-3 fill-current" />
      </button>
    </div>
  )
}
