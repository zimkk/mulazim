import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'

interface AuthState {
  session: Session | null
  user: User | null
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'unconfigured'
  error: string | null
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
}

let subscribed = false

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  status: 'loading',
  error: null,

  init: async () => {
    if (!env.isConfigured) {
      set({ status: 'unconfigured' })
      return
    }
    const { data } = await supabase.auth.getSession()
    set({
      session: data.session,
      user: data.session?.user ?? null,
      status: data.session ? 'authenticated' : 'unauthenticated',
    })

    if (!subscribed) {
      subscribed = true
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
          status: session ? 'authenticated' : 'unauthenticated',
        })
      })
    }
  },

  signIn: async (email, password) => {
    set({ error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message })
      throw error
    }
  },

  signUp: async (email, password, displayName) => {
    set({ error: null })
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) {
      set({ error: error.message })
      throw error
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, status: 'unauthenticated' })
  },
}))
