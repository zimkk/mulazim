import { Check, Circle } from 'lucide-react'
import { Badge, PriorityBadge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Field'
import { cn } from '@/lib/utils/cn'
import { TASK_STATUSES, TASK_STATUS_LABEL } from '@/lib/constants'
import { dueLabel, isOverdue } from '@/lib/utils/dates'
import { useUpdateTask } from '@/lib/api/tasks'
import type { Task, TaskStatus } from '@/types/database'

export function TaskRow({
  task,
  onEdit,
}: {
  task: Task
  onEdit?: (task: Task) => void
}) {
  const update = useUpdateTask()
  const done = task.status === 'done'
  const overdue = !done && isOverdue(task.due_date)

  function setStatus(status: TaskStatus) {
    update.mutate({ id: task.id, projectId: task.project_id, previousStatus: task.status, status })
  }

  function toggleDone() {
    setStatus(done ? 'todo' : 'done')
  }

  return (
    <div className="flex items-center gap-3 border-b border-[--color-border] px-3 py-2 last:border-b-0">
      <button
        onClick={toggleDone}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border',
          done
            ? 'border-[--color-healthy] bg-[--color-healthy] text-white'
            : 'border-[--color-border] text-transparent hover:border-[--color-accent]',
        )}
        aria-label={done ? 'Reopen task' : 'Complete task'}
      >
        {done ? <Check className="size-3" /> : <Circle className="size-3" />}
      </button>

      <button
        onClick={() => onEdit?.(task)}
        className={cn(
          'min-w-0 flex-1 truncate text-left text-sm',
          done ? 'text-[--color-text-subtle] line-through' : 'text-[--color-text]',
        )}
      >
        {task.title}
      </button>

      {task.due_date && (
        <Badge tone={overdue ? 'overdue' : 'neutral'}>{dueLabel(task.due_date)}</Badge>
      )}
      <PriorityBadge priority={task.priority} />

      <Select
        value={task.status}
        onChange={(e) => setStatus(e.target.value as TaskStatus)}
        className="h-7 w-32 py-0 text-xs"
      >
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {TASK_STATUS_LABEL[s]}
          </option>
        ))}
      </Select>
    </div>
  )
}
