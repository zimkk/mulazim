import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/components/ui/States'

export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status)

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-6" />
      </div>
    )
  }
  if (status === 'unconfigured') return <Navigate to="/setup" replace />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  return <>{children}</>
}
