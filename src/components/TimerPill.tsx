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
    <div className="flex items-center gap-2 rounded-md bg-[--color-accent]/12 px-2 py-1 text-xs">
      <span className="size-1.5 animate-pulse rounded-full bg-[--color-accent]" />
      <Link
        to={running.task ? `/projects/${running.task.project_id}` : '#'}
        className="max-w-[160px] truncate font-medium text-[--color-accent]"
      >
        {running.task?.title ?? 'Tracking'}
      </Link>
      <span className="font-mono tabular-nums text-[--color-text]">{fmt(elapsed)}</span>
      <button
        onClick={() => stop.mutate(running)}
        className="rounded p-0.5 text-[--color-text-muted] hover:text-[--color-stale]"
        aria-label="Stop timer"
      >
        <Square className="size-3.5 fill-current" />
      </button>
    </div>
  )
}
