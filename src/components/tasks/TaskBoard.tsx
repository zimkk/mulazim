import { useMemo, useState } from 'react'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { Badge, PriorityBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import { dueLabel, isOverdue } from '@/lib/utils/dates'
import { useUpdateTask } from '@/lib/api/tasks'
import { TASK_STATUS_LABEL } from '@/lib/constants'
import { scoreTask } from '@/lib/utils/recommendations'
import { formatMinutes, totalEstimated } from '@/lib/utils/estimation'
import type { Task, TaskStatus, TaskWithProject } from '@/types/database'

/** Every status gets a column, so no task can silently vanish from the board. */
const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done', 'cancelled']

const COL_DOT: Record<TaskStatus, string> = {
  todo: 'bg-[var(--color-text-subtle)]',
  in_progress: 'bg-[var(--color-accent)]',
  blocked: 'bg-[var(--color-stale)]',
  done: 'bg-[var(--color-healthy)]',
  cancelled: 'bg-[var(--color-onhold)]',
}

/**
 * Work-in-progress limit. Not a hard block — a nudge. Exceeding it is
 * sometimes right, so it warns and explains rather than preventing anything.
 */
const WIP_LIMIT = 5
/** A realistic amount of open work to hold at once, in minutes. */
const WIP_MINUTES = 6 * 60

export function TaskBoard({
  tasks,
  onEdit,
}: {
  tasks: Task[]
  onEdit?: (t: Task) => void
}) {
  const update = useUpdateTask()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<TaskStatus | null>(null)

  /**
   * Cards sort by the same urgency score the dashboard uses, so "what matters"
   * means one thing across the whole app. The top unresolved card is marked
   * "Next up" — the single thing worth picking up now.
   */
  const { byColumn, nextUpId } = useMemo(() => {
    const byColumn = new Map<TaskStatus, Task[]>()
    for (const col of COLUMNS) {
      const inCol = tasks
        .filter((t) => t.status === col)
        .map((t) => ({ t, score: scoreTask(t as TaskWithProject).score }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.t)
      byColumn.set(col, inCol)
    }
    const actionable = [...(byColumn.get('todo') ?? []), ...(byColumn.get('in_progress') ?? [])]
    const best = actionable
      .map((t) => ({ t, score: scoreTask(t as TaskWithProject).score }))
      .sort((a, b) => b.score - a.score)[0]
    return { byColumn, nextUpId: best && best.score > 0 ? best.t.id : null }
  }, [tasks])

  function drop(status: TaskStatus) {
    const t = tasks.find((x) => x.id === dragId)
    setDragId(null)
    setOverCol(null)
    if (!t || t.status === status) return
    update.mutate({ id: t.id, projectId: t.project_id, previousStatus: t.status, status })
  }

  return (
    <div className="flex gap-3 overflow-x-auto p-3">
      {COLUMNS.map((col) => {
        const colTasks = byColumn.get(col) ?? []
        // Only open work is worth measuring; finished columns grow forever.
        const open = col === 'todo' || col === 'in_progress' || col === 'blocked'
        const minutes = open ? totalEstimated(colTasks) : 0
        const overloaded =
          col === 'in_progress' && (colTasks.length > WIP_LIMIT || minutes > WIP_MINUTES)

        return (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault()
              setOverCol(col)
            }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={() => drop(col)}
            className={cn(
              'flex w-64 shrink-0 flex-col rounded-xl border bg-[var(--color-surface-2)]/40 transition-colors',
              overCol === col
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]/60 ring-2 ring-inset ring-[var(--color-accent)]/20'
                : 'border-[var(--color-border)]',
              col === 'cancelled' && colTasks.length === 0 && 'opacity-50',
            )}
          >
            <div className="px-3 py-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)]">
                <span className="flex items-center gap-2">
                  <span className={cn('size-1.5 rounded-full', COL_DOT[col])} />
                  {TASK_STATUS_LABEL[col]}
                </span>
                <span className="rounded-full bg-[var(--color-surface-2)] px-1.5 tabular-nums">
                  {colTasks.length}
                </span>
              </div>
              {open && minutes > 0 && (
                <p
                  className={cn(
                    'mt-1 flex items-center gap-1 text-[0.6875rem]',
                    overloaded ? 'text-[var(--color-attention)]' : 'text-[var(--color-text-subtle)]',
                  )}
                >
                  {overloaded && <AlertTriangle className="size-3 shrink-0" />}
                  {formatMinutes(minutes)} estimated
                  {overloaded && ' — more than a focused day'}
                </p>
              )}
            </div>

            <div className="flex-1 space-y-2 p-2 pt-0">
              {colTasks.map((t) => {
                const overdue = isOverdue(t.due_date) && t.status !== 'done' && t.status !== 'cancelled'
                const isNext = t.id === nextUpId
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => onEdit?.(t)}
                    className={cn(
                      'card-lift cursor-grab rounded-lg border bg-[var(--color-surface)] p-2.5 text-sm shadow-sm active:cursor-grabbing',
                      overdue
                        ? 'border-[var(--color-overdue)]/40'
                        : 'border-[var(--color-border)]',
                      isNext && 'ring-2 ring-[var(--color-accent)]/40',
                      dragId === t.id && 'opacity-50',
                      t.status === 'cancelled' && 'opacity-60',
                    )}
                  >
                    {isNext && (
                      <span className="mb-1.5 inline-flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                        <Sparkles className="size-3" /> Next up
                      </span>
                    )}
                    <p
                      className={cn(
                        'mb-1.5',
                        (t.status === 'done' || t.status === 'cancelled') &&
                          'text-[var(--color-text-subtle)] line-through',
                      )}
                    >
                      {t.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PriorityBadge priority={t.priority} />
                      {t.due_date && (
                        <Badge tone={overdue ? 'overdue' : 'neutral'} dot={overdue}>
                          {dueLabel(t.due_date)}
                        </Badge>
                      )}
                      {t.estimated_minutes ? (
                        <span className="text-[0.625rem] text-[var(--color-text-subtle)]">
                          {formatMinutes(t.estimated_minutes)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
              {colTasks.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-[var(--color-text-subtle)]">—</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
