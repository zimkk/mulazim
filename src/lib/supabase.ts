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
