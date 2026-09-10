import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Which app-level overlay is open. Only one at a time. */
export type Overlay = 'none' | 'palette' | 'newProject' | 'newTask' | 'shortcuts'

/**
 * How cards are ordered inside a board column. Automation never removes the
 * hand-operated path: dragging a card to reorder switches the board to
 * 'manual' rather than being ignored or disabled.
 */
export type BoardOrder = 'auto' | 'manual'

interface UiState {
  sidebarCollapsed: boolean
  lastProjectId: string | null
  overlay: Overlay
  boardOrder: BoardOrder
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  setLastProjectId: (id: string | null) => void
  setOverlay: (o: Overlay) => void
  setBoardOrder: (o: BoardOrder) => void
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
      boardOrder: 'auto',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setLastProjectId: (lastProjectId) => set({ lastProjectId }),
      setOverlay: (overlay) => set({ overlay }),
      setBoardOrder: (boardOrder) => set({ boardOrder }),
    }),
    {
      name: 'mulazim-ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        lastProjectId: s.lastProjectId,
        boardOrder: s.boardOrder,
      }),
    },
  ),
)
