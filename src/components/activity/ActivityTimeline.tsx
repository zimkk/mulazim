import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  CirclePlus,
  FilePen,
  FolderPlus,
  MessageSquare,
  RefreshCcw,
  RotateCcw,
  Zap,
} from 'lucide-react'
import type { ActivityType, ActivityLogWithRefs } from '@/types/database'
import { relativeTime } from '@/lib/utils/dates'
import { isToday, isYesterday, parseISO, format } from 'date-fns'
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

/** "Today" / "Yesterday" / "Mon, 8 Sep" — a date is only useful once it is old. */
function dayLabel(iso: string): string {
  const d = parseISO(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, d MMM')
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

  // Grouped by day: an undifferentiated stream of events is hard to read, and
  // "what happened today" is the question people actually ask of history.
  const groups: { label: string; items: ActivityLogWithRefs[] }[] = []
  for (const item of items) {
    const label = dayLabel(item.created_at)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }

  return (
    <div className="px-4 py-3">
      {groups.map((group) => (
        <section key={group.label} className="mb-1 last:mb-0">
          <h3 className="sticky top-0 z-10 bg-[var(--color-surface)] py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
            {group.label}
          </h3>
          <ul className="relative">
            <span
              className="absolute top-4 bottom-4 left-[0.8125rem] w-px bg-[var(--color-border)]"
              aria-hidden
            />
            {group.items.map((item) => {
              const Icon = ICONS[item.activity_type] ?? FilePen
              // Automatic moves are labelled so history never implies you did
              // something the app did on your behalf.
              const auto = Boolean(
                (item.metadata as { automatic?: boolean } | null)?.automatic,
              )
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
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                      <span>{relativeTime(item.created_at)}</span>
                      {auto && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-1.5 py-px text-[0.625rem] font-medium ring-1 ring-inset ring-[var(--color-border)]">
                          <Zap className="size-2.5" /> automatic
                        </span>
                      )}
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
        </section>
      ))}
    </div>
  )
}
