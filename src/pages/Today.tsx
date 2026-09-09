import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { TaskRow } from '@/components/tasks/TaskRow'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { QuickAddTask } from '@/components/tasks/QuickAddTask'
import { useAllOpenTasks } from '@/lib/api/tasks'
import { useTimeReport } from '@/lib/api/time'
import { useDailyPlan, useSetDailyPlan } from '@/lib/api/dailyPlan'
import { greeting, isOverdue, toDate } from '@/lib/utils/dates'
import type { Task, TaskWithProject } from '@/types/database'

function fmtMins(m: number): string {
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}

function weekStartIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
  return d.toISOString()
}

export default function Today() {
  const { data, isLoading, isError, refetch } = useAllOpenTasks()
  const timeReport = useTimeReport(weekStartIso())
  const { data: planIds } = useDailyPlan()
  const setPlan = useSetDailyPlan()
  const [edit, setEdit] = useState<Task | null>(null)

  const tasks = data ?? []
  const todayStr = new Date().toISOString().slice(0, 10)
  const startedOrNoStart = (t: Task) => !t.start_date || t.start_date <= todayStr

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const plan = (planIds ?? []).map((id) => byId.get(id)).filter(Boolean) as TaskWithProject[]
  const planSet = new Set(planIds ?? [])
  const addable = tasks.filter((t) => !planSet.has(t.id))
  const addToPlan = (id: string) => setPlan.mutate([...(planIds ?? []), id])
  const removeFromPlan = (id: string) => setPlan.mutate((planIds ?? []).filter((x) => x !== id))

  const overdue = tasks.filter((t) => isOverdue(t.due_date))
  const dueToday = tasks.filter((t) => {
    const d = toDate(t.due_date)
    return d && d.toISOString().slice(0, 10) === todayStr
  })
  const noDate = tasks.filter(
    (t) =>
      !t.due_date &&
      startedOrNoStart(t) &&
      (t.priority === 'high' || t.priority === 'urgent' || t.status === 'in_progress'),
  )

  return (
    <Page>
      <PageHeader title={`${greeting()} — Today`} subtitle="Everything worth doing today, in one list." />
      <div className="mb-5">
        <QuickAddTask />
      </div>

      {isError ? (
        <ErrorState message="Unable to load today." onRetry={refetch} />
      ) : isLoading ? (
        <SkeletonRows rows={6} />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Today’s plan"
              count={plan.length}
              action={
                addable.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {plan.length === 0 && (
                      <Button
                        size="sm"
                        onClick={() =>
                          setPlan.mutate([...overdue, ...dueToday].map((t) => t.id))
                        }
                      >
                        Auto-fill
                      </Button>
                    )}
                    <Select
                      className="h-7 w-40 py-0 text-xs"
                      value=""
                      onChange={(e) => e.target.value && addToPlan(e.target.value)}
                    >
                      <option value="">+ Add a task to today…</option>
                      {addable.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </Select>
                  </div>
                )
              }
            />
            {plan.length === 0 ? (
              <EmptyState
                title="No plan yet"
                description="Pick the handful of things that matter today."
              />
            ) : (
              plan.map((t) => (
                <div key={t.id} className="flex items-center">
                  <div className="min-w-0 flex-1">
                    <TaskRow task={t} onEdit={setEdit} showProject />
                  </div>
                  <button
                    onClick={() => removeFromPlan(t.id)}
                    className="mr-2 shrink-0 text-[--color-text-subtle] hover:text-[--color-stale]"
                    aria-label="Remove from plan"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </Card>

          <Section title="Overdue" tasks={overdue} onEdit={setEdit} empty="Nothing overdue — nice." />
          <Section title="Due today" tasks={dueToday} onEdit={setEdit} empty="Nothing due today." />
          <Section
            title="Worth a look"
            tasks={noDate}
            onEdit={setEdit}
            empty="No high-priority or in-progress work without a date."
          />

          {timeReport.data && timeReport.data.total > 0 && (
            <Card>
              <CardHeader title="Time this week" />
              <div className="divide-y divide-[--color-border]">
                <div className="flex justify-between px-4 py-2 text-sm font-medium">
                  <span>Total</span>
                  <span>{fmtMins(timeReport.data.total)}</span>
                </div>
                {timeReport.data.rows.map((r) => (
                  <div key={r.name} className="flex justify-between px-4 py-1.5 text-xs text-[--color-text-muted]">
                    <span className="truncate">{r.name}</span>
                    <span>{fmtMins(r.minutes)}</span>
                  </div>
                ))}
              </div>
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

function Section({
  title,
  tasks,
  onEdit,
  empty,
}: {
  title: string
  tasks: Task[]
  onEdit: (t: Task) => void
  empty: string
}) {
  return (
    <Card>
      <CardHeader title={title} count={tasks.length} />
      {tasks.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        tasks
          .slice()
          .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
          .map((t) => <TaskRow key={t.id} task={t} onEdit={onEdit} showProject />)
      )}
    </Card>
  )
}
