import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onTauriEvent } from '@/lib/tauri'
import { useUiStore } from '@/stores/uiStore'

/** Routes native menu clicks (from src-tauri/src/lib.rs) into the app. */
export function useMenuBridge() {
  const navigate = useNavigate()
  const setOverlay = useUiStore((s) => s.setOverlay)

  useEffect(() => {
    let unNav = () => {}
    let unAct = () => {}
    void onTauriEvent<string>('menu:navigate', (path) => navigate(path)).then((u) => (unNav = u))
    void onTauriEvent<string>('menu:action', (action) => {
      if (action === 'shortcuts') setOverlay('shortcuts')
      else if (action === 'new-task') setOverlay('newTask')
      else if (action === 'new-project') setOverlay('newProject')
      else if (action === 'command-palette') setOverlay('palette')
    }).then((u) => (unAct = u))
    return () => {
      unNav()
      unAct()
    }
  }, [navigate, setOverlay])
}
