import { useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
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
        <div className="space-y-3">
          {buckets.map((b) => (
            <Card key={b.key}>
              <CardHeader
                title={
                  b.key === today.toISOString().slice(0, 10)
                    ? 'Today'
                    : format(b.date, 'EEEE, MMM d')
                }
                count={b.tasks.length}
              />
              {b.tasks.length === 0 ? (
                <div className="px-4 py-3 text-xs text-[--color-text-subtle]">Nothing due</div>
              ) : (
                b.tasks.map((t) => <TaskRow key={t.id} task={t} onEdit={setEdit} showProject />)
              )}
            </Card>
          ))}
          {later.length > 0 && (
            <Card>
              <CardHeader title="Later" count={later.length} />
              {later.map((t) => (
                <div key={t.id}>
                  <div className="px-4 pt-2 text-xs text-[--color-text-subtle]">
                    {format(parseISO(t.due_date!), 'MMM d')}
                  </div>
                  <TaskRow task={t} onEdit={setEdit} showProject />
                </div>
              ))}
            </Card>
          )}
          {(data ?? []).filter((t) => t.due_date).length === 0 && (
            <Card>
              <EmptyState
                title="No scheduled tasks"
                description="Give tasks a due date and they'll show up here."
              />
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
