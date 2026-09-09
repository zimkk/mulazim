import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormRow, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/Toast'
import { useClients } from '@/lib/api/clients'
import { useCreateProject, useUpdateProject, type ProjectInput } from '@/lib/api/projects'
import {
  PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPES,
} from '@/lib/constants'
import { toDateInputValue } from '@/lib/utils/dates'
import type { Priority, Project, ProjectStatus, ProjectType } from '@/types/database'

export function ProjectFormModal({
  open,
  onClose,
  project,
  defaultClientId,
}: {
  open: boolean
  onClose: () => void
  project?: Project
  defaultClientId?: string | null
}) {
  const { notify } = useToast()
  const { data: clients } = useClients()
  const create = useCreateProject()
  const update = useUpdateProject()
  const editing = Boolean(project)

  const [form, setForm] = useState<ProjectInput>({
    name: '',
    description: null,
    type: 'client',
    status: 'active',
    priority: 'medium',
    deadline: null,
    client_id: defaultClientId ?? null,
  })

  useEffect(() => {
    if (!open) return
    setForm({
      name: project?.name ?? '',
      description: project?.description ?? null,
      type: project?.type ?? 'client',
      status: project?.status ?? 'active',
      priority: project?.priority ?? 'medium',
      deadline: project?.deadline ?? null,
      client_id: project?.client_id ?? defaultClientId ?? null,
    })
  }, [open, project, defaultClientId])

  function set<K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const payload: ProjectInput = {
      ...form,
      name: form.name.trim(),
      description: form.description?.trim() || null,
      client_id: form.type === 'client' ? form.client_id : null,
    }
    try {
      if (editing && project) {
        await update.mutateAsync({ id: project.id, previousStatus: project.status, ...payload })
        notify('Project updated', 'success')
      } else {
        await create.mutateAsync(payload)
        notify('Project created', 'success')
      }
      onClose()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Save failed', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit project' : 'New project'}
      width="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            form="project-form"
            loading={create.isPending || update.isPending}
          >
            {editing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={onSubmit} className="space-y-3">
        <FormRow label="Name *">
          <Input
            required
            autoFocus
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </FormRow>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Type">
            <Select value={form.type} onChange={(e) => set('type', e.target.value as ProjectType)}>
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow label="Client">
            <Select
              value={form.client_id ?? ''}
              disabled={form.type !== 'client'}
              onChange={(e) => set('client_id', e.target.value || null)}
            >
              <option value="">— none —</option>
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormRow>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FormRow label="Status">
            <Select
              value={form.status}
              onChange={(e) => set('status', e.target.value as ProjectStatus)}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow label="Priority">
            <Select
              value={form.priority}
              onChange={(e) => set('priority', e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow label="Deadline">
            <Input
              type="date"
              value={toDateInputValue(form.deadline)}
              onChange={(e) => set('deadline', e.target.value || null)}
            />
          </FormRow>
        </div>

        <FormRow label="Description">
          <Textarea
            value={form.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </FormRow>
      </form>
    </Modal>
  )
}
