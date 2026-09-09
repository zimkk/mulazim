import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import type { Client, ClientStatus, ClientWithStats } from '@/types/database'

interface ClientInput {
  name: string
  company_name?: string | null
  email?: string | null
  notes?: string | null
  status?: ClientStatus
}

export function useClients() {
  return useQuery({
    queryKey: qk.clients,
    queryFn: async (): Promise<ClientWithStats[]> => {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error

      // Pull lightweight project/task aggregates in two flat queries.
      const { data: projects, error: pErr } = await supabase
        .from('projects')
        .select('id, client_id, status, last_activity_at')
      if (pErr) throw pErr

      const { data: openTasks, error: tErr } = await supabase
        .from('tasks')
        .select('id, project_id, status')
        .not('status', 'in', '(done,cancelled)')
      if (tErr) throw tErr

      const projectsByClient = new Map<string, { count: number; last: string | null }>()
      const projectClient = new Map<string, string | null>()
      for (const p of projects ?? []) {
        projectClient.set(p.id, p.client_id)
        if (!p.client_id) continue
        const entry = projectsByClient.get(p.client_id) ?? { count: 0, last: null }
        if (p.status === 'active') entry.count += 1
        if (!entry.last || p.last_activity_at > entry.last) entry.last = p.last_activity_at
        projectsByClient.set(p.client_id, entry)
      }

      const openByClient = new Map<string, number>()
      for (const t of openTasks ?? []) {
        const clientId = projectClient.get(t.project_id)
        if (!clientId) continue
        openByClient.set(clientId, (openByClient.get(clientId) ?? 0) + 1)
      }

      return (clients ?? []).map((c: Client) => ({
        ...c,
        active_project_count: projectsByClient.get(c.id)?.count ?? 0,
        open_task_count: openByClient.get(c.id) ?? 0,
        last_activity_at: projectsByClient.get(c.id)?.last ?? null,
      }))
    },
  })
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.client(id) : ['clients', 'none'],
    enabled: Boolean(id),
    queryFn: async (): Promise<Client> => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async (input: ClientInput): Promise<Client> => {
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...input, user_id: userId })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.clients })
    },
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: ClientInput & { id: string }): Promise<Client> => {
      const { data, error } = await supabase
        .from('clients')
        .update(input)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (client) => {
      void qc.invalidateQueries({ queryKey: qk.clients })
      void qc.invalidateQueries({ queryKey: qk.client(client.id) })
    },
  })
}

export function useArchiveClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('clients').update({ status: 'archived' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.clients })
    },
  })
}
