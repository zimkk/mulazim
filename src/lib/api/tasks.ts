import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { logActivity } from '@/lib/utils/activity'
import { nextOccurrence } from '@/lib/utils/recurrence'
import { useAuthStore } from '@/stores/authStore'
import type { Priority, Recurrence, Task, TaskStatus, TaskWithProject } from '@/types/database'

export interface TaskInput {
  title: string
  project_id: string
  description?: string | null
  status?: TaskStatus
  priority?: Priority
  due_date?: string | null
  start_date?: string | null
  estimated_minutes?: number | null
  recurrence?: Recurrence
  recurrence_until?: string | null
}

const PROJECT_SELECT = '*, project:projects(id, name, type, status)'

export function useTasksByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.tasksByProject(projectId) : ['tasks', 'byProject', 'none'],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<TaskWithProject[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select(PROJECT_SELECT)
        .eq('project_id', projectId!)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as TaskWithProject[]
    },
  })
}

export function useCompletedSince(sinceIso: string) {
  return useQuery({
    queryKey: ['tasks', 'completedSince', sinceIso],
    queryFn: async (): Promise<TaskWithProject[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select(PROJECT_SELECT)
        .is('deleted_at', null)
        .eq('status', 'done')
        .gte('completed_at', sinceIso)
        .order('completed_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as TaskWithProject[]
    },
  })
}

export function useAllOpenTasks() {
  return useQuery({
    queryKey: qk.tasks,
    queryFn: async (): Promise<TaskWithProject[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select(PROJECT_SELECT)
        .is('deleted_at', null)
        .not('status', 'in', '(done,cancelled)')
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return (data ?? []) as unknown as TaskWithProject[]
    },
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async (input: TaskInput): Promise<Task> => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...input, user_id: userId })
        .select('*')
        .single()
      if (error) throw error
      if (userId) {
        await logActivity({
          userId,
          activityType: 'task_created',
          projectId: input.project_id,
          taskId: data.id,
          description: `Created task "${data.title}"`,
        })
      }
      return data
    },
    onSuccess: (task) => invalidate(qc, task.project_id),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      previousStatus,
      ...input
    }: Partial<TaskInput> & {
      id: string
      projectId: string
      previousStatus?: TaskStatus
    }): Promise<Task> => {
      const patch: Record<string, unknown> = { ...input }
      if (input.status === 'done' && previousStatus !== 'done') {
        patch.completed_at = new Date().toISOString()
      }
      if (input.status && input.status !== 'done' && previousStatus === 'done') {
        patch.completed_at = null
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error

      // Recurring task completed → materialise the next occurrence.
      if (input.status === 'done' && previousStatus !== 'done' && data.recurrence !== 'none') {
        const anchor = data.due_date ?? data.start_date ?? new Date().toISOString().slice(0, 10)
        const nextDue = nextOccurrence(anchor, data.recurrence, data.recurrence_until)
        if (nextDue) {
          const shift = data.start_date && data.due_date
            ? nextOccurrence(data.start_date, data.recurrence, data.recurrence_until)
            : null
          await supabase.from('tasks').insert({
            user_id: data.user_id,
            project_id: data.project_id,
            title: data.title,
            description: data.description,
            priority: data.priority,
            status: 'todo',
            due_date: data.due_date ? nextDue : null,
            start_date: data.start_date ? (shift ?? nextDue) : null,
            estimated_minutes: data.estimated_minutes,
            recurrence: data.recurrence,
            recurrence_until: data.recurrence_until,
          })
        }
      }

      if (userId && input.status && input.status !== previousStatus) {
        const type =
          input.status === 'done'
            ? 'task_completed'
            : previousStatus === 'done'
              ? 'task_reopened'
              : 'task_updated'
        await logActivity({
          userId,
          activityType: type,
          projectId,
          taskId: id,
          description:
            input.status === 'done'
              ? `Completed "${data.title}"`
              : `"${data.title}" → ${input.status}`,
        })
      } else if (userId) {
        await logActivity({
          userId,
          activityType: 'task_updated',
          projectId,
          taskId: id,
          description: `Updated "${data.title}"`,
        })
      }
      return data
    },
    onSuccess: (task) => invalidate(qc, task.project_id),
  })
}

/** Soft delete — recoverable from Trash. */
export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }): Promise<void> => {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, vars) => invalidate(qc, vars.projectId),
  })
}

export function useReorderTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      updates,
    }: {
      projectId: string
      updates: { id: string; sort_order: number }[]
    }): Promise<void> => {
      for (const u of updates) {
        const { error } = await supabase
          .from('tasks')
          .update({ sort_order: u.sort_order })
          .eq('id', u.id)
        if (error) throw error
      }
    },
    onSuccess: (_d, vars) => invalidate(qc, vars.projectId),
  })
}

function invalidate(qc: ReturnType<typeof useQueryClient>, projectId: string) {
  void qc.invalidateQueries({ queryKey: qk.tasksByProject(projectId) })
  void qc.invalidateQueries({ queryKey: qk.tasks })
  void qc.invalidateQueries({ queryKey: qk.projects })
  void qc.invalidateQueries({ queryKey: qk.project(projectId) })
  void qc.invalidateQueries({ queryKey: qk.clients })
  void qc.invalidateQueries({ queryKey: qk.dashboard })
  void qc.invalidateQueries({ queryKey: qk.activity })
}
