import { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarRange, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Controls'
import { SearchInput } from '@/components/ui/Toolbar'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Field'
import { EmptyState, SkeletonRows } from '@/components/ui/States'
import { cn } from '@/lib/utils/cn'
import { TaskRow } from '@/components/tasks/TaskRow'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { TimeGrid } from '@/components/calendar/TimeGrid'
import { useAllTasks, useUpdateTask } from '@/lib/api/tasks'
import { useProjects } from '@/lib/api/projects'
import { useTags, useTaskTagMap } from '@/lib/api/tags'
import { useSettings } from '@/lib/api/settings'
import { useToast } from '@/components/Toast'
import { isOverdue } from '@/lib/utils/dates'
import { PRIORITIES } from '@/lib/constants'
import type { Priority, Task, TaskWithProject } from '@/types/database'

type View = 'month' | 'week' | 'day' | 'list'

/**
 * Tasks carry a due *date*, not a start/end time, so there is no hour grid
 * here — a 24-row day view would be 23 rows of nothing. The week view is seven
 * day columns instead, which is where date-only work actually reads well.
 *
 * Dragging a task onto a day reschedules it. That is the manual counterpart to
 * the automatic date rules in src/lib/autoRules.ts: the app can move work on a
 * schedule, and you can always move it by hand.
 */
export default function Calendar() {
  const { data, isLoading } = useAllTasks(true)
  const { data: projects } = useProjects()
  const { data: tags } = useTags()
  const tagMap = useTaskTagMap()
  const { appearance } = useSettings()
  const update = useUpdateTask()
  const { notify } = useToast()

  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<Date>(new Date())
  const [edit, setEdit] = useState<Task | null>(null)

  const [q, setQ] = useState('')
  const [projectId, setProjectId] = useState('all')
  const [priority, setPriority] = useState<'all' | Priority>('all')
  const [tagId, setTagId] = useState('all')

  const [dragId, setDragId] = useState<string | null>(null)
  const [overDay, setOverDay] = useState<string | null>(null)

  const weekOpts = { weekStartsOn: appearance.firstDayOfWeek }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (data ?? []).filter((t) => {
      if (t.status === 'done' || t.status === 'cancelled') return false
      if (term && !t.title.toLowerCase().includes(term)) return false
      if (projectId !== 'all' && t.project_id !== projectId) return false
      if (priority !== 'all' && t.priority !== priority) return false
      if (tagId !== 'all' && !(tagMap.get(t.id) ?? []).some((x) => x.id === tagId)) return false
      return true
    })
  }, [data, q, projectId, priority, tagId, tagMap])

  const byDay = useMemo(() => {
    const map = new Map<string, TaskWithProject[]>()
    for (const t of filtered) {
      if (!t.due_date) continue
      const k = t.due_date.slice(0, 10)
      map.set(k, [...(map.get(k) ?? []), t])
    }
    return map
  }, [filtered])

  const activeFilters =
    (projectId !== 'all' ? 1 : 0) + (priority !== 'all' ? 1 : 0) + (tagId !== 'all' ? 1 : 0)
  const clearFilters = () => {
    setProjectId('all')
    setPriority('all')
    setTagId('all')
    setQ('')
  }

  function shift(direction: -1 | 1) {
    setCursor((c) =>
      view === 'month'
        ? addMonths(c, direction)
        : view === 'day'
          ? addDays(c, direction)
          : addWeeks(c, direction),
    )
  }

  /**
   * Reschedule a task. `time` null means all-day; dropping on the hour grid
   * supplies a time, dropping on a month cell or the all-day row clears it.
   */
  function reschedule(taskId: string, dayKey: string, time: string | null) {
    const task = (data ?? []).find((t) => t.id === taskId)
    setDragId(null)
    setOverDay(null)
    if (!task) return
    const unchanged =
      task.due_date?.slice(0, 10) === dayKey && (task.due_time ?? null) === time
    if (unchanged) return
    update.mutate(
      {
        id: task.id,
        projectId: task.project_id,
        previousStatus: task.status,
        due_date: dayKey,
        due_time: time,
      },
      {
        onSuccess: () =>
          notify(
            `"${task.title}" → ${format(parseISO(dayKey), 'MMM d')}${time ? ` at ${time.slice(0, 5)}` : ''}`,
            'success',
          ),
      },
    )
  }

  const days =
    view === 'month'
      ? eachDayOfInterval({
          start: startOfWeek(startOfMonth(cursor), weekOpts),
          end: endOfWeek(endOfMonth(cursor), weekOpts),
        })
      : view === 'day'
        ? [cursor]
        : eachDayOfInterval({
            start: startOfWeek(cursor, weekOpts),
            end: endOfWeek(cursor, weekOpts),
          })

  const weekdayLabels = days.slice(0, 7).map((d) => format(d, 'EEE'))
  const selectedKey = format(selected, 'yyyy-MM-dd')
  const selectedTasks = byDay.get(selectedKey) ?? []

  const title =
    view === 'month'
      ? format(cursor, 'MMMM yyyy')
      : view === 'week'
        ? `Week of ${format(startOfWeek(cursor, weekOpts), 'MMM d')}`
        : view === 'day'
          ? format(cursor, 'EEEE, d MMM yyyy')
          : 'Scheduled'

  return (
    <Page>
      <PageHeader
        title="Calendar"
        subtitle="Tasks by due date — drag one onto a day to reschedule it."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={view}
              onChange={(v) => {
                // Re-anchor on switch: a month cursor sits on the 1st, so
                // flipping to Week would otherwise show the week containing the
                // 1st rather than the week you were actually looking at.
                if (v === 'week' || v === 'day') setCursor(selected)
                if (v === 'month') setCursor(startOfMonth(selected))
                setView(v)
              }}
              options={[
                { value: 'month', label: 'Month' },
                { value: 'week', label: 'Week' },
                { value: 'day', label: 'Day' },
                { value: 'list', label: 'List' },
              ]}
            />
            {view !== 'list' && (
              <div className="flex items-center gap-1.5">
                <Button size="sm" aria-label="Previous" icon={<ChevronLeft className="size-3.5" />} onClick={() => shift(-1)} />
                <span className="min-w-32 text-center text-sm font-medium">{title}</span>
                <Button size="sm" aria-label="Next" icon={<ChevronRight className="size-3.5" />} onClick={() => shift(1)} />
                <Button
                  size="sm"
                  onClick={() => {
                    setCursor(view === 'month' ? startOfMonth(new Date()) : new Date())
                    setSelected(new Date())
                  }}
                >
                  Today
                </Button>
              </div>
            )}
          </div>
        }
      />

      {/* Search + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-sm">
        <SearchInput value={q} onValueChange={setQ} placeholder="Search tasks" className="w-56" />
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-9 w-40">
          <option value="all">Any project</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          value={priority}
          onChange={(e) => setPriority(e.target.value as typeof priority)}
          className="h-9 w-32"
        >
          <option value="all">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select value={tagId} onChange={(e) => setTagId(e.target.value)} className="h-9 w-32">
          <option value="all">Any tag</option>
          {(tags ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        {(activeFilters > 0 || q) && (
          <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={clearFilters}>
            Clear
          </Button>
        )}
        <span className="ml-auto text-xs text-[var(--color-text-subtle)]">
          {filtered.filter((t) => t.due_date).length} scheduled
        </span>
      </div>

      {isLoading ? (
        <SkeletonRows rows={8} />
      ) : view === 'list' ? (
        <ListView tasks={filtered} onEdit={setEdit} />
      ) : view === 'week' || view === 'day' ? (
        <Card className="overflow-hidden">
          <TimeGrid days={days} byDay={byDay} onOpen={setEdit} onReschedule={reschedule} />
        </Card>
      ) : (
        <div className={cn('grid gap-4', view === 'month' && 'lg:grid-cols-[1fr_320px]')}>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-7 rounded-t-xl border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 text-center text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              {weekdayLabels.map((l) => (
                <div key={l} className="py-2.5">
                  {l}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const key = format(d, 'yyyy-MM-dd')
                const dayTasks = byDay.get(key) ?? []
                const outside = !isSameMonth(d, cursor)
                const isSel = isSameDay(d, selected)
                const isDropTarget = overDay === key
                const cap = 3
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(d)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setOverDay(key)
                    }}
                    onDragLeave={() => setOverDay((k) => (k === key ? null : k))}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragId) reschedule(dragId, key, null)
                    }}
                    className={cn(
                      'relative flex flex-col items-start gap-1 border-b border-r border-[var(--color-border)] p-1.5 text-left transition-colors',
                      'min-h-24',
                      '[&:nth-child(7n)]:border-r-0 hover:bg-[var(--color-surface-2)]/60',
                      outside && 'bg-[var(--color-surface-2)]/30',
                      isSel && 'bg-[var(--color-accent-soft)] ring-1 ring-inset ring-[var(--color-accent)]',
                      isDropTarget &&
                        'bg-[var(--color-accent-soft)] ring-2 ring-inset ring-[var(--color-accent)]',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-5 items-center justify-center rounded-full text-xs font-medium',
                        isToday(d)
                          ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                          : 'text-[var(--color-text)]',
                        outside && !isToday(d) && 'text-[var(--color-text-subtle)]',
                      )}
                    >
                      {format(d, 'd')}
                    </span>
                    {dayTasks.slice(0, cap).map((t) => (
                      <DayChip
                        key={t.id}
                        task={t}
                        dragging={dragId === t.id}
                        onDragStart={() => setDragId(t.id)}
                        onDragEnd={() => {
                          setDragId(null)
                          setOverDay(null)
                        }}
                        onOpen={() => setEdit(t)}
                      />
                    ))}
                    {dayTasks.length > cap && (
                      <span className="px-1 text-[0.625rem] font-medium text-[var(--color-text-subtle)]">
                        +{dayTasks.length - cap} more
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          {view === 'month' && (
            <Card className="h-fit" elevation="md">
              <CardHeader
                title={format(selected, 'EEEE, MMM d')}
                icon={<CalendarRange className="size-3.5" />}
                count={selectedTasks.length}
              />
              {selectedTasks.length === 0 ? (
                <EmptyState icon={<CalendarRange className="size-5" />} title="Nothing due" />
              ) : (
                selectedTasks
                  .slice()
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((t) => <TaskRow key={t.id} task={t} showProject onEdit={setEdit} />)
              )}
            </Card>
          )}
        </div>
      )}

      {edit && (
        <TaskFormModal open onClose={() => setEdit(null)} projectId={edit.project_id} task={edit} />
      )}
    </Page>
  )
}

/** A draggable task chip inside a day cell, with a hover preview. */
function DayChip({
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
  const overdue = isOverdue(task.due_date)
  return (
    <span
      draggable
      onDragStart={(e) => {
        e.stopPropagation()
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      title={`${task.title}${task.project ? ` · ${task.project.name}` : ''}`}
      className={cn(
        'flex w-full cursor-grab items-center gap-1 truncate rounded px-1 py-px text-[0.625rem] transition-opacity active:cursor-grabbing',
        overdue
          ? 'bg-[var(--color-overdue)]/15 text-[var(--color-overdue)]'
          : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]',
        dragging && 'opacity-40',
      )}
    >
      <span
        className={cn(
          'size-1 shrink-0 rounded-full',
          overdue ? 'bg-[var(--color-overdue)]' : 'bg-[var(--color-text-subtle)]',
        )}
      />
      <span className="truncate">{task.title}</span>
    </span>
  )
}

/** Everything scheduled, grouped by day — the agenda read of the same data. */
function ListView({
  tasks,
  onEdit,
}: {
  tasks: TaskWithProject[]
  onEdit: (t: Task) => void
}) {
  const groups = useMemo(() => {
    const withDates = tasks.filter((t) => t.due_date)
    const map = new Map<string, TaskWithProject[]>()
    for (const t of withDates) {
      const k = t.due_date!.slice(0, 10)
      map.set(k, [...(map.get(k) ?? []), t])
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [tasks])

  if (groups.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarRange className="size-5" />}
          title="Nothing scheduled"
          description="Give a task a due date and it will appear here."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map(([key, items]) => {
        const d = parseISO(key)
        const late = isOverdue(key)
        return (
          <Card key={key}>
            <CardHeader
              title={
                isToday(d)
                  ? 'Today'
                  : isSameDay(d, addDays(new Date(), 1))
                    ? 'Tomorrow'
                    : format(d, 'EEEE, d MMM')
              }
              count={items.length}
              action={
                late ? (
                  <Badge tone="overdue" dot>
                    overdue
                  </Badge>
                ) : undefined
              }
            />
            {items.map((t) => (
              <TaskRow key={t.id} task={t} showProject onEdit={onEdit} />
            ))}
          </Card>
        )
      })}
    </div>
  )
}
