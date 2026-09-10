import { useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { m, stagger, fadeUp } from '@/lib/motion'
import { cn } from '@/lib/utils/cn'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { TaskRow } from '@/components/tasks/TaskRow'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { useAllOpenTasks } from '@/lib/api/tasks'
import { useSettings } from '@/lib/api/settings'
import type { Task } from '@/types/database'

export default function Upcoming() {
  const { data, isLoading, isError, refetch } = useAllOpenTasks()
  const { general } = useSettings()
  const [edit, setEdit] = useState<Task | null>(null)

  const days = Math.min(30, Math.max(1, general.upcomingDays))
  const today = new Date()
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = addDays(today, i)
    const key = d.toISOString().slice(0, 10)
    return { key, date: d, tasks: [] as Task[] }
  })
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  let later: Task[] = []
  const horizon = buckets[buckets.length - 1]!.key

  for (const t of data ?? []) {
    if (!t.due_date) continue
    const k = t.due_date.slice(0, 10)
    if (byKey.has(k)) byKey.get(k)!.tasks.push(t)
    else if (k > horizon) later.push(t)
  }
  later = later.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

  return (
    <Page>
      <PageHeader title="Upcoming" subtitle={`The next ${days} days, by due date.`} />
      {isError ? (
        <ErrorState message="Unable to load upcoming tasks." onRetry={refetch} />
      ) : isLoading ? (
        <SkeletonRows rows={8} />
      ) : (
        <m.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
          {buckets.map((b) => {
            const isToday = b.key === today.toISOString().slice(0, 10)
            const empty = b.tasks.length === 0
            return (
              <m.div key={b.key} variants={fadeUp}>
                <Card
                  elevation={isToday ? 'md' : 'sm'}
                  className={cn(
                    empty && 'opacity-60 transition-opacity hover:opacity-100',
                    isToday && 'ring-1 ring-[var(--color-accent)]/30',
                  )}
                >
                  <CardHeader
                    title={isToday ? 'Today' : format(b.date, 'EEEE, MMM d')}
                    icon={isToday ? <CalendarDays className="size-3.5" /> : undefined}
                    count={b.tasks.length}
                  />
                  {empty ? (
                    <div className="px-4 py-3 text-xs text-[var(--color-text-subtle)]">Nothing due</div>
                  ) : (
                    b.tasks.map((t) => <TaskRow key={t.id} task={t} onEdit={setEdit} showProject />)
                  )}
                </Card>
              </m.div>
            )
          })}
          {later.length > 0 && (
            <m.div variants={fadeUp}>
              <Card>
                <CardHeader title="Later" count={later.length} />
                {later.map((t) => (
                  <div key={t.id}>
                    <div className="px-4 pt-2 text-xs font-medium text-[var(--color-text-subtle)]">
                      {format(parseISO(t.due_date!), 'MMM d')}
                    </div>
                    <TaskRow task={t} onEdit={setEdit} showProject />
                  </div>
                ))}
              </Card>
            </m.div>
          )}
          {(data ?? []).filter((t) => t.due_date).length === 0 && (
            <Card>
              <EmptyState
                icon={<CalendarDays className="size-5" />}
                title="No scheduled tasks"
                description="Give tasks a due date and they'll show up here."
              />
            </Card>
          )}
        </m.div>
      )}
      {edit && (
        <TaskFormModal open onClose={() => setEdit(null)} projectId={edit.project_id} task={edit} />
      )}
    </Page>
  )
}
