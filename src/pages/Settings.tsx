import { NavLink, useParams } from 'react-router-dom'
import {
  Bell,
  Database,
  Info,
  Keyboard,
  Palette,
  RefreshCw,
  SlidersHorizontal,
  User,
  Workflow,
} from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { cn } from '@/lib/utils/cn'
import {
  AboutSection,
  AccountSection,
  AppearanceSection,
  DataSection,
  GeneralSection,
  KeyboardSection,
  NotificationsSection,
  UpdatesSection,
  WorkflowSection,
} from './settings/sections'

const SECTIONS = [
  { id: 'account', label: 'Account', icon: User, el: <AccountSection /> },
  { id: 'appearance', label: 'Appearance', icon: Palette, el: <AppearanceSection /> },
  { id: 'general', label: 'General', icon: SlidersHorizontal, el: <GeneralSection /> },
  { id: 'notifications', label: 'Notifications', icon: Bell, el: <NotificationsSection /> },
  { id: 'workflow', label: 'Workflow', icon: Workflow, el: <WorkflowSection /> },
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard, el: <KeyboardSection /> },
  { id: 'data', label: 'Data', icon: Database, el: <DataSection /> },
  { id: 'updates', label: 'Updates', icon: RefreshCw, el: <UpdatesSection /> },
  { id: 'about', label: 'About', icon: Info, el: <AboutSection /> },
] as const

export default function Settings() {
  const { section } = useParams<{ section?: string }>()
  const active = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Preferences sync to every device you sign in from." />
      <div className="flex gap-6">
        <nav className="w-44 shrink-0 space-y-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <NavLink
              key={id}
              to={id === 'account' ? '/settings' : `/settings/${id}`}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  isActive || active.id === id
                    ? 'bg-[--color-surface-2] font-medium text-[--color-text]'
                    : 'text-[--color-text-muted] hover:bg-[--color-surface-2] hover:text-[--color-text]',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 max-w-2xl flex-1">{active.el}</div>
      </div>
    </Page>
  )
}
