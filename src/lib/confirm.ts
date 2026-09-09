import { isTauri } from '@/lib/tauri'

/** Native confirm dialog under Tauri, window.confirm in the browser. */
export async function confirmDialog(message: string, title = 'Please confirm'): Promise<boolean> {
  if (isTauri()) {
    try {
      const { confirm } = await import('@tauri-apps/plugin-dialog')
      return await confirm(message, { title, kind: 'warning' })
    } catch {
      /* fall through */
    }
  }
  return window.confirm(message)
}
