import { Check, Circle, Play, Repeat, Square } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, PriorityBadge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Field'
import { cn } from '@/lib/utils/cn'
import { TASK_STATUSES, TASK_STATUS_LABEL } from '@/lib/constants'
import { dueLabel, isOverdue } from '@/lib/utils/dates'
import { useUpdateTask } from '@/lib/api/tasks'
import { useTaskTagMap } from '@/lib/api/tags'
import { useRunningTimer, useStartTimer, useStopTimer } from '@/lib/api/time'
import type { Task, TaskStatus, TaskWithProject } from '@/types/database'

export function TaskRow({
  task,
  onEdit,
  showProject = false,
  selected,
  onSelect,
}: {
  task: Task | TaskWithProject
  onEdit?: (task: Task) => void
  showProject?: boolean
  selected?: boolean
  onSelect?: (id: string, additive: boolean) => void
}) {
  const update = useUpdateTask()
  const tagMap = useTaskTagMap()
  const { data: running } = useRunningTimer()
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const isTiming = running?.task_id === task.id
  const tags = tagMap.get(task.id) ?? []
  const done = task.status === 'done'
  const overdue = !done && isOverdue(task.due_date)
  const projectName = 'project' in task ? task.project?.name : undefined

  function setStatus(status: TaskStatus) {
    update.mutate({ id: task.id, projectId: task.project_id, previousStatus: task.status, status })
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-[--color-border] px-3 py-2 last:border-b-0',
        selected && 'bg-[--color-accent]/8',
      )}
    >
      {onSelect && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={(e) =>
            onSelect(task.id, (e.nativeEvent as MouseEvent).shiftKey || (e.nativeEvent as MouseEvent).metaKey)
          }
          onClick={(e) => e.stopPropagation()}
          aria-label="Select task"
          className="shrink-0"
        />
      )}
      <button
        onClick={() => setStatus(done ? 'todo' : 'done')}
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

      <div className="min-w-0 flex-1">
        <button
          onClick={() => onEdit?.(task)}
          className={cn(
            'block max-w-full truncate text-left text-sm',
            done ? 'text-[--color-text-subtle] line-through' : 'text-[--color-text]',
          )}
        >
          {task.title}
        </button>
        {(showProject || tags.length > 0 || task.recurrence !== 'none') && (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[--color-text-muted]">
            {showProject && projectName && 'project' in task && task.project && (
              <Link
                to={`/projects/${task.project.id}`}
                className="hover:text-[--color-text]"
                onClick={(e) => e.stopPropagation()}
              >
                {projectName}
              </Link>
            )}
            {task.recurrence !== 'none' && <Repeat className="size-3" />}
            {tags.map((t) => (
              <span key={t.id} className="rounded bg-[--color-surface-2] px-1">
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {!done && (
        <button
          onClick={() =>
            isTiming && running
              ? stopTimer.mutate(running)
              : startTimer.mutate({ taskId: task.id, projectId: task.project_id })
          }
          className={cn(
            'rounded p-1',
            isTiming
              ? 'text-[--color-accent]'
              : 'text-[--color-text-subtle] hover:text-[--color-text]',
          )}
          aria-label={isTiming ? 'Stop timer' : 'Start timer'}
          title={isTiming ? 'Stop timer' : 'Track time on this task'}
        >
          {isTiming ? <Square className="size-3.5 fill-current" /> : <Play className="size-3.5" />}
        </button>
      )}
      {task.due_date && <Badge tone={overdue ? 'overdue' : 'neutral'}>{dueLabel(task.due_date)}</Badge>}
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
