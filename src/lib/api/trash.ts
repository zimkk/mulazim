import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'

export type TrashKind = 'client' | 'project' | 'task'
const TABLE: Record<TrashKind, 'clients' | 'projects' | 'tasks'> = {
  client: 'clients',
  project: 'projects',
  task: 'tasks',
}

export interface TrashItem {
  kind: TrashKind
  id: string
  label: string
  deleted_at: string
}

export function useTrash() {
  return useQuery({
    queryKey: ['trash'],
    queryFn: async (): Promise<TrashItem[]> => {
      const [c, p, t] = await Promise.all([
        supabase.from('clients').select('id, name, deleted_at').not('deleted_at', 'is', null),
        supabase.from('projects').select('id, name, deleted_at').not('deleted_at', 'is', null),
        supabase.from('tasks').select('id, title, deleted_at').not('deleted_at', 'is', null),
      ])
      for (const r of [c, p, t]) if (r.error) throw r.error
      return [
        ...(c.data ?? []).map((x) => ({ kind: 'client' as const, id: x.id, label: x.name, deleted_at: x.deleted_at! })),
        ...(p.data ?? []).map((x) => ({ kind: 'project' as const, id: x.id, label: x.name, deleted_at: x.deleted_at! })),
        ...(t.data ?? []).map((x) => ({ kind: 'task' as const, id: x.id, label: x.title, deleted_at: x.deleted_at! })),
      ].sort((a, b) => b.deleted_at.localeCompare(a.deleted_at))
    },
  })
}

function useTrashMutation(apply: (kind: TrashKind, id: string) => Promise<void>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, id }: { kind: TrashKind; id: string }) => apply(kind, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trash'] })
      void qc.invalidateQueries({ queryKey: qk.projects })
      void qc.invalidateQueries({ queryKey: qk.clients })
      void qc.invalidateQueries({ queryKey: qk.tasks })
      void qc.invalidateQueries({ queryKey: qk.dashboard })
    },
  })
}

export function useRestore() {
  return useTrashMutation(async (kind, id) => {
    const { error } = await supabase.from(TABLE[kind]).update({ deleted_at: null }).eq('id', id)
    if (error) throw error
  })
}

export function usePurge() {
  return useTrashMutation(async (kind, id) => {
    const { error } = await supabase.from(TABLE[kind]).delete().eq('id', id)
    if (error) throw error
  })
}
