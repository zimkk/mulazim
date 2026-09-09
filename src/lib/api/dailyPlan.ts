import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const todayKey = () => new Date().toISOString().slice(0, 10)
const KEY = (date: string) => ['daily_plan', date] as const

export function useDailyPlan(date = todayKey()) {
  return useQuery({
    queryKey: KEY(date),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('daily_plans')
        .select('task_ids')
        .eq('date', date)
        .maybeSingle()
      if (error) throw error
      return data?.task_ids ?? []
    },
  })
}

export function useSetDailyPlan(date = todayKey()) {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async (taskIds: string[]): Promise<void> => {
      const { error } = await supabase
        .from('daily_plans')
        .upsert({ user_id: userId, date, task_ids: taskIds })
      if (error) throw error
    },
    onMutate: async (taskIds) => {
      await qc.cancelQueries({ queryKey: KEY(date) })
      const prev = qc.getQueryData<string[]>(KEY(date))
      qc.setQueryData(KEY(date), taskIds)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY(date), ctx.prev)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: KEY(date) }),
  })
}
