import { useMemo, useState } from 'react'
import { AlertOctagon, CalendarCheck, Eye, ListChecks, Timer, X } from 'lucide-react'
import { m, stagger, fadeUp } from '@/lib/motion'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { Progress } from '@/components/ui/Progress'
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
        <m.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
          <m.div variants={fadeUp}>
          <Card elevation="md">
            <CardHeader
              title="Today’s plan"
              icon={<ListChecks className="size-3.5" />}
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
                      className="h-7 w-44 py-0 text-xs"
                      value=""
                      aria-label="Add a task to today"
                      onChange={(e) => e.target.value && addToPlan(e.target.value)}
                    >
                      <option value="">Add to today…</option>
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
                icon={<ListChecks className="size-5" />}
                title="No plan yet"
                description="Pick the handful of things that matter today."
              />
            ) : (
              plan.map((t) => (
                <div key={t.id} className="group/plan flex items-center">
                  <div className="min-w-0 flex-1">
                    <TaskRow task={t} onEdit={setEdit} showProject />
                  </div>
                  <button
                    onClick={() => removeFromPlan(t.id)}
                    className="mr-2 shrink-0 rounded p-1 text-[var(--color-text-subtle)] transition-colors hover:bg-[var(--color-stale)]/10 hover:text-[var(--color-stale)]"
                    aria-label="Remove from plan"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </Card>
          </m.div>

          <Section
            title="Overdue"
            icon={<AlertOctagon className="size-3.5" />}
            tasks={overdue}
            onEdit={setEdit}
            empty="Nothing overdue — nice."
          />
          <Section
            title="Due today"
            icon={<CalendarCheck className="size-3.5" />}
            tasks={dueToday}
            onEdit={setEdit}
            empty="Nothing due today."
          />
          <Section
            title="Worth a look"
            icon={<Eye className="size-3.5" />}
            tasks={noDate}
            onEdit={setEdit}
            empty="No high-priority or in-progress work without a date."
          />

          {timeReport.data && timeReport.data.total > 0 && (
            <m.div variants={fadeUp}>
              <Card>
                <CardHeader title="Time this week" icon={<Timer className="size-3.5" />} />
                <div className="divide-y divide-[var(--color-border)]">
                  <div className="flex items-baseline justify-between px-4 py-3">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-lg font-semibold tabular-nums tracking-tight text-[var(--color-accent)]">
                      {fmtMins(timeReport.data.total)}
                    </span>
                  </div>
                  {timeReport.data.rows.map((r) => {
                    const share = r.minutes / Math.max(1, timeReport.data!.total)
                    return (
                      <div key={r.name} className="px-4 py-2.5">
                        <div className="mb-1.5 flex justify-between text-xs">
                          <span className="truncate text-[var(--color-text)]">{r.name}</span>
                          <span className="tabular-nums text-[var(--color-text-muted)]">
                            {fmtMins(r.minutes)}
                          </span>
                        </div>
                        <Progress value={share} />
                      </div>
                    )
                  })}
                </div>
              </Card>
            </m.div>
          )}
        </m.div>
      )}

      {edit && (
        <TaskFormModal open onClose={() => setEdit(null)} projectId={edit.project_id} task={edit} />
      )}
    </Page>
  )
}

function Section({
  title,
  icon,
  tasks,
  onEdit,
  empty,
}: {
  title: string
  icon?: React.ReactNode
  tasks: Task[]
  onEdit: (t: Task) => void
  empty: string
}) {
  return (
    <m.div variants={fadeUp}>
      <Card>
        <CardHeader title={title} icon={icon} count={tasks.length} />
        {tasks.length === 0 ? (
          <EmptyState title={empty} />
        ) : (
          tasks
            .slice()
            .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
            .map((t) => <TaskRow key={t.id} task={t} onEdit={onEdit} showProject />)
        )}
      </Card>
    </m.div>
  )
}
