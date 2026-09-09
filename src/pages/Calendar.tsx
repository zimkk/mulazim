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
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
          <Card>
            <div className="grid grid-cols-7 border-b border-[--color-border] text-center text-xs font-medium text-[--color-text-muted]">
              {weekdayLabels.map((l) => (
                <div key={l} className="py-2">
                  {l}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const key = format(d, 'yyyy-MM-dd')
                const tasks = byDay.get(key) ?? []
                const hasOverdue = tasks.some((t) => isOverdue(t.due_date))
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(d)}
                    className={cn(
                      'flex min-h-[84px] flex-col items-start gap-1 border-b border-r border-[--color-border] p-1.5 text-left last:border-r-0',
                      !isSameMonth(d, month) && 'bg-[--color-surface-2]/40 text-[--color-text-subtle]',
                      isSameDay(d, selected) && 'ring-1 ring-inset ring-[--color-accent]',
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs',
                        isToday(d) &&
                          'flex size-5 items-center justify-center rounded-full bg-[--color-accent] text-[--color-accent-fg]',
                      )}
                    >
                      {format(d, 'd')}
                    </span>
                    {tasks.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className={cn(
                          'w-full truncate rounded px-1 text-[10px]',
                          hasOverdue && isOverdue(t.due_date)
                            ? 'bg-[--color-overdue]/15 text-[--color-overdue]'
                            : 'bg-[--color-surface-2] text-[--color-text-muted]',
                        )}
                      >
                        {t.title}
                      </span>
                    ))}
                    {tasks.length > 3 && (
                      <span className="text-[10px] text-[--color-text-subtle]">
                        +{tasks.length - 3} more
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card className="h-fit">
            <CardHeader title={format(selected, 'EEEE, MMM d')} count={selectedTasks.length} />
            {selectedTasks.length === 0 ? (
              <EmptyState title="Nothing due" />
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
