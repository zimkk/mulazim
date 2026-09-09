import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_STALE_THRESHOLDS, type StaleThresholds } from '@/lib/utils/staleness'

type Theme = 'light' | 'dark' | 'system'

interface UiState {
  sidebarCollapsed: boolean
  theme: Theme
  staleThresholds: StaleThresholds
  lastProjectId: string | null
  toggleSidebar: () => void
  setTheme: (t: Theme) => void
  setStaleThresholds: (t: StaleThresholds) => void
  setLastProjectId: (id: string | null) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'system',
      staleThresholds: DEFAULT_STALE_THRESHOLDS,
      lastProjectId: null,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      setStaleThresholds: (staleThresholds) => set({ staleThresholds }),
      setLastProjectId: (lastProjectId) => set({ lastProjectId }),
    }),
    { name: 'grid-manager-ui' },
  ),
)

/** Apply the resolved theme to <html>. Call on load and on theme change. */
export function applyTheme(theme: Theme): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)
}
