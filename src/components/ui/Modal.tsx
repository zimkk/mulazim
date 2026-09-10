import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, backdrop, m, modalPanel } from '@/lib/motion'
import { cn } from '@/lib/utils/cn'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  width?: 'sm' | 'md' | 'lg'
}

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const

export function Modal({ open, onClose, title, children, footer, width = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-6"
          variants={backdrop}
          initial="hidden"
          animate="show"
          exit="exit"
          onMouseDown={onClose}
        >
          <m.div
            className={cn(
              'my-auto w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg',
              WIDTHS[width],
            )}
            variants={modalPanel}
            initial="hidden"
            animate="show"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
              <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
              <Button variant="ghost" size="sm" onClick={onClose} icon={<X className="size-4" />} />
            </div>
            <div className="px-5 py-4">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-5 py-3.5">
                {footer}
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
