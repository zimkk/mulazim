import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type UserSettings,
} from '@/lib/settings'

const SETTINGS_KEY = ['settings'] as const

export function useSettingsQuery() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: SETTINGS_KEY,
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async (): Promise<UserSettings> => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('data')
        .eq('id', userId!)
        .maybeSingle()
      if (error) throw error
      return mergeSettings(data?.data)
    },
  })
}

export function useSettings(): UserSettings {
  return useSettingsQuery().data ?? DEFAULT_SETTINGS
}

/** Convenience selector for the stale thresholds used by health/staleness helpers. */
export function useStaleThresholds() {
  return useSettings().workflow.staleThresholds
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/**
 * Returns `update(patch)` which merges the patch into the settings *cache*
 * synchronously (instant UI). Persistence is handled centrally + debounced by
 * <SettingsPersister/>, so rapid successive edits never race their writes.
 */
export function useUpdateSettings() {
  const qc = useQueryClient()
  return useCallback(
    (patch: DeepPartial<UserSettings>) => {
      const prev = qc.getQueryData<UserSettings>(SETTINGS_KEY) ?? DEFAULT_SETTINGS
      const next = mergeSettings(structuredMerge(prev, patch))
      qc.setQueryData(SETTINGS_KEY, next)
      void qc.invalidateQueries({ queryKey: qk.dashboard })
    },
    [qc],
  )
}

/**
 * Watches the settings cache and writes it to Supabase ~500ms after the last
 * change. Mount once, high in the tree.
 */
export function SettingsPersister() {
  const userId = useAuthStore((s) => s.user?.id)
  const { data } = useSettingsQuery()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string | null>(null)

  useEffect(() => {
    // Record the server value as already-saved so we don't echo it straight back.
    if (data && lastSaved.current === null) lastSaved.current = JSON.stringify(data)
  }, [data])

  useEffect(() => {
    if (!userId || !data) return
    const serialized = JSON.stringify(data)
    if (serialized === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ id: userId, data: data as unknown as Record<string, unknown> })
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('settings persist failed:', error.message)
      } else {
        lastSaved.current = serialized
      }
    }, 500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [userId, data])

  return null
}

function structuredMerge<T>(base: T, patch: DeepPartial<T>): T {
  const out = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (v === undefined) continue
    const b = out[k]
    out[k] = isObj(b) && isObj(v) ? structuredMerge(b, v as DeepPartial<typeof b>) : v
  }
  return out as T
}
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
