import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertOctagon, CalendarClock, CheckCircle2, FolderKanban, Timer } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { m, stagger, fadeUp } from '@/lib/motion'
import { EmptyState, SkeletonRows } from '@/components/ui/States'
import { TaskRow } from '@/components/tasks/TaskRow'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { useAllOpenTasks, useCompletedSince } from '@/lib/api/tasks'
import { useProjects } from '@/lib/api/projects'
import { useTimeReport } from '@/lib/api/time'
import { useStaleThresholds } from '@/lib/api/settings'
import { isStale } from '@/lib/utils/staleness'
import { daysSince, daysUntil, isOverdue, relativeTime } from '@/lib/utils/dates'
import type { Task } from '@/types/database'

function weekStartIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString()
}
function fmtMins(m: number) {
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}

export default function Review() {
  const since = weekStartIso()
  const completed = useCompletedSince(since)
  const open = useAllOpenTasks()
  const projectsQ = useProjects()
  const time = useTimeReport(since)
  const thresholds = useStaleThresholds()
  const [edit, setEdit] = useState<Task | null>(null)

  const openTasks = open.data ?? []
  const overdue = openTasks.filter((t) => isOverdue(t.due_date))
  const upcoming = openTasks
    .filter((t) => {
      const d = daysUntil(t.due_date)
      return d !== null && d >= 0 && d <= 14
    })
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  const projects = projectsQ.data ?? []
  const stale = projects.filter((p) => isStale(p, thresholds))
  const review = projects.filter(
    (p) =>
      p.status === 'active' &&
      p.review_interval_days != null &&
      daysSince(p.last_reviewed_at ?? p.created_at) >= p.review_interval_days,
  )

  const loading = completed.isLoading || open.isLoading || projectsQ.isLoading

  return (
    <Page>
      <PageHeader title="Weekly review" subtitle="Look back, then plan the week ahead." />
      {loading ? (
        <SkeletonRows rows={8} />
      ) : (
        <m.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          <m.div variants={fadeUp}>
            <Card>
              <CardHeader
                title="Done this week"
                icon={<CheckCircle2 className="size-3.5" />}
                count={completed.data?.length ?? 0}
              />
              {(completed.data ?? []).length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="size-5" />}
                  title="Nothing completed yet this week"
                />
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {(completed.data ?? []).slice(0, 12).map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CheckCircle2 className="size-3.5 shrink-0 text-[var(--color-healthy)]" />
                        <span className="truncate">{t.title}</span>
                      </span>
                      <span className="shrink-0 text-xs text-[var(--color-text-subtle)]">
                        {t.project?.name} · {relativeTime(t.completed_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </m.div>

          <m.div variants={fadeUp}>
            <Card>
              <CardHeader title="Time logged" icon={<Timer className="size-3.5" />} />
              <div className="divide-y divide-[var(--color-border)]">
                <div className="flex items-baseline justify-between px-4 py-3">
                  <span className="text-sm font-medium">This week</span>
                  <span className="text-lg font-semibold tabular-nums tracking-tight text-[var(--color-accent)]">
                    {fmtMins(time.data?.total ?? 0)}
                  </span>
                </div>
                {(time.data?.rows ?? []).map((r) => (
                  <div key={r.name} className="px-4 py-2.5">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="truncate text-[var(--color-text)]">{r.name}</span>
                      <span className="tabular-nums text-[var(--color-text-muted)]">
                        {fmtMins(r.minutes)}
                      </span>
                    </div>
                    <Progress value={r.minutes / Math.max(1, time.data?.total ?? 1)} />
                  </div>
                ))}
                {(time.data?.rows ?? []).length === 0 && (
                  <p className="px-4 py-3 text-xs text-[var(--color-text-subtle)]">No time tracked.</p>
                )}
              </div>
            </Card>
          </m.div>

          <m.div variants={fadeUp}>
            <Card>
              <CardHeader
                title="Overdue — needs a decision"
                icon={<AlertOctagon className="size-3.5" />}
                count={overdue.length}
              />
              {overdue.length === 0 ? (
                <EmptyState title="Nothing overdue" />
              ) : (
                overdue.map((t) => <TaskRow key={t.id} task={t} onEdit={setEdit} showProject />)
              )}
            </Card>
          </m.div>

          <m.div variants={fadeUp}>
            <Card>
              <CardHeader
                title="Due in the next 2 weeks"
                icon={<CalendarClock className="size-3.5" />}
                count={upcoming.length}
              />
              {upcoming.length === 0 ? (
                <EmptyState title="Clear runway" />
              ) : (
                upcoming
                  .slice(0, 12)
                  .map((t) => <TaskRow key={t.id} task={t} onEdit={setEdit} showProject />)
              )}
            </Card>
          </m.div>

          <m.div variants={fadeUp} className="lg:col-span-2">
            <Card>
              <CardHeader
                title="Projects to check on"
                icon={<FolderKanban className="size-3.5" />}
                count={stale.length + review.length}
              />
              {stale.length + review.length === 0 ? (
                <EmptyState
                  icon={<FolderKanban className="size-5" />}
                  title="Every project is healthy"
                />
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {[...stale, ...review].map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <Link
                        to={`/projects/${p.id}`}
                        className="truncate transition-colors hover:text-[var(--color-accent)]"
                      >
                        {p.name}
                      </Link>
                      <Badge tone={stale.includes(p) ? 'stale' : 'attention'} dot>
                        {stale.includes(p) ? 'Stale' : 'Due for review'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </m.div>
        </m.div>
      )}
      {edit && (
        <TaskFormModal open onClose={() => setEdit(null)} projectId={edit.project_id} task={edit} />
      )}
    </Page>
  )
}
