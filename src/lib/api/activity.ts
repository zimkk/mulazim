import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import type { ActivityLogWithRefs } from '@/types/database'

const SELECT = '*, project:projects(id, name), task:tasks(id, title)'

export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: [...qk.activity, 'recent', limit],
    queryFn: async (): Promise<ActivityLogWithRefs[]> => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(SELECT)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as unknown as ActivityLogWithRefs[]
    },
  })
}

export function useProjectActivity(projectId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: projectId
      ? [...qk.activityByProject(projectId), limit]
      : ['activity', 'byProject', 'none'],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ActivityLogWithRefs[]> => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(SELECT)
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as unknown as ActivityLogWithRefs[]
    },
  })
}

export function useAddNote() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async ({
      projectId,
      text,
    }: {
      projectId: string | null
      text: string
    }): Promise<void> => {
      const { error } = await supabase.from('activity_logs').insert({
        user_id: userId,
        project_id: projectId,
        activity_type: 'note_added',
        description: text,
      })
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: qk.activity })
      if (vars.projectId) {
        void qc.invalidateQueries({ queryKey: qk.activityByProject(vars.projectId) })
        void qc.invalidateQueries({ queryKey: qk.project(vars.projectId) })
      }
      void qc.invalidateQueries({ queryKey: qk.projects })
    },
  })
}
