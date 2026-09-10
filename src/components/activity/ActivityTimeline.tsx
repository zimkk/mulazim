import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  CirclePlus,
  FilePen,
  FolderPlus,
  MessageSquare,
  RefreshCcw,
  RotateCcw,
} from 'lucide-react'
import type { ActivityType, ActivityLogWithRefs } from '@/types/database'
import { relativeTime } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import { SkeletonRows, EmptyState } from '@/components/ui/States'

/** Icon-chip colour per activity kind, so the rail is scannable at a glance. */
const TONE: Partial<Record<ActivityType, string>> & { default: string } = {
  default: 'bg-[var(--color-surface-2)] text-[var(--color-text-subtle)] ring-[var(--color-border)]',
  task_created: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] ring-[var(--color-accent)]/20',
  task_completed: 'bg-[var(--color-healthy)]/10 text-[var(--color-healthy)] ring-[var(--color-healthy)]/20',
  task_reopened: 'bg-[var(--color-attention)]/10 text-[var(--color-attention)] ring-[var(--color-attention)]/20',
  project_created: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] ring-[var(--color-accent)]/20',
  status_changed: 'bg-[var(--color-info)]/10 text-[var(--color-info)] ring-[var(--color-info)]/20',
  note_added: 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] ring-[var(--color-border)]',
}

const ICONS: Record<ActivityType, typeof FilePen> = {
  task_created: CirclePlus,
  task_completed: CheckCircle2,
  task_updated: FilePen,
  task_reopened: RotateCcw,
  project_created: FolderPlus,
  project_updated: FilePen,
  status_changed: RefreshCcw,
  note_added: MessageSquare,
  manual_activity: MessageSquare,
}

export function ActivityTimeline({
  items,
  loading,
  showProject = true,
}: {
  items: ActivityLogWithRefs[] | undefined
  loading?: boolean
  showProject?: boolean
}) {
  if (loading) {
    return (
      <div className="p-4">
        <SkeletonRows rows={5} />
      </div>
    )
  }
  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="size-5" />}
        title="No activity yet"
        description="Work you do shows up here automatically."
      />
    )
  }

  return (
    <ul className="relative px-4 py-3">
      {/* the timeline rail */}
      <span
        className="absolute top-6 bottom-6 left-[1.6875rem] w-px bg-[var(--color-border)]"
        aria-hidden
      />
      {items.map((item) => {
        const Icon = ICONS[item.activity_type] ?? FilePen
        return (
          <li key={item.id} className="relative flex items-start gap-3 py-2">
            <span
              className={cn(
                'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
                TONE[item.activity_type] ?? TONE.default,
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm text-[var(--color-text)]">
                {item.description ?? item.activity_type.replace(/_/g, ' ')}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                <span>{relativeTime(item.created_at)}</span>
                {showProject && item.project && (
                  <Link
                    to={`/projects/${item.project.id}`}
                    className="transition-colors hover:text-[var(--color-accent)]"
                  >
                    {item.project.name}
                  </Link>
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
