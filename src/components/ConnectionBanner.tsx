import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { CloudOff, RefreshCw } from 'lucide-react'
import { AnimatePresence, m } from '@/lib/motion'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/** Thin bar shown only while the browser reports no connection. */
export function ConnectionBanner() {
  const online = useOnlineStatus()
  const qc = useQueryClient()
  const fetching = useIsFetching()

  return (
    <AnimatePresence initial={false}>
      {!online && (
        <m.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden bg-[var(--color-stale)] text-white"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium">
            <CloudOff className="size-3.5" />
            You’re offline — showing the last loaded data.
            <button
              onClick={() => qc.refetchQueries()}
              className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 transition-colors hover:bg-white/30"
            >
              <RefreshCw className={`size-3 ${fetching ? 'animate-spin' : ''}`} />
              Retry
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
