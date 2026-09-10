import { useMemo, useState } from 'react'
import { AlertTriangle, GripVertical, Sparkles } from 'lucide-react'
import { Badge, PriorityBadge } from '@/components/ui/Badge'
import { Segmented } from '@/components/ui/Controls'
import { cn } from '@/lib/utils/cn'
import { dueLabel, isOverdue } from '@/lib/utils/dates'
import { useReorderTasks, useUpdateTask } from '@/lib/api/tasks'
import { useUiStore } from '@/stores/uiStore'
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

/** Where a dragged card would land: which column, and before which index. */
interface DropTarget {
  col: TaskStatus
  index: number
}

export function TaskBoard({
  tasks,
  onEdit,
}: {
  tasks: Task[]
  onEdit?: (t: Task) => void
}) {
  const update = useUpdateTask()
  const reorder = useReorderTasks()
  const boardOrder = useUiStore((s) => s.boardOrder)
  const setBoardOrder = useUiStore((s) => s.setBoardOrder)
  const [dragId, setDragId] = useState<string | null>(null)
  const [target, setTarget] = useState<DropTarget | null>(null)

  /**
   * Two orderings, both first-class:
   *  - auto   — the same urgency score the dashboard uses, so "what matters"
   *             means one thing across the app.
   *  - manual — your own arrangement, via sort_order.
   * Dragging a card to reorder flips the board to manual rather than being
   * ignored, so the hand-operated path is never a dead end.
   */
  const { byColumn, nextUpId } = useMemo(() => {
    const byColumn = new Map<TaskStatus, Task[]>()
    for (const col of COLUMNS) {
      const inCol = tasks.filter((t) => t.status === col)
      byColumn.set(
        col,
        boardOrder === 'manual'
          ? [...inCol].sort(
              (a, b) =>
                (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
                  (b.sort_order ?? Number.MAX_SAFE_INTEGER) ||
                a.created_at.localeCompare(b.created_at),
            )
          : [...inCol].sort(
              (a, b) => scoreTask(b as TaskWithProject).score - scoreTask(a as TaskWithProject).score,
            ),
      )
    }
    const actionable = [...(byColumn.get('todo') ?? []), ...(byColumn.get('in_progress') ?? [])]
    const best = actionable
      .map((t) => ({ t, score: scoreTask(t as TaskWithProject).score }))
      .sort((a, b) => b.score - a.score)[0]
    return { byColumn, nextUpId: best && best.score > 0 ? best.t.id : null }
  }, [tasks, boardOrder])

  function clearDrag() {
    setDragId(null)
    setTarget(null)
  }

  /**
   * Applies a drop. Handles both halves in one place: a column change writes
   * the new status, and the resulting arrangement is always persisted as
   * sort_order so the manual ordering survives a reload.
   */
  function commitDrop(col: TaskStatus, index: number) {
    const dragged = tasks.find((t) => t.id === dragId)
    if (!dragged) return clearDrag()

    const destination = [...(byColumn.get(col) ?? [])].filter((t) => t.id !== dragged.id)
    const at = Math.max(0, Math.min(index, destination.length))
    destination.splice(at, 0, dragged)

    const movedColumn = dragged.status !== col
    if (movedColumn) {
      update.mutate({
        id: dragged.id,
        projectId: dragged.project_id,
        previousStatus: dragged.status,
        status: col,
      })
    }

    // Reordering by hand is an explicit statement of intent — respect it by
    // switching the board to manual, otherwise the auto sort would immediately
    // undo what the user just did.
    const orderChanged =
      movedColumn || destination.findIndex((t) => t.id === dragged.id) !== (byColumn.get(col) ?? []).findIndex((t) => t.id === dragged.id)
    if (orderChanged) {
      if (boardOrder !== 'manual') setBoardOrder('manual')
      reorder.mutate({
        projectId: dragged.project_id,
        updates: destination.map((t, i) => ({ id: t.id, sort_order: i })),
      })
    }
    clearDrag()
  }

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--color-text-subtle)]">
          {boardOrder === 'auto'
            ? 'Sorted by urgency — drag a card to arrange it yourself'
            : 'Your order — drag to rearrange'}
        </p>
        <Segmented
          value={boardOrder}
          onChange={setBoardOrder}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'manual', label: 'Manual' },
          ]}
        />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {COLUMNS.map((col) => {
          const colTasks = byColumn.get(col) ?? []
          // Only open work is worth measuring; finished columns grow forever.
          const open = col === 'todo' || col === 'in_progress' || col === 'blocked'
          const minutes = open ? totalEstimated(colTasks) : 0
          const overloaded =
            col === 'in_progress' && (colTasks.length > WIP_LIMIT || minutes > WIP_MINUTES)
          const isTargetCol = target?.col === col

          return (
            <div
              key={col}
              onDragOver={(e) => {
                e.preventDefault()
                // Dropping on empty space below the cards appends to the end.
                if (!isTargetCol) setTarget({ col, index: colTasks.length })
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setTarget((t) => (t?.col === col ? null : t))
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                commitDrop(col, target?.col === col ? target.index : colTasks.length)
              }}
              className={cn(
                'flex w-64 shrink-0 flex-col rounded-xl border bg-[var(--color-surface-2)]/40 transition-colors',
                isTargetCol
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
                      overloaded
                        ? 'text-[var(--color-attention)]'
                        : 'text-[var(--color-text-subtle)]',
                    )}
                  >
                    {overloaded && <AlertTriangle className="size-3 shrink-0" />}
                    {formatMinutes(minutes)} estimated
                    {overloaded && ' — more than a focused day'}
                  </p>
                )}
              </div>

              <div className="flex min-h-16 flex-1 flex-col gap-2 p-2 pt-0">
                {colTasks.map((t, i) => {
                  const overdue =
                    isOverdue(t.due_date) && t.status !== 'done' && t.status !== 'cancelled'
                  const isNext = t.id === nextUpId
                  const showLineBefore = isTargetCol && target?.index === i && dragId !== t.id
                  return (
                    <div key={t.id}>
                      {showLineBefore && <DropLine />}
                      <div
                        draggable
                        onDragStart={() => setDragId(t.id)}
                        onDragEnd={clearDrag}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          // Above the midpoint inserts before, below inserts after.
                          const r = e.currentTarget.getBoundingClientRect()
                          const after = e.clientY > r.top + r.height / 2
                          setTarget({ col, index: after ? i + 1 : i })
                        }}
                        onClick={() => onEdit?.(t)}
                        className={cn(
                          'group card-lift cursor-grab rounded-lg border bg-[var(--color-surface)] p-2.5 text-sm shadow-sm active:cursor-grabbing',
                          overdue
                            ? 'border-[var(--color-overdue)]/40'
                            : 'border-[var(--color-border)]',
                          isNext && 'ring-2 ring-[var(--color-accent)]/40',
                          dragId === t.id && 'opacity-40',
                          t.status === 'cancelled' && 'opacity-60',
                        )}
                      >
                        {isNext && (
                          <span className="mb-1.5 inline-flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                            <Sparkles className="size-3" /> Next up
                          </span>
                        )}
                        <div className="flex items-start gap-1.5">
                          <GripVertical
                            className="mt-0.5 size-3.5 shrink-0 text-[var(--color-text-subtle)] opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden
                          />
                          <p
                            className={cn(
                              'flex-1',
                              (t.status === 'done' || t.status === 'cancelled') &&
                                'text-[var(--color-text-subtle)] line-through',
                            )}
                          >
                            {t.title}
                          </p>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-5">
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
                    </div>
                  )
                })}
                {isTargetCol && target?.index === colTasks.length && <DropLine />}
                {colTasks.length === 0 && !isTargetCol && (
                  <p className="px-1 py-4 text-center text-xs text-[var(--color-text-subtle)]">—</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Insertion indicator — shows exactly where the card will land. */
function DropLine() {
  return (
    <div className="my-1 h-0.5 rounded-full bg-[var(--color-accent)]" aria-hidden />
  )
}
