import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Done this week" count={completed.data?.length ?? 0} />
            {(completed.data ?? []).length === 0 ? (
              <EmptyState title="Nothing completed yet this week" />
            ) : (
              <ul className="divide-y divide-[--color-border]">
                {(completed.data ?? []).slice(0, 12).map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-[--color-text-muted]">
                      {t.project?.name} · {relativeTime(t.completed_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Time logged" />
            <div className="divide-y divide-[--color-border]">
              <div className="flex justify-between px-4 py-2 text-sm font-medium">
                <span>This week</span>
                <span>{fmtMins(time.data?.total ?? 0)}</span>
              </div>
              {(time.data?.rows ?? []).map((r) => (
                <div key={r.name} className="flex justify-between px-4 py-1.5 text-xs text-[--color-text-muted]">
                  <span className="truncate">{r.name}</span>
                  <span>{fmtMins(r.minutes)}</span>
                </div>
              ))}
              {(time.data?.rows ?? []).length === 0 && (
                <p className="px-4 py-3 text-xs text-[--color-text-subtle]">No time tracked.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Overdue — needs a decision" count={overdue.length} />
            {overdue.length === 0 ? (
              <EmptyState title="Nothing overdue" />
            ) : (
              overdue.map((t) => <TaskRow key={t.id} task={t} onEdit={setEdit} showProject />)
            )}
          </Card>

          <Card>
            <CardHeader title="Due in the next 2 weeks" count={upcoming.length} />
            {upcoming.length === 0 ? (
              <EmptyState title="Clear runway" />
            ) : (
              upcoming.slice(0, 12).map((t) => <TaskRow key={t.id} task={t} onEdit={setEdit} showProject />)
            )}
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="Projects to check on" count={stale.length + review.length} />
            {stale.length + review.length === 0 ? (
              <EmptyState title="Every project is healthy" />
            ) : (
              <ul className="divide-y divide-[--color-border]">
                {[...stale, ...review].map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <Link to={`/projects/${p.id}`} className="hover:text-[--color-accent]">
                      {p.name}
                    </Link>
                    <Badge tone={stale.includes(p) ? 'stale' : 'attention'}>
                      {stale.includes(p) ? 'Stale' : 'Due for review'}
                    </Badge>
                  </li>
                ))}
              </ul>
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
