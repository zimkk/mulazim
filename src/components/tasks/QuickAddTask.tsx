import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/Toast'
import { useProjects } from '@/lib/api/projects'
import { useCreateTask } from '@/lib/api/tasks'

/**
 * Fast task capture (ARCHITECTURE.md §23). When `projectId` is omitted a project
 * picker is shown — used from the Dashboard.
 */
export function QuickAddTask({ projectId }: { projectId?: string }) {
  const { notify } = useToast()
  const create = useCreateTask()
  const { data: projects } = useProjects()
  const [title, setTitle] = useState('')
  const [pickedProject, setPickedProject] = useState('')

  const targetProject = projectId ?? pickedProject
  const activeProjects = (projects ?? []).filter((p) => p.status === 'active' || p.status === 'on_hold')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !targetProject) return
    try {
      await create.mutateAsync({ title: title.trim(), project_id: targetProject })
      setTitle('')
      notify('Task added', 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to add task', 'error')
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      {!projectId && (
        <Select
          value={pickedProject}
          onChange={(e) => setPickedProject(e.target.value)}
          className="h-9 w-44"
        >
          <option value="">Choose project…</option>
          {activeProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      )}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task and press Enter"
        className="flex-1"
      />
      <Button
        type="submit"
        variant="primary"
        icon={<Plus className="size-4" />}
        loading={create.isPending}
        disabled={!title.trim() || !targetProject}
      >
        Add
      </Button>
    </form>
  )
}
