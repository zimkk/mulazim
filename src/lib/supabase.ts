import { createClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Single Supabase client for the whole app.
 * Auth + RLS are the security boundary (ARCHITECTURE.md §11) — this uses the
 * public anon key only. The session is persisted to localStorage so a relaunch
 * of the desktop app stays logged in.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'grid-manager-auth',
  },
})

/**
 * Retry a Supabase call a few times on transient failures (network blips and
 * PostgREST's "JWT issued at future" clock-skew rejection). For code paths
 * outside TanStack Query, which has its own retry.
 */
export async function retrying<T>(
  fn: () => PromiseLike<{ data: T; error: { message: string } | null }>,
  tries = 4,
): Promise<{ data: T; error: { message: string } | null }> {
  let last: { data: T; error: { message: string } | null } = { data: null as T, error: null }
  for (let i = 0; i < tries; i++) {
    last = await fn()
    if (!last.error || !/issued at future|JWT|PGRST303|fetch|network|timeout/i.test(last.error.message))
      return last
    await new Promise((r) => setTimeout(r, 300 * 2 ** i))
  }
  return last
}
