import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { logActivity } from '@/lib/utils/activity'
import { useAuthStore } from '@/stores/authStore'
import type { Priority, Task, TaskStatus, TaskWithProject } from '@/types/database'

export interface TaskInput {
  title: string
  project_id: string
  description?: string | null
  status?: TaskStatus
  priority?: Priority
  due_date?: string | null
  estimated_minutes?: number | null
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
        .order('created_at', { ascending: true })
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

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }): Promise<void> => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, vars) => invalidate(qc, vars.projectId),
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
