import { Suspense } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ConnectionBanner } from '@/components/ConnectionBanner'
import { GlobalOverlays } from '@/components/GlobalOverlays'
import { NotificationBell } from '@/components/NotificationBell'
import { TimerPill } from '@/components/TimerPill'
import { NotificationEngine } from '@/lib/notificationEngine'
import { SkeletonRows } from '@/components/ui/States'
import { Avatar } from '@/components/ui/Avatar'
import { displayNameOf, useProfile } from '@/lib/api/profile'
import { useAuthStore } from '@/stores/authStore'

export function AppShell() {
  const { data: profile } = useProfile()
  const email = useAuthStore((s) => s.user?.email ?? '')
  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ConnectionBanner />
        <div
          className="glass flex h-14 shrink-0 items-center justify-end gap-2 border-b border-[var(--color-border)] px-4"
          data-tauri-drag-region
        >
          <TimerPill />
          <NotificationBell />
          <Link
            to="/settings"
            title="Account settings"
            className="rounded-full ring-offset-2 ring-offset-[var(--color-surface)] transition hover:ring-2 hover:ring-[var(--color-accent)]/40"
          >
            <Avatar
              name={displayNameOf(profile, email)}
              url={profile?.avatar_url}
              className="size-7"
            />
          </Link>
        </div>
        <main className="app-backdrop flex-1 overflow-y-auto">
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="mx-auto max-w-6xl p-6">
                  <SkeletonRows rows={6} />
                </div>
              }
            >
              {/* No entrance animation here on purpose: this sits inside the
                  Suspense boundary, so a lazily-loaded route that suspends
                  mid-animation can be left stranded at opacity 0 — a blank
                  screen. Routes render immediately instead. */}
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
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[1.375rem] font-semibold tracking-tight text-[var(--color-text)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl p-6">{children}</div>
}
