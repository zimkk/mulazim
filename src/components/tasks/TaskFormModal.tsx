import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormRow, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/Toast'
import { useCreateTask, useDeleteTask, useUpdateTask } from '@/lib/api/tasks'
import { PRIORITIES, TASK_STATUSES, TASK_STATUS_LABEL } from '@/lib/constants'
import { toDateInputValue } from '@/lib/utils/dates'
import type { Priority, Task, TaskStatus } from '@/types/database'

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
  const editing = Boolean(task)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [estimate, setEstimate] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setStatus(task?.status ?? 'todo')
    setPriority(task?.priority ?? 'medium')
    setDueDate(toDateInputValue(task?.due_date))
    setEstimate(task?.estimated_minutes ? String(task.estimated_minutes) : '')
  }, [open, task])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      estimated_minutes: estimate ? Number(estimate) : null,
    }
    try {
      if (editing && task) {
        await update.mutateAsync({
          id: task.id,
          projectId,
          previousStatus: task.status,
          status,
          ...payload,
        })
        notify('Task updated', 'success')
      } else {
        await create.mutateAsync({ project_id: projectId, status, ...payload })
        notify('Task created', 'success')
      }
      onClose()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Save failed', 'error')
    }
  }

  async function onDelete() {
    if (!task) return
    await del.mutateAsync({ id: task.id, projectId })
    notify('Task deleted', 'success')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit task' : 'New task'}
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
            loading={create.isPending || update.isPending}
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
          <FormRow label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormRow>
        </div>
        <FormRow label="Estimate (minutes)">
          <Input
            type="number"
            min={0}
            step={15}
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
          />
        </FormRow>
        <FormRow label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormRow>
      </form>
    </Modal>
  )
}
