import { useMemo, useState } from 'react'
import { format, isToday } from 'date-fns'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatMinutes } from '@/lib/utils/estimation'
import { isOverdue } from '@/lib/utils/dates'
import type { TaskWithProject } from '@/types/database'

/** Rendered hour range. Work outside it is unusual enough to scroll to. */
const START_HOUR = 6
const END_HOUR = 22
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const ROW_HEIGHT = 44
const DEFAULT_BLOCK_MINUTES = 30

export interface TimeGridProps {
  days: Date[]
  /** Already-filtered tasks, keyed yyyy-MM-dd. */
  byDay: Map<string, TaskWithProject[]>
  onOpen: (task: TaskWithProject) => void
  onReschedule: (taskId: string, dayKey: string, time: string | null) => void
}

const minutesOf = (t: TaskWithProject): number =>
  t.duration_minutes ?? t.estimated_minutes ?? DEFAULT_BLOCK_MINUTES

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

const fmtSlot = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

/**
 * Hour-grid calendar shared by the Day and Week views.
 *
 * Tasks with no time are all-day items and live in a separate row above the
 * grid rather than being forced into an arbitrary hour — that separation is
 * what keeps a mix of dated and timed work readable. Dropping onto the grid
 * snaps to the nearest 15 minutes; dropping onto the all-day row clears the
 * time again.
 */
export function TimeGrid({ days, byDay, onOpen, onReschedule }: TimeGridProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [hover, setHover] = useState<{ day: string; minutes: number } | null>(null)

  const { allDay, timed } = useMemo(() => {
    const allDay = new Map<string, TaskWithProject[]>()
    const timed = new Map<string, TaskWithProject[]>()
    for (const [key, list] of byDay) {
      allDay.set(key, list.filter((t) => !t.due_time))
      timed.set(
        key,
        list
          .filter((t) => t.due_time)
          .sort((a, b) => timeToMinutes(a.due_time!) - timeToMinutes(b.due_time!)),
      )
    }
    return { allDay, timed }
  }, [byDay])

  function slotFromEvent(e: React.DragEvent<HTMLDivElement>): number {
    const rect = e.currentTarget.getBoundingClientRect()
    const raw = START_HOUR * 60 + ((e.clientY - rect.top) / ROW_HEIGHT) * 60
    const snapped = Math.round(raw / 15) * 15
    return Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 15, snapped))
  }

  const cols = { gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }

  return (
    <div className="overflow-x-auto">
      <div className={days.length > 1 ? 'min-w-[42rem]' : ''}>
        <div className="grid border-b border-[var(--color-border)]" style={cols}>
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="px-2 py-2 text-center">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                {format(d, 'EEE')}
              </div>
              <div
                className={cn(
                  'mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-sm font-medium',
                  isToday(d)
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                    : 'text-[var(--color-text)]',
                )}
              >
                {format(d, 'd')}
              </div>
            </div>
          ))}
        </div>

        <div
          className="grid border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/30"
          style={cols}
        >
          <div className="px-2 py-1.5 text-right text-[0.625rem] uppercase tracking-wide text-[var(--color-text-subtle)]">
            All day
          </div>
          {days.map((d) => {
            const key = format(d, 'yyyy-MM-dd')
            return (
              <div
                key={key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragId) onReschedule(dragId, key, null)
                  setDragId(null)
                }}
                className="min-h-8 space-y-1 border-l border-[var(--color-border)] p-1"
              >
                {(allDay.get(key) ?? []).map((t) => (
                  <TaskChip
                    key={t.id}
                    task={t}
                    dragging={dragId === t.id}
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    onOpen={() => onOpen(t)}
                  />
                ))}
              </div>
            )
          })}
        </div>

        <div className="grid" style={cols}>
          <div>
            {HOURS.map((h) => (
              <div key={h} style={{ height: ROW_HEIGHT }} className="relative">
                <span className="absolute -top-1.5 right-2 text-[0.625rem] text-[var(--color-text-subtle)]">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {days.map((d) => {
            const key = format(d, 'yyyy-MM-dd')
            const isHoverCol = hover?.day === key
            return (
              <div
                key={key}
                onDragOver={(e) => {
                  e.preventDefault()
                  setHover({ day: key, minutes: slotFromEvent(e) })
                }}
                onDragLeave={() => setHover((h) => (h?.day === key ? null : h))}
                onDrop={(e) => {
                  e.preventDefault()
                  const mins = slotFromEvent(e)
                  if (dragId) onReschedule(dragId, key, `${fmtSlot(mins)}:00`)
                  setDragId(null)
                  setHover(null)
                }}
                className="relative border-l border-[var(--color-border)]"
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ height: ROW_HEIGHT }}
                    className="border-b border-[var(--color-border)]/60"
                  />
                ))}

                {isHoverCol && hover && (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-20 rounded border border-dashed border-[var(--color-accent)] bg-[var(--color-accent-soft)]/70 px-1 text-[0.625rem] font-medium text-[var(--color-accent)]"
                    style={{
                      top: ((hover.minutes - START_HOUR * 60) / 60) * ROW_HEIGHT,
                      height: (DEFAULT_BLOCK_MINUTES / 60) * ROW_HEIGHT,
                    }}
                  >
                    {fmtSlot(hover.minutes)}
                  </div>
                )}

                {(timed.get(key) ?? []).map((t) => (
                  <TaskBlock
                    key={t.id}
                    task={t}
                    top={((timeToMinutes(t.due_time!) - START_HOUR * 60) / 60) * ROW_HEIGHT}
                    height={Math.max(18, (minutesOf(t) / 60) * ROW_HEIGHT)}
                    dragging={dragId === t.id}
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    onOpen={() => onOpen(t)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TaskBlock({
  task,
  top,
  height,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  task: TaskWithProject
  top: number
  height: number
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onOpen: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const late = isOverdue(task.due_date)
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ top, height }}
      className={cn(
        'absolute inset-x-1 z-10 cursor-grab rounded px-1.5 py-0.5 text-[0.625rem] leading-tight ring-1 ring-inset active:cursor-grabbing',
        late
          ? 'bg-[var(--color-overdue)]/20 text-[var(--color-overdue)] ring-[var(--color-overdue)]/30'
          : 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] ring-[var(--color-accent)]/25',
        hovered ? 'z-30 shadow-md' : 'overflow-hidden',
        dragging && 'opacity-40',
      )}
    >
      <div className="truncate font-medium">{task.title}</div>
      {height > 30 && (
        <div className="truncate opacity-80">
          {task.due_time!.slice(0, 5)} · {formatMinutes(minutesOf(task))}
        </div>
      )}
      {hovered && <HoverCard task={task} />}
    </div>
  )
}

function TaskChip({
  task,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  task: TaskWithProject
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onOpen: () => void
}) {
  const late = isOverdue(task.due_date)
  return (
    <span
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      title={task.title}
      className={cn(
        'flex w-full cursor-grab items-center truncate rounded px-1 py-px text-[0.625rem] active:cursor-grabbing',
        late
          ? 'bg-[var(--color-overdue)]/15 text-[var(--color-overdue)]'
          : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]',
        dragging && 'opacity-40',
      )}
    >
      <span className="truncate">{task.title}</span>
    </span>
  )
}

/** Detail popover on hover, so a cramped block still tells you enough. */
function HoverCard({ task }: { task: TaskWithProject }) {
  return (
    <div className="pointer-events-none absolute top-full left-0 z-50 mt-1 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs shadow-lg">
      <p className="font-semibold text-[var(--color-text)]">{task.title}</p>
      {task.project && <p className="mt-0.5 text-[var(--color-text-muted)]">{task.project.name}</p>}
      <p className="mt-1.5 flex items-center gap-1 text-[var(--color-text-subtle)]">
        <Clock className="size-3" />
        {task.due_time ? task.due_time.slice(0, 5) : 'All day'} · {formatMinutes(minutesOf(task))}
      </p>
    </div>
  )
}
