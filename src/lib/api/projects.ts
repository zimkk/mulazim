import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { isOverdue } from '@/lib/utils/dates'
import { logActivity } from '@/lib/utils/activity'
import { useAuthStore } from '@/stores/authStore'
import type {
  Priority,
  Project,
  ProjectStatus,
  ProjectType,
  ProjectWithStats,
} from '@/types/database'

export interface ProjectInput {
  name: string
  description?: string | null
  type: ProjectType
  status: ProjectStatus
  priority: Priority
  deadline?: string | null
  client_id?: string | null
  review_interval_days?: number | null
}

interface TaskAggRow {
  project_id: string
  status: string
  due_date: string | null
}

function buildStats(
  projects: Project[],
  clients: { id: string; name: string; company_name: string | null }[],
  tasks: TaskAggRow[],
): ProjectWithStats[] {
  const clientById = new Map(clients.map((c) => [c.id, c]))
  const agg = new Map<string, { open: number; overdue: number; total: number }>()
  for (const t of tasks) {
    const entry = agg.get(t.project_id) ?? { open: 0, overdue: 0, total: 0 }
    entry.total += 1
    const open = t.status !== 'done' && t.status !== 'cancelled'
    if (open) {
      entry.open += 1
      if (isOverdue(t.due_date)) entry.overdue += 1
    }
    agg.set(t.project_id, entry)
  }
  return projects.map((p) => {
    const a = agg.get(p.id) ?? { open: 0, overdue: 0, total: 0 }
    const c = p.client_id ? clientById.get(p.client_id) : undefined
    return {
      ...p,
      client: c ? { id: c.id, name: c.name, company_name: c.company_name } : null,
      open_task_count: a.open,
      overdue_task_count: a.overdue,
      total_task_count: a.total,
    }
  })
}

async function fetchProjectsWithStats(filter?: {
  clientId?: string
}): Promise<ProjectWithStats[]> {
  let projectQuery = supabase
    .from('projects')
    .select('*')
    .is('deleted_at', null)
    .order('last_activity_at', { ascending: false })
  if (filter?.clientId) projectQuery = projectQuery.eq('client_id', filter.clientId)

  const [{ data: projects, error }, { data: clients, error: cErr }, { data: tasks, error: tErr }] =
    await Promise.all([
      projectQuery,
      supabase.from('clients').select('id, name, company_name').is('deleted_at', null),
      supabase.from('tasks').select('project_id, status, due_date').is('deleted_at', null),
    ])
  if (error) throw error
  if (cErr) throw cErr
  if (tErr) throw tErr
  return buildStats(projects ?? [], clients ?? [], (tasks ?? []) as TaskAggRow[])
}

export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: () => fetchProjectsWithStats(),
  })
}

export function useProjectsByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: clientId ? qk.projectsByClient(clientId) : ['projects', 'byClient', 'none'],
    enabled: Boolean(clientId),
    queryFn: () => fetchProjectsWithStats({ clientId }),
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.project(id) : ['projects', 'none'],
    enabled: Boolean(id),
    queryFn: async (): Promise<ProjectWithStats> => {
      const all = await fetchProjectsWithStats()
      const found = all.find((p) => p.id === id)
      if (!found) throw new Error('Project not found')
      return found
    },
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async (input: ProjectInput): Promise<Project> => {
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...input, user_id: userId })
        .select('*')
        .single()
      if (error) throw error
      if (userId) {
        await logActivity({
          userId,
          activityType: 'project_created',
          projectId: data.id,
          description: `Created project "${data.name}"`,
        })
      }
      return data
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async ({
      id,
      previousStatus,
      ...input
    }: Partial<ProjectInput> & { id: string; previousStatus?: ProjectStatus }): Promise<Project> => {
      const { data, error } = await supabase
        .from('projects')
        .update(input)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      if (userId) {
        const statusChanged = input.status && input.status !== previousStatus
        await logActivity({
          userId,
          activityType: statusChanged ? 'status_changed' : 'project_updated',
          projectId: id,
          description: statusChanged
            ? `Status → ${input.status}`
            : `Updated project "${data.name}"`,
        })
      }
      return data
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useArchiveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('projects').update({ status: 'archived' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useSetProjectFields() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...fields
    }: { id: string } & Partial<
      Pick<
        import('@/types/database').Project,
        'pinned' | 'color' | 'sort_order' | 'review_interval_days' | 'last_reviewed_at'
      >
    >): Promise<void> => {
      const { error } = await supabase.from('projects').update(fields).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}

/** Soft delete — moves to Trash (restorable). */
export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: qk.projects })
  void qc.invalidateQueries({ queryKey: qk.clients })
  void qc.invalidateQueries({ queryKey: qk.dashboard })
  void qc.invalidateQueries({ queryKey: qk.activity })
}
