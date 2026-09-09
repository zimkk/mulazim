import { useEffect } from 'react'
import { useUiStore } from '@/stores/uiStore'
import { useSettings } from '@/lib/api/settings'
import { matchesBinding } from '@/lib/utils/keybinding'

/** App-wide keyboard shortcuts (ARCHITECTURE.md §47), rebindable via Settings → Keyboard. */
export function useGlobalHotkeys() {
  const setOverlay = useUiStore((s) => s.setOverlay)
  const { keybindings } = useSettings()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)

      if (matchesBinding(e, keybindings.palette)) {
        e.preventDefault()
        setOverlay('palette')
      } else if (matchesBinding(e, keybindings.shortcuts)) {
        e.preventDefault()
        setOverlay('shortcuts')
      } else if (!typing && matchesBinding(e, keybindings.newTask)) {
        e.preventDefault()
        setOverlay('newTask')
      } else if (!typing && matchesBinding(e, keybindings.newProject)) {
        e.preventDefault()
        setOverlay('newProject')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOverlay, keybindings])
}
