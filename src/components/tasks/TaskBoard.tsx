import { useState } from 'react'
import { Badge, PriorityBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import { dueLabel, isOverdue } from '@/lib/utils/dates'
import { useUpdateTask } from '@/lib/api/tasks'
import { TASK_STATUS_LABEL } from '@/lib/constants'
import type { Task, TaskStatus } from '@/types/database'

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done']

const COL_DOT: Record<TaskStatus, string> = {
  todo: 'bg-[var(--color-text-subtle)]',
  in_progress: 'bg-[var(--color-accent)]',
  blocked: 'bg-[var(--color-stale)]',
  done: 'bg-[var(--color-healthy)]',
  cancelled: 'bg-[var(--color-onhold)]',
}

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
        const colTasks = tasks.filter((t) => t.status === col)
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
            )}
          >
            <div className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-[var(--color-text-muted)]">
              <span className="flex items-center gap-2">
                <span className={cn('size-1.5 rounded-full', COL_DOT[col])} />
                {TASK_STATUS_LABEL[col]}
              </span>
              <span className="rounded-full bg-[var(--color-surface-2)] px-1.5 tabular-nums">
                {colTasks.length}
              </span>
            </div>
            <div className="flex-1 space-y-2 p-2">
              {colTasks.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => onEdit?.(t)}
                  className={cn(
                    'card-lift cursor-grab rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-sm shadow-sm active:cursor-grabbing',
                    dragId === t.id && 'opacity-50',
                  )}
                >
                  <p className={cn('mb-1', t.status === 'done' && 'text-[var(--color-text-subtle)] line-through')}>
                    {t.title}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge priority={t.priority} />
                    {t.due_date && (
                      <Badge tone={isOverdue(t.due_date) ? 'overdue' : 'neutral'}>
                        {dueLabel(t.due_date)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
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
