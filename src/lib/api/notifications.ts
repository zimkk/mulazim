import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export type NotificationKind =
  | 'overdue'
  | 'due_soon'
  | 'stale_project'
  | 'needs_review'
  | 'daily_digest'

export interface AppNotification {
  id: string
  user_id: string
  kind: NotificationKind
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

const KEY = ['notifications'] as const

export function useNotifications() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
    refetchInterval: 120_000,
  })
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[] | 'all'): Promise<void> => {
      let q = supabase.from('notifications').update({ read_at: new Date().toISOString() })
      q = ids === 'all' ? q.is('read_at', null) : q.in('id', ids)
      const { error } = await q
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useClearNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase.from('notifications').delete().not('id', 'is', null)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  })
}

/** Insert notification rows, skipping any whose (kind|title) already exists unread. */
export async function pushNotifications(
  userId: string,
  rows: { kind: NotificationKind; title: string; body?: string; link?: string }[],
): Promise<number> {
  if (rows.length === 0) return 0
  const { data: existing } = await supabase
    .from('notifications')
    .select('kind, title')
    .is('read_at', null)
  const seen = new Set((existing ?? []).map((e) => `${e.kind}|${e.title}`))
  const fresh = rows.filter((r) => !seen.has(`${r.kind}|${r.title}`))
  if (fresh.length === 0) return 0
  const { error } = await supabase
    .from('notifications')
    .insert(fresh.map((r) => ({ ...r, user_id: userId })))
  if (error) throw error
  return fresh.length
}

export function useUnreadCount() {
  const { data } = useNotifications()
  return (data ?? []).filter((n) => !n.read_at).length
}

export function useCurrentUserId() {
  return useAuthStore((s) => s.user?.id)
}
