import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { AnimatePresence, m, spring } from '@/lib/motion'
import { cn } from '@/lib/utils/cn'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastCtx {
  notify: (message: string, kind?: ToastKind) => void
}

const Ctx = createContext<ToastCtx | null>(null)

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++seq
    setToasts((t) => [...t, { id, kind, message }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <m.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1, transition: spring }}
              exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.15 } }}
              className={cn(
                'pointer-events-auto flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pr-4 pl-3 text-sm shadow-lg',
                'border-l-2',
                t.kind === 'success' && 'border-l-[var(--color-healthy)]',
                t.kind === 'error' && 'border-l-[var(--color-stale)]',
                t.kind === 'info' && 'border-l-[var(--color-info)]',
              )}
            >
              {t.kind === 'success' && <CheckCircle2 className="size-4 shrink-0 text-[var(--color-healthy)]" />}
              {t.kind === 'error' && <XCircle className="size-4 shrink-0 text-[var(--color-stale)]" />}
              {t.kind === 'info' && <Info className="size-4 shrink-0 text-[var(--color-info)]" />}
              <span>{t.message}</span>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
