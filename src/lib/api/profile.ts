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
