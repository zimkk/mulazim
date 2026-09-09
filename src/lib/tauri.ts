/**
 * Thin, browser-safe wrappers around Tauri APIs. Everything here degrades to a
 * no-op when the app runs in a plain browser (`npm run dev`, the smoke test).
 */

export const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export type OsPlatform = 'macos' | 'windows' | 'linux' | 'web'

let cachedPlatform: OsPlatform | null = null

export async function getPlatform(): Promise<OsPlatform> {
  if (cachedPlatform) return cachedPlatform
  if (!isTauri()) {
    cachedPlatform = navigator.platform.toLowerCase().includes('mac')
      ? 'macos'
      : navigator.platform.toLowerCase().includes('win')
        ? 'windows'
        : 'web'
    return cachedPlatform
  }
  try {
    const { platform } = await import('@tauri-apps/plugin-os')
    const p = platform()
    cachedPlatform = p === 'macos' ? 'macos' : p === 'windows' ? 'windows' : 'linux'
  } catch {
    cachedPlatform = 'web'
  }
  return cachedPlatform
}

/** Best-effort synchronous guess for rendering shortcut hints before async resolves. */
export function guessIsMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent)
}

export function modKeyLabel(isMac = guessIsMac()): string {
  return isMac ? '⌘' : 'Ctrl'
}

/** Subscribe to a Tauri event; returns an unsubscribe fn (no-op in the browser). */
export async function onTauriEvent<T>(
  name: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  if (!isTauri()) return () => {}
  try {
    const { listen } = await import('@tauri-apps/api/event')
    const un = await listen<T>(name, (e) => handler(e.payload))
    return un
  } catch {
    return () => {}
  }
}

export async function appVersion(): Promise<string> {
  if (!isTauri()) return import.meta.env.VITE_APP_VERSION ?? '0.1.0'
  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    return await getVersion()
  } catch {
    return '0.1.0'
  }
}

export async function setAutostart(enabled: boolean): Promise<void> {
  if (!isTauri()) return
  const mod = await import('@tauri-apps/plugin-autostart')
  if (enabled) await mod.enable()
  else await mod.disable()
}

export async function isAutostartEnabled(): Promise<boolean> {
  if (!isTauri()) return false
  try {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart')
    return await isEnabled()
  } catch {
    return false
  }
}
