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

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/today', label: 'Today', icon: Sun, end: false },
  { to: '/upcoming', label: 'Upcoming', icon: CalendarDays, end: false },
  { to: '/calendar', label: 'Calendar', icon: CalendarRange, end: false },
  { to: '/tasks', label: 'All tasks', icon: ListChecks, end: false },
  { to: '/projects', label: 'Projects', icon: FolderKanban, end: false },
  { to: '/clients', label: 'Clients', icon: Users, end: false },
  { to: '/review', label: 'Review', icon: ClipboardCheck, end: false },
  { to: '/activity', label: 'Activity', icon: Activity, end: false },
  { to: '/trash', label: 'Trash', icon: Trash2, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-[--color-border] bg-[--color-surface]',
        collapsed ? 'w-14' : 'w-52',
      )}
    >
      <div
        className="flex h-11 items-center gap-2 border-b border-[--color-border] px-3"
        data-tauri-drag-region
      >
        <Logo className="size-5" />
        {!collapsed && <span className="text-sm font-semibold">Grid Manager</span>}
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-[--color-surface-2] font-medium text-[--color-text]'
                  : 'text-[--color-text-muted] hover:bg-[--color-surface-2] hover:text-[--color-text]',
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-[--color-border] p-2">
          <UpdateManager compact />
        </div>
      )}

      <button
        onClick={toggle}
        className="flex items-center gap-2 border-t border-[--color-border] px-3 py-2 text-xs text-[--color-text-muted] hover:text-[--color-text]"
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
