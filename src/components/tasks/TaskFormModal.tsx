import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormRow, Input, Select, Textarea } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/Toast'
import { useCreateTask, useDeleteTask, useUpdateTask } from '@/lib/api/tasks'
import { useCreateTag, useSetTaskTags, useTags, useTaskTagMap } from '@/lib/api/tags'
import { useSubtaskMutations, useSubtasks } from '@/lib/api/subtasks'
import { PRIORITIES, TASK_STATUSES, TASK_STATUS_LABEL } from '@/lib/constants'
import { RECURRENCE_LABEL } from '@/lib/utils/recurrence'
import { toDateInputValue } from '@/lib/utils/dates'
import type { Priority, Recurrence, Task, TaskStatus } from '@/types/database'

const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly']

export function TaskFormModal({
  open,
  onClose,
  projectId,
  task,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  task?: Task
}) {
  const { notify } = useToast()
  const create = useCreateTask()
  const update = useUpdateTask()
  const del = useDeleteTask()
  const setTaskTags = useSetTaskTags()
  const { data: allTags } = useTags()
  const createTag = useCreateTag()
  const tagMap = useTaskTagMap()
  const editing = Boolean(task)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [estimate, setEstimate] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [recurrenceUntil, setRecurrenceUntil] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  const initialTagIds = useMemo(
    () => (task ? (tagMap.get(task.id) ?? []).map((t) => t.id) : []),
    [task, tagMap],
  )

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setStatus(task?.status ?? 'todo')
    setPriority(task?.priority ?? 'medium')
    setDueDate(toDateInputValue(task?.due_date))
    setStartDate(toDateInputValue(task?.start_date))
    setEstimate(task?.estimated_minutes ? String(task.estimated_minutes) : '')
    setRecurrence(task?.recurrence ?? 'none')
    setRecurrenceUntil(toDateInputValue(task?.recurrence_until))
    setTagIds(initialTagIds)
  }, [open, task, initialTagIds])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      start_date: startDate || null,
      estimated_minutes: estimate ? Number(estimate) : null,
      recurrence,
      recurrence_until: recurrence === 'none' ? null : recurrenceUntil || null,
    }
    try {
      let taskId = task?.id
      if (editing && task) {
        await update.mutateAsync({ id: task.id, projectId, previousStatus: task.status, status, ...payload })
      } else {
        const created = await create.mutateAsync({ project_id: projectId, status, ...payload })
        taskId = created.id
      }
      if (taskId && tagIds.join() !== initialTagIds.join()) {
        await setTaskTags.mutateAsync({ taskId, tagIds })
      }
      notify(editing ? 'Task updated' : 'Task created', 'success')
      onClose()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Save failed', 'error')
    }
  }

  async function onDelete() {
    if (!task) return
    await del.mutateAsync({ id: task.id, projectId })
    notify('Task moved to trash', 'success')
    onClose()
  }

  function toggleTag(id: string) {
    setTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  async function addTag() {
    const name = newTag.trim()
    if (!name) return
    const existing = allTags?.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      toggleTag(existing.id)
    } else {
      const t = await createTag.mutateAsync({ name, color: 'slate' })
      setTagIds((ids) => [...ids, t.id])
    }
    setNewTag('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit task' : 'New task'}
      width="lg"
      footer={
        <>
          {editing && (
            <Button variant="danger" onClick={onDelete} loading={del.isPending} className="mr-auto">
              Delete
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            form="task-form"
            loading={create.isPending || update.isPending || setTaskTags.isPending}
          >
            {editing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={onSubmit} className="space-y-3">
        <FormRow label="Title *">
          <Input required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </FormRow>

        <div className="grid grid-cols-3 gap-3">
          <FormRow label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow label="Estimate (min)">
            <Input
              type="number"
              min={0}
              step={15}
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
            />
          </FormRow>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Start date">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormRow>
          <FormRow label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormRow>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Repeat">
            <Select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            >
              {RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {RECURRENCE_LABEL[r]}
                </option>
              ))}
            </Select>
          </FormRow>
          {recurrence !== 'none' && (
            <FormRow label="Repeat until (optional)">
              <Input
                type="date"
                value={recurrenceUntil}
                onChange={(e) => setRecurrenceUntil(e.target.value)}
              />
            </FormRow>
          )}
        </div>

        <FormRow label="Tags">
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              {(allTags ?? []).map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  className={
                    'rounded px-1.5 py-0.5 text-xs ' +
                    (tagIds.includes(t.id)
                      ? 'bg-[--color-accent] text-[--color-accent-fg]'
                      : 'bg-[--color-surface-2] text-[--color-text-muted]')
                  }
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void addTag()
                  }
                }}
                placeholder="Add or create a tag"
                className="h-8"
              />
              <Button type="button" size="sm" icon={<Plus className="size-3.5" />} onClick={addTag}>
                Add
              </Button>
            </div>
          </div>
        </FormRow>

        <FormRow label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormRow>
      </form>

      {editing && task && <SubtaskEditor taskId={task.id} />}
    </Modal>
  )
}

function SubtaskEditor({ taskId }: { taskId: string }) {
  const { data: subs } = useSubtasks(taskId)
  const { add, toggle, remove } = useSubtaskMutations(taskId)
  const [text, setText] = useState('')
  const done = (subs ?? []).filter((s) => s.done).length
  const total = subs?.length ?? 0

  return (
    <div className="mt-4 border-t border-[--color-border] pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[--color-text-muted]">Checklist</span>
        {total > 0 && (
          <Badge tone={done === total ? 'healthy' : 'neutral'}>
            {done}/{total}
          </Badge>
        )}
      </div>
      <ul className="space-y-1">
        {(subs ?? []).map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={s.done}
              onChange={(e) => toggle.mutate({ id: s.id, done: e.target.checked })}
            />
            <span
              className={
                'flex-1 text-sm ' + (s.done ? 'text-[--color-text-subtle] line-through' : '')
              }
            >
              {s.title}
            </span>
            <button
              onClick={() => remove.mutate(s.id)}
              className="text-[--color-text-subtle] hover:text-[--color-stale]"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          add.mutate(text)
          setText('')
        }}
        className="mt-2 flex gap-2"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a checklist item"
          className="h-8"
        />
        <Button type="submit" size="sm" icon={<Plus className="size-3.5" />}>
          Add
        </Button>
      </form>
    </div>
  )
}
