import { Link } from 'react-router-dom'
import { CalendarClock, CircleDot } from 'lucide-react'
import { Badge, HealthBadge, PriorityBadge } from '@/components/ui/Badge'
import { projectHealth } from '@/lib/utils/health'
import { dueLabel, relativeTime } from '@/lib/utils/dates'
import { useStaleThresholds } from '@/lib/api/settings'
import type { ProjectWithStats } from '@/types/database'

export function ProjectRow({ project }: { project: ProjectWithStats }) {
  const thresholds = useStaleThresholds()
  const health = projectHealth(project, thresholds)

  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]/60"
    >
      <span
        className="h-8 w-1 shrink-0 rounded-full"
        style={{ background: project.color || 'var(--color-border-strong)' }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[var(--color-text)]">{project.name}</span>
          <Badge tone="neutral">{project.type}</Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
          {project.client && <span>{project.client.name}</span>}
          <span className="inline-flex items-center gap-1">
            <CircleDot className="size-3" />
            {project.open_task_count} open
            {project.overdue_task_count > 0 && (
              <span className="text-[var(--color-overdue)]"> · {project.overdue_task_count} overdue</span>
            )}
          </span>
          {project.deadline && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" />
              {dueLabel(project.deadline)}
            </span>
          )}
          <span>Active {relativeTime(project.last_activity_at)}</span>
        </div>
      </div>
      <PriorityBadge priority={project.priority} />
      <HealthBadge health={health.health} label={health.label} />
    </Link>
  )
}
