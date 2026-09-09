import { useCallback, useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Phase = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'uptodate'

interface State {
  phase: Phase
  version?: string
  progress?: number
  message?: string
}

/**
 * Wraps @tauri-apps/plugin-updater. Loaded dynamically so the app still runs
 * in a plain browser during `npm run dev` without Tauri.
 */
export function UpdateManager({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>({ phase: 'idle' })

  const check = useCallback(async (silent: boolean) => {
    if (!('__TAURI_INTERNALS__' in window)) {
      setState({ phase: 'uptodate', message: 'Updates are only available in the desktop app.' })
      return
    }
    try {
      setState({ phase: 'checking' })
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (!update) {
        setState({ phase: 'uptodate' })
        return
      }
      setState({ phase: 'available', version: update.version })

      // Auto-advance to install only when the user explicitly clicks.
      ;(window as unknown as { __gm_update?: typeof update }).__gm_update = update
    } catch (err) {
      if (!silent) {
        setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
      } else {
        setState({ phase: 'idle' })
      }
    }
  }, [])

  const install = useCallback(async () => {
    const update = (window as unknown as { __gm_update?: { downloadAndInstall: (cb: (e: DownloadEvent) => void) => Promise<void> } }).__gm_update
    if (!update) return
    try {
      let total = 0
      let downloaded = 0
      setState((s) => ({ ...s, phase: 'downloading', progress: 0 }))
      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === 'Started') total = event.data.contentLength ?? 0
        if (event.event === 'Progress') {
          downloaded += event.data.chunkLength
          setState((s) => ({
            ...s,
            phase: 'downloading',
            progress: total ? Math.round((downloaded / total) * 100) : undefined,
          }))
        }
        if (event.event === 'Finished') setState((s) => ({ ...s, phase: 'ready' }))
      })
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }, [])

  useEffect(() => {
    void check(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (compact) {
    if (state.phase === 'available') {
      return (
        <button
          onClick={install}
          className="flex items-center gap-1.5 rounded-md bg-[--color-accent]/12 px-2 py-1 text-xs font-medium text-[--color-accent]"
        >
          <Download className="size-3.5" /> Update to {state.version}
        </button>
      )
    }
    if (state.phase === 'downloading') {
      return (
        <span className="text-xs text-[--color-text-muted]">
          Downloading update… {state.progress ?? 0}%
        </span>
      )
    }
    return null
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => check(false)}
          loading={state.phase === 'checking'}
          icon={<RefreshCw className="size-3.5" />}
        >
          Check for updates
        </Button>
        {state.phase === 'uptodate' && (
          <span className="text-xs text-[--color-text-muted]">
            {state.message ?? 'You are on the latest version.'}
          </span>
        )}
      </div>

      {state.phase === 'available' && (
        <div className="rounded-md border border-[--color-border] p-3">
          <p className="mb-2 text-sm">
            Update available — <strong>version {state.version}</strong>
          </p>
          <Button variant="primary" size="sm" onClick={install} icon={<Download className="size-3.5" />}>
            Install update
          </Button>
        </div>
      )}

      {state.phase === 'downloading' && (
        <div>
          <p className="mb-1 text-xs text-[--color-text-muted]">Downloading update…</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[--color-surface-2]">
            <div
              className="h-full bg-[--color-accent] transition-all"
              style={{ width: `${state.progress ?? 10}%` }}
            />
          </div>
        </div>
      )}

      {state.phase === 'ready' && <p className="text-xs">Installing… the app will restart.</p>}

      {state.phase === 'error' && (
        <div className="rounded-md border border-[--color-stale]/40 p-3 text-xs text-[--color-stale]">
          Update failed: {state.message}. Your current version keeps working — try again later.
        </div>
      )}
    </div>
  )
}

type DownloadEvent =
  | { event: 'Started'; data: { contentLength?: number } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished'; data?: undefined }
