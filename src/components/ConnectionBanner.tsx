import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { CloudOff, RefreshCw } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/** Thin bar shown only while the browser reports no connection. */
export function ConnectionBanner() {
  const online = useOnlineStatus()
  const qc = useQueryClient()
  const fetching = useIsFetching()

  if (online) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-[--color-stale] px-4 py-1.5 text-xs font-medium text-white">
      <CloudOff className="size-3.5" />
      You’re offline — showing the last loaded data.
      <button
        onClick={() => qc.refetchQueries()}
        className="ml-2 inline-flex items-center gap-1 rounded bg-white/20 px-1.5 py-0.5 hover:bg-white/30"
      >
        <RefreshCw className={`size-3 ${fetching ? 'animate-spin' : ''}`} />
        Retry
      </button>
    </div>
  )
}
