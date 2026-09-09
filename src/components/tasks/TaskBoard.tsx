import { useState } from 'react'
import { Badge, PriorityBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import { dueLabel, isOverdue } from '@/lib/utils/dates'
import { useUpdateTask } from '@/lib/api/tasks'
import { TASK_STATUS_LABEL } from '@/lib/constants'
import type { Task, TaskStatus } from '@/types/database'

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done']

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
              'flex w-64 shrink-0 flex-col rounded-md border bg-[--color-surface-2]/40',
              overCol === col ? 'border-[--color-accent]' : 'border-[--color-border]',
            )}
          >
            <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[--color-text-muted]">
              {TASK_STATUS_LABEL[col]}
              <span className="rounded-full bg-[--color-surface-2] px-1.5">{colTasks.length}</span>
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
                    'cursor-grab rounded-md border border-[--color-border] bg-[--color-surface] p-2 text-sm shadow-sm active:cursor-grabbing',
                    dragId === t.id && 'opacity-50',
                  )}
                >
                  <p className={cn('mb-1', t.status === 'done' && 'text-[--color-text-subtle] line-through')}>
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
                <p className="px-1 py-4 text-center text-xs text-[--color-text-subtle]">—</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
