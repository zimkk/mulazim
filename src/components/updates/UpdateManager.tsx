import { useCallback, useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'

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
          className="flex w-full items-center gap-1.5 rounded-lg bg-[var(--color-accent-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-accent)] ring-1 ring-inset ring-[var(--color-accent)]/25 transition-colors hover:brightness-105"
        >
          <Download className="size-3.5 shrink-0" /> Update to {state.version}
        </button>
      )
    }
    if (state.phase === 'downloading') {
      return (
        <div className="space-y-1.5 px-0.5">
          <span className="text-xs text-[var(--color-text-muted)]">
            Downloading… {state.progress ?? 0}%
          </span>
          <Progress value={(state.progress ?? 0) / 100} />
        </div>
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
          <span className="text-xs text-[var(--color-text-muted)]">
            {state.message ?? 'You are on the latest version.'}
          </span>
        )}
      </div>

      {state.phase === 'available' && (
        <div className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] p-3.5">
          <p className="mb-2.5 text-sm">
            Update available — <strong>version {state.version}</strong>
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={install}
            icon={<Download className="size-3.5" />}
          >
            Install update
          </Button>
        </div>
      )}

      {state.phase === 'downloading' && (
        <div className="space-y-1.5">
          <p className="text-xs text-[var(--color-text-muted)]">
            Downloading update… {state.progress ?? 0}%
          </p>
          <Progress value={(state.progress ?? 10) / 100} />
        </div>
      )}

      {state.phase === 'ready' && <p className="text-xs">Installing… the app will restart.</p>}

      {state.phase === 'error' && (
        <div className="rounded-xl border border-[var(--color-stale)]/40 bg-[var(--color-stale)]/5 p-3.5 text-xs text-[var(--color-stale)]">
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
