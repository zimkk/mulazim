import { lazy, useEffect, useRef } from 'react'
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/RequireAuth'
import { SettingsPersister, useSettings, useSettingsQuery } from '@/lib/api/settings'
import { applyAppearance, cacheAppearance } from '@/lib/appearance'
import { useAuthStore } from '@/stores/authStore'

const Login = lazy(() => import('@/pages/Login'))
const Setup = lazy(() => import('@/pages/Setup'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Today = lazy(() => import('@/pages/Today'))
const Upcoming = lazy(() => import('@/pages/Upcoming'))
const AllTasks = lazy(() => import('@/pages/AllTasks'))
const Projects = lazy(() => import('@/pages/Projects'))
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'))
const Clients = lazy(() => import('@/pages/Clients'))
const ClientDetail = lazy(() => import('@/pages/ClientDetail'))
const ActivityPage = lazy(() => import('@/pages/ActivityPage'))
const Review = lazy(() => import('@/pages/Review'))
const Trash = lazy(() => import('@/pages/Trash'))
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
      { index: true, element: <LandingRedirect /> },
      { path: 'today', element: <Today /> },
      { path: 'upcoming', element: <Upcoming /> },
      { path: 'tasks', element: <AllTasks /> },
      { path: 'projects', element: <Projects /> },
      { path: 'projects/:id', element: <ProjectDetail /> },
      { path: 'clients', element: <Clients /> },
      { path: 'clients/:id', element: <ClientDetail /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'review', element: <Review /> },
      { path: 'trash', element: <Trash /> },
      { path: 'settings', element: <Settings /> },
      { path: 'settings/:section', element: <Settings /> },
    ],
  },
])

/** The index route: honour the configured landing view once per app launch. */
function LandingRedirect() {
  const { general } = useSettings()
  const decided = useRef(sessionStorage.getItem('gm-landed') === '1')
  if (!decided.current) {
    decided.current = true
    sessionStorage.setItem('gm-landed', '1')
    if (general.landingView === 'today') return <Navigate to="/today" replace />
    if (general.landingView === 'upcoming') return <Navigate to="/upcoming" replace />
    if (general.landingView === 'projects') return <Navigate to="/projects" replace />
  }
  return <Dashboard />
}

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
