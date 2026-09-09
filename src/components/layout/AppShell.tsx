import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ConnectionBanner } from '@/components/ConnectionBanner'
import { GlobalOverlays } from '@/components/GlobalOverlays'
import { NotificationBell } from '@/components/NotificationBell'
import { NotificationEngine } from '@/lib/notificationEngine'
import { SkeletonRows } from '@/components/ui/States'

export function AppShell() {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ConnectionBanner />
        <div
          className="flex h-10 shrink-0 items-center justify-end border-b border-[--color-border] bg-[--color-surface] px-4"
          data-tauri-drag-region
        >
          <NotificationBell />
        </div>
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="p-6">
                  <SkeletonRows rows={6} />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <GlobalOverlays />
      <NotificationEngine />
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold text-[--color-text]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-[--color-text-muted]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl p-6">{children}</div>
}
