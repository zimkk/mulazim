import { Link } from 'react-router-dom'
import { AlertOctagon, CalendarClock, Flame, Sparkles } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge, HealthBadge, PriorityBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { QuickAddTask } from '@/components/tasks/QuickAddTask'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { Onboarding } from '@/components/Onboarding'
import { useClients } from '@/lib/api/clients'
import { useDashboard } from '@/lib/api/dashboard'
import { useRecentActivity } from '@/lib/api/activity'
import { displayNameOf, useProfile } from '@/lib/api/profile'
import { useProjects } from '@/lib/api/projects'
import { useAuthStore } from '@/stores/authStore'
import { useSettings, useStaleThresholds } from '@/lib/api/settings'
import { DASHBOARD_CARD_IDS, type DashboardCardId } from '@/lib/settings'
import { projectHealth } from '@/lib/utils/health'
import { daysSince, dueLabel, greeting, relativeTime } from '@/lib/utils/dates'
import type { ProjectWithStats, TaskWithProject } from '@/types/database'

export default function Dashboard() {
  const email = useAuthStore((s) => s.user?.email ?? '')
  const { data: profile } = useProfile()
  const d = useDashboard()
  const activity = useRecentActivity(12)
  const { data: projects } = useProjects()
  const { data: clients } = useClients()
  const { workflow } = useSettings()
  const showOnboarding =
    !d.isLoading &&
    projects !== undefined &&
    clients !== undefined &&
    projects.length === 0 &&
    clients.length === 0

  const needsReview = (projects ?? []).filter(
    (p) =>
      p.status === 'active' &&
      p.review_interval_days != null &&
      daysSince(p.last_reviewed_at ?? p.created_at) >= p.review_interval_days,
  )

  const order = (
    workflow.dashboardCards.length ? workflow.dashboardCards : [...DASHBOARD_CARD_IDS]
  ).filter((id): id is DashboardCardId => (DASHBOARD_CARD_IDS as readonly string[]).includes(id))

  function renderCard(id: DashboardCardId) {
    switch (id) {
      case 'recommended':
        return (
          <Card key={id}>
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
                    <span className="text-sm font-semibold text-[--color-text-subtle]">{i + 1}</span>
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
        )
      case 'overdue':
        return (
          <TaskCard
            key={id}
            title="Overdue"
            icon={<AlertOctagon className="size-4 text-[--color-overdue]" />}
            tasks={d.overdueTasks}
            emptyTitle="Nothing overdue"
          />
        )
      case 'dueSoon':
        return (
          <TaskCard
            key={id}
            title="Due today & soon"
            icon={<CalendarClock className="size-4 text-[--color-attention]" />}
            tasks={d.dueSoonTasks}
            emptyTitle="Nothing due in the next few days"
          />
        )
      case 'highPriority':
        return (
          <TaskCard
            key={id}
            title="High & urgent"
            icon={<Flame className="size-4 text-[--color-attention]" />}
            tasks={d.highPriorityTasks}
            emptyTitle="No high-priority work queued"
          />
        )
      case 'inProgress':
        return (
          <TaskCard key={id} title="In progress" tasks={d.inProgressTasks} emptyTitle="Nothing in progress" />
        )
      case 'stale':
        return (
          <ProjectCard
            key={id}
            title="Stale projects"
            projects={d.staleProjects}
            emptyTitle="No stale projects"
            emptyDesc="Everything's had activity recently."
          />
        )
      case 'attention':
        return (
          <ProjectCard
            key={id}
            title="Needs attention"
            projects={d.attentionProjects}
            emptyTitle="No projects need attention"
          />
        )
      case 'needsReview':
        return (
          <ProjectCard
            key={id}
            title="Needs review"
            projects={needsReview}
            emptyTitle="No projects due for review"
          />
        )
      case 'activity':
        return (
          <Card key={id} className="lg:col-span-2">
            <CardHeader title="Recent activity" />
            <ActivityTimeline items={activity.data} loading={activity.isLoading} />
          </Card>
        )
      default:
        return null
    }
  }

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
        title={`${greeting()}, ${displayNameOf(profile, email)}`}
        subtitle="What needs your attention right now."
      />

      {showOnboarding && <Onboarding />}

      <div className="mb-5">
        <QuickAddTask />
      </div>

      {d.isLoading ? (
        <SkeletonRows rows={8} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{order.map(renderCard)}</div>
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
  const thresholds = useStaleThresholds()
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
