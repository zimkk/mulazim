import { lazy, useEffect } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/RequireAuth'
import { useAuthStore } from '@/stores/authStore'
import { applyTheme, useUiStore } from '@/stores/uiStore'

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
    ],
  },
])

export function App() {
  const init = useAuthStore((s) => s.init)
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    applyTheme(theme)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(theme)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return <RouterProvider router={router} />
}
