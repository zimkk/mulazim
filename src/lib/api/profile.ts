import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import type { Profile } from '@/types/database'

export function useProfile() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: qk.profile,
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async (patch: { display_name?: string }): Promise<void> => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId!)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.profile })
    },
  })
}

/** Best display label for the signed-in user. */
export function displayNameOf(profile: Profile | null | undefined, email: string | undefined) {
  return profile?.display_name?.trim() || email?.split('@')[0] || 'there'
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async (file: File): Promise<void> => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `${userId}/avatar.${ext}`
      const up = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (up.error) throw up.error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?v=${Date.now()}`
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId!)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.profile }),
  })
}
