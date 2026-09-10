import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Download, Info, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { appVersion, openExternal } from '@/lib/tauri'

const REPO_URL = 'https://github.com/zimkk/mulazim'

type Phase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'uptodate'
  | 'unsupported'

interface State {
  phase: Phase
  /** The version offered by the update server, when one is newer. */
  version?: string
  progress?: number
  message?: string
  /** When the last check completed — proof that anything happened at all. */
  checkedAt?: Date
}

/**
 * Wraps @tauri-apps/plugin-updater. Loaded dynamically so the app still runs
 * in a plain browser during `npm run dev` without Tauri.
 */
export function UpdateManager({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>({ phase: 'idle' })
  const [current, setCurrent] = useState(__APP_VERSION__)
  useEffect(() => {
    void appVersion().then(setCurrent)
  }, [])

  const check = useCallback(async (silent: boolean) => {
    // A browser or `tauri dev` build has no updater. Saying "up to date" here
    // was actively misleading: nothing had been checked.
    if (!('__TAURI_INTERNALS__' in window)) {
      setState({
        phase: 'unsupported',
        message: 'Updates only work in an installed build — this is running from source.',
      })
      return
    }
    try {
      setState({ phase: 'checking' })
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (!update) {
        setState({ phase: 'uptodate', checkedAt: new Date() })
        return
      }
      setState({ phase: 'available', version: update.version, checkedAt: new Date() })

      // Auto-advance to install only when the user explicitly clicks.
      ;(window as unknown as { __gm_update?: typeof update }).__gm_update = update
    } catch (err) {
      // Even a silent startup check should leave a trace; a permanently blank
      // panel is indistinguishable from a check that never ran.
      const message = err instanceof Error ? err.message : String(err)
      setState(silent ? { phase: 'idle', message } : { phase: 'error', message })
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
    <div className="space-y-3 text-sm">
      {/* Always state the installed version. "Up to date" with nothing to
          compare it against is unfalsifiable — you cannot tell a successful
          check from one that silently did nothing. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[var(--color-text-muted)]">Installed version</span>
        <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-xs ring-1 ring-inset ring-[var(--color-border)]">
          {current}
        </span>
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => check(false)}
          loading={state.phase === 'checking'}
          icon={<RefreshCw className="size-3.5" />}
        >
          Check for updates
        </Button>
      </div>

      {state.phase === 'uptodate' && (
        <p className="flex items-center gap-2 text-xs text-[var(--color-healthy)]">
          <CheckCircle2 className="size-3.5 shrink-0" />
          {current} is the latest version
          {state.checkedAt && (
            <span className="text-[var(--color-text-subtle)]">
              · checked {state.checkedAt.toLocaleTimeString()}
            </span>
          )}
        </p>
      )}

      {state.phase === 'unsupported' && (
        <div className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 p-3 text-xs text-[var(--color-text-muted)]">
          <Info className="mt-px size-3.5 shrink-0" />
          <span>
            {state.message} Install a build from{' '}
            <button
              onClick={() => void openExternal(`${REPO_URL}/releases/latest`)}
              className="text-[var(--color-accent)] hover:underline"
            >
              the latest release
            </button>{' '}
            to use self-updating.
          </span>
        </div>
      )}

      {state.phase === 'available' && (
        <div className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] p-3.5">
          <p className="mb-2.5 text-sm">
            Update available — <strong>{state.version}</strong>{' '}
            <span className="text-[var(--color-text-muted)]">(you have {current})</span>
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
          Couldn’t check for updates: {state.message}. Your current version keeps working.
        </div>
      )}

      {/* A silent startup failure used to leave the panel blank forever. */}
      {state.phase === 'idle' && state.message && (
        <p className="text-xs text-[var(--color-text-subtle)]">
          Last check didn’t complete ({state.message}). Try again above.
        </p>
      )}
    </div>
  )
}

type DownloadEvent =
  | { event: 'Started'; data: { contentLength?: number } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished'; data?: undefined }
