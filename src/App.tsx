import { lazy, useEffect } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/RequireAuth'
import { SettingsPersister, useSettingsQuery } from '@/lib/api/settings'
import { applyAppearance, cacheAppearance } from '@/lib/appearance'
import { useAuthStore } from '@/stores/authStore'

const Login = lazy(() => import('@/pages/Login'))
const Setup = lazy(() => import('@/pages/Setup'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Projects = lazy(() => import('@/pages/Projects'))
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'))
const Clients = lazy(() => import('@/pages/Clients'))
const ClientDetail = lazy(() => import('@/pages/ClientDetail'))
const ActivityPage = lazy(() => import('@/pages/ActivityPage'))
const Settings = lazy(() => import('@/pages/Settings'))

const router = createHashRouter([
  { path: '/login', element: <Login /> },
  { path: '/setup', element: <Setup /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'projects', element: <Projects /> },
      { path: 'projects/:id', element: <ProjectDetail /> },
      { path: 'clients', element: <Clients /> },
      { path: 'clients/:id', element: <ClientDetail /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'settings', element: <Settings /> },
      { path: 'settings/:section', element: <Settings /> },
    ],
  },
])

/** Keeps <html> in sync with the user's appearance settings.
 *  Until the synced settings have loaded, the boot cache (main.tsx) stands — no flash. */
function AppearanceSync() {
  const { data, isSuccess } = useSettingsQuery()
  useEffect(() => {
    if (!isSuccess || !data) return
    applyAppearance(data.appearance)
    cacheAppearance(data.appearance)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyAppearance(data.appearance)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [data, isSuccess])
  return null
}

export function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <>
      <AppearanceSync />
      <SettingsPersister />
      <RouterProvider router={router} />
    </>
  )
}
