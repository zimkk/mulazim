import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Which app-level overlay is open. Only one at a time. */
export type Overlay = 'none' | 'palette' | 'newProject' | 'newTask' | 'shortcuts'

interface UiState {
  sidebarCollapsed: boolean
  lastProjectId: string | null
  overlay: Overlay
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  setLastProjectId: (id: string | null) => void
  setOverlay: (o: Overlay) => void
}

/**
 * Device-local UI conveniences only. Synced preferences (theme, accent,
 * thresholds, …) live in `user_settings` — see src/lib/api/settings.ts.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      lastProjectId: null,
      overlay: 'none',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setLastProjectId: (lastProjectId) => set({ lastProjectId }),
      setOverlay: (overlay) => set({ overlay }),
    }),
    {
      name: 'grid-manager-ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        lastProjectId: s.lastProjectId,
      }),
    },
  ),
)
