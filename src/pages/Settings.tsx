import { useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import {
  Bell,
  Database,
  Info,
  Keyboard,
  Palette,
  RefreshCw,
  Search,
  SlidersHorizontal,
  User,
  Workflow,
} from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Input } from '@/components/ui/Field'
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
  {
    id: 'account',
    label: 'Account',
    icon: User,
    el: <AccountSection />,
    keywords: 'email password avatar display name sign out delete data danger zone',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    el: <AppearanceSection />,
    keywords: 'theme dark light accent colour color density font size reduce motion week',
  },
  {
    id: 'general',
    label: 'General',
    icon: SlidersHorizontal,
    el: <GeneralSection />,
    keywords: 'landing view default priority project date confirm delete upcoming',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    el: <NotificationsSection />,
    keywords: 'overdue due soon stale review digest quiet hours desktop permission',
  },
  {
    id: 'workflow',
    label: 'Workflow',
    icon: Workflow,
    el: <WorkflowSection />,
    keywords: 'stale threshold dashboard cards order recommendation',
  },
  {
    id: 'keyboard',
    label: 'Keyboard',
    icon: Keyboard,
    el: <KeyboardSection />,
    keywords: 'shortcut hotkey rebind palette command',
  },
  {
    id: 'data',
    label: 'Data',
    icon: Database,
    el: <DataSection />,
    keywords: 'export import backup json csv markdown',
  },
  {
    id: 'updates',
    label: 'Updates',
    icon: RefreshCw,
    el: <UpdatesSection />,
    keywords: 'version autostart launch login startup check',
  },
  { id: 'about', label: 'About', icon: Info, el: <AboutSection />, keywords: 'version license credits' },
] as const

export default function Settings() {
  const { section } = useParams<{ section?: string }>()
  const active = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]
  const [q, setQ] = useState('')

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return SECTIONS
    return SECTIONS.filter(
      (s) => s.label.toLowerCase().includes(t) || s.keywords.includes(t),
    )
  }, [q])

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Preferences sync to every device you sign in from." />
      <div className="flex gap-6">
        <nav className="w-48 shrink-0 space-y-1">
          <div className="relative mb-2">
            <Search className="absolute top-2 left-2 size-3.5 text-[--color-text-subtle]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search settings"
              className="h-8 pl-7 text-xs"
            />
          </div>
          {matches.length === 0 && (
            <p className="px-2 py-2 text-xs text-[--color-text-subtle]">No settings match.</p>
          )}
          {matches.map(({ id, label, icon: Icon }) => (
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
