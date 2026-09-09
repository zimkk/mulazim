import { useEffect } from 'react'
import { useUiStore } from '@/stores/uiStore'

/** App-wide keyboard shortcuts (ARCHITECTURE.md §47). */
export function useGlobalHotkeys() {
  const setOverlay = useUiStore((s) => s.setOverlay)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      // Don't hijack shortcuts while typing, except for the palette itself.
      const el = e.target as HTMLElement | null
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)

      const key = e.key.toLowerCase()
      if (key === 'k') {
        e.preventDefault()
        setOverlay('palette')
      } else if (key === 'n' && !typing) {
        e.preventDefault()
        setOverlay('newTask')
      } else if (key === 'p' && e.shiftKey && !typing) {
        e.preventDefault()
        setOverlay('newProject')
      } else if (key === '/') {
        e.preventDefault()
        setOverlay('shortcuts')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOverlay])
}
