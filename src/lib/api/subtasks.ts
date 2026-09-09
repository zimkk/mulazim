import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Subtask } from '@/types/database'

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
    },
    onSuccess: invalidate,
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
