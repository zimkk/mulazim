import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/Toast'
import { useProjects } from '@/lib/api/projects'
import { useCreateTask } from '@/lib/api/tasks'
import { useSettings } from '@/lib/api/settings'
import { useCreateTag, useSetTaskTags, useTags } from '@/lib/api/tags'
import { parseQuickAdd } from '@/lib/utils/parseQuickAdd'

/**
 * Fast task capture (ARCHITECTURE.md §23). When `projectId` is omitted a project
 * picker is shown — used from the Dashboard.
 */
export function QuickAddTask({
  projectId,
  onCreated,
}: {
  projectId?: string
  onCreated?: () => void
}) {
  const { notify } = useToast()
  const create = useCreateTask()
  const { data: projects } = useProjects()
  const { general } = useSettings()
  const { data: allTags } = useTags()
  const createTag = useCreateTag()
  const setTaskTags = useSetTaskTags()
  const [title, setTitle] = useState('')
  const [pickedProject, setPickedProject] = useState('')

  const activeProjects = (projects ?? []).filter((p) => p.status === 'active' || p.status === 'on_hold')
  const targetProject =
    projectId ?? (pickedProject || general.defaultProjectId || activeProjects[0]?.id || '')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !targetProject) return
    try {
      // Natural language: "#tag  !urgent  tomorrow"
      const parsed = parseQuickAdd(title)
      const task = await create.mutateAsync({
        title: parsed.title || title.trim(),
        project_id: targetProject,
        priority: parsed.priority ?? general.defaultTaskPriority,
        due_date: parsed.dueDate,
      })
      if (parsed.tagNames.length) {
        const ids: string[] = []
        for (const name of parsed.tagNames) {
          const existing = allTags?.find((t) => t.name.toLowerCase() === name.toLowerCase())
          ids.push(existing ? existing.id : (await createTag.mutateAsync({ name, color: 'slate' })).id)
        }
        await setTaskTags.mutateAsync({ taskId: task.id, tagIds: ids })
      }
      setTitle('')
      notify('Task added', 'success')
      onCreated?.()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to add task', 'error')
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-sm focus-within:border-[var(--color-accent)]/50 focus-within:shadow-md"
    >
      {!projectId && activeProjects.length > 0 && (
        <Select
          value={pickedProject || targetProject}
          onChange={(e) => setPickedProject(e.target.value)}
          className="h-9 w-44 border-0 bg-[var(--color-surface-2)]"
        >
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
        placeholder="Add a task…  try  #design  !urgent  tomorrow"
        className="flex-1 border-0 bg-transparent shadow-none focus-visible:outline-0"
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
