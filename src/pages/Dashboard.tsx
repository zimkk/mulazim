import { Link } from 'react-router-dom'
import { AlertOctagon, CalendarClock, Flame, Sparkles } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge, HealthBadge, PriorityBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { QuickAddTask } from '@/components/tasks/QuickAddTask'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { useDashboard } from '@/lib/api/dashboard'
import { useRecentActivity } from '@/lib/api/activity'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { projectHealth } from '@/lib/utils/health'
import { dueLabel, greeting, relativeTime } from '@/lib/utils/dates'
import type { ProjectWithStats, TaskWithProject } from '@/types/database'

export default function Dashboard() {
  const email = useAuthStore((s) => s.user?.email ?? '')
  const d = useDashboard()
  const activity = useRecentActivity(12)

  if (d.isError) {
    return (
      <Page>
        <ErrorState message="Unable to load your dashboard." onRetry={d.refetch} />
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title={`${greeting()}${email ? `, ${email.split('@')[0]}` : ''}`}
        subtitle="What needs your attention right now."
      />

      <div className="mb-5">
        <QuickAddTask />
      </div>

      {d.isLoading ? (
        <SkeletonRows rows={8} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-[--color-accent]" /> Recommended focus
                </span>
              }
              count={d.recommendations.length}
            />
            {d.recommendations.length === 0 ? (
              <EmptyState title="Nothing pressing" description="No high-signal work right now — nice." />
            ) : (
              <ol className="divide-y divide-[--color-border]">
                {d.recommendations.map(({ task, factors }, i) => (
                  <li key={task.id} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="text-sm font-semibold text-[--color-text-subtle]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <TaskLink task={task} />
                      <p className="mt-0.5 text-xs text-[--color-text-muted]">
                        {task.project?.name}
                        {factors.length > 0 && ` · ${factors.join(', ')}`}
                      </p>
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <TaskCard
            title="Overdue"
            icon={<AlertOctagon className="size-4 text-[--color-overdue]" />}
            tasks={d.overdueTasks}
            emptyTitle="Nothing overdue"
          />

          <TaskCard
            title="Due today & soon"
            icon={<CalendarClock className="size-4 text-[--color-attention]" />}
            tasks={d.dueSoonTasks}
            emptyTitle="Nothing due in the next few days"
          />

          <TaskCard
            title="High & urgent"
            icon={<Flame className="size-4 text-[--color-attention]" />}
            tasks={d.highPriorityTasks}
            emptyTitle="No high-priority work queued"
          />

          <ProjectCard
            title="Stale projects"
            projects={d.staleProjects}
            emptyTitle="No stale projects"
            emptyDesc="Everything's had activity recently."
          />

          <ProjectCard
            title="Needs attention"
            projects={d.attentionProjects}
            emptyTitle="No projects need attention"
          />

          <Card className="lg:col-span-2">
            <CardHeader title="Recent activity" />
            <ActivityTimeline items={activity.data} loading={activity.isLoading} />
          </Card>
        </div>
      )}
    </Page>
  )
}

function TaskLink({ task }: { task: TaskWithProject }) {
  return (
    <Link
      to={task.project ? `/projects/${task.project.id}` : '#'}
      className="text-sm text-[--color-text] hover:text-[--color-accent]"
    >
      {task.title}
    </Link>
  )
}

function TaskCard({
  title,
  icon,
  tasks,
  emptyTitle,
}: {
  title: string
  icon?: React.ReactNode
  tasks: TaskWithProject[]
  emptyTitle: string
}) {
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-1.5">{icon} {title}</span>}
        count={tasks.length}
      />
      {tasks.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <ul className="divide-y divide-[--color-border]">
          {tasks.slice(0, 8).map((task) => (
            <li key={task.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <TaskLink task={task} />
                <p className="mt-0.5 text-xs text-[--color-text-muted]">{task.project?.name}</p>
              </div>
              {task.due_date && <Badge tone="neutral">{dueLabel(task.due_date)}</Badge>}
              <PriorityBadge priority={task.priority} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function ProjectCard({
  title,
  projects,
  emptyTitle,
  emptyDesc,
}: {
  title: string
  projects: ProjectWithStats[]
  emptyTitle: string
  emptyDesc?: string
}) {
  const thresholds = useUiStore((s) => s.staleThresholds)
  return (
    <Card>
      <CardHeader title={title} count={projects.length} />
      {projects.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDesc} />
      ) : (
        <ul className="divide-y divide-[--color-border]">
          {projects.slice(0, 8).map((p) => {
            const h = projectHealth(p, thresholds)
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <Link
                  to={`/projects/${p.id}`}
                  className="min-w-0 flex-1 text-sm text-[--color-text] hover:text-[--color-accent]"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="mt-0.5 block text-xs text-[--color-text-muted]">
                    {p.client?.name ? `${p.client.name} · ` : ''}
                    Active {relativeTime(p.last_activity_at)}
                  </span>
                </Link>
                <HealthBadge health={h.health} label={h.label} />
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
