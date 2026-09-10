import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState, SkeletonRows } from '@/components/ui/States'
import { cn } from '@/lib/utils/cn'
import { TaskRow } from '@/components/tasks/TaskRow'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { useAllTasks } from '@/lib/api/tasks'
import { useSettings } from '@/lib/api/settings'
import { isOverdue } from '@/lib/utils/dates'
import type { Task, TaskWithProject } from '@/types/database'

export default function Calendar() {
  const { data, isLoading } = useAllTasks(true)
  const { appearance } = useSettings()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<Date>(new Date())
  const [edit, setEdit] = useState<Task | null>(null)

  const byDay = useMemo(() => {
    const map = new Map<string, TaskWithProject[]>()
    for (const t of data ?? []) {
      if (!t.due_date || t.status === 'done' || t.status === 'cancelled') continue
      const k = t.due_date.slice(0, 10)
      map.set(k, [...(map.get(k) ?? []), t])
    }
    return map
  }, [data])

  const weekOpts = { weekStartsOn: appearance.firstDayOfWeek }
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), weekOpts),
    end: endOfWeek(endOfMonth(month), weekOpts),
  })
  const weekdayLabels = days.slice(0, 7).map((d) => format(d, 'EEE'))
  const selectedKey = format(selected, 'yyyy-MM-dd')
  const selectedTasks = byDay.get(selectedKey) ?? []

  return (
    <Page>
      <PageHeader
        title="Calendar"
        subtitle="Tasks by due date."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" icon={<ChevronLeft className="size-3.5" />} onClick={() => setMonth(addMonths(month, -1))} />
            <span className="w-32 text-center text-sm font-medium">{format(month, 'MMMM yyyy')}</span>
            <Button size="sm" icon={<ChevronRight className="size-3.5" />} onClick={() => setMonth(addMonths(month, 1))} />
            <Button size="sm" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(new Date()) }}>
              Today
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <SkeletonRows rows={8} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
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
                const tasks = byDay.get(key) ?? []
                const outside = !isSameMonth(d, month)
                const isSel = isSameDay(d, selected)
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(d)}
                    className={cn(
                      'relative flex min-h-[92px] flex-col items-start gap-1 border-b border-r border-[var(--color-border)] p-1.5 text-left transition-colors',
                      '[&:nth-child(7n)]:border-r-0 hover:bg-[var(--color-surface-2)]/60',
                      outside && 'bg-[var(--color-surface-2)]/30 text-[var(--color-text-subtle)]',
                      isSel && 'bg-[var(--color-accent-soft)] ring-1 ring-inset ring-[var(--color-accent)]',
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
                    {tasks.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className={cn(
                          'flex w-full items-center gap-1 truncate rounded px-1 py-px text-[0.625rem]',
                          isOverdue(t.due_date)
                            ? 'bg-[var(--color-overdue)]/15 text-[var(--color-overdue)]'
                            : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]',
                        )}
                      >
                        <span
                          className={cn(
                            'size-1 shrink-0 rounded-full',
                            isOverdue(t.due_date)
                              ? 'bg-[var(--color-overdue)]'
                              : 'bg-[var(--color-text-subtle)]',
                          )}
                        />
                        <span className="truncate">{t.title}</span>
                      </span>
                    ))}
                    {tasks.length > 3 && (
                      <span className="px-1 text-[0.625rem] font-medium text-[var(--color-text-subtle)]">
                        +{tasks.length - 3} more
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

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
        </div>
      )}
      {edit && (
        <TaskFormModal open onClose={() => setEdit(null)} projectId={edit.project_id} task={edit} />
      )}
    </Page>
  )
}
