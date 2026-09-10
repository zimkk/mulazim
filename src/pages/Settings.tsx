import { useMemo, useState } from 'react'
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
import { SearchInput } from '@/components/ui/Toolbar'
import { m } from '@/lib/motion'
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
        <nav className="w-52 shrink-0 space-y-1">
          <SearchInput
            value={q}
            onValueChange={setQ}
            placeholder="Search settings"
            className="mb-3"
          />
          {matches.length === 0 && (
            <p className="px-2 py-2 text-xs text-[var(--color-text-subtle)]">No settings match.</p>
          )}
          {matches.map(({ id, label, icon: Icon }) => {
            const isActive = active.id === id
            return (
              <NavLink
                key={id}
                to={id === 'account' ? '/settings' : `/settings/${id}`}
                end
                className={cn(
                  'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)] ring-1 ring-inset ring-[var(--color-accent)]/25'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]',
                )}
              >
                {isActive && (
                  <m.span
                    layoutId="settings-active-rail"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute top-2 bottom-2 -left-2 w-0.5 rounded-full bg-[var(--color-accent)]"
                  />
                )}
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>
        <m.div
          key={active.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0 max-w-2xl flex-1"
        >
          {active.el}
        </m.div>
      </div>
    </Page>
  )
}
