import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import type { Tag } from '@/types/database'

const TAGS_KEY = ['tags'] as const
const TASK_TAGS_KEY = ['task_tags'] as const

export function useTags() {
  return useQuery({
    queryKey: TAGS_KEY,
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabase.from('tags').select('*').order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

/** All task→tag links, indexed by task id. */
export function useTaskTagMap() {
  const tags = useTags()
  const links = useQuery({
    queryKey: TASK_TAGS_KEY,
    queryFn: async (): Promise<{ task_id: string; tag_id: string }[]> => {
      const { data, error } = await supabase.from('task_tags').select('task_id, tag_id')
      if (error) throw error
      return data ?? []
    },
  })
  return useMemo(() => {
    const byId = new Map((tags.data ?? []).map((t) => [t.id, t]))
    const map = new Map<string, Tag[]>()
    for (const l of links.data ?? []) {
      const tag = byId.get(l.tag_id)
      if (!tag) continue
      map.set(l.task_id, [...(map.get(l.task_id) ?? []), tag])
    }
    return map
  }, [tags.data, links.data])
}

export function useCreateTag() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }): Promise<Tag> => {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: name.trim(), color, user_id: userId })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: TAGS_KEY }),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TAGS_KEY })
      void qc.invalidateQueries({ queryKey: TASK_TAGS_KEY })
    },
  })
}

export function useSetTaskTags() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async ({ taskId, tagIds }: { taskId: string; tagIds: string[] }): Promise<void> => {
      const { error: delErr } = await supabase.from('task_tags').delete().eq('task_id', taskId)
      if (delErr) throw delErr
      if (tagIds.length) {
        const { error } = await supabase
          .from('task_tags')
          .insert(tagIds.map((tag_id) => ({ task_id: taskId, tag_id, user_id: userId })))
        if (error) throw error
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TASK_TAGS_KEY })
      void qc.invalidateQueries({ queryKey: qk.tasks })
    },
  })
}
