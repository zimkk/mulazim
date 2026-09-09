import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'

export interface TimeEntry {
  id: string
  user_id: string
  task_id: string
  project_id: string
  started_at: string
  ended_at: string | null
  note: string | null
  created_at: string
}

export interface RunningTimer extends TimeEntry {
  task: { id: string; title: string; project_id: string } | null
}

const RUNNING_KEY = ['time', 'running'] as const

export function useRunningTimer() {
  return useQuery({
    queryKey: RUNNING_KEY,
    refetchInterval: 60_000,
    queryFn: async (): Promise<RunningTimer | null> => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, task:tasks(id, title, project_id)')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as unknown as RunningTimer) ?? null
    },
  })
}

export function useStartTimer() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async ({
      taskId,
      projectId,
    }: {
      taskId: string
      projectId: string
    }): Promise<void> => {
      // Stop any running entry first.
      await supabase
        .from('time_entries')
        .update({ ended_at: new Date().toISOString() })
        .is('ended_at', null)
      const { error } = await supabase
        .from('time_entries')
        .insert({ task_id: taskId, project_id: projectId, user_id: userId })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['time'] }),
  })
}

export function useStopTimer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry: RunningTimer): Promise<void> => {
      const endedAt = new Date()
      const seconds = Math.round((endedAt.getTime() - new Date(entry.started_at).getTime()) / 1000)
      const { error } = await supabase
        .from('time_entries')
        .update({ ended_at: endedAt.toISOString() })
        .eq('id', entry.id)
      if (error) throw error
      // Roll the minutes into the task's actual_minutes.
      const mins = Math.max(1, Math.round(seconds / 60))
      const { data: t } = await supabase
        .from('tasks')
        .select('actual_minutes')
        .eq('id', entry.task_id)
        .maybeSingle()
      await supabase
        .from('tasks')
        .update({ actual_minutes: (t?.actual_minutes ?? 0) + mins })
        .eq('id', entry.task_id)
    },
    onSuccess: (_d, entry) => {
      void qc.invalidateQueries({ queryKey: ['time'] })
      void qc.invalidateQueries({ queryKey: qk.tasksByProject(entry.project_id) })
      void qc.invalidateQueries({ queryKey: qk.tasks })
    },
  })
}

export function useTimeReport(sinceIso: string) {
  return useQuery({
    queryKey: ['time', 'report', sinceIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('project_id, started_at, ended_at, project:projects(name)')
        .not('ended_at', 'is', null)
        .gte('started_at', sinceIso)
      if (error) throw error
      const byProject = new Map<string, { name: string; minutes: number }>()
      let total = 0
      for (const e of data ?? []) {
        const mins = Math.round(
          (new Date(e.ended_at as string).getTime() - new Date(e.started_at).getTime()) / 60000,
        )
        total += mins
        const name = (e.project as unknown as { name?: string })?.name ?? 'Unknown'
        const cur = byProject.get(e.project_id) ?? { name, minutes: 0 }
        cur.minutes += mins
        byProject.set(e.project_id, cur)
      }
      return {
        total,
        rows: [...byProject.values()].sort((a, b) => b.minutes - a.minutes),
      }
    },
  })
}
