import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Subtask } from '@/types/database'
import { autoMoveDescription, shouldCompleteBySubtasks } from '@/lib/autoRules'
import { logActivity } from '@/lib/utils/activity'

const key = (taskId: string) => ['subtasks', taskId] as const

export function useSubtasks(taskId: string | undefined) {
  return useQuery({
    queryKey: taskId ? key(taskId) : ['subtasks', 'none'],
    enabled: Boolean(taskId),
    queryFn: async (): Promise<Subtask[]> => {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId!)
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useSubtaskMutations(taskId: string) {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const invalidate = () => qc.invalidateQueries({ queryKey: key(taskId) })

  const add = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from('subtasks')
        .insert({ task_id: taskId, title: title.trim(), user_id: userId, sort_order: Date.now() })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from('subtasks').update({ done }).eq('id', id)
      if (error) throw error

      // Auto-rule: checking the last subtask finishes the parent. Re-reads the
      // full list rather than trusting local state, so it stays correct when
      // subtasks are edited from more than one place.
      const [{ data: siblings }, { data: parent }] = await Promise.all([
        supabase.from('subtasks').select('done').eq('task_id', taskId),
        supabase.from('tasks').select('status, title, project_id').eq('id', taskId).single(),
      ])
      if (!parent || !siblings) return
      if (shouldCompleteBySubtasks(parent, siblings)) {
        await supabase
          .from('tasks')
          .update({ status: 'done', completed_at: new Date().toISOString() })
          .eq('id', taskId)
        if (userId) {
          await logActivity({
            userId,
            activityType: 'task_completed',
            projectId: parent.project_id,
            taskId,
            description: autoMoveDescription(parent.title, 'subtasks-complete', 'done'),
            metadata: { automatic: true, rule: 'subtasks-complete' },
          })
        }
      }
    },
    onSuccess: () => {
      void invalidate()
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { add, toggle, remove }
}
