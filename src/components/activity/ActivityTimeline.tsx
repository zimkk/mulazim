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
import { SkeletonRows, EmptyState } from '@/components/ui/States'

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
  if (loading) return <SkeletonRows rows={5} />
  if (!items || items.length === 0) {
    return <EmptyState title="No activity yet" description="Work you do shows up here automatically." />
  }

  return (
    <ul className="divide-y divide-[--color-border]">
      {items.map((item) => {
        const Icon = ICONS[item.activity_type] ?? FilePen
        return (
          <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
            <Icon className="mt-0.5 size-4 shrink-0 text-[--color-text-subtle]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[--color-text]">
                {item.description ?? item.activity_type.replace(/_/g, ' ')}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-[--color-text-muted]">
                <span>{relativeTime(item.created_at)}</span>
                {showProject && item.project && (
                  <Link
                    to={`/projects/${item.project.id}`}
                    className="hover:text-[--color-text]"
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
