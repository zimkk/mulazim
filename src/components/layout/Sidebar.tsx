import { NavLink } from 'react-router-dom'
import {
  Activity,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  FolderKanban,
  ListChecks,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  Trash2,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useUiStore } from '@/stores/uiStore'
import { UpdateManager } from '@/components/updates/UpdateManager'
import { Logo } from '@/components/ui/Logo'

type Item = { to: string; label: string; icon: typeof Sun; end?: boolean }

const GROUPS: { heading: string; items: Item[] }[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/today', label: 'Today', icon: Sun },
      { to: '/upcoming', label: 'Upcoming', icon: CalendarDays },
      { to: '/calendar', label: 'Calendar', icon: CalendarRange },
    ],
  },
  {
    heading: 'Work',
    items: [
      { to: '/tasks', label: 'All tasks', icon: ListChecks },
      { to: '/projects', label: 'Projects', icon: FolderKanban },
      { to: '/clients', label: 'Clients', icon: Users },
    ],
  },
  {
    heading: 'Insights',
    items: [
      { to: '/review', label: 'Review', icon: ClipboardCheck },
      { to: '/activity', label: 'Activity', icon: Activity },
    ],
  },
]

const FOOTER_ITEMS: Item[] = [
  { to: '/trash', label: 'Trash', icon: Trash2 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function NavItem({ to, label, icon: Icon, end, collapsed }: Item & { collapsed: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)] ring-1 ring-inset ring-[var(--color-accent)]/25'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]',
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      <div
        className="flex h-14 items-center gap-2.5 border-b border-[var(--color-border)] px-3.5"
        data-tauri-drag-region
      >
        <Logo className="size-6 shrink-0" />
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">Grid Manager</span>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {GROUPS.map((group) => (
          <div key={group.heading} className="space-y-0.5">
            {!collapsed && (
              <p className="px-2.5 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                {group.heading}
              </p>
            )}
            {group.items.map((item) => (
              <NavItem key={item.to} {...item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-[var(--color-border)] px-2 py-2">
        {FOOTER_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </div>

      {!collapsed && (
        <div className="border-t border-[var(--color-border)] p-2">
          <UpdateManager compact />
        </div>
      )}

      <button
        onClick={toggle}
        className="flex items-center gap-2 border-t border-[var(--color-border)] px-3.5 py-2 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <>
            <PanelLeftClose className="size-4" /> Collapse
          </>
        )}
      </button>
    </aside>
  )
}
